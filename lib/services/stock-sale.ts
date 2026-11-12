import { supabase } from '@/lib/supabase-db';

// Descuento de inventario al emitir una factura.
//
// No se puede hacer en transaccion desde el cliente (Supabase REST no la
// soporta), asi que se trabaja en dos fases desde la ruta de emision:
//   1. checkSaleStock()  -> solo lee. Si falta stock, se responde 400 ANTES de
//      crear la factura, asi que no hay nada que revertir.
//   2. applySaleStock()  -> descuenta con actualizacion optimista
//      (.eq('current_stock', stockBefore)): si otro proceso movio el stock
//      entre la lectura y la escritura, la actualizacion no afecta ninguna fila
//      y se reintenta releyendo.
//
// Cada descuento deja su fila en inventory_movement, igual que el modulo de
// inventario, y es idempotente por (reference_type, reference_id) para que un
// reintento de la peticion no descuente dos veces.

export type SaleLine = {
  productId: string | null | undefined;
  description: string;
  code: string | null | undefined;
  quantity: number;
  unitPrice: number;
};

export type StockShortage = {
  code: string;
  name: string;
  requested: number;
  available: number;
};

type ProductRow = {
  id: string;
  tenant_id: string;
  code: string | null;
  name: string | null;
  current_stock: number | null;
  is_service: boolean | null;
  warehouse_id: string | null;
  current_cost: number | null;
};

function qty(n: unknown): number {
  const v = Number(n);
  return Number.isFinite(v) ? v : 0;
}

// Los servicios no llevan control de existencia.
function isTracked(p: ProductRow): boolean {
  return p.is_service !== true;
}

// Agrupa las lineas por producto (el mismo producto puede repetirse) y separa
// las que no toca inventario (sin product_id, o servicios).
function aggregate(lines: SaleLine[]) {
  const wanted = new Map<string, number>();
  for (const line of lines) {
    if (!line.productId) continue;
    wanted.set(line.productId, (wanted.get(line.productId) || 0) + qty(line.quantity));
  }
  return wanted;
}

async function loadProducts(ids: string[]): Promise<Map<string, ProductRow>> {
  const map = new Map<string, ProductRow>();
  if (ids.length === 0) return map;
  const { data, error } = await (supabase as any)
.from('product')
    .select('id,tenant_id,code,name,current_stock,is_service,warehouse_id,current_cost')
    .in('id', ids);
  if (error) {
    console.error('[stock-sale] No se pudieron leer los productos:', error.message);
    return map;
  }
  for (const p of (data || []) as ProductRow[]) map.set(p.id, p);
  return map;
}

// Fase 1. Devuelve las carencias; array vacio = se puede emitir.
export async function checkSaleStock(
  tenantId: string,
  lines: SaleLine[],
): Promise<StockShortage[]> {
  const wanted = aggregate(lines);
  if (wanted.size === 0) return [];

  const products = await loadProducts([...wanted.keys()]);
  const shortages: StockShortage[] = [];

  for (const [productId, requested] of wanted) {
    const p = products.get(productId);
    if (!p) {
      // El product_id no existe en la BD: se reporta como carencia para no
      // emitir una factura que diga haber vendido algo que no esta en el
      // inventario.
      shortages.push({
        code: '(eliminado)',
        name: 'Producto del inventario no encontrado',
        requested,
        available: 0,
      });
      continue;
    }
    if (p.tenant_id !== tenantId) {
      // No se descuenta stock de otra empresa. Antes ya paso: la factura
      // 001-01-01-00000008 de ANGELOH7 apuntaba a PRD-001, del tenant 1.
      shortages.push({
        code: p.code || productId,
        name: `${p.name || 'Producto'} (pertenece a otra empresa)`,
        requested,
        available: qty(p.current_stock),
      });
      continue;
    }
    if (!isTracked(p)) continue;

    const available = qty(p.current_stock);
    if (requested > available) {
      shortages.push({
        code: p.code || productId,
        name: p.name || 'Producto',
        requested,
        available,
      });
    }
  }

  return shortages;
}

export type ApplyResult = {
  applied: number;
  skipped: number;
  shortages: StockShortage[];
  errors: string[];
  reverted: number;
};

// Fase 2. Se llama despues de que la factura y sus lineas ya existen.
export async function applySaleStock(params: {
  tenantId: string;
  invoiceId: string;
  invoiceNumber: string;
  lines: SaleLine[];
}): Promise<ApplyResult> {
  const { tenantId, invoiceId, invoiceNumber, lines } = params;
  const supabaseClient = supabase as any;
  const result: ApplyResult = { applied: 0, skipped: 0, shortages: [], errors: [], reverted: 0 };

  const wanted = aggregate(lines);
  if (wanted.size === 0) return result;

  // Idempotencia: si ya hay movimientos para esta factura, no se vuelve a
  // descontar.
  const { data: already, error: dupError } = await supabaseClient
    .from('inventory_movement')
    .select('id')
    .eq('reference_type', 'invoice')
    .eq('reference_id', invoiceId)
    .limit(1);
  if (dupError) {
    result.errors.push(`No se pudo verificar si ya se habia descontado: ${dupError.message}`);
    return result;
  }
  if (already && already.length > 0) {
    result.skipped = wanted.size;
    return result;
  }

  // Las carencias se vuelven a comprobar aqui porque el stock pudo cambiar
  // entre la fase 1 y ahora.
  const shortages = await checkSaleStock(tenantId, lines);
  if (shortages.length > 0) {
    result.shortages = shortages;
    return result;
  }

  const products = await loadProducts([...wanted.keys()]);
  const now = new Date().toISOString();
  const done: { product: ProductRow; before: number; after: number; quantity: number }[] = [];

  for (const [productId, quantity] of wanted) {
    const p = products.get(productId);
    if (!p || !isTracked(p)) {
      result.skipped += 1;
      continue;
    }

    // Actualizacion optimista con reintentos: el .eq sobre el valor leido
    // garantiza que no pisamos un descuento concurrente.
    let ok = false;
    let before = qty(p.current_stock);
    for (let attempt = 0; attempt < 3 && !ok; attempt += 1) {
      const after = before - quantity;
      if (after < 0) break;
      const { data: updated, error: updErr } = await supabaseClient
        .from('product')
        .update({ current_stock: after, updated_at: now })
        .eq('id', productId)
        .eq('tenant_id', tenantId)
        .eq('current_stock', before)
        .select('current_stock');
      if (updErr) {
        result.errors.push(`${p.code || productId}: ${updErr.message}`);
        break;
      }
      if (updated && updated.length === 1) {
        ok = true;
        done.push({ product: p, before, after, quantity });
      } else {
        // El stock cambio entre lectura y escritura: se relee y se reintenta.
        const { data: fresh } = await supabaseClient
          .from('product')
          .select('current_stock')
          .eq('id', productId)
          .maybeSingle();
        if (!fresh) break;
        before = qty(fresh.current_stock);
      }
    }

    if (!ok) {
      // Se revierte lo ya descontado en esta misma llamada para no dejar el
      // inventario a medias; la ruta borra la factura y responde 500.
      for (const d of done) {
        await supabaseClient
.from('product')
          .update({ current_stock: d.before, updated_at: now })
          .eq('id', d.product.id);
        result.reverted += 1;
      }
      await supabaseClient
        .from('inventory_movement')
        .delete()
        .eq('reference_type', 'invoice')
        .eq('reference_id', invoiceId);
      if (result.errors.length === 0) {
        result.errors.push(
          `El stock de ${p.code || productId} cambio mientras se emitia la factura. Vuelve a intentarlo.`,
        );
      }
      return result;
    }
  }

  if (done.length === 0) return result;

  const movements = done.map((d) => ({
    tenant_id: tenantId,
    product_id: d.product.id,
    warehouse_id: d.product.warehouse_id,
    movement_type: 'OUT',
    movement_reason: 'sale',
    quantity: d.quantity,
    unit_cost: qty(d.product.current_cost),
    total_cost: qty(d.product.current_cost) * d.quantity,
    stock_before: d.before,
    stock_after: d.after,
    reference_type: 'invoice',
    reference_id: invoiceId,
    reference_number: invoiceNumber,
    description: `Venta ${invoiceNumber}`,
    created_by: 'system',
    created_at: now,
    updated_at: now,
  }));

  const { error: mvError } = await supabaseClient.from('inventory_movement').insert(movements);
  if (mvError) {
    for (const d of done) {
      await supabaseClient
.from('product')
        .update({ current_stock: d.before, updated_at: now })
        .eq('id', d.product.id);
      result.reverted += 1;
    }
    result.errors.push(`No se pudo registrar el movimiento de inventario: ${mvError.message}`);
    return result;
  }

  result.applied = done.length;
  return result;
}
