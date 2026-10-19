import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchPurchases,
  createPurchase,
  aprobarCompra,
  updatePurchase,
  deletePurchase,
} from '@/lib/purchase-db';
import { ErrorDeEmpresa } from './tenant-resolver-mock.mjs';
import { crearSupabaseFalso } from './supabase-falso.mjs';

/**
 * Compras/Proveedores aisla por empresa, no por tenant. Estas pruebas atacan
 * justo el caso que rompe ese supuesto: **test 1 y test 2 comparten el tenant
 * `TEST1DS`**, asi que cualquier filtro por `tenant_id` devuelve lo de la
 * hermana. `Empresa 1` aporta el caso contrario (tenant propio `'1'`), que es
 * contra el que falla el `TENANT_ID = '1'` fijo que sustituyo este trabajo.
 */

const E1 = '73d5bbf7-8e47-470e-9430-da513e623ab7'; // Empresa 1, tenant '1'
const T1 = '8143dd4e-a4ef-470e-9430-da513e623ab7'; // test 1
const T2 = '971bec43-5c57-470e-9430-da513e623ab7'; // test 2
const TEN = 'TEST1DS'; // tenant compartido por T1 y T2

const em = (companyId, tenantId = TEN) => ({ tenantId, companyId });

let sb;
let bd;

function sembrar() {
  bd = {
    Purchase: [
      { id: 'p-e1', company_id: E1, tenant_id: '1', supplier_id: 's-e1', invoice_number: 'F-1', total: 100, invoice_date: '2026-01-10', status: 'PAID', amount_paid: 100, balance_due: 0, items: [] },
      { id: 'p-t1', company_id: T1, tenant_id: TEN, supplier_id: 's-t1', invoice_number: 'F-2', total: 200, invoice_date: '2026-01-11', status: 'PAID', amount_paid: 200, balance_due: 0, items: [] },
      { id: 'p-t2', company_id: T2, tenant_id: TEN, supplier_id: 's-t2', invoice_number: 'F-3', total: 300, invoice_date: '2026-01-12', status: 'PAID', amount_paid: 300, balance_due: 0, items: [] },
    ],
    PurchaseItem: [],
    Supplier: [
      { id: 's-e1', company_id: E1, tenant_id: '1', name: 'Proveedor E1', rtn: '0801-1' },
      { id: 's-t1', company_id: T1, tenant_id: TEN, name: 'Proveedor T1', rtn: '0801-2' },
      { id: 's-t2', company_id: T2, tenant_id: TEN, name: 'Proveedor T2', rtn: '0801-3' },
    ],
    product: [
      { id: 'prod-e1', company_id: E1, tenant_id: '1', name: 'Cafe', current_stock: 10 },
      { id: 'prod-t1', company_id: T1, tenant_id: TEN, name: 'Cafe', current_stock: 50 },
    ],
    supplier_price_history: [],
    SupplierPayment: [],
    // Catalogo de test 1. El asiento de compra es obligatorio (ver
    // `resolverCuentasDeCompra`, que resuelve por prefijo y por empresa): sin
    // banco (1101), gasto (6101) e ISV (1106) la aprobacion falla. `tenantId`
    // (camel) es el que usa `createJournalTransaction` para validar la cuenta.
    Account: [
      { id: 'acc-1101-t1', code: '1101', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'Banco' },
      { id: 'acc-1106-t1', code: '1106', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'ISV Credito Fiscal' },
      { id: 'acc-6101-t1', code: '6101', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'Compras' },
    ],
    Transaction: [],
    JournalEntry: [],
    JournalEntryLine: [],
  };
  sb = crearSupabaseFalso({ bd, seq: 0 });
}

beforeEach(sembrar);

describe('fetchPurchases', () => {
  test('test 1 no ve las compras de test 2 aunque compartan tenant', async () => {
    const { data } = await fetchPurchases(sb, em(T1), {});
    assert.deepEqual(data.map((p) => p.id), ['p-t1']);
  });

  test('test 2 tampoco ve las de test 1', async () => {
    const { data } = await fetchPurchases(sb, em(T2), {});
    assert.deepEqual(data.map((p) => p.id), ['p-t2']);
  });

  test('Empresa 1 no ve nada de TEST1DS', async () => {
    const { data } = await fetchPurchases(sb, em(E1, '1'), {});
    assert.deepEqual(data.map((p) => p.id), ['p-e1']);
  });

  test('la empresa sale de `empresa`, no del filtro heredado', async () => {
    // `PurchaseFilters.companyId` quedo obsoleto: ignorarlo es lo correcto,
    // porque si se honrase seria una via para elegir empresa desde el cliente.
    const { data } = await fetchPurchases(sb, em(T1), { companyId: E1 });
    assert.deepEqual(data.map((p) => p.id), ['p-t1']);
  });
});

describe('createPurchase', () => {
  const cuerpo = (extra = {}) => ({
    invoice_number: 'F-NUEVA',
    supplier_id: 's-t1',
    subtotal: 100,
    tax_amount: 15,
    total: 115,
    items: [{ product_name: 'Cafe', quantity: 2, unit_price: 50, total: 100 }],
    ...extra,
  });

  test('escribe tenant y company del servidor, no los del cuerpo', async () => {
    await createPurchase(sb, em(T1), cuerpo({
      company_id: E1,
      tenant_id: '1',
      companyId: E1,
    }));

    const creada = bd.Purchase.at(-1);
    assert.equal(creada.company_id, T1);
    assert.equal(creada.tenant_id, TEN);
  });

  test('rechaza un proveedor de otra empresa con 400', async () => {
    await assert.rejects(() => createPurchase(sb, em(T1), cuerpo({ supplier_id: 's-t2' })), (e) => {
      assert.ok(e instanceof ErrorDeEmpresa);
      assert.equal(e.estado, 400);
      return true;
    });
    // y no debe haber escrito nada
    assert.equal(bd.Purchase.length, 3);
  });

  test('rechaza un proveedor de Empresa 1 desde test 1', async () => {
    await assert.rejects(
      () => createPurchase(sb, em(T1), cuerpo({ supplier_id: 's-e1' })),
      (e) => e.estado === 400
    );
    assert.equal(bd.Purchase.length, 3);
  });

  test('suelta el product_id ajeno en vez de enlazar al producto de la hermana', async () => {
    // prod-e1 existe, pero es de Empresa 1: la linea se guarda igual, sin FK.
    await createPurchase(sb, em(T1), cuerpo({
      items: [{ product_id: 'prod-e1', product_name: 'Cafe', quantity: 1, unit_price: 50, total: 50 }],
    }));

    const item = bd.PurchaseItem.at(-1);
    assert.equal(item.company_id, T1);
    assert.equal(item.product_id, null);
  });

  test('conserva el product_id propio', async () => {
    await createPurchase(sb, em(T1), cuerpo({
      items: [{ product_id: 'prod-t1', product_name: 'Cafe', quantity: 1, unit_price: 50, total: 50 }],
    }));
    assert.equal(bd.PurchaseItem.at(-1).product_id, 'prod-t1');
  });

  test('crear no toca el stock; es aprobar el que lo sube al producto de la empresa', async () => {
    // Las dos empresas tienen un producto llamado "Cafe". Con el tenant como
    // filtro (el bug original: `.eq('tenant_id', companyId)`) no encontraba
    // ninguno y creaba una copia nueva en cada compra.
    const antesT1 = bd.product.find((p) => p.id === 'prod-t1').current_stock;
    const antesE1 = bd.product.find((p) => p.id === 'prod-e1').current_stock;

    const { data } = await createPurchase(sb, em(T1), cuerpo());
    // La compra nace PENDIENTE: no aplica efectos.
    assert.equal(bd.product.find((p) => p.id === 'prod-t1').current_stock, antesT1);

    await aprobarCompra(sb, em(T1), data.id);

    assert.equal(bd.product.find((p) => p.id === 'prod-t1').current_stock, antesT1 + 2);
    assert.equal(bd.product.find((p) => p.id === 'prod-e1').current_stock, antesE1);
  });

  test('no crea un producto duplicado si el de la empresa ya existe', async () => {
    const n = bd.product.length;
    const { data } = await createPurchase(sb, em(T1), cuerpo());
    await aprobarCompra(sb, em(T1), data.id);
    assert.equal(bd.product.length, n);
  });

  test('persiste unit y unit_factor de cada linea como numeros', async () => {
    await createPurchase(sb, em(T1), cuerpo({
      items: [{ product_id: 'prod-t1', quantity: 2, unit: 'Caja', unit_factor: 50, unit_price: 450, total: 900 }],
    }));
    const item = bd.PurchaseItem.at(-1);
    assert.equal(item.unit, 'Caja');
    assert.equal(item.unit_factor, 50);
    assert.equal(typeof item.unit_factor, 'number');
  });

  test('sin unit_factor la linea queda con factor 1 (no undefined)', async () => {
    await createPurchase(sb, em(T1), cuerpo({
      items: [{ product_id: 'prod-t1', quantity: 2, unit: 'Docena', unit_price: 50, total: 100 }],
    }));
    const item = bd.PurchaseItem.at(-1);
    assert.equal(item.unit_factor, 1);
    assert.notEqual(item.unit_factor, undefined);
  });

  test('sin unit la linea queda en NULL (no undefined)', async () => {
    await createPurchase(sb, em(T1), cuerpo({
      items: [{ product_id: 'prod-t1', quantity: 2, unit_price: 50, total: 100 }],
    }));
    const item = bd.PurchaseItem.at(-1);
    assert.ok('unit' in item);
    assert.equal(item.unit, null);
  });

  test('un unit_factor invalido (0) lanza y no guarda la linea', async () => {
    const antes = bd.PurchaseItem.length;
    await assert.rejects(() => createPurchase(sb, em(T1), cuerpo({
      items: [{ product_id: 'prod-t1', quantity: 2, unit_factor: 0, unit_price: 50, total: 100 }],
    })));
    assert.equal(bd.PurchaseItem.length, antes);
  });

  test("un unit_factor no numerico ('abc') lanza", async () => {
    await assert.rejects(() => createPurchase(sb, em(T1), cuerpo({
      items: [{ product_id: 'prod-t1', quantity: 2, unit_factor: 'abc', unit_price: 50, total: 100 }],
    })));
  });
});

describe('updatePurchase', () => {
  test('404 (noFound) al editar una compra de otra empresa del mismo tenant', async () => {
    const res = await updatePurchase(sb, em(T1), 'p-t2', { invoice_number: 'secuestrada' });

    assert.equal(res.notFound, true);
    assert.equal(res.data, null);
    // y la fila ajena intacta
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t2').invoice_number, 'F-3');
  });

  test('404 al editar una compra de Empresa 1', async () => {
    const res = await updatePurchase(sb, em(T1), 'p-e1', { invoice_number: 'x' });
    assert.equal(res.notFound, true);
    assert.equal(bd.Purchase.find((p) => p.id === 'p-e1').invoice_number, 'F-1');
  });

  test('rechaza con 400 si intenta repuntar su compra al proveedor de la hermana', async () => {
    const antes = bd.Purchase.find((p) => p.id === 'p-t1').supplier_id;

    await assert.rejects(
      () => updatePurchase(sb, em(T1), 'p-t1', { supplier_id: 's-t2' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 400
    );
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').supplier_id, antes);
  });

  test('rechaza con 400 si las items apuntan al proveedor de otra empresa', async () => {
    const antes = bd.PurchaseItem.length;
    await assert.rejects(
      () => updatePurchase(sb, em(T1), 'p-t1', {
        items: [{ supplier_id: 's-t2', product_name: 'x', quantity: 1, unit_price: 1, total: 1 }],
      }),
      (e) => e.estado === 400
    );
    assert.equal(bd.PurchaseItem.length, antes);
  });

  test('al reescribir lineas persiste unit y unit_factor', async () => {
    await updatePurchase(sb, em(T1), 'p-t1', {
      items: [{ product_id: 'prod-t1', quantity: 3, unit: 'Caja', unit_factor: 12, unit_price: 100, total: 300 }],
    });
    const item = bd.PurchaseItem.at(-1);
    assert.equal(item.unit, 'Caja');
    assert.equal(item.unit_factor, 12);
  });

  test('al reescribir sin unit_factor queda 1 y sin unit queda NULL', async () => {
    await updatePurchase(sb, em(T1), 'p-t1', {
      items: [{ product_id: 'prod-t1', quantity: 3, unit_price: 100, total: 300 }],
    });
    const item = bd.PurchaseItem.at(-1);
    assert.equal(item.unit_factor, 1);
    assert.equal(item.unit, null);
  });

  test('al reescribir con unit_factor invalido (-3) lanza', async () => {
    await assert.rejects(() => updatePurchase(sb, em(T1), 'p-t1', {
      items: [{ product_id: 'prod-t1', quantity: 3, unit_factor: -3, unit_price: 100, total: 300 }],
    }));
  });
});

describe('deletePurchase', () => {
  test('404 al borrar una compra de test 2 desde test 1', async () => {
    const res = await deletePurchase(sb, em(T1), 'p-t2');
    assert.equal(res.notFound, true);
    assert.equal(bd.Purchase.length, 3);
  });

  test('borra la suya', async () => {
    const res = await deletePurchase(sb, em(T1), 'p-t1');
    assert.notEqual(res.notFound, true);
    assert.equal(bd.Purchase.length, 2);
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1'), undefined);
  });
});