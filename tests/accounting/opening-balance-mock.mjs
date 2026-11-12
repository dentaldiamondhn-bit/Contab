// Mock de @/lib/services/opening-balance para los tests de la ruta auto.

export const mockState = {
  preview: null,
  result: null,
  calls: [],
};

export function resetOpeningMock() {
  mockState.preview = null;
  mockState.result = null;
  mockState.calls = [];
}

export function validateYear(year) {
  if (!Number.isInteger(year) || year < 2001 || year > 2100) {
    throw new Error('year debe ser un entero entre 2001 y 2100');
  }
}

export async function computeOpeningBalances(client, tenantId, year) {
  mockState.calls.push({ op: 'preview', tenantId, year });
  return mockState.preview;
}

export async function applyOpeningBalances(client, tenantId, year, opts) {
  mockState.calls.push({ op: 'apply', tenantId, year, opts });
  return mockState.result;
}
