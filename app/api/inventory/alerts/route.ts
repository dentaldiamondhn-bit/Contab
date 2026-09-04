import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET - Obtener alertas de inventario (stock bajo, vencimientos)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertType = searchParams.get("type"); // 'low_stock', 'expiring', 'all'
    const tenantId = searchParams.get("tenantId") || "1";

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // Consultar productos activos
    const { data: products, error } = await supabase
      .from("product")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching products for alerts:", error);
      return NextResponse.json({ error: "Error fetching alerts" }, { status: 500 });
    }

    // Calcular alertas desde los productos
    const alerts: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    (products || []).forEach((p: any) => {
      // Alerta de stock bajo
      if (p.min_stock && p.current_stock <= p.min_stock) {
        alerts.push({
          id: p.id,
          product_id: p.id,
          code: p.code,
          name: p.name,
          alert_type: 'low_stock',
          alert_message: `Stock bajo: ${p.current_stock} (mínimo: ${p.min_stock})`,
          current_stock: p.current_stock,
          min_stock: p.min_stock,
        });
      }
      // Alerta de vencimiento
      if (p.expiration_date && p.expiration_date <= today) {
        alerts.push({
          id: p.id + '-exp',
          product_id: p.id,
          code: p.code,
          name: p.name,
          alert_type: 'expiring',
          alert_message: `Producto vencido: ${p.expiration_date}`,
          expiration_date: p.expiration_date,
          current_stock: p.current_stock,
          min_stock: p.min_stock,
        });
      }
    });

    // Filtrar por tipo si se solicita
    const filtered = alertType && alertType !== 'all'
      ? alerts.filter(a => a.alert_type === alertType)
      : alerts;

    const lowStockCount = alerts.filter(a => a.alert_type === 'low_stock').length;
    const expiringCount = alerts.filter(a => a.alert_type === 'expiring').length;

    return NextResponse.json({
      alerts: filtered,
      summary: {
        total: filtered.length,
        low_stock: lowStockCount,
        expiring: expiringCount,
      },
    });
  } catch (error) {
    console.error("Error in inventory alerts GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
