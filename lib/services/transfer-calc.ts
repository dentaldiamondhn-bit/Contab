// Lógica pura de multi-almacén y logística (sin I/O).
// Flujo logístico: pending -> in_transit -> received | cancelled.
// Stock por almacén se deriva del kardex (inventory_movement):
//   stock = Σ IN − Σ OUT por (almacén, producto).

export type TransferStatus = 'pending' | 'in_transit' | 'received' | 'cancelled';
export type TransferAction = 'dispatch' | 'receive' | 'cancel';

export interface MovementLike {
  product_id: string;
  warehouse_id: string | null;
  movement_type: string;
  quantity: number | string;
}

export interface TransferItemInput {
  product_id: string;
  quantity: number;
}

const TRANSITIONS: Record<TransferStatus, TransferStatus[]> = {
  pending: ['in_transit', 'cancelled'],
  in_transit: ['received', 'cancelled'],
  received: [],
  cancelled: [],
};

export const ACTION_TARGET: Record<TransferAction, TransferStatus> = {
  dispatch: 'in_transit',
  receive: 'received',
  cancel: 'cancelled',
};

export function canTransition(from: TransferStatus, to: TransferStatus): boolean {
  return (TRANSITIONS[from] || []).includes(to);
}

export function targetOf(action: TransferAction): TransferStatus {
  return ACTION_TARGET[action];
}

export function isValidStatus(s: string): s is TransferStatus {
  return s === 'pending' || s === 'in_transit' || s === 'received' || s === 'cancelled';
}

export function isValidAction(a: string): a is TransferAction {
  return a === 'dispatch' || a === 'receive' || a === 'cancel';
}

// Numeración TRF-00001 (igual patrón que AJ-00000 de ajustes).
export function nextTransferNumber(last: string | null | undefined): string {
  const m = typeof last === 'string' ? last.match(/^TRF-(\d+)$/) : null;
  const next = m ? parseInt(m[1], 10) + 1 : 1;
  return `TRF-${String(next).padStart(5, '0')}`;
}

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

// Agrega stock por "warehouse_id|product_id". Movimientos sin almacén se
// omiten (son globales previos a la asignación por almacén). OUT resta,
// cualquier otro tipo suma (IN, ADJUSTMENT como delta positivo).
export function aggregateStock(movements: MovementLike[]): Map<string, number> {
  const stock = new Map<string, number>();
  for (const m of movements) {
    if (!m || !m.warehouse_id || !m.product_id) continue;
    const key = `${m.warehouse_id}|${m.product_id}`;
    const qty = num(m.quantity);
    const delta = String(m.movement_type || '').toUpperCase() === 'OUT' ? -qty : qty;
    stock.set(key, (stock.get(key) || 0) + delta);
  }
  return stock;
}

export function stockKey(warehouseId: string, productId: string): string {
  return `${warehouseId}|${productId}`;
}

export interface DatedMovement extends MovementLike {
  created_at?: string | null;
}

// Stock acumulado por almacén/producto con movimientos hasta `end` inclusive
// (fecha ISO). Sin movimientos con almacén se omiten (globales previos).
export function aggregateStockAt(movements: DatedMovement[], end: string): Map<string, number> {
  const stock = new Map<string, number>();
  for (const m of movements || []) {
    if (!m || !m.warehouse_id || !m.product_id) continue;
    if (m.created_at && String(m.created_at) > end) continue;
    const qty = num(m.quantity);
    const delta = String(m.movement_type || '').toUpperCase() === 'OUT' ? -qty : qty;
    const key = stockKey(m.warehouse_id, m.product_id);
    stock.set(key, (stock.get(key) || 0) + delta);
  }
  return stock;
}

// Flujos IN/OUT por almacén/producto dentro de [start, end].
export function periodFlows(
  movements: DatedMovement[],
  start: string,
  end: string,
): Map<string, { in: number; out: number }> {
  const flows = new Map<string, { in: number; out: number }>();
  for (const m of movements || []) {
    if (!m || !m.warehouse_id || !m.product_id) continue;
    const when = String(m.created_at || '');
    if (when < start || when > end) continue;
    const qty = num(m.quantity);
    const key = stockKey(m.warehouse_id, m.product_id);
    const cur = flows.get(key) || { in: 0, out: 0 };
    if (String(m.movement_type || '').toUpperCase() === 'OUT') cur.out += qty;
    else cur.in += qty;
    flows.set(key, cur);
  }
  return flows;
}

export interface Shortage {
  product_id: string;
  requested: number;
  available: number;
}

// Valida disponibilidad en origen para los ítems del traslado.
export function checkAvailability(
  stock: Map<string, number>,
  sourceWarehouseId: string,
  items: TransferItemInput[],
): Shortage[] {
  const shortages: Shortage[] = [];
  for (const item of items) {
    const available = stock.get(stockKey(sourceWarehouseId, item.product_id)) || 0;
    if (available < item.quantity) {
      shortages.push({ product_id: item.product_id, requested: item.quantity, available });
    }
  }
  return shortages;
}

export function validateTransferInput(input: {
  source_warehouse_id?: string;
  destination_warehouse_id?: string;
  items?: TransferItemInput[];
}): string | null {
  if (!input || typeof input !== 'object') return 'Datos del traslado inválidos';
  if (!input.source_warehouse_id) return 'source_warehouse_id es requerido';
  if (!input.destination_warehouse_id) return 'destination_warehouse_id es requerido';
  if (input.source_warehouse_id === input.destination_warehouse_id) {
    return 'El almacén origen y destino deben ser diferentes';
  }
  const items = Array.isArray(input.items) ? input.items : [];
  if (items.length === 0) return 'items debe contener al menos un producto';
  for (let i = 0; i < items.length; i++) {
    const it = items[i];
    if (!it || !it.product_id) return `items[${i}]: product_id es requerido`;
    if (!Number.isInteger(Number(it.quantity)) || Number(it.quantity) <= 0) {
      return `items[${i}]: quantity debe ser un entero > 0`;
    }
  }
  return null;
}
