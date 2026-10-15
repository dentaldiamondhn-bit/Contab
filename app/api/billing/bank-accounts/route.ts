import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { exigirEmpresa } from "@/lib/purchase-db";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

export const dynamic = "force-dynamic";

// La empresa sale del contexto validado (`contextoDeEmpresa`: `?companyId` o el
// header `x-company-id` de la cookie/URL), NUNCA solo del tenant. `bankaccount`
// tiene `company_id` (migracion 023), y `TEST1DS` tiene dos empresas: filtrar por
// `tenant_id` hacia que test 1 y test 2 vieran las cuentas la una de la otra y que
// el INSERT quedara con el `company_id` que decidiera el trigger. Antes de esto el
// tenant estaba fijado en "1". Ver lib/tenant-resolver.ts y AGENTS.md seccion 1.
export async function GET(request: NextRequest) {
  try {
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));

    const supabase = getSupabaseServer();

    const { data: accounts, error } = await supabase
      .from("bankaccount")
      .select("*")
      .eq("is_active", true)
      .eq("company_id", empresa.companyId)
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
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error("Error in bank-accounts GET route:", error);
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
    const { bank_name, account_number, account_type, account_holder, currency } = body;

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
        tenant_id: empresa.tenantId,
        company_id: empresa.companyId
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
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
    console.error("Error in bank-accounts POST route:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
