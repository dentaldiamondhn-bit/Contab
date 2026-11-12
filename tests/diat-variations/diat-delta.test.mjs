import test from 'node:test';
import assert from 'node:assert/strict';

import { buildDiatDelta, varPct } from '../../lib/services/diat-delta.ts';

test('varPct maneja base cero y signos', () => {
  assert.equal(varPct(0, 100), null);
  assert.equal(varPct(100, 150), 50);
  assert.equal(varPct(100, 50), -50);
});

test('buildDiatDelta compara las 8 métricas con etiquetas', () => {
  const from = {
    totalFacturas: 10,
    totalVentas: 1000,
    impuestoVentas: 150,
    totalCompras: 600,
    impuestoCompras: 90,
    creditoFiscal: 90,
    isvAPagar: 60,
    operaciones: 12,
  };
  const to = { ...from, totalVentas: 1200, isvAPagar: 90 };
  const delta = buildDiatDelta('2026-09', '2026-10', from, to);
  assert.equal(delta.from, '2026-09');
  assert.equal(delta.metrics.length, 8);
  const ventas = delta.metrics.find((m) => m.key === 'totalVentas');
  assert.deepEqual(
    { from: ventas.from, to: ventas.to, varAbs: ventas.varAbs, varPct: ventas.varPct },
    { from: 1000, to: 1200, varAbs: 200, varPct: 20 },
  );
  const isv = delta.metrics.find((m) => m.key === 'isvAPagar');
  assert.equal(isv.varPct, 50);
  const facturas = delta.metrics.find((m) => m.key === 'totalFacturas');
  assert.equal(facturas.varAbs, 0);
});
