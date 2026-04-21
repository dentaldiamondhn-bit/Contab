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
    const { data: accounts, error } = await (supabase as any)
      .rpc('get_accounts_by_tenant', {
        p_tenant_id: tenant.id === '1' ? 'tenant_001' : tenant.id
      });
    
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
    
    // Agregar tenantId al body
    body.tenantId = tenant.id === '1' ? 'tenant_001' : tenant.id;
    
    // Por ahora, solo retornar el body como confirmación
    // En el futuro, aquí iría la lógica para crear la cuenta
    return NextResponse.json({
      message: "Cuenta creada exitosamente",
      account: body
    });
  } catch (error) {
    console.error("Error creating account:", error);
    return NextResponse.json(
      { error: "Error creating account" },
      { status: 500 }
    );
  }
}
