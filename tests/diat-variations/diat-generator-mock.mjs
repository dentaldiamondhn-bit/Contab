// Mock de @/lib/services/diat-generator para el comparativo fiscal.

export const mockState = {
  variations: null,
  calls: [],
};

export function resetDiatVariationsMock() {
  mockState.variations = null;
  mockState.calls = [];
}

export async function getDiatVariations(companyId, from, to) {
  mockState.calls.push({ companyId, from, to });
  return mockState.variations;
}
