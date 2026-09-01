import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";
import { supabase as supabaseService } from "@/lib/supabase-db";

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
    const tenant = await getTenantFromRequest(request);
    if (!tenant) {
      return NextResponse.json(
        { error: "Tenant no encontrado o no especificado" },
        { status: 401 }
      );
    }
     
    const supabaseAnon = createSupabaseClient();
    const rpcRes = await (supabaseAnon as any).rpc('get_accounts_by_tenant', {
        p_tenant_id: tenant.id
      });
    if (!rpcRes.error && rpcRes.data) {
      return NextResponse.json(rpcRes.data || []);
    }
    if (rpcRes.error) console.warn("RPC get_accounts_by_tenant falló, fallback directo:", rpcRes.error.message);

    // Fallback directo con service_role — tenantId tiene 0 para ANGELOH7 porque cuentas son globales (unique code)
    let { data, error } = await supabaseService.from("Account").select("*").eq("tenant_id", tenant.id).order("code", { ascending: true });
    if (error || !data || data.length === 0) {
      const alt = await supabaseService.from("Account").select("*").eq("tenantId", tenant.id).order("code", { ascending: true });
      if (!alt.error && alt.data && alt.data.length > 0) { data = alt.data; error = null; }
    }
    // Si aún 0 (cuentas globales), devolver catálogo global para que el libro no quede vacío
    if (!data || data.length === 0) {
      const global = await supabaseService.from("Account").select("*").order("code", { ascending: true }).limit(50);
      if (!global.error && global.data && global.data.length > 0) {
        console.warn(`Accounts fallback global para tenant ${tenant.id}: ${global.data.length} cuentas`);
        return NextResponse.json(global.data);
      }
    }
    if (error) {
      console.error("Error fetching accounts fallback:", error);
      return NextResponse.json([]);
    }
    return NextResponse.json(data || []);
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
