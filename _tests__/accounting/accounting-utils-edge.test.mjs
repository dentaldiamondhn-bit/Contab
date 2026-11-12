import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateEntry,
  calculateAccountBalance,
  getBalanceType,
  formatCurrency,
  isBalanced,
} from '../../lib/accounting-utils';

test('validateEntry con entries mixtas', () => {
  // Mixto de débitos y créditos en diferentes entries
  assert.doesNotThrow(() => validateEntry([
    { debit: 200, credit: 0 },
    { debit: 0, credit: 100 },
    { debit: 0, credit: 100 },
  ]));
});

test('validateEntry lanza error con accounts repetidas', () => {
  assert.throws(() => validateEntry([
    { debit: 100, credit: 0, account_id: '1101' },
    { debit: 0, credit: 100, account_id: '1101' },
  ]), /Una cuenta no puede tener dAcbito y crAcdito en la misma pA3liza/);
});

test('calculateAccountBalance con muchas entries', () => {
  const entries = [];
  for (let i = 0; i < 10; i++) {
    entries.push({ debit: i * 10, credit: 0 });
    entries.push({ debit: 0, credit: i * 5 });
  }
  const balance = calculateAccountBalance(entries);
  // Debe ser 550 - 275 = 275
  assert.strictEqual(balance, 275);
});

test('getBalanceType tipos desconocidos', () => {
  assert.strictEqual(getBalanceType('TIPO_ANY', 100), 'UNKNOWN');
  assert.strictEqual(getBalanceType('', 100), 'UNKNOWN');
});

test('formatCurrency cantidades grandes', () => {
  assert.strictEqual(formatCurrency(999999), 'L. 9,999.99');
});

test('getNextVoucherNumber: numeros saltados', () => {
  // Simulaci˜n: si el ultimo era 10, el siguiente es 11
  assert.strictEqual(getNextVoucherNumber('DIARIO', 10), 11);
});

test('isBalanced: con decimal', () => {
  assert.strictEqual(isBalanced([{ amount: 150 }, { amount: -150 }]), true);
});

test('isBalanced: amounts muy grandes', () => {
  assert.strictEqual(isBalanced([{ amount: 1000000 }, { amount: -1000000 }]), true);
});