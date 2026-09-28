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

### Update (28 Sept 2026) — Dashboard de Facturación y Ventas
- `app/api/companies/[id]/billing/stats/route.ts` — **Nuevo**: API de stats del dashboard de facturación (KPIs: emitidas/pagadas/pendientes/vencidas, ingresos, ISV, por cobrar, crecimiento; tendencia mensual, distribución por estado, top 5 clientes, top 10 productos vía InvoiceItem, 10 facturas recientes; params `months=3|6|12` y `status`). Filtra por `tenantId` (la tabla `Invoice` no tiene `company_id` en la BD; los montos se guardan en lempiras, no en centavos).
- `components/billing/BillingDashboard.tsx` — **Nuevo**: Dashboard de facturación/ventas (Recharts, filtro de período, export CSV, menú a Módulos)
- `app/companies/[id]/billing/dashboard/page.tsx` — **Nuevo**: página del dashboard
- `app/companies/[id]/modules/page.tsx` — módulo `invoicing` ahora apunta a `/billing/dashboard` (antes `/billing/pos`, que no existía)
- Nota: `components/sales/SalesDashboard.tsx` está **huérfano** y roto (usa tablas inexistentes `AccountReceivable`/`Customer`, divide montos por 100 y no filtra por tenant); no está referenciado. No borrar sin confirmación.

### Update (28 Sept 2026) — Configuración de Factura
- `app/api/companies/[id]/billing/config/route.ts` — **Nuevo**: API unificada GET+PUT de config de factura por empresa/tenant. GET devuelve emisor (Tenant + companies), logo (signed URL desde bucket `company-logos`), lista de CAI (`cai` snake_case real) y settings JSon (`system_config` key `invoice_settings`). PUT persiste emisor en columnas canónicas de `Tenant`/`companies`, `logourl`, y hace upsert de `system_config`. **No depende de localStorage ni de las rutas rotas.**
- `app/api/companies/[id]/billing/config/cai/route.ts` — **Nuevo**: GET lista + POST crea CAI (valida longitud 32-37, rango, correlativo y unicidad por tenant; escribe la tabla `cai` con `status` TEXT `'active'/'inactive'` como usa la emisión).
- `app/api/companies/[id]/billing/config/cai/[caiId]/route.ts` — **Nuevo**: PUT edita y DELETE elimina CAI (bloquea si hay facturas asociadas).
- `app/api/companies/[id]/billing/config/logo/route.ts` — **Nuevo**: POST sube logo al bucket `company-logos` en `{tenantId}/logo-{ts}.{ext}` y devuelve path+signed URL.
- `components/billing/InvoiceSettings.tsx` — **Nuevo**: UI de configuración con 4 tabs (Emisor + logo, CAI/Talonarios con CRUD en modal, Impresión con footer/QR/barcode/moneda/idioma, Impuestos ISV).
- `app/companies/[id]/billing/settings/page.tsx` — **Nuevo**: página de configuración de la factura.
- `components/billing/BillingDashboard.tsx` — botón **Configurar Factura** (header + menú) → `/companies/[id]/billing/settings`.
- Pendiente de aplicar en BD: nada nuevo (usa columnas existentes de `Tenant`, `companies`, `cai`, `system_config`).

### Update (28 Sept 2026) — Multi-impuestos
- `app/api/companies/[id]/billing/config/route.ts` — `tax` ahora incluye `taxes: TaxEntry[]` (id, name, rate, isDefault, isActive). `sanitizeTaxes()` valida/normaliza (filtra tasas fuera de 0-100, genera ids); en PUT, `defaultRate` se sincroniza con el impuesto marcado como principal. Default de arranque: ISV 15% (principal) e ISV 18%.
- `components/billing/InvoiceSettings.tsx` — pestaña **Impuestos** reescrita: agregar/eliminar múltiples impuestos, editar nombre y tasa, marcar uno como **Principal** y activar/desactivar cada uno.

### Update (28 Sept 2026) — Preview de factura
- `components/billing/InvoicePreviewLive.tsx` — **Nuevo**: preview en vivo de la factura al pie de la página de configuración. Refleja datos reales guardados (emisor, logo, CAI activo, impuestos, ajustes de impresión) con items de ejemplo; muestra QR/código de barras según config, texto de pie, moneda y aviso si no hay CAI.
- `components/billing/InvoiceSettings.tsx` — monta `<InvoicePreviewLive>` al final de la página (se actualiza en vivo, sin necesidad de guardar) usando `activeCai` = CAI activo o el primero disponible.

### Update (28 Sept 2026) — Fix POST CAI 400
- `components/billing/InvoiceSettings.tsx` — **Fix**: `Number('')` producía `0` y disparaba 400 ("El número actual debe estar dentro del rango") al dejar vacío *Correlativo Actual*. Ahora convierte campos vacíos a `undefined` (`toNumber`) para que el backend aplique sus defaults, valida en cliente con mensajes por campo y **mantiene el modal abierto** mostrando el error en un bloque rojo (`caiError`) en vez de cerrarlo.
- `app/api/companies/[id]/billing/config/cai/route.ts` — **Fix**: `currentNumber = num(body.currentNumber) || rangeStart` (antes `num(body.currentNumber ?? body.rangeStart ?? 0)`, que no caía al fallback cuando llegaba `0`).

### Update (28 Sept 2026) — Fix esquema real de la tabla `cai`
- **La tabla `cai` tiene DOS esquemas superpuestos** (verificado contra Supabase): el español de `supabase/create_cai_talonarios_fixed.sql` (`cai_number` VARCHAR NOT NULL UNIQUE, `company_id`, `fecha_asignacion`, `fecha_limite_emision`, `rango_inicial`, `rango_final`, `cantidad_recibos`, `recibos_utilizados`, `recibos_disponibles`, `estado` 'activo'/'inactivo', `current_correlative`) y el legacy en inglés agregado por `FIX_COLUMNS.sql` (`cai`, `start_number`, `end_number`, `current_number`, `issue_date`, `expiration_date`, `status` 'active'/'inactive', `tenant_id`).
- **La emisión de facturas depende del esquema legacy**: `app/api/billing/invoices/route.ts` actualiza `current_number` filtrando por `cai` + `tenant_id`. Por eso hay que escribir AMBOS, no solo uno.
- `app/api/companies/[id]/billing/config/cai/route.ts` — POST ahora insierte las dos convenciones de columnas (POST 500 `null value in column "cai_number"` resuelto); el chequeo de duplicados usa `.or('cai.eq.X,cai_number.eq.X')`; el GET lee ambas y resuelve por prioridad `cai`→`cai_number`, `start_number`→`rango_inicial`, `status`→`estado` ('active'/'activo'), `expiration_date`→`fecha_limite_emision`.
- `app/api/companies/[id]/billing/config/cai/[caiId]/route.ts` — PUT actualiza ambos esquemas (sincroniza `cai_number`, `rango_*`, `current_correlative`, `recibos_*`, `estado`); DELETE cuenta facturas usando los códigos de `cai` y `cai_number`.
- `app/api/companies/[id]/billing/config/route.ts` — `CaiRow` con campos opcionales de ambos esquemas y mismo mapeo con fallback en el GET.
- Nota: los CAIinsertados por la app satisfy NOT NULL de ambos esquemas; no se requiere migración.

### Update (28 Sept 2026) — Email/RTN del emisor sin sufijos
- **Bug**: `lib/actions/onboarding.ts` creaba el tenant con `email+<tenantCode>@dominio` y `<rtn>-<timestamp>` para evadir el UNIQUE de `Tenant.businessemail`. Esos valores se imprimían en las facturas (`dentaldiamondhn+TEST1DS@gmail.com`, RTN `0101-0220-312304-1789620883990`).
- `lib/billing/issuer-sanitizer.ts` — **Nuevo**: `sanitizeBusinessEmail()` (quita `+algo` antes del `@`) y `sanitizeBusinessRTN()` (acepta 14 dígitos, `4-4-6` con guiones, ambos con o sin sufijo numérico; no toca placeholders `TEMP-*`).
- `app/api/companies/[id]/billing/config/route.ts` — el GET sanea `businessEmail` y `businessRTN` del emisor, así que la factura y el preview ya muestran los valores reales aunque la fila siga alterada.
- `lib/actions/onboarding.ts` — **Fix raíz**: guarda el email y el RTN reales (`String(...).trim()`), sin `+code` ni `-timestamp`. Nuevo helper `insertTenantWithFiscalFallback()`: inserta con los valores reales y, solo ante error `23505` (unique_violation), reintenta una vez con el sufijo `+<tenantId>` para no romper el onboarding. Aplicado en los 2 sitios de creación de tenant.
- `prisma/migrations/020_tenant_fiscal_data_not_unique.sql` — **Nuevo, PENDIENTE de ejecutar en Supabase**: quita el UNIQUE `Tenant_New_businessemail_key` (deja índice no único) y limpia los valores alterados con `regexp_replace`. Es idempotente. **No se puede aplicar desde la app**: no hay RPC de DDL (`exec_sql`/`execute_sql` no existen) y el UNIQUE bloquea el update por REST (verificado: 409 `23505`).
