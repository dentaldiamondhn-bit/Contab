import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

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
    
    // Obtener cuentas usando la función específica
    const rpcParams = tenant.id === '1' ? { p_tenant_id: 'tenant_001' } : { p_tenant_id: tenant.id };
    const { data: accounts, error } = await supabase
      .rpc('get_accounts_by_tenant', rpcParams as any);
    
    if (error) {
      console.error("Error fetching accounts:", error);
      return NextResponse.json(
        { error: "Error fetching accounts" },
        { status: 500 }
      );
    }
    
    return NextResponse.json(accounts || []);
  } catch (error) {
    console.error("Error fetching accounts:", error);
    return NextResponse.json(
      { error: "Error fetching accounts" },
      { status: 500 }
    );
  }
}
