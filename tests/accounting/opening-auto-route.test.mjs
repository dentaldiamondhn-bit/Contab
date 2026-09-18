import test from 'node:test';
import assert from 'node:assert/strict';

import { POST } from '../../app/api/accounting/opening-balances/auto/route.ts';
import { mockState, resetOpeningMock } from './opening-balance-mock.mjs';

const req = (body, headers = {}) => {
  const r = {
    url: 'http://localhost/api/accounting/opening-balances/auto',
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  };
  r.json = async () => body;
  return r;
};
const tenant = { 'x-tenant-id': 'T1' };

test('400 — sin tenant y año inválido', async () => {
  resetOpeningMock();
  const noTenant = await POST(req({ year: 2026 }));
  assert.equal(noTenant.status, 400);
  assert.deepEqual(mockState.calls, []);

  const badYear = await POST(req({ year: 1999 }, tenant));
  const badBody = await badYear.json();
  assert.equal(badYear.status, 400);
  assert.match(badBody.error, /2001/);
});

test('200 — vista previa sin escribir', async () => {
  resetOpeningMock();
  mockState.preview = { year: 2026, nonZeroCount: 3, balanced: true, lines: [] };
  const res = await POST(req({ year: 2026 }, tenant));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.preview.nonZeroCount, 3);
  assert.deepEqual(mockState.calls, [{ op: 'preview', tenantId: 'T1', year: 2026 }]);
});

test('200 — aplicar con overwrite', async () => {
  resetOpeningMock();
  mockState.result = { year: 2026, applied: 3, skippedNoChart: [], skippedZero: 0 };
  const res = await POST(req({ year: 2026, apply: true, overwrite: true }, tenant));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.result.applied, 3);
  assert.equal(mockState.calls[0].opts.overwrite, true);
});
