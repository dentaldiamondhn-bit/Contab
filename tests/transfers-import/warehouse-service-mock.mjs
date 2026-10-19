// Mock de @/lib/services/warehouse-service para la import de traslados.

export const mockState = {
  calls: { createTr: [] },
  fallarCon: null,
};

export function resetTransfersImportMock() {
  mockState.calls.createTr = [];
  mockState.fallarCon = null;
}

export async function createTransfer(companyId, input, tenantHint) {
  mockState.calls.createTr.push({ companyId, input, tenantHint });
  if (mockState.fallarCon) throw new Error(mockState.fallarCon);
  if (!input?.source_warehouse_id || !input?.destination_warehouse_id) {
    throw new Error('source_warehouse_id es requerido');
  }
  if (input.source_warehouse_id === input.destination_warehouse_id) {
    throw new Error('El almacén origen y destino deben ser diferentes');
  }
  if (!Array.isArray(input.items) || input.items.length === 0) {
    throw new Error('items debe contener al menos un producto');
  }
  return {
    id: `tr-${mockState.calls.createTr.length}`,
    transfer_number: `TRF-${String(mockState.calls.createTr.length).padStart(5, '0')}`,
    status: 'pending',
  };
}

export function isMigrationMissingError() {
  return false;
}
