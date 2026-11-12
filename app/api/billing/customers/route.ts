import { NextRequest, NextResponse } from "next/server";
import { resolveTenant as resolveTenantDelRequest } from "@/lib/tenant-resolver";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

export const dynamic = "force-dynamic";

// Tenant desde el id de empresa de la URL del POS, luego el header de
// middleware.ts. Antes estaba fijado en "1": el POS de cualquier otra empresa
// listaba los clientes de "Empresa 1".
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
      
    const { data: customers, error } = await supabase
      .from("customer")
      .select("*")
      .eq("is_active", true)
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    
    if (error) {
      console.error("Error fetching customers:", error);
      return NextResponse.json(
        { error: "Error fetching customers" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(customers || []);
  } catch (error) {
    console.error("Error in customers GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { rtn, name, email, phone, address, credit_limit } = body;
    const tenantId = await resolveTenant(request) || body.tenant_id;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }
    
    const supabase = getSupabaseServer();
    
    const { data, error } = await (supabase as any)
      .from("customer")
      .insert({
        rtn,
        name,
        email,
        phone,
        address,
        credit_limit: credit_limit || 0,
        current_debt: 0,
        is_active: true,
        tenant_id: tenantId
      })
      .select()
      .single();
    
    if (error) {
      console.error("Error creating customer:", error);
      return NextResponse.json(
        { error: "Error creating customer" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in customers POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
