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
