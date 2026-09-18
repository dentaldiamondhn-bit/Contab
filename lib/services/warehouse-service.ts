// Servicio multi-almacén y logística (server-side).
// Tablas: warehouse, inventory_transfer, inventory_transfer_item,
// inventory_movement, product. Migración: supabase/WAREHOUSE_LOGISTICS.sql.
// Flujo: pending -> in_transit -> received | cancelled.
// El stock por almacén se deriva del kardex (warehouse_id en cada movimiento).

import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';
import {
  ACTION_TARGET,
  TransferAction,
  TransferStatus,
  aggregateStock,
  aggregateStockAt,
  canTransition,
  checkAvailability,
  isValidAction,
  isValidStatus,
  nextTransferNumber,
  num,
  periodFlows,
  stockKey,
  validateTransferInput,
} from '@/lib/services/transfer-calc';
import type { Shortage } from '@/lib/services/transfer-calc';

export type { Shortage, TransferAction, TransferStatus };
export { isValidAction, isValidStatus };

export interface Warehouse {
  id: string;
  tenant_id: string;
  company_id: string | null;
  code: string;
  name: string;
  location: string;
  description: string;
  is_active: boolean;
}

export interface TransferItem {
  id: string;
  transfer_id: string;
  product_id: string;
  product_code?: string;
  product_name?: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  lot_number: string | null;
  expiration_date: string | null;
}

export interface Transfer {
  id: string;
  tenant_id: string;
  company_id: string | null;
  transfer_number: string;
  transfer_date: string;
  source_warehouse_id: string;
  source_warehouse_name?: string;
  destination_warehouse_id: string;
  destination_warehouse_name?: string;
  total_items: number;
  total_cost: number;
  status: TransferStatus;
  carrier: string;
  guide_number: string;
  notes: string;
  created_by: string | null;
  dispatched_by: string | null;
  dispatched_at: string | null;
  received_by: string | null;
  received_at: string | null;
  created_at: string;
}

export interface TransferWithItems extends Transfer {
  items: TransferItem[];
}

export interface WarehouseStockRow {
  warehouse_id: string;
  warehouse_code: string;
  warehouse_name: string;
  product_id: string;
  product_code: string;
  product_name: string;
  min_stock: number;
  unit_cost: number;
  stock: number;
  low_stock: boolean;
}

export interface InventoryVariationRow {
  warehouse_id: string;
  warehouse_name: string;
  product_id: string;
  product_code: string;
  product_name: string;
  fromPeriod: string;
  toPeriod: string;
  fromStock: number;
  toStock: number;
  varAbs: number;
  fromIn: number;
  fromOut: number;
  toIn: number;
  toOut: number;
}

export interface InventoryVariations {
  from: string;
  to: string;
  rows: InventoryVariationRow[];
  generatedAt: string;
}

const MIGRATION_HINT =
  'Faltan columnas/tablas de logística. Ejecute supabase/WAREHOUSE_LOGISTICS.sql en el SQL Editor de Supabase.';

export function isMigrationMissingError(err: unknown): boolean {
  const msg = String((err as { message?: string })?.message || err || '');
  const code = String((err as { code?: string })?.code || '');
  return (
    code === '42P01' ||
    code === '42703' ||
    code === 'PGRST205' ||
    code === 'PGRST204' ||
    /relation .* does not exist/i.test(msg) ||
    /could not find the table/i.test(msg) ||
    /column .* does not exist/i.test(msg) ||
    /could not find the .* column/i.test(msg)
  );
}

function migrationError(): Error {
  const err = new Error(MIGRATION_HINT);
  (err as { code?: string }).code = 'WAREHOUSE_MIGRATION_MISSING';
  return err;
}

function companyScope(query: unknown, companyId: string) {
  // Incluye filas legacy sin company_id.
  return (query as { or: (cond: string) => unknown }).or(
    `company_id.eq.${companyId},company_id.is.null`,
  );
}

// ---------- Almacenes ----------

export async function listWarehouses(
  companyId: string,
  tenantHint?: string | null,
  opts?: { activeOnly?: boolean },
): Promise<Warehouse[]> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  let query = supabase
    .from('warehouse')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('name', { ascending: true });
  query = companyScope(query, companyId) as typeof query;
  if (opts?.activeOnly !== false) query = query.eq('is_active', true);
  const { data, error } = await query;
  if (error) {
    if (isMigrationMissingError(error)) throw migrationError();
    throw error;
  }
  return (data || []) as Warehouse[];
}

export async function createWarehouse(
  companyId: string,
  input: { code: string; name: string; location?: string; description?: string },
  tenantHint?: string | null,
): Promise<Warehouse> {
  if (!input || typeof input.code !== 'string' || !input.code.trim()) {
    throw new Error('code es requerido');
  }
  if (typeof input.name !== 'string' || !input.name.trim()) {
    throw new Error('name es requerido');
  }
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('warehouse')
    .insert({
      tenant_id: tenantId,
      company_id: companyId,
      code: input.code.trim().toUpperCase(),
      name: input.name.trim(),
      location: (input.location || '').trim(),
      description: (input.description || '').trim(),
      is_active: true,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (error) {
    if (isMigrationMissingError(error)) throw migrationError();
    throw error;
  }
  return data as Warehouse;
}

export async function updateWarehouse(
  companyId: string,
  warehouseId: string,
  patch: Partial<Pick<Warehouse, 'name' | 'location' | 'description' | 'is_active'>>,
  tenantHint?: string | null,
): Promise<Warehouse | null> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  const { data: existing } = await supabase
    .from('warehouse')
    .select('id')
    .eq('id', warehouseId)
    .eq('tenant_id', tenantId)
    .maybeSingle();
  if (!existing) return null;

  if (patch.is_active === false) {
    // No desactivar con traslados abiertos.
    const { data: open } = await supabase
      .from('inventory_transfer')
      .select('id')
      .eq('tenant_id', tenantId)
      .in('status', ['pending', 'in_transit'])
      .or(`source_warehouse_id.eq.${warehouseId},destination_warehouse_id.eq.${warehouseId}`)
      .limit(1);
    if (open && open.length > 0) {
      throw new Error('No se puede desactivar: tiene traslados pendientes o en tránsito');
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  if (patch.name !== undefined) {
    if (typeof patch.name !== 'string' || !patch.name.trim()) throw new Error('name inválido');
    updates.name = patch.name.trim();
  }
  if (patch.location !== undefined) updates.location = String(patch.location || '');
  if (patch.description !== undefined) updates.description = String(patch.description || '');
  if (patch.is_active !== undefined) updates.is_active = !!patch.is_active;

  const { data, error } = await supabase
    .from('warehouse')
    .update(updates)
    .eq('id', warehouseId)
    .select()
    .single();
  if (error) {
    if (isMigrationMissingError(error)) throw migrationError();
    throw error;
  }
  return data as Warehouse;
}

// ---------- Stock por almacén (derivado del kardex) ----------

export async function getWarehouseStock(
  companyId: string,
  tenantHint?: string | null,
  opts?: { warehouseId?: string; productId?: string },
): Promise<WarehouseStockRow[]> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);

  const [warehouses, products, movements] = await Promise.all([
    listWarehouses(companyId, tenantId, { activeOnly: false }),
    supabase.from('product').select('id, code, name, min_stock, current_cost').eq('tenant_id', tenantId),
    supabase
      .from('inventory_movement')
      .select('product_id, warehouse_id, movement_type, quantity')
      .eq('tenant_id', tenantId),
  ]);
  if (products.error) throw products.error;
  if (movements.error) throw movements.error;

  const stock = aggregateStock(
    (movements.data || []) as Array<{
      product_id: string;
      warehouse_id: string | null;
      movement_type: string;
      quantity: number;
    }>,
  );

  const whById = new Map(warehouses.map((w) => [w.id, w]));
  const prodById = new Map(
    ((products.data || []) as Array<{ id: string; code: string; name: string; min_stock: number; current_cost: number }>).map(
      (p) => [p.id, p],
    ),
  );

  const rows: WarehouseStockRow[] = [];
  for (const [key, qty] of stock) {
    const [warehouseId, productId] = key.split('|');
    if (opts?.warehouseId && warehouseId !== opts.warehouseId) continue;
    if (opts?.productId && productId !== opts.productId) continue;
    const wh = whById.get(warehouseId);
    const prod = prodById.get(productId);
    if (!wh || !prod) continue;
    const min = num(prod.min_stock);
    rows.push({
      warehouse_id: warehouseId,
      warehouse_code: wh.code,
      warehouse_name: wh.name,
      product_id: productId,
      product_code: prod.code,
      product_name: prod.name,
      min_stock: min,
      unit_cost: num(prod.current_cost),
      stock: qty,
      low_stock: qty <= min,
    });
  }
  return rows.sort((a, b) =>
    a.warehouse_name.localeCompare(b.warehouse_name) ||
    a.product_code.localeCompare(b.product_code),
  );
}

// ---------- Traslados ----------

async function warehouseName(supabase: ReturnType<typeof getSupabaseServer>, id: string): Promise<string> {
  const { data } = await supabase.from('warehouse').select('name').eq('id', id).maybeSingle();
  return String((data as { name?: string } | null)?.name || id);
}

export async function listTransfers(
  companyId: string,
  tenantHint?: string | null,
  opts?: { status?: string },
): Promise<Transfer[]> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  let query = supabase
    .from('inventory_transfer')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(200);
  query = companyScope(query, companyId) as typeof query;
  if (opts?.status) {
    if (!isValidStatus(opts.status)) throw new Error('status inválido');
    query = query.eq('status', opts.status);
  }
  const { data, error } = await query;
  if (error) {
    if (isMigrationMissingError(error)) throw migrationError();
    throw error;
  }
  return (data || []) as Transfer[];
}

export async function getTransfer(
  companyId: string,
  transferId: string,
  tenantHint?: string | null,
): Promise<TransferWithItems | null> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  let query = supabase
    .from('inventory_transfer')
    .select('*')
    .eq('id', transferId)
    .eq('tenant_id', tenantId);
  query = companyScope(query, companyId) as typeof query;
  const { data: transfer, error } = await query.maybeSingle();
  if (error) {
    if (isMigrationMissingError(error)) throw migrationError();
    throw error;
  }
  if (!transfer) return null;

  const { data: items, error: itemsError } = await supabase
    .from('inventory_transfer_item')
    .select('*')
    .eq('transfer_id', transferId);
  if (itemsError) throw itemsError;

  const t = transfer as Transfer;
  const enriched = await enrichItems(supabase, (items || []) as TransferItem[]);
  const [sourceName, destName] = await Promise.all([
    warehouseName(supabase, t.source_warehouse_id),
    warehouseName(supabase, t.destination_warehouse_id),
  ]);
  return {
    ...t,
    source_warehouse_name: sourceName,
    destination_warehouse_name: destName,
    items: enriched,
  };
}

async function enrichItems(
  supabase: ReturnType<typeof getSupabaseServer>,
  items: TransferItem[],
): Promise<TransferItem[]> {
  if (items.length === 0) return items;
  const ids = [...new Set(items.map((i) => i.product_id))];
  const { data } = await supabase.from('product').select('id, code, name').in('id', ids);
  const byId = new Map(
    ((data || []) as Array<{ id: string; code: string; name: string }>).map((p) => [p.id, p]),
  );
  return items.map((i) => ({
    ...i,
    product_code: byId.get(i.product_id)?.code || '',
    product_name: byId.get(i.product_id)?.name || i.product_id,
  }));
}

export async function createTransfer(
  companyId: string,
  input: {
    source_warehouse_id: string;
    destination_warehouse_id: string;
    transfer_date?: string;
    carrier?: string;
    guide_number?: string;
    notes?: string;
    created_by?: string;
    items: Array<{ product_id: string; quantity: number; unit_cost?: number }>;
  },
  tenantHint?: string | null,
): Promise<TransferWithItems> {
  const err = validateTransferInput(input);
  if (err) throw new Error(err);

  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);

  // Almacenes existen, activos y del tenant.
  const { data: whs, error: whError } = await supabase
    .from('warehouse')
    .select('id, name, is_active')
    .eq('tenant_id', tenantId)
    .in('id', [input.source_warehouse_id, input.destination_warehouse_id]);
  if (whError) {
    if (isMigrationMissingError(whError)) throw migrationError();
    throw whError;
  }
  const byId = new Map(((whs || []) as Warehouse[]).map((w) => [w.id, w]));
  const source = byId.get(input.source_warehouse_id);
  const dest = byId.get(input.destination_warehouse_id);
  if (!source || !dest) throw new Error('Almacén origen o destino no existe');
  if (!source.is_active || !dest.is_active) {
    throw new Error('Almacén origen y destino deben estar activos');
  }

  // Productos existen (costo fallback).
  const productIds = [...new Set(input.items.map((i) => i.product_id))];
  const { data: prods, error: prodError } = await supabase
    .from('product')
    .select('id, code, name, current_cost')
    .eq('tenant_id', tenantId)
    .in('id', productIds);
  if (prodError) throw prodError;
  const prodById = new Map(
    ((prods || []) as Array<{ id: string; code: string; name: string; current_cost: number }>).map((p) => [
      p.id,
      p,
    ]),
  );
  for (const item of input.items) {
    if (!prodById.has(item.product_id)) {
      throw new Error(`Producto no existe: ${item.product_id}`);
    }
  }

  // Disponibilidad en origen (kardex por almacén).
  const { data: movs, error: movError } = await supabase
    .from('inventory_movement')
    .select('product_id, warehouse_id, movement_type, quantity')
    .eq('tenant_id', tenantId)
    .eq('warehouse_id', input.source_warehouse_id)
    .in(
      'product_id',
      productIds,
    );
  if (movError) throw movError;
  const stock = aggregateStock((movs || []) as Array<{
    product_id: string;
    warehouse_id: string | null;
    movement_type: string;
    quantity: number;
  }>);
  const shortages = checkAvailability(
    stock,
    input.source_warehouse_id,
    input.items.map((i) => ({ product_id: i.product_id, quantity: Number(i.quantity) })),
  );
  if (shortages.length > 0) {
    const s = shortages[0];
    const pname = prodById.get(s.product_id)?.name || s.product_id;
    throw new Error(
      `Stock insuficiente en origen para ${pname}: solicitado ${s.requested}, disponible ${s.available}`,
    );
  }

  // Numeración.
  const { data: last } = await supabase
    .from('inventory_transfer')
    .select('transfer_number')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  const transferNumber = nextTransferNumber(
    (last as { transfer_number?: string } | null)?.transfer_number,
  );

  const now = new Date().toISOString();
  const itemsCalc = input.items.map((i) => {
    const unitCost = i.unit_cost !== undefined ? num(i.unit_cost) : num(prodById.get(i.product_id)?.current_cost);
    return {
      product_id: i.product_id,
      quantity: Number(i.quantity),
      unit_cost: unitCost,
      total_cost: unitCost * Number(i.quantity),
    };
  });
  const totalCost = itemsCalc.reduce((s, i) => s + i.total_cost, 0);

  const { data: transfer, error: tError } = await supabase
    .from('inventory_transfer')
    .insert({
      tenant_id: tenantId,
      company_id: companyId,
      transfer_number: transferNumber,
      transfer_date: input.transfer_date || now.slice(0, 10),
      source_warehouse_id: input.source_warehouse_id,
      destination_warehouse_id: input.destination_warehouse_id,
      total_items: itemsCalc.reduce((s, i) => s + i.quantity, 0),
      total_cost: totalCost,
      status: 'pending',
      carrier: (input.carrier || '').trim(),
      guide_number: (input.guide_number || '').trim(),
      notes: input.notes || '',
      created_by: input.created_by || null,
      created_at: now,
      updated_at: now,
    })
    .select()
    .single();
  if (tError) {
    if (isMigrationMissingError(tError)) throw migrationError();
    throw tError;
  }

  const { data: inserted, error: iError } = await supabase
    .from('inventory_transfer_item')
    .insert(
      itemsCalc.map((i) => ({ transfer_id: (transfer as Transfer).id, ...i })),
    )
    .select();
  if (iError) {
    await supabase.from('inventory_transfer').delete().eq('id', (transfer as Transfer).id);
    throw iError;
  }

  const t = transfer as Transfer;
  return {
    ...t,
    source_warehouse_name: source.name,
    destination_warehouse_name: dest.name,
    items: await enrichItems(supabase, (inserted || []) as TransferItem[]),
  };
}

// Publica un movimiento de kardex ligado al traslado y ajusta stock global.
async function postTransferMovement(
  supabase: ReturnType<typeof getSupabaseServer>,
  opts: {
    tenantId: string;
    transfer: Transfer;
    item: { product_id: string; quantity: number; unit_cost: number };
    warehouseId: string;
    movementType: 'IN' | 'OUT';
    reason: 'transfer_out' | 'transfer_in' | 'transfer_return';
    by: string;
  },
): Promise<void> {
  const { data: product } = await supabase
    .from('product')
    .select('id, current_stock')
    .eq('id', opts.item.product_id)
    .single();
  if (!product) throw new Error(`Producto no existe: ${opts.item.product_id}`);
  const before = num((product as { current_stock?: number }).current_stock);
  const after =
    opts.movementType === 'OUT' ? before - opts.item.quantity : before + opts.item.quantity;
  if (after < 0) {
    throw new Error(`Stock global insuficiente para ${opts.item.product_id}`);
  }
  const now = new Date().toISOString();
  const { error } = await supabase.from('inventory_movement').insert({
    tenant_id: opts.tenantId,
    product_id: opts.item.product_id,
    warehouse_id: opts.warehouseId,
    movement_type: opts.movementType,
    movement_reason: opts.reason,
    quantity: opts.item.quantity,
    unit_cost: opts.item.unit_cost,
    total_cost: opts.item.unit_cost * opts.item.quantity,
    stock_before: before,
    stock_after: after,
    reference_id: opts.transfer.id,
    reference_type: 'transfer',
    reference_number: opts.transfer.transfer_number,
    notes: `Traslado ${opts.transfer.transfer_number} (${opts.reason})`,
    created_by: opts.by,
    created_at: now,
    updated_at: now,
  });
  if (error) throw error;
  const { error: updError } = await supabase
    .from('product')
    .update({ current_stock: after, updated_at: now })
    .eq('id', opts.item.product_id);
  if (updError) throw updError;
}

export async function setTransferStatus(
  companyId: string,
  transferId: string,
  action: string,
  opts?: { by?: string; receivedBy?: string },
  tenantHint?: string | null,
): Promise<TransferWithItems> {
  if (!isValidAction(action)) {
    throw new Error("action debe ser 'dispatch', 'receive' o 'cancel'");
  }
  const transfer = await getTransfer(companyId, transferId, tenantHint);
  if (!transfer) throw new Error('NOT_FOUND');
  const target = ACTION_TARGET[action as TransferAction];
  if (!canTransition(transfer.status, target)) {
    throw new Error(`Transición inválida: ${transfer.status} -> ${target}`);
  }

  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  const by = opts?.by || 'system';
  const now = new Date().toISOString();

  if (action === 'dispatch') {
    // Revalidar disponibilidad en origen antes de despachar.
    const { data: movs } = await supabase
      .from('inventory_movement')
      .select('product_id, warehouse_id, movement_type, quantity')
      .eq('tenant_id', tenantId)
      .eq('warehouse_id', transfer.source_warehouse_id);
    const stock = aggregateStock((movs || []) as Array<{
      product_id: string;
      warehouse_id: string | null;
      movement_type: string;
      quantity: number;
    }>);
    const shortages = checkAvailability(
      stock,
      transfer.source_warehouse_id,
      transfer.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })),
    );
    if (shortages.length > 0) {
      throw new Error(
        `Stock insuficiente en origen para ${shortages[0].product_id}: solicitado ${shortages[0].requested}, disponible ${shortages[0].available}`,
      );
    }
    for (const item of transfer.items) {
      await postTransferMovement(supabase, {
        tenantId,
        transfer,
        item: { product_id: item.product_id, quantity: item.quantity, unit_cost: num(item.unit_cost) },
        warehouseId: transfer.source_warehouse_id,
        movementType: 'OUT',
        reason: 'transfer_out',
        by,
      });
    }
    await supabase
      .from('inventory_transfer')
      .update({ status: 'in_transit', dispatched_by: by, dispatched_at: now, updated_at: now })
      .eq('id', transferId);
  } else if (action === 'receive') {
    for (const item of transfer.items) {
      await postTransferMovement(supabase, {
        tenantId,
        transfer,
        item: { product_id: item.product_id, quantity: item.quantity, unit_cost: num(item.unit_cost) },
        warehouseId: transfer.destination_warehouse_id,
        movementType: 'IN',
        reason: 'transfer_in',
        by,
      });
    }
    await supabase
      .from('inventory_transfer')
      .update({
        status: 'received',
        received_by: opts?.receivedBy || by,
        received_at: now,
        updated_at: now,
      })
      .eq('id', transferId);
  } else {
    // cancel: si estaba en tránsito, devolver mercadería al origen.
    if (transfer.status === 'in_transit') {
      for (const item of transfer.items) {
        await postTransferMovement(supabase, {
          tenantId,
          transfer,
          item: { product_id: item.product_id, quantity: item.quantity, unit_cost: num(item.unit_cost) },
          warehouseId: transfer.source_warehouse_id,
          movementType: 'IN',
          reason: 'transfer_return',
          by,
        });
      }
    }
    await supabase
      .from('inventory_transfer')
      .update({ status: 'cancelled', updated_at: now })
      .eq('id', transferId);
  }

  const updated = await getTransfer(companyId, transferId, tenantHint);
  if (!updated) throw new Error('NOT_FOUND');
  return updated;
}

function monthRange(period: string): { start: string; end: string } {
  const [y, m] = period.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return { start: `${y}-${pad(m)}-01T00:00:00`, end: `${y}-${pad(m)}-${pad(lastDay)}T23:59:59` };
}

// Variaciones de inventario entre dos meses: stock acumulado al cierre de
// cada mes + flujos IN/OUT dentro de cada mes, por almacén y producto.
export async function getInventoryVariations(
  companyId: string,
  from: string,
  to: string,
  tenantHint?: string | null,
  opts?: { warehouseId?: string },
): Promise<InventoryVariations> {
  const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!PERIOD_RE.test(from) || !PERIOD_RE.test(to)) {
    throw new Error('from y to deben tener formato YYYY-MM (mes 01-12)');
  }
  if (from === to) {
    throw new Error('from y to deben ser períodos diferentes');
  }
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);

  const [warehouses, products, movements] = await Promise.all([
    listWarehouses(companyId, tenantId, { activeOnly: false }),
    supabase.from('product').select('id, code, name').eq('tenant_id', tenantId),
    supabase
      .from('inventory_movement')
      .select('product_id, warehouse_id, movement_type, quantity, created_at')
      .eq('tenant_id', tenantId)
      .order('created_at', { ascending: true })
      .limit(10000),
  ]);
  if (products.error) throw products.error;
  if (movements.error) throw movements.error;

  const fr = monthRange(from);
  const tr = monthRange(to);
  const movs = ((movements.data || []) as Array<{
    product_id: string;
    warehouse_id: string | null;
    movement_type: string;
    quantity: number;
    created_at: string;
  }>).filter((m) => !opts?.warehouseId || m.warehouse_id === opts.warehouseId);

  const fromStock = aggregateStockAt(movs, fr.end);
  const toStock = aggregateStockAt(movs, tr.end);
  const fromFlows = periodFlows(movs, fr.start, fr.end);
  const toFlows = periodFlows(movs, tr.start, tr.end);

  const whById = new Map(warehouses.map((w) => [w.id, w]));
  const prodById = new Map(
    ((products.data || []) as Array<{ id: string; code: string; name: string }>).map((p) => [p.id, p]),
  );

  const keys = new Set<string>([
    ...fromStock.keys(),
    ...toStock.keys(),
    ...fromFlows.keys(),
    ...toFlows.keys(),
  ]);
  const rows: InventoryVariationRow[] = [];
  for (const key of keys) {
    const [warehouseId, productId] = key.split('|');
    const wh = whById.get(warehouseId);
    const prod = prodById.get(productId);
    if (!wh || !prod) continue;
    const fs = fromStock.get(key) || 0;
    const ts = toStock.get(key) || 0;
    const ff = fromFlows.get(key) || { in: 0, out: 0 };
    const tf = toFlows.get(key) || { in: 0, out: 0 };
    if (fs === 0 && ts === 0 && ff.in === 0 && ff.out === 0 && tf.in === 0 && tf.out === 0) continue;
    rows.push({
      warehouse_id: warehouseId,
      warehouse_name: wh.name,
      product_id: productId,
      product_code: prod.code,
      product_name: prod.name,
      fromPeriod: from,
      toPeriod: to,
      fromStock: fs,
      toStock: ts,
      varAbs: ts - fs,
      fromIn: ff.in,
      fromOut: ff.out,
      toIn: tf.in,
      toOut: tf.out,
    });
  }
  rows.sort((a, b) =>
    a.warehouse_name.localeCompare(b.warehouse_name) ||
    a.product_code.localeCompare(b.product_code),
  );
  return { from, to, rows, generatedAt: new Date().toISOString() };
}
