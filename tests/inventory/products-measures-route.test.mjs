// API de productos con medidas (Tarea 5).
//
// Prueba la ruta REAL (`app/api/inventory/products/route.ts`) contra el fake de
// Supabase de la suite de inventario. El contexto de empresa tambien es el real:
// lee `x-tenant-id` / `x-company-id`, de ahi que los headers se monten con
// `Headers` y no con un objeto plano.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GET,
  POST,
  PATCH,
} from '../../app/api/inventory/products/route.ts';
import {
  PRODUCT,
  PRODUCT_MEASURE,
  consultas,
  limpiarConsultas,
  ocultarTabla,
  reiniciarMedidas,
  reiniciarProduct,
  restaurarTablas,
} from './fake-companies.mjs';

const TEST1 = { 'x-tenant-id': 'TEST1DS', 'x-company-id': 'c-test1' };
const ANGELOS = { 'x-tenant-id': 'ANGELOH7', 'x-company-id': 'c-angelos' };

function peticion({ url = '/api/inventory/products', headers = {}, body } = {}) {
  const h = new Headers();
  for (const [k, v] of Object.entries(headers)) h.set(k, v);
  const r = { url: `https://app.test${url}`, headers: h };
  if (body !== undefined) r.json = async () => body;
  return r;
}

const post = (body, headers = TEST1) =>
  POST(peticion({ headers, body }));
const patch = (body, headers = TEST1) =>
  PATCH(peticion({ headers, body }));
const get = (headers = TEST1, url = '/api/inventory/products') =>
  GET(peticion({ headers, url }));

const medidasDe = (productId) =>
  PRODUCT_MEASURE.filter((m) => m.product_id === productId);

test('POST 400 sin name (no regresión) y no crea el producto', async () => {
  reiniciarProduct();
  reiniciarMedidas();

  const res = await post({ code: 'PROD-404' });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.match(body.error, /name/i);
  assert.equal(PRODUCT.some((p) => p.code === 'PROD-404'), false);
});

test('POST 400 con factor 0: cita el factor y no crea el producto', async () => {
  reiniciarProduct();
  reiniciarMedidas();

  const res = await post({
    code: 'PROD-405',
    name: 'Factor cero',
    measures: [{ name: 'Caja', factor: 0 }],
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.match(body.error, /factor/i);
  assert.equal(PRODUCT.some((p) => p.code === 'PROD-405'), false);
});

test('POST 201 guarda las medidas con la empresa de la sesión', async () => {
  reiniciarProduct();
  reiniciarMedidas();

  const res = await post({
    code: 'PROD-777',
    name: 'Producto con medidas',
    unitPrice: 10,
    measures: [{ name: 'Caja', factor: 50, cost: 450, sale_price: 600 }],
  });
  const body = await res.json();

  assert.equal(res.status, 201);
  assert.equal(Array.isArray(body.measures), true);
  assert.equal(body.measures.length, 1);
  assert.equal(body.measures[0].name, 'Caja');
  assert.equal(body.measures[0].factor, 50);
  assert.equal(body.product.measures.length, 1);

  const product = PRODUCT.find((p) => p.code === 'PROD-777');
  assert.ok(product, 'el producto debe existir');
  const filas = medidasDe(product.id);
  assert.equal(filas.length, 1);
  assert.equal(filas[0].name, 'Caja');
  assert.equal(filas[0].factor, 50);
  assert.equal(filas[0].cost, 450);
  assert.equal(filas[0].sale_price, 600);
  assert.equal(filas[0].company_id, 'c-test1');
  assert.equal(filas[0].tenant_id, 'TEST1DS');
});

test('GET adjunta measures a cada fila en un solo viaje y no mezcla empresas', async () => {
  reiniciarProduct();
  reiniciarMedidas();
  limpiarConsultas();

  const res = await get(TEST1);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(Array.isArray(body), true);
  assert.ok(body.every((p) => Array.isArray(p.measures)), 'todas las filas traen measures');

  const p1 = body.find((p) => p.id === 'p-test1');
  assert.ok(p1);
  assert.deepEqual(p1.measures.map((m) => m.name).sort(), ['Caja', 'Docena']);

  // p-test2 es de la empresa hermana (mismo tenant): no debe aparecer.
  assert.equal(body.some((p) => p.id === 'p-test2'), false);
  assert.equal(body.some((p) => p.measures.some((m) => m.id === 'm-test2-caja')), false);

  // Una sola consulta a product_measure para todos los productos, nunca una por fila.
  const consultasMedidas = consultas.filter((c) => c.tabla === 'product_measure');
  assert.equal(consultasMedidas.length, 1);
});

test('GET trae measures: [] en un producto sin medidas', async () => {
  reiniciarProduct();
  reiniciarMedidas();

  const res = await get(ANGELOS);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.length, 1);
  assert.equal(body[0].id, 'p-angelos');
  assert.deepEqual(body[0].measures, []);
});

test('PATCH con measures: [] deja el producto sin medidas y no toca la otra empresa', async () => {
  reiniciarProduct();
  reiniciarMedidas();

  const res = await patch({ id: 'p-test1', measures: [] });
  assert.equal(res.status, 200);

  assert.equal(medidasDe('p-test1').length, 0);
  assert.equal(PRODUCT_MEASURE.some((m) => m.id === 'm-test2-caja'), true);
});

test('PATCH sin measures no toca las medidas actuales', async () => {
  reiniciarProduct();
  reiniciarMedidas();

  const res = await patch({ id: 'p-test1', name: 'Guantes' });
  assert.equal(res.status, 200);

  assert.equal(medidasDe('p-test1').length, 2);
});

test('PATCH con measures reemplaza el lote (no suma)', async () => {
  reiniciarProduct();
  reiniciarMedidas();

  const res = await patch({
    id: 'p-test1',
    measures: [{ name: 'Pallet', factor: 100 }],
  });
  assert.equal(res.status, 200);

  const filas = medidasDe('p-test1');
  assert.equal(filas.length, 1);
  assert.equal(filas[0].name, 'Pallet');
  assert.equal(filas[0].factor, 100);
});

test('POST y PATCH persisten price_includes_tax en el producto y en la medida', async () => {
  reiniciarProduct();
  reiniciarMedidas();

  const creado = await post({
    code: 'PROD-ISV',
    name: 'Con ISV incluido',
    price_includes_tax: true,
    measures: [{ name: 'Caja', factor: 10, price_includes_tax: true }],
  });
  assert.equal(creado.status, 201);
  const product = PRODUCT.find((p) => p.code === 'PROD-ISV');
  assert.ok(product);
  assert.equal(product.price_includes_tax, true);
  assert.equal(medidasDe(product.id)[0].price_includes_tax, true);

  const sinMedidas = await patch({ id: 'p-test1', price_includes_tax: true });
  assert.equal(sinMedidas.status, 200);
  assert.equal(PRODUCT.find((p) => p.id === 'p-test1').price_includes_tax, true);

  const conMedidas = await patch({
    id: 'p-test1',
    measures: [{ name: 'Caja', factor: 50, price_includes_tax: true }],
  });
  assert.equal(conMedidas.status, 200);
  assert.equal(medidasDe('p-test1')[0].price_includes_tax, true);
});

test('POST compensa si falla product_measure: 500 y el producto no queda', async () => {
  reiniciarProduct();
  reiniciarMedidas();
  ocultarTabla('product_measure');

  try {
    const res = await post({
      code: 'PROD-FAIL',
      name: 'Sin tabla de medidas',
      measures: [{ name: 'Caja', factor: 2 }],
    });
    const body = await res.json();

    assert.equal(res.status, 500);
    assert.match(body.error, /product_measure|no existe|Error/i);
    assert.equal(PRODUCT.some((p) => p.code === 'PROD-FAIL'), false);
  } finally {
    restaurarTablas();
  }
});

test('PATCH 400 con factor 0: cita el factor y no toca las medidas', async () => {
  reiniciarProduct();
  reiniciarMedidas();

  const antes = medidasDe('p-test1').map((m) => ({ ...m }));

  const res = await patch({
    id: 'p-test1',
    measures: [{ name: 'Caja', factor: 0 }],
  });
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.match(body.error, /factor/i);
  // La validacion del servicio corre ANTES del delete, asi que el lote previo
  // (Caja + Docena) sigue igual.
  assert.deepEqual(medidasDe('p-test1'), antes);
  assert.equal(medidasDe('p-test1').length, 2);
});

test('GET sin header de empresa: 200 y todas las filas con measures: []', async () => {
  reiniciarProduct();
  reiniciarMedidas();
  limpiarConsultas();

  // Solo el tenant de sesion, sin empresa: `companyId` queda null. En PostgREST
  // real `.eq('company_id', null)` no es `IS NULL`, asi que la unica salida
  // segura es cerrar en fallo y no consultar.
  const res = await get({ 'x-tenant-id': 'TEST1DS' });
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(Array.isArray(body), true);
  assert.ok(body.length > 0, 'el tenant tiene productos');
  assert.ok(
    body.every((p) => Array.isArray(p.measures) && p.measures.length === 0),
    'sin empresa no se adjuntan medidas',
  );
  // Ni siquiera se intento: cero consultas a product_measure.
  assert.equal(consultas.filter((c) => c.tabla === 'product_measure').length, 0);
});
