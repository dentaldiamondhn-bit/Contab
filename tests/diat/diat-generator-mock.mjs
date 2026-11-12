/**
 * Doble de `@/lib/tenant-resolver` para los tests de la ruta de DIAT.
 *
 * Antes la ruta no usaba contexto: leia `?companyId` y confiaba en el. Por eso
 * estos stubs no existian. `mockState.empresa` es lo que el request "lleva"
 * como empresa activa (lo que en produccion decide `contextoDeEmpresa` leyendo
 * la cookie y validando la membresia).
 */
export const mockState = {
  periods: [],
  hasData: true,
  report: null,
  calls: { available: [], hasData: [], report: [] },
  /** Empresa que resuelve el contexto. `companyId: null` simula que no se pudo determinar. */
  empresa: { tenantId: 'ANGELOH7', companyId: 'ANGELOH7' },
  /** Si se rellena, `contextoDeEmpresa` lanza ese `ErrorDeEmpresa`. */
  error: null,
};

export function resetDiatMock() {
  mockState.periods = [];
  mockState.hasData = true;
  mockState.report = null;
  mockState.calls = { available: [], hasData: [], report: [] };
  mockState.empresa = { tenantId: 'ANGELOH7', companyId: 'ANGELOH7' };
  mockState.error = null;
}

export async function getAvailableDiatPeriods(companyId) {
  mockState.calls.available.push(companyId);
  return mockState.periods;
}

export async function hasDiatData(companyId) {
  mockState.calls.hasData.push(companyId);
  return mockState.hasData;
}

export async function getDiatReport(companyId, period) {
  mockState.calls.report.push({ companyId, period });
  return mockState.report;
}