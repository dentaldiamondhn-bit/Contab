import { NextRequest, NextResponse } from "next/server";
import { createSupabaseClient } from "@/lib/supabase/client";

// GET - Obtener alertas de inventario (stock bajo, vencimientos)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertType = searchParams.get("type"); // 'low_stock', 'expiring', 'all'

    const supabase = createSupabaseClient();

    // Consultar vista de alertas
    let query = supabase
      .from("inventory_stock_alert")
      .select("*")
      .eq("tenant_id", "1");

    if (alertType && alertType !== "all") {
      query = query.eq("alert_type", alertType);
    } else {
      // Por defecto solo mostrar alertas (no 'normal')
      query = query.neq("alert_type", "normal");
    }

    const { data: alerts, error } = await query;

    if (error) {
      console.error("Error fetching inventory alerts:", error);
      return NextResponse.json(
        { error: "Error fetching alerts" },
        { status: 500 }
      );
    }

    // Contar por tipo
    const lowStockCount = (alerts as any[])?.filter((a) => a.alert_type === "low_stock").length || 0;
    const expiringCount = (alerts as any[])?.filter((a) => a.alert_type === "expiring").length || 0;

    return NextResponse.json({
      alerts: alerts || [],
      summary: {
        total: alerts?.length || 0,
        low_stock: lowStockCount,
        expiring: expiringCount,
      },
    });
  } catch (error) {
    console.error("Error in inventory alerts GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
