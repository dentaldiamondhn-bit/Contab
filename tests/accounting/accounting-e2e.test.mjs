import test from 'node:test';
import assert from 'node:assert/strict';
import { execSync } from 'node:child_process';
import { createSupaClient } from './fake-supabase.mjs';

const BASE_URL = 'http://localhost:3000';

test.beforeAll(async () => {
  // Iniciar el servidor de Next.js en segundo plano
  const serverProcess = execSync('npm run dev', {
    cwd: 'C:\\Users\\denta\\OneDrive\\Documentos\\Default Project\\Contab',
    shell: true,
    timeout: 30000,
    stdio: 'pipe',
  });
});

test('E2E: Flujo completo de creación de póliza contable', async () => {
  const supa = createSupaClient();

  // 1. Crear una cuenta de prueba
  const { data: accounts, error: accError } = await supa
    .from('Account')
    .insert({
      code: '1101',
      name: 'Caja de Prueba',
      type: 'ASSET',
      description: 'Cuenta de prueba para E2E',
      tenantId: 'test-e2e',
    })
    .select();

  assert.error(accError, 'Error creando cuenta de prueba');
  assert.equal(accounts.length, 1, 'Debería crear 1 cuenta');
  const accountId = accounts[0].id;

  // 2. Crear una transacción (póliza) vía API
  const transactionRes = await fetch(`${BASE_URL}/api/accounting/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'test-e2e',
    },
    body: JSON.stringify({
      description: 'E2E: Póliza de prueba - Venta de servicios',
      voucherType: 'INGRESO',
      entries: [
        { accountId, amount: 50000 }, // Debe: 50,000 HNL
        { accountId: '1201', amount: -50000 }, // Haber: -50,000 HNL (Ingresos)
      ],
    }),
  });

  assert.equal(transactionRes.status, 201, 'Debería crear la transacción con status 201');
  const transactionData = await transactionRes.json();
  assert.equal(transactionData.transaction.voucherType, 'INGRESO');
  assert.equal(transactionData.transaction.tenantId, 'test-e2e');
  assert.equal(transactionData.transaction.voucherNumber, 1, 'Debería ser la primera póliza');
  assert.equal(transactionData.transaction.totalAmount, 50000);

  // 3. Verificar que se creó el asiento de asientos
  const { data: journalEntries, error: jeError } = await supa
    .from('JournalEntry')
    .select()
    .eq('transactionId', transactionData.transaction.id);

  assert.error(jeError, 'Error consultando asientos');
  assert.equal(journalEntries.length, 2, 'Deberían crearse 2 asientos (débitos y créditos)');

  // 4. Verificar que se registró la auditoría
  const { data: auditLogs, error: auditError } = await supa
    .from('account_audit_log')
    .select()
    .eq('tenant_id', 'test-e2e')
    .order('performed_at', { ascending: false });

  assert.error(auditError, 'Error consultando auditoría');
  assert.equal(auditLogs.length >= 2, true, 'Deberían registrarse mínimo 2 entradas de auditoría');

  // 5. Verificar balance (débitos = créditos)
  const totalDebit = journalEntries.reduce((sum, entry) => entry.type === 'DEBIT' ? sum + Math.abs(entry.amount) : sum, 0);
  const totalCredit = journalEntries.reduce((sum, entry) => entry.type === 'CREDIT' ? sum + Math.abs(entry.amount) : sum, 0);
  assert.equal(totalDebit, totalCredit, 'Los totales de débito y crédito deben ser iguales');

  // 6. Probar el candado de período (mes cerrado debería fallar)
  // Primero, cerrar el mes actual
  await supa.from('period_locks').insert({
    tenant_id: 'test-e2e',
    year: 2026,
    month: 9,
    status: 'closed',
  });

  const closedRes = await fetch(`${BASE_URL}/api/accounting/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'test-e2e',
    },
    body: JSON.stringify({
      description: 'Intento en mes cerrado',
      voucherType: 'INGRESO',
      entries: [
        { accountId, amount: 1000 },
        { accountId: '1201', amount: -1000 },
      ],
      date: '2026-09-20', // Fecha en mes cerrado
    }),
  });

  assert.equal(closedRes.status, 400, 'Debería rechazar transacciones en mes cerrado');
  const closedData = await closedRes.json();
  assert.match(closedData.error || '', /2026-09.*cerrado/);

  console.log('✅ E2E Test completado exitosamente: Flujo completo de póliza contable');
});

test('E2E: Validación de entrada - cuentas inexistentes', async () => {
  const transactionRes = await fetch(`${BASE_URL}/api/accounting/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'test-e2e',
    },
    body: JSON.stringify({
      description: 'Póliza con cuenta inexistente',
      voucherType: 'DIARIO',
      entries: [
        { accountId: 'nonexistent', amount: 1000 },
        { accountId: '1201', amount: -1000 },
      ],
    }),
  });

  assert.equal(transactionRes.status, 400, 'Debería rechazar por cuenta inexistente');
  const data = await transactionRes.json();
  assert.match(data.error || '', /Cuentas no existen/);
  console.log('✅ Validación de cuentas inexistentes correcta');
});

test('E2E: Candado de período - mes bloqueado', async () => {
  // Configurar mes bloqueado en Supabase
  const supa = createSupaClient();
  await supa.from('period_locks').insert({
    tenant_id: 'test-e2e-block',
    year: 2026,
    month: 8,
    status: 'locked',
  });

  const transactionRes = await fetch(`${BASE_URL}/api/accounting/transactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-tenant-id': 'test-e2e-block',
    },
    body: JSON.stringify({
      description: 'Póliza en mes bloqueado',
      voucherType: 'INGRESO',
      entries: [
        { accountId: '1101', amount: 100 },
        { accountId: '1201', amount: -100 },
      ],
      date: '2026-08-15',
    }),
  });

  assert.equal(transactionRes.status, 400, 'Debería rechazar mes bloqueado');
  const data = await transactionRes.json();
  assert.match(data.error || '', /bloqueado/);
  console.log('✅ Candado de período bloqueado correcto');
});

test('E2E: Variación entre períodos', async () => {
  // Crear datos en dos períodos diferentes
  const supa = createSupaClient();

  // Período 1: agosto - crear transacción
  await supa.from('Transaction').insert({
    id: 'e2e-t1',
    tenantId: 'test-e2e-var',
    date: '2026-08-15',
    description: 'E2E: Transacción agosto',
    voucherType: 'INGRESO',
    voucherNumber: 1,
    currency: 'HNL',
    totalAmount: 10000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await supa.from('JournalEntry').insert({
    id: 'e2e-je1',
    transactionId: 'e2e-t1',
    accountId: '1101',
    amount: 10000,
    originalAmount: 10000,
    currency: 'HNL',
    type: 'DEBIT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await supa.from('JournalEntry').insert({
    id: 'e2e-je2',
    transactionId: 'e2e-t1',
    accountId: '1201',
    amount: -10000,
    originalAmount: -10000,
    currency: 'HNL',
    type: 'CREDIT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Período 2: septiembre - crear otra transacción
  await supa.from('Transaction').insert({
    id: 'e2e-t2',
    tenantId: 'test-e2e-var',
    date: '2026-09-15',
    description: 'E2E: Transacción septiembre',
    voucherType: 'INGRESO',
    voucherNumber: 1,
    currency: 'HNL',
    totalAmount: 15000,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await supa.from('JournalEntry').insert({
    id: 'e2e-je3',
    transactionId: 'e2e-t2',
    accountId: '1101',
    amount: 15000,
    originalAmount: 15000,
    currency: 'HNL',
    type: 'DEBIT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await supa.from('JournalEntry').insert({
    id: 'e2e-je4',
    transactionId: 'e2e-t2',
    accountId: '1201',
    amount: -15000,
    originalAmount: -15000,
    currency: 'HNL',
    type: 'CREDIT',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  // Llamar al endpoint de variaciones
  const variationsRes = await fetch(`${BASE_URL}/api/accounting/period-variations?tenantId=test-e2e-var&from=2026-08&to=2026-09`, {
    headers: {
      'x-tenant-id': 'test-e2e-var',
    },
  });

  assert.equal(variationsRes.status, 200, 'Debería retornar variaciones entre períodos');
  const variationsData = await variationsRes.json();
  const report = variationsData.data.report;

  assert.equal(report.from, '2026-08', 'Período inicial debería ser 2026-08');
  assert.equal(report.to, '2026-09', 'Período final debería ser 2026-09');
  assert.equal(report.rows.length, 1, 'Debería haber 1 fila de variación');
  assert.equal(report.counts.accounts, 1, 'Debería haber 1 cuenta en el reporte');
  assert.equal(report.counts.up, 1, 'Debería tener 1 tendencia "up"');

  console.log('✅ E2E Test variaciones entre períodos completado');
});

test.afterAll(async () => {
  // Detener el servidor
  execSync('pkill -f "next dev" || true', { cwd: 'C:\\Users\\denta\\OneDrive\\Documentos\\Default Project\\Contab', shell: true });
});