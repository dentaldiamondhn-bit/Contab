import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET - Obtener bodegas/almacenes
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get("tenantId") || "1";

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: warehouses, error } = await supabase
      .from("warehouse")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true)
      .order("name");

    if (error) {
      console.error("Error fetching warehouses:", error);
      return NextResponse.json(
        { error: "Error fetching warehouses" },
        { status: 500 }
      );
    }

    return NextResponse.json(warehouses);
  } catch (error) {
    console.error("Error in warehouses GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST - Crear bodega
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, name, location, description } = body;

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: warehouse, error } = await (supabase as any)
      .from("warehouse")
      .insert({
        tenant_id: "1",
        code,
        name,
        location,
        description,
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      console.error("Error creating warehouse:", error);
      return NextResponse.json(
        { error: "Error creating warehouse" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      warehouse,
      message: "Bodega creada exitosamente",
    });
  } catch (error) {
    console.error("Error in warehouses POST:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
