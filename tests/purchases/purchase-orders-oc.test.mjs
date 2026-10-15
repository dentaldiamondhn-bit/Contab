import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchPurchaseOrders,
  createPurchaseOrder,
  updatePurchaseOrder,
  deletePurchaseOrder,
  recibirPurchaseOrder,
} from '@/lib/purchase-orders-db';
import { ErrorDeEmpresa } from './tenant-resolver-mock.mjs';
import { crearSupabaseFalso } from './supabase-falso.mjs';

/**
 * Órdenes de Compra: aislamiento real (test 1 y test 2 comparten `TEST1DS`,
 * asi que el tenant no separa nada) y flujo O.C. → Compra, que registra la
 * compra real via `createPurchase` y cuelga `purchase_id`.
 */

const E1 = '73d5bbf7-8e47-470e-9430-da513e623ab7'; // Empresa 1, tenant '1'
const T1 = '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'; // test 1
const T2 = '971bec43-5c57-44a3-92b0-db7f909c5276'; // test 2
const TEN = 'TEST1DS'; // tenant compartido por T1 y T2

const em = (companyId, tenantId = TEN) => ({ tenantId, companyId });

let sb;
let bd;

function sembrar(extra = {}) {
  bd = {
    PurchaseOrder: [
      { id: 'o-e1', company_id: E1, tenant_id: '1', order_number: 'OC-E1', supplier_id: 's-e1', subtotal: 100, tax_amount: 15, total: 115, status: 'APPROVED', purchase_id: null, received_at: null, created_at: '2026-01-01' },
      { id: 'o-t1', company_id: T1, tenant_id: TEN, order_number: 'OC-T1', supplier_id: 's-t1', subtotal: 200, tax_amount: 30, total: 230, status: 'APPROVED', purchase_id: null, received_at: null, created_at: '2026-01-02' },
      { id: 'o-t2', company_id: T2, tenant_id: TEN, order_number: 'OC-T2', supplier_id: 's-t2', subtotal: 300, tax_amount: 45, total: 345, status: 'DRAFT', purchase_id: null, received_at: null, created_at: '2026-01-03' },
      { id: 'o-t1b', company_id: T1, tenant_id: TEN, order_number: 'OC-T1B', supplier_id: 's-t1', subtotal: 50, tax_amount: 8, total: 58, status: 'DRAFT', purchase_id: null, received_at: null, created_at: '2026-01-04' },
    ],
    PurchaseOrderItem: [
      { id: 'oi-t1', purchase_order_id: 'o-t1', company_id: T1, tenant_id: TEN, product_id: 'prod-t1', product_code: 'P1', product_name: 'Cafe', quantity_requested: 4, quantity_received: 0, unit_price: 50, total: 200 },
    ],
    Supplier: [
      { id: 's-e1', company_id: E1, tenant_id: '1', name: 'Proveedor E1', rtn: '0801-1' },
      { id: 's-t1', company_id: T1, tenant_id: TEN, name: 'Proveedor T1', rtn: '0801-2' },
      { id: 's-t2', company_id: T2, tenant_id: TEN, name: 'Proveedor T2', rtn: '0801-3' },
    ],
    product: [
      { id: 'prod-e1', company_id: E1, tenant_id: '1', name: 'Cafe', current_stock: 10 },
      { id: 'prod-t1', company_id: T1, tenant_id: TEN, name: 'Cafe', current_stock: 50 },
    ],
    Purchase: [],
    PurchaseItem: [],
    supplier_price_history: [],
    SupplierPayment: [],
    Account: [],
    JournalEntry: [],
    JournalEntryLine: [],
    ...extra,
  };
  sb = crearSupabaseFalso({ bd });
}

beforeEach(() => sembrar());

describe('fetchPurchaseOrders', () => {
  test('test 1 no ve las ordenes de test 2 aunque compartan tenant', async () => {
    const { data } = await fetchPurchaseOrders(sb, em(T1), {});
    assert.deepEqual(data.map((o) => o.id), ['o-t1', 'o-t1b']);
  });

  test('test 2 tampoco ve las de test 1', async () => {
    const { data } = await fetchPurchaseOrders(sb, em(T2), {});
    assert.deepEqual(data.map((o) => o.id), ['o-t2']);
  });

  test('Empresa 1 no ve nada de TEST1DS', async () => {
    const { data } = await fetchPurchaseOrders(sb, em(E1, '1'), {});
    assert.deepEqual(data.map((o) => o.id), ['o-e1']);
  });

  test('filtra por estado', async () => {
    const { data } = await fetchPurchaseOrders(sb, em(T2), { status: 'DRAFT' });
    assert.deepEqual(data.map((o) => o.id), ['o-t2']);
  });
});

describe('createPurchaseOrder', () => {
  const cuerpo = (extra = {}) => ({
    order_number: 'OC-NUEVA',
    supplier_id: 's-t1',
    order_date: '2026-10-08',
    subtotal: 100,
    tax_amount: 15,
    total: 115,
    items: [{ product_id: 'prod-t1', product_name: 'Cafe', quantity_requested: 2, unit_price: 50, total: 100 }],
    ...extra,
  });

  test('escribe tenant y company del servidor, no los del cuerpo', async () => {
    await createPurchaseOrder(sb, em(T1), cuerpo({ companyId: E1, company_id: E1, tenant_id: '1' }));

    const creada = bd.PurchaseOrder.at(-1);
    assert.equal(creada.company_id, T1);
    assert.equal(creada.tenant_id, TEN);
    assert.equal(creada.status, 'DRAFT');
  });

  test('rechaza un proveedor de otra empresa con 400 y no escribe nada', async () => {
    const antes = bd.PurchaseOrder.length;
    await assert.rejects(
      () => createPurchaseOrder(sb, em(T1), cuerpo({ supplier_id: 's-t2' })),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
    assert.equal(bd.PurchaseOrder.length, antes);
  });

  test('conserva el product_id propio y suelta el ajeno', async () => {
    await createPurchaseOrder(sb, em(T1), cuerpo({ items: [{ product_id: 'prod-e1', product_name: 'Cafe', quantity_requested: 1, unit_price: 50, total: 50 }] }));
    const item = bd.PurchaseOrderItem.at(-1);
    assert.equal(item.product_id, null);

    await createPurchaseOrder(sb, em(T1), cuerpo({ order_number: 'OC-2' }));
    assert.equal(bd.PurchaseOrderItem.at(-1).product_id, 'prod-t1');
  });

  test('exige numero de orden', async () => {
    await assert.rejects(
      () => createPurchaseOrder(sb, em(T1), cuerpo({ order_number: '' })),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
  });
});

describe('updatePurchaseOrder', () => {
  test('404 al editar una orden de test 2 desde test 1', async () => {
    const res = await updatePurchaseOrder(sb, em(T1), 'o-t2', { notes: 'secuestrada' });
    assert.equal(res.notFound, true);
    assert.equal(bd.PurchaseOrder.find((o) => o.id === 'o-t2').notes, undefined);
  });

  test('404 al editar una orden de Empresa 1', async () => {
    const res = await updatePurchaseOrder(sb, em(T1), 'o-e1', { notes: 'x' });
    assert.equal(res.notFound, true);
  });

  test('aprueba desde DRAFT', async () => {
    const res = await updatePurchaseOrder(sb, em(T1), 'o-t1b', { status: 'APPROVED' });
    assert.equal(res.data.status, 'APPROVED');
  });

  test('no admite llegar a RECEIVED por PATCH (solo por el flujo de recibir)', async () => {
    await assert.rejects(
      () => updatePurchaseOrder(sb, em(T1), 'o-t1b', { status: 'RECEIVED' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 409
    );
    assert.equal(bd.PurchaseOrder.find((o) => o.id === 'o-t1b').status, 'DRAFT');
  });

  test('no admite saltarse estados (DRAFT -> COMPLETED)', async () => {
    await assert.rejects(
      () => updatePurchaseOrder(sb, em(T1), 'o-t1b', { status: 'COMPLETED' }),
      (e) => e.estado === 409
    );
  });
});

describe('deletePurchaseOrder', () => {
  test('404 al borrar una orden de otra empresa', async () => {
    const res = await deletePurchaseOrder(sb, em(T1), 'o-t2');
    assert.equal(res.notFound, true);
    assert.equal(bd.PurchaseOrder.length, 4);
  });

  test('borra la suya y sus items', async () => {
    const res = await deletePurchaseOrder(sb, em(T1), 'o-t1');
    assert.notEqual(res.notFound, true);
    assert.equal(bd.PurchaseOrder.find((o) => o.id === 'o-t1'), undefined);
    assert.equal(bd.PurchaseOrderItem.find((i) => i.purchase_order_id === 'o-t1'), undefined);
  });
});

describe('recibirPurchaseOrder', () => {
  test('404 si la orden es de otra empresa', async () => {
    const res = await recibirPurchaseOrder(sb, em(T1), { id: 'o-t2', invoice_number: 'F-X' });
    assert.equal(res.notFound, true);
    assert.equal(bd.Purchase.length, 0);
  });

  test('409 si la orden no esta aprobada', async () => {
    await assert.rejects(
      () => recibirPurchaseOrder(sb, em(T1), { id: 'o-t1b', invoice_number: 'F-X' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 409
    );
    assert.equal(bd.Purchase.length, 0);
  });

  test('400 sin numero de factura, sin crear la compra ni tocar la orden', async () => {
    await assert.rejects(
      () => recibirPurchaseOrder(sb, em(T1), { id: 'o-t1' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
    assert.equal(bd.Purchase.length, 0);
    assert.equal(bd.PurchaseOrder.find((o) => o.id === 'o-t1').status, 'APPROVED');
  });

  test('crea la compra real de la empresa, con sus cantidades, y enlaza la orden', async () => {
    const res = await recibirPurchaseOrder(sb, em(T1), { id: 'o-t1', invoice_number: 'F-123' });

    const compra = bd.Purchase.at(-1);
    assert.equal(compra.company_id, T1);
    assert.equal(compra.tenant_id, TEN);
    assert.equal(compra.invoice_number, 'F-123');
    assert.equal(compra.subtotal, 200);
    assert.equal(compra.tax_amount, 30);
    assert.equal(compra.total, 230);
    assert.equal(compra.purchase_type, 'merchandise');
    assert.equal(compra.status, 'PAID');

    const item = bd.PurchaseItem.at(-1);
    assert.equal(item.purchase_id, compra.id);
    assert.equal(item.product_id, 'prod-t1');
    assert.equal(item.quantity, 4);
    assert.equal(item.unit_price, 50);
    assert.equal(item.subtotal, 200);
    assert.equal(item.tax_amount, 30);
    assert.equal(item.total, 230);

    const orden = bd.PurchaseOrder.find((o) => o.id === 'o-t1');
    assert.equal(orden.status, 'RECEIVED');
    assert.equal(orden.purchase_id, compra.id);
    assert.notEqual(orden.received_at, null);

    assert.equal(res.data.purchase.id, compra.id);
    assert.equal(res.data.order.purchase_id, compra.id);
  });

  test('a credito guarda la compra pendiente con fecha de vencimiento', async () => {
    await recibirPurchaseOrder(sb, em(T1), { id: 'o-t1', invoice_number: 'F-2', is_credit: true, due_date: '2026-11-08' });
    const compra = bd.Purchase.at(-1);
    assert.equal(compra.is_credit, true);
    assert.equal(compra.status, 'PENDING');
    assert.equal(compra.amount_paid, 0);
    assert.equal(compra.due_date, '2026-11-08');
  });

  test('no permite recibir dos veces la misma orden', async () => {
    await recibirPurchaseOrder(sb, em(T1), { id: 'o-t1', invoice_number: 'F-1' });
    await assert.rejects(
      () => recibirPurchaseOrder(sb, em(T1), { id: 'o-t1', invoice_number: 'F-1' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 409
    );
    assert.equal(bd.Purchase.length, 1);
  });

  test('si falla la creacion de la compra, la orden queda intacta (sin reservar estado)', async () => {
    sb.estado.bloquearInsert = ['Purchase'];
    const res = await recibirPurchaseOrder(sb, em(T1), { id: 'o-t1', invoice_number: 'F-1' });
    assert.ok(res.error);
    const orden = bd.PurchaseOrder.find((o) => o.id === 'o-t1');
    assert.equal(orden.status, 'APPROVED');
    assert.equal(orden.purchase_id, null);
    assert.equal(orden.received_at, null);
    assert.equal(bd.Purchase.length, 0);
    assert.equal((bd.PurchaseOrderReceipt || []).length, 0);
  });
});