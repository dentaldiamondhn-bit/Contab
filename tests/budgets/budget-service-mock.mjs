// Mock de @/lib/services/budget-service para los tests de rutas.
// Replica la validación mínima del servicio real (400) sin tocar Supabase.

export const mockState = {
  budgets: [],
  budget: null,
  created: null,
  updated: null,
  deleted: false,
  comparison: null,
  trend: null,
  calls: { list: [], get: [], create: [], update: [], remove: [], comparison: [], trend: [] },
};

export function resetBudgetMock() {
  mockState.budgets = [];
  mockState.budget = null;
  mockState.created = null;
  mockState.updated = null;
  mockState.deleted = false;
  mockState.comparison = null;
  mockState.trend = null;
  mockState.calls = { list: [], get: [], create: [], update: [], remove: [], comparison: [], trend: [] };
}

export function isValidPeriod(period) {
  return /^\d{4}-(0[1-9]|1[0-2])$/.test(period);
}

export function isMissingTableError() {
  return false;
}

export async function listBudgets(companyId, tenantHint, opts) {
  mockState.calls.list.push({ companyId, tenantHint, opts });
  return mockState.budgets;
}

export async function getBudget(companyId, budgetId, tenantHint) {
  mockState.calls.get.push({ companyId, budgetId, tenantHint });
  return mockState.budget;
}

export async function createBudget(companyId, input, tenantHint) {
  mockState.calls.create.push({ companyId, input, tenantHint });
  if (!input || typeof input.name !== 'string' || !input.name.trim()) {
    throw new Error('name es requerido');
  }
  const year = Number(input?.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error('year debe ser un entero entre 2000 y 2100');
  }
  const lines = Array.isArray(input.lines) ? input.lines : [];
  if (lines.length === 0) throw new Error('lines debe contener al menos una línea');
  return (
    mockState.created || {
      id: 'budget-mock-1',
      tenant_id: 'TENANT',
      company_id: companyId,
      name: input.name.trim(),
      year,
      period_type: 'annual',
      status: 'draft',
      lines: [],
    }
  );
}

export async function updateBudget(companyId, budgetId, patch, tenantHint) {
  mockState.calls.update.push({ companyId, budgetId, patch, tenantHint });
  if (patch?.status && !['draft', 'active', 'closed'].includes(patch.status)) {
    throw new Error('status inválido');
  }
  return mockState.updated;
}

export async function deleteBudget(companyId, budgetId, tenantHint) {
  mockState.calls.remove.push({ companyId, budgetId, tenantHint });
  return mockState.deleted;
}

export async function getBudgetComparison(companyId, budgetId, period, tenantHint) {
  mockState.calls.comparison.push({ companyId, budgetId, period, tenantHint });
  return mockState.comparison;
}

export async function getBudgetTrend(companyId, budgetId, tenantHint) {
  mockState.calls.trend.push({ companyId, budgetId, tenantHint });
  return mockState.trend;
}
