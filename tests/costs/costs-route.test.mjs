// Aislamiento de la ruta `companies/[id]/costs` (GET y POST) contra el codigo
// REAL de la ruta y de `lib/tenant-resolver.ts`, con supabase falso.
//
// El bug original: el GET filtraba `cost_payments` SOLO por `tenant_id` (y sin
// tenant, sin filtro ninguno), y el POST escribia `tenant_id` sin `company_id`
// con un `upsert` sobre `UNIQUE(tenant_id, cost_type, cost_key)`. Como test 1 y
// test 2 comparten `TEST1DS`, la segunda empresa del tenant pisaria los costos
// de la primera: le cambiaria `company_id` y `amount` en la misma sentencia.
import test from 'node:test';
import assert from 'node:assert/strict';

import { GET, POST } from '../../app/api/companies/[id]/costs/route.ts';
import { COST_PAYMENTS, reiniciar, consultas, limpiarConsultas } from './fake-supabase.mjs';

const TEST1 = 'c-test1';
const TEST2 = 'c-test2';

function peticion({ url, headers = {}, body = {} } = {}) {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return { url, headers: h, json: async () => body };
}

function params(id) {
  return { params: Promise.resolve({ id }) };
}

const sesion = (tenant) => ({ 'x-tenant-id': tenant });

test('GET: test 1 solo ve sus costos, nunca los de la hermana del mismo tenant', async () => {
  reiniciar();
  const r = await GET(
    peticion({ url: 'https://app.test/api/companies/c-test1/costs', headers: sesion('TEST1DS') }),
    params(TEST1),
  );
  assert.equal(r.status, 200);
  const cuerpo = await r.json();
  assert.equal(cuerpo.fixed.renta, 1000); // el suyo
  assert.ok(!('sueldo' in cuerpo.fixed), 'clave de test 2 filtrada');
  assert.ok(!JSON.stringify(cuerpo).includes('999'), 'costos de Angelos fuera');
});

test('GET: test 2 tampoco ve el renta de test 1 (el otro lado del espejo)', async () => {
  reiniciar();
  const r = await GET(
    peticion({ url: 'https://app.test/api/companies/c-test2/costs', headers: sesion('TEST1DS') }),
    params(TEST2),
  );
  const cuerpo = await r.json();
  assert.deepEqual(cuerpo.fixed, { sueldo: 2000 });
});

test('GET: la consulta filtra por company_id, no por tenant', async () => {
  reiniciar();
  limpiarConsultas();
  await GET(
    peticion({ url: 'https://app.test/api/companies/c-test1/costs', headers: sesion('TEST1DS') }),
    params(TEST1),
  );
  const select = consultas.find((c) => c.tabla === 'cost_payments' && c.verb === 'select');
  assert.ok(select, 'hubo select sobre cost_payments');
  assert.ok(
    select.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST1),
    'filtro por company_id presente',
  );
  assert.ok(
    !select.filtros.some((f) => f.columna === 'tenant_id'),
    'sin filtro por tenant_id (ese agrupa, no aísla)',
  );
});

test('GET: empresa de otro tenant en la ruta -> 403', async () => {
  reiniciar();
  const r = await GET(
    peticion({ url: 'https://app.test/api/companies/c-test1/costs', headers: sesion('ANGELOH7') }),
    params(TEST1),
  );
  assert.equal(r.status, 403);
});

test('GET: empresa inexistente y sin sesion -> 400 (fail closed, no empresa 1)', async () => {
  reiniciar();
  const r = await GET(
    peticion({ url: 'https://app.test/api/companies/c-noexiste/costs' }),
    params('c-noexiste'),
  );
  assert.equal(r.status, 400);
});

test('POST: escribe company_id y tenant_id del servidor, y la hermana no lo ve', async () => {
  reiniciar();
  const r = await POST(
    peticion({
      url: 'https://app.test/api/companies/c-test1/costs',
      headers: sesion('TEST1DS'),
      body: { fixed: { limpieza: 500 }, variable: {}, periodMonth: 10, periodYear: 2026 },
    }),
    params(TEST1),
  );
  assert.equal(r.status, 200);

  const fila = COST_PAYMENTS.find((f) => f.cost_key === 'limpieza');
  assert.ok(fila, 'la fila se creo');
  assert.equal(fila.company_id, TEST1);
  assert.equal(fila.tenant_id, 'TEST1DS');

  const deTest2 = await GET(
    peticion({ url: 'https://app.test/api/companies/c-test2/costs', headers: sesion('TEST1DS') }),
    params(TEST2),
  );
  const cuerpo2 = await deTest2.json();
  assert.ok(!('limpieza' in cuerpo2.fixed), 'test 2 no ve el costo recien escrito');
});

test('POST: clave repetida por la hermana -> 409 y la fila ajena queda INTACTA', async () => {
  reiniciar();
  // test 2 intenta guardar "renta", que es de test 1 (mismo tenant = unique viejo).
  const r = await POST(
    peticion({
      url: 'https://app.test/api/companies/c-test2/costs',
      headers: sesion('TEST1DS'),
      body: { fixed: { renta: 7777 }, variable: {}, periodMonth: 10, periodYear: 2026 },
    }),
    params(TEST2),
  );
  assert.equal(r.status, 409);
  const cuerpo = await r.json();
  assert.ok(String(cuerpo.error).includes('051'), 'el error apunta a la migracion 051');

  const ajena = COST_PAYMENTS.find((f) => f.cost_key === 'renta' && f.tenant_id === 'TEST1DS');
  assert.equal(ajena.amount, 1000, 'el amount de test 1 no se toco');
  assert.equal(ajena.company_id, TEST1, 'el company_id de test 1 no se toco');
});

test('POST: la segunda vez actualiza la fila propia por id, sin duplicar', async () => {
  reiniciar();
  const antes = COST_PAYMENTS.find((f) => f.cost_key === 'renta' && f.company_id === TEST1).id;
  const r = await POST(
    peticion({
      url: 'https://app.test/api/companies/c-test1/costs',
      headers: sesion('TEST1DS'),
      body: { fixed: { renta: 1500 }, variable: {}, periodMonth: 11, periodYear: 2026 },
    }),
    params(TEST1),
  );
  assert.equal(r.status, 200);

  const propias = COST_PAYMENTS.filter((f) => f.cost_key === 'renta' && f.company_id === TEST1);
  assert.equal(propias.length, 1, 'no duplico la fila');
  assert.equal(propias[0].id, antes, 'actualizo la misma fila');
  assert.equal(propias[0].amount, 1500);
  assert.equal(propias[0].due_date, '2026-11-01');
});

test('POST: empresa de otro tenant -> 403 y no escribe nada', async () => {
  reiniciar();
  const total = COST_PAYMENTS.length;
  const r = await POST(
    peticion({
      url: 'https://app.test/api/companies/c-test1/costs',
      headers: sesion('ANGELOH7'),
      body: { fixed: { robo: 1 }, variable: {}, periodMonth: 10, periodYear: 2026 },
    }),
    params(TEST1),
  );
  assert.equal(r.status, 403);
  assert.equal(COST_PAYMENTS.length, total);
});

test('POST: ningun UPDATE/DELETE sobre cost_payments va sin filtro de empresa', async () => {
  reiniciar();
  limpiarConsultas();
  await POST(
    peticion({
      url: 'https://app.test/api/companies/c-test1/costs',
      headers: sesion('TEST1DS'),
      body: { fixed: { renta: 2000 }, variable: {}, periodMonth: 12, periodYear: 2026 },
    }),
    params(TEST1),
  );
  const escrituras = consultas.filter(
    (c) => c.tabla === 'cost_payments' && (c.verb === 'update' || c.verb === 'delete' || c.verb === 'insert'),
  );
  assert.ok(escrituras.length > 0, 'hubo escrituras');
  for (const w of escrituras) {
    if (w.verb === 'insert') {
      assert.ok(w, 'insert registrado');
      continue;
    }
    assert.ok(
      w.filtros.some((f) => f.columna === 'company_id'),
      `escritura ${w.verb} sin filtro de empresa`,
    );
  }
});
