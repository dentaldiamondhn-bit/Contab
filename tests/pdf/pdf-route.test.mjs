import test from 'node:test';
import assert from 'node:assert/strict';

import { GET } from '../../app/api/documents/pdf/route.ts';
import { mockState, resetPdfMock } from './pdf-services-mock.mjs';

const req = (query = '', headers = {}) => ({
  url: `http://localhost/api/documents/pdf${query}`,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
});

const pdfBytes = (res) => {
  const raw = res._body;
  return Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
};

test('400 — type inválido, sin companyId y sin id', async () => {
  resetPdfMock();

  const badType = await GET(req('?type=reporte&id=x&companyId=C1'));
  assert.equal(badType.status, 400);

  const noCompany = await GET(req('?type=invoice&id=x'));
  assert.equal(noCompany.status, 400);

  const noId = await GET(req('?type=invoice&companyId=C1'));
  assert.equal(noId.status, 400);

  assert.deepEqual(mockState.calls.build, []);
});

test('400 — budget/diat sin period o con period inválido', async () => {
  resetPdfMock();

  const missing = await GET(req('?type=budget&id=b1&companyId=C1'));
  assert.equal(missing.status, 400);

  const invalid = await GET(req('?type=diat&id=C1&companyId=C1&period=2026-13'));
  const body = await invalid.json();
  assert.equal(invalid.status, 400);
  assert.match(body.error, /YYYY-MM/);
  assert.deepEqual(mockState.calls.build, []);
});

test('404 — factura, traslado y presupuesto inexistentes', async () => {
  resetPdfMock();
  mockState.invoice = null;
  mockState.transfer = null;
  mockState.comparison = null;

  const inv = await GET(req('?type=invoice&id=nope&companyId=C1'));
  assert.equal(inv.status, 404);

  const tr = await GET(req('?type=transfer&id=nope&companyId=C1'));
  assert.equal(tr.status, 404);

  const bud = await GET(req('?type=budget&id=nope&companyId=C1&period=2026-09'));
  assert.equal(bud.status, 404);
});

test('404 — DIAT sin datos en la empresa', async () => {
  resetPdfMock();
  mockState.hasData = false;

  const res = await GET(req('?type=diat&id=C1&companyId=C1&period=2026-09'));
  const body = await res.json();
  assert.equal(res.status, 404);
  assert.deepEqual(mockState.calls.hasData, ['C1']);
});

test('200 — factura genera PDF real (%PDF, attachment)', async () => {
  resetPdfMock();
  mockState.invoice = {
    invoice: { invoiceNumber: '001-001-01-00000001' },
    items: [],
  };

  const res = await GET(req('?type=invoice&id=inv1&companyId=C1'));
  const body = await res.json().catch(() => null);

  assert.equal(res.status, 200);
  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.match(res.headers['Content-Disposition'], /factura_001-001-01-00000001\.pdf/);
  assert.equal(body, null); // no es JSON: es binario
  const bytes = pdfBytes(res);
  assert.equal(bytes.subarray(0, 4).toString(), '%PDF');
  assert.deepEqual(mockState.calls.build, [{ type: 'invoice' }]);
  assert.deepEqual(mockState.calls.invoice, [
    { companyId: 'C1', invoiceId: 'inv1', tenantHint: null },
  ]);
});

test('200 — DIAT genera PDF real con período', async () => {
  resetPdfMock();
  mockState.hasData = true;
  mockState.report = { period: '2026-09', declarante: { razonSocial: 'Demo' } };

  const res = await GET(req('?type=diat&id=C1&companyId=C1&period=2026-09'));
  assert.equal(res.status, 200);
  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.match(res.headers['Content-Disposition'], /DIAT_C1_2026-09\.pdf/);
  assert.equal(pdfBytes(res).subarray(0, 4).toString(), '%PDF');
  assert.deepEqual(mockState.calls.report, [{ companyId: 'C1', period: '2026-09' }]);
});

test('400 — variations sin to, to inválido o iguales', async () => {
  resetPdfMock();

  const missing = await GET(req('?type=variations&id=C1&companyId=C1&period=2026-09'));
  assert.equal(missing.status, 400);

  const invalid = await GET(req('?type=variations&id=C1&companyId=C1&period=2026-09&to=2026-13'));
  const invalidBody = await invalid.json();
  assert.equal(invalid.status, 400);
  assert.match(invalidBody.error, /YYYY-MM/);

  const same = await GET(req('?type=variations&id=C1&companyId=C1&period=2026-09&to=2026-09'));
  assert.equal(same.status, 400);
  assert.deepEqual(mockState.calls.variations, []);
});

test('200 — variations genera PDF real', async () => {
  resetPdfMock();
  mockState.variations = {
    from: '2026-09',
    to: '2026-10',
    rows: [{ code: '1101', name: 'Caja', fromBalance: 100, toBalance: 60, varAbs: -40, varPct: -40, trend: 'down' }],
    totals: { fromBalance: 100, toBalance: 60, varAbs: -40, varPct: -40 },
    counts: { accounts: 1, up: 0, down: 1, same: 0, new: 0, gone: 0 },
  };
  const res = await GET(req('?type=variations&id=C1&companyId=C1&period=2026-09&to=2026-10'));
  assert.equal(res.status, 200);
  assert.equal(res.headers['Content-Type'], 'application/pdf');
  assert.match(res.headers['Content-Disposition'], /variaciones_2026-09_2026-10\.pdf/);
  assert.equal(pdfBytes(res).subarray(0, 4).toString(), '%PDF');
  assert.deepEqual(mockState.calls.variations, [{ tenantId: 'C1', from: '2026-09', to: '2026-10' }]);
  assert.deepEqual(mockState.calls.build, [{ type: 'variations' }]);
});
