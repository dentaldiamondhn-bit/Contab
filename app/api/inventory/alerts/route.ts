import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa } from "@/lib/tenant-resolver";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export const dynamic = "force-dynamic";

// GET - Obtener alertas de inventario (stock bajo, vencimientos)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertType = searchParams.get("type"); // 'low_stock', 'expiring', 'all'
    
    // Company ID comes from query parameter when called from /companies/[id]/inventory/alertas
    const companyIdDeRuta = searchParams.get("companyId");
    
    let empresa;
    if (companyIdDeRuta) {
      // Modo: usar companyId de query string (filtrar por company_id directamente)
      empresa = {
        tenantId: "1", // tenant por defecto
        companyId: companyIdDeRuta,
      };
    } else {
      // Modo normal: usar contexto de Clerk
      empresa = await contextoDeEmpresa(request);
      if (!empresa.tenantId) {
        return NextResponse.json(
          { error: "Falta el tenant de la empresa" },
          { status: 400 }
        );
      }
    }
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json(
        { error: "Falta el tenant de la empresa" },
        { status: 400 }
      );
    }

    // Consultar productos activos
    const { data: products, error } = await getSupabaseServer()
      .from("product")
      .select("id, code, name, current_stock, min_stock, is_active, company_id")
      .eq("is_active", true);

    if (error) {
      console.error("Error fetching products for alerts:", error);
      return NextResponse.json({ error: "Error fetching products for alerts" }, { status: 500 });
    }

    // Calcular alertas desde los productos
    const alerts: any[] = [];
    const today = new Date().toISOString().split('T')[0];

    (products || []).forEach((p: any) => {
      // Alerta de stock bajo - verificar que los campos existan y sean números
      if (p.min_stock !== undefined && p.current_stock !== undefined && typeof p.min_stock === 'number' && typeof p.current_stock === 'number' && p.min_stock > 0 && p.current_stock <= p.min_stock) {
        alerts.push({
          id: p.id,
          product_id: p.id,
          code: p.code || 'SIN_CODIGO',
          name: p.name || 'Producto sin nombre',
          alert_type: 'low_stock',
          alert_message: `Stock bajo: ${p.current_stock} (mínimo: ${p.min_stock})`,
          current_stock: p.current_stock,
          min_stock: p.min_stock,
        });
      }
      // Alerta de vencimiento - solo si tiene fecha de expiración y es anterior a hoy
      if (p.expiration_date && p.expiration_date <= today) {
        alerts.push({
          id: p.id + '-exp',
          product_id: p.id,
          code: p.code || 'SIN_CODIGO',
          name: p.name || 'Producto sin nombre',
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
  } catch (error: any) {
    console.error("=== CRITICAL ERROR IN INVENTORY ALERTS ===");
    console.error("Error message:", error?.message);
    console.error("Error stack:", error?.stack);
    return NextResponse.json(
      { error: "Internal server error", details: error?.message },
      { status: 500 }
    );
  }
}