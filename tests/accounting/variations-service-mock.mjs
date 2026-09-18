// Mock de @/lib/services/period-variations para los tests de la ruta.

export const mockState = {
  report: null,
  calls: [],
};

export function resetVariationsMock() {
  mockState.report = null;
  mockState.calls = [];
}

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export async function getVariationsReport(client, tenantId, from, to) {
  mockState.calls.push({ tenantId, from, to });
  if (!PERIOD_RE.test(from || '') || !PERIOD_RE.test(to || '')) {
    throw new Error('from y to deben tener formato YYYY-MM (mes 01-12)');
  }
  if (from === to) {
    throw new Error('from y to deben ser períodos diferentes');
  }
  return mockState.report;
}
