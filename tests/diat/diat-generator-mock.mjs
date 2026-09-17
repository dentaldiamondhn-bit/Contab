export const mockState = {
  periods: [],
  hasData: true,
  report: null,
  calls: { available: [], hasData: [], report: [] },
};

export function resetDiatMock() {
  mockState.periods = [];
  mockState.hasData = true;
  mockState.report = null;
  mockState.calls = { available: [], hasData: [], report: [] };
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
