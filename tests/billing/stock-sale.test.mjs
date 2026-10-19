// El descuento de inventario al emitir factura es POR EMPRESA (`company_id`), no
// por tenant. test 1 y test 2 comparten `TEST1DS`: con el filtro por `tenant_id`,
// test 1 podia vender y descontar el stock del producto de test 2. Se prueba el
// servicio REAL `lib/services/stock-sale.ts` contra el supabase falso.
import test from 'node:test';
import assert from 'node:assert/strict';

import { checkSaleStock, applySaleStock } from '../../lib/services/stock-sale.ts';
import { reiniciar, limpiarConsultas, consultas, filas } from './fake-supabase.mjs';

const TEST1 = 'c-test1';
const TEST2 = 'c-test2';
const ANGELOS = 'c-angelos';

const linea = (productId, quantity = 1, code = null) => ({
  productId,
  description: 'x',
  code,
  quantity,
  unitPrice: 1,
});

test('check: el producto propio hay stock (10) y no reporta carencia', async () => {
  reiniciar();
  assert.deepEqual(await checkSaleStock(TEST1, [linea('p-test1', 5)]), []);
});

test('check: el producto de la empresa HERMANA no se puede vender', async () => {
  reiniciar();
  const s = await checkSaleStock(TEST1, [linea('p-test2', 1)]);
  assert.equal(s.length, 1, 'p-test2 es de test 2, no de test 1');
  assert.equal(s[0].available, 10, 'reporta el stock del ajeno, pero como carencia');
});

test('check: y al reves (test 2 no vende el de test 1)', async () => {
  reiniciar();
  const s = await checkSaleStock(TEST2, [linea('p-test1', 1)]);
  assert.equal(s.length, 1);
});

test('check: el producto de OTRO tenant tambien queda fuera', async () => {
  reiniciar();
  const s = await checkSaleStock(TEST1, [linea('p-angelos', 1)]);
  assert.equal(s.length, 1);
  const s2 = await checkSaleStock(ANGELOS, [linea('p-angelos', 1)]);
  assert.deepEqual(s2, []);
});

test('check: los servicios no llevan control de existencia', async () => {
  reiniciar();
  assert.deepEqual(await checkSaleStock(TEST1, [linea('s-test1', 999)]), []);
});

test('check: la lectura de productos NO filtra por tenant', async () => {
  reiniciar();
  limpiarConsultas();
  await checkSaleStock(TEST1, [linea('p-test1', 1)]);
  const q = consultas.find((c) => c.tabla === 'product');
  assert.ok(q, 'hubo select sobre product');
  assert.ok(!q.filtros.some((f) => f.columna === 'tenant_id'));
});

test('apply: descuenta el stock del producto propio y deja su movimiento', async () => {
  reiniciar();
  const r = await applySaleStock({
    companyId: TEST1,
    tenantId: 'TEST1DS',
    invoiceId: 'inv-1',
    invoiceNumber: '001-01-01-00000006',
    lines: [linea('p-test1', 3, 'P1')],
  });
  assert.deepEqual(r.shortages, []);
  assert.deepEqual(r.errors, []);
  assert.equal(r.applied, 1);
  const p1 = filas('product').find((p) => p.id === 'p-test1');
  assert.equal(Number(p1.current_stock), 7, '10 - 3');
  const mov = filas('inventory_movement');
  assert.equal(mov.length, 1, 'se registro el movimiento');
  assert.equal(mov[0].company_id, TEST1, 'el movimiento lleva la empresa (no el tenant)');
  assert.equal(mov[0].tenant_id, 'TEST1DS');
  assert.equal(Number(mov[0].quantity), 3);
});

test('apply: NO toca el stock de la empresa hermana (no descuenta ajeno)', async () => {
  reiniciar();
  const r = await applySaleStock({
    companyId: TEST1,
    tenantId: 'TEST1DS',
    invoiceId: 'inv-2',
    invoiceNumber: '001-01-01-00000006',
    lines: [linea('p-test2', 3, 'P2')],
  });
  assert.equal(r.applied, 0);
  assert.equal(r.shortages.length, 1, 'producto ajeno -> carencia');
  const p2 = filas('product').find((p) => p.id === 'p-test2');
  assert.equal(Number(p2.current_stock), 10, 'el stock de test 2 queda intacto');
  assert.equal(filas('inventory_movement').length, 0, 'no se registro movimiento ajeno');
});

test('apply: el UPDATE del stock va con company_id, no con tenant_id', async () => {
  reiniciar();
  limpiarConsultas();
  await applySaleStock({
    companyId: TEST1,
    tenantId: 'TEST1DS',
    invoiceId: 'inv-3',
    invoiceNumber: '001-01-01-00000006',
    lines: [linea('p-test1', 1, 'P1')],
  });
  const upd = consultas.find((c) => c.tabla === 'product' && c.verb === 'update');
  assert.ok(upd, 'hubo update sobre product');
  assert.ok(
    upd.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST1),
    'el descuento filtra por company_id',
  );
  assert.ok(
    !upd.filtros.some((f) => f.columna === 'tenant_id'),
    'sin filtro por tenant (ese agrupa, no aísla)',
  );
});

test('apply: la idempotencia tambien acota a la empresa', async () => {
  reiniciar();
  limpiarConsultas();
  await applySaleStock({
    companyId: TEST1,
    tenantId: 'TEST1DS',
    invoiceId: 'inv-4',
    invoiceNumber: '001-01-01-00000006',
    lines: [linea('p-test1', 1, 'P1')],
  });
  const idem = consultas.find(
    (c) => c.tabla === 'inventory_movement' && c.verb === 'select' && c.filtros.some((f) => f.columna === 'reference_id'),
  );
  assert.ok(idem, 'hubo lectura de movimientos por factura');
  assert.ok(idem.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST1));
});
