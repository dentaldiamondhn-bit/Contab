import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { exigirEmpresa } from "@/lib/purchase-db";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

export const dynamic = "force-dynamic";

// La empresa sale del contexto validado (`contextoDeEmpresa`), NUNCA solo del
// tenant. `customer` tiene `company_id` (migracion 023) y `TEST1DS` tiene dos
// empresas: filtrar por `tenant_id` hacia que el POS de test 1 listara los clientes
// de test 2. Antes estaba fijado en "1". Ver AGENTS.md seccion 1.
export async function GET(request: NextRequest) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));

    const supabase = getSupabaseServer();

    const { data: customers, error } = await supabase
      .from("customer")
      .select("*")
      .eq("is_active", true)
      .eq("company_id", empresa.companyId)
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
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error("Error in customers GET route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const body = await request.json();
    const { rtn, name, email, phone, address, credit_limit } = body;

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
        tenant_id: empresa.tenantId,
        company_id: empresa.companyId
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
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error("Error in customers POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
