// Mock de @/lib/services/journal-service para los tests de la ruta.

export const mockState = {
  result: null,
  error: null,
  calls: [],
};

export function resetJournalMock() {
  mockState.result = null;
  mockState.error = null;
  mockState.calls = [];
}

export async function createJournalTransaction(client, tenantId, input) {
  mockState.calls.push({ tenantId, input });
  if (mockState.error) throw mockState.error;
  return (
    mockState.result || {
      transaction: { id: 'tx-mock', voucherNumber: 7 },
      entries: [],
    }
  );
}
