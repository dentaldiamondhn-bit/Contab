// Pruebas de la ruta POST /api/companies/[id]/inventory/transfers/import.
//
// La ruta se prueba REAL (parseo, aliases, agrupado, aislamiento por empresa);
// lo que va en doble es `warehouse-service` (el kardex lo prueba la suite de
// warehouse) y el Supabase (`fake-db.mjs`, con companies/warehouse/product).

import test from 'node:test';
import assert from 'node:assert/strict';
import * as XLSX from 'xlsx';

import { POST as importPOST } from '../../app/api/companies/[id]/inventory/transfers/import/route.ts';
import { mockState, resetTransfersImportMock } from './warehouse-service-mock.mjs';
import { reiniciarTablas } from './fake-db.mjs';

const reqConArchivo = (url, fileName, content, headers = {}) => ({
  url: `http://localhost${url}`,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  formData: async () => {
    const fd = new FormData();
    fd.append('file', new File([content], fileName));
    return fd;
  },
});

const ctx = (id = 'c-test1') => ({ params: Promise.resolve({ id }) });

function csv(headers, rows) {
  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
}

const importar = (content, headers = { 'x-tenant-id': 'TEST1DS' }) =>
  importPOST(reqConArchivo('/api/companies/c-test1/inventory/transfers/import', 'traslados.csv', content, headers), ctx());

test('CSV: agrupa por transfer_number, resuelve almacenes por codigo y nombre, crea 1 traslado', async () => {
  reiniciarTablas();
  resetTransfersImportMock();

  const contenido = csv(
    ['transfer_number', 'origin', 'destination', 'date', 'product_code', 'quantity'],
    [
      ['TRF-A', 'ALM-001', 'ALM-002', '2026-10-15', 'PROD-001', '10'],
      ['TRF-A', 'Bodega Uno', 'Bodega Dos', '2026-10-15', 'PROD-002', '5'],
    ],
  );

  const res = await importar(contenido);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.created, 1);
  assert.equal(body.failed, 0);

  assert.equal(mockState.calls.createTr.length, 1);
  const llamada = mockState.calls.createTr[0];
  assert.equal(llamada.companyId, 'c-test1');
  assert.equal(llamada.tenantHint, 'TEST1DS');
  assert.equal(llamada.input.source_warehouse_id, 'w1');
  assert.equal(llamada.input.destination_warehouse_id, 'w2');
  assert.equal(llamada.input.transfer_date, '2026-10-15');
  assert.deepEqual(llamada.input.items, [
    { product_id: 'p1', quantity: 10 },
    { product_id: 'p2', quantity: 5 },
  ]);
});

test('CSV: filas del mismo grupo con el mismo producto se fusionan en un solo item', async () => {
  reiniciarTablas();
  resetTransfersImportMock();

  const contenido = csv(
    ['transfer_number', 'origin', 'destination', 'date', 'product_code', 'quantity'],
    [
      ['TRF-B', 'ALM-001', 'ALM-002', '2026-10-15', 'PROD-001', '10'],
      ['TRF-B', 'ALM-001', 'ALM-002', '2026-10-15', 'PROD-001', '7'],
    ],
  );

  const res = await importar(contenido);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.created, 1);
  assert.equal(mockState.calls.createTr.length, 1);
  assert.deepEqual(mockState.calls.createTr[0].input.items, [{ product_id: 'p1', quantity: 17 }]);
});

test('CSV: sin transfer_number cada fila es su propio traslado', async () => {
  reiniciarTablas();
  resetTransfersImportMock();

  const contenido = csv(
    ['origin', 'destination', 'date', 'product_code', 'quantity'],
    [
      ['ALM-001', 'ALM-002', '2026-10-15', 'PROD-001', '3'],
      ['ALM-001', 'ALM-002', '2026-10-15', 'PROD-002', '4'],
    ],
  );

  const res = await importar(contenido);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.created, 2);
  assert.equal(mockState.calls.createTr.length, 2);
  assert.deepEqual(mockState.calls.createTr[0].input.items, [{ product_id: 'p1', quantity: 3 }]);
  assert.deepEqual(mockState.calls.createTr[1].input.items, [{ product_id: 'p2', quantity: 4 }]);
});

test('CSV: grupo con origen/destino distintos entre filas no se crea y reporta la fila', async () => {
  reiniciarTablas();
  resetTransfersImportMock();

  const contenido = csv(
    ['transfer_number', 'origin', 'destination', 'date', 'product_code', 'quantity'],
    [
      ['TRF-C', 'ALM-001', 'ALM-002', '2026-10-15', 'PROD-001', '10'],
      ['TRF-C', 'ALM-002', 'ALM-001', '2026-10-15', 'PROD-002', '5'],
    ],
  );

  const res = await importar(contenido);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.created, 0);
  assert.equal(body.failed, 1);
  assert.equal(mockState.calls.createTr.length, 0);
  assert.equal(body.errors.length, 1);
  assert.equal(body.errors[0].row, 3);
  assert.match(body.errors[0].message, /mismo grupo/);
  assert.match(body.errors[0].message, /TRF-C/);
});

test('CSV: errores por fila (almacen inexistente, producto de otra empresa, origen=destino, inactivo, cantidad)', async () => {
  reiniciarTablas();
  resetTransfersImportMock();

  const contenido = csv(
    ['origin', 'destination', 'product_code', 'quantity'],
    [
      ['NO-EXISTE', 'ALM-002', 'PROD-001', '10'],
      ['ALM-001', 'ALM-002', 'PROD-999', '5'],
      ['ALM-001', 'ALM-001', 'PROD-001', '3'],
      ['ALM-003', 'ALM-002', 'PROD-001', '2'],
      ['ALM-001', 'ALM-002', 'PROD-001', '-5'],
    ],
  );

  const res = await importar(contenido);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.created, 0);
  assert.equal(mockState.calls.createTr.length, 0);
  assert.equal(body.errors.length, 5);

  assert.deepEqual(body.errors.map((e) => e.row), [2, 3, 4, 5, 6]);
  assert.match(body.errors[0].message, /Almacén origen no encontrado: NO-EXISTE/);
  assert.match(body.errors[1].message, /Producto no encontrado: PROD-999/);
  assert.match(body.errors[2].message, /Origen y destino deben ser almacenes distintos/);
  assert.match(body.errors[3].message, /Almacén origen inactivo: ALM-003/);
  assert.match(body.errors[4].message, /Cantidad inválida/);
});

test('CSV: un fallo de createTransfer (p. ej. stock) se reporta como error de esa fila, no 500', async () => {
  reiniciarTablas();
  resetTransfersImportMock();
  mockState.fallarCon = 'Stock insuficiente en el almacén origen para el producto PROD-001';

  const contenido = csv(
    ['origin', 'destination', 'product_code', 'quantity'],
    [['ALM-001', 'ALM-002', 'PROD-001', '999']],
  );

  const res = await importar(contenido);
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.created, 0);
  assert.equal(body.failed, 1);
  assert.equal(body.errors.length, 1);
  assert.match(body.errors[0].message, /Stock insuficiente/);
});

test('400 si faltan columnas obligatorias', async () => {
  reiniciarTablas();
  resetTransfersImportMock();

  const contenido = csv(['origin', 'destination'], [['ALM-001', 'ALM-002']]);

  const res = await importar(contenido);
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.equal(body.success, false);
  assert.match(body.error, /product_code/);
  assert.match(body.error, /quantity/);
  assert.equal(mockState.calls.createTr.length, 0);
});

test('400 si el formato del archivo no esta soportado', async () => {
  reiniciarTablas();
  resetTransfersImportMock();

  const res = await importPOST(
    reqConArchivo(
      '/api/companies/c-test1/inventory/transfers/import',
      'plano.pdf',
      '%PDF-1.4',
      { 'x-tenant-id': 'TEST1DS' },
    ),
    ctx(),
  );
  const body = await res.json();

  assert.equal(res.status, 400);
  assert.match(body.error, /Formato no soportado/);
});

test('403 si la empresa de la ruta no pertenece al tenant de sesion', async () => {
  reiniciarTablas();
  resetTransfersImportMock();

  const contenido = csv(
    ['origin', 'destination', 'product_code', 'quantity'],
    [['ALM-001', 'ALM-002', 'PROD-001', '1']],
  );

  const res = await importPOST(
    reqConArchivo(
      '/api/companies/c-angelos/inventory/transfers/import',
      'traslados.csv',
      contenido,
      { 'x-tenant-id': 'TEST1DS' },
    ),
    ctx('c-angelos'),
  );
  const body = await res.json();

  assert.equal(res.status, 403);
  assert.match(body.error, /no pertenece/);
  assert.equal(mockState.calls.createTr.length, 0);
});

test('Excel: parsea hoja con encabezados en español (aliases) y crea el traslado', async () => {
  reiniciarTablas();
  resetTransfersImportMock();

  const ws = XLSX.utils.aoa_to_sheet([
    ['Traslado', 'Origen', 'Destino', 'Fecha', 'Producto', 'Cantidad', 'Transportista'],
    ['TRF-X', 'ALM-001', 'ALM-002', '2026-10-16', 'PROD-001', '8', 'Expreso'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hoja1');
  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

  const res = await importPOST(
    reqConArchivo(
      '/api/companies/c-test1/inventory/transfers/import',
      'traslados.xlsx',
      buffer,
      { 'x-tenant-id': 'TEST1DS' },
    ),
    ctx(),
  );
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.created, 1);
  const llamada = mockState.calls.createTr[0];
  assert.equal(llamada.input.transfer_date, '2026-10-16');
  assert.equal(llamada.input.carrier, 'Expreso');
  assert.deepEqual(llamada.input.items, [{ product_id: 'p1', quantity: 8 }]);
});
