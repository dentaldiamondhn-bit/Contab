import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

export async function GET(request: NextRequest) {
  try {
    const supabase = createSupabaseClient();
    
    // Consulta simplificada sin filtros
    const { data: allCai, error: allError } = await supabase
      .from("cai")
      .select("*")
      .limit(5);
    
    if (allError) {
      return NextResponse.json({
        step: "query_all",
        error: allError.message,
        details: allError
      }, { status: 500 });
    }
    
    // Consulta con filtros
    const { data: filteredCai, error: filteredError } = await supabase
      .from("cai")
      .select("*")
      .eq("status", "active")
      .eq("tenant_id", "1")
      .limit(1);
    
    if (filteredError) {
      return NextResponse.json({
        step: "query_filtered",
        allCai,
        error: filteredError.message,
        details: filteredError
      }, { status: 500 });
    }
    
    return NextResponse.json({
      success: true,
      allCai,
      filteredCai,
      count: filteredCai?.length || 0
    });
    
  } catch (error: any) {
    return NextResponse.json({
      step: "catch",
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
