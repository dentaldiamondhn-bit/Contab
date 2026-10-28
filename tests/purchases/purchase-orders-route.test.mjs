import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { GET, POST, PATCH, DELETE } from '../../app/api/purchase-orders/route.ts';
import { POST as RECIBIR } from '../../app/api/purchase-orders/receive/route.ts';
import { crearSupabaseFalso } from './supabase-falso.mjs';
import { ponerSupabase } from './supabase-server-mock.mjs';
import { ponerNombreDeUsuario } from './auth-server-mock.mjs';

/**
 * Prueba las RUTAS reales de `/api/purchase-orders` con un supabase falso y el
 * contexto resuelto por headers (como hace `middleware.ts`). Cubre que la
 * empresa sale del contexto (sin header: 400) y que un id de otra empresa no
 * da 500 ni éxito: da 404.
 */

const T1 = '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'; // test 1
const T2 = '971bec43-5c57-44a3-92b0-db7f909c5276'; // test 2
const TEN = 'TEST1DS';

let bd;

function sembrar() {
  bd = {
    PurchaseOrder: [
      { id: 'o-t1', company_id: T1, tenant_id: TEN, order_number: 'OC-1', supplier_id: 's-t1', subtotal: 200, tax_amount: 30, total: 230, status: 'DRAFT', purchase_id: null, created_at: '2026-01-02' },
      { id: 'o-t2', company_id: T2, tenant_id: TEN, order_number: 'OC-2', supplier_id: 's-t2', subtotal: 300, tax_amount: 45, total: 345, status: 'APPROVED', purchase_id: null, created_at: '2026-01-03' },
    ],
    PurchaseOrderItem: [],
    Supplier: [
      { id: 's-t1', company_id: T1, tenant_id: TEN, name: 'Proveedor T1', rtn: '0801-2' },
      { id: 's-t2', company_id: T2, tenant_id: TEN, name: 'Proveedor T2', rtn: '0801-3' },
    ],
    product: [],
    Purchase: [],
    PurchaseItem: [],
    supplier_price_history: [],
    SupplierPayment: [],
    Account: [],
    JournalEntry: [],
    JournalEntryLine: [],
  };
  ponerSupabase(crearSupabaseFalso({ bd }));
  ponerNombreDeUsuario(null);
}

beforeEach(sembrar);

const req = (body, { companyId, tenantId } = {}) => {
  const headers = new Map();
  if (companyId) headers.set('x-company-id', companyId);
  if (tenantId) headers.set('x-tenant-id', tenantId);
  const r = {
    url: 'http://localhost/api/purchase-orders',
    headers: { get: (n) => headers.get(String(n).toLowerCase()) ?? null },
  };
  if (body !== undefined) r.json = async () => body;
  return r;
};
const sesion = { companyId: T1, tenantId: TEN };

test('GET sin contexto de empresa responde 400, no 500', async () => {
  const res = await GET(req());
  assert.equal(res.status, 400);
});

test('GET isola por empresa: test 1 solo ve la suya', async () => {
  const res = await GET(req(undefined, sesion));
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(body.map((o) => o.id), ['o-t1']);
});

test('POST crea la orden con la empresa del contexto, no la del cuerpo', async () => {
  const res = await POST(req({ order_number: 'OC-N', supplier_id: 's-t1', subtotal: 10, tax_amount: 2, total: 12 }, sesion));
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.company_id, T1);
  assert.equal(bd.PurchaseOrder.at(-1).tenant_id, TEN);
});

test('POST rechaza un proveedor de otra empresa con 400', async () => {
  const res = await POST(req({ order_number: 'OC-N', supplier_id: 's-t2', subtotal: 10, tax_amount: 2, total: 12 }, sesion));
  assert.equal(res.status, 400);
  assert.equal(bd.PurchaseOrder.length, 2);
});

test('PATCH de una orden de otra empresa da 404 y no la toca', async () => {
  const res = await PATCH(req({ id: 'o-t2', status: 'APPROVED' }, sesion));
  assert.equal(res.status, 404);
  assert.equal(bd.PurchaseOrder.find((o) => o.id === 'o-t2').status, 'APPROVED');
});

test('PATCH aprueba una orden propia', async () => {
  const res = await PATCH(req({ id: 'o-t1', status: 'APPROVED' }, sesion));
  assert.equal(res.status, 200);
  assert.equal(bd.PurchaseOrder.find((o) => o.id === 'o-t1').status, 'APPROVED');
});

test('PATCH no puede llevar una orden a RECEIVED', async () => {
  const res = await PATCH(req({ id: 'o-t1', status: 'RECEIVED' }, sesion));
  assert.equal(res.status, 409);
});

test('DELETE de una orden ajena da 404', async () => {
  const res = await DELETE({
    url: 'http://localhost/api/purchase-orders?id=o-t2',
    headers: { get: (n) => (n.toLowerCase() === 'x-company-id' ? T1 : n.toLowerCase() === 'x-tenant-id' ? TEN : null) },
  });
  assert.equal(res.status, 404);
  assert.equal(bd.PurchaseOrder.length, 2);
});

test('DELETE de una orden propia la borra con sus items', async () => {
  const res = await DELETE({
    url: 'http://localhost/api/purchase-orders?id=o-t1',
    headers: { get: (n) => (n.toLowerCase() === 'x-company-id' ? T1 : n.toLowerCase() === 'x-tenant-id' ? TEN : null) },
  });
  assert.equal(res.status, 200);
  assert.equal(bd.PurchaseOrder.length, 1);
});

describe('RECIBIR (flujo O.C. -> Compra)', () => {
  test('201 crea la compra real y enlaza la orden', async () => {
    const res = await RECIBIR(req({ id: 'o-t2', invoice_number: 'F-9' }, { companyId: T2, tenantId: TEN }));
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.purchase.invoice_number, 'F-9');
    assert.equal(body.order.purchase_id, body.purchase.id);
    assert.equal(bd.PurchaseOrder.find((o) => o.id === 'o-t2').status, 'RECEIVED');
  });

  test('409 al recibir dos veces', async () => {
    await RECIBIR(req({ id: 'o-t2', invoice_number: 'F-9' }, { companyId: T2, tenantId: TEN }));
    const res = await RECIBIR(req({ id: 'o-t2', invoice_number: 'F-9' }, { companyId: T2, tenantId: TEN }));
    assert.equal(res.status, 409);
    assert.equal(bd.Purchase.length, 1);
  });

  test('404 si la orden es de otra empresa', async () => {
    const res = await RECIBIR(req({ id: 'o-t2', invoice_number: 'F-9' }, sesion));
    assert.equal(res.status, 404);
  });
});

describe('QUIEN REALIZO CADA ACCION (actor de la sesion, resuelto en servidor)', () => {
  test('POST registra quien creo la orden cuando no viene requested_by', async () => {
    ponerNombreDeUsuario('Ana Prueba');
    const res = await POST(req({ order_number: 'OC-N', supplier_id: 's-t1', subtotal: 10, tax_amount: 2, total: 12 }, sesion));
    assert.equal(res.status, 201);
    const body = await res.json();
    assert.equal(body.requested_by, 'Ana Prueba');
    assert.equal(bd.PurchaseOrder.at(-1).requested_by, 'Ana Prueba');
  });

  test('POST respeta el requested_by tecleado por el usuario', async () => {
    ponerNombreDeUsuario('Ana Prueba');
    const res = await POST(req({ order_number: 'OC-N', supplier_id: 's-t1', requested_by: 'Otro Nombre', subtotal: 10, tax_amount: 2, total: 12 }, sesion));
    assert.equal(res.status, 201);
    assert.equal((await res.json()).requested_by, 'Otro Nombre');
  });

  test('POST sin sesion ni requested_by deja el autor en null, no en cadena vacia', async () => {
    const res = await POST(req({ order_number: 'OC-N', supplier_id: 's-t1', subtotal: 10, tax_amount: 2, total: 12 }, sesion));
    assert.equal(res.status, 201);
    assert.equal((await res.json()).requested_by, null);
  });

  test('PATCH aprueba y registra al aprobador de la sesion', async () => {
    ponerNombreDeUsuario('Maria Aprobadora');
    const res = await PATCH(req({ id: 'o-t1', status: 'APPROVED' }, sesion));
    assert.equal(res.status, 200);
    const o = bd.PurchaseOrder.find((x) => x.id === 'o-t1');
    assert.equal(o.approved_by, 'Maria Aprobadora');
    assert.ok(o.approved_at, 'approved_at debe quedar puesto');
  });

  test('PATCH ignora approved_by del cuerpo: manda la sesion', async () => {
    ponerNombreDeUsuario('Maria Aprobadora');
    const res = await PATCH(req({ id: 'o-t1', status: 'APPROVED', approved_by: 'Hacker Falso' }, sesion));
    assert.equal(res.status, 200);
    assert.equal(bd.PurchaseOrder.find((x) => x.id === 'o-t1').approved_by, 'Maria Aprobadora');
  });

  test('PATCH al aprobar sin sesion usa el approved_by del cuerpo como respaldo', async () => {
    const res = await PATCH(req({ id: 'o-t1', status: 'APPROVED', approved_by: 'Nombre Viejo' }, sesion));
    assert.equal(res.status, 200);
    assert.equal(bd.PurchaseOrder.find((x) => x.id === 'o-t1').approved_by, 'Nombre Viejo');
  });

  test('PATCH cancela una orden aprobada con motivo y registra al autor', async () => {
    ponerNombreDeUsuario('Carlos Cancelador');
    const res = await PATCH(req({ id: 'o-t2', status: 'CANCELLED', cancellation_reason: 'Precio fuera de presupuesto' }, { companyId: T2, tenantId: TEN }));
    assert.equal(res.status, 200);
    const o = bd.PurchaseOrder.find((x) => x.id === 'o-t2');
    assert.equal(o.status, 'CANCELLED');
    assert.equal(o.cancellation_reason, 'Precio fuera de presupuesto');
    assert.equal(o.cancelled_by, 'Carlos Cancelador');
  });

  test('PATCH cancelar aprobada sigue exigiendo motivo', async () => {
    const res = await PATCH(req({ id: 'o-t2', status: 'CANCELLED' }, { companyId: T2, tenantId: TEN }));
    assert.equal(res.status, 400);
    assert.equal(bd.PurchaseOrder.find((x) => x.id === 'o-t2').status, 'APPROVED');
  });

  test('RECIBIR registra al que recibio la entrega', async () => {
    ponerNombreDeUsuario('Luis Receptor');
    const res = await RECIBIR(req({ id: 'o-t2', invoice_number: 'F-9' }, { companyId: T2, tenantId: TEN }));
    assert.equal(res.status, 201);
    const o = bd.PurchaseOrder.find((x) => x.id === 'o-t2');
    assert.equal(o.received_by, 'Luis Receptor');
    assert.equal(bd.PurchaseOrderReceipt.find((r) => r.purchase_order_id === 'o-t2').received_by, 'Luis Receptor');
  });
});