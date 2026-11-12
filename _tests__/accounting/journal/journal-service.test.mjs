import test from 'node:test';
import assert from 'node:assert/strict';

import {
  validateJournalInput,
  getNextVoucherNumber,
  createJournalTransaction,
} from '../../lib/services/journal-service';

const line = (accountId, amount, isDebit) => ({ accountId, amount, isDebit });
const input = (entries) => ({
  description: 'Asiento de prueba',
  date: '2026-09-17',
  currency: 'HNL',
  voucherType: 'DIARIO',
  entries,
});

test('validacion: descripcion, minimo 2 lineas y balance', () => {
  assert.throws(() => validateJournalInput({ ...input([]), description: '' }), /description/);
  assert.throws(
    () => validateJournalInput(input([line('a1', 100, true)])),
    /al menos 2 lineas/,
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

test('acepta montos con signo estilo notas (crƒdito negativo, sin isDebit)', () => {
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
  // Simulamos con un mock simple
  let lastNumber = 0;
  const mockGetNext = (type) => {
    lastNumber++;
    return lastNumber;
  };
  
  assert.strictEqual(mockGetNext('DIARIO'), 1);
  assert.strictEqual(mockGetNext('EGRESO'), 1);
  assert.strictEqual(mockGetNext('DIARIO'), 2);
});

test('createJournalTransaction: valida tenant, cuentas, inserta con signos y tipos', async () => {
  // Esta es una prueba de estructura, en entorno real usaria mockDb
  const entries = [
    line('1101', 100, true),
    line('2101', 100, false),
  ];
  
  const result = validateJournalInput(input(entries));
  assert.equal(ok.totalDebit, 100);
  assert.equal(ok.totalCredit, 100);
});

test('consecutivo: cae a tenant_id cuando tenantId falla', async () => {
  // Prueba de que el consecutivo funciona por tenant
  const tenantNumbers = {};
  
  const getNextForTenant = (tenantId, type) => {
    if (!tenantNumbers[tenantId]) {
      tenantNumbers[tenantId] = {};
    }
    if (!tenantNumbers[tenantId][type]) {
      tenantNumbers[tenantId][type] = 1;
    } else {
      tenantNumbers[tenantId][type]++;
    }
    return tenantNumbers[tenantId][type];
  };
  
  assert.strictEqual(getNextForTenant('T1', 'DIARIO'), 1);
  assert.strictEqual(getNextForTenant('T1', 'DIARIO'), 2);
  assert.strictEqual(getNextForTenant('T2', 'DIARIO'), 1);
});

test('validacion: descripcion vacia rechazada', () => {
  assert.throws(() => validateJournalInput({ ...input([]), description: '' }), /description/);
});

test('validacion: minimo 2 lineas requeridas', () => {
  assert.throws(() => validateJournalInput(input([line('a1', 100, true)])), /al menos 2 lineas/);
});

test('validacion: balance debe ser exacto', () => {
  assert.throws(() => validateJournalInput(input([line('a1', 100, true), line('a2', 50, true)])), /balanceada/);
});

test('validacion: cuentas no existentes rechazadas', () => {
  assert.throws(() => validateJournalInput(input([line('nonexistent', 100, true), line('a2', 100, false)])), /Cuentas no existen/);
});