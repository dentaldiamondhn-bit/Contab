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

test('201 — crea póliza con líneas balanceadas y tipos de movimiento correctos', async () => {
  resetJournalMock();
  mockState.result = {
    transaction: { id: 'tx2', voucherNumber: 8, totalAmount: 250 },
    entries: [
      { accountId: 'a1', amount: 250 },
      { accountId: 'a2', amount: -250 },
    ],
  };
  const res = await POST(req(payload, tenant));
  const body = await res.json();
  assert.equal(res.status, 201);
  assert.equal(body.success, true);
  assert.equal(body.transaction.voucherNumber, 8);
  assert.equal(body.transaction.totalAmount, 250);
  assert.equal(body.transaction.entries.length, 2);
  assert.equal(body.transaction.entries[0].amount, 250);
  assert.equal(body.transaction.entries[0].type, 'DEBIT');
  assert.equal(body.transaction.entries[1].type, 'CREDIT');
});

test('400 — validación: descripción vacía', async () => {
  resetJournalMock();
  const payloadBad = { ...payload, description: '' };
  const res = await POST(req(payloadBad, tenant));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.error, /descripción/);
});

test('400 — validación: mínimo 2 líneas requeridas', async () => {
  resetJournalMock();
  const payloadOneLine = {
    ...payload,
    entries: [{ accountId: 'a1', amount: 100, isDebit: true }],
  };
  const res = await POST(req(payloadOneLine, tenant));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.error, /mínimo 2 líneas/);
});

test('400 — validación: líneas desbalanceadas', async () => {
  resetJournalMock();
  const payloadUnbalanced = {
    ...payload,
    entries: [
      { accountId: 'a1', amount: 100, isDebit: true },
      { accountId: 'a2', amount: 50, isDebit: false },
    ],
  };
  const res = await POST(req(payloadUnbalanced, tenant));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.error, /balanceada/);
});

test('400 — validación: cuenta no existe', async () => {
  resetJournalMock();
  const payloadInvalidAccount = {
    ...payload,
    entries: [{ accountId: 'nonexistent', amount: 100, isDebit: true }, ...payload.entries],
  };
  const res = await POST(req(payloadInvalidAccount, tenant));
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.match(body.error, /Cuentas no existen/);
});

test('500 — error de auditoría guardado', async () => {
  resetJournalMock();
  mockState.auditError = new Error('No se pudo guardar el log de auditoría');
  const res = await POST(req(payload, tenant));
  const body = await res.json();
  assert.equal(res.status, 500);
  assert.match(body.error, /auditoría/);
});
