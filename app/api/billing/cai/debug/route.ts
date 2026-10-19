import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { exigirEmpresa } from "@/lib/purchase-db";

export async function GET(request: NextRequest) {
  try {
    const supabase = getSupabaseServer();
    // Solo los CAI de la empresa de la sesion: antes volcaba `select * limit 5`
    // sin filtro (fuga) y ademas filtraba por el tenant fijo "1".
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));

    const { data: allCai, error: allError } = await supabase
      .from("cai")
      .select("*")
      .eq("company_id", empresa.companyId)
      .limit(5);

    if (allError) {
      return NextResponse.json({
        step: "query_all",
        error: allError.message,
        details: allError,
      }, { status: 500 });
    }

    const { data: filteredCai, error: filteredError } = await supabase
      .from("cai")
      .select("*")
      .eq("status", "active")
      .eq("company_id", empresa.companyId)
      .limit(1);

    if (filteredError) {
      return NextResponse.json({
        step: "query_filtered",
        allCai,
        error: filteredError.message,
        details: filteredError,
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      allCai,
      filteredCai,
      count: filteredCai?.length || 0,
    });

  } catch (error: any) {
    const deEmpresa = respuestaDeErrorDeEmpresa(error);
    if (deEmpresa) return deEmpresa;
    return NextResponse.json({
      step: "catch",
      error: error.message,
      stack: error.stack,
    }, { status: 500 });
  }
}
