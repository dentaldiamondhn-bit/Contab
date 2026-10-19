import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  GET as GET_CONC,
  POST as POST_CONC,
  DELETE as DELETE_CONC,
} from '../../app/api/purchases/payments/reconciliation/route.ts';
import { crearSupabaseFalso } from './supabase-falso.mjs';
import { ponerSupabase } from './supabase-server-mock.mjs';

/**
 * Conciliacion bancaria de pagos: marcar/desmarcar un `SupplierPayment` contra
 * una cuenta de `bankaccount`. Todo aislado por `company_id` (TEST1DS tiene dos
 * empresas). La empresa sale del contexto validado, nunca del cuerpo.
 */

const T1 = '8143dd4e-a4ef-4619-87a2-0504d0c8c46a';
const T2 = '971bec43-a4ef-4619-87a2-0504d0c8c46a';
const TEN = 'TEST1DS';

let bd;

function sembrar() {
  bd = {
    SupplierPayment: [
      {
        id: 'pay-t1-a', company_id: T1, tenant_id: TEN, purchase_id: 'p-t1', supplier_id: 's-t1',
        amount: 100, payment_date: '2026-10-01', payment_method: 'transfer', reference_number: 'TRF-1',
        journal_entry_id: 'tx-a', is_reconciled: false, reconciled_at: null, bank_account_id: null, reconciliation_reference: null,
      },
      {
        id: 'pay-t1-b', company_id: T1, tenant_id: TEN, purchase_id: 'p-t1', supplier_id: 's-t1',
        amount: 250, payment_date: '2026-10-03', payment_method: 'check', reference_number: 'CHK-9',
        journal_entry_id: 'tx-b', is_reconciled: true, reconciled_at: '2026-10-05T00:00:00.000Z',
        bank_account_id: 'bk-t1', reconciliation_reference: 'L24',
      },
      {
        id: 'pay-t2', company_id: T2, tenant_id: TEN, purchase_id: 'p-t2', supplier_id: 's-t2',
        amount: 999, payment_date: '2026-10-02', payment_method: 'cash', reference_number: null,
        journal_entry_id: 'tx-c', is_reconciled: false, reconciled_at: null, bank_account_id: null, reconciliation_reference: null,
      },
    ],
    Supplier: [
      { id: 's-t1', company_id: T1, tenant_id: TEN, name: 'Prov T1' },
      { id: 's-t2', company_id: T2, tenant_id: TEN, name: 'Prov T2' },
    ],
    Purchase: [
      { id: 'p-t1', company_id: T1, invoice_number: 'FAC-001' },
      { id: 'p-t2', company_id: T2, invoice_number: 'FAC-002' },
    ],
    bankaccount: [
      { id: 'bk-t1', company_id: T1, tenant_id: TEN, bank_name: 'BAC', account_number: '111', account_type: 'checking', currency: 'HNL', is_active: true },
      { id: 'bk-t2', company_id: T2, tenant_id: TEN, bank_name: 'Ficohsa', account_number: '222', account_type: 'checking', currency: 'HNL', is_active: true },
    ],
  };
  ponerSupabase(crearSupabaseFalso({ bd, seq: 0 }));
}

beforeEach(sembrar);

const req = (body, { companyId, tenantId = TEN, search } = {}) => {
  const headers = new Map();
  if (companyId) headers.set('x-company-id', companyId);
  if (tenantId) headers.set('x-tenant-id', tenantId);
  const base = 'http://localhost/api/purchases/payments/reconciliation';
  const u = search ? `${base}?${search}` : base;
  return {
    url: u,
    headers: { get: (n) => headers.get(n) ?? null },
    json: async () => body,
  };
};

describe('conciliación bancaria de pagos', () => {
  test('GET aísla por empresa y resuelve proveedor y factura', async () => {
    const res = await GET_CONC(req(undefined, { companyId: T1 }));
    assert.equal(res.status, 200);
    const data = await res.json();

    assert.equal(data.pagos.length, 2);
    assert.ok(data.pagos.every((p) => p.id !== 'pay-t2'), 'no filtra un pago de la empresa hermana');

    const a = data.pagos.find((p) => p.id === 'pay-t1-a');
    assert.equal(a.supplier_name, 'Prov T1');
    assert.equal(a.invoice_number, 'FAC-001');
  });

  test('GET 400 sin contexto de empresa (fail-closed)', async () => {
    const res = await GET_CONC(req(undefined, {}));
    assert.equal(res.status, 400);
  });

  test('GET resumen y cuentas bancarias solo de la empresa', async () => {
    const data = await (await GET_CONC(req(undefined, { companyId: T1 }))).json();
    assert.equal(data.resumen.totalPagos, 2);
    assert.equal(data.resumen.conciliados, 1);
    assert.equal(data.resumen.pendientes, 1);
    assert.equal(data.resumen.montoTotal, 350);
    assert.equal(data.resumen.montoConciliado, 250);
    assert.equal(data.resumen.montoPendiente, 100);
    assert.deepEqual(data.cuentas.map((c) => c.id), ['bk-t1']);
  });

  test('GET status=pending filtra la lista pero no el resumen', async () => {
    const data = await (await GET_CONC(req(undefined, { companyId: T1, search: 'status=pending' }))).json();
    assert.deepEqual(data.pagos.map((p) => p.id), ['pay-t1-a']);
    assert.equal(data.resumen.totalPagos, 2);
    assert.equal(data.resumen.pendientes, 1);
  });

  test('GET filtra por cuenta bancaria', async () => {
    const data = await (await GET_CONC(req(undefined, { companyId: T1, search: 'bankAccountId=bk-t1' }))).json();
    assert.deepEqual(data.pagos.map((p) => p.id), ['pay-t1-b']);
  });

  test('POST marca un pago como conciliado contra su cuenta bancaria', async () => {
    const res = await POST_CONC(
      req({ paymentIds: ['pay-t1-a'], bankAccountId: 'bk-t1', reference: 'L24' }, { companyId: T1 })
    );
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.actualizados, 1);
    assert.equal(data.resumen.conciliados, 2);

    const row = bd.SupplierPayment.find((p) => p.id === 'pay-t1-a');
    assert.equal(row.is_reconciled, true);
    assert.equal(row.bank_account_id, 'bk-t1');
    assert.equal(row.reconciliation_reference, 'L24');
    assert.ok(row.reconciled_at, 'reconciled_at debe quedar con fecha');
  });

  test('POST 400 si falta la cuenta bancaria', async () => {
    const res = await POST_CONC(req({ paymentIds: ['pay-t1-a'] }, { companyId: T1 }));
    assert.equal(res.status, 400);
    assert.equal(bd.SupplierPayment.find((p) => p.id === 'pay-t1-a').is_reconciled, false);
  });

  test('POST 400 sin pagos seleccionados', async () => {
    const res = await POST_CONC(req({ paymentIds: [], bankAccountId: 'bk-t1' }, { companyId: T1 }));
    assert.equal(res.status, 400);
  });

  test('POST 404 si la cuenta bancaria es de otra empresa', async () => {
    const res = await POST_CONC(
      req({ paymentIds: ['pay-t1-a'], bankAccountId: 'bk-t2' }, { companyId: T1 })
    );
    assert.equal(res.status, 404);
    assert.equal(bd.SupplierPayment.find((p) => p.id === 'pay-t1-a').is_reconciled, false);
  });

  test('POST 404 si un pago es de otra empresa, y no toca ninguno', async () => {
    const res = await POST_CONC(
      req({ paymentIds: ['pay-t1-a', 'pay-t2'], bankAccountId: 'bk-t1' }, { companyId: T1 })
    );
    assert.equal(res.status, 404);
    assert.equal(bd.SupplierPayment.find((p) => p.id === 'pay-t1-a').is_reconciled, false);
    assert.equal(bd.SupplierPayment.find((p) => p.id === 'pay-t2').is_reconciled, false);
  });

  test('DELETE quita la conciliación (limpia banco, fecha y referencia)', async () => {
    const res = await DELETE_CONC(
      req({ paymentIds: ['pay-t1-b'] }, { companyId: T1 })
    );
    const data = await res.json();

    assert.equal(res.status, 200);
    assert.equal(data.actualizados, 1);
    const row = bd.SupplierPayment.find((p) => p.id === 'pay-t1-b');
    assert.equal(row.is_reconciled, false);
    assert.equal(row.bank_account_id, null);
    assert.equal(row.reconciled_at, null);
    assert.equal(row.reconciliation_reference, null);
  });

  test('DELETE 400 sin ids', async () => {
    const res = await DELETE_CONC(req(undefined, { companyId: T1 }));
    assert.equal(res.status, 400);
  });

  test('DELETE 404 si el pago es de otra empresa', async () => {
    const res = await DELETE_CONC(req({ paymentIds: ['pay-t2'] }, { companyId: T1 }));
    assert.equal(res.status, 404);
    assert.equal(bd.SupplierPayment.find((p) => p.id === 'pay-t2').is_reconciled, false);
  });
});
