import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';
import { listWarehouses, listTransfers } from '@/lib/services/warehouse-service';
import { aggregateStockAt, num } from '@/lib/services/transfer-calc';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

interface DashboardProduct {
  id: string;
  code: string;
  name: string;
  category: string | null;
  current_cost: number;
  current_stock: number;
  min_stock: number;
  is_active: boolean;
  expiration_date: string | null;
  location: string | null;
}

interface MovementRow {
  product_id: string;
  warehouse_id: string | null;
  movement_type: string;
  quantity: number;
  unit_cost: number;
  created_at: string;
}

interface InventoryStats {
  companyId: string;
  generatedAt: string;
  months: number;
  kpis: {
    totalProducts: number;
    activeProducts: number;
    lowStock: number;
    outOfStock: number;
    totalUnits: number;
    totalValue: number;
    warehouseCount: number;
    pendingTransfers: number;
    inTransitTransfers: number;
    lowStockAlerts: number;
    expiringAlerts: number;
  };
  monthly: Array<{
    month: string;
    label: string;
    value: number;
    units: number;
    inflow: number;
    outflow: number;
  }>;
  categories: Array<{ name: string; value: number; productCount: number }>;
  topProducts: Array<{
    id: string;
    code: string;
    name: string;
    category: string;
    unit_cost: number;
    stock: number;
    value: number;
    location: string | null;
    low_stock: boolean;
  }>;
  stockByWarehouse: Array<{
    warehouse_id: string;
    warehouse_code: string;
    warehouse_name: string;
    productCount: number;
    units: number;
    value: number;
  }>;
  recentMovements: Array<{
    id: string;
    product_id: string;
    product_code: string;
    product_name: string;
    movement_type: string;
    movement_reason: string;
    quantity: number;
    total_cost: number;
    created_at: string;
    warehouse_id: string | null;
    location: string | null;
  }>;
}

// Stock global por producto al cierre de `end` (ignora almacén para no
// excluir movimientos legacy sin warehouse_id).
function stockByProductAt(movements: MovementRow[], end: string): Map<string, number> {
  const stock = new Map<string, number>();
  for (const m of movements || []) {
    if (!m || !m.product_id) continue;
    if (m.created_at && String(m.created_at) > end) continue;
    const qty = num(m.quantity);
    const delta = String(m.movement_type || '').toUpperCase() === 'OUT' ? -qty : qty;
    stock.set(m.product_id, (stock.get(m.product_id) || 0) + delta);
  }
  return stock;
}

function monthBounds(months: number): Array<{ start: string; end: string; label: string }> {
  const out: Array<{ start: string; end: string; label: string }> = [];
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  for (let i = months - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const firstDay = new Date(d.getFullYear(), d.getMonth(), 1);
    const lastDay = new Date(d.getFullYear(), d.getMonth() + 1, 0);
    const label = firstDay.toLocaleDateString('es-HN', { month: 'short', year: '2-digit' });
    out.push({
      start: `${firstDay.getFullYear()}-${pad(firstDay.getMonth() + 1)}-${pad(firstDay.getDate())}T00:00:00`,
      end: `${lastDay.getFullYear()}-${pad(lastDay.getMonth() + 1)}-${pad(lastDay.getDate())}T23:59:59`,
      label,
    });
  }
  return out;
}

// GET /api/companies/[id]/inventory/stats?months=6[&warehouseId=]
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId es requerido' },
        { status: 400 },
      );
    }
    const { searchParams } = new URL(request.url);
    const months = Math.min(24, Math.max(1, parseInt(searchParams.get('months') || '6', 10) || 6));

    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(companyId, tenantHint(request));

    const query = searchParams.get('warehouseId')
      ? (q: any) => q.eq('warehouse_id', searchParams.get('warehouseId'))
      : (q: any) => q;

    const [warehouses, productsRes, transfersPending, transfersInTransit] = await Promise.all([
      listWarehouses(companyId, tenantId, { activeOnly: true }),
      supabase
        .from('product')
        .select('id, code, name, category, current_cost, current_stock, min_stock, is_active, expiration_date, location')
        .eq('tenant_id', tenantId),
      listTransfers(companyId, tenantId, { status: 'pending' }),
      listTransfers(companyId, tenantId, { status: 'in_transit' }),
    ]);

    const products = ((productsRes.data || []) as DashboardProduct[]).filter(
      (p) => p && typeof p.id === 'string',
    );
    const productById = new Map(products.map((p) => [p.id, p]));

    const rawMovements = await supabase
      .from('inventory_movement')
      .select('product_id, warehouse_id, movement_type, quantity, unit_cost, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(20000);
    const allMovements = (rawMovements.data || []) as MovementRow[];
    const movements = query(allMovements as any) as MovementRow[];

    // KPIs (stock materializado actual)
    const active = products.filter((p) => p.is_active);
    const lowStock = active.filter(
      (p) => num(p.current_stock) > 0 && num(p.current_stock) <= num(p.min_stock),
    );
    const outOfStock = active.filter((p) => num(p.current_stock) === 0);
    const totalUnits = active.reduce((s, p) => s + Math.max(0, num(p.current_stock)), 0);
    const totalValue = active.reduce(
      (s, p) => s + Math.max(0, num(p.current_stock)) * num(p.current_cost),
      0,
    );
    const nowIso = new Date().toISOString().slice(0, 10);
    const expiring = products.filter(
      (p) => p.expiration_date && String(p.expiration_date).slice(0, 10) < nowIso,
    );

    // Tendencia mensual: stock al cierre de cada mes × costo actual.
    const bounds = monthBounds(months);
    const monthly = bounds.map((b) => {
      const stockAt = stockByProductAt(movements, b.end);
      let value = 0;
      let units = 0;
      for (const [pid, qty] of stockAt) {
        const prod = productById.get(pid);
        if (!prod) continue;
        units += Math.max(0, qty);
        value += Math.max(0, qty) * num(prod.current_cost);
      }
      let inflow = 0;
      let outflow = 0;
      for (const m of movements) {
        if (!m.created_at || String(m.created_at) < b.start || String(m.created_at) > b.end) continue;
        const qty = num(m.quantity);
        if (String(m.movement_type || '').toUpperCase() === 'OUT') outflow += qty;
        else inflow += qty;
      }
      return { month: b.start.slice(0, 7), label: b.label, value, units, inflow, outflow };
    });

    // Categorías (valor actual)
    const catMap = new Map<string, { value: number; productCount: number }>();
    for (const p of active) {
      const name = (p.category || '').trim() || 'Sin categoría';
      const cur = catMap.get(name) || { value: 0, productCount: 0 };
      cur.value += Math.max(0, num(p.current_stock)) * num(p.current_cost);
      cur.productCount += 1;
      catMap.set(name, cur);
    }
    const categories = Array.from(catMap.entries())
      .map(([name, v]) => ({ name, value: v.value, productCount: v.productCount }))
      .sort((a, b) => b.value - a.value);

    // Top productos por valor actual
    const topProducts = active
      .map((p) => {
        const stock = Math.max(0, num(p.current_stock));
        return {
          id: p.id,
          code: p.code || p.id,
          name: p.name || p.id,
          category: p.category || 'Sin categoría',
          unit_cost: num(p.current_cost),
          stock,
          value: stock * num(p.current_cost),
          location: p.location || null,
          low_stock: stock > 0 && stock <= num(p.min_stock),
        };
      })
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);

    // Stock por almacén (derivado del kardex, requiere warehouse_id)
    const byWarehouse = new Map<
      string,
      { warehouse_code: string; warehouse_name: string; productCount: Set<string>; units: number; value: number }
    >();
    const stockMap = aggregateStockAt(movements, nowIso + 'T23:59:59');
    const whById = new Map(warehouses.map((w) => [w.id, w]));
    for (const [key, qty] of stockMap) {
      const [warehouseId, productId] = key.split('|');
      const wh = whById.get(warehouseId);
      const prod = productById.get(productId);
      if (!wh || !prod) continue;
      const cur = byWarehouse.get(warehouseId) || {
        warehouse_code: wh.code,
        warehouse_name: wh.name,
        productCount: new Set<string>(),
        units: 0,
        value: 0,
      };
      const safe = Math.max(0, qty);
      cur.productCount.add(productId);
      cur.units += safe;
      cur.value += safe * num(prod.current_cost);
      byWarehouse.set(warehouseId, cur);
    }
    const stockByWarehouse = Array.from(byWarehouse.entries())
      .map(([warehouse_id, v]) => ({
        warehouse_id,
        warehouse_code: v.warehouse_code,
        warehouse_name: v.warehouse_name,
        productCount: v.productCount.size,
        units: v.units,
        value: v.value,
      }))
      .sort((a, b) => b.value - a.value);

    // Movimientos recientes (últimos 20, con datos del producto)
    const recentRes = await supabase
      .from('inventory_movement')
      .select('id, product_id, warehouse_id, movement_type, movement_reason, quantity, unit_cost, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: false })
      .limit(20);
    const recentMovements = ((recentRes.data || []) as Array<{
      id: string;
      product_id: string;
      warehouse_id: string | null;
      movement_type: string;
      movement_reason: string;
      quantity: number;
      unit_cost: number;
      created_at: string;
    }>).map((m) => ({
      ...m,
      total_cost: num(m.quantity) * num(m.unit_cost),
      product_code: productById.get(m.product_id)?.code || '',
      product_name: productById.get(m.product_id)?.name || m.product_id,
      location: productById.get(m.product_id)?.location || null,
    }));

    const stats: InventoryStats = {
      companyId,
      generatedAt: new Date().toISOString(),
      months,
      kpis: {
        totalProducts: products.length,
        activeProducts: active.length,
        lowStock: lowStock.length,
        outOfStock: outOfStock.length,
        totalUnits,
        totalValue,
        warehouseCount: warehouses.length,
        pendingTransfers: transfersPending.length,
        inTransitTransfers: transfersInTransit.length,
        lowStockAlerts: lowStock.length,
        expiringAlerts: expiring.length,
      },
      monthly,
      categories,
      topProducts,
      stockByWarehouse,
      recentMovements,
    };

    return NextResponse.json({ success: true, data: stats });
  } catch (error) {
    console.error('Error in inventory stats API:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}