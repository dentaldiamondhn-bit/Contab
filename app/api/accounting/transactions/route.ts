import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";
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
    
    // Obtener tenantId del request
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado o no especificado" },
        { status: 401 }
      );
    }
    
    // Crear cliente Supabase
    const supabase = createSupabaseClient();
    
    // Obtener transacciones usando la nueva función
    const { data: transactions, error } = await (supabase as any)
      .rpc('get_transactions_with_entries', {
        p_tenant_id: tenant.id === '1' ? 'tenant_001' : tenant.id, // Convertir 1 a tenant_001
        p_start_date: searchParams.get("startDate") ? new Date(searchParams.get("startDate")!) : null,
        p_end_date: searchParams.get("endDate") ? new Date(searchParams.get("endDate")!) : null,
        p_voucher_type: searchParams.get("voucherType") && searchParams.get("voucherType") !== "todos" ? searchParams.get("voucherType") : null
      });
    
    if (error) {
      console.error("Error fetching transactions:", error);
      return NextResponse.json(
        { error: "Error fetching transactions" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(transactions || []);
  } catch (error) {
    console.error("Error fetching transactions:", error);
    return NextResponse.json(
      { error: "Error fetching transactions" },
      { status: 500 }
    );
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
