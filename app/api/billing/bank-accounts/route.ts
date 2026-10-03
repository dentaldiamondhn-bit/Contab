import { NextRequest, NextResponse } from "next/server";
import { resolveTenant as resolveTenantDelRequest } from "@/lib/tenant-resolver";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

export const dynamic = "force-dynamic";

// Tenant desde el id de empresa de la URL, luego el header de middleware.ts.
// Antes estaba fijado en "1" y mezclaba las cuentas de otra empresa.
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
    const tenantId = await resolveTenant(request);
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    const supabase = getSupabaseServer();
    
    const { data: accounts, error } = await supabase
      .from("bankaccount")
      .select("*")
      .eq("is_active", true)
      .eq("tenant_id", tenantId)
      .order("bank_name", { ascending: true });
    
    if (error) {
      console.error("Error fetching bank accounts:", error);
      return NextResponse.json(
        { error: "Error fetching bank accounts" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(accounts || []);
  } catch (error) {
    console.error("Error in bank-accounts GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { bank_name, account_number, account_type, account_holder, currency } = body;
    const tenantId = await resolveTenant(request) || body.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseServer();
    
    const { data, error } = await (supabase as any)
      .from("bankaccount")
      .insert({
        bank_name,
        account_number,
        account_type,
        account_holder,
        currency: currency || 'HNL',
        is_active: true,
        tenant_id: tenantId
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating bank account:", error);
      return NextResponse.json(
        { error: "Error creating bank account" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in bank-accounts POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
