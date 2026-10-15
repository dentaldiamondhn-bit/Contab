// Aislamiento del CRUD de estantes (`product_location`).
//
// El bug: `updateLocation` y `deleteLocation` de `lib/services/location-service.ts`
// verificaban la fila con `id` + `tenant_id` A SECAS. Como test 1 y test 2
// comparten `TEST1DS`, un PUT/DELETE desde la empresa A alcanzaba la fila de la
// empresa B: un IDOR dentro del propio tenant (mismo fallo que `locations/image`,
// arreglado el 8 Oct 2026).
//
// Se prueba el `location-service.ts` REAL (no una reimplementacion) contra el
// supabase falso, que reproduce el `.or('company_id.eq.X,company_id.is.null')`
// que encadena `companyScope`.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  deleteLocation,
  listLocations,
  updateLocation,
} from '../../lib/services/location-service.ts';
import {
  PRODUCT_LOCATION,
  consultas,
  limpiarConsultas,
  reiniciarProductLocation,
} from './fake-companies.mjs';

const TEST1 = 'c-test1';
const TEST2 = 'c-test2';

function antes() {
  reiniciarProductLocation();
  limpiarConsultas();
}

function fila(id) {
  return PRODUCT_LOCATION.find((f) => f.id === id);
}

function consultasDeUbicaciones() {
  return consultas.filter((c) => c.tabla === 'product_location');
}

test('updateLocation de una fila de la empresa hermana: null, la fila no se toca', async () => {
  antes();
  const r = await updateLocation(TEST1, 'l-test2', { name: 'hackeado' }, 'TEST1DS');

  assert.equal(r, null, 'una fila de otra empresa del mismo tenant no es editable');
  assert.equal(fila('l-test2').name, 'Estante B', 'el nombre no cambio');

  // Y la prueba de que vino del scope, no de casualidad: el filtro de empresa
  // estaba presente en la consulta.
  const q = consultasDeUbicaciones();
  assert.ok(q.every((c) => c.verb === 'select'), 'no llego a ejecutar el UPDATE');
  assert.ok(
    q.some((c) => c.orConds.some((cond) => cond.includes(`company_id.eq.${TEST1}`))),
    'la consulta tenia el scope de empresa',
  );
});

test('updateLocation de la fila propia: si funciona (control)', async () => {
  antes();
  const r = await updateLocation(TEST2, 'l-test2', { name: 'Renombrado' }, 'TEST1DS');

  assert.ok(r, 'la fila de la propia empresa si se actualiza');
  assert.equal(r.name, 'Renombrado');
  assert.equal(fila('l-test2').name, 'Renombrado');
});

test('updateLocation de una fila sin empresa: visible (convención company_id IS NULL)', async () => {
  antes();
  const r = await updateLocation(TEST1, 'l-sin-empresa', { name: 'Heredado' }, 'TEST1DS');

  assert.ok(r, 'las filas con company_id NULL siguen siendo validas para todas');
  assert.equal(fila('l-sin-empresa').name, 'Heredado');
});

test('updateLocation de una fila de otro tenant: null', async () => {
  antes();
  const r = await updateLocation(TEST1, 'l-angelos', { name: 'hackeado' }, 'TEST1DS');

  assert.equal(r, null);
  assert.equal(fila('l-angelos').name, 'Estante D');
});

test('deleteLocation de la empresa hermana: false, la fila sigue', async () => {
  antes();
  const borrado = await deleteLocation(TEST1, 'l-test2', 'TEST1DS');

  assert.equal(borrado, false);
  assert.ok(fila('l-test2'), 'la fila de test 2 no se borro');
  assert.ok(consultasDeUbicaciones().every((c) => c.verb === 'select'), 'no llego a ejecutar el DELETE');
});

test('deleteLocation propia: true, la fila sale (control)', async () => {
  antes();
  const borrado = await deleteLocation(TEST1, 'l-test1', 'TEST1DS');

  assert.equal(borrado, true);
  assert.equal(fila('l-test1'), undefined, 'la fila propia si se borro');
  assert.ok(fila('l-test2'), 'la de la hermana sigue intacta');
});

test('listLocations de test 1: solo sus estantes + los sin empresa', async () => {
  antes();
  const locations = await listLocations(TEST1, 'TEST1DS', {
    activeOnly: false,
    includeCount: false,
  });

  const ids = locations.map((l) => l.id).sort();
  assert.deepEqual(ids, ['l-sin-empresa', 'l-test1']);
  assert.ok(
    !ids.includes('l-test2') && !ids.includes('l-angelos'),
    'ni la hermana del mismo tenant ni otra empresa',
  );
});

test('updateLocation nunca escribe sin el filtro de empresa', async () => {
  antes();
  await updateLocation(TEST1, 'l-test2', { name: 'x' }, 'TEST1DS');
  await updateLocation(TEST1, 'l-angelos', { name: 'x' }, 'TEST1DS');
  await updateLocation(TEST2, 'l-test1', { name: 'x' }, 'TEST1DS');

  const updates = consultasDeUbicaciones().filter((c) => c.verb === 'update');
  assert.equal(updates.length, 0, 'ningun UPDATE se ejecuto contra una fila ajena');
});
