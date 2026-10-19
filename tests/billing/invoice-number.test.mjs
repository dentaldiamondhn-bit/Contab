// La serie de factura es POR EMPRESA (`company_id`), no por tenant. test 1 y
// test 2 comparten `TEST1DS`: antes compartian correlativo y CAI, asi que emitir
// en una movia la serie de la otra. Se prueba el modulo REAL
// `lib/billing/invoice-number.ts` contra el supabase falso.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  previewInvoiceNumber,
  reserveInvoiceNumber,
  isInvoiceNumberTaken,
} from '../../lib/billing/invoice-number.ts';
import { reiniciar, limpiarConsultas, consultas, CAI } from './fake-supabase.mjs';

const TEST1 = 'c-test1';
const TEST2 = 'c-test2';
const ANGELOS = 'c-angelos';

test('preview: cada empresa lleva su propia serie (test 1 por 6, test 2 por 1)', async () => {
  reiniciar();
  const t1 = await previewInvoiceNumber(TEST1);
  const t2 = await previewInvoiceNumber(TEST2);
  assert.equal(t1.correlativo, 6, 'la ultima de test 1 es la 5 -> siguiente 6');
  assert.equal(t2.correlativo, 1, 'test 2 no tiene facturas -> empieza en 1');
});

test('preview: la serie de test 1 no cuenta las facturas de Angelos (7)', async () => {
  reiniciar();
  const t1 = await previewInvoiceNumber(TEST1);
  assert.equal(t1.correlativo, 6);
  const ang = await previewInvoiceNumber(ANGELOS);
  assert.equal(ang.correlativo, 8, 'Angelos tiene la 7 -> siguiente 8');
});

test('preview: consulta Invoice/cai por company_id y NUNCA por tenant', async () => {
  reiniciar();
  limpiarConsultas();
  await previewInvoiceNumber(TEST2);
  const deInvoice = consultas.filter((c) => c.tabla === 'Invoice');
  assert.ok(deInvoice.length > 0, 'hubo select sobre Invoice');
  for (const c of deInvoice) {
    assert.ok(
      c.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST2),
      'filtro por company_id presente',
    );
    assert.ok(
      !c.filtros.some((f) => f.columna === 'tenant_id' || f.columna === 'tenantId'),
      'sin filtro por tenant (ese agrupa, no aísla)',
    );
  }
  const deCai = consultas.filter((c) => c.tabla === 'cai');
  for (const c of deCai) {
    assert.ok(c.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST2));
  }
});

test('isInvoiceNumberTaken: el 5 existe en test 1 pero no en test 2', async () => {
  reiniciar();
  assert.equal(await isInvoiceNumberTaken(TEST1, '001-01-01-00000005'), true);
  assert.equal(await isInvoiceNumberTaken(TEST2, '001-01-01-00000005'), false);
});

test('isInvoiceNumberTaken: filtra por company_id', async () => {
  reiniciar();
  limpiarConsultas();
  await isInvoiceNumberTaken(TEST2, '001-01-01-00000005');
  const q = consultas.find((c) => c.tabla === 'Invoice' && c.verb === 'select');
  assert.ok(q.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST2));
  assert.ok(q.filtros.some((f) => f.columna === 'invoiceNumber' && f.valor === '001-01-01-00000005'));
});

test('reserve: saca el correlativo 6 y avanza SOLO el CAI de test 1', async () => {
  reiniciar();
  const r = await reserveInvoiceNumber(TEST1);
  assert.equal(r.correlativo, 6);
  assert.equal(r.caiCode, 'CAI-TEST1');
  const c1 = CAI.find((c) => c.id === 'cai-test1');
  const ang = CAI.find((c) => c.id === 'cai-angelos');
  assert.ok(Number(c1.current_number) > 5, 'el CAI de test 1 avanzo');
  assert.equal(Number(ang.current_number), 7, 'el CAI de Angelos NO se toco');
});

test('reserve: la actualizacion condicional del CAI va con company_id', async () => {
  reiniciar();
  limpiarConsultas();
  await reserveInvoiceNumber(TEST1);
  const up = consultas.find((c) => c.tabla === 'cai' && c.verb === 'update');
  assert.ok(up, 'hubo update sobre cai');
  assert.ok(
    up.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST1),
    'la reserva condicional filtra por company_id',
  );
  assert.ok(
    !up.filtros.some((f) => f.columna === 'tenant_id'),
    'sin filtro por tenant',
  );
});

test('reserve: la lista de CAI de la empresa (CAI) queda intacta en la de la hermana', async () => {
  reiniciar();
  await reserveInvoiceNumber(TEST1);
  const c2 = CAI.find((c) => c.id === 'cai-test2');
  assert.equal(Number(c2.current_number), 1, 'el CAI de test 2 no se toca');
});
