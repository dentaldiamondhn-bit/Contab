// Aislamiento de la ruta `companies/[id]/custom-kpis`.
//
// El bug original: `getTicketPromedio` usaba el `[id]` de la ruta (un
// `companies.id`, casi siempre UUID) como valor de `tenant_id`, y si no daba,
// probaba `tenantId`. Con un UUID eso devuelve 0 filas sin error (KPIs que no
// aparecen), y con el codigo de tenant las dos empresas del mismo tenant
// sumarian las transacciones de ambas. El filtro correcto es
// `Transaction.company_id` (49/50 filas, medido).
import test from 'node:test';
import assert from 'node:assert/strict';

import { GET, POST, DELETE } from '../../app/api/companies/[id]/custom-kpis/route.ts';
import { reiniciar, consultas, limpiarConsultas } from './fake-supabase.mjs';

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

test('GET: test 1 calcula sus KPIs solo con sus transacciones (500, no 1400)', async () => {
  reiniciar();
  const r = await GET(
    peticion({ url: 'https://app.test/api/companies/c-test1/custom-kpis', headers: sesion('TEST1DS') }),
    params(TEST1),
  );
  assert.equal(r.status, 200);
  const kpis = await r.json();
  assert.ok(Array.isArray(kpis));
  const ticket = kpis.find((k) => k.id === 'kpi-ticket-promedio');
  const ingresos = kpis.find((k) => k.id === 'kpi-ingresos');
  assert.ok(ticket, 'el ticket promedio aparece');
  assert.equal(ingresos.value, 500); // 50000/100, sin mezclar los 900 de test 2
  assert.ok(!JSON.stringify(kpis).includes('900'), 'las transacciones de test 2 quedan fuera');
});

test('GET: test 2 ve los suyos (900), no los de su hermana', async () => {
  reiniciar();
  const r = await GET(
    peticion({ url: 'https://app.test/api/companies/c-test2/custom-kpis', headers: sesion('TEST1DS') }),
    params(TEST2),
  );
  const kpis = await r.json();
  const ingresos = kpis.find((k) => k.id === 'kpi-ingresos');
  assert.equal(ingresos.value, 900);
  assert.ok(!JSON.stringify(kpis).includes('500'), 'las transacciones de test 1 quedan fuera');
});

test('GET: la consulta a Transaction filtra por company_id', async () => {
  reiniciar();
  limpiarConsultas();
  await GET(
    peticion({ url: 'https://app.test/api/companies/c-test1/custom-kpis', headers: sesion('TEST1DS') }),
    params(TEST1),
  );
  const select = consultas.find((c) => c.tabla === 'Transaction');
  assert.ok(select, 'hubo select sobre Transaction');
  assert.ok(
    select.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST1),
    'filtro por company_id presente',
  );
});

test('GET: empresa de otro tenant -> 403', async () => {
  reiniciar();
  const r = await GET(
    peticion({ url: 'https://app.test/api/companies/c-test1/custom-kpis', headers: sesion('ANGELOH7') }),
    params(TEST1),
  );
  assert.equal(r.status, 403);
});

test('GET: empresa inexistente y sin sesion -> 400 (fail closed)', async () => {
  reiniciar();
  const r = await GET(
    peticion({ url: 'https://app.test/api/companies/c-noexiste/custom-kpis' }),
    params('c-noexiste'),
  );
  assert.equal(r.status, 400);
});

test('POST: valida la empresa antes de devolver el KPI', async () => {
  reiniciar();
  const propio = await POST(
    peticion({
      url: 'https://app.test/api/companies/c-test1/custom-kpis',
      headers: sesion('TEST1DS'),
      body: { name: 'Mi KPI', unit: 'HNL', value: 10, target: 20 },
    }),
    params(TEST1),
  );
  assert.equal(propio.status, 200);
  const cuerpo = await propio.json();
  assert.equal(cuerpo.success, true);

  const ajeno = await POST(
    peticion({
      url: 'https://app.test/api/companies/c-test1/custom-kpis',
      headers: sesion('ANGELOH7'),
      body: { name: 'KPI ajeno', unit: 'HNL', value: 1, target: 2 },
    }),
    params(TEST1),
  );
  assert.equal(ajeno.status, 403);
});

test('DELETE: valida la empresa (lo hace, no es solo almacenamiento local)', async () => {
  reiniciar();
  const propio = await DELETE(
    peticion({
      url: 'https://app.test/api/companies/c-test1/custom-kpis?id=kpi-1',
      headers: sesion('TEST1DS'),
    }),
    params(TEST1),
  );
  assert.equal(propio.status, 200);

  const ajeno = await DELETE(
    peticion({
      url: 'https://app.test/api/companies/c-test1/custom-kpis?id=kpi-1',
      headers: sesion('ANGELOH7'),
    }),
    params(TEST1),
  );
  assert.equal(ajeno.status, 403);
});
