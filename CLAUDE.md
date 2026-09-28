@AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Enterprise-Ready Files (18 Sept 2026)

### New Files
- `lib/supabase-client-jwt.ts` — Supabase client with Clerk JWT for RLS
- `supabase/outbox-audit.sql` — Outbox pattern for async audit logs (`audit_outbox`, idempotent, `to_jsonb`)
- `supabase/fix-audit-triggers-jsonb.sql` — Minimal function-only audit trigger fix (21 Sept 2026)
- `app/api/pdf-export/route.ts` — PDF generation with Supabase Storage caching
- `lib/middleware/fiscal-validation.middleware.ts` — CAI validation middleware

### Modified Files
- `lib/audit-middleware.ts` — Outbox Pattern for audit logs (`audit_outbox` via Prisma)
- `lib/supabase-client-direct.ts` — Added `createSupabaseClientFromRequestHeaders()`
- `lib/services/pdf-export.ts` — Added Supabase Storage caching
- `lib/services/transaction-service-enhanced.ts` — Zod validation
- `lib/services/year-end-closing.ts` — Period closing snapshots
- `prisma/schema.prisma` — Added `AuditOutbox` and `PeriodClosingBalance` models
- `middleware.ts` — Added `x-user-jwt` header
- `package.json` — Added CI/CD migration scripts

### Update (21 Sept 2026)
- `supabase/outbox-audit.sql` — Triggers now use `to_jsonb(NEW/OLD)` + exception guard; script is idempotent (no more `cannot cast type Transaction to jsonb`, no deadlocks 40P01)
- `app/companies/[id]/accounting/page.tsx` — "Plantillas" tab with 6 downloadable Excel import templates
- `components/accounting/ExcelBooksUploader.tsx` — Removed template download buttons
- `app/reports/annual-tax` — New annual ISV/ISR/withholding declarations page
- `lib/reports/balance-general.ts` — Shared balance sheet utils (classification, transform, grouping, liquidity ratios)
- `components/financials/BalanceSheetComparative.tsx` — Independent period comparatives component
- `app/companies/[id]/accounting/financial-statements/balance-general/page.tsx` — Excel + PDF export and integrated liquidity ratios

### Update (22 Sept 2026)
- `lib/reports/income-statement.ts` — Shared income statement (P&L) utils (classification, transform, grouping, category margins, margin summary, run-rate projections, break-even)
- `components/financials/IncomeStatementComparative.tsx` — Independent period comparatives (prev month / prev year) with variances
- `app/companies/[id]/accounting/financial-statements/estado-resultados/page.tsx` — Margin analysis by category, projections (monthly/quarterly/annual, break-even) and integrated period comparatives
- `lib/reports/cash-flow.ts` — Shared cash flow utils (classification by activity, transform, grouping, sources/uses analysis, run-rate projections, runway)
- `components/financials/CashFlowComparative.tsx` — Independent period comparatives (prev month / prev year) with burn rate / runway analysis
- `app/companies/[id]/accounting/financial-statements/flujo-efectivo/page.tsx` — Integrated sources/uses analysis, cash projections (monthly/quarterly/annual run-rate, 12-month projected balance) and period comparatives

### Update (28 Sept 2026) — Inventario
- `app/api/companies/[id]/inventory/stats/route.ts` — **Nuevo**: API de estadísticas del dashboard de inventario (KPIs, tendencia mensual, entradas/salidas, categorías, top 10 productos, stock por almacén, movimientos recientes; params `months=3|6|12` y `warehouseId`)
- `components/inventory/InventoryDashboard.tsx` — **Nuevo**: Dashboard de inventario (Recharts, filtros período/almacén, export CSV, muestra ubicación en "Top Productos" y "Movimientos Recientes")
- `app/companies/[id]/inventory/dashboard/page.tsx` — **Nuevo**: página del dashboard
- `app/api/inventory/products/route.ts` — POST y PATCH aceptan y persisten `location`
- `app/companies/[id]/inventory/page.tsx` — nueva columna **Ubicación** en la tabla + campo en modales de crear/editar + reset del formulario
- `app/companies/[id]/inventory/kardex/page.tsx` — muestra ubicación en selector de producto y en panel de información
- `prisma/migrations/015_product_location.sql` — **Nuevo**: `ALTER TABLE product ADD COLUMN IF NOT EXISTS location TEXT` + índice (ejecutar en SQL Editor de Supabase)
- `app/companies/[id]/modules/page.tsx` y `components/RoleBasedSidebar.tsx` — Inventario apunta a `/inventory/dashboard`

### Update (28 Sept 2026) — Fotos de Producto
- `prisma/migrations/016_product_image_url.sql` — **Nuevo**: `ALTER TABLE product ADD COLUMN IF NOT EXISTS image_url TEXT` (ejecutar en SQL Editor de Supabase)
- `supabase/PRODUCT_PHOTOS.sql` — **Nuevo**: bucket público `product-photos` (5MB, imagenes) + policies de upload/read/delete (ejecutar en SQL Editor de Supabase)
- `app/api/inventory/products/image/route.ts` — **Nuevo**: POST sube a Storage y persiste `image_url` en `product` (con `productId` opcional); DELETE elimina archivo y limpia la columna
- `app/api/inventory/products/route.ts` — POST y PATCH aceptan `imageUrl`
- `components/inventory/ProductPhotoUploader.tsx` — **Nuevo**: widget de foto (preview, subir/cambiar/quitar, valida imagen y 5MB)
- `app/companies/[id]/inventory/page.tsx` — columna **Foto** con miniatura en la tabla + widget en modales de crear/editar + campo `imageUrl` en estados y formularios

### Update (28 Sept 2026) — Tabla maestra de Ubicaciones
- `prisma/migrations/017_location_master.sql` — **Nuevo**: tabla `product_location` (tenant_id, company_id, code, name, aisle, shelf, description, is_active) + columna `product.location_id` (ejecutar en SQL Editor de Supabase)
- `supabase/LOCATION_MASTER.sql` — **Nuevo**: RLS de `product_location` por tenant (ejecutar en SQL Editor de Supabase)
- `lib/services/location-service.ts` — **Nuevo**: CRUD de ubicaciones (list/create/update/delete, conteo de productos por ubicación, manejo de migración pendiente)
- `app/api/companies/[id]/inventory/locations/route.ts` + `[locationId]/route.ts` — **Nuevos**: GET/POST y PUT/DELETE
- `components/inventory/LocationsManager.tsx` — **Nuevo**: pestaña CRUD "Ubicaciones" (nombre, pasillo, estante, contador de productos, activar/desactivar/eliminar, aviso de migración pendiente)
- `app/companies/[id]/inventory/page.tsx` — nueva pestaña **Ubicaciones**; el formulario de producto usa un Select de ubicaciones maestras (fallback a texto libre si no hay)
- `app/api/inventory/products/route.ts` — POST/PATCH aceptan `locationId` (→ `location_id`)

### Update (28 Sept 2026) — Fixes y Precios
- `app/api/user/profile/route.ts` — Fix 500: usa `getSupabaseServer()` + `currentUser()` de Clerk
- 12 rutas API migradas de browser client a `getSupabaseServer()` (server-lazy): `app/api/billing/products`, `payment-receipts`, `payment-links`, `customers`, `cai`, `cai/debug`, `bank-accounts`, `app/api/setup/integrated-books`, `app/api/accounting/integrated-books`, `transactions`, `trial-balance`, `accounts/route_fixed.ts`
- `prisma/migrations/014_supplier_price_history.sql`, `supabase/014_supplier_price_history_rls.sql` — **Nuevos**: tabla `supplier_price_history` + RLS (ejecutar en SQL Editor de Supabase)
- `app/api/suppliers/price-history/route.ts` — **Nuevo**: historial de precios por proveedor
- `components/purchasing/SupplierPriceHistory.tsx` — **Nuevo**: UI de historial de precios en Compras
