import { NextRequest, NextResponse } from "next/server";
import { resolveTenant as resolveTenantDelRequest } from "@/lib/tenant-resolver";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import { previewInvoiceNumber } from "@/lib/billing/invoice-number";

export const dynamic = "force-dynamic";

/**
 * Respuesta para empresas sin CAI registrado. Antes devolvia `currentNumber: 1`
 * fijo, que hacia que el POS propusiera 001-01-01-00000001 una y otra vez.
 */
async function sinCai(tenantId: string, conDebug = false) {
  const preview = await previewInvoiceNumber(tenantId);
  return {
    cai: null,
    currentNumber: preview.correlativo,
    finalNumber: 1000,
    issueDate: new Date().toISOString().split("T")[0],
    expirationDate: null,
    daysRemaining: 365,
    status: "active",
    ...(conDebug ? { _debug: { fallback: true } } : {}),
  };
}

// El POST caia a "1" y ademas desactivaba los CAI de ese tenant antes de
// insertar, asi que crear un CAI desde otra empresa apagaba los de "Empresa 1".
// El tenant sale del header de sesion (`x-tenant-id`, lo inyecta middleware.ts),
// NO de `?companyId`: ese parametro lo manda el cliente y antes ganaba al header,
// asi que cualquier usuario autenticado podia leer y escribir los datos de otra
// empresa con `?companyId=ANGELOH7`. Ademas `?companyId` es un companies.id, no el
// tenant_id que guardan las tablas, y sin traducir daba cero filas.
// Ver lib/tenant-resolver.ts.
async function resolveTenant(request: NextRequest): Promise<string | null> {
  return resolveTenantDelRequest(request);
}

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    // Obtener el CAI vigente actual — tenant-aware, con maybeSingle para no dar 500 si no hay
    let { data: cai, error } = await supabase
      .from("cai")
      .select("*")
      .eq("status", "active")
      .eq("tenant_id", tenantId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle() as { data: any, error: any };
    
    if (error) {
      console.error("Error fetching CAI:", error);
      // No dar 500 si solo es "no rows", intentar fallback a cualquier CAI del tenant
      if ((error as any).code === 'PGRST116') {
        // No rows found - intentar sin filtro de status
        const fallback = await supabase.from("cai").select("*").eq("tenant_id", tenantId).order("created_at", { ascending: false }).limit(1).maybeSingle() as any;
        if (fallback.data) {
          cai = fallback.data;
        } else {
          return NextResponse.json(await sinCai(tenantId, true));
        }
      } else {
        return NextResponse.json(
          { error: "Error fetching CAI" },
          { status: 500 }
        );
      }
    }
    
    if (!cai) {
      // Sin CAI se sigueemitiendo, pero el correlativo sale de las facturas de
      // la empresa y no de un 1 fijo, que reiniciaba la numeracion.
      return NextResponse.json(await sinCai(tenantId));
    }
    
    // Obtener el último número de factura usado
    const { data: invoices } = await (supabase as any)
      .from("Invoice")
      .select("invoiceNumber")
      .eq("tenantId", tenantId)
      .order("createdAt", { ascending: false })
      .limit(100);
    
    // El numero que se mostrara lo calcula el mismo modulo que reserva al
    // emitir (lib/billing/invoice-number.ts). Antes el GET hacia su propia
    // cuenta con max(facturas)+1 y sin fila en `cai` devolvia 1 fijo, asi que
    // una empresa con facturas 00000006..00000008 veia "00000001".
    const preview = await previewInvoiceNumber(tenantId);
    const diasRestantes = preview.venceEl
      ? Math.ceil((preview.venceEl.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
      : 365;

    const caiInfo = {
      cai: preview.caiCode,
      currentNumber: preview.correlativo,
      finalNumber: Number.isFinite(Number(cai.rango_final)) && Number(cai.rango_final) > 0
        ? Number(cai.rango_final)
        : Number(cai.end_number) || preview.rangoHasta || 1000,
      issueDate: cai.issue_date,
      expirationDate: preview.venceEl ? preview.venceEl.toISOString() : null,
      daysRemaining: Math.max(0, diasRestantes),
      status: diasRestantes <= 0 ? 'expired' : diasRestantes <= 30 ? 'warning' : 'active',
      _debug: {
        invoiceCount: invoices?.length || 0,
        startNumber: cai.rango_inicial ?? cai.start_number,
        calculatedNumber: preview.correlativo
      }
    };
    
    return NextResponse.json(caiInfo);
  } catch (error) {
    console.error("Error in CAI route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { cai, startNumber, endNumber, expirationDate } = body;
    
    const supabase = getSupabaseServer();
    
    // Tenant de la URL/header; sin ninguno es 400 en vez de escribir en "Empresa 1"
    const tenantId = await resolveTenant(request) || body.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }
    
    // Desactivar CAIs anteriores para el tenant actual
    await (supabase as any)
      .from("cai")
      .update({ status: 'inactive' })
      .eq("tenant_id", tenantId);
    
    // Crear nuevo CAI para el tenant actual
    const { data, error } = await (supabase as any)
      .from("cai")
      .insert({
        cai,
        start_number: startNumber,
        end_number: endNumber,
        issue_date: new Date().toISOString().split('T')[0],
        expiration_date: expirationDate,
        status: 'active',
        tenant_id: tenantId
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating CAI:", error);
      return NextResponse.json(
        { error: "Error creating CAI" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in CAI POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}