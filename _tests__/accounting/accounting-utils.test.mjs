import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getAccountTypeLabel,
  getAccountTypeColor,
  validateEntry,
  calculateAccountBalance,
  getBalanceType,
  formatCurrency,
  getNextVoucherNumber,
  validateTransaction,
  prepareTransaction,
  calculateTrialBalance,
  calculateTaxBreakdown,
  fromCents,
  toCents,
  isBalanced,
  generateTransactionSummary,
} from '../../lib/accounting-utils';

test('getAccountTypeLabel: asset', () => {
  assert.strictEqual(getAccountTypeLabel('ASSET'), 'Activo');
});

test('getAccountTypeLabel: liability', () => {
  assert.strictEqual(getAccountTypeLabel('LIABILITY'), 'Pasivo');
});

test('getAccountTypeLabel: equity', () => {
  assert.strictEqual(getAccountTypeLabel('EQUITY'), 'Patrimonio');
});

test('getAccountTypeLabel: revenue', () => {
  assert.strictEqual(getAccountTypeLabel('REVENUE'), 'Ingresos');
});

test('getAccountTypeLabel: expense', () => {
  assert.strictEqual(getAccountTypeLabel('EXPENSE'), 'Gastos');
});

test('getAccountTypeLabel: tipo desconocido', () => {
  assert.strictEqual(getAccountTypeLabel('TIPO_DESCONOCIDO'), 'TIPO_DESCONOCIDO');
});

test('getAccountTypeColor: asset', () => {
  assert.strictEqual(getAccountTypeColor('ASSET'), 'bg-cyan-100 text-cyan-800');
});

test('getAccountTypeColor: liability', () => {
  assert.strictEqual(getAccountTypeColor('LIABILITY'), 'bg-red-100 text-red-800');
});

test('getAccountTypeColor: equity', () => {
  assert.strictEqual(getAccountTypeColor('EQUITY'), 'bg-green-100 text-green-800');
});

test('getAccountTypeColor: revenue', () => {
  assert.strictEqual(getAccountTypeColor('REVENUE'), 'bg-purple-100 text-purple-800');
});

test('getAccountTypeColor: expense', () => {
  assert.strictEqual(getAccountTypeColor('EXPENSE'), 'bg-orange-100 text-orange-800');
});

test('getAccountTypeColor: tipo desconocido', () => {
  assert.strictEqual(getAccountTypeColor('DESCONOCIDO'), 'bg-gray-100 text-gray-800');
});

test('validateEntry: valida balance correcto', () => {
  assert.doesNotThrow(() => validateEntry([
    { debit: 100, credit: 100 },
    { debit: 500, credit: 0 },
    { debit: 0, credit: 500 },
  ]));
});

test('validateEntry: lanza error si no está balanceado', () => {
  assert.throws(() => validateEntry([
    { debit: 100, credit: 50 },
  ]), /La póliza est\xe0 descuadrada/);
});

test('validateEntry: lanza error si no hay débitos', () => {
  assert.throws(() => validateEntry([
    { debit: 0, credit: 100 },
  ]), /La póliza debe tener al menos un dAc\xe9bito y un cr\xe9dito/);
});

test('calculateAccountBalance: calcula balance positivo', () => {
  const balance = calculateAccountBalance([
    { account_id: '1101', debit: 500, credit: 0 },
    { account_id: '1101', debit: 0, credit: 200 },
  ]);
  assert.strictEqual(balance, 300);
});

test('calculateAccountBalance: calcula balance negativo', () => {
  const balance = calculateAccountBalance([
    { account_id: '2101', debit: 0, credit: 300 },
  ]);
  assert.strictEqual(balance, -300);
});

test('getBalanceType: activo con saldo positivo', () => {
  assert.strictEqual(getBalanceType('ASSET', 100), 'DEBIT');
});

test('getBalanceType: activo con saldo negativo', () => {
  assert.strictEqual(getBalanceType('ASSET', -50), 'CREDIT');
});

test('getBalanceType: pasivo con saldo positivo', () => {
  assert.strictEqual(getBalanceType('LIABILITY', 100), 'CREDIT');
});

test('getBalanceType: ingreso con saldo negativo', () => {
  assert.strictEqual(getBalanceType('REVENUE', -50), 'DEBIT');
});

test('formatCurrency: formatea en HNL', () => {
  assert.strictEqual(formatCurrency(100), 'L. 1.00');
});

test('formatCurrency: formatea con moneda personalizada', () => {
  assert.strictEqual(formatCurrency(500, 'USD'), 'USD 5.00');
});

test('getNextVoucherNumber: numero por defecto', () => {
  assert.strictEqual(getNextVoucherNumber('INGRESO'), 1);
});

test('getNextVoucherNumber: siguiente numero', () => {
  assert.strictEqual(getNextVoucherNumber('EGRESO', 5), 6);
});

test('validateTransaction: campos requeridos', () => {
  assert.throws(() => validateTransaction({
    tenant_id: 'T1',
    date: '2026-09-17',
    description: 'Test',
    voucher_type: 'DIARIO',
  }), /El campo voucher_number es requerido/);
});

test('validateTransaction: tipo de voucher invlido', () => {
  assert.throws(() => validateTransaction({
    tenant_id: 'T1',
    date: '2026-09-17',
    description: 'Test',
    voucher_type: 'INVALIDO',
    voucher_number: 1,
    entries: [],
  }), /Tipo de voucher invldo/);
});

test('validateTransaction: balance correcto', () => {
  assert.doesNotThrow(() => validateTransaction({
    tenant_id: 'T1',
    date: '2026-09-17',
    description: 'Test',
    voucher_type: 'INGRESO',
    voucher_number: 1,
    currency: 'HNL',
    entries: [
      { account_id: '1101', debit: 100, credit: 0 },
      { account_id: '2101', debit: 0, credit: 100 },
    ],
  }));
});

test('prepareTransaction: prepara datos correctamente', () => {
  const result = prepareTransaction({
    tenant_id: 'T1',
    date: '2026-09-17',
    description: 'Test',
    voucher_type: 'DIARIO',
    voucher_number: 1,
    currency: 'HNL',
    entries: [
      { account_id: '1101', debit: 100, credit: 0 },
    ],
  });
  assert.strictEqual(result.currency, 'HNL');
  assert.strictEqual(result.exchange_rate, 24.70);
  assert.strictEqual(result.status, 'POSTED');
  assert.strictEqual(result.entries.length, 1);
  assert.strictEqual(result.entries[0].debit, 100);
  assert.strictEqual(result.entries[0].credit, 0);
});

test('calculateTrialBalance: calcula balances por cuenta', () => {
  const accounts = [
    { id: '1101', code: '1101', name: 'Caja', type: 'ASSET' },
    { id: '2101', code: '2101', name: 'Proveedores', type: 'LIABILITY' },
  ];
  const entries = [
    { account_id: '1101', debit: 500, credit: 0 },
    { account_id: '2101', debit: 0, credit: 300 },
  ];
  const result = calculateTrialBalance(accounts, entries);
  assert.strictEqual(result[0].debit, 500);
  assert.strictEqual(result[0].balance_type, 'DEBIT');
  assert.strictEqual(result[1].credit, 300);
  assert.strictEqual(result[1].balance_type, 'CREDIT');
});

test('calculateTaxBreakdown: tasa 15%', () => {
  const result = calculateTaxBreakdown(115000, 0.15);
  assert.strictEqual(result.netAmount, 100000);
  assert.strictEqual(result.taxAmount, 15000);
  assert.strictEqual(result.totalWithTax, 115000);
});

test('calculateTaxBreakdown: tasa 18%', () => {
  const result = calculateTaxBreakdown(118000, 0.18);
  assert.strictEqual(result.netAmount, 100000);
  assert.strictEqual(result.taxAmount, 18000);
  assert.strictEqual(result.totalWithTax, 118000);
});

test('calculateTaxBreakdown: tasa por defecto', () => {
  const result = calculateTaxBreakdown(115000); // sin especificar tasa
  assert.strictEqual(result.netAmount, 100000);
  assert.strictEqual(result.taxAmount, 15000);
});

test('fromCents: convierte centavos a cordobas', () => {
  assert.strictEqual(fromCents(115000), 1150);
  assert.strictEqual(fromCents(15050), 150.50);
});

test('toCents: convierte cordobas a centavos', () => {
  assert.strictEqual(toCents(1150), 115000);
  assert.strictEqual(toCents(150.50), 15050);
});

test('isBalanced: valida balanceo correcto', () => {
  assert.strictEqual(isBalanced([
    { amount: 100 },
    { amount: -100 },
  ]), true);
});

test('isBalanced: valida desbalanceo', () => {
  assert.strictEqual(isBalanced([
    { amount: 100 },
    { amount: -50 },
  ]), false);
});

test('generateTransactionSummary: resumen completo', () => {
  const transactions = [
    {
      voucher_type: 'INGRESO',
      entries: [{ account_id: '1101', debit: 100, credit: 0 }],
      date: '2026-09-17',
    },
    {
      voucher_type: 'EGRESO',
      entries: [{ account_id: '2101', debit: 50, credit: 0 }],
      date: '2026-09-18',
    },
  ];
  const summary = generateTransactionSummary(transactions);
  assert.strictEqual(summary.total_transactions, 2);
  assert.strictEqual(summary.by_type.INGRESO, 1);
  assert.strictEqual(summary.by_type.EGRESO, 1);
  assert.strictEqual(summary.total_amount, 150);
});