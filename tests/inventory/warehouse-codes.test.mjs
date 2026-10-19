// Serie automatica de codigos ALM-### de almacenes (`warehouse`).
//
// El 17 Oct 2026 el usuario pidio "lo mismo" que con las ubicaciones (UB-###,
// 079): si el caller no trae `code`, el servidor lo genera en la serie de la
// PROPIA empresa. La BD real de test 1 ya usa ALM-001/ALM-002 (medido con
// PostgREST), asi que la serie nueva sigue ese formato y las filas legacy
// ("PRINCIPAL") no cuentan.
//
// Se prueba el `warehouse-service.ts` REAL contra el supabase falso, que
// reproduce los `.eq('company_id', ...)` del calculo del maximo.
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createWarehouse,
  proximoNumeroCodigoAlmacen,
} from '../../lib/services/warehouse-service.ts';
import {
  WAREHOUSE,
  consultas,
  limpiarConsultas,
  reiniciarWarehouse,
} from './fake-companies.mjs';

const TEST1 = 'c-test1';
const TEST2 = 'c-test2';

function antes() {
  reiniciarWarehouse();
  limpiarConsultas();
}

function fila(id) {
  return WAREHOUSE.find((f) => f.id === id);
}

function consultasDeAlmacenes() {
  return consultas.filter((c) => c.tabla === 'warehouse');
}

test('createWarehouse sin codigo: genera ALM-003 (la serie ya tiene 001 y 002)', async () => {
  antes();
  const r = await createWarehouse(TEST1, { name: 'Bodega Nueva' }, 'TEST1DS');

  assert.equal(r.code, 'ALM-003');
  // La consulta del maximo vino filtrada por la empresa, no solo por el tenant.
  const seleccion = consultasDeAlmacenes().filter((c) => c.verb === 'select');
  assert.ok(
    seleccion.some((c) =>
      c.filtros.some((f) => f.columna === 'company_id' && f.valor === TEST1)),
    'la serie se calculo filtrando por company_id',
  );
});

test('createWarehouse dos veces sin codigo: la serie sigue (ALM-003, ALM-004)', async () => {
  antes();
  const a = await createWarehouse(TEST1, { name: 'A' }, 'TEST1DS');
  const b = await createWarehouse(TEST1, { name: 'B' }, 'TEST1DS');

  assert.equal(a.code, 'ALM-003');
  assert.equal(b.code, 'ALM-004');
});

test('la serie es por empresa: test 2 arranca en ALM-001 aunque test 1 ya tenga ALM-001', async () => {
  antes();
  const r = await createWarehouse(TEST2, { name: 'De la hermana' }, 'TEST1DS');

  assert.equal(r.code, 'ALM-001', 'la hermana del mismo tenant tiene su propia serie');
});

test('los codigos legacy (PRINCIPAL/SEC) y la fila sin empresa (ALM-099) no cuentan', async () => {
  antes();
  // test 1 tiene "PRINCIPAL" (no matchea ALM-) y la fila sin empresa tiene
  // "ALM-099" pero su company_id es NULL: ninguno empuja la serie de test 1.
  const r = await createWarehouse(TEST1, { name: 'C' }, 'TEST1DS');

  assert.equal(r.code, 'ALM-003');
  assert.equal(await proximoNumeroCodigoAlmacen(TEST1, 'TEST1DS'), 4);
});

test('createWarehouse con codigo explicito lo respeta (y lo normaliza a mayusculas)', async () => {
  antes();
  const r = await createWarehouse(TEST1, { name: 'D', code: 'bodega-norte' }, 'TEST1DS');

  assert.equal(r.code, 'BODEGA-NORTE', 'un codigo propio de la API/importacion se guarda normalizado');
  // Y no consumio numero de serie: la siguiente sigue en ALM-003.
  assert.equal(await proximoNumeroCodigoAlmacen(TEST1, 'TEST1DS'), 3);
});

test('createWarehouse sin nombre: 400 (name sigue siendo obligatorio)', async () => {
  antes();
  await assert.rejects(
    () => createWarehouse(TEST1, { code: 'X' }, 'TEST1DS'),
    /name es requerido/,
  );
  // Ninguna fila nueva llego a la tabla.
  assert.equal(WAREHOUSE.length, 6, 'el fixture quedo intacto');
});
