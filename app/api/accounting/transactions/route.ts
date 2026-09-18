import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";
import { supabase as supabaseService } from "@/lib/supabase-db";
import { createJournalTransaction } from "@/lib/services/journal-service";
import { integrateSaleWithInventory } from "@/lib/services/inventory-integration";

// Helper para obtener tenantId del request
async function getTenantFromRequest(request: NextRequest) {
  const tenantId = request.headers.get("x-tenant-id") || 
                   new URL(request.url).searchParams.get("tenantId");
   
  if (!tenantId) {
    return null;
  }
 
  return { id: tenantId };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
     
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado o no especificado" },
        { status: 401 }
      );
    }
     
    // 1) Intentar RPC (si existe)
    const supabaseAnon = createSupabaseClient();
    const rpcRes = await (supabaseAnon as any).rpc('get_transactions_with_entries', {
        p_tenant_id: tenant.id,
        p_start_date: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : null,
        p_end_date: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : null,
        p_voucher_type: searchParams.get("voucherType") && searchParams.get("voucherType") !== "todos" ? searchParams.get("voucherType") : null
      });
    
    if (!rpcRes.error && rpcRes.data) {
      return NextResponse.json(rpcRes.data || []);
    }
    if (rpcRes.error) {
      console.warn("RPC get_transactions_with_entries falló, usando fallback directo:", rpcRes.error.message);
    }

    // 2) Fallback directo con service_role (bypass RLS) - soporta tenant_id / tenantId
    let query: any = supabaseService
      .from("Transaction")
      .select(`*, JournalEntry (*, Account (code, name))`)
      .order("date", { ascending: true });

    // Intentar con tenant_id (physical column Prisma)
    let { data, error } = await query.eq("tenant_id", tenant.id);
    if (error || !data || data.length === 0) {
      // Reintentar con tenantId camelCase por compatibilidad legacy
      const alt = await supabaseService.from("Transaction").select(`*, JournalEntry (*, Account (code, name))`).eq("tenantId", tenant.id).order("date", { ascending: true });
      if (!alt.error && alt.data && alt.data.length > 0) {
        data = alt.data;
        error = null;
      }
    }
    // Filtro opcional voucherType
    const vt = searchParams.get("voucherType");
    if (vt && vt !== "todos" && data) {
      data = (data as any[]).filter((t: any) => (t.voucherType || t.voucher_type) === vt);
    }

    if (error) {
      console.error("Error fetching transactions fallback:", error);
      return NextResponse.json([]);
    }
    // Normalizar para frontend
    const normalized = (data || []).map((t: any) => ({
      ...t,
      voucherType: t.voucherType || t.voucher_type,
      voucherNumber: t.voucherNumber ?? t.voucher_number,
      totalAmount: t.totalAmount ?? t.total_amount,
      entries: t.JournalEntry || t.entries || [],
    }));
    return NextResponse.json(normalized);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Error fetching transactions" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const tenant = await getTenantFromRequest(request);
    if (!tenant) return NextResponse.json({ error: "Tenant no encontrado" }, { status: 401 });
    const body = await request.json();
    let { id, description, date, totalAmount, entries } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // Si el id es sintético del libro diario (fecha-numero, ej "2026-03-20T00:00:00-45"), resolver a ids reales
    let idsToUpdate: string[] = [id];
    const isSynthetic = !id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-/i) && id.includes("-");
    if (isSynthetic) {
      // id es "2026-03-21T00:00:00-46" -> fecha + numero
      const parts = id.split("-");
      const numero = parts[parts.length-1];
      const fechaPart = id.slice(0, id.length - (`-${numero}`.length));
      // Buscar transacciones reales que coincidan
      const { data: matches } = await supabaseService.from("Transaction").select("id").eq("tenantId", tenant.id).eq("voucherNumber", parseInt(numero)||0).gte("date", fechaPart.slice(0,10)).lte("date", fechaPart.slice(0,10)) as any;
      if (matches && matches.length>0) {
        idsToUpdate = matches.map((m:any)=>m.id);
        // Si hay múltiples, actualizar todas con la misma descripción/fecha/monto
      } else {
        // fallback: buscar por fecha y numero sin tenant filter estricto
        const alt = await supabaseService.from("Transaction").select("id").eq("tenantId", tenant.id).eq("voucher_type", body.voucherType || "EGRESO").eq("voucher_number", parseInt(numero)||0) as any;
        if (alt.data && alt.data.length>0) idsToUpdate = alt.data.map((m:any)=>m.id);
      }
    }

    for (const realId of idsToUpdate) {
      const newAmt = totalAmount !== undefined ? Number(totalAmount) : undefined;
      const { error: txErr } = await supabaseService.from("Transaction").update({
        description: description,
        date: date ? new Date(date).toISOString().split('T')[0] : undefined,
        totalAmount: newAmt,
        functionalAmount: newAmt,
        originalTotal: newAmt,
        updatedAt: new Date().toISOString(),
      } as any).eq("id", realId).eq("tenantId", tenant.id) as any;
      if (txErr) {
        const alt = await supabaseService.from("Transaction").update({
          description, date: date ? new Date(date).toISOString().split('T')[0] : undefined,
          total_amount: newAmt, functional_amount: newAmt, original_total: newAmt,
        } as any).eq("id", realId).eq("tenant_id", tenant.id) as any;
        if (alt.error) throw alt.error;
      }
      // Si vienen entries, recrear solo para ese realId
      if (Array.isArray(entries) && entries.length >= 2) {
        await supabaseService.from("JournalEntry").delete().eq("transactionId", realId) as any;
        await supabaseService.from("JournalEntry").delete().eq("transaction_id", realId) as any;
        for (const e of entries) {
          await supabaseService.from("JournalEntry").insert({
            id: e.id || undefined,
            transactionId: realId,
            accountId: e.accountId || e.account_id,
            tenantId: tenant.id,
            amount: Math.round(Number(e.amount)),
            originalAmount: Math.round(Number(e.originalAmount || e.amount)),
            currency: e.currency || "HNL",
            exchangeRate: e.exchangeRate || 24.7,
            description: e.description || description,
          } as any);
        }
      } else if (totalAmount !== undefined) {
        const { data: jes } = await supabaseService.from("JournalEntry").select("id, amount").eq("transactionId", realId) as any;
        let list = jes || [];
        if (list.length===0) {
          const alt = await supabaseService.from("JournalEntry").select("id, amount").eq("transaction_id", realId) as any;
          list = alt.data || [];
        }
        const newAmt = Number(totalAmount);
        for (const je of list) {
          const isDebit = Number(je.amount) > 0;
          const newAmount = isDebit ? newAmt : -newAmt;
          await supabaseService.from("JournalEntry").update({ amount: newAmount, originalAmount: Math.abs(newAmt) } as any).eq("id", je.id) as any;
        }
      }
    }
    return NextResponse.json({ success: true, updated: idsToUpdate.length });
  } catch (e:any) {
    console.error("PUT transaction error", e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    // Obtener tenantId del request
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado o no especificado" },
        { status: 401 }
      );
    }

    const body = await request.json();

    // Validación básica (el servicio revalida a fondo: balance, cuentas, fecha)
    if (!body || typeof body !== "object") {
      return NextResponse.json({ error: "Cuerpo inválido" }, { status: 400 });
    }

    // Vía Supabase service_role (reemplaza Prisma, sin DATABASE_URL en runtime)
    const performedBy =
      request.headers.get('x-user-id') ||
      request.headers.get('x-user-email') ||
      'system';
    const { transaction, entries } = await createJournalTransaction(
      supabaseService,
      tenant.id,
      body,
      { performedBy },
    );

    // INTEGRACIóN AUTOMáTICA DE INVENTARIO
    // Cuando se crea una venta (voucherType: INGRESO), reducir automáticamente
    // el inventario y crear el asiento de COGS (Cost of Goods Sold)
    if (body.voucherType === 'INGRESO' && transaction) {
      try {
        // Extraer información de productos de las entries de la transacción
        let productInfo = [];

        if (entries && entries.length > 0) {
          // Buscar entries que sean de tipo activo (debe) y tengan información de cuenta
          const inventoryEntries = entries.filter(
            (e: any) => e.accountId && e.amount > 0
          );

          // Agrupar por cuenta (producto)
          const productGroups: any = {};
          const accountPromises = inventoryEntries.map(async (entry: any) => {
            const account = await db.account.findFirst({
              where: { id: entry.accountId },
            });
            const code = account?.code || entry.accountId;
            if (!productGroups[code]) {
              productGroups[code] = {
                productId: entry.accountId,
                productCode: code,
                productName: account?.name || `Producto ${code}`,
                quantity: 0,
              };
            }
            productGroups[code].quantity += Math.abs(entry.amount);
          });
          
          // Esperar a que todas las promesas se resuelvan
          await Promise.all(accountPromises);
          
          // Convertir el objeto a un formato compatible con el código existente
          const productGroupsArray = Object.values(productGroups);

          productInfo = Object.values(productGroups).map((g: any) => ({
            productId: g.productId,
            productCode: g.productCode,
            productName: g.productName,
            quantity: g.quantity,
          }));
        }

        // Integrar con inventario - crear COGS y reducir stock
        const integrationResult = await integrateSaleWithInventory(
          tenant.id,
          transaction.id,
          productInfo,
          body.description || 'Venta de productos'
        );

        if (!integrationResult.success) {
          console.warn("Warning: Inventory integration failed:", integrationResult.error);
          // No fallamos la transacción principal, solo advertimos
        }
      } catch (inventoryError) {
        console.error("Error in inventory integration:", inventoryError);
        // No fallamos la transacción principal por errores de integración
      }
    }

    return NextResponse.json(
      { success: true, transaction: { ...transaction, entries } },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating transaction:", error);
    const message = error instanceof Error ? error.message : "Error creating transaction";
    if (
      /requerid|debe|balanceada|existen|inválida|mayor a cero|al menos|especificado|cerrado|bloqueado|reábralo/i.test(message)
    ) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
