import test from 'node:test';
import assert from 'node:assert/strict';

import { GET } from '../../app/api/accounting/period-variations/route.ts';
import { mockState, resetVariationsMock } from './variations-service-mock.mjs';

const req = (query = '', headers = {}) => ({
  url: `http://localhost/api/accounting/period-variations${query}`,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
});
const tenant = { 'x-tenant-id': 'T1' };

test('400 — sin tenant y períodos inválidos/iguales', async () => {
  resetVariationsMock();
  mockState.report = { rows: [] };

  const noTenant = await GET(req('?from=2026-09&to=2026-10'));
  assert.equal(noTenant.status, 400);
  assert.deepEqual(mockState.calls, []);

  const badFormat = await GET(req('?from=2026-13&to=2026-10', tenant));
  const badBody = await badFormat.json();
  assert.equal(badFormat.status, 400);
  assert.match(badBody.error, /formato/);

  const same = await GET(req('?from=2026-09&to=2026-09', tenant));
  const sameBody = await same.json();
  assert.equal(same.status, 400);
  assert.match(sameBody.error, /diferentes/);
});

test('200 — reporte comparativo con tenant del header', async () => {
  resetVariationsMock();
  mockState.report = {
    from: '2026-09',
    to: '2026-10',
    rows: [{ accountId: 'a1', code: '1101', trend: 'down' }],
    totals: { fromBalance: 100, toBalance: 60, varAbs: -40, varPct: -40 },
    counts: { accounts: 1, up: 0, down: 1, same: 0, new: 0, gone: 0 },
  };
  const res = await GET(req('?from=2026-09&to=2026-10', tenant));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.report.rows.length, 1);
  assert.deepEqual(mockState.calls, [{ tenantId: 'T1', from: '2026-09', to: '2026-10' }]);
});

test('400 — rangos de fecha inválidos (mes final antes que inicial)', async () => {
  resetVariationsMock();
  mockState.report = { rows: [] };

  const inverted = await GET(req('?from=2026-10&to=2026-09', tenant));
  const invertedBody = await inverted.json();
  assert.equal(inverted.status, 400);
  assert.match(invertedBody.error, /inicial.*final/);
});

test('400 — período con fecha vacía', async () => {
  resetVariationsMock();
  mockState.report = { rows: [] };

  const empty = await GET(req('?from=&to=', tenant));
  const emptyBody = await empty.json();
  assert.equal(empty.status, 400);
  assert.match(emptyBody.error, /fechas/);
});

test('200 — variaciones con datos múltiples de cuentas', async () => {
  resetVariationsMock();
  mockState.report = {
    from: '2026-09',
    to: '2026-10',
    rows: [
      { accountId: 'a1', code: '1101', trend: 'down' },
      { accountId: 'a2', code: '2201', trend: 'up' },
      { accountId: 'a3', code: '3301', trend: 'same' },
    ],
    totals: { fromBalance: 500, toBalance: 300, varAbs: -200, varPct: -40 },
    counts: { accounts: 3, up: 1, down: 1, same: 1, new: 0, gone: 0 },
  };
  const res = await GET(req('?from=2026-09&to=2026-10', tenant));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.report.rows.length, 3);
  assert.deepEqual(mockState.calls, [{ tenantId: 'T1', from: '2026-09', to: '2026-10' }]);
  assert.equal(body.data.totals.varAbs, -200);
});

test('200 — respuesta de variaciones incluye éxito y datos completos', async () => {
  resetVariationsMock();
  mockState.report = {
    from: '2026-09',
    to: '2026-10',
    rows: [],
    totals: { fromBalance: 0, toBalance: 0, varAbs: 0, varPct: 0 },
    counts: { accounts: 0, up: 0, down: 0, same: 0, new: 0, gone: 0 },
  };
  const res = await GET(req('?from=2026-09&to=2026-10', tenant));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.property(body, 'success');
  assert.property(body, 'data');
  assert.property(body.data, 'report');
  assert.property(body.data, 'totals');
  assert.property(body.data, 'counts');
});
