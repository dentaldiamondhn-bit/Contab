// Aislamiento por EMPRESA de las 5 rutas SAR de `app/api/accounting/*`
// (sar-config, sar-session, det-upload, diat-upload, annual-tax-upload) contra el
// codigo REAL de las rutas y de `lib/tenant-resolver.ts`, con supabase falso.
//
// El bug que se cierra: las claves de `system_settings` se indexaban por el
// contexto del cliente, y con `tenant_id` no se separan empresas. Como test 1 y
// test 2 comparten el tenant `TEST1DS`, dos empresas hermanas compartirian la
// conexion al portal SAR, la sesion y el ultimo envio del DIAT: una ve la sesion
// de la otra, o le pisa la configuracion. La clave debe llevar `companies.id`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { GET as sarGet, POST as sarPost, DELETE as sarDelete } from '../../app/api/accounting/sar-session/route.ts';
import { GET as configGet, POST as configPost } from '../../app/api/accounting/sar-config/route.ts';
import { POST as detPost } from '../../app/api/accounting/det-upload/route.ts';
import { GET as diatGet, POST as diatPost } from '../../app/api/accounting/diat-upload/route.ts';
import { POST as annualPost } from '../../app/api/accounting/annual-tax-upload/route.ts';
import { reiniciar, claves, limpiarConsultas, consultas } from './fake-supabase.mjs';

const TEST1 = 'c-test1';
const TEST2 = 'c-test2';

const sesion = (tenant) => ({ 'x-tenant-id': tenant });

function peticion({ url, headers = {}, body = {} } = {}) {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return { url, headers: h, json: async () => body };
}

const endpoint = 'https://sar.test/api';

// Conecta una empresa contra el portal (escribe sar_session + las 3 configs).
async function conectar(companyId, tenant = 'TEST1DS') {
  return sarPost(
    peticion({
      url: 'https://app.test/api/accounting/sar-session',
      headers: sesion(tenant),
      body: { tenantId: companyId, endpoint, user: 'usuario', password: 'clave' },
    }),
  );
}

// --- sar-session ----------------------------------------------------------

test('POST sar-session: las claves se indexan por companyId, nunca por tenant', async () => {
  reiniciar();
  const r = await conectar(TEST1);
  assert.equal(r.status, 200);
  const cuerpo = await r.json();
  assert.equal(cuerpo.ok, true);

  const ks = claves();
  for (const clave of [
    `sar_session:${TEST1}`,
    `sar_config:${TEST1}`,
    `annual_tax_sar_config:${TEST1}`,
    `diat_sar_config:${TEST1}`,
  ]) {
    assert.ok(ks.includes(clave), `falta la clave ${clave}`);
  }
  assert.ok(!ks.some((k) => k.includes('TEST1DS')), 'el tenant no debe aparecer en ninguna clave');
});

test('GET sar-session: test 2 NO ve la sesion conectada por test 1', async () => {
  reiniciar();
  await conectar(TEST1);

  const deTest1 = await sarGet(
    peticion({ url: `https://app.test/api/accounting/sar-session?companyId=${TEST1}`, headers: sesion('TEST1DS') }),
  );
  const c1 = await deTest1.json();
  assert.equal(c1.status, 'OK');
  assert.equal(c1.session.status, 'CONECTADO');

  const deTest2 = await sarGet(
    peticion({ url: `https://app.test/api/accounting/sar-session?companyId=${TEST2}`, headers: sesion('TEST1DS') }),
  );
  const c2 = await deTest2.json();
  assert.equal(c2.session.status, 'NO_CONECTADO', 'test 2 no debe heredar la sesion de test 1');
});

test('DELETE sar-session: cierra SOLO la sesion de la empresa pedida', async () => {
  reiniciar();
  await conectar(TEST1);
  await conectar(TEST2);

  const r = await sarDelete(
    peticion({ url: `https://app.test/api/accounting/sar-session?companyId=${TEST1}`, headers: sesion('TEST1DS') }),
  );
  assert.equal(r.status, 200);

  const ks = claves();
  assert.ok(!ks.includes(`sar_session:${TEST1}`), 'la sesion pedida se borro');
  assert.ok(ks.includes(`sar_session:${TEST2}`), 'la sesion de la hermana NO se toca');
});

test('sar-session: empresa de otro tenant -> 403; sin empresa -> 400', async () => {
  reiniciar();
  const ajeno = await sarPost(
    peticion({
      url: 'https://app.test/api/accounting/sar-session',
      headers: sesion('ANGELOH7'),
      body: { tenantId: TEST1, endpoint, user: 'u', password: 'p' },
    }),
  );
  assert.equal(ajeno.status, 403);

  const sinEmpresa = await sarGet(
    peticion({ url: 'https://app.test/api/accounting/sar-session', headers: sesion('TEST1DS') }),
  );
  assert.equal(sinEmpresa.status, 400);
});

// --- sar-config -----------------------------------------------------------

test('sar-config: guarda y lee por empresa; la hermana ve "no configurado"', async () => {
  reiniciar();
  const r = await configPost(
    peticion({
      url: 'https://app.test/api/accounting/sar-config',
      headers: sesion('TEST1DS'),
      body: { tenantId: TEST1, endpoint, usuario: 'usuario', password: 'clave' },
    }),
  );
  assert.equal(r.status, 200);
  assert.ok(claves().includes(`sar_config:${TEST1}`));

  const propio = await configGet(
    peticion({ url: `https://app.test/api/accounting/sar-config?tenantId=${TEST1}`, headers: sesion('TEST1DS') }),
  );
  assert.equal((await propio.json()).configured, true);

  const hermana = await configGet(
    peticion({ url: `https://app.test/api/accounting/sar-config?tenantId=${TEST2}`, headers: sesion('TEST1DS') }),
  );
  assert.equal((await hermana.json()).configured, false, 'test 2 no ve la config de test 1');
});

test('sar-config: consulta a system_settings registrada con la clave de la empresa', async () => {
  reiniciar();
  limpiarConsultas();
  await configGet(
    peticion({ url: `https://app.test/api/accounting/sar-config?tenantId=${TEST1}`, headers: sesion('TEST1DS') }),
  );
  const q = consultas.find((c) => c.tabla === 'system_settings');
  assert.ok(q, 'se consulto system_settings');
  assert.ok(
    q.filtros.some((f) => f.columna === 'key' && f.valor === `sar_config:${TEST1}`),
    'la lectura uso la clave por empresa',
  );
});

// --- det-upload -----------------------------------------------------------

test('det-upload: usa la config/sesion de la empresa, no la de su hermana', async () => {
  reiniciar();
  await conectar(TEST1);

  const propio = await detPost(
    peticion({
      url: 'https://app.test/api/accounting/det-upload',
      headers: sesion('TEST1DS'),
      body: { tenantId: TEST1, detText: 'contenido', periodo: '2026-10' },
    }),
  );
  assert.equal(propio.status, 200);
  assert.equal((await propio.json()).ok, true);

  const hermana = await detPost(
    peticion({
      url: 'https://app.test/api/accounting/det-upload',
      headers: sesion('TEST1DS'),
      body: { tenantId: TEST2, detText: 'contenido', periodo: '2026-10' },
    }),
  );
  const c2 = await hermana.json();
  assert.equal(c2.ok, false);
  assert.equal(c2.errorHint, 'SESION_NO_VERIFICADA', 'test 2 no toma la sesion de test 1');
});

// --- diat-upload ----------------------------------------------------------

test('diat-upload: la configuracion del DIAT se guarda y lee por empresa', async () => {
  reiniciar();
  const guardar = await diatPost(
    peticion({
      url: 'https://app.test/api/accounting/diat-upload',
      headers: sesion('TEST1DS'),
      body: { companyId: TEST1, action: 'save-config', endpoint, usuario: 'usuario', password: 'clave' },
    }),
  );
  assert.equal(guardar.status, 200);
  assert.ok(claves().includes(`diat_sar_config:${TEST1}`));

  const deTest1 = await diatGet(
    peticion({ url: `https://app.test/api/accounting/diat-upload?companyId=${TEST1}`, headers: sesion('TEST1DS') }),
  );
  assert.equal((await deTest1.json()).configured, true);

  const deTest2 = await diatGet(
    peticion({ url: `https://app.test/api/accounting/diat-upload?companyId=${TEST2}`, headers: sesion('TEST1DS') }),
  );
  assert.equal((await deTest2.json()).configured, false, 'test 2 no ve la config DIAT de test 1');
});

test('diat-upload: empresa ajena -> 403', async () => {
  reiniciar();
  const r = await diatPost(
    peticion({
      url: 'https://app.test/api/accounting/diat-upload',
      headers: sesion('ANGELOH7'),
      body: { companyId: TEST1, action: 'save-config', endpoint, usuario: 'u', password: 'p' },
    }),
  );
  assert.equal(r.status, 403);
});

// --- annual-tax-upload ----------------------------------------------------

test('annual-tax-upload: la configuracion anual se guarda y lee por empresa', async () => {
  reiniciar();
  const guardar = await annualPost(
    peticion({
      url: 'https://app.test/api/accounting/annual-tax-upload',
      headers: sesion('TEST1DS'),
      body: { tenantId: TEST1, action: 'save-config', endpoint, usuario: 'usuario', password: 'clave' },
    }),
  );
  assert.equal(guardar.status, 200);
  assert.ok(claves().includes(`annual_tax_sar_config:${TEST1}`));

  const propia = await annualPost(
    peticion({
      url: 'https://app.test/api/accounting/annual-tax-upload',
      headers: sesion('TEST1DS'),
      body: { tenantId: TEST1, action: 'get-config' },
    }),
  );
  assert.equal((await propia.json()).configured, true);

  const hermana = await annualPost(
    peticion({
      url: 'https://app.test/api/accounting/annual-tax-upload',
      headers: sesion('TEST1DS'),
      body: { tenantId: TEST2, action: 'get-config' },
    }),
  );
  assert.equal((await hermana.json()).configured, false, 'test 2 no ve la config anual de test 1');
});

test('annual-tax-upload: sin empresa -> 400 (fail closed)', async () => {
  reiniciar();
  const r = await annualPost(
    peticion({
      url: 'https://app.test/api/accounting/annual-tax-upload',
      headers: sesion('TEST1DS'),
      body: { action: 'get-config' },
    }),
  );
  assert.equal(r.status, 400);
});
