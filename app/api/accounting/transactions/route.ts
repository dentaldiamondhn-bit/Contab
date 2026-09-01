import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";
import { supabase as supabaseService } from "@/lib/supabase-db";
import { createTransaction } from "@/lib/actions/transaction";

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
    const { id, description, date, totalAmount, entries } = body;
    if (!id) return NextResponse.json({ error: "id requerido" }, { status: 400 });

    // Actualizar Transaction
    const { error: txErr } = await supabaseService.from("Transaction").update({
      description: description,
      date: date ? new Date(date).toISOString().split('T')[0] : undefined,
      totalAmount: totalAmount !== undefined ? Math.round(Number(totalAmount)) : undefined,
      functionalAmount: totalAmount !== undefined ? Math.round(Number(totalAmount)) : undefined,
      originalTotal: totalAmount !== undefined ? Math.round(Number(totalAmount)) : undefined,
      updatedAt: new Date().toISOString(),
    } as any).eq("id", id).eq("tenantId", tenant.id) as any;
    if (txErr) {
      // fallback snake
      const alt = await supabaseService.from("Transaction").update({
        description, date: date ? new Date(date).toISOString().split('T')[0] : undefined,
        total_amount: totalAmount, functional_amount: totalAmount, original_total: totalAmount,
      } as any).eq("id", id).eq("tenant_id", tenant.id) as any;
      if (alt.error) throw alt.error;
    }

    // Si vienen entries, recrear JournalEntries
    if (Array.isArray(entries) && entries.length >= 2) {
      await supabaseService.from("JournalEntry").delete().eq("transactionId", id) as any;
      await supabaseService.from("JournalEntry").delete().eq("transaction_id", id) as any;
      for (const e of entries) {
        await supabaseService.from("JournalEntry").insert({
          id: e.id || undefined,
          transactionId: id,
          accountId: e.accountId || e.account_id,
          tenantId: tenant.id,
          amount: Math.round(Number(e.amount)),
          originalAmount: Math.round(Number(e.originalAmount || e.amount)),
          currency: e.currency || "HNL",
          exchangeRate: e.exchangeRate || 24.7,
          description: e.description || description,
        } as any);
      }
    }

    return NextResponse.json({ success: true });
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
    
    // Validar campos requeridos
    if (!body.description || !body.currency || !body.entries) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: description, currency, entries" },
        { status: 400 }
      );
    }

    // Validar entries
    if (!Array.isArray(body.entries) || body.entries.length < 2) {
      return NextResponse.json(
        { error: "La transacción debe tener al menos 2 entries" },
        { status: 400 }
      );
    }

    // Validar que todos los entries tengan campos requeridos
    for (const entry of body.entries) {
      if (!entry.accountId || entry.amount === undefined || entry.isDebit === undefined) {
        return NextResponse.json(
          { error: "Todos los entries deben tener accountId, amount e isDebit" },
          { status: 400 }
        );
      }
    }

    // Convertir fechas de string a Date
    if (body.date) {
      body.date = new Date(body.date);
    }

    // Agregar tenantId al body
    body.tenantId = tenant.id;
    
    const result = await createTransaction(body);
    
    if (result.success) {
      return NextResponse.json(result.transaction);
    } else {
      return NextResponse.json(
        { error: result.error },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error creating transaction:", error);
    return NextResponse.json(
      { error: "Error creating transaction" },
      { status: 500 }
    );
  }
}
