import test from 'node:test';
import assert from 'node:assert/strict';

import { GET as listGET, POST as listPOST } from '../../app/api/companies/[id]/budgets/route.ts';
import {
  DELETE as detailDELETE,
  GET as detailGET,
  PUT as detailPUT,
} from '../../app/api/companies/[id]/budgets/[budgetId]/route.ts';
import { GET as comparisonGET } from '../../app/api/companies/[id]/budgets/[budgetId]/comparison/route.ts';
import { GET as trendGET } from '../../app/api/companies/[id]/budgets/[budgetId]/trend/route.ts';
import { mockState, resetBudgetMock } from './budget-service-mock.mjs';

const req = (url, headers = {}) => ({
  url: `http://localhost${url}`,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
});
const params = (id, budgetId) => ({
  params: Promise.resolve(budgetId ? { id, budgetId } : { id }),
});
const withBody = (url, body) => {
  const r = req(url);
  r.json = async () => body;
  return r;
};

test('GET lista presupuestos (200) con tenant del header', async () => {
  resetBudgetMock();
  mockState.budgets = [{ id: 'b1', name: 'Anual 2026', year: 2026 }];

  const res = await listGET(req('/api/companies/ANGELOH7/budgets?year=2026', { 'x-tenant-id': 'T1' }), params('ANGELOH7'));
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.companyId, 'ANGELOH7');
  assert.deepEqual(body.data.budgets, [{ id: 'b1', name: 'Anual 2026', year: 2026 }]);
  assert.deepEqual(mockState.calls.list, [
    { companyId: 'ANGELOH7', tenantHint: 'T1', opts: { year: 2026, status: undefined } },
  ]);
});

test('GET lista 400 con year inválido (sin llamar al servicio)', async () => {
  resetBudgetMock();

  const res = await listGET(req('/api/companies/ANGELOH7/budgets?year=abc'), params('ANGELOH7'));
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.deepEqual(mockState.calls.list, []);
});

test('POST crea presupuesto (201)', async () => {
  resetBudgetMock();
  mockState.created = { id: 'b-new', name: 'Anual 2026', year: 2026, lines: [] };
  const input = {
    name: 'Anual 2026',
    year: 2026,
    lines: [{ account_code: '5101', category: 'gasto', amount: 12000 }],
  };

  const res = await listPOST(withBody('/api/companies/ANGELOH7/budgets', input), params('ANGELOH7'));
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.data.budget.id, 'b-new');
  assert.equal(mockState.calls.create[0].companyId, 'ANGELOH7');
});

test('POST 400 sin nombre (validación del servicio)', async () => {
  resetBudgetMock();

  const res = await listPOST(
    withBody('/api/companies/ANGELOH7/budgets', { year: 2026, lines: [] }),
    params('ANGELOH7'),
  );
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.match(body.error, /name/i);
});

test('GET detalle 404 cuando no existe', async () => {
  resetBudgetMock();
  mockState.budget = null;

  const res = await detailGET(req('/api/companies/ANGELOH7/budgets/nope'), params('ANGELOH7', 'nope'));
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.success, false);
});

test('PUT actualiza estado (200) y DELETE elimina (200)', async () => {
  resetBudgetMock();
  mockState.updated = { id: 'b1', status: 'active' };
  mockState.deleted = true;

  const putRes = await detailPUT(
    withBody('/api/companies/ANGELOH7/budgets/b1', { status: 'active' }),
    params('ANGELOH7', 'b1'),
  );
  const putBody = await putRes.json();
  assert.equal(putRes.status, 200);
  assert.equal(putBody.data.budget.status, 'active');

  const delRes = await detailDELETE(req('/api/companies/ANGELOH7/budgets/b1'), params('ANGELOH7', 'b1'));
  const delBody = await delRes.json();
  assert.equal(delRes.status, 200);
  assert.equal(delBody.data.deleted, true);
});

test('PUT 400 con status inválido', async () => {
  resetBudgetMock();

  const res = await detailPUT(
    withBody('/api/companies/ANGELOH7/budgets/b1', { status: '???' }),
    params('ANGELOH7', 'b1'),
  );
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.match(body.error, /status/i);
});

test('comparison 400 sin period y 400 con period inválido', async () => {
  resetBudgetMock();

  const missing = await comparisonGET(
    req('/api/companies/ANGELOH7/budgets/b1/comparison'),
    params('ANGELOH7', 'b1'),
  );
  assert.equal(missing.status, 400);

  const invalid = await comparisonGET(
    req('/api/companies/ANGELOH7/budgets/b1/comparison?period=2026-13'),
    params('ANGELOH7', 'b1'),
  );
  const invalidBody = await invalid.json();
  assert.equal(invalid.status, 400);
  assert.match(invalidBody.error, /YYYY-MM/);
  assert.deepEqual(mockState.calls.comparison, []);
});

test('comparison 404 cuando el presupuesto no existe; 200 con datos', async () => {
  resetBudgetMock();
  mockState.comparison = null;

  const nf = await comparisonGET(
    req('/api/companies/ANGELOH7/budgets/nope/comparison?period=2026-09'),
    params('ANGELOH7', 'nope'),
  );
  assert.equal(nf.status, 404);

  resetBudgetMock();
  mockState.comparison = {
    budget: { id: 'b1', name: 'Anual 2026' },
    period: '2026-09',
    lines: [{ accountCode: '5101', status: 'ok' }],
    totals: {},
    alerts: [{ level: 'critico' }],
  };
  const ok = await comparisonGET(
    req('/api/companies/ANGELOH7/budgets/b1/comparison?period=2026-09'),
    params('ANGELOH7', 'b1'),
  );
  const okBody = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(okBody.success, true);
  assert.equal(okBody.data.comparison.period, '2026-09');
  assert.equal(okBody.data.comparison.alerts.length, 1);
  assert.deepEqual(mockState.calls.comparison, [
    { companyId: 'ANGELOH7', budgetId: 'b1', period: '2026-09', tenantHint: null },
  ]);
});

test('trend 404 cuando no existe; 200 con 12 meses', async () => {
  resetBudgetMock();
  mockState.trend = null;

  const nf = await trendGET(req('/api/companies/ANGELOH7/budgets/nope/trend'), params('ANGELOH7', 'nope'));
  assert.equal(nf.status, 404);

  mockState.trend = {
    budget: { id: 'b1', year: 2026 },
    year: 2026,
    months: Array.from({ length: 12 }, (_, i) => ({
      period: `2026-${String(i + 1).padStart(2, '0')}`,
      gasto: { budgeted: 1000, actual: 800 },
      ingreso: { budgeted: 2000, actual: 2100 },
    })),
  };
  const ok = await trendGET(req('/api/companies/ANGELOH7/budgets/b1/trend'), params('ANGELOH7', 'b1'));
  const okBody = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(okBody.data.trend.months.length, 12);
  assert.deepEqual(mockState.calls.trend, [
    { companyId: 'ANGELOH7', budgetId: 'nope', tenantHint: null },
    { companyId: 'ANGELOH7', budgetId: 'b1', tenantHint: null },
  ]);
});
