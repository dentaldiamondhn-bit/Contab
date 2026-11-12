import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateTransaction,
  prepareTransaction,
  calculateTrialBalance,
  calculateTaxBreakdown,
  fromCents,
  toCents,
  isBalanced,
} from '../../lib/accounting-utils';

test('validateTransaction: transacción completa y balanceada', () => {
  assert.doesNotThrow(() => validateTransaction({
    tenant_id: 'T1',
    date: '2026-09-17',
    description: 'Asiento de prueba',
    voucher_type: 'DIARIO',
    voucher_number: 1,
    currency: 'HNL',
    entries: [
      { account_id: '1101', debit: 100, credit: 0 },
      { account_id: '2101', debit: 0, credit: 100 },
    ],
  }));
});

test('validateTransaction: falta voucher_number', () => {
  assert.throws(() => validateTransaction({
    tenant_id: 'T1',
    date: '2026-09-17',
    description: 'Test',
    voucher_type: 'DIARIO',
    entries: [],
  }), /El campo voucher_number es requerido/);
});

test('validateTransaction: tipo voucher inválido', () => {
  assert.throws(() => validateTransaction({
    tenant_id: 'T1',
    date: '2026-09-17',
    description: 'Test',
    voucher_type: 'X',
    voucher_number: 1,
    entries: [],
  }), /Tipo de voucher invldo/);
});

test('validateTransaction: sin entradas', () => {
  assert.throws(() => validateTransaction({
    tenant_id: 'T1',
    date: '2026-09-17',
    description: 'Test',
    voucher_type: 'INGRESO',
    voucher_number: 1,
    entries: [],
  }), /La transacción debe tener al menos una partida/);
});

test('validateTransaction: partida sin cuenta', () => {
  assert.throws(() => validateTransaction({
    tenant_id: 'T1',
    date: '2026-09-17',
    description: 'Test',
    voucher_type: 'INGRESO',
    voucher_number: 1,
    entries: [
      { account_id: '', debit: 100, credit: 0 },
    ],
  }), /Todas las partidas deben tener una cuenta asociada/);
});

test('prepareTransaction: agrega defaults de moneda y tipo de cambio', () => {
  const result = prepareTransaction({
    tenant_id: 'T1',
    date: '2026-09-17',
    description: 'Test',
    voucher_type: 'DIARIO',
    voucher_number: 1,
    entries: [
      { account_id: '1101', debit: 100, credit: 0 },
    ],
  });
  assert.strictEqual(result.currency, 'HNL');
  assert.strictEqual(result.exchange_rate, 24.70);
  assert.strictEqual(result.status, 'POSTED');
});

test('calculateTrialBalance: cuenta con saldo deudor', () => {
  const accounts = [
    { id: '1101', code: '1101', name: 'Caja', type: 'ASSET' },
  ];
  const entries = [
    { account_id: '1101', debit: 1000, credit: 0 },
  ];
  const result = calculateTrialBalance(accounts, entries);
  assert.strictEqual(result[0].debit, 1000);
  assert.strictEqual(result[0].balance_type, 'DEBIT');
});

test('calculateTrialBalance: cuenta con saldo acreedor', () => {
  const accounts = [
    { id: '2101', code: '2101', name: 'Proveedores', type: 'LIABILITY' },
  ];
  const entries = [
    { account_id: '2101', debit: 0, credit: 500 },
  ];
  const result = calculateTrialBalance(accounts, entries);
  assert.strictEqual(result[0].credit, 500);
  assert.strictEqual(result[0].balance_type, 'CREDIT');
});

test('calculateTaxBreakdown: tasa personalizada 18%', () => {
  const result = calculateTaxBreakdown(118000, 0.18);
  assert.strictEqual(result.netAmount, 100000);
  assert.strictEqual(result.taxAmount, 18000);
});

test('calculateTaxBreakdown: tasa por defecto 15%', () => {
  const result = calculateTaxBreakdown(115000);
  assert.strictEqual(result.netAmount, 100000);
  assert.strictEqual(result.taxAmount, 15000);
});

test('fromCents: valores extremos', () => {
  assert.strictEqual(fromCents(0), 0);
  assert.strictEqual(fromCents(99999), 999.99);
});

test('toCents: valores extremos', () => {
  assert.strictEqual(toCents(0), 0);
  assert.strictEqual(toCents(999.99), 99999);
});

test('isBalanced: solo un entry', () => {
  assert.strictEqual(isBalanced([{ amount: 0 }]), true);
});

test('isBalanced: amounts flotantes', () => {
  // Esto puede tener problemas de precision, pero debería funcionar para valores comunes
  assert.strictEqual(isBalanced([{ amount: 0.1 }, { amount: -0.1 }]), true);
});