import test from 'node:test';
import assert from 'node:assert/strict';

import {
  GET as whGET,
  POST as whPOST,
} from '../../app/api/companies/[id]/inventory/warehouses/route.ts';
import { PUT as whPUT } from '../../app/api/companies/[id]/inventory/warehouses/[warehouseId]/route.ts';
import { GET as stockGET } from '../../app/api/companies/[id]/inventory/stock/route.ts';
import { GET as variationsGET } from '../../app/api/companies/[id]/inventory/variations/route.ts';
import {
  GET as trGET,
  POST as trPOST,
} from '../../app/api/companies/[id]/inventory/transfers/route.ts';
import {
  GET as trDetailGET,
  PUT as trDetailPUT,
} from '../../app/api/companies/[id]/inventory/transfers/[transferId]/route.ts';
import { mockState, resetWarehouseMock } from './warehouse-service-mock.mjs';

const req = (url, headers = {}) => ({
  url: `http://localhost${url}`,
  headers: { get: (name) => headers[name.toLowerCase()] ?? null },
});
const withBody = (url, body, headers = {}) => {
  const r = req(url, headers);
  r.json = async () => body;
  return r;
};

test('GET almacenes (200) con tenant del header', async () => {
  resetWarehouseMock();
  mockState.warehouses = [{ id: 'w1', code: 'PRINCIPAL', name: 'Bodega Principal' }];

  const res = await whGET(
    req('/api/companies/ANGELOH7/inventory/warehouses', { 'x-tenant-id': 'T1' }),
    { params: Promise.resolve({ id: 'ANGELOH7' }) },
  );
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.warehouses.length, 1);
  assert.deepEqual(mockState.calls.listWh, [
    { companyId: 'ANGELOH7', tenantHint: 'T1', opts: { activeOnly: true } },
  ]);
});

test('POST almacén 201; 400 sin código', async () => {
  resetWarehouseMock();

  const ok = await whPOST(
    withBody('/api/companies/ANGELOH7/inventory/warehouses', { code: 'SEC', name: 'Secundaria' }),
    { params: Promise.resolve({ id: 'ANGELOH7' }) },
  );
  assert.equal(ok.status, 201);

  const bad = await whPOST(
    withBody('/api/companies/ANGELOH7/inventory/warehouses', { name: 'Sin código' }),
    { params: Promise.resolve({ id: 'ANGELOH7' }) },
  );
  const badBody = await bad.json();
  assert.equal(bad.status, 400);
  assert.match(badBody.error, /code/i);
});

test('PUT almacén 404 si no existe; 200 si existe', async () => {
  resetWarehouseMock();
  mockState.warehouse = null;

  const nf = await whPUT(
    withBody('/api/companies/ANGELOH7/inventory/warehouses/nope', { name: 'X' }),
    { params: Promise.resolve({ id: 'ANGELOH7', warehouseId: 'nope' }) },
  );
  assert.equal(nf.status, 404);

  mockState.warehouse = { id: 'w1', name: 'X' };
  const good = await whPUT(
    withBody('/api/companies/ANGELOH7/inventory/warehouses/w1', { name: 'X' }),
    { params: Promise.resolve({ id: 'ANGELOH7', warehouseId: 'w1' }) },
  );
  assert.equal(good.status, 200);
});

test('GET stock por almacén (200) con filtros', async () => {
  resetWarehouseMock();
  mockState.stock = [
    { warehouse_id: 'w1', product_code: 'P001', stock: 7, low_stock: false },
  ];

  const res = await stockGET(
    req('/api/companies/ANGELOH7/inventory/stock?warehouseId=w1'),
    { params: Promise.resolve({ id: 'ANGELOH7' }) },
  );
  const body = await res.json();

  assert.equal(res.status, 200);
  assert.equal(body.data.stock.length, 1);
  assert.deepEqual(mockState.calls.stock, [
    { companyId: 'ANGELOH7', tenantHint: null, opts: { warehouseId: 'w1', productId: undefined } },
  ]);
});

test('GET variaciones 400 con períodos inválidos/iguales; 200 con datos', async () => {
  resetWarehouseMock();
  mockState.variations = null;

  const invalid = await variationsGET(
    req('/api/companies/ANGELOH7/inventory/variations?from=2026-13&to=2026-10'),
    { params: Promise.resolve({ id: 'ANGELOH7' }) },
  );
  assert.equal(invalid.status, 400);

  const same = await variationsGET(
    req('/api/companies/ANGELOH7/inventory/variations?from=2026-09&to=2026-09'),
    { params: Promise.resolve({ id: 'ANGELOH7' }) },
  );
  assert.equal(same.status, 400);

  mockState.variations = {
    from: '2026-09',
    to: '2026-10',
    rows: [{ warehouse_id: 'w1', product_code: 'P001', fromStock: 7, toStock: 5, varAbs: -2 }],
    generatedAt: new Date().toISOString(),
  };
  const ok = await variationsGET(
    req('/api/companies/ANGELOH7/inventory/variations?from=2026-09&to=2026-10&warehouseId=w1'),
    { params: Promise.resolve({ id: 'ANGELOH7' }) },
  );
  const okBody = await ok.json();
  assert.equal(ok.status, 200);
  assert.equal(okBody.data.variations.rows.length, 1);
  assert.deepEqual(mockState.calls.variations[2], {
    companyId: 'ANGELOH7',
    from: '2026-09',
    to: '2026-10',
    tenantHint: null,
    opts: { warehouseId: 'w1' },
  });
});

test('GET traslados 200; 400 con status inválido', async () => {
  resetWarehouseMock();
  mockState.transfers = [{ id: 't1', transfer_number: 'TRF-00001', status: 'pending' }];

  const ok = await trGET(req('/api/companies/ANGELOH7/inventory/transfers?status=pending'), {
    params: Promise.resolve({ id: 'ANGELOH7' }),
  });
  assert.equal(ok.status, 200);

  const bad = await trGET(req('/api/companies/ANGELOH7/inventory/transfers?status=volando'), {
    params: Promise.resolve({ id: 'ANGELOH7' }),
  });
  const badBody = await bad.json();
  assert.equal(bad.status, 400);
  assert.match(badBody.error, /status/i);
});

test('POST traslado 201; 400 origen=destino', async () => {
  resetWarehouseMock();
  const input = {
    source_warehouse_id: 'w1',
    destination_warehouse_id: 'w2',
    items: [{ product_id: 'p1', quantity: 2 }],
  };

  const ok = await trPOST(withBody('/api/companies/ANGELOH7/inventory/transfers', input), {
    params: Promise.resolve({ id: 'ANGELOH7' }),
  });
  const okBody = await ok.json();
  assert.equal(ok.status, 201);
  assert.equal(okBody.data.transfer.transfer_number, 'TRF-00001');

  const bad = await trPOST(
    withBody('/api/companies/ANGELOH7/inventory/transfers', {
      ...input,
      destination_warehouse_id: 'w1',
    }),
    { params: Promise.resolve({ id: 'ANGELOH7' }) },
  );
  const badBody = await bad.json();
  assert.equal(bad.status, 400);
  assert.match(badBody.error, /diferentes/);
});

test('GET detalle traslado 404/200; PUT dispatch 200, acción inválida 400', async () => {
  resetWarehouseMock();
  mockState.transfer = null;

  const nf = await trDetailGET(req('/api/companies/ANGELOH7/inventory/transfers/nope'), {
    params: Promise.resolve({ id: 'ANGELOH7', transferId: 'nope' }),
  });
  assert.equal(nf.status, 404);

  const nfPut = await trDetailPUT(
    withBody('/api/companies/ANGELOH7/inventory/transfers/nope', { action: 'dispatch' }),
    { params: Promise.resolve({ id: 'ANGELOH7', transferId: 'nope' }) },
  );
  assert.equal(nfPut.status, 404);

  mockState.transfer = { id: 't1', transfer_number: 'TRF-00001', status: 'pending' };
  const good = await trDetailPUT(
    withBody('/api/companies/ANGELOH7/inventory/transfers/t1', { action: 'dispatch', by: 'admin' }),
    { params: Promise.resolve({ id: 'ANGELOH7', transferId: 't1' }) },
  );
  const goodBody = await good.json();
  assert.equal(good.status, 200);
  assert.equal(goodBody.data.transfer.status, 'in_transit');
  assert.deepEqual(mockState.calls.setStatus[0].action, 'dispatch');

  const bad = await trDetailPUT(
    withBody('/api/companies/ANGELOH7/inventory/transfers/t1', { action: 'volar' }),
    { params: Promise.resolve({ id: 'ANGELOH7', transferId: 't1' }) },
  );
  const badBody = await bad.json();
  assert.equal(bad.status, 400);
  assert.match(badBody.error, /action/i);
});
