// Servicio de medidas por producto (`lib/services/product-measures.ts`).
//
// Una medida ("Caja", "Docena") es un empaque con factor entero >= 1 sobre la
// unidad base del producto. El servicio separa la validacion pura (sin I/O) del
// CRUD transaccional (delete del producto en ESA empresa + insert del lote),
// siguiendo el aislamiento por `company_id` de AGENTS.md §1: filtrar por
// `product_id` a secas alcanzaria la medida de la empresa hermana del mismo
// tenant (`TEST1DS`).
//
// Se prueba el `.ts` REAL contra el supabase falso de `fake-companies.mjs`.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validarMedidas,
  reemplazarMedidas,
  medidasDeProductos,
} from '../../lib/services/product-measures.ts';
import {
  PRODUCT_MEASURE,
  consultas,
  limpiarConsultas,
  reiniciarMedidas,
  ocultarTabla,
  restaurarTablas,
} from './fake-companies.mjs';

const TEST1 = 'c-test1';
const TEST2 = 'c-test2';

function antes() {
  reiniciarMedidas();
  limpiarConsultas();
}

function medidasDe(productId, companyId = TEST1) {
  return PRODUCT_MEASURE.filter(
    (m) => m.product_id === productId && m.company_id === companyId,
  );
}

test('validarMedidas: sin medidas es un producto valido (se vende en unidad base)', () => {
  assert.deepEqual(validarMedidas([], 'Unidad'), []);
  assert.deepEqual(validarMedidas(undefined, 'Unidad'), []);
  assert.deepEqual(validarMedidas(null, 'Unidad'), []);
});

test('validarMedidas: nombre repetido (case-insensitive) lanza', () => {
  assert.throws(
    () => validarMedidas([{ name: 'Caja' }, { name: 'caja' }], 'Unidad'),
    /medida repetida/,
  );
});

test('validarMedidas: nombre igual a la unidad base lanza', () => {
  assert.throws(() => validarMedidas([{ name: 'UNIDAD' }], 'Unidad'), /unidad base/);
});

test('validarMedidas: factor 0 / 2.5 / "abc" lanza (debe ser entero >= 1)', () => {
  assert.throws(() => validarMedidas([{ name: 'Caja', factor: 0 }], 'Unidad'));
  assert.throws(() => validarMedidas([{ name: 'Caja', factor: 2.5 }], 'Unidad'));
  assert.throws(() => validarMedidas([{ name: 'Caja', factor: 'abc' }], 'Unidad'));
});

test('validarMedidas: cost o sale_price negativo lanza', () => {
  assert.throws(
    () => validarMedidas([{ name: 'Caja', factor: 2, cost: -1 }], 'Unidad'),
    /negativo/,
  );
  assert.throws(
    () => validarMedidas([{ name: 'Caja', factor: 2, sale_price: '-5' }], 'Unidad'),
    /negativo/,
  );
});

test('validarMedidas: factor vacio ("", "  ", null) se lee como 1', () => {
  assert.equal(validarMedidas([{ name: 'Caja', factor: '' }], 'Unidad')[0].factor, 1);
  assert.equal(validarMedidas([{ name: 'Caja', factor: '  ' }], 'Unidad')[0].factor, 1);
  assert.equal(validarMedidas([{ name: 'Caja', factor: null }], 'Unidad')[0].factor, 1);
});

test('validarMedidas: factor no vacio invalido ("abc") sigue lanzando', () => {
  assert.throws(() => validarMedidas([{ name: 'Caja', factor: 'abc' }], 'Unidad'));
});

test('validarMedidas: cost/sale_price en blanco (" " y "") quedan en null', () => {
  const [m] = validarMedidas(
    [{ name: 'Caja', factor: 2, cost: ' ', sale_price: '' }],
    'Unidad',
  );
  assert.equal(m.cost, null);
  assert.equal(m.sale_price, null);
});

test('reemplazarMedidas: inserta el lote con la empresa y el tenant de la sesion', async () => {
  antes();
  const r = await reemplazarMedidas(TEST1, 'TEST1DS', 'p-test1', [
    { name: 'Caja', factor: 50, cost: 450, sale_price: 600 },
    { name: 'Docena', factor: 12, cost: 110, sale_price: 150 },
  ]);

  assert.equal(r.length, 2);
  assert.ok(
    r.every((m) => m.company_id === TEST1 && m.tenant_id === 'TEST1DS'),
    'la empresa y el tenant salen del alcance, no del cuerpo',
  );

  const propias = medidasDe('p-test1', TEST1);
  assert.equal(propias.length, 2, 'quedan exactamente las del lote');
  assert.deepEqual(
    propias.map((m) => m.name).sort(),
    ['Caja', 'Docena'],
  );
  // La medida de la empresa hermana (m-test2-caja) sigue intacta: el filtro por
  // producto nunca alcanza la fila ajena.
  assert.ok(PRODUCT_MEASURE.some((m) => m.id === 'm-test2-caja'));
  assert.equal(medidasDe('p-test1', TEST2).length, 0);
});

test('reemplazarMedidas dos veces: sin duplicados (el delete corre antes del insert)', async () => {
  antes();
  await reemplazarMedidas(TEST1, 'TEST1DS', 'p-test1', [{ name: 'Caja', factor: 50 }]);
  await reemplazarMedidas(TEST1, 'TEST1DS', 'p-test1', [{ name: 'Docena', factor: 12 }]);

  const propias = medidasDe('p-test1', TEST1);
  assert.equal(propias.length, 1, 'el segundo reemplazo no acumula');
  assert.equal(propias[0].name, 'Docena', 'quedan las del segundo lote');
});

test('medidasDeProductos: agrupa por producto y no trae las de otra empresa', async () => {
  antes();
  const mapa = await medidasDeProductos(TEST1, 'TEST1DS', ['p-test1']);

  assert.equal(mapa.size, 1);
  const medidas = mapa.get('p-test1');
  assert.equal(medidas.length, 2);
  assert.ok(medidas.every((m) => m.company_id === TEST1));
  assert.ok(!medidas.some((m) => m.id === 'm-test2-caja'), 'no mezcla la hermana');
});

test('medidasDeProductos sin productos: Map vacio y sin consultar', async () => {
  antes();
  const mapa = await medidasDeProductos(TEST1, 'TEST1DS', []);

  assert.equal(mapa.size, 0);
  assert.equal(consultas.length, 0, 'no debe ni consultar la tabla');
});

test('medidasDeProductos con la tabla ausente: Map vacio sin lanzar', async () => {
  antes();
  ocultarTabla('product_measure');
  try {
    const mapa = await medidasDeProductos(TEST1, 'TEST1DS', ['p-test1']);
    assert.equal(mapa.size, 0, 'sin tabla, el producto igual se vende en base');
  } finally {
    restaurarTablas();
  }
});
