import { NextRequest, NextResponse } from "next/server";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";
import { getSupabaseServer } from '@/lib/supabase/server-lazy';

export const dynamic = "force-dynamic";

// Antes resolvia solo el tenant y las alertas se contaban sobre el `product` de
// todo el tenant: test 1 recibia las alertas de stock bajo de los productos de
// test 2 (comparten `TEST1DS`). `contextoDeEmpresa` + `filtroEmpresaOCompany`
// aislan por `company_id`, que es el isolation key real.

// GET - Obtener alertas de inventario (stock bajo, vencimientos)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const alertType = searchParams.get("type"); // 'low_stock', 'expiring', 'all'
    const empresa = await contextoDeEmpresa(request);
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
      .select("*")
      .eq("tenant_id", tenantId)
      .match(filtroEmpresaOCompany(empresa))
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
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error in inventory alerts GET:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
