import test from 'node:test';
import assert from 'node:assert/strict';

import {
  createJournalTransaction,
  getNextVoucherNumber,
  validateJournalInput,
} from '../../lib/services/journal-service.ts';
import { makeFakeDb } from './fake-supabase.mjs';

const line = (accountId, amount, isDebit) => ({ accountId, amount, isDebit });
const input = (entries) => ({
  description: 'Asiento de prueba',
  date: '2026-09-17',
  currency: 'HNL',
  voucherType: 'DIARIO',
  entries,
});

test('validación: descripción, mínimo 2 líneas y balance', () => {
  assert.throws(() => validateJournalInput({ ...input([]), description: '' }), /description/);
  assert.throws(
    () => validateJournalInput(input([line('a1', 100, true)])),
    /al menos 2 líneas/,
  );
  assert.throws(
    () => validateJournalInput(input([line('a1', 100, true), line('a2', 50, true)])),
    /balanceada/,
  );
  assert.throws(
    () => validateJournalInput(input([line('', 100, true), line('a2', 100, false)])),
    /accountId/,
  );
  const ok = validateJournalInput(input([line('a1', 100, true), line('a2', 100, false)]));
  assert.equal(ok.totalDebit, 100);
  assert.equal(ok.totalCredit, 100);
});

test('acepta montos con signo estilo notas (crédito negativo, sin isDebit)', () => {
  const ok = validateJournalInput(
    input([
      { accountId: 'a1', amount: 11500 },
      { accountId: 'a2', amount: -10000 },
      { accountId: 'a3', amount: -1500 },
    ]),
  );
  assert.equal(ok.totalDebit, 11500);
  assert.equal(ok.totalCredit, 11500);
});

test('consecutivo: max+1 por tenant y tipo; 1 si no hay', async () => {
  const { db } = makeFakeDb({
    transactions: [
      { id: 't1', tenantId: 'T1', voucherType: 'DIARIO', voucherNumber: 4 },
      { id: 't2', tenantId: 'T1', voucherType: 'INGRESO', voucherNumber: 9 },
    ],
  });
  assert.equal(await getNextVoucherNumber(db, 'T1', 'DIARIO'), 5);
  assert.equal(await getNextVoucherNumber(db, 'T1', 'EGRESO'), 1);
});

test('consecutivo cae a tenant_id cuando tenantId falla', async () => {
  const { db } = makeFakeDb({
    transactions: [{ id: 't1', tenant_id: 'T1', voucherType: 'DIARIO', voucherNumber: 2 }],
    failCols: ['Transaction.tenantId'],
  });
  assert.equal(await getNextVoucherNumber(db, 'T1', 'DIARIO'), 3);
});

test('crear póliza: valida tenant, cuentas, inserta con signos y tipos', async () => {
  const { db, calls, store } = makeFakeDb({
    accounts: [
      { id: 'a1', tenantId: 'T1' },
      { id: 'a2', tenantId: 'T1' },
    ],
  });

  await assert.rejects(createJournalTransaction(db, '', input([])), /Tenant/);
  await assert.rejects(
    createJournalTransaction(db, 'T1', input([line('a1', 100, true), line('a9', 100, false)])),
    /Cuentas no existen.*a9/,
  );

  const res = await createJournalTransaction(
    db,
    'T1',
    input([line('a1', 100, true), line('a2', 100, false)]),
    { performedBy: 'audit@test.com' },
  );
  assert.equal(res.transaction.tenantId, 'T1');
  assert.equal(res.transaction.voucherType, 'DIARIO');
  assert.equal(res.transaction.voucherNumber, 1);
  assert.equal(res.transaction.totalAmount, 10000);
  assert.equal(store.Transaction.length, 1);
  assert.equal(store.JournalEntry.length, 2);
  assert.equal((store.account_audit_log || []).length, 2);
  const audit = store.account_audit_log[0];
  assert.equal(audit.tenant_id, 'T1');
  assert.equal(audit.action, 'JOURNAL_CREATE');
  assert.equal(audit.performed_by, 'audit@test.com');

  const [débito, crédito] = store.JournalEntry;
  assert.equal(débito.amount, 10000);
  assert.equal(débito.type, 'DEBIT');
  assert.equal(débito.transactionId, res.transaction.id);
  assert.equal(crédito.amount, -10000);
  assert.equal(crédito.type, 'CREDIT');

  const txInsert = calls.insert.find((c) => c.table === 'Transaction');
  assert.equal(txInsert.rows.tenantId, 'T1');
});

test('candado de período: rechaza mes cerrado/bloqueado, permite abierto o sin fila', async () => {
  const base = {
    accounts: [
      { id: 'a1', tenantId: 'T1' },
      { id: 'a2', tenantId: 'T1' },
    ],
  };
  const two = () => [
    { accountId: 'a1', amount: 10, isDebit: true },
    { accountId: 'a2', amount: 10, isDebit: false },
  ];

  const closed = makeFakeDb({
    ...base,
    tables: { period_locks: [{ tenant_id: 'T1', year: 2026, month: 8, status: 'closed' }] },
  });
  await assert.rejects(
    createJournalTransaction(closed.db, 'T1', { ...input(two()), date: '2026-08-15' }),
    /2026-08.*cerrado/,
  );
  assert.equal(closed.store.Transaction.length, 0);

  const locked = makeFakeDb({
    ...base,
    tables: { period_locks: [{ tenant_id: 'T1', year: 2026, month: 8, status: 'locked' }] },
  });
  await assert.rejects(
    createJournalTransaction(locked.db, 'T1', { ...input(two()), date: '2026-08-15' }),
    /bloqueado/,
  );

  const open = makeFakeDb({
    ...base,
    tables: { period_locks: [{ tenant_id: 'T1', year: 2026, month: 9, status: 'open' }] },
  });
  const resOpen = await createJournalTransaction(open.db, 'T1', { ...input(two()), date: '2026-09-05' });
  assert.equal(resOpen.transaction.voucherNumber, 1);

  const none = makeFakeDb(base);
  const resNone = await createJournalTransaction(none.db, 'T1', { ...input(two()), date: '2026-09-05' });
  assert.equal(resNone.transaction.voucherNumber, 1);
});

test('candado usa el mes del texto ISO (borde día 1, sin desfase horario)', async () => {
  const { db } = makeFakeDb({
    accounts: [{ id: 'a1', tenantId: 'T1' }],
    tables: { period_locks: [{ tenant_id: 'T1', year: 2026, month: 8, status: 'closed' }] },
  });
  const { assertPeriodOpen } = await import('../../lib/services/period-lock.ts');
  await assert.rejects(assertPeriodOpen(db, 'T1', '2026-08-01'), /2026-08.*cerrado/);
  await assert.rejects(assertPeriodOpen(db, 'T1', '2026-08-01T00:00:00.000Z'), /2026-08.*cerrado/);
});

test('fecha inválida se rechaza', async () => {
  const { db } = makeFakeDb({
    accounts: [
      { id: 'a1', tenantId: 'T1' },
      { id: 'a2', tenantId: 'T1' },
    ],
  });
  await assert.rejects(
    createJournalTransaction(
      db,
      'T1',
      { ...input([line('a1', 5, true), line('a2', 5, false)]), date: 'no-fecha' },
    ),
    /date inválida/,
  );
});

test('validación: monto mayor a cero en todas las líneas', () => {
  const ok = validateJournalInput(input([line('a1', 1, true), line('a2', -1, false)]));
  assert.equal(ok.totalDebit, 1);
  assert.equal(ok.totalCredit, 1);
});

test('validación: líneas con mismo accountId rechazadas', () => {
  assert.throws(
    () => validateJournalInput(input([line('a1', 100, true), line('a1', 50, false)])),
    /Cuentas repetidas/,
  );
});

test('consecutivo: números negativos rechazados', async () => {
  const { db } = makeFakeDb({
    transactions: [{ id: 't1', tenantId: 'T1', voucherType: 'DIARIO', voucherNumber: -1 }],
  });
  assert.equal(await getNextVoucherNumber(db, 'T1', 'DIARIO'), 1);
});

test('consecutivo: número cero aceptado como primer ingreso', async () => {
  const { db } = makeFakeDb({
    transactions: [{ id: 't1', tenantId: 'T1', voucherType: 'INGRESO', voucherNumber: 0 }],
  });
  assert.equal(await getNextVoucherNumber(db, 'T1', 'INGRESO'), 1);
});

test('createJournalInput: validación de tipos de cuenta', () => {
  const result = validateJournalInput(input([{ accountId: 'invalid', amount: 100, isDebit: true }]));
  assert.equal(result.error?.includes('Cuentas no existen'), true);
});

test('createJournalTransaction: validación de balance global', async () => {
  const { db } = makeFakeDb({
    accounts: [
      { id: 'a1', tenantId: 'T1' },
    ],
  });
  await assert.rejects(
    createJournalTransaction(db, 'T1', input([line('a1', 100, true)])),
    /balanceada/,
  );
});

test('createJournalTransaction: auditoría con performedBy personalizable', async () => {
  const { db, store } = makeFakeDb({
    accounts: [
      { id: 'a1', tenantId: 'T1' },
      { id: 'a2', tenantId: 'T1' },
    ],
  });
  const res = await createJournalTransaction(
    db,
    'T1',
    input([line('a1', 200, true), line('a2', 200, false)]),
    { performedBy: 'test_user' },
  );
  const audit = store.account_audit_log[0];
  assert.equal(audit.performed_by, 'test_user');
});

test('candado: período sin configurar permite cualquier fecha', async () => {
  const { db } = makeFakeDb({
    accounts: [
      { id: 'a1', tenantId: 'T1' },
    ],
  });
  const res = await createJournalTransaction(db, 'T1', input([line('a1', 10, true), line('a2', 10, false)]), {
    date: '2026-09-15',
  });
  assert.equal(res.transaction.voucherNumber, 1);
});

test('fecha futura rechazada', async () => {
  const { db } = makeFakeDb({
    accounts: [
      { id: 'a1', tenantId: 'T1' },
      { id: 'a2', tenantId: 'T1' },
    ],
  });
  await assert.rejects(
    createJournalTransaction(db, 'T1', input([line('a1', 10, true), line('a2', 10, false)]), {
      date: '2027-01-01',
    }),
    /fecha/,
  );
});
