/**
 * Evaluador del CAI del proveedor (lib/supplier-cai.ts). Es puro: no toca
 * Supabase ni el contexto, asi que se prueba directo contra el codigo real.
 *
 * La funcion es un AVISO, no un bloqueo: se comprueban los 4 casos (CAI
 * distinto, vencido, por vencer, fuera de rango) y que "sin datos" no genera
 * ruido.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  evaluarCai,
  normalizarCai,
  correlativoDe,
  fechaLocal,
  DIAS_POR_VENCER,
} from '../../lib/supplier-cai.ts';

const HOY = new Date('2026-10-15T09:30:00');

function codigos(ev) {
  return ev.problemas.map((p) => p.codigo).sort();
}

test('normalizarCai quita guiones y pasa a mayusculas', () => {
  assert.equal(normalizarCai('abc-123 def'), 'ABC123DEF');
  assert.equal(normalizarCai(null), '');
  assert.equal(normalizarCai(undefined), '');
});

test('correlativoDe toma la ultima secuencia de digitos', () => {
  assert.equal(correlativoDe('000-001-01-00001234'), 1234);
  assert.equal(correlativoDe('FAC-2024-0158'), 158);
  assert.equal(correlativoDe('SIN-NUMERO'), null);
  assert.equal(correlativoDe(''), null);
  assert.equal(correlativoDe(null), null);
});

test('fechaLocal interpreta YYYY-MM-DD a medianoche local', () => {
  const d = fechaLocal('2026-10-15');
  assert.equal(d.getFullYear(), 2026);
  assert.equal(d.getMonth(), 9);
  assert.equal(d.getDate(), 15);
  assert.equal(fechaLocal('basura'), null);
  assert.equal(fechaLocal(null), null);
});

test('sin datos de CAI del proveedor no hay problemas (nada que advertir)', () => {
  const ev = evaluarCai(null, { invoice_number: '000-001-01-00000005' }, HOY);
  assert.equal(ev.estado, 'ok');
  assert.deepEqual(ev.problemas, []);
});

test('CAI del proveedor coincide con el de la factura: sin problemas', () => {
  const ev = evaluarCai({ cai: 'ABC-123' }, { cai: 'abc123', invoice_number: 'X-1' }, HOY);
  assert.equal(ev.estado, 'ok');
  assert.deepEqual(ev.problemas, []);
});

test('CAI de la factura distinto -> aviso CAI_DISTINTO', () => {
  const ev = evaluarCai(
    { cai: 'AAAAAA-BBBBBB-CCCCCC-DDDDDD-EEEEEE-FF' },
    { cai: '111111-222222-333333-444444-555555-66', invoice_number: '001-001-000000001' },
    HOY
  );
  assert.equal(ev.estado, 'aviso');
  assert.deepEqual(codigos(ev), ['CAI_DISTINTO']);
});

test('mismo CAI con distinto formato (guiones/espacios) NO es distinto', () => {
  const ev = evaluarCai(
    { cai: 'ABC-123-DEF' },
    { cai: 'abc123def', invoice_number: '001-001-000000001' },
    HOY
  );
  assert.equal(ev.estado, 'ok');
});

test('CAI vencido da error y bloquea el estado', () => {
  const ev = evaluarCai(
    { cai: 'ABC123', cai_expiration_date: '2026-10-01' },
    { cai: 'ABC123', invoice_number: '001-001-000000001' },
    HOY
  );
  assert.equal(ev.estado, 'error');
  assert.deepEqual(codigos(ev), ['CAI_VENCIDO']);
});

test('CAI que vence hoy es POR_VENCER (0 dias), no vencido', () => {
  const ev = evaluarCai(
    { cai_expiration_date: '2026-10-15' },
    { invoice_number: '001-001-000000001' },
    HOY
  );
  assert.equal(ev.estado, 'aviso');
  assert.deepEqual(codigos(ev), ['CAI_POR_VENCER']);
});

test('CAI que vence dentro del umbral de aviso', () => {
  const ev = evaluarCai(
    { cai_expiration_date: '2026-10-25' },
    { invoice_number: '001-001-000000001' },
    HOY
  );
  assert.deepEqual(codigos(ev), ['CAI_POR_VENCER']);
});

test('CAI que vence lejos no genera aviso', () => {
  const ev = evaluarCai(
    { cai: 'ABC123', cai_expiration_date: '2026-12-31' },
    { cai: 'ABC123', invoice_number: '001-001-000000001' },
    HOY
  );
  assert.equal(ev.estado, 'ok');
});

test('factura dentro del rango autorizado: sin problemas', () => {
  const ev = evaluarCai(
    {
      cai: 'ABC123',
      cai_expiration_date: '2027-01-01',
      cai_range_from: '000-001-01-00000001',
      cai_range_to: '000-001-01-00005000',
    },
    { cai: 'ABC123', invoice_number: '000-001-01-00000425' },
    HOY
  );
  assert.equal(ev.estado, 'ok');
});

test('factura por encima del rango: error FUERA_DE_RANGO', () => {
  const ev = evaluarCai(
    { cai_range_from: '000-001-01-00000001', cai_range_to: '000-001-01-00005000' },
    { invoice_number: '000-001-01-00009999' },
    HOY
  );
  assert.equal(ev.estado, 'error');
  assert.deepEqual(codigos(ev), ['FUERA_DE_RANGO']);
});

test('factura por debajo del rango: error FUERA_DE_RANGO', () => {
  const ev = evaluarCai(
    { cai_range_from: '000-001-01-00000100', cai_range_to: '000-001-01-00005000' },
    { invoice_number: '000-001-01-00000001' },
    HOY
  );
  assert.deepEqual(codigos(ev), ['FUERA_DE_RANGO']);
});

test('rango con extremos invertidos se normaliza con min/max', () => {
  const ev = evaluarCai(
    { cai_range_from: '000-001-01-00005000', cai_range_to: '000-001-01-00000001' },
    { invoice_number: '000-001-01-00000425' },
    HOY
  );
  assert.equal(ev.estado, 'ok');
});

test('sin numero de factura no se evalua el rango', () => {
  const ev = evaluarCai(
    { cai_range_from: '000-001-01-00000001', cai_range_to: '000-001-01-00005000' },
    { invoice_number: '' },
    HOY
  );
  assert.equal(ev.estado, 'ok');
});

test('extremo de rango sin digitos no inventa comparacion', () => {
  const ev = evaluarCai(
    { cai_range_from: 'SIN DIGITOS', cai_range_to: '000-001-01-00005000' },
    { invoice_number: '000-001-01-00009999' },
    HOY
  );
  assert.equal(ev.estado, 'ok');
});

test('varios problemas a la vez: estado error y los tres codigos', () => {
  const ev = evaluarCai(
    {
      cai: 'AAA111',
      cai_expiration_date: '2020-01-01',
      cai_range_from: '000-001-01-00000001',
      cai_range_to: '000-001-01-00005000',
    },
    { cai: 'BBB222', invoice_number: '000-001-01-00009999' },
    HOY
  );
  assert.equal(ev.estado, 'error');
  assert.deepEqual(codigos(ev), ['CAI_DISTINTO', 'CAI_VENCIDO', 'FUERA_DE_RANGO']);
});

test('DIAS_POR_VENCER es 30', () => {
  assert.equal(DIAS_POR_VENCER, 30);
});
