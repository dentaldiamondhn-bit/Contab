import test from 'node:test';
import assert from 'node:assert/strict';

import { GET } from '../../app/api/diat/variations/route.ts';
import { mockState, resetDiatVariationsMock } from './diat-generator-mock.mjs';

const req = (query = '') => ({ url: `http://localhost/api/diat/variations${query}` });

test('400 — sin companyId, períodos inválidos o iguales', async () => {
  resetDiatVariationsMock();

  const noCompany = await GET(req('?from=2026-09&to=2026-10'));
  assert.equal(noCompany.status, 400);

  const invalid = await GET(req('?companyId=C1&from=2026-13&to=2026-10'));
  const invalidBody = await invalid.json();
  assert.equal(invalid.status, 400);
  assert.match(invalidBody.error, /YYYY-MM/);

  const same = await GET(req('?companyId=C1&from=2026-09&to=2026-09'));
  assert.equal(same.status, 400);
  assert.deepEqual(mockState.calls, []);
});

test('404 — empresa sin datos; 200 con resúmenes', async () => {
  resetDiatVariationsMock();
  mockState.variations = null;

  const nf = await GET(req('?companyId=C1&from=2026-09&to=2026-10'));
  assert.equal(nf.status, 404);

  resetDiatVariationsMock();
  mockState.variations = {
    companyId: 'C1',
    from: '2026-09',
    to: '2026-10',
    fromResumen: { operaciones: 2, totalVentas: 1000 },
    toResumen: { operaciones: 3, totalVentas: 1500 },
  };
  const ok = await GET(req('?companyId=C1&from=2026-09&to=2026-10'));
  const okBody = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(okBody.data.variations.toResumen.totalVentas, 1500);
  assert.deepEqual(mockState.calls, [{ companyId: 'C1', from: '2026-09', to: '2026-10' }]);
});
