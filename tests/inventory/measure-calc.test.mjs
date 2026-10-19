// Aritmetica de medidas de producto e ISV (`lib/services/measure-calc.ts`).
//
// Modulo 100% puro: ni supabase, ni red, ni Date, ni imports -> se prueba
// directo con ruta relativa (el runner `--experimental-strip-types` no
// resuelve el alias `@/`, igual que `tests/billing/stock-sale.test.mjs`).
//
// Regla de unidades (plan Tarea 2): stock en unidad BASE, medida = factor,
//   base = factor x cantidad, y `inventory_movement.quantity` es integer:
//   la base debe ser entera > 0 o se lanza (nunca se inventa un redondeo).
// Redondeo del proyecto en un solo sitio: compras a 0 decimales, POS a 2,
//   con el invariante base + impuesto === total (ver measure-calc.ts).
// Importes en LEMPIRAS, sin /100 (AGENTS.md §2).
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  redondear,
  factorValido,
  exigirFactor,
  unidadesBase,
  desglosarImpuesto,
  precioNeto,
} from '../../lib/services/measure-calc.ts';

test('factorValido: vacio/undefined/0 se leen como "sin factor" (1) y "12" pasa a 12', () => {
  assert.equal(factorValido(undefined), 1);
  assert.equal(factorValido(''), 1);
  assert.equal(factorValido('12'), 12);
  assert.equal(factorValido(0), 1, 'un factor 0 se lee como sin factor, no rompe');
});

test('exigirFactor: lanza con factor invalido y devuelve enteros >= 1', () => {
  assert.throws(() => exigirFactor(0));
  assert.throws(() => exigirFactor(2.5));
  assert.equal(exigirFactor(12), 12);
});

test('unidadesBase: base = factor x cantidad, y debe ser entera > 0', () => {
  assert.equal(unidadesBase(3, 50), 150);
  assert.equal(unidadesBase(0.5, 12), 6);
  assert.throws(() => unidadesBase(1, 2.5), 'factor no entero');
  assert.throws(() => unidadesBase(1.3, 1), 'base no entera');
  assert.throws(() => unidadesBase(0, 1), 'inventory_movement.quantity no admite 0');
});

test('desglosarImpuesto con ISV incluido: 115 al 15% -> base 100, impuesto 15, total 115', () => {
  assert.deepEqual(desglosarImpuesto(115, 15, true, 2), { base: 100, impuesto: 15, total: 115 });
});

test('desglosarImpuesto sin ISV incluido: 100 al 15% -> lo suma (total 115)', () => {
  assert.deepEqual(desglosarImpuesto(100, 15, false, 2), { base: 100, impuesto: 15, total: 115 });
});

test('desglosarImpuesto con tasa 0: sin desglose', () => {
  assert.deepEqual(desglosarImpuesto(100, 0, true, 2), { base: 100, impuesto: 0, total: 100 });
});

test('desglosarImpuesto a 0 decimales (compras enteras): 230 al 15%', () => {
  assert.deepEqual(desglosarImpuesto(230, 15, true, 0), { base: 200, impuesto: 30, total: 230 });
});

test('desglosarImpuesto 100 al 18% a 2 decimales: 84.75 + 15.25 (el caso que truena)', () => {
  const d = desglosarImpuesto(100, 18, true, 2);
  assert.deepEqual(d, { base: 84.75, impuesto: 15.25, total: 100 });
  assert.equal(d.base + d.impuesto, d.total, 'invariante exacto: base + impuesto === total');
});

test('invariante: tasas 0/15/18 con precios fijos y aleatorios -> redondear(base+impuesto, 2) === total', () => {
  // PRNG determinista (mulberry32): un fallo tiene que ser reproducible.
  let estado = 0x9e3779b9;
  const siguiente = () => {
    estado = (estado + 0x6d2b79f5) >>> 0;
    let t = estado;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };

  const fijos = [0.01, 9.99, 100, 115, 230, 999.99, 10000];
  const aleatorios = Array.from({ length: 50 }, () => Math.round(siguiente() * 1000000) / 100);

  for (const tasa of [0, 15, 18]) {
    for (const precio of [...fijos, ...aleatorios]) {
      for (const incluye of [true, false]) {
        const d = desglosarImpuesto(precio, tasa, incluye, 2);
        assert.equal(
          redondear(d.base + d.impuesto, 2),
          d.total,
          `precio ${precio}, tasa ${tasa}%, incluye ${incluye}`,
        );
      }
    }
  }
});

test('precioNeto: neto (sin ISV) redondeado', () => {
  assert.equal(precioNeto(115, 15, true, 0), 100);
  assert.equal(precioNeto(100, 15, false, 0), 100);
});
