import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/lib/supabase-db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: companyId } = await params;

    // Intentar por id, luego por tenant_code (ej ANGELOH7), luego companies.id
    let data: any = null;
    let error: any = null;

    const res1 = await supabase.from("Tenant").select("*").eq("id", companyId).maybeSingle();
    data = res1.data; error = res1.error;
    if (!data) {
      const res2 = await supabase.from("Tenant").select("*").eq("tenant_code", companyId).maybeSingle();
      if (res2.data) { data = res2.data; error = null; }
    }
    if (!data) {
      const res3 = await supabase.from("companies").select("*").eq("id", companyId).maybeSingle();
      if (res3.data) {
        // mapear companies -> formato Tenant-like para frontend
        const c: any = res3.data;
        data = {
          id: c.tenant_id || c.id,
          businessname: c.name || c.business_name,
          businessrtn: c.rtn,
          businessaddress: c.address,
          tenant_code: c.tenant_code || companyId,
          // pasar company real también
          _company: c,
        };
        error = null;
      }
    }

    if (error || !data) {
      return NextResponse.json(
        { error: "Empresa no encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error getting company:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
