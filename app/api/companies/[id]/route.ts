import { NextRequest, NextResponse } from "next/server";
import { createServiceRoleClient } from "@/lib/supabase/service-role";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;
    const supabase = createServiceRoleClient();

    // Try companies table first, then Tenant table
    let { data: company, error } = await supabase
      .from("companies")
      .select("*")
      .eq("id", companyId)
      .single();

    if (error || !company) {
      const { data: tenant, error: tenantError } = await supabase
        .from("Tenant")
        .select("*")
        .eq("id", companyId)
        .single();

      if (tenantError || !tenant) {
        return NextResponse.json(
          { error: "Empresa no encontrada" },
          { status: 404 }
        );
      }

      company = {
        id: tenant.id,
        business_name: tenant.businessname || tenant.business_name || "",
        business_rtn: tenant.businessrtn || tenant.business_rtn || "",
        industry: tenant.industry || "",
        regimen_tributario: "Regimen General",
        actividad_economica: "",
        direccion_fiscal: tenant.businessaddress || tenant.business_address || "",
        telefono_fiscal: tenant.phonenumber || tenant.phone_number || "",
        email_fiscal: tenant.businessemail || tenant.business_email || "",
        is_active: tenant.isactive ?? tenant.is_active ?? true,
        created_at: tenant.created_at || "",
      };
    }

    return NextResponse.json(company);
  } catch (error) {
    console.error("Error getting company:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
