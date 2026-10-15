import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  recibirPurchaseOrder,
  fetchPurchaseOrderReceipts,
  conciliarOrden,
} from '@/lib/purchase-orders-db';
import { ErrorDeEmpresa } from './tenant-resolver-mock.mjs';
import { crearSupabaseFalso } from './supabase-falso.mjs';

/**
 * Recepcion PARCIAL (migracion 059) y conciliacion 3 vias (ordenado vs recibido
 * vs facturado) contra el `purchase-orders-db` REAL. test 1 y test 2 comparten
 * `TEST1DS`, asi que la empresa (no el tenant) es lo que aisla.
 */

const E1 = '73d5bbf7-8e47-470e-9430-da513e623ab7'; // Empresa 1, tenant '1'
const T1 = '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'; // test 1
const T2 = '971bec43-5c57-44a3-92b0-db7f909c5276'; // test 2
const TEN = 'TEST1DS'; // tenant compartido por T1 y T2

const em = (companyId, tenantId = TEN) => ({ tenantId, companyId });

let sb;
let bd;

function sembrar() {
  bd = {
    PurchaseOrder: [
      { id: 'o-t1', company_id: T1, tenant_id: TEN, order_number: 'OC-T1', supplier_id: 's-t1', subtotal: 200, tax_amount: 30, total: 230, status: 'APPROVED', purchase_id: null, received_at: null, created_at: '2026-01-02' },
      { id: 'o-t2', company_id: T2, tenant_id: TEN, order_number: 'OC-T2', supplier_id: 's-t2', subtotal: 300, tax_amount: 45, total: 345, status: 'APPROVED', purchase_id: null, received_at: null, created_at: '2026-01-03' },
    ],
    PurchaseOrderItem: [
      { id: 'oi-t1', purchase_order_id: 'o-t1', company_id: T1, tenant_id: TEN, product_id: 'prod-t1', product_code: 'P1', product_name: 'Cafe', quantity_requested: 4, quantity_received: 0, unit_price: 50, total: 200 },
    ],
    Supplier: [
      { id: 's-t1', company_id: T1, tenant_id: TEN, name: 'Proveedor T1', rtn: '0801-2' },
      { id: 's-t2', company_id: T2, tenant_id: TEN, name: 'Proveedor T2', rtn: '0801-3' },
    ],
    product: [
      { id: 'prod-t1', company_id: T1, tenant_id: TEN, name: 'Cafe', current_stock: 50 },
    ],
    Purchase: [],
    PurchaseItem: [],
    PurchaseOrderReceipt: [],
    PurchaseOrderReceiptItem: [],
    supplier_price_history: [],
    SupplierPayment: [],
    Account: [],
    JournalEntry: [],
    JournalEntryLine: [],
  };
  sb = crearSupabaseFalso({ bd });
  // Arranca el correlativo de ids del fake para que las filas creadas no
  // compartan id (createPurchase + receipt crean varias).
  sb.estado.seq = 0;
}

beforeEach(() => sembrar());

describe('recibirPurchaseOrder - recepcion parcial', () => {
  test('recibe parte de una linea y deja la orden PARTIALLY_RECEIVED', async () => {
    const res = await recibirPurchaseOrder(sb, em(T1), {
      id: 'o-t1',
      invoice_number: 'F-1',
      items: [{ purchase_order_item_id: 'oi-t1', quantity_received: 2 }],
    });

    const compra = bd.Purchase.at(-1);
    assert.equal(compra.company_id, T1);
    assert.equal(compra.subtotal, 100);
    assert.equal(compra.tax_amount, 15);
    assert.equal(compra.total, 115);
    assert.equal(bd.PurchaseItem.at(-1).quantity, 2);

    assert.equal(bd.PurchaseOrderReceipt.length, 1);
    const recibo = bd.PurchaseOrderReceipt[0];
    assert.equal(recibo.invoice_number, 'F-1');
    assert.equal(recibo.company_id, T1);
    assert.equal(recibo.purchase_order_id, 'o-t1');
    assert.equal(recibo.purchase_id, compra.id);

    assert.equal(bd.PurchaseOrderReceiptItem.length, 1);
    assert.equal(bd.PurchaseOrderReceiptItem[0].quantity_received, 2);
    assert.equal(bd.PurchaseOrderReceiptItem[0].product_id, 'prod-t1');

    assert.equal(bd.PurchaseOrderItem.find((i) => i.id === 'oi-t1').quantity_received, 2);

    const orden = bd.PurchaseOrder.find((o) => o.id === 'o-t1');
    assert.equal(orden.status, 'PARTIALLY_RECEIVED');
    assert.equal(orden.purchase_id, compra.id);
    assert.equal(res.data.order.status, 'PARTIALLY_RECEIVED');
  });

  test('completa la recepcion y deja la orden RECEIVED con dos compras', async () => {
    await recibirPurchaseOrder(sb, em(T1), {
      id: 'o-t1', invoice_number: 'F-1',
      items: [{ purchase_order_item_id: 'oi-t1', quantity_received: 2 }],
    });
    const res = await recibirPurchaseOrder(sb, em(T1), {
      id: 'o-t1', invoice_number: 'F-2',
      items: [{ purchase_order_item_id: 'oi-t1', quantity_received: 2 }],
    });

    assert.equal(bd.PurchaseOrderReceipt.length, 2);
    assert.equal(bd.Purchase.length, 2);
    assert.equal(bd.PurchaseOrderItem.find((i) => i.id === 'oi-t1').quantity_received, 4);
    assert.equal(bd.PurchaseOrder.find((o) => o.id === 'o-t1').status, 'RECEIVED');
    assert.equal(res.data.order.status, 'RECEIVED');
  });

  test('sin items recibe lo pendiente (compatibilidad con el flujo de 052)', async () => {
    await recibirPurchaseOrder(sb, em(T1), { id: 'o-t1', invoice_number: 'F-1' });
    assert.equal(bd.PurchaseOrderItem.find((i) => i.id === 'oi-t1').quantity_received, 4);
    assert.equal(bd.PurchaseOrder.find((o) => o.id === 'o-t1').status, 'RECEIVED');
    assert.equal(bd.Purchase.at(-1).total, 230);
  });

  test('409 si ya no queda nada por recibir', async () => {
    await recibirPurchaseOrder(sb, em(T1), { id: 'o-t1', invoice_number: 'F-1' });
    await assert.rejects(
      () => recibirPurchaseOrder(sb, em(T1), { id: 'o-t1', invoice_number: 'F-2' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 409
    );
    assert.equal(bd.Purchase.length, 1);
  });

  test('400 si una linea no corresponde a ningun articulo y no escribe nada', async () => {
    await assert.rejects(
      () => recibirPurchaseOrder(sb, em(T1), {
        id: 'o-t1', invoice_number: 'F-1',
        items: [{ product_name: 'No existe', quantity_received: 1 }],
      }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
    assert.equal(bd.Purchase.length, 0);
    assert.equal(bd.PurchaseOrderReceipt.length, 0);
  });

  test('404 si la orden es de otra empresa (no escribe nada)', async () => {
    const res = await recibirPurchaseOrder(sb, em(T1), { id: 'o-t2', invoice_number: 'F-X' });
    assert.equal(res.notFound, true);
    assert.equal(bd.Purchase.length, 0);
    assert.equal(bd.PurchaseOrderReceipt.length, 0);
  });
});

describe('fetchPurchaseOrderReceipts', () => {
  test('devuelve las recepciones de la empresa y su linea', async () => {
    await recibirPurchaseOrder(sb, em(T1), {
      id: 'o-t1', invoice_number: 'F-1',
      items: [{ purchase_order_item_id: 'oi-t1', quantity_received: 2 }],
    });
    const { data } = await fetchPurchaseOrderReceipts(sb, em(T1), 'o-t1');
    assert.equal(data.length, 1);
    assert.equal(data[0].invoice_number, 'F-1');
    assert.equal(data[0].items.length, 1);
    assert.equal(data[0].items[0].quantity_received, 2);
  });

  test('otra empresa no ve las recepciones', async () => {
    await recibirPurchaseOrder(sb, em(T1), { id: 'o-t1', invoice_number: 'F-1' });
    const { data } = await fetchPurchaseOrderReceipts(sb, em(T2), 'o-t1');
    assert.deepEqual(data, []);
  });
});

describe('conciliarOrden (matching 3 vias)', () => {
  test('404 si la orden es de otra empresa', async () => {
    const res = await conciliarOrden(sb, em(T1), 'o-t2');
    assert.equal(res.notFound, true);
  });

  test('ordenada pero no recibida -> SIN_RECIBIR', async () => {
    const { data } = await conciliarOrden(sb, em(T1), 'o-t1');
    assert.equal(data.lines[0].estado, 'SIN_RECIBIR');
    assert.equal(data.hayDiscrepancias, true);
  });

  test('recibida a medias -> PARCIAL', async () => {
    await recibirPurchaseOrder(sb, em(T1), {
      id: 'o-t1', invoice_number: 'F-1',
      items: [{ purchase_order_item_id: 'oi-t1', quantity_received: 2 }],
    });
    const { data } = await conciliarOrden(sb, em(T1), 'o-t1');
    const linea = data.lines[0];
    assert.equal(linea.estado, 'PARCIAL');
    assert.equal(linea.ordered_qty, 4);
    assert.equal(linea.received_qty, 2);
    assert.equal(linea.invoiced_qty, 2);
    assert.equal(linea.qty_variance, 2);
    assert.equal(data.hayDiscrepancias, true);
  });

  test('recibida y facturada completa -> OK', async () => {
    await recibirPurchaseOrder(sb, em(T1), { id: 'o-t1', invoice_number: 'F-1' });
    const { data } = await conciliarOrden(sb, em(T1), 'o-t1');
    assert.equal(data.lines[0].estado, 'OK');
    assert.equal(data.hayDiscrepancias, false);
    assert.equal(data.totals.received, 200);
  });

  test('recibida pero sin compra asociada -> FALTANTE_FACTURA', async () => {
    bd.PurchaseOrderReceipt.push({ id: 'r1', purchase_order_id: 'o-t1', company_id: T1, tenant_id: TEN, invoice_number: 'F-1', purchase_id: null, received_at: '2026-01-05' });
    bd.PurchaseOrderReceiptItem.push({ id: 'ri1', receipt_id: 'r1', company_id: T1, tenant_id: TEN, product_id: 'prod-t1', product_name: 'Cafe', quantity_received: 4, unit_price: 50 });
    const { data } = await conciliarOrden(sb, em(T1), 'o-t1');
    assert.equal(data.lines[0].estado, 'FALTANTE_FACTURA');
  });

  test('precio facturado distinto -> DIF_PRECIO', async () => {
    bd.PurchaseOrderReceipt.push({ id: 'r1', purchase_order_id: 'o-t1', company_id: T1, tenant_id: TEN, invoice_number: 'F-1', purchase_id: 'p1', received_at: '2026-01-05' });
    bd.PurchaseOrderReceiptItem.push({ id: 'ri1', receipt_id: 'r1', company_id: T1, tenant_id: TEN, product_id: 'prod-t1', product_name: 'Cafe', quantity_received: 4, unit_price: 50 });
    bd.PurchaseItem.push({ id: 'pi1', purchase_id: 'p1', company_id: T1, tenant_id: TEN, product_id: 'prod-t1', product_name: 'Cafe', quantity: 4, unit_price: 60 });
    const { data } = await conciliarOrden(sb, em(T1), 'o-t1');
    assert.equal(data.lines[0].invoiced_qty, 4);
    assert.equal(data.lines[0].invoiced_unit_price, 60);
    assert.equal(data.lines[0].estado, 'DIF_PRECIO');
  });

  test('recibido de mas -> EXCESO', async () => {
    bd.PurchaseOrderReceipt.push({ id: 'r1', purchase_order_id: 'o-t1', company_id: T1, tenant_id: TEN, invoice_number: 'F-1', purchase_id: null, received_at: '2026-01-05' });
    bd.PurchaseOrderReceiptItem.push({ id: 'ri1', receipt_id: 'r1', company_id: T1, tenant_id: TEN, product_id: 'prod-t1', product_name: 'Cafe', quantity_received: 6, unit_price: 50 });
    const { data } = await conciliarOrden(sb, em(T1), 'o-t1');
    assert.equal(data.lines[0].estado, 'EXCESO');
  });
});
