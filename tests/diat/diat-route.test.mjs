import test from 'node:test';
import assert from 'node:assert/strict';

import { GET } from '../../app/api/diat/route.ts';
import { mockState, resetDiatMock } from './diat-generator-mock.mjs';

const req = (query = '') => ({ url: `http://localhost/api/diat${query}` });

test('400 — falta companyId', async () => {
  resetDiatMock();

  const res = await GET(req('?period=2026-09'));
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.match(body.error, /companyId/i);
  assert.deepEqual(mockState.calls.available, []);
  assert.deepEqual(mockState.calls.hasData, []);
  assert.deepEqual(mockState.calls.report, []);
});

test('400 — período inválido', async () => {
  const invalid = ['2026-13', '2026-00', '2026-1', 'abc', '2026/09'];

  for (const period of invalid) {
    resetDiatMock();

    const res = await GET(req(`?companyId=ANGELOH7&period=${encodeURIComponent(period)}`));
    const body = await res.json();

    assert.equal(res.status, 400, `period=${period} debe ser 400`);
    assert.equal(body.success, false);
    assert.match(body.error, /YYYY-MM/);
    assert.deepEqual(mockState.calls.available, []);
    assert.deepEqual(mockState.calls.hasData, []);
    assert.deepEqual(mockState.calls.report, []);
  }
});

test('200 — período válido con datos', async () => {
  resetDiatMock();
  mockState.periods = ['2026-09'];
  mockState.hasData = true;
  mockState.report = {
    period: '2026-09',
    resumen: { operaciones: 2, isvAPagar: -81 },
    ventas: { records: [] },
    compras: { records: [{}, {}] },
  };

  const res = await GET(req('?companyId=ANGELOH7&period=2026-09'));
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.companyId, 'ANGELOH7');
  assert.deepEqual(body.data.availablePeriods, ['2026-09']);
  assert.equal(body.data.report.period, '2026-09');
  assert.equal(body.data.report.resumen.operaciones, 2);
  assert.deepEqual(mockState.calls.hasData, ['ANGELOH7']);
  assert.deepEqual(mockState.calls.report, [{ companyId: 'ANGELOH7', period: '2026-09' }]);
});

test('200 — período sin datos devuelve reporte vacío (la empresa tiene datos en otros meses)', async () => {
  resetDiatMock();
  mockState.periods = ['2026-09'];
  mockState.hasData = true;
  mockState.report = {
    period: '2026-08',
    resumen: { operaciones: 0, totalVentas: 0, totalCompras: 0 },
    ventas: { records: [], source: 'ninguna' },
    compras: { records: [], source: 'ninguna' },
  };

  const res = await GET(req('?companyId=ANGELOH7&period=2026-08'));
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data.availablePeriods, ['2026-09']);
  assert.equal(body.data.report.period, '2026-08');
  assert.equal(body.data.report.resumen.operaciones, 0);
  assert.equal(body.data.report.ventas.source, 'ninguna');
  assert.equal(body.data.report.compras.source, 'ninguna');
});

test('404 — período sin datos (la empresa no tiene ningún dato)', async () => {
  resetDiatMock();
  mockState.periods = ['2026-09'];
  mockState.hasData = false;

  const res = await GET(req('?companyId=SIN-DATOS&period=2026-08'));
  const body = await res.json();

  assert.equal(res.status, 404);
  assert.equal(body.success, false);
  assert.match(body.error, /datos/i);
  assert.deepEqual(mockState.calls.hasData, ['SIN-DATOS']);
  assert.deepEqual(mockState.calls.report, []);
});

test('200 — sin period devuelve report=null y availablePeriods', async () => {
  resetDiatMock();
  mockState.periods = ['2026-09'];

  const res = await GET(req('?companyId=ANGELOH7'));
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.deepEqual(body.data.availablePeriods, ['2026-09']);
  assert.equal(body.data.report, null);
  assert.deepEqual(mockState.calls.hasData, []);
  assert.deepEqual(mockState.calls.report, []);
});
