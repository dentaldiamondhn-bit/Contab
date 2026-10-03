// Aislamiento del contexto de empresa, que es lo que rompia el inventario.
//
// El bug: `contextoDeEmpresa` NO leia el header `x-company-id` (la empresa activa
// de la cookie, que inyecta `middleware.ts`), asi que una ruta que solo llama
// `contextoDeEmpresa(request)` devolvia `companyId: null`. `filtroEmpresaOCompany`
// cae entonces a `{ tenant_id }`, y como test 1 y test 2 comparten `TEST1DS`,
// las dos empresas veian el inventario la una de la otra.
import test from 'node:test';
import assert from 'node:assert/strict';

import { contextoDeEmpresa, ErrorDeEmpresa } from '../../lib/tenant-resolver.ts';
import { filtroEmpresaOCompany } from '../../lib/company-scope.ts';
import { limpiarConsultas, consultas } from './fake-companies.mjs';

const TEST1 = 'c-test1';
const TEST2 = 'c-test2';
const ANGELOS = 'c-angelos';

function peticion({ url = 'https://app.test/api/inventory/products', headers = {} } = {}) {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  return { url, headers: h };
}

test('el header x-company-id resuelve la empresa (el fix del inventario)', async () => {
  limpiarConsultas();
  const empresa = await contextoDeEmpresa(
    peticion({ headers: { 'x-tenant-id': 'TEST1DS', 'x-company-id': TEST2 } }),
  );

  assert.equal(empresa.tenantId, 'TEST1DS');
  assert.equal(empresa.companyId, TEST2);
  // Y por lo tanto el filtro ya no degrada a tenant.
  assert.deepEqual(filtroEmpresaOCompany(empresa), { company_id: TEST2 });
});

test('sin header de empresa el filtro cae a tenant: la fuga original', async () => {
  limpiarConsultas();
  const empresa = await contextoDeEmpresa(peticion({ headers: { 'x-tenant-id': 'TEST1DS' } }));

  assert.equal(empresa.companyId, null);
  assert.deepEqual(filtroEmpresaOCompany(empresa), { tenant_id: 'TEST1DS' });
});

test('?tenantId NO resuelve empresa (era lo que mandaba la pagina de inventario)', async () => {
  limpiarConsultas();
  const empresa = await contextoDeEmpresa(
    peticion({
      url: `https://app.test/api/inventory/products?tenantId=${TEST2}`,
      headers: { 'x-tenant-id': 'TEST1DS' },
    }),
  );

  // El header de sesion manda sobre la query, asi que la empresa sigue sin
  // saberse: por eso la pagina mandaba el parametro equivocado y no aisla.
  assert.equal(empresa.companyId, null);
  assert.equal(empresa.tenantId, 'TEST1DS');
});

test('?companyId gana al header y se valida contra el tenant de sesion', async () => {
  limpiarConsultas();
  const empresa = await contextoDeEmpresa(
    peticion({
      url: `https://app.test/api/inventory/products?companyId=${TEST1}`,
      headers: { 'x-tenant-id': 'TEST1DS', 'x-company-id': TEST2 },
    }),
  );

  assert.equal(empresa.companyId, TEST1);
});

test('empresa de otro tenant por query: 403, no fuga', async () => {
  limpiarConsultas();
  await assert.rejects(
    () => contextoDeEmpresa(
      peticion({
        url: `https://app.test/api/inventory/products?companyId=${ANGELOS}`,
        headers: { 'x-tenant-id': 'TEST1DS' },
      }),
    ),
    (e) => e instanceof ErrorDeEmpresa && e.estado === 403,
  );
});

test('empresa de otro tenant por header (cookie manipulada): 403, no fuga', async () => {
  limpiarConsultas();
  await assert.rejects(
    () => contextoDeEmpresa(
      peticion({ headers: { 'x-tenant-id': 'TEST1DS', 'x-company-id': ANGELOS } }),
    ),
    (e) => e instanceof ErrorDeEmpresa && e.estado === 403,
  );
});

test('cookie de empresa borrada: degrada a tenant en vez de romper la app', async () => {
  limpiarConsultas();
  const empresa = await contextoDeEmpresa(
    peticion({ headers: { 'x-tenant-id': 'TEST1DS', 'x-company-id': 'empresa-que-no-existe' } }),
  );

  assert.equal(empresa.tenantId, 'TEST1DS');
  assert.equal(empresa.companyId, null);
});

test('el [id] de la ruta manda sobre el header', async () => {
  limpiarConsultas();
  const empresa = await contextoDeEmpresa(
    peticion({ headers: { 'x-tenant-id': 'TEST1DS', 'x-company-id': TEST2 } }),
    { companyIdDeRuta: TEST1 },
  );

  assert.equal(empresa.companyId, TEST1);
});

test('sin sesion ni empresa: 400, nunca empresa 1', async () => {
  limpiarConsultas();
  await assert.rejects(
    () => contextoDeEmpresa(peticion()),
    (e) => e instanceof ErrorDeEmpresa && e.estado === 400,
  );
});

test('buscar por companies.id no se confunde con buscar por tenant_id', async () => {
  limpiarConsultas();
  await contextoDeEmpresa(peticion({ headers: { 'x-tenant-id': 'TEST1DS', 'x-company-id': TEST2 } }));

  const porId = consultas.filter(
    (c) => c.filtros.some((f) => f.columna === 'id' && f.valor === TEST2),
  );
  assert.ok(porId.length > 0, 'debe resolver por companies.id, no por el codigo de tenant');
});