import test from 'node:test';
import assert from 'node:assert/strict';

import {
  aggregatePeriodBalances,
  computeVariations,
  getVariationsReport,
  isValidPeriod,
  periodBounds,
} from '../../lib/services/period-variations.ts';
import { makeFakeDb } from './fake-supabase.mjs';

const tx = (id, tenant, date, entries) => ({ id, [tenant]: 'T1', date, JournalEntry: entries });
const je = (accountId, code, name, debit, credit) => ({
  accountId,
  type: debit > 0 ? 'DEBIT' : 'CREDIT',
  amount: debit > 0 ? debit : -credit,
  Account: { id: accountId, code, name, type: 'ASSET' },
});

test('isValidPeriod y periodBounds (diciembre cruza año)', () => {
  assert.equal(isValidPeriod('2026-09'), true);
  assert.equal(isValidPeriod('2026-13'), false);
  assert.deepEqual(periodBounds('2026-09'), { start: '2026-09-01', end: '2026-10-01' });
  assert.deepEqual(periodBounds('2026-12'), { start: '2026-12-01', end: '2027-01-01' });
});

test('computeVariations: tendencias, % y casos borde', () => {
  const from = new Map([
    ['a1', { accountId: 'a1', code: '1101', name: 'Caja', type: 'ASSET', debit: 100, credit: 0, balance: 100 }],
    ['a2', { accountId: 'a2', code: '2101', name: 'Prov', type: 'LIABILITY', debit: 0, credit: 50, balance: -50 }],
    ['a3', { accountId: 'a3', code: '3101', name: 'Vieja', type: 'ASSET', debit: 10, credit: 0, balance: 10 }],
  ]);
  const to = new Map([
    ['a1', { accountId: 'a1', code: '1101', name: 'Caja', type: 'ASSET', debit: 150, credit: 0, balance: 150 }],
    ['a2', { accountId: 'a2', code: '2101', name: 'Prov', type: 'LIABILITY', debit: 0, credit: 50, balance: -50 }],
    ['a4', { accountId: 'a4', code: '4101', name: 'Nueva', type: 'REVENUE', debit: 0, credit: 7, balance: -7 }],
  ]);
  const rows = computeVariations(from, to);
  const byId = Object.fromEntries(rows.map((r) => [r.accountId, r]));
  assert.equal(byId.a1.trend, 'up');
  assert.equal(byId.a1.varAbs, 50);
  assert.equal(byId.a1.varPct, 50);
  assert.equal(byId.a2.trend, 'same');
  assert.equal(byId.a3.trend, 'gone');
  assert.equal(byId.a4.trend, 'new');
  assert.equal(byId.a4.varPct, null);
});

test('getVariationsReport filtra por rango y usa fallback de tenant', async () => {
  const entriesSep = [je('a1', '1101', 'Caja', 100, 0)];
  const entriesOct = [je('a1', '1101', 'Caja', 60, 0), je('a2', '4101', 'Ventas', 0, 40)];
  const { db } = makeFakeDb({
    transactions: [
      tx('t1', 'tenantId', '2026-09-05', entriesSep),
      tx('t2', 'tenantId', '2026-10-03', entriesOct),
      tx('t3', 'tenantId', '2026-11-01', entriesOct),
    ],
  });
  const rep = await getVariationsReport(db, 'T1', '2026-09', '2026-10');
  assert.equal(rep.from, '2026-09');
  assert.equal(rep.rows.length, 2);
  const caja = rep.rows.find((r) => r.code === '1101');
  assert.equal(caja.fromBalance, 100);
  assert.equal(caja.toBalance, 60);
  assert.equal(caja.varAbs, -40);
  assert.equal(rep.counts.down, 1);
  assert.equal(rep.counts.new, 1);

  const legacy = makeFakeDb({
    transactions: [tx('t1', 'tenant_id', '2026-09-05', entriesSep)],
  });
  const repLegacy = await getVariationsReport(legacy.db, 'T1', '2026-09', '2026-10');
  assert.equal(repLegacy.rows.length, 1);
});

test('getVariationsReport valida tenant, formato e igualdad', async () => {
  const { db } = makeFakeDb({});
  await assert.rejects(getVariationsReport(db, '', '2026-09', '2026-10'), /Tenant/);
  await assert.rejects(getVariationsReport(db, 'T1', '2026-13', '2026-10'), /formato/);
  await assert.rejects(getVariationsReport(db, 'T1', '2026-09', '2026-09'), /diferentes/);
});
