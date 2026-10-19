import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  POST as POST_PAGO,
  PUT as PUT_PAGO,
  DELETE as DELETE_PAGO,
} from '../../app/api/purchases/payments/route.ts';
import { crearSupabaseFalso } from './supabase-falso.mjs';
import { ponerSupabase } from './supabase-server-mock.mjs';

/**
 * El pago a proveedor debe generar su asiento contable (debe Cuentas por Pagar
 * / haber Banco). Es OBLIGATORIO (fail-closed): sin la cuenta, el pago no queda
 * registrado. En PUT se rehace el asiento y se borra el viejo; en DELETE se
 * borra. La empresa sale del contexto validado, nunca del cuerpo.
 */

const T1 = '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'; // test 1
const T2 = '971bec43-5c57-44a3-92b0-db7f909c5276'; // test 2
const TEN = 'TEST1DS'; // tenant compartido por T1 y T2

let sb;
let bd;

function sembrar() {
  bd = {
    Purchase: [
      { id: 'p-t1', company_id: T1, tenant_id: TEN, supplier_id: 's-t1', invoice_number: 'F-1', total: 115, is_credit: true, amount_paid: 0, balance_due: 115, status: 'PENDING', purchase_type: 'expense', approval_status: 'APPROVED' },
      { id: 'p-t2', company_id: T2, tenant_id: TEN, supplier_id: 's-t2', invoice_number: 'F-2', total: 50, is_credit: true, amount_paid: 0, balance_due: 50, status: 'PENDING', purchase_type: 'expense', approval_status: 'APPROVED' },
    ],
    PurchaseItem: [],
    Supplier: [
      { id: 's-t1', company_id: T1, tenant_id: TEN, name: 'Prov T1' },
      { id: 's-t2', company_id: T2, tenant_id: TEN, name: 'Prov T2' },
    ],
    SupplierPayment: [],
    // Catalogos por empresa. `tenantId` (camel) es el que lee
    // `createJournalTransaction` para validar que la cuenta existe.
    Account: [
      { id: 'acc-1101-t1', code: '1101', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'Banco' },
      { id: 'acc-2101-t1', code: '2101', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'Cuentas por Pagar' },
      { id: 'acc-1101-t2', code: '1101', company_id: T2, tenantId: TEN, tenant_id: TEN, name: 'Banco' },
      { id: 'acc-2101-t2', code: '2101', company_id: T2, tenantId: TEN, tenant_id: TEN, name: 'Cuentas por Pagar' },
    ],
    Transaction: [],
    JournalEntry: [],
    JournalEntryLine: [],
  };
  sb = crearSupabaseFalso({ bd, seq: 0 });
  ponerSupabase(sb);
}

beforeEach(sembrar);

const req = (body, { companyId, tenantId = TEN, url = 'http://localhost/api/purchases/payments', search } = {}) => {
  const headers = new Map();
  if (companyId) headers.set('x-company-id', companyId);
  if (tenantId) headers.set('x-tenant-id', tenantId);
  const u = search ? `${url}?${search}` : url;
  const r = {
    url: u,
    headers: { get: (n) => headers.get(String(n).toLowerCase()) ?? null },
  };
  if (body !== undefined) r.json = async () => body;
  return r;
};

describe('pago a proveedor: asiento contable obligatorio', () => {
  test('POST crea el pago y su asiento (debe CxP / haber Banco) y lo enlaza', async () => {
    const res = await POST_PAGO(
      req(
        { purchase_id: 'p-t1', amount: 115, payment_method: 'transferencia', reference: 'TRF-1', payment_date: '2026-10-01' },
        { companyId: T1 }
      )
    );
    const json = await res.json();

    assert.equal(res.status, 201);
    assert.ok(json.payment.journal_entry_id, 'el pago debe traer el id del asiento');

    // Cabecera del asiento (una sola Transaction, de la empresa).
    assert.equal(bd.Transaction.length, 1);
    const tx = bd.Transaction[0];
    assert.equal(tx.company_id, T1);
    assert.equal(tx.voucherType, 'EGRESO');
    assert.equal(Number(tx.totalAmount), 11500); // centavos
    assert.equal(json.payment.journal_entry_id, tx.id);

    // Líneas: debe CxP 115, haber Banco 115.
    assert.equal(bd.JournalEntry.length, 2);
    const debe = bd.JournalEntry.filter((l) => l.type === 'DEBIT');
    const haber = bd.JournalEntry.filter((l) => l.type === 'CREDIT');
    assert.equal(debe.length, 1);
    assert.equal(debe[0].accountId, 'acc-2101-t1');
    assert.equal(debe[0].amount, 11500);
    assert.equal(haber.length, 1);
    assert.equal(haber[0].accountId, 'acc-1101-t1');
    assert.equal(haber[0].amount, -11500);
    assert.ok(bd.JournalEntry.every((l) => l.transactionId === tx.id));
    assert.ok(bd.JournalEntry.every((l) => l.company_id === T1));

    // El saldo de la compra se recalcula desde el pago.
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').amount_paid, 115);
  });

  test('POST fail-closed: sin la cuenta de CxP no guarda el pago ni el asiento', async () => {
    bd.Account = bd.Account.filter((a) => a.code !== '2101');

    const res = await POST_PAGO(
      req({ purchase_id: 'p-t1', amount: 115, payment_method: 'transferencia' }, { companyId: T1 })
    );

    assert.equal(res.status, 409);
    assert.equal(bd.SupplierPayment.length, 0);
    assert.equal(bd.Transaction.length, 0);
    assert.equal(bd.JournalEntry.length, 0);
  });

  test('POST 404 si la compra es de otra empresa del mismo tenant', async () => {
    const res = await POST_PAGO(
      req({ purchase_id: 'p-t2', amount: 50, payment_method: 'efectivo' }, { companyId: T1 })
    );
    assert.equal(res.status, 404);
    assert.equal(bd.SupplierPayment.length, 0);
  });

  test('PUT rehace el asiento (nuevo) y borra el viejo', async () => {
    bd.SupplierPayment.push({
      id: 'pay-t1',
      company_id: T1,
      tenant_id: TEN,
      purchase_id: 'p-t1',
      supplier_id: 's-t1',
      amount: 100,
      payment_method: 'transferencia',
      payment_date: '2026-10-01',
      reference_number: 'TRF-1',
      journal_entry_id: 'tx-viejo',
    });
    bd.Transaction.push({
      id: 'tx-viejo',
      company_id: T1,
      tenantId: TEN,
      voucherType: 'EGRESO',
      totalAmount: 10000,
    });
    bd.JournalEntry.push(
      { id: 'je-v1', transactionId: 'tx-viejo', accountId: 'acc-2101-t1', type: 'DEBIT', amount: 10000, company_id: T1 },
      { id: 'je-v2', transactionId: 'tx-viejo', accountId: 'acc-1101-t1', type: 'CREDIT', amount: -10000, company_id: T1 }
    );

    const res = await PUT_PAGO(
      req({ amount: 115 }, { companyId: T1, search: 'id=pay-t1' })
    );
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.ok(json.journal_entry_id);
    assert.notEqual(json.journal_entry_id, 'tx-viejo');

    // El asiento viejo se borró; queda exactamente el nuevo.
    assert.ok(!bd.Transaction.some((t) => t.id === 'tx-viejo'));
    assert.equal(bd.Transaction.length, 1);
    assert.equal(bd.JournalEntry.length, 2);
    const tx = bd.Transaction[0];
    assert.equal(Number(tx.totalAmount), 11500);
    assert.ok(bd.JournalEntry.every((l) => l.transactionId === tx.id));
    assert.equal(bd.SupplierPayment.find((p) => p.id === 'pay-t1').journal_entry_id, tx.id);
    assert.equal(bd.SupplierPayment.find((p) => p.id === 'pay-t1').amount, 115);
  });

  test('PUT fail-closed: si falta la cuenta, el pago y su asiento quedan intactos', async () => {
    bd.SupplierPayment.push({
      id: 'pay-t1',
      company_id: T1,
      tenant_id: TEN,
      purchase_id: 'p-t1',
      supplier_id: 's-t1',
      amount: 115,
      payment_date: '2026-10-01',
      payment_method: 'transferencia',
      journal_entry_id: 'tx-viejo',
    });
    bd.Transaction.push({ id: 'tx-viejo', company_id: T1, tenant_id: TEN, voucherType: 'EGRESO', totalAmount: 11500 });
    bd.JournalEntry.push(
      { id: 'je-1', transactionId: 'tx-viejo', accountId: 'acc-2101-t1', amount: 11500, type: 'DEBIT', company_id: T1 },
      { id: 'je-2', transactionId: 'tx-viejo', accountId: 'acc-1101-t1', amount: -11500, type: 'CREDIT', company_id: T1 }
    );
    bd.Account = bd.Account.filter((a) => a.code !== '2101');

    const res = await PUT_PAGO(
      req({ amount: 200 }, { companyId: T1, search: 'id=pay-t1' })
    );

    assert.equal(res.status, 409);
    const pago = bd.SupplierPayment.find((p) => p.id === 'pay-t1');
    assert.equal(pago.amount, 115); // sin cambios
    assert.equal(pago.journal_entry_id, 'tx-viejo');
    assert.equal(bd.Transaction.length, 1);
    assert.equal(bd.Transaction[0].id, 'tx-viejo');
    assert.equal(bd.JournalEntry.length, 2);
  });

  test('DELETE borra el pago y su asiento', async () => {
    bd.SupplierPayment.push({
      id: 'pay-t1',
      company_id: T1,
      tenant_id: TEN,
      purchase_id: 'p-t1',
      supplier_id: 's-t1',
      amount: 115,
      payment_method: 'transferencia',
      journal_entry_id: 'tx-1',
    });
    bd.Transaction.push({ id: 'tx-1', company_id: T1, tenant_id: TEN, voucherType: 'EGRESO', totalAmount: 11500 });
    bd.JournalEntry.push(
      { id: 'je-1', transactionId: 'tx-1', accountId: 'acc-2101-t1', type: 'DEBIT', amount: 11500 },
      { id: 'je-2', transactionId: 'tx-1', accountId: 'acc-1101-t1', type: 'CREDIT', amount: -11500 },
    );

    const res = await DELETE_PAGO(req(undefined, { companyId: T1, search: 'id=pay-t1' }));
    const json = await res.json();

    assert.equal(res.status, 200);
    assert.equal(json.success, true);
    assert.equal(bd.SupplierPayment.length, 0);
    assert.equal(bd.Transaction.length, 0);
    assert.equal(bd.JournalEntry.length, 0);
  });

  test('DELETE 404 si el pago es de otra empresa', async () => {
    bd.SupplierPayment.push({
      id: 'pay-t2', company_id: T2, tenant_id: TEN, purchase_id: 'p-t2', supplier_id: 's-t2', amount: 50,
    });

    const res = await DELETE_PAGO(req(undefined, { companyId: T1, search: 'id=pay-t2' }));

    assert.equal(res.status, 404);
    assert.equal(bd.SupplierPayment.length, 1);
  });
});
