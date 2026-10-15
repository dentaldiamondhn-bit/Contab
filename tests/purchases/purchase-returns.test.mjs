import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  createPurchaseReturn,
  fetchPurchaseReturns,
  fetchPurchaseReturn,
  deletePurchaseReturn,
} from '@/lib/purchase-returns-db';
import { ErrorDeEmpresa } from './tenant-resolver-mock.mjs';
import { crearSupabaseFalso } from './supabase-falso.mjs';

/**
 * Devoluciones a proveedores (migracion 060) contra el `purchase-returns-db`
 * REAL. test 1 y test 2 comparten `TEST1DS`, asi que la empresa (no el tenant)
 * es lo que aisla. Se comprueban los tres efectos: cabecera+lineas, baja de
 * stock y asiento de reversa.
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
    Purchase: [
      { id: 'p-t1', company_id: T1, tenant_id: TEN, supplier_id: 's-t1', invoice_number: 'FAC-1', purchase_type: 'merchandise', expense_category: null, subtotal: 500, tax_amount: 75, total: 575 },
      { id: 'p-t2', company_id: T2, tenant_id: TEN, supplier_id: 's-t2', invoice_number: 'FAC-2', purchase_type: 'merchandise', expense_category: null, subtotal: 300, tax_amount: 45, total: 345 },
      { id: 'p-vacia', company_id: T1, tenant_id: TEN, supplier_id: 's-t1', invoice_number: 'FAC-3', purchase_type: 'merchandise', expense_category: null, subtotal: 0, tax_amount: 0, total: 0 },
    ],
    PurchaseItem: [
      { id: 'pi-1', purchase_id: 'p-t1', company_id: T1, tenant_id: TEN, product_id: 'prod-1', product_name: 'Cafe', quantity: 5, unit_price: 100, tax_rate: 15, subtotal: 500, tax_amount: 75, total: 575 },
      { id: 'pi-2', purchase_id: 'p-t2', company_id: T2, tenant_id: TEN, product_id: 'prod-2', product_name: 'Te', quantity: 3, unit_price: 100, tax_rate: 15, subtotal: 300, tax_amount: 45, total: 345 },
    ],
    product: [
      { id: 'prod-1', company_id: T1, tenant_id: TEN, name: 'Cafe', current_stock: 50, stock_quantity: 50 },
      { id: 'prod-2', company_id: T2, tenant_id: TEN, name: 'Te', current_stock: 20, stock_quantity: 20 },
    ],
    Supplier: [
      { id: 's-t1', company_id: T1, tenant_id: TEN, name: 'Proveedor T1', rtn: '0801-2' },
      { id: 's-t2', company_id: T2, tenant_id: TEN, name: 'Proveedor T2', rtn: '0801-3' },
    ],
    Account: [
      { id: 'acc-1105', company_id: T1, code: '1105' },
      { id: 'acc-1110', company_id: T1, code: '1110' },
      { id: 'acc-2101', company_id: T1, code: '2101' },
      { id: 'acc-1101', company_id: T1, code: '1101' },
      { id: 'acc-4100', company_id: T1, code: '4100' },
      { id: 'acc-4101', company_id: T1, code: '4101' },
    ],
    JournalEntry: [],
    JournalEntryLine: [],
    PurchaseReturn: [],
    PurchaseReturnItem: [],
  };
  sb = crearSupabaseFalso({ bd });
  sb.estado.seq = 0;
}

beforeEach(() => sembrar());

describe('createPurchaseReturn - cabecera, lineas, stock y asiento', () => {
  test('devuelve parte de una linea y baja el stock', async () => {
    const res = await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      return_type: 'credit',
      reason: 'producto danado',
      items: [{ purchase_item_id: 'pi-1', quantity: 2 }],
    });

    const header = bd.PurchaseReturn.at(-1);
    assert.equal(header.company_id, T1);
    assert.equal(header.tenant_id, TEN);
    assert.equal(header.purchase_id, 'p-t1');
    assert.equal(header.supplier_id, 's-t1');
    assert.equal(header.invoice_number, 'FAC-1');
    assert.equal(header.return_type, 'credit');
    assert.equal(header.reason, 'producto danado');
    assert.equal(header.subtotal, 200);
    assert.equal(header.tax_amount, 30);
    assert.equal(header.total, 230);

    assert.equal(bd.PurchaseReturnItem.length, 1);
    const linea = bd.PurchaseReturnItem[0];
    assert.equal(linea.return_id, header.id);
    assert.equal(linea.purchase_item_id, 'pi-1');
    assert.equal(linea.product_id, 'prod-1');
    assert.equal(linea.product_name, 'Cafe');
    assert.equal(linea.quantity, 2);
    assert.equal(linea.unit_price, 100);
    assert.equal(linea.subtotal, 200);
    assert.equal(linea.total, 230);

    assert.equal(bd.product.find((p) => p.id === 'prod-1').current_stock, 48);
    assert.equal(bd.product.find((p) => p.id === 'prod-1').stock_quantity, 48);

    assert.equal(res.data.companyId, T1);
    assert.equal(res.data.supplier_name, 'Proveedor T1');
    assert.equal(res.data.items.length, 1);
  });

  test('genera el asiento de reversa (credito reduce CxP 2101)', async () => {
    await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      items: [{ purchase_item_id: 'pi-1', quantity: 2 }],
    });

    assert.equal(bd.JournalEntry.length, 1);
    const je = bd.JournalEntry[0];
    assert.equal(je.company_id, T1);
    assert.equal(je.total_debit, 230);
    assert.equal(je.total_credit, 230);

    assert.equal(bd.JournalEntryLine.length, 3);
    const debe = bd.JournalEntryLine.find((l) => l.debit_amount > 0);
    const creditos = bd.JournalEntryLine.filter((l) => l.credit_amount > 0);
    assert.equal(debe.account_id, 'acc-2101');
    assert.equal(debe.debit_amount, 230);
    assert.equal(creditos.find((l) => l.account_id === 'acc-1105').credit_amount, 200);
    assert.equal(creditos.find((l) => l.account_id === 'acc-1110').credit_amount, 30);

    assert.equal(bd.PurchaseReturn.at(-1).journal_entry_id, je.id);
  });

  test('reembolso en efectivo usa el banco (1101)', async () => {
    await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      return_type: 'cash',
      items: [{ purchase_item_id: 'pi-1', quantity: 1 }],
    });
    const debe = bd.JournalEntryLine.find((l) => l.debit_amount > 0);
    assert.equal(debe.account_id, 'acc-1101');
    assert.equal(debe.debit_amount, 115);
  });

  test('400 si la cantidad supera lo disponible y no escribe nada', async () => {
    await assert.rejects(
      () => createPurchaseReturn(sb, em(T1), {
        purchase_id: 'p-t1',
        items: [{ purchase_item_id: 'pi-1', quantity: 6 }],
      }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
    assert.equal(bd.PurchaseReturn.length, 0);
    assert.equal(bd.PurchaseReturnItem.length, 0);
    assert.equal(bd.product.find((p) => p.id === 'prod-1').current_stock, 50);
    assert.equal(bd.JournalEntry.length, 0);
  });

  test('400 si una linea no corresponde a ningun articulo', async () => {
    await assert.rejects(
      () => createPurchaseReturn(sb, em(T1), {
        purchase_id: 'p-t1',
        items: [{ product_name: 'No existe', quantity: 1 }],
      }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
    assert.equal(bd.PurchaseReturn.length, 0);
  });

  test('400 si la compra de origen no tiene articulos', async () => {
    await assert.rejects(
      () => createPurchaseReturn(sb, em(T1), { purchase_id: 'p-vacia' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
    assert.equal(bd.PurchaseReturn.length, 0);
  });

  test('400 si falta purchase_id', async () => {
    await assert.rejects(
      () => createPurchaseReturn(sb, em(T1), {}),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
  });

  test('404 si la compra es de otra empresa y no escribe nada', async () => {
    const res = await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t2',
      items: [{ purchase_item_id: 'pi-2', quantity: 1 }],
    });
    assert.equal(res.notFound, true);
    assert.equal(bd.PurchaseReturn.length, 0);
    assert.equal(bd.product.find((p) => p.id === 'prod-2').current_stock, 20);
  });

  test('no se puede devolver mas de lo que queda tras una devolucion previa', async () => {
    await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      items: [{ purchase_item_id: 'pi-1', quantity: 3 }],
    });
    // Quedan 2 disponibles de 5.
    await assert.rejects(
      () => createPurchaseReturn(sb, em(T1), {
        purchase_id: 'p-t1',
        items: [{ purchase_item_id: 'pi-1', quantity: 3 }],
      }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
    const res = await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      items: [{ purchase_item_id: 'pi-1', quantity: 2 }],
    });
    assert.equal(res.data.total, 230);
    assert.equal(bd.product.find((p) => p.id === 'prod-1').current_stock, 45);
  });

  test('dos lineas del cuerpo sobre el mismo articulo se suman antes de validar', async () => {
    await assert.rejects(
      () => createPurchaseReturn(sb, em(T1), {
        purchase_id: 'p-t1',
        items: [
          { purchase_item_id: 'pi-1', quantity: 3 },
          { purchase_item_id: 'pi-1', quantity: 3 },
        ],
      }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
    assert.equal(bd.PurchaseReturn.length, 0);
  });
});

describe('fetchPurchaseReturns', () => {
  test('lista las devoluciones de la empresa con items y proveedor', async () => {
    await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      items: [{ purchase_item_id: 'pi-1', quantity: 2 }],
    });
    const { data } = await fetchPurchaseReturns(sb, em(T1));
    assert.equal(data.length, 1);
    assert.equal(data[0].supplier_name, 'Proveedor T1');
    assert.equal(data[0].items.length, 1);
    assert.equal(data[0].items[0].quantity, 2);
  });

  test('otra empresa no ve las devoluciones', async () => {
    await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      items: [{ purchase_item_id: 'pi-1', quantity: 1 }],
    });
    const { data } = await fetchPurchaseReturns(sb, em(T2));
    assert.deepEqual(data, []);
  });
});

describe('fetchPurchaseReturn', () => {
  test('devuelve el detalle por id', async () => {
    await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      items: [{ purchase_item_id: 'pi-1', quantity: 2 }],
    });
    const id = bd.PurchaseReturn[0].id;
    const { data } = await fetchPurchaseReturn(sb, em(T1), id);
    assert.equal(data.id, id);
    assert.equal(data.items.length, 1);
    assert.equal(data.items[0].product_name, 'Cafe');
  });

  test('otra empresa recibe notFound, no los datos', async () => {
    await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      items: [{ purchase_item_id: 'pi-1', quantity: 1 }],
    });
    const id = bd.PurchaseReturn[0].id;
    const res = await fetchPurchaseReturn(sb, em(T2), id);
    assert.equal(res.notFound, true);
    assert.equal(res.data, null);
  });
});

describe('deletePurchaseReturn', () => {
  test('elimina, repone el stock y borra el asiento', async () => {
    await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      items: [{ purchase_item_id: 'pi-1', quantity: 2 }],
    });
    assert.equal(bd.product.find((p) => p.id === 'prod-1').current_stock, 48);
    const id = bd.PurchaseReturn[0].id;

    const res = await deletePurchaseReturn(sb, em(T1), id);
    assert.equal(res.error, null);
    assert.equal(bd.PurchaseReturn.length, 0);
    assert.equal(bd.PurchaseReturnItem.length, 0);
    assert.equal(bd.JournalEntry.length, 0);
    assert.equal(bd.JournalEntryLine.length, 0);
    assert.equal(bd.product.find((p) => p.id === 'prod-1').current_stock, 50);
  });

  test('notFound si la devolucion es de otra empresa y no borra nada', async () => {
    await createPurchaseReturn(sb, em(T1), {
      purchase_id: 'p-t1',
      items: [{ purchase_item_id: 'pi-1', quantity: 1 }],
    });
    const id = bd.PurchaseReturn[0].id;
    const res = await deletePurchaseReturn(sb, em(T2), id);
    assert.equal(res.notFound, true);
    assert.equal(bd.PurchaseReturn.length, 1);
  });
});
