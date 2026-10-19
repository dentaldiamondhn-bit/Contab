import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import { aprobarCompra, rechazarCompra } from '@/lib/purchase-db';
import { POST as DECIDIR } from '../../app/api/purchases/approval/route.ts';
import {
  GET as GET_APROBADORES,
  POST as POST_APROBADOR,
  DELETE as DELETE_APROBADOR,
} from '../../app/api/purchases/approvers/route.ts';
import { ErrorDeEmpresa } from './tenant-resolver-mock.mjs';
import { crearSupabaseFalso } from './supabase-falso.mjs';
import { ponerSupabase } from './supabase-server-mock.mjs';
import { ponerUsuarioAppId } from './workspace-mock.mjs';

/**
 * Workflow de aprobacion de compras: la compra nace PENDIENTE y sus efectos
 * (inventario + asiento) solo corren al aprobar; el rechazo no revierte nada.
 * Ademas, quien decide es el Gerente+ o un aprobador designado por la empresa,
 * y la empresa sale siempre del contexto validado (test 1 y test 2 comparten
 * `TEST1DS`, asi que el tenant no separa nada).
 */

const T1 = '8143dd4e-a4ef-4619-87a2-0504d0c8c46a'; // test 1
const T2 = '971bec43-5c57-44a3-92b0-db7f909c5276'; // test 2
const TEN = 'TEST1DS'; // tenant compartido por T1 y T2

const em = (companyId, tenantId = TEN) => ({ tenantId, companyId });

let sb;
let bd;

function sembrar() {
  bd = {
    Purchase: [
      { id: 'p-t1', company_id: T1, tenant_id: TEN, supplier_id: 's-t1', invoice_number: 'F-1', subtotal: 100, tax_amount: 15, total: 115, invoice_date: '2026-01-10', status: 'PAID', amount_paid: 115, balance_due: 0, purchase_type: 'expense', approval_status: 'PENDING_APPROVAL' },
      { id: 'p-t1b', company_id: T1, tenant_id: TEN, supplier_id: 's-t1', invoice_number: 'F-2', total: 50, subtotal: 50, tax_amount: 0, invoice_date: '2026-01-11', status: 'PAID', amount_paid: 50, balance_due: 0, purchase_type: 'expense', approval_status: 'REJECTED' },
      { id: 'p-t2', company_id: T2, tenant_id: TEN, supplier_id: 's-t2', invoice_number: 'F-3', total: 300, subtotal: 300, tax_amount: 0, invoice_date: '2026-01-12', status: 'PAID', amount_paid: 300, balance_due: 0, purchase_type: 'expense', approval_status: 'PENDING_APPROVAL' },
    ],
    PurchaseItem: [
      { id: 'pi-t1', purchase_id: 'p-t1', company_id: T1, tenant_id: TEN, product_name: 'Cafe', quantity: 2, unit_price: 50, subtotal: 100, tax_amount: 15, total: 115 },
    ],
    Supplier: [
      { id: 's-t1', company_id: T1, tenant_id: TEN, name: 'Proveedor T1', rtn: '0801-2' },
      { id: 's-t2', company_id: T2, tenant_id: TEN, name: 'Proveedor T2', rtn: '0801-3' },
    ],
    product: [
      { id: 'prod-t1', company_id: T1, tenant_id: TEN, name: 'Cafe', current_stock: 50 },
    ],
    PurchaseApprover: [
      { id: 'ap-t1', company_id: T1, tenant_id: TEN, user_id: 'u-designado' },
      { id: 'ap-t2', company_id: T2, tenant_id: TEN, user_id: 'u-otro' },
    ],
    // El rol de aprobacion es POR EMPRESA (AGENTS.md 1b), no el global de Clerk:
    // `u-mgr` es DUENO de test 1 (manda); `u-designado` y `u-miembro` son
    // contadores (solo si se les designa); `u-otro` es miembro de la hermana.
    user_company_access: [
      { user_id: 'u-designado', company_id: T1, relationship: 'accountant' },
      { user_id: 'u-mgr', company_id: T1, relationship: 'owner' },
      { user_id: 'u-miembro', company_id: T1, relationship: 'accountant' },
      { user_id: 'u-otro', company_id: T2, relationship: 'accountant' },
    ],
    User: [
      { id: 'u-designado', firstname: 'Dora', lastname: 'Designada', email: 'dora@x.com' },
      { id: 'u-mgr', firstname: 'Mario', lastname: 'Manager', email: 'mario@x.com' },
      { id: 'u-miembro', firstname: 'Marta', lastname: 'Miembro', email: 'marta@x.com' },
      { id: 'u-otro', firstname: 'Otro', lastname: 'User', email: 'otro@x.com' },
    ],
    supplier_price_history: [],
    SupplierPayment: [],
    // Catalogo minimo de test 1: sin estas cuentas la aprobacion ahora falla
    // (el asiento es obligatorio). Ver `resolverCuentasDeCompra`, que resuelve
    // por PREFIJO de codigo y por empresa. `tenantId` (camel) es el que lee
    // `createJournalTransaction` para validar que la cuenta existe.
    Account: [
      { id: 'acc-1101-t1', code: '1101', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'Banco' },
      { id: 'acc-1105-t1', code: '1105', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'Inventario' },
      { id: 'acc-1106-t1', code: '1106', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'ISV Credito Fiscal' },
      { id: 'acc-2101-t1', code: '2101', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'Cuentas por Pagar' },
      { id: 'acc-6101-t1', code: '6101', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'Compras' },
      { id: 'acc-4101-t1', code: '4101', company_id: T1, tenantId: TEN, tenant_id: TEN, name: 'Gastos Administrativos' },
    ],
    Transaction: [],
    JournalEntry: [],
    JournalEntryLine: [],
  };
  sb = crearSupabaseFalso({ bd, seq: 0 });
  ponerSupabase(sb);
  ponerUsuarioAppId(null);
}

beforeEach(sembrar);

const req = (body, { companyId, tenantId, url = 'http://localhost/api/purchases/approval', search } = {}) => {
  const headers = new Map();
  if (companyId) headers.set('x-company-id', companyId);
  if (tenantId) headers.set('x-tenant-id', tenantId);
  const u = search ? `${url}?${search}` : url;
  const r = {
    url: u,
    headers: { get: (n) => headers.get(String(n).toLowerCase()) ?? null },
  };
  if (body !== undefined) r.json = async () => body;
  return r;
};
const sesion = { companyId: T1, tenantId: TEN };

describe('aprobarCompra / rechazarCompra (lib)', () => {
  test('aprobar aplica los efectos y marca APPROVED', async () => {
    const antes = bd.product.find((p) => p.id === 'prod-t1').current_stock;
    const res = await aprobarCompra(sb, em(T1), 'p-t1', { userId: 'u-mgr' });

    assert.equal(res.error, null);
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').approval_status, 'APPROVED');
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').approved_by, 'u-mgr');
    assert.equal(bd.product.find((p) => p.id === 'prod-t1').current_stock, antes + 2);
  });

  test('aprobar genera el asiento contable real (Transaction + lineas JournalEntry)', async () => {
    await aprobarCompra(sb, em(T1), 'p-t1', { userId: 'u-mgr' });

    // Cabecera: 1 Transaction de la empresa. Compra al contado => EGRESO.
    assert.equal(bd.Transaction.length, 1);
    const tx = bd.Transaction[0];
    assert.equal(tx.company_id, T1);
    assert.equal(tx.voucherType, 'EGRESO');
    assert.equal(Number(tx.totalAmount), 11500); // centavos

    // Lineas: debe Gasto 100 + ISV 15, haber Banco 115 (amount con signo).
    assert.equal(bd.JournalEntry.length, 3);
    const debe = bd.JournalEntry.filter((l) => l.type === 'DEBIT');
    const haber = bd.JournalEntry.filter((l) => l.type === 'CREDIT');
    assert.deepEqual(debe.map((l) => l.accountId).sort(), ['acc-1106-t1', 'acc-6101-t1']);
    assert.equal(debe.reduce((s, l) => s + l.amount, 0), 11500);
    assert.equal(haber.length, 1);
    assert.equal(haber[0].accountId, 'acc-1101-t1');
    assert.equal(haber[0].amount, -11500);
    assert.ok(bd.JournalEntry.every((l) => l.transactionId === tx.id));
    assert.ok(bd.JournalEntry.every((l) => l.company_id === T1));

    // El asiento queda enlazado con la compra.
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').journal_entry_id, tx.id);
    // Y se registra el historial de precios del proveedor.
    assert.equal(bd.supplier_price_history.length, 1);
    // La tabla inexistente del escritor viejo ya no se usa.
    assert.equal(bd.JournalEntryLine.length, 0);
  });

  test('bloquea la aprobacion si falta una cuenta del catalogo, sin efectos', async () => {
    bd.Account = bd.Account.filter((a) => a.code !== '1106'); // falta ISV (hay impuesto)
    const antes = bd.product.find((p) => p.id === 'prod-t1').current_stock;

    await assert.rejects(
      () => aprobarCompra(sb, em(T1), 'p-t1', { userId: 'u-mgr' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 409
    );

    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').approval_status, 'PENDING_APPROVAL');
    assert.equal(bd.product.find((p) => p.id === 'prod-t1').current_stock, antes);
    assert.equal(bd.Transaction.length, 0);
    assert.equal(bd.JournalEntry.length, 0);
    assert.equal(bd.supplier_price_history.length, 0);
  });

  test('revierte stock e historial si la cabecera del asiento no se inserta', async () => {
    sb = crearSupabaseFalso({ bd, seq: 0, bloquearInsert: ['Transaction'] });
    ponerSupabase(sb);
    const antes = bd.product.find((p) => p.id === 'prod-t1').current_stock;

    await assert.rejects(
      () => aprobarCompra(sb, em(T1), 'p-t1', { userId: 'u-mgr' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 409
    );

    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').approval_status, 'PENDING_APPROVAL');
    assert.equal(bd.product.find((p) => p.id === 'prod-t1').current_stock, antes);
    assert.equal(bd.supplier_price_history.length, 0);
    assert.equal(bd.Transaction.length, 0);
    assert.equal(bd.JournalEntry.length, 0);
  });

  test('si fallan las lineas del asiento no deja la cabecera huerfana y revierte', async () => {
    sb = crearSupabaseFalso({ bd, seq: 0, bloquearInsert: ['JournalEntry'] });
    ponerSupabase(sb);
    const antes = bd.product.find((p) => p.id === 'prod-t1').current_stock;

    await assert.rejects(
      () => aprobarCompra(sb, em(T1), 'p-t1', { userId: 'u-mgr' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 409
    );

    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').approval_status, 'PENDING_APPROVAL');
    assert.equal(bd.product.find((p) => p.id === 'prod-t1').current_stock, antes);
    assert.equal(bd.supplier_price_history.length, 0);
    assert.equal(bd.Transaction.length, 0);
    assert.equal(bd.JournalEntry.length, 0);
  });

  test('404 (notFound) si la compra es de otra empresa del mismo tenant', async () => {
    const antes = bd.product.find((p) => p.id === 'prod-t1').current_stock;
    const res = await aprobarCompra(sb, em(T1), 'p-t2', { userId: 'u-mgr' });

    assert.equal(res.notFound, true);
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t2').approval_status, 'PENDING_APPROVAL');
    assert.equal(bd.product.find((p) => p.id === 'prod-t1').current_stock, antes);
  });

  test('409 si la compra ya fue decidida', async () => {
    bd.Purchase.find((p) => p.id === 'p-t1').approval_status = 'APPROVED';
    await assert.rejects(
      () => aprobarCompra(sb, em(T1), 'p-t1', { userId: 'u-mgr' }),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 409
    );
    await assert.rejects(
      () => rechazarCompra(sb, em(T1), 'p-t1', { userId: 'u-mgr' }, 'x'),
      (e) => e instanceof ErrorDeEmpresa && e.estado === 409
    );
  });

  test('rechazar no toca inventario y guarda el motivo', async () => {
    const antes = bd.product.find((p) => p.id === 'prod-t1').current_stock;
    const res = await rechazarCompra(sb, em(T1), 'p-t1', { userId: 'u-mgr' }, 'Factura duplicada');

    assert.equal(res.error, null);
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').approval_status, 'REJECTED');
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').rejection_reason, 'Factura duplicada');
    assert.equal(bd.product.find((p) => p.id === 'prod-t1').current_stock, antes);
  });
});

describe('POST /api/purchases/approval', () => {
  test('sin contexto de empresa responde 400, no 500', async () => {
    const res = await DECIDIR(req({ id: 'p-t1', action: 'approve' }));
    assert.equal(res.status, 400);
  });

  test('400 si faltan id o action', async () => {
    ponerUsuarioAppId('u-mgr');
    const res = await DECIDIR(req({ id: 'p-t1' }, sesion));
    assert.equal(res.status, 400);
  });

  test('403 si no es dueno ni aprobador designado', async () => {
    ponerUsuarioAppId('u-miembro'); // contador de la empresa, pero no designado
    const res = await DECIDIR(req({ id: 'p-t1', action: 'approve' }, sesion));
    assert.equal(res.status, 403);
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').approval_status, 'PENDING_APPROVAL');
  });

  test('un aprobador designado puede aprobar sin ser dueno', async () => {
    ponerUsuarioAppId('u-designado');
    const res = await DECIDIR(req({ id: 'p-t1', action: 'approve' }, sesion));
    assert.equal(res.status, 200);
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').approval_status, 'APPROVED');
  });

  test('el dueno de la empresa aprueba sin estar designado', async () => {
    ponerUsuarioAppId('u-mgr');
    const res = await DECIDIR(req({ id: 'p-t1', action: 'approve' }, sesion));
    assert.equal(res.status, 200);
  });

  test('404 al decidir una compra de otra empresa (aunque sea el dueno)', async () => {
    ponerUsuarioAppId('u-mgr');
    const res = await DECIDIR(req({ id: 'p-t2', action: 'approve' }, sesion));
    assert.equal(res.status, 404);
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t2').approval_status, 'PENDING_APPROVAL');
  });

  test('409 al decidir una compra ya decidida', async () => {
    ponerUsuarioAppId('u-mgr');
    bd.Purchase.find((p) => p.id === 'p-t1').approval_status = 'REJECTED';
    const res = await DECIDIR(req({ id: 'p-t1', action: 'approve' }, sesion));
    assert.equal(res.status, 409);
  });

  test('409 si falta una cuenta contable (no se puede contabilizar), y no aprueba', async () => {
    ponerUsuarioAppId('u-mgr');
    bd.Account = bd.Account.filter((a) => a.code !== '1101'); // falta Banco/Caja
    const res = await DECIDIR(req({ id: 'p-t1', action: 'approve' }, sesion));
    assert.equal(res.status, 409);
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').approval_status, 'PENDING_APPROVAL');
  });

  test('rechazar por la ruta guarda el motivo', async () => {
    ponerUsuarioAppId('u-mgr');
    const res = await DECIDIR(req({ id: 'p-t1', action: 'reject', reason: 'Duplicada' }, sesion));
    assert.equal(res.status, 200);
    assert.equal(bd.Purchase.find((p) => p.id === 'p-t1').rejection_reason, 'Duplicada');
  });
});

describe('GET /api/purchases/approvers', () => {
  test('sin contexto: 400', async () => {
    const res = await GET_APROBADORES(req(undefined));
    assert.equal(res.status, 400);
  });

  test('el dueno ve solo los aprobadores de su empresa y sus candidatos', async () => {
    ponerUsuarioAppId('u-mgr');
    const res = await GET_APROBADORES(req(undefined, sesion));
    const body = await res.json();

    assert.equal(res.status, 200);
    assert.deepEqual(body.aprobadores.map((a) => a.user_id), ['u-designado']);
    assert.equal(body.puedeGestionar, true);
    // `u-designado` ya esta designado; los candidatos son los otros miembros.
    assert.deepEqual(body.candidatos.map((c) => c.id), ['u-mgr', 'u-miembro']);
    assert.equal(body.aprobadores[0].nombre, 'Dora Designada');
  });

  test('un miembro no designado no ve candidatos ni puede gestionar, pero puede leer', async () => {
    ponerUsuarioAppId('u-miembro');
    const res = await GET_APROBADORES(req(undefined, sesion));
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.puedeGestionar, false);
    assert.equal(body.puedeAprobar, false);
    assert.deepEqual(body.candidatos, []);
  });

  test('un aprobador designado ve puedeAprobar=true sin ser dueno', async () => {
    ponerUsuarioAppId('u-designado');
    const res = await GET_APROBADORES(req(undefined, sesion));
    const body = await res.json();
    assert.equal(body.puedeGestionar, false);
    assert.equal(body.puedeAprobar, true);
  });

  test('no filtra los aprobadores de la hermana', async () => {
    ponerUsuarioAppId('u-mgr');
    const res = await GET_APROBADORES(req(undefined, sesion));
    const body = await res.json();
    assert.deepEqual(body.aprobadores.map((a) => a.id), ['ap-t1']);
  });
});

describe('POST / DELETE aprobadores', () => {
  test('solo el dueno designa; un miembro recibe 403', async () => {
    ponerUsuarioAppId('u-miembro'); // contador de la empresa, pero no dueno
    const res = await POST_APROBADOR(req({ userId: 'u-mgr' }, sesion));
    assert.equal(res.status, 403);
    assert.equal(bd.PurchaseApprover.length, 2);
  });

  test('el dueno designa y es idempotente', async () => {
    ponerUsuarioAppId('u-mgr');
    const res1 = await POST_APROBADOR(req({ userId: 'u-mgr' }, sesion));
    assert.equal(res1.status, 201);
    assert.equal(bd.PurchaseApprover.length, 3);

    const res2 = await POST_APROBADOR(req({ userId: 'u-mgr' }, sesion));
    assert.equal(res2.status, 201);
    assert.equal(bd.PurchaseApprover.length, 3);
  });

  test('404 al borrar un aprobador de otra empresa', async () => {
    ponerUsuarioAppId('u-mgr');
    const res = await DELETE_APROBADOR(req(undefined, { ...sesion, url: 'http://localhost/api/purchases/approvers', search: 'id=ap-t2' }));
    assert.equal(res.status, 404);
    assert.equal(bd.PurchaseApprover.length, 2);
  });

  test('400 sin id', async () => {
    ponerUsuarioAppId('u-mgr');
    const res = await DELETE_APROBADOR(req(undefined, { ...sesion, url: 'http://localhost/api/purchases/approvers' }));
    assert.equal(res.status, 400);
  });

  test('el dueno borra el propio', async () => {
    ponerUsuarioAppId('u-mgr');
    const res = await DELETE_APROBADOR(req(undefined, { ...sesion, url: 'http://localhost/api/purchases/approvers', search: 'id=ap-t1' }));
    assert.equal(res.status, 200);
    assert.equal(bd.PurchaseApprover.find((a) => a.id === 'ap-t1'), undefined);
  });
});
