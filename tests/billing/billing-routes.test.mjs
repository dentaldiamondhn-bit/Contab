// Aislamiento por EMPRESA de las rutas de facturacion que vivian clavadas en el
// tenant: `billing/cai` (GET/POST), `billing/invoices` (GET/POST) y
// `companies/[id]/billing/config/cai` (GET/POST). Se prueban contra el codigo
// REAL de las rutas y de `lib/tenant-resolver.ts`, con supabase falso.
//
// El bug: test 1 y test 2 comparten `TEST1DS`, asi que filtrar por `tenant_id`
// mezclaba sus CAI y su serie de factura, y el POST de CAI apagaba los de la
// hermana. La frontera correcta es `company_id`.
import test from 'node:test';
import assert from 'node:assert/strict';

import { GET as caiGet, POST as caiPost } from '../../app/api/billing/cai/route.ts';
import { GET as invGet, POST as invPost } from '../../app/api/billing/invoices/route.ts';
import {
  GET as configCaiGet,
  POST as configCaiPost,
} from '../../app/api/companies/[id]/billing/config/cai/route.ts';
import {
  CAI,
  INVOICE,
  reiniciar,
  limpiarConsultas,
  consultas,
} from './fake-supabase.mjs';

const TEST1 = 'c-test1';
const TEST2 = 'c-test2';
const ANGELOS = 'c-angelos';

const CAI_LARGO = 'A'.repeat(32);
const CAI_LARGO_2 = 'B'.repeat(32);

function peticion({ url, headers = {}, body = null } = {}) {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return { url, headers: h, json: async () => body };
}

function params(id) {
  return { params: Promise.resolve({ id }) };
}

const sesion = (tenant) => ({ 'x-tenant-id': tenant });

// ===========================================================================
// /api/billing/cai
// ===========================================================================

test('GET cai: devuelve el CAI y el correlativo de ESTA empresa', async () => {
  reiniciar();
  limpiarConsultas();
  const r = await caiGet(
    peticion({ url: `https://app.test/api/billing/cai?companyId=${TEST1}`, headers: sesion('TEST1DS') }),
  );
  assert.equal(r.status, 200);
  const c = await r.json();
  assert.equal(c.cai, 'CAI-TEST1');
  assert.equal(c.currentNumber, 6, 'serie de test 1 (ultima 5 -> 6)');
  const q = consultas.find((x) => x.tabla === 'cai' && x.verb === 'select');
  assert.ok(q.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST1));
  assert.ok(!q.filtros.some((f) => f.columna === 'tenant_id'), 'sin filtro por tenant');
});

test('GET cai: test 2 no ve el CAI de test 1 (cae a la serie propia)', async () => {
  reiniciar();
  const r = await caiGet(
    peticion({ url: `https://app.test/api/billing/cai?companyId=${TEST2}`, headers: sesion('TEST1DS') }),
  );
  assert.equal(r.status, 200);
  const c = await r.json();
  assert.equal(c.currentNumber, 1, 'sin CAI vigente, serie propia de test 2');
  assert.notEqual(c.cai, 'CAI-TEST1');
});

test('GET cai: empresa de otro tenant -> 403', async () => {
  reiniciar();
  const r = await caiGet(
    peticion({ url: `https://app.test/api/billing/cai?companyId=${TEST1}`, headers: sesion('ANGELOH7') }),
  );
  assert.equal(r.status, 403);
});

test('GET cai: sin empresa ni sesion -> 400 (fail closed, no empresa 1)', async () => {
  reiniciar();
  const r = await caiGet(peticion({ url: 'https://app.test/api/billing/cai' }));
  assert.equal(r.status, 400);
});

test('POST cai: escribe company_id del servidor y apaga solo el CAI de la empresa', async () => {
  reiniciar();
  limpiarConsultas();
  const r = await caiPost(
    peticion({
      url: 'https://app.test/api/billing/cai',
      headers: sesion('TEST1DS'),
      body: { companyId: TEST1, cai: 'CAI-NUEVO', startNumber: 10, endNumber: 200, expirationDate: '2031-01-01' },
    }),
  );
  assert.equal(r.status, 200);
  const fila = await r.json();
  assert.equal(fila.company_id, TEST1);
  assert.equal(fila.tenant_id, 'TEST1DS');
  // El CAI viejo de test 1 quedo inactivo; el de Angelos y el de test 2 intactos.
  assert.equal(CAI.find((c) => c.id === 'cai-test1').status, 'inactive');
  assert.equal(CAI.find((c) => c.id === 'cai-angelos').status, 'active');
  assert.equal(CAI.find((c) => c.id === 'cai-test2').status, 'inactive');
  const upd = consultas.find((x) => x.tabla === 'cai' && x.verb === 'update');
  assert.ok(upd.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST1));
  assert.ok(!upd.filtros.some((f) => f.columna === 'tenant_id'), 'no apaga por tenant');
});

test('POST cai: empresa de otro tenant -> 403', async () => {
  reiniciar();
  const r = await caiPost(
    peticion({
      url: 'https://app.test/api/billing/cai',
      headers: sesion('TEST1DS'),
      body: { companyId: ANGELOS, cai: 'X', startNumber: 1, endNumber: 2, expirationDate: '2031-01-01' },
    }),
  );
  assert.equal(r.status, 403);
});

// ===========================================================================
// /api/billing/invoices
// ===========================================================================

test('GET invoices: test 1 ve las suyas y no las de Angelos (filtra company_id)', async () => {
  reiniciar();
  limpiarConsultas();
  const r = await invGet(
    peticion({
      url: 'https://app.test/api/billing/invoices',
      headers: { 'x-tenant-id': 'TEST1DS', 'x-company-id': TEST1 },
    }),
  );
  assert.equal(r.status, 200);
  const invs = await r.json();
  assert.deepEqual(invs.map((i) => i.id), ['inv-test1-5']);
  const q = consultas.find((x) => x.tabla === 'Invoice' && x.verb === 'select');
  assert.ok(q.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST1));
  assert.ok(!q.filtros.some((f) => f.columna === 'tenantId'), 'no filtra por tenant aqui');
});

test('GET invoices: test 2 no ve las facturas de test 1 (mismo tenant)', async () => {
  reiniciar();
  const r = await invGet(
    peticion({
      url: 'https://app.test/api/billing/invoices',
      headers: { 'x-tenant-id': 'TEST1DS', 'x-company-id': TEST2 },
    }),
  );
  const invs = await r.json();
  assert.deepEqual(invs, []);
});

test('GET invoices: sin empresa (solo tenant) mantiene el filtro amplio por tenant', async () => {
  reiniciar();
  limpiarConsultas();
  const r = await invGet(
    peticion({ url: 'https://app.test/api/billing/invoices?limit=100', headers: sesion('TEST1DS') }),
  );
  const invs = await r.json();
  assert.deepEqual(invs.map((i) => i.id), ['inv-test1-5'], 'la de test 1 (tenant TEST1DS)');
  const q = consultas.find((x) => x.tabla === 'Invoice' && x.verb === 'select');
  assert.ok(q.filtros.some((f) => f.columna === 'tenantId' && f.valor === 'TEST1DS'));
});

test('POST invoices: emite con company_id del servidor y la hermana no la ve', async () => {
  reiniciar();
  const body = {
    companyId: TEST1,
    items: [{ name: 'Servicio', quantity: 1, unitPrice: 100, total: 115, taxRate: 15 }],
    totals: { subtotal: 100, tax15: 15, total: 115 },
  };
  const r = await invPost(
    peticion({ url: 'https://app.test/api/billing/invoices', headers: sesion('TEST1DS'), body }),
  );
  assert.equal(r.status, 200);
  const { invoice } = await r.json();
  assert.equal(invoice.company_id, TEST1);
  assert.equal(invoice.tenantId, 'TEST1DS');
  assert.equal(invoice.invoiceNumber, '001-01-01-00000006', 'serie propia de test 1');
  assert.ok(INVOICE.some((i) => i.id === invoice.id && i.company_id === TEST1));

  // test 2 sigue sin ver nada.
  const r2 = await invGet(
    peticion({
      url: 'https://app.test/api/billing/invoices',
      headers: { 'x-tenant-id': 'TEST1DS', 'x-company-id': TEST2 },
    }),
  );
  assert.deepEqual(await r2.json(), []);
});

test('POST invoices: empresa de otro tenant -> 403', async () => {
  reiniciar();
  const r = await invPost(
    peticion({
      url: 'https://app.test/api/billing/invoices',
      headers: sesion('TEST1DS'),
      body: {
        companyId: ANGELOS,
        items: [{ name: 'X', quantity: 1, unitPrice: 10, total: 10, taxRate: 0 }],
        totals: { subtotal: 10, tax15: 0, total: 10 },
      },
    }),
  );
  assert.equal(r.status, 403);
});

// ===========================================================================
// /api/companies/[id]/billing/config/cai
// ===========================================================================

test('GET config/cai: solo los CAI de la empresa (filtra company_id)', async () => {
  reiniciar();
  limpiarConsultas();
  const r = await configCaiGet(
    peticion({ url: `https://app.test/api/companies/${TEST1}/billing/config/cai`, headers: sesion('TEST1DS') }),
    params(TEST1),
  );
  assert.equal(r.status, 200);
  const cuerpo = await r.json();
  assert.deepEqual(cuerpo.data.map((c) => c.id), ['cai-test1']);
  const q = consultas.find((x) => x.tabla === 'cai' && x.verb === 'select');
  assert.ok(q.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST1));
  assert.ok(!q.filtros.some((f) => f.columna === 'tenant_id'));
});

test('GET config/cai: test 2 solo ve su CAI', async () => {
  reiniciar();
  const r = await configCaiGet(
    peticion({ url: `https://app.test/api/companies/${TEST2}/billing/config/cai`, headers: sesion('TEST1DS') }),
    params(TEST2),
  );
  const cuerpo = await r.json();
  assert.deepEqual(cuerpo.data.map((c) => c.id), ['cai-test2']);
});

test('GET config/cai: empresa de otro tenant -> 403', async () => {
  reiniciar();
  const r = await configCaiGet(
    peticion({ url: `https://app.test/api/companies/${TEST1}/billing/config/cai`, headers: sesion('ANGELOH7') }),
    params(TEST1),
  );
  assert.equal(r.status, 403);
});

test('POST config/cai: la unicidad es POR EMPRESA (existe en la hermana, no aqui)', async () => {
  reiniciar();
  const body = { cai: CAI_LARGO_2, rangeStart: 1, rangeEnd: 100, expiryDate: '2031-01-01' };
  // Se crea en test 2.
  const r2 = await configCaiPost(
    peticion({ url: `https://app.test/api/companies/${TEST2}/billing/config/cai`, headers: sesion('TEST1DS'), body }),
    params(TEST2),
  );
  assert.equal(r2.status, 200);
  // Repetir en test 2 -> 400 (ya existe para ESA empresa).
  const r2b = await configCaiPost(
    peticion({ url: `https://app.test/api/companies/${TEST2}/billing/config/cai`, headers: sesion('TEST1DS'), body }),
    params(TEST2),
  );
  assert.equal(r2b.status, 400);
  // El MISMO CAI en test 1 -> 200: empresas distintas pueden tenerlo.
  const r1 = await configCaiPost(
    peticion({ url: `https://app.test/api/companies/${TEST1}/billing/config/cai`, headers: sesion('TEST1DS'), body }),
    params(TEST1),
  );
  assert.equal(r1.status, 200);
  const fila = await r1.json();
  assert.equal(fila.data.cai, CAI_LARGO_2);
  assert.ok(CAI.some((c) => c.cai === CAI_LARGO_2 && c.company_id === TEST1));
  assert.ok(CAI.some((c) => c.cai === CAI_LARGO_2 && c.company_id === TEST2));
});

test('POST config/cai: empresa de otro tenant -> 403', async () => {
  reiniciar();
  const r = await configCaiPost(
    peticion({
      url: `https://app.test/api/companies/${TEST1}/billing/config/cai`,
      headers: sesion('ANGELOH7'),
      body: { cai: CAI_LARGO, rangeStart: 1, rangeEnd: 100, expiryDate: '2031-01-01' },
    }),
    params(TEST1),
  );
  assert.equal(r.status, 403);
});
