// Mock de @/lib/services/warehouse-service para los tests de rutas.

export const mockState = {
  warehouses: [],
  warehouse: null,
  stock: [],
  transfers: [],
  transfer: null,
  variations: null,
  calls: {
    listWh: [],
    createWh: [],
    updateWh: [],
    stock: [],
    listTr: [],
    getTr: [],
    createTr: [],
    setStatus: [],
    variations: [],
  },
};

export function resetWarehouseMock() {
  mockState.warehouses = [];
  mockState.warehouse = null;
  mockState.stock = [];
  mockState.transfers = [];
  mockState.transfer = null;
  mockState.variations = null;
  mockState.calls = {
    listWh: [],
    createWh: [],
    updateWh: [],
    stock: [],
    listTr: [],
    getTr: [],
    createTr: [],
    setStatus: [],
    variations: [],
  };
}

export async function getInventoryVariations(companyId, from, to, tenantHint, opts) {
  mockState.calls.variations.push({ companyId, from, to, tenantHint, opts });
  const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;
  if (!PERIOD_RE.test(from || '') || !PERIOD_RE.test(to || '')) {
    throw new Error('from y to deben tener formato YYYY-MM (mes 01-12)');
  }
  if (from === to) {
    throw new Error('from y to deben ser períodos diferentes');
  }
  return mockState.variations;
}

export function isValidAction(a) {
  return a === 'dispatch' || a === 'receive' || a === 'cancel';
}

export function isValidStatus(s) {
  return ['pending', 'in_transit', 'received', 'cancelled'].includes(s);
}

export function isMigrationMissingError() {
  return false;
}

export async function listWarehouses(companyId, tenantHint, opts) {
  mockState.calls.listWh.push({ companyId, tenantHint, opts });
  return mockState.warehouses;
}

export async function createWarehouse(companyId, input, tenantHint) {
  mockState.calls.createWh.push({ companyId, input, tenantHint });
  if (!input || !input.code || !String(input.code).trim()) throw new Error('code es requerido');
  if (!input.name || !String(input.name).trim()) throw new Error('name es requerido');
  return { id: 'wh-new', code: input.code, name: input.name };
}

export async function updateWarehouse(companyId, warehouseId, patch, tenantHint) {
  mockState.calls.updateWh.push({ companyId, warehouseId, patch, tenantHint });
  return mockState.warehouse;
}

export async function getWarehouseStock(companyId, tenantHint, opts) {
  mockState.calls.stock.push({ companyId, tenantHint, opts });
  return mockState.stock;
}

export async function listTransfers(companyId, tenantHint, opts) {
  mockState.calls.listTr.push({ companyId, tenantHint, opts });
  if (opts?.status && !isValidStatus(opts.status)) throw new Error('status inválido');
  return mockState.transfers;
}

export async function getTransfer(companyId, transferId, tenantHint) {
  mockState.calls.getTr.push({ companyId, transferId, tenantHint });
  return mockState.transfer;
}

export async function createTransfer(companyId, input, tenantHint) {
  mockState.calls.createTr.push({ companyId, input, tenantHint });
  if (!input?.source_warehouse_id || !input?.destination_warehouse_id) {
    throw new Error('source_warehouse_id es requerido');
  }
  if (input.source_warehouse_id === input.destination_warehouse_id) {
    throw new Error('El almacén origen y destino deben ser diferentes');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('items debe contener al menos un producto');
  }
  return { id: 'tr-new', transfer_number: 'TRF-00001', status: 'pending' };
}

export async function setTransferStatus(companyId, transferId, action, opts, tenantHint) {
  mockState.calls.setStatus.push({ companyId, transferId, action, opts, tenantHint });
  if (!isValidAction(action)) throw new Error("action debe ser 'dispatch', 'receive' o 'cancel'");
  if (!mockState.transfer) throw new Error('NOT_FOUND');
  return { ...mockState.transfer, status: 'in_transit' };
}
