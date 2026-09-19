import test from 'node:test';
import assert from 'node:assert/strict';

// E2E tests for accounting flow
// These tests require a running server and database

test('setup: verificar que el servidor está corriendo', async () => {
  const response = await fetch('http://localhost:3000/api/health', {
    method: 'GET',
  });
  assert.ok(response.ok, 'Servidor should be running');
});

test('E2E: crear póliza completa', async () => {
  const response = await fetch('http://localhost:3000/api/accounting/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'T1',
    },
    body: JSON.stringify({
      description: 'Asiento de prueba E2E',
      date: '2026-09-17',
      currency: 'HNL',
      voucherType: 'DIARIO',
      entries: [
        { accountId: '1101', amount: 100, isDebit: true },
        { accountId: '2101', amount: 100, isDebit: false },
      ],
    }),
  });

  assert.ok(response.ok, 'Debería crear la póliza exitosamente');
  const data = await response.json();
  assert.strictEqual(data.success, true);
  assert.strictEqual(data.transaction.voucherType, 'DIARIO');
  assert.strictEqual(data.transaction.entries.length, 2);
});

test('E2E: validar candado de período', async () => {
  const response = await fetch('http://localhost:3000/api/accounting/transactions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'T1',
    },
    body: JSON.stringify({
      description: 'Asiento en período cerrado',
      date: '2026-08-15',
      currency: 'HNL',
      voucherType: 'DIARIO',
      entries: [
        { accountId: '1101', amount: 10, isDebit: true },
        { accountId: '2101', amount: 10, isDebit: false },
      ],
    }),
  });

  assert.ok(response.status === 400, 'Debería rechazar períodos cerrados');
  const data = await response.json();
  assert.ok(data.error.includes('cerrado') || data.error.includes('bloqueado'));
});

test('E2E: obtener balances', async () => {
  const response = await fetch('http://localhost:3000/api/accounting/trial-balance?tenantId=T1', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  assert.ok(response.ok, 'Debería obtener el balance');
  const data = await response.json();
  assert.ok(data.success || data.totalDebits !== undefined);
});

test('E2E: exportar balanza a PDF', async () => {
  const response = await fetch('http://localhost:3000/api/accounting/export?trial-balance&type=pdf&tenantId=T1', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  assert.ok(response.ok || response.status === 200, 'Debería exportar la balanza a PDF');
  const contentType = response.headers.get('content-type');
  assert.ok(contentType.includes('application/pdf') || response.headers.get('content-disposition'));
});

test('E2E: exportar impuestos a Excel', async () => {
  const response = await fetch('http://localhost:3000/api/accounting/export?tax-report&type=excel&tenantId=T1', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  assert.ok(response.ok, 'Debería exportar el reporte de impuestos a Excel');
  const contentType = response.headers.get('content-type');
  assert.ok(contentType.includes('excel') || contentType.includes('spreadsheet'));
});