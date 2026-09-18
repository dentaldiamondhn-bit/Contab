import test from 'node:test';
import assert from 'node:assert/strict';

import { POST } from '../../app/api/accounting/transactions/route.ts';
import { mockState, resetJournalMock } from './journal-service-mock.mjs';

const req = (body, headers = {}) => {
  const r = {
    url: 'http://localhost/api/accounting/transactions',
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
  };
  r.json = async () => body;
  return r;
};
const tenant = { 'x-tenant-id': 'T1' };
const payload = {
  description: 'Asiento',
  date: '2026-09-17',
  currency: 'HNL',
  voucherType: 'DIARIO',
  entries: [
    { accountId: 'a1', amount: 100, isDebit: true },
    { accountId: 'a2', amount: 100, isDebit: false },
  ],
};

test('401 — sin tenant (header ni query)', async () => {
  resetJournalMock();
  const res = await POST(req(payload));
  const body = await res.json();
  assert.equal(res.status, 401);
  assert.match(body.error, /Tenant/);
  assert.deepEqual(mockState.calls, []);
});

test('400 — error de validación del servicio', async () => {
  resetJournalMock();
  mockState.error = new Error('La póliza no está balanceada: débito 100.00 vs crédito 50.00');
  const res = await POST(req(payload, tenant));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.error, /balanceada/);
  assert.equal(mockState.calls.length, 1);
  assert.equal(mockState.calls[0].tenantId, 'T1');
});

test('201 — crea póliza y devuelve transacción con líneas', async () => {
  resetJournalMock();
  mockState.result = {
    transaction: { id: 'tx1', voucherNumber: 7, totalAmount: 100 },
    entries: [
      { accountId: 'a1', amount: 100 },
      { accountId: 'a2', amount: -100 },
    ],
  };
  const res = await POST(req(payload, tenant));
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.transaction.voucherNumber, 7);
  assert.equal(body.transaction.entries.length, 2);
});

test('400 — período cerrado (candado mensual)', async () => {
  resetJournalMock();
  mockState.error = new Error('Período 2026-08 está cerrado: no se aceptan movimientos. Reábralo para registrar.');
  const res = await POST(req(payload, tenant));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.error, /cerrado/);
});

test('500 — error interno del servicio', async () => {
  resetJournalMock();
  mockState.error = new Error('connection reset');
  const res = await POST(req(payload, tenant));
  const body = await res.json();
  assert.equal(res.status, 500);
  assert.match(body.error, /connection reset/);
});
