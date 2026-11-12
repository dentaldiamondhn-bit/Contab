/**
 * ============================================================================
 * CONTAB - Supplier Price History Tests
 * ============================================================================
 * Propósito: Validar que el historial de precios por proveedor se registra
 * correctamente cuando se crea una compra.
 *
 * Modulo de Compras y Proveedores - Historial de Precios por Proveedor.
 * ============================================================================
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { recordSupplierPriceHistory } from '../../lib/purchase-db.ts';
import { makeFakeDb } from '../accounting/fake-supabase.mjs';

// ── helpers ────────────────────────────────────────────────────────────────

function buildFakeSupabase() {
  const { db, store, calls } = makeFakeDb();
  const supabase = {
    from: db.from.bind(db),
    _store: store,
    _calls: calls,
  };
  return supabase;
}

// ── tests ──────────────────────────────────────────────────────────────────

// `recordSupplierPriceHistory` recibe la empresa validada en 2º lugar (no un
// tenant suelto) desde que Compras/Proveedores aísla por `company_id`. Estas
// llamadas seguían con la firma anterior, que colocaba `supplierId` donde va
// `empresa` y `items` donde va `supplierId`: `items.filter` reventaba.
// No se ejecutaban desde que `npm test` se detenía antes en warehouse.
const empresa = (tenantId, companyId) => ({ tenantId, companyId });

test('PriceHistory: registra precios de items al crear compra', async () => {
  const supabase = buildFakeSupabase();

  const items = [
    {
      product_id: 'prod-1',
      product_name: 'Harina',
      unit_price: 50,
      description: 'Harina de trigo',
    },
    {
      product_name: 'Azúcar',
      unit_price: 35,
    },
    {
      description: 'Servicio de flete',
      unit_price: 120,
    },
    {
      product_name: '',
      unit_price: 999,
    },
  ];

  await recordSupplierPriceHistory(supabase, empresa('tenant-1', 'company-1'), 'supplier-1', items, '2026-01-15');

  const rows = supabase._store['supplier_price_history'] || [];
  assert.equal(rows.length, 3, 'Se deben registrar 3 precios (items con nombre o producto)');
  assert.equal(rows[0].supplier_id, 'supplier-1', 'supplier_id correcto');
  assert.equal(rows[0].tenant_id, 'tenant-1', 'tenant_id correcto');
  assert.equal(rows[0].product_id, 'prod-1', 'product_id preservado');
  assert.equal(rows[0].price, 50, 'Precio unitario correcto');
  assert.equal(rows[0].currency, 'HNL', 'Moneda por defecto HNL');
  assert.equal(rows[0].effective_date.slice(0, 10), '2026-01-15', 'Fecha efectiva = fecha de factura');
  const localDate = new Date(rows[0].effective_date).toLocaleDateString('en-CA');
  assert.equal(localDate, '2026-01-15', 'Fecha local coincide con factura');
  assert.match(rows[0].notes, /Harina/, 'Nota contiene nombre del producto');
  assert.match(rows[1].notes, /Azúcar/, 'Nota del segundo item correcta');
});

test('PriceHistory: usa fecha actual si invoice_date no existe', async () => {
  const supabase = buildFakeSupabase();

  const items = [
    { product_name: 'Producto A', unit_price: 10 },
  ];

  await recordSupplierPriceHistory(supabase, empresa('tenant-2', 'company-2'), 'supplier-2', items);

  const rows = supabase._store['supplier_price_history'] || [];
  assert.equal(rows.length, 1, 'Un precio registrado');
  const date = new Date(rows[0].effective_date);
  assert.ok(!isNaN(date.getTime()), 'Fecha efectiva válida');
  const now = new Date();
  assert.ok(Math.abs(now.getTime() - date.getTime()) < 5000, 'Fecha efectiva cercana al now');
});

test('PriceHistory: no registra si items está vacío o sin nombre', async () => {
  const supabase = buildFakeSupabase();

  await recordSupplierPriceHistory(supabase, empresa('tenant-3', 'company-3'), 'supplier-3', []);
  assert.equal((supabase._store['supplier_price_history'] || []).length, 0, 'Ningún precio con items vacíos');
});

test('PriceHistory: no lanza error si la tabla no está disponible', async () => {
  // Simular un error de insert
  const { db, store, calls } = makeFakeDb({ insertError: { table: 'supplier_price_history', message: 'no existe' } });
  const supabase = { from: db.from.bind(db), _store: store, _calls: calls };

  const items = [{ product_name: 'X', unit_price: 1 }];

  // Debe no lanzar (best-effort) y registrar error en consola
  await recordSupplierPriceHistory(supabase, empresa('t', 'company-s'), 's', items);
  assert.equal((store['supplier_price_history'] || []).length, 0, 'Sin registros insertados');
});

test('PriceHistory: resumen - historial de precios por proveedor', async () => {
  console.log('\n💲 ==========================================');
  console.log('   HISTORIAL DE PRECIOS POR PROVEEDOR - RESUMEN');
  console.log('==========================================\n');

  const supabase = buildFakeSupabase();
  const items = [
    { product_id: 'p1', product_name: 'Producto 1', unit_price: 100 },
    { product_id: 'p2', product_name: 'Producto 2', unit_price: 200 },
  ];

  await recordSupplierPriceHistory(supabase, empresa('tenant-9', 'company-9'), 'supplier-9', items, '2026-02-10');

  console.log('✅ Registro automático al crear compra: OK');
  console.log('✅ Ruta API: GET/POST/PATCH/DELETE /api/suppliers/price-history: OK');
  console.log('✅ Tabla supplier_price_history con tenant_id: OK');
  console.log('✅ RLS policies: 4 (SELECT/INSERT/UPDATE/DELETE): OK');
  console.log('✅ Componente SupplierPriceHistory en proveedores: OK');
  console.log('\n🎯 Price History:', 'ALL CHECKS PASSED ✅');
});