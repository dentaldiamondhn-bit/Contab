import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregateClosing,
  applyOpeningBalances,
  computeOpeningBalances,
  validateYear,
} from '../../lib/services/opening-balance.ts';
import { makeFakeDb } from './fake-supabase.mjs';

const tx = (id, date, entries) => ({ id, tenantId: 'T1', date, JournalEntry: entries });
const je = (accountId, code, name, debit, credit) => ({
  accountId,
  type: debit > 0 ? 'DEBIT' : 'CREDIT',
  amount: debit > 0 ? debit : -credit,
  Account: { id: accountId, code, name },
});

test('validateYear acepta 2001-2100', () => {
  assert.doesNotThrow(() => validateYear(2026));
  assert.throws(() => validateYear(2000), /2001 y 2100/);
  assert.throws(() => validateYear(2026.5), /entero/);
});

test('aggregateClosing suma por cuenta y convierte a centavos', () => {
  const lines = aggregateClosing([
    { accountId: 'a1', code: '1101', name: 'Caja', debit: 100.1, credit: 0 },
    { accountId: 'a1', code: '1101', name: 'Caja', debit: 0, credit: 20 },
    { accountId: 'a2', code: '2101', name: 'Prov', debit: 0, credit: 50 },
  ]);
  assert.equal(lines.length, 2);
  assert.equal(lines[0].code, '1101');
  assert.equal(lines[0].net, 80.1);
  assert.equal(lines[0].openingCents, 8010);
  assert.equal(lines[1].openingCents, -5000);
});

test('computeOpeningBalances usa tenantId y cae a tenant_id', async () => {
  const entries = [je('a1', '1101', 'Caja', 500, 0), je('a2', '4101', 'Ventas', 0, 500)];
  const { db } = makeFakeDb({
    transactions: [tx('t1', '2025-06-10', entries), tx('t2', '2026-02-01', entries)],
  });
  const prev = await computeOpeningBalances(db, 'T1', 2026);
  assert.equal(prev.year, 2026);
  assert.equal(prev.asOf, '2026-01-01');
  assert.equal(prev.nonZeroCount, 2);
  assert.equal(prev.balanced, true);
  assert.equal(prev.lines.find((l) => l.code === '1101').openingCents, 50000);

  const legacy = makeFakeDb({
    transactions: [{ id: 't1', tenant_id: 'T1', date: '2025-03-01', JournalEntry: entries }],
  });
  const prevLegacy = await computeOpeningBalances(legacy.db, 'T1', 2026);
  assert.equal(prevLegacy.nonZeroCount, 2);
});

test('computeOpeningBalances vacío y año inválido', async () => {
  const { db } = makeFakeDb({});
  const prev = await computeOpeningBalances(db, 'T1', 2026);
  assert.equal(prev.nonZeroCount, 0);
  assert.equal(prev.balanced, true);
  await assert.rejects(computeOpeningBalances(db, 'T1', 1999), /2001/);
  await assert.rejects(computeOpeningBalances(db, '', 2026), /Tenant/);
});

test('apply: sin movimientos lanza; enero cerrado bloquea', async () => {
  const empty = makeFakeDb({});
  await assert.rejects(applyOpeningBalances(empty.db, 'T1', 2026), /Sin movimientos/);

  const locked = makeFakeDb({
    transactions: [tx('t1', '2025-06-10', [je('a1', '1101', 'Caja', 500, 0)])],
    tables: { period_locks: [{ tenant_id: 'T1', year: 2026, month: 1, status: 'closed' }] },
  });
  await assert.rejects(applyOpeningBalances(locked.db, 'T1', 2026), /cerrado/);
  assert.equal(locked.store.chart_of_accounts, undefined);
});

test('apply: casa por código, omite cero/sin catálogo/existente, audita', async () => {
  const entries = [
    je('a1', '1101', 'Caja', 500, 0),
    je('a2', '4101', 'Ventas', 0, 500),
    je('a9', '9999', 'Fantasma', 10, 0),
  ];
  const { db, store } = makeFakeDb({
    transactions: [tx('t1', '2025-06-10', entries)],
    tables: {
      chart_of_accounts: [
        { id: 'c1', code: '1101', tenant_id: 'T1', opening_balance: 0 },
        { id: 'c2', code: '4101', tenant_id: 'T1', opening_balance: 999 },
      ],
    },
  });
  const res = await applyOpeningBalances(db, 'T1', 2026);
  assert.equal(res.applied, 1);
  assert.equal(res.skippedZero, 0);
  assert.deepEqual(res.skippedNoChart, ['4101 Ventas (ya tiene apertura)', '9999 Fantasma']);
  const c1 = store.chart_of_accounts.find((c) => c.id === 'c1');
  assert.equal(c1.opening_balance, 50000);
  assert.equal(c1.opening_balance_date, '2026-01-01');
  assert.equal(store.account_audit_log.length, 1);
  assert.equal(store.account_audit_log[0].action, 'OPENING_BALANCE_AUTO');

  // Con overwrite sí pisa la existente.
  const res2 = await applyOpeningBalances(db, 'T1', 2026, { overwrite: true });
  assert.equal(res2.applied, 2);
});
