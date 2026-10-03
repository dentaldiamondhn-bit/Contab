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

- `components/billing/BillingDashboard.tsx` — botón **Punto de Venta** (header + menú) → `/companies/[id]/billing/pos`. El POS **sí existe** (`app/companies/[id]/billing/pos/page.tsx`); sequitó antes el enlace del módulo por error.
- `app/companies/[id]/billing/pos/page.tsx` — **Fix**: `loadCAIInfo`, `loadCustomers` y `loadProducts` estaban definidas pero nunca se invocaban (el `useEffect` estaba importado y sin usar), así que la página cargaba sin CAI, sin clientes y sin productos, y `generateInvoiceNumber()` devolvía `''`. Ahora se llaman en un `useEffect` con dep `[companyId]`.

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
- `prisma/migrations/020_tenant_fiscal_data_not_unique.sql` — **Nuevo, YA EJECUTADO en Supabase**: quita los UNIQUE de `businessemail`, `business_email`, `businessrtn` y `business_rtn` (deja índices no únicos), limpia los valores alterados con `regexp_replace` y propaga a las columnas espejo. Es idempotente y se aplicó en 2 vueltas (la primera falló con 23505 sobre `Tenant_business_email_key`, por eso el DO block es genérico). Verificado por REST: no quedan UNIQUE, el mismo email/RTN de `ANGELOH7`/`TEST185`/`TEST1DS` devuelve 200. Los tenants con placeholders quedaron en `noreply@example.com` y `TEMP-*`; hay que cargarlos con datos reales.

### Update (28 Sept 2026) — Envío de factura por correo desde el POS
- **Antes no había ninguna infraestructura de correo**: sin proveedor, sin variables de entorno, sin endpoint de envío. `lib/mail.ts` es un stub simulado con un import roto (`renderModuleUpdateEmail` desde un módulo `emails/` inexistente); **no tocar, no se usa**. La pestaña SMTP de `app/admin/company/[id]/page.tsx` sigue siendo solo UI.
- `package.json` — **`resend@6.30.0`** agregada como dependencia.
- `lib/email/send.ts` — **Nuevo**: capa de envío sobre Resend. `sendEmail()` acepta `to, subject, html, text, replyTo, attachments` (adjuntos como `Buffer`), **no lanza excepciones** (devuelve `{success, id?, error?, notConfigured?}`) para que la ruta pueda responder 502/503 con mensaje útil. `isEmailConfigured()` detecta si falta la credencial. Remitente desde `EMAIL_FROM`, con fallback `Facturación <onboarding@resend.dev>`.
- `lib/email/invoice-email.ts` — **Nuevo**: `buildInvoiceEmailHtml()` / `buildInvoiceEmailText()` con la tabla de ítems, subtotal/ISV/total y un placeholder `<!--CUSTOM_MESSAGE-->` para la nota del emisor. Formatea con el símbolo de `HNL`/`USD`/`EUR` y escapa el HTML.
- `app/api/billing/invoices/[id]/send-email/route.ts` — **Nuevo**: POST `{email?, companyId, customerName?, subject?, message?}` → `503` si no hay `RESEND_API_KEY`, `400` destinatario inválido o ausente, `404` factura no encontrada. **Orden de validación deliberado**: (1) configuración del proveedor, (2) `companyId`, (3) `fetchInvoiceData` —que valida que la factura pertenezca al tenant y evita fuga cruzada entre empresas—, (4) destinatario. Reusa `fetchInvoiceData` + `buildPdfDocument('invoice')` + `renderPdfDocument`, así que el adjunto es **el mismo PDF real** que sirve `/api/documents/pdf`. `runtime = 'nodejs'` porque `@react-pdf/renderer` y los adjuntos `Buffer` no funcionan en Edge. La moneda y el correo del cliente no vienen en `InvoicePdfData`, así que `readInvoiceMeta()` los lee de la fila `Invoice` (acepta `customerEmail` y `customer_email`; fallback de moneda `HNL`).
- `app/companies/[id]/billing/pos/page.tsx` — botón **Enviar por correo** en el header que abre un panel con correo (obligatorio, prellenado desde `customer.email` al elegir cliente), asunto y mensaje opcionales. `canIssueInvoice()` exige un correo válido si la casilla está activa, y `issueInvoice()` envía **después** de crearla, antes de `resetInvoiceForm()`. `resetInvoiceForm()` limpia `customerEmail` para que la factura siguiente no vaya al cliente anterior; el reenvío usa `lastSentEmail`. Estado de éxito/error en el panel.
- **El correo del cliente ahora queda en la factura**: el POS manda `customer.email` dentro de `invoiceData.customer` y `app/api/billing/invoices/route.ts` lo persiste en `Invoice.customerEmail` (validando el formato; `null` si no viene o no es válido). Antes se guardaba siempre `null`. Gracias a esto `email` es **opcional** en la ruta de envío: si el cuerpo no lo trae, se usa el de la factura.
- `.env.example` — documenta `RESEND_API_KEY` y `EMAIL_FROM`.
- **Verificado sin credenciales**: 19/19 pruebas sobre `lib/email/*` (HTML con marcador `<!--CUSTOM_MESSAGE-->`, escapado de HTML en nombre del cliente y descripciones — un `<img onerror=…>` llega como texto, total con separador de miles, símbolos de `HNL`/`USD`, `isEmailConfigured()`, error `notConfigured` sin key, destinatario inválido rechazado *antes* de la comprobación de configuración, y una key inválida real que produce el 401 de Resend controlado sin lanzar excepción). El adjunto se comprobó renderizando de verdad la factura `001-01-01-00000006` de `ANGELOH7`: `%PDF-1.3`, 1 página, 5072 bytes, 167 ms, `factura_001-01-01-00000006.pdf`.
- `sendEmail()` valida el **destinatario antes** que la configuración: sin key y con destinatario inválido devuelve el error del destinatario, no "no configurado".
- **Las rutas API no se pueden probar por HTTP sin sesión**: `middleware.ts` aplica `auth.protect()` a todo lo que no está en `isPublicRoute`, así que sin cookie de Clerk las rutas devuelven `x-clerk-auth-reason: protect-rewrite, dev-browser-missing` y HTML en vez de JSON. La ruta de email queda por tanto correctamente autenticada.
- `app/api/billing/invoices/route.ts` — persiste `Invoice.customerEmail` desde `invoiceData.customer.email` (validando el formato; `null` si falta o es inválido). Antes era `null` fijo, así que el PDF y la ruta de correo no tenían el destinatario de la factura.
- **Falta configurar la credencial**: hasta poner `RESEND_API_KEY` en `.env.local` la opción responde 503 con aviso (aún no se ha probado un envío real).

### Update (28 Sept 2026) — Items del POS salen del inventario de la empresa
- **Bug raíz: `tenant_id` fijo en `"1"`** en `app/api/billing/products/route.ts`, `app/api/billing/customers/route.ts` y `app/api/billing/bank-accounts/route.ts`. El POS vive en `/companies/[id]/billing/pos`, así que **el POS de cualquier empresa listaba los productos, clientes y cuentas de "Empresa 1"** y nunca los suyos. Las tres rutas ahora resuelven el tenant con `resolveTenant()`: `?companyId=` (el id de la URL del POS) → header `x-tenant-id` de `middleware.ts` → `?tenantId=`; si no hay ninguno devuelven `400` en vez de caer a la empresa 1. El POST de las tres acepta el tenant en vez de escribir `'1'`.
- **Los precios del inventario están en lempiras, no en centavos** (consistente con `InvoiceItem.unitPrice` y con `Invoice.subtotal`). La ruta dividía `unit_price / 100`, así que los Guantes de L 2 se veían como L 0.02. Se quitó la división y también el `* 100` del POST. Ojo: los 6 productos del tenant `1` tienen valores con pinta de centavos (50000, 30000, 2000, 8000) y probablemente quedaron inflados ×100 por ese POST; **no se tocaron, es un dato que hay que confirmar con el usuario**.
- **El stock real es `current_stock`**, no `stock_quantity` (`app/api/inventory/products/route.ts:42` lo lee así y escribe ambos). Los 6 productos del tenant `1` tienen `stock_quantity = 0` con `current_stock = 100`. La ruta de billing ahora devuelve `stock` con ese fallback.
- `app/companies/[id]/billing/pos/page.tsx` — `loadProducts()`/`loadCustomers()` pasan `?companyId=`; `selectProduct()` guarda `productId` (además de `code`/`name`/`unitPrice`/`taxRate`); los filtros de búsqueda ya no rompen con `code`/`name` nulos.
- `prisma/migrations/021_invoiceitem_product_id.sql` — **Nuevo, PENDIENTE de aplicar en el SQL Editor de Supabase**: `ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS product_id TEXT` + índice parcial. Antes la línea solo se ligaba al inventario por `productCode`, que es texto libre y se repite entre empresas: la factura `001-01-01-00000008` de `ANGELOH7` referenciaba `PRD-001`, que es del tenant `1`. La ruta persiste `product_id` y, si la columna aún no existe, reintenta sin ella (PostgREST devuelve `PGRST204`), así que la emisión no queda bloqueada antes de aplicar la migración.
- `app/api/billing/invoices/route.ts` — **No se emitían facturas sin líneas**: el POS filtra `name && total > 0` y la ruta `name || code`, así que la `001-01-01-00000007` quedó con subtotal 40 y **cero** `InvoiceItem`. Ahora valida las líneas **antes** de crear la factura y responde `400`; y calcula `taxAmount` cuando el POS no lo manda (antes se guardaba siempre `0` aunque la factura cobrara impuesto).
- `components/billing/PaymentLinkGenerator.tsx` — prop opcional `companyId` para pedir las cuentas de la empresa correcta; el `useEffect` de `loadBankAccounts` ahora depende de `[companyId, currency]`.
- **Datos ya corruptos que no se repararon**: `001-01-01-00000006` (subtotal 20 pero su única línea suma 11.5) y `001-01-01-00000008` (línea que apunta a un producto de otra empresa).

### Update (28 Sept 2026) — Descuento de stock al emitir
- `lib/services/stock-sale.ts` — **Nuevo**: `checkSaleStock()` (fase 1, solo lee) y `applySaleStock()` (fase 2, descuenta). Supabase REST no soporta transacciones, así que la comprobación va **antes** de crear la factura y el descuento **después**; si el descuento falla, la ruta borra factura e items y responde 500, y `applySaleStock` devuelve lo aplicado a su valor anterior.
- Descuento con **actualización optimista**: `.update({current_stock: after}).eq('id', id).eq('tenant_id', …).eq('current_stock', stockBefore)`. Si otro proceso movió el stock entre la lectura y la escritura la actualización no afecta filas, se relee y se reintenta (3 veces); si aun así no cuadra, se revierte todo. Verificado: dos ventas simultáneas de 4 unidades con stock 5 → una se aplicó, la otra se rechazó, stock final 1.
- **Idempotente** por `(reference_type='invoice', reference_id=<uuid de la factura>)`: si ya hay movimientos para esa factura no vuelve a descontar. Ojo: `inventory_movement.reference_id` es **UUID**, no texto.
- Solo descuenta líneas con `productId` y con `is_service !== true` (los servicios no llevan control de existencia; los "Robotest Item" lo tienen). Agrupa por producto: el mismo producto en dos líneas suma. Bloquea si un `product_id` apunta a un producto **de otra empresa** (el bug que ya había corrompido facturas). Las líneas escritas a mano (sin `productId`) no tocan inventario.
- Cada descuento deja su fila en `inventory_movement` con `movement_type='OUT'`, `movement_reason='sale'`, `stock_before`/`stock_after`, `warehouse_id` del producto y `unit_cost` de `current_cost`, igual que el módulo de inventario.
- `app/api/billing/invoices/route.ts` — llama a `checkSaleStock` antes de crear la factura (400 con la lista de faltantes) y a `applySaleStock` después de insertar las líneas.
- `app/companies/[id]/billing/pos/page.tsx` — el buscador muestra el stock (rojo si es 0) y omite el stock en servicios; `stockShortages()` avisa antes de emitir y el POS muestra los `shortages` que devuelve el servidor; tras emitir recarga `loadProducts()` para reflejar el descuento.
- **Verificado contra la BD con 24 pruebas, todas en verde**, y con el inventario restaurado a su estado original (Guantes 51, gasas 50, Robotest 4/12/8) y sin movimientos residuales.
- Sigue pendiente: `app/api/inventory/movements/route.ts:119` escribe `tenant_id: "1"` fijo en sus movimientos.

### Update (28 Sept 2026) — Aislamiento por tenant en todo el inventario
- **Bug raíz: `tenant_id` fijo en `"1"`**. El inventario de cualquier empresa consultaba el de "Empresa 1". Todas las rutas usan ahora el mismo helper `resolveTenant()`: `?companyId=` (el id de la URL de la pantalla) → header `x-tenant-id` de `middleware.ts` → `?tenantId=`; **sin ninguno devuelven `400` en vez de caer a la empresa 1**. El header va por encima de `?tenantId` a propósito: la sesión es la autoridad.
- Rutas corregidas: `app/api/inventory/{adjustments,warehouses,accounting,alerts,movements,products}/route.ts` y `app/api/billing/cai/route.ts`.
- `app/api/inventory/adjustments/route.ts` — el GET usaba un `status` no declarado (el `window.status` del DOM) y el POST generaba el correlativo `AJ-#####` sobre el último ajuste **de la empresa 1**, así que dos empresas generaban el mismo número y el ajuste se guardaba en el tenant equivocado. Correlativo por tenant, con `maybeSingle()` y `Number.isFinite` (un `AJ-abc` ya no produce `NaN`). Si falla el insert de items se borra el ajuste, para no dejar un borrador con total 0 que luego se aplicaría al inventario.
- `app/api/inventory/accounting/route.ts` — **la ruta estaba muerta**: el `fetch` interno a `/api/accounting/transactions` no pasaba tenant ni por header ni por query, y esa ruta solo lee el tenant de ahí, así que los 4 tipos de asiento (`COMPRA`, `EGRESO` costo de ventas, `AJUSTE`, consumo interno) devolvían **401 siempre**. Ahora un helper `postEntry()` manda `x-tenant-id` + `?tenantId=` + `tenant_id`/`companyId` en el body, con validación previa (400).
- `app/api/inventory/alerts/route.ts` — las alertas de stock bajo se contaban sobre el inventario de la empresa 1.
- `app/api/billing/cai/route.ts` — el POST **desactivaba todos los CAI del tenant `"1"`** antes de insertar, así que registrar un CAI desde otra empresa apagaba los de "Empresa 1" y guardaba el nuevo en su tenant. Corregido con el mismo helper.
- Verificado contra la BD con **24 pruebas, todas en verde**: ANGELOH7 ve 5 productos y no los 6 de la empresa 1; la empresa 1 conserva los suyos; sin tenant `resolveTenant` devuelve `null` (no `"1"`); una bodega creada para ANGELOH7 no aparece en la empresa 1; dos empresas con el mismo producto generan el mismo correlativo pero cada uno con su `tenant_id`. Datos de prueba borrados, typecheck sin errores nuevos (baseline 483).

### Rutas rotas que quedan pendientes (no tocar sin revisar)
- `app/api/billing/payment-receipts/route.ts` — **muerta desde siempre**: consulta `.from("PaymentLink")` y la tabla real es `paymentlink` (PostgREST devuelve `PGRST205`). Además `paymentlink.invoice_id` es un UUID **sin FK a `Invoice`**, así que el embed `Invoice (...)` también fallaría (`PGRST200`), y usa columnas inexistentes (`invoice_number`, `customer_name`; `Invoice` es Prisma camelCase: `invoiceNumber`, `customerName`, `tenantId`). El `tenantId: '1'` del asiento y el `.eq("tenantId","1")` del GET se dejaron a propósito: son inalcanzables mientras la ruta esté muerta, y arreglarlos exige rediseñarla, no parchear el tenant. `paymentlink` tiene 0 filas.
- `app/api/billing/payment-links/route.ts:83` — mismo patrón, `.eq("tenantId","1")`.
- `app/api/accounting/financial-ratios/route.ts:7` y `app/api/accounting/voucher-number/route.ts:8` — fallback `|| '1'` sin `companyId`.

### Update (28 Sept 2026) — Enlaces de pago y comprobantes contra el esquema real
- **Esquema real verificado contra Supabase** (no contra lo que asumía el código): la tabla es **`paymentlink`** en minúsculas, con columna **`tenant_id`**; sus columnas son `amount, bank_account_id, completed_at, created_at, currency, expires_at, id, invoice_id, invoice_number, payment_url, qr_code, receipt_url, status, tenant_id, updated_at`. **`paymentlink` no declara ninguna FK**, ni a `Invoice` ni a `bankaccount`, así que **los embeds de PostgREST son imposibles** (`PGRST200`) y ambas rutas resuelven las relaciones con una segunda consulta. `Invoice` es la tabla de Prisma en camelCase (`invoiceNumber`, `customerName`, `tenantId`, `tax`), y sus estados canónicos son `PAID / PENDING / CANCELLED / OVERDUE` (`PAGADA` y `PENDING_PAYMENT` no existen; en la BD solo hay `PAID`).
- `app/api/billing/payment-receipts/route.ts` — **reescrito, llevaba muerto desde siempre** (fallaba en la línea 40 por `PGRST205`, o sea que subía el comprobante a Storage y devolvía error sin cerrar nada):
  - Valida el tenant (`resolveTenant()`, 400) y busca el enlace por `id` **y** `tenant_id`. Antes el update era solo por `id`: una empresa podía completar el enlace de pago de otra (**IDOR**); ahora responde 404.
  - Sube el comprobante **después** de validar el enlace, para no dejar archivos huérfanos, y con prefijo de tenant en el path (`{tenantId}/receipt-...`), igual que `company-logos`.
  - La factura se busca por `invoice_id` con columnas camelCase y `.eq('tenantId', tenantId)`, y solo se marca `PAID` si no lo estaba.
  - El asiento de cobro se armaba con `accountId: '1101'` / `'1103'` y `type: 'DEBIT'`. **Los códigos reales de `Account` son `1101-01` y `1103.01`** y el servicio espera `{accountId, amount, isDebit}` con importes **con signo** (débito positivo, crédito negativo), no `type`. Ahora usa `resolveAccountId(tenantId, ACCOUNT_PREFIXES.{cash,receivable})` y valida que el asiento sume 0, como `app/api/billing/invoices/route.ts`.
- `app/api/billing/payment-links/route.ts` — **también muerto** por lo mismo. Corregido: `paymentlink` + `tenant_id`, valida que la factura sea de la empresa (antes aceptaba cualquier `invoiceId` y actualizaba la factura sin filtro de tenant), y **quita el `amount * 100`**: los montos van en lempiras como en `Invoice.total`, así que el POST multiplicaba por 100 y el GET dividía por 100.
  - `status: 'PENDING_PAYMENT'` → `'PENDING'`, y **solo** rebaja la factura a pendiente si no está en `PAID`/`CANCELLED`: el POS marca toda factura como `PAID` al emitir, y bajarla a "pendiente" falsearía los ingresos.
- `app/api/accounting/financial-ratios/route.ts` — el `if (!tenantId)` ya existía pero era **código muerto** por el `|| '1'`, así que los ratios de cualquier empresa se calculaban con los datos de "Empresa 1".
- `app/api/accounting/voucher-number/route.ts` — mismo fallback; el correlativo de partida era el de la empresa 1.
- `components/billing/PaymentLinkGenerator.tsx` — manda `?companyId=` y `formData.companyId` a las dos rutas (antes solo dependían del header de `middleware.ts`). Se conserva el contrato de respuesta que usa el componente (`paymentUrl`, `qrCode`, `id`, `status`, `receiptUrl`).
- Verificado contra la BD con **16 pruebas, todas en verde**: el insert en `paymentlink` se acepta y `PaymentLink` da 404; un enlace de ANGELOH7 no aparece para TEST1DS ni se resuelve por id desde otra empresa (0 filas → 404); el select camelCase de `Invoice` funciona y `invoice_number` falla; el embed `BankAccount(...)` falla como se esperaba y la segunda consulta a `bankaccount` sí; el enlace de prueba quedó borrado y el typecheck sigue en el baseline de 483.
- **Hallazgos de datos (no tocados)**: `bankaccount` solo tiene 2 filas y ambas son del tenant `1`, así que el selector de cuentas del POS sale vacío para las demás empresas. `Account` solo tiene `1101-01`/`1103.01` para ANGELOH7; TEST1DS y el tenant `1` no tienen catálogo, por lo que ahí el asiento de cobro se omite con aviso en vez de postear una cuenta inexistente.


### Update (28 Sept 2026) — Correlativo de factura: el servidor es la autoridad
- **Bug**: el POS generaba el numero en el navegador desde el CAI activo, asi que una empresa sin CAI con facturas `00000006..00000008` proponia **`00000001` en cada venta** y el `POST /api/billing/invoices` lo aceptaba tal cual. Ademas la busqueda del "ultimo numero" era global, no por empresa.
- `lib/billing/invoice-number.ts` — **Nuevo**, unica fuente de verdad: `previewInvoiceNumber(tenantId)` (lo que se muestra) y `reserveInvoiceNumber(tenantId, { suelo })` (lo que se emite) derivan el correlativo de la **ultima factura de esa misma empresa** (`order('invoiceNumber', desc).limit(1)`), y si hay un CAI vigente mandan sobre la serie. `isInvoiceNumberTaken(tenantId, numero)` solo mira esa empresa. `ExhaustedCaiError` se lanza al pasarse del rango.
- La serie se formatea a partir del **prefijo real de la ultima factura**, no de constantes fijas:ANGELOH7 emite `001-01-01-00000009` porque sus facturas son `001-01-01-0000000N`, y no `000-01-001-00000001`.
- `app/api/billing/invoices/route.ts` — ignora `invoiceData.invoiceNumber` y usa el correlativo del servidor (avisa por `console.warn` si difiere). Sin fila de CAI no hay nada que reservar, asi que el candado es el UNIQUE: hasta **8 intentos con 50 ms de espera**, y un `suelo` que sube el correlativo en cada choque.
- El **`suelo` es lo que hace funcionar el choque con otra empresa**: si `00000026` lo tiene otra compania, la serie propia (que solo mira sus facturas) volveria a proponer `26` para siempre; con el suelo pide `27`. Sin el, la emision moria con 409 siempre.
- Con CAI la reserva es **condicional** (`.eq('current_number', valorLeido)`) y valida `correlativo > rango_final` **antes** de escribir: si la actualizacion no afecta filas, otro la llevo y se reintenta. Mismo patron que `lib/services/stock-sale.ts`. Al agotarse el rango responde `400` con `code: 'CAI_AGOTADO'` y **no crea factura**.
- `app/api/billing/cai/route.ts` — el GET usa `previewInvoiceNumber` en vez de inventar `currentNumber: 1`; asi el POS y la vista de CAI muestran la misma serie.
- `prisma/migrations/022_invoice_number_unique_per_tenant.sql` — **Nuevo, YA APLICADO en Supabase**: `Invoice_invoiceNumber_key` era un UNIQUE **global**, asi que dos empresas no pueden tener el mismo correlativo (incorrecto: la numeracion fiscal es por emisor). La migracion lo quita y crea `UNIQUE("tenantId", "invoiceNumber")`. Es idempotente y **aborta con el detalle si ya hay duplicados dentro de una misma empresa**. Verificado por comportamiento: `00000077` inserted en ANGELOH7 y en TEST1DS a la vez -> ambos OK; repetido en ANGELOH7 -> `23505`. El `suelo` de la ruta sigue siendo la red de seguridad, pero ya no hace falta esquivar choques.
- Verificado contra la BD con **24 pruebas, todas en verde**: preview continua la serie; 5 facturas seguidas quedan `00000009..00000013` sin huecos ni repeticiones; **8 emisiones simultaneas** las 8 salen con `00000014..00000021`, ninguna repetida; con CAI manda el rango (`22`, `23`) y ambos esquemas quedan en `24`; el CAI agotado lanza, avisa y **no deja pasar `current_number` de 26**; el CAI caducado se ignora y se vuelve a la serie de facturas; cada empresa lleva la suya (TEST1DS en 1, el tenant `1` en 1, sin heredar la de ANGELOH7); y el choque con otra empresa salta al correlativo siguiente. Los datos de prueba quedaron borrados y el typecheck sigue en el baseline de 483.
- **Pendiente**: `app/api/billing/invoices/route.ts` sigue mandando `subtotal`/`tax`/`total` **x100** a `postSalesJournal()`, aunque las facturas estan en lempiras.
---

## Estado al cierre (28 Sept 2026)

### Migraciones SQL: pendientes de aplicar en el SQL Editor de Supabase
| Archivo | Que hace |
|---|---|
| `018_product_location_image_url.sql` | columna `image_url` en `product` |
| `019_product_location_warehouse.sql` | FK `product.location_id` -> `warehouse` |
| `021_invoiceitem_product_id.sql` | columna `product_id` en `InvoiceItem` + indice parcial |
| `020_tenant_fiscal_data_not_unique.sql` | **ya aplicada** (limpia email/RTN alterados) |
| `022_invoice_number_unique_per_tenant.sql` | **ya aplicada y verificada** |

### Bugs conocidos, pendientes
- **Importes x100 al asiento de ventas**: `app/api/billing/invoices/route.ts` manda
  `subtotal`/`tax`/`total` **x100** a `postSalesJournal()`, aunque las facturas estan
  en lempiras. El asiento de cobros ya no lo hace.
- **Asiento de cobro asume venta a credito**: `payment-receipts` credita cuentas por
  cobrar siempre; en una venta de caja el credito a `1103` no tendria débito previo.
- **`stock_quantity` no se sincroniza al vender**: `applySaleStock` solo mueve
  `current_stock`; el espejo `stock_quantity` se queda viejo.
- **Envolturas de `Transaction` en jsonb**: si reaparecen 400 con
  `cannot cast type Transaction to jsonb`, usar `supabase/fix-audit-triggers-jsonb.sql`.

### Datos historicos que siguen corruptos (no tocar sin confirmacion del usuario)
- `001-01-01-00000006` (ANGELOH7): el subtotal no cuadra con sus lineas y apunta a
  productos del tenant `1`. Mismo problema en `001-01-01-00000008`.
- Precios del tenant `1` (`50000`, `30000`, `2000`, `8000`) tienen pinta de estar
  inflados x100 por un POST antiguo.
- `bankaccount` solo tiene 2 filas y ambas del tenant `1`, asi que el selector de
  cuentas del POS sale vacio para las demas empresas. `Account` solo tiene
  `1101-01`/`1103.01` y solo para ANGELOH7.

### Bloqueos de entorno
- `RESEND_API_KEY` y `EMAIL_FROM` sin configurar: el envio de correo responde 503.
- Sin sesion de Clerk no se pueden probar las rutas API por HTTP.
- Typecheck: baseline de **483** errores preexistentes.
### Update (28 Sept 2026) — Revision de aislamiento entre tenants y empresas
Se reviso el aislamiento de las ~90 rutas de `app/api/**` contra la BD real. Salieron
**86 hallazgos**; se corrigieron los de mayor gravedad y se documenta el resto.

**Causa raiz 1: `companies.id` no es el `tenant_id` de las tablas.** Las pantallas viven en
`/companies/[id]/...` y ese `[id]` es un `companies.id` (UUID en 7 de 8 empresas), mientras
que `product`, `Invoice`, `cai`, `bankaccount`, etc. guardan el `Tenant.id` (`ANGELOH7`,
`TEST1DS`, `1`). Las 14 rutas que usaban `resolveTenant` tomaban `?companyId=` **tal cual**
como tenant. **Medido contra la BD: las 8 empresas devolvian 0 productos y 0 facturas**; el
POS y el inventario se veian vacios sin dar ningun error. Ahora Angelos ve 5 productos y 3
facturas, Empresa 1 ve 6, test 1/2 ven 2.

**Causa raiz 2: `?companyId` ganaba al header de sesion.** `resolveTenant` era una copia
local duplicada en 14 rutas, y el orden era `?companyId` -> header -> `?tenantId`. Como
`?companyId` lo manda el cliente, **cualquier usuario autenticado podia leer y escribir los
datos de otra empresa** con `?companyId=ANGELOH7`. Ademas ninguna ruta comprobaba
pertenencia: `validateTenantAccess` (`lib/tenant-utils.ts:21`) es un stub que devuelve
`true` siempre.

**El RLS no ayuda**: `lib/supabase/server-lazy.ts` y `lib/supabase-db.ts` usan
`SUPABASE_SERVICE_ROLE_KEY`, que salta el RLS. Todo el aislamiento depende del codigo.

#### Corregido
- **`lib/tenant-resolver.ts` (nuevo)**: modulo compartido con `tenantFromCompanyId()`
  (traduce `companies.id` -> `companies.tenant_id`) y `resolveTenant()` con el orden
  header -> `?companyId` -> `?tenantId`. Las 14 copias locales ahora delegan en el (0 quedan).
- **`middleware.ts:17-18` — CRITICO**: `/api/accounting/uploaded-files` y
  `/api/accounting/excel-upload` eran rutas **publicas** (sin sesion). `uploaded-files`
  hacia `File` lookup por `downloadId` sin filtro de tenant, y su **DELETE borraba
  `Transaction` y `JournalEntry`**, o directamente todas las transacciones del `?tenantId`
  en una ventana de tiempo. Es decir: un endpoint **sin autenticacion que destruye el libro
  contable de cualquier empresa**. `excel-upload` creaba transacciones y cuentas con el
  `tenantId` del formulario. Ambas ya no son publicas.
- **`uploaded-files/route.ts`**: el tenant sale del header (antes de la query) y los lookups
  de `File` filtran por `tenantId` en el GET y el DELETE.
- **4 `.eq()` descartados** (supabase-js devuelve una consulta nueva): en
  `companies/[id]/costs` (x2), `companies/[id]/kpis` y `companies/[id]/reports/occupancy`
  el filtro se escribia pero no se reasignaba, asi que la consulta salia **sin filtro** y
  devolvia costos/facturas de **todas** las empresas. En `occupancy` ademas el `altQuery`
  de respaldo se quedaba sin filtro.
- **`companies/[id]/kpis`**: redeclaraba `companyId` desde `?companyId`, ocultando el `[id]`
  de la ruta; con query param filtraba por `company_id` (columna que `Transaction`/`Invoice`
  no tienen) y sin ella por `tenant_id = null`. Ninguno de los dos caminos filtraba bien.
- Los tres `[id]` afectados ahora traducen con `tenantFromCompanyId()` y el `[id]` del path
  manda sobre la query.
- Typecheck: 483 -> **481** (sin errores nuevos).

#### Verificado contra la BD (17 pruebas, todas en verde)
- Las 8 empresas traducen su `companies.id` a su `tenant_id` correcto.
- `?companyId` y `?tenantId` ya **no** pisan al header de sesion; sin header, `?companyId`
  se traduce; el `companyId` del path tiene prioridad; sin nada, `null`.

#### Pendiente (grave, no corregido aqui)
- `lib/purchase-db.ts:3` — `export const TENANT_ID = '1'` en 20+ puntos: proveedores,
  compras, ordenes de compra y libro de compras se leen y escriben todos en el tenant `"1"`.
- Tenant compartido en el pool: `lib/seeds/bank-accounts.ts` y
  `lib/services/multi-currency-server.ts` y `lib/services/isv-service.ts` escriben
  `tenantId: 'default'`, juntando datos de todas las empresas.
- Rutas Prisma **sin filtro de tenant** (devuelven datos de todos los tenants):
  `api/accounts`, `api/reports/pnl`, `api/closing/*`, `api/burn-rate`, `api/withholding*`,
  `api/det`, `api/cai`, `api/accounting/accounts*`, `api/companies/[id]/hr/attendance/migrate`
  (ademas ejecuta `ALTER TABLE` con un usuario autenticado cualquiera).
- `api/tenant-admin/dashboard` y `api/talonarios`: el tenant viene de la query, sin
  comprobar pertenencia, con cliente de service role.
- Storage sin prefijo de tenant en varias rutas (RRHH, ubicaciones, tickets).
- **Dato**: las empresas "test 1" y "test 2" comparten `tenant_id = TEST1DS`, o sea que
  comparten inventario y facturas. Hay que decidir si son la misma empresa o si falta
  un tenant.
### Update (28 Sept 2026) — Un tenant puede tener VARIAS empresas
El usuario aclaro que "test 1" y "test 2" son **empresas distintas del mismo tenant**
(TEST1DS) con RTN propio, y que **no deben compartir nada**. Eso cambia el isolation
key: no basta con `tenant_id`.

Medido: `TEST1DS` tiene 2 filas en `companies` (test 1 `8143dd4e-…` creada
04:54:51, test 2 `971bec43-…` creada 04:54:56). Antes ambas veian los mismos
2 productos, porque `product` solo tiene `tenant_id`.

**El dato messy**: `company_id` ya existia pero con DOS convenciones mezcladas.
`product`/`Invoice`/`InvoiceItem`/`Account` guardaban el UUID de `companies.id`;
`cai`/`warehouse`/`Transaction`/`Purchase`/`talonarios` guardaban el **codigo del
tenant** (`"DENTALWD"`, `"ANGELOH7"`, `"TEST1DS"`). Ademas `bankaccount`, `customer`,
`inventory_movement`, `File` y `paymentlink` **no tenian columna** `company_id`, y
`InvoiceItem`/`paymentlink` no tienen columna de tenant (se heredan de la factura).

**Hecho:**
- `prisma/migrations/023_company_level_isolation.sql` (**PENDIENTE de aplicar**):
  agrega `company_id` donde faltaba, normaliza los codigos a UUID, rellena las
  filas huerfanas con la empresa mas antigua del tenant, y pone un trigger
  `BEFORE INSERT` para que las filas nuevas hereden `company_id`. Reporta al final
  lo que quedo sin atribuir.
  Regla del reparto: la mas antigua por `created_at` (test 1 gana por 5 s).
- `lib/tenant-resolver.ts`: nuevos `contextoDeEmpresa()` (valida pertenencia,
  403 si la empresa no es del tenant), `empresaDesde()` y `withEmpresa()`.
  **15 pruebas en verde**, incluida la que antes era el agujero
  (`?companyId` de otra empresa -> 403).
- `lib/company-scope.ts`: `filtroEmpresa()`, `filtroEmpresaOCompany()`.
- `app/api/inventory/products/route.ts` migrado. **Dos bugs reales encontrados al
  hacerlo**: el POST aceptaba `?companyId` por delante del header y luego
  `body.tenantId` (el cliente decidia en que empresa se guardaba), y el PATCH
  hacia `.eq("id", id)` **sin filtro de tenant** — un IDOR abierto.
  typecheck 481, sin errores nuevos.

**Consecuencia a decidir**: los 2 productos de TEST1DS (PROD-003, PROD-004) van a
test 1, asi que **test 2 entra con inventario vacio**. Correcto segun la regla
elegida, pero si test 2 deberia tenerlos hay que moverlos tras la migracion.

**Orden obligatorio**: aplicar 023 **antes** de desplegar las rutas migradas. Si las
rutas filtran por `company_id` y la migracion no corrio, las pantallas salen vacias.

**Pendiente**: 42 de los 43 archivos con filtro por tenant siguen sin
`company_id` (103 filtros en total). Hasta que se migren, esas rutas siguen
mostrando los datos de las empresas hermanas del mismo tenant.
### Update (28 Sept 2026) — La 023 sigue PENDIENTE: no se puede aplicar desde aqui
El usuario pidio aplicar la 023. **No se puede**, y ya se comprobo por que:

- `DATABASE_URL` **si** esta en `.env.local` (mi conclusion anterior de que no
  existia era incorrecta), pero el host `db.kudsqsbxbmviesiaesct.supabase.co` y
  los `*.pooler.supabase.com` **no resuelven por DNS** desde esta maquina: hay un
  filtro que solo deja pasar el host de la API. `pg` da `ENOTFOUND`.
- No hay `SUPABASE_ACCESS_TOKEN` (Management API), ni CLI de supabase con sesion.
- No existe ninguna funcion tipo `exec_sql` en la BD (probados 7 nombres: 404).

Lo que si se hizo al intentar aplicarla:
- **La migracion 023 estaba rota y se arreglo.** `companies.id` es **text**, no
  uuid (Clinica Dental Diamond tiene un id de 24 chars, no un UUID), asi que
  `returns uuid` y `add column company_id uuid` no hacian cast y la migracion
  se caia entera. Ahora todo es `text`. Igual `paymentlink.invoice_id` va en text
  porque `Invoice.id` es text, mientras que `product.id` si es uuid: el esquema
  mezcla los dos tipos.
- Tipos medidos con el OpenAPI de PostgREST (`Accept: application/openapi+json`),
  que permite ver el tipo de cada columna sin ejecutar DDL.
- **`scripts/verificar-aislamiento.mjs`** (nuevo, solo lectura): dice si la 023
  esta aplicada, si cada `company_id` apunta a una empresa real, y si las empresas
  que comparten tenant comparten filas. Estado actual: **8 problemas**, 0 filas
  atribuidas a test 1 / test 2.

Ademas: **33 ficheros de `scripts/`** tienen la **service role key escrita en el
repo** (medido el 2 Oct 2026; ver "La service role del repo SIGUE VIVA"). Habria
que rotarla y sacarla del control de versiones.
### Fix (28 Sept 2026) — 023: "operator does not exist: text = uuid"
Al correrla el usuario error en `where f.id = p.invoice_id` (bloque 2d).

Causa: **`paymentlink.invoice_id` ya existia como `uuid`** (se ve en el OpenAPI de
PostgREST). Mi `add column if not exists ... text` fue un no-op silencioso, asi que
siguio siendo uuid, y al compararlo contra `Invoice.id` (que es **text**) Postgres
no encuentra el operador. El esquema ya tenia ese desajuste: por eso
`paymentlink` no declara ninguna FK.

La ejecucion anterior **se revirtio entera** (el SQL Editor la envuelve en
transaccion): no quedo ninguna de las columnas anadidas, asi que no hubo que
limpiar nada.

Arreglado:
- Se elimina el `alter table paymentlink add column invoice_id` (sobrescribia una
  columna que ya existe y no puede referenciar a un `id` de tipo text).
- El vinculo real entre `paymentlink` y la factura es **`invoice_number` =
  `Invoice."invoiceNumber"`** (ambos varchar), no `invoice_id`.
- `paymentlink` entra en el grupo 2a: si tiene `tenant_id` varchar, se rellena por
  tenant como el resto, y 2d solo lo afina por numero de factura.
- `File` sale de 2a (tiene las dos columnas de tenant, le toca 2c).

Tipos verificados uno por uno con el OpenAPI: `Invoice.id` text,
`InvoiceItem."invoiceId"` text, `Invoice."invoiceNumber"` varchar,
`paymentlink.invoice_number` varchar, `companies.id`/`tenant_id` text. Las
unicas comparaciones restantes son text=text o varchar=varchar.
### Fix 2 (28 Sept 2026) — 023: "syntax error at or near %"
Segundo fallo al aplicarla, en el bloque de reporte final (seccion 5):
`from public.%1$I c where c.company_id is null` estaba **fuera** de cualquier
`format()`. Los `%1$I` solo se sustituyen dentro de `format()`; sueltos en el
cuerpo del DO, Postgres los lee como SQL.

El `sql_error` apuntaba a la linea del FROM porque el `%` estaba 2 lineas mas
arriba, en el `raise notice`.

Arreglado: se construye `expr` (que columna de tenant tiene cada tabla) y se
meten tabla y expresion en `format()` + `execute ... into`, y despues se hace el
`raise notice` con el valor ya resuelto.

Regla que queda: **todo identificador dinamico va dentro de `format()`.**

Aparte: las tres ejecuciones fallidas se revirtieron enteras (el SQL Editor las
envuelve en transaccion), verificado: no existe ninguna columna anadida por la
023. No hay que limpiar nada.

Tambien se mejoro `scripts/verificar-aislamiento.mjs`: sacaba las columnas de
`select=*`, que en una tabla vacia (paymentlink, 0 filas) devuelve [] y hacia
parecer que la tabla no tenia columnas. Ahora las lee del OpenAPI de PostgREST.
Baseline actual: 9 problemas, los 5 de columnas que faltan.
### Update (28 Sept 2026) — 023 APLICADA y verificada
La migracion 023 corrio **sin error**. Verificado contra la BD real:

- Las 15 tablas tienen `company_id`.
- Todos los `company_id` apuntan a una empresa real (los codigos de tenant
  `DENTALWD`, `ANGELOH7`, `TEST1DS` quedaron normalizados).
- El **trigger funciona**: se inserto un producto con solo `tenant_id` y sin
  `company_id`, la BD le asigno sola el de Angelos, y la fila de prueba se borro
  (13 productos antes y despues, 0 filas `ZZ-TRIGGER-TEST`).
- `node scripts/verificar-aislamiento.mjs` -> **TODO OK**.

Reparto: test 1 tiene 2 productos, 1 CAI y 2 bodegas. **test 2 queda con
inventario vacio**, porque los 2 productos de TEST1DS se fueron a la mas antigua.
Pendiente de que el usuario decida si test 2 deberia tenerlos.

Quedan **8 cuentas** sin `company_id`, de los tenants `tenant_001` y
`default-tenant`, que no existen en `companies`. Basura legacy: borrar o asignar.

Documentacion actualizada: `AGENTS.md`, `docs/AGENTS.md`,
`docs/RUN_MIGRATION.md` (con el estado de 022/023 y la nota de que
`DATABASE_URL` si existe y lo que falla es el DNS), `docs/ACCOUNTING_API.md`
(tenant != empresa) y el nuevo `docs/AISLAMIENTO_EMPRESAS.md`.

Correccion: `docs/RUN_MIGRATION.md` ya documentaba el `ENOTFOUND` desde antes.
Estaba ahi y no lo lei antes de asegurar que no habia forma de conectar.

Las 41 .md del repo NO se reescribieron: la mayoria son reportes historicos
(`*_REPORT.md`) que describen un momento concreto y no describen el estado actual.
Se actualizaron los que mienten sobre el comportamiento vigente.
### Plan (28 Sept 2026) — los dos roles: CONTADOR y EMPRESARIO
Implementada la CAPA DE DATOS. Las 4 migraciones se escribieron, se verificaron
estructuralmente, y el usuario las aplico en el SQL Editor **sin error** el 28 Sept
2026. Estado real medido con `verificar-contexto.mjs`, abajo.

**El hallazgo que define el diseno:** el spec pedia "cada empresa es un tenant
independiente", pero el esquema es N:1 (TEST1DS tiene test 1 y test 2 bajo el
mismo tenant). Decidido: **company_id es la frontera, tenant_id agrupa**. No se
deshace la 023.

**Lo que se descubrió al medir contra la BD:**
- `User` tiene UN solo `tenantid`. "Un contador administra N empresas" no se puede
  expresar hoy. De ahi la tabla puente.
- `accountant_profiles` y `accountant_managed_companies` existen, tienen la forma
  correcta, y estan **VACIAS**. Ademas `accountant_managed_companies` guarda
  `company_name` y `rtn` como texto, sin `companies.id`: es un duplicado del
  cliente, no un vinculo. No sirven como fuente de permisos.
- **No existe ninguna tabla de ubicacion.** Lo mas cercano es `warehouse` (bodega)
  y `product_location`, que es el maestro de ESTANTES (tiene `aisle`, `shelf`,
  `warehouse_id`, creado en la 017). Decidido: tabla nueva `company_location`.
- 54 tablas tienen `company_id`; 94 no la tienen, y **42 de esas son VISTAS**:
  justo `libro_ventas`, `libro_mayor`, `balance_general`, `estado_resultados`,
  `balanza_comprobacion`. Una vista no admite ADD COLUMN, asi que el aislamiento de
  la lectura en reportes queda pendiente de rehacerlas (027).
- `companies.id`, `User.id` y `Tenant.id` son **text** (User.id parece uuid pero no
  lo es). `company_id` es text en las 54 que ya lo tienen.

**Trampa nueva, del mismo tipo que la de la 023:** hay pares de tablas que solo se
distinguen por mayusculas y son **distintas de verdad**: `customer` (1 fila) !=
`"Customer"` (0), `Account` (43) != `account` (0), `Transaction` (50) !=
`transaction` (0), `cai` (3) != `CAI` (0). Postgres pliega a minusculas lo que no
va entrecomillado, asi que `alter table Customer add column if not exists` toque
`customer` y **no da error**: la migracion aparenta correr y la columna nunca
llega. Las 025 y 026 resuelven con `to_regclass(quote_ident(n))` y `format('%I')`.

**Migraciones escritas:**
- `024_roles_context_and_locations.sql` — `company_location` + `user_company_access`
  + backfill desde `User.tenantid`. El relationship sale de la cantidad de empresas
  del tenant: 1 -> owner, N -> accountant, que es exactamente la distincion de los
  dos flujos del onboarding. Reporta las empresas que quedan sin membresia.
- `024b_sedes_y_bodegas.sql` — OPCIONAL y aparte: crea la sede "Principal" y
  enlaza bodegas, pero solo si la empresa tiene una unica sede. Con 2+ no adivina.
- `025_company_id_restantes.sql` — `company_id` en todo lo que tenga `tenant_id`,
  **descubierto con information_schema** en vez de lista a mano (hay 222
  relaciones; una lista escrita a mano se queda corta y falla en silencio). Salta
  las vistas por `pg_class.relkind` con aviso.
- `026_location_id_transacciones.sql` — `location_id` en 28 transaccionales, con
  trigger que hereda la sede por defecto. **Solo en tablas que ya tengan
  `company_id`**: si no, el trigger no falla al crearse sino en el proximo
  INSERT, en produccion.
- `scripts/verificar-contexto.mjs` — solo lectura, dice que falta. Ahora mismo
  reporta: 94 tablas sin `company_id`, 8 transaccionales sin `location_id`, y
  **las 8 empresas sin membresia**.

**Con la 023 lo que correria era el `update`, no el `select`.** `select` sobre
`libro_ventas` no lleva `company_id` y por eso seguio mostrando datos de las dos
empresas de TEST1DS. Es la misma confusion de "SELECT * WHERE empresa = ?"
suponiendo que empresa significa `company_id`.

**Decisiones que tomé y conviene que revises:**
1. Los contadores NO ven datos consolidados de sus clientes (aun no construido).
2. Los empresarios SOLO ven su propia empresa, y dentro de ella pueden consolidar sus sedes.
3. La UI de la sede (selector de sucursal) se construye DESPUES de aplicar la 025: hasta que las tablas no tengan `company_id`, filtrar por sede no impide ver datos de otra empresa.
4. Las 8 cuentas huerfanas y el reparto "mas antigua" los mantiene la 023.

### Aplicadas (28 Sept 2026) — estado MEDIDO, no supuesto
Corrieron las cuatro sin error. Medido con `node scripts/verificar-contexto.mjs`:

- `company_id`: de **54 a 98 tablas**.
- `location_id`: **8/8** de las transaccionales del nucleo; 29 en total.
- `company_location`: **8 sedes**, todas `PRINCIPAL` con `is_default`.
- `user_company_access`: **7 membresias**. `azuna22@outlook.com` quedo como
  `accountant` de test 1 y test 2 (2+ empresas = contador, por la regla de la 024);
  los otros 4 usuarios como `owner` de una empresa cada uno.
- `verificar-aislamiento.mjs` sigue dando **TODO OK**.

**Tres cosas que salieron al medir y hay que resolver:**

1. **`Empresa 1` (tenant `'1'`) no tiene membresia: NADIE puede entrar.** Ningun
   `User` tiene ese `tenantid`. Darle dueno o borrarla.
2. **`gcalix12@hotmail.com` tiene DOS filas en `User`** (MANAGER de Clinica Dental
   Diamond, ADMIN de Angelos). El caso del contador ya existe en los datos pero
   partido en dos usuarios. Lo correcto es un `User` con dos filas en
   `user_company_access`.
3. **Falso positivo que el propio verificador reportaba:** decia "ningun contador con
   mas de una empresa" cuando `azuna22` tenia test 1 y test 2. Contaba FILAS en vez
   de USUARIOS distintos. Arreglado en `verificar-contexto.mjs`.

**Trampa nueva: `location_id` significa dos cosas con tipos distintos.**

| Tabla | Tipo | Apunta a |
|---|---|---|
| `warehouse` | `uuid` | `company_location.id` (la SEDE) |
| `product` | **`text`** | `product_location.id` (el ESTANTE, viene de la 017) |

Las 29 con `location_id` son uuid y significan sede, MENOS `product`. Un
`.eq('location_id', sedeId)` sobre `product` **no da error**: compara texto y
filtra por la columna equivocada. Y `product.location` (a secas) es texto libre
descriptivo, no sirve para filtrar.

**Lo que sigue pendiente, en orden:**

1. **La 027: rehacer las 42 vistas de reportes.** Son las que mas duelen, porque
   `libro_ventas`, `libro_mayor`, `balance_general`, `balanza_comprobacion` y
   `estado_resultados` se leen de tablas ya aisladas pero **no filtran por
   `company_id`**. Se puede seguir viendo contabilidad de dos empresas en un
   reporte. **Bloquea la vista consolidada del Empresario: no se debe construir la
   UI de consolidado antes que esto.**
2. **51 tablas sin `company_id`**: las que no tenian `tenant_id`
   (`AccountReceivable`, `BookClosing`, `Reconciliation`, `payment_vouchers`,
   `asset_*`, `itr_produccion`, `budget_lines`). La 025 solo cubrio las que
   tenian `tenant_id`, porque solo ahi se puede deducir la empresa.
3. **Las 42 rutas API** con filtro por `tenant_id`.

La 027 no la escribi todavia a proposito: redefinir 42 vistas exige leer cada
definicion en `pg_views` y decidir el `where` correcto, y eso necesita el DDL
(realmente habria que sacarlo de alli, no suponerlo).

---

## Capa de contexto de trabajo (28 Sept 2026)

Implementado el contexto de empresa y sede que faltaba para los dos flujos del
onboarding. Archivos nuevos:

| Archivo | Que hace |
|---|---|
| `lib/workspace.ts` | `contextoDeEspacio()`: valida empresa y sede contra `user_company_access`. 400/401/403. |
| `app/api/workspace/route.ts` | Alimenta el selector. Unico lugar que decide la empresa activa. |
| `lib/contexts/WorkspaceContext.tsx` | Estado de empresa/sede para la UI, con reinicio de cache. |
| `components/workspace/WorkspaceBar.tsx` | Badge + selector de empresa + filtro de sede. |
| `components/workspace/CompanySelector.tsx` | `CompanySelector` + `ActiveCompanyBadge`. |
| `components/workspace/LocationFilter.tsx` | Filtro de sede, con la opcion de consolidado. |

`middleware.ts` convierte las cookies `active_company_id` / `active_location_id`
en los headers `x-company-id` / `x-location-id`, y `WorkspaceProvider` quedo
montado en `app/layout.tsx` y con la barra en los layouts de `dashboard` y
`accountant`.

### El bug de diseño que casi se cuela: el rol es POR EMPRESA

Lo primero que hice fue derivar el rol del conteo de empresas del usuario
("2+ empresas = contador"), igual que el backfill de la 024. **Estaba mal**, y lo
detecte al medir los datos reales de la membresia:

```
azuna22@outlook.com  (2 filas en User, 3 membresias)
  - Empresa TEST185  rel=owner      rol=business_owner
  - test 1           rel=accountant rol=accountant
  - test 2           rel=accountant rol=accountant
```

Es **empresario de su propia empresa y contador de clientes al mismo tiempo**.
Con el rol global, a esta persona se le habria negado la vista consolidada de
**su propia** empresa, que si le corresponde, y el selector de sede habria
desaparecido justo donde deberia aparecer.

Arreglado: el rol sale del `relationship` de la empresa **activa**
(`rolDeEmpresa()`), y `multiEmpresa` va aparte. Tres banderas, no una:

- `role` — de la empresa activa; decide si aparece el filtro de sedes.
- `multiEmpresa` — tiene 2+ empresas; el flujo del contador aplica.
- `permiteConsolidar` — solo `business_owner`. `'ALL'` es exclusivo suyo.

`gcalix12@hotmail.com` salio con 2 membresias, las dos `owner`, asi que hoy
aparece como empresario en las dos, no como contador. Es un dato a corregir, no
un fallo del codigo: la 024 lo backfilleo como `owner` porque sus dos `User`
tenian una empresa cada uno.

### Verificado contra la BD real, no de palabra

- El embed `user_company_access?select=...,companies(...)` de
  `empresasDelUsuario()` resuelve por la FK de la 024. Estado 200.
- `ubicacionesDeEmpresa()` devuelve la sede `PRINCIPAL` de test 1.
- El mapa Clerk -> app (`User.authid` -> `User.id`) esta bien: 6 filas, 2
  emails duplicados.
- Reparto real: 2 usuarios en el flujo empresario (1 empresa, 1 sede), 2 en el
  de contador. 7 membresias en total. Coincide con `verificar-contexto.mjs`.
- `Empresa 1` (tenant `'1'`) sigue **sin dueno**: ninguna membresia la apunta.
- Typecheck: **481 errores, el mismo baseline**. Los 6 archivos nuevos no
  aportan ninguno.

### Pendiente

El consolidado sigue sin poder construirse de verdad: las 42 vistas de la 027 no
filtran por `company_id`. La UI ya tiene el selector de sede y el flag
`permiteConsolidar`, pero un consolidado sobre las vistas actuales sería
exactamente el bug que se quiere evitar.

---

## 027: aislamiento de las vistas contables (28 Sept 2026)

`prisma/migrations/027_vistas_contables_aisladas.sql`, **ESCRITA, APLICADA y
VERIFICADA**. Recrea **25 de las 46 vistas** para que expongan `company_id` y
filtren correctamente. Verificacion permanente:
`node scripts/verificar-vistas.mjs` (solo lectura) → `TODO OK`.

### El diagnóstico: no era "falta un WHERE"

Con las definiciones reales de `pg_get_viewdef` y el esquema medido por
OpenAPI, el problema era de otra clase:

1. **El JOIN a `JournalEntry` no filtraba nada.** `balance_general`,
   `libro_mayor`, `balanza_comprobacion`, `estado_resultados` y
   `resumen_contable` hacían `LEFT JOIN "JournalEntry" je ON (je.account_id = a.id
   OR je."accountId" = a.id)` a secas. El lado `je` no tenía `company_id` ni
   `tenant_id`: **cada cuenta sumaba los asientos de todas las empresas**.

2. **`GROUP BY "tenantId"` sumaba empresas.** `declaracion_mensual`,
   `resumen_isv`, `top_clientes`, `flujo_efectivo_mensual` y
   `vista_resumen_cuentas` agrupaban por tenant. Y **test 1 y test 2 comparten
   `TEST1DS`**: esa agrupación no las separa, las junta. El `GROUP BY` va por
   `company_id`.

3. **Tres convenciones de columna.** `JournalEntry` tiene `accountId`,
   `account_id` y `accountid` (y lo mismo para transacción). Las vistas miraban
   dos.

### Dos decisiones que parecían detalles y no lo eran

- **El parche va en el `ON`, no en el `WHERE`.** En un `LEFT JOIN`, mover el
  filtro de empresa al `WHERE` lo convierte en `INNER` y desaparece las cuentas
  sin movimientos: el balance dejaría de cuadrar por un motivo distinto al que se
  quería arreglar.
- **Antes de usar filtros estrictos, conté los NULL.** Un
  `je.company_id = a.company_id` **borra en silencio** las filas con
  `company_id` NULL, sin error. Medido: `JournalEntry`, `Transaction`, `Invoice`,
  `InvoicePayment`, `Purchase`, `Supplier`, `product` y `warehouse` tienen **0
  NULLs**. Los únicos son las **8 `Account`** huérfanas de `tenant_001` y
  `default-tenant`, que saldrán con saldo 0 en vez de arrastrar asientos ajenos.
  También se comprobó que `accountid` nunca es la única columna poblada
  (101/101 filas traen `accountId`), así que no hay asientos ocultos.

- **Un error mío que habría abortado la migración:** en
  `vista_resumen_estado_resultados` y `vista_comparativo_mensual` puse
  `company_id` en medio de la lista de columnas. `CREATE OR REPLACE VIEW` solo
  permite añadir columnas **al final**; insertarla en medio da *"cannot change
  name of view column"*. Corregido antes de entregarla.

### Lo que la 027 deja fuera, y por qué

No es que se olvidara: son tres problemas que necesitan otras definiciones.

| Vista | Por qué no |
|---|---|
| `libro_diario_integrado`, `libro_egresos`, `libro_ingresos`, `resumen_ingresos_egresos` | Son `SELECT * FROM una_funcion()`. Aislar la vista no aisla la **función**. Faltan los cuerpos de `get_libro_diario_integrado()`, `get_egresos_with_entries()`, `get_ingresos_with_entries()` y `get_resumen_ingresos_egresos()`. |
| `vista_resumen_produccion` | `itr_produccion` **no tiene `company_id` ni columna de tenant**. No hay de dónde deducir la empresa. |
| `CustomersComplete`, `CustomersWithFiles`, `CustomersWithRetentions`, `PackageDetails` | Falta `company_id` en `Customer`, `CustomerFiles`, `Packages` y `PackageProducts` (comprobado: la columna no existe). |
| Vistas de payroll y legal | Falta `company_id` en `payroll_details` y `legal_revisiones_historial`. |

Lo pendiente de eso es la **028**.

### El `/100` de `libro_diario_honduras`: NO tocado, y no es un bug simple

Lo primero escribí aquí que el reporte salía 100× bajo. **Era una afirmación sin
medir y era incorrecta como diagnóstico.** Lo medí y luego volví a concluir mal
por la vía contraria. El caso real:

- **93% de los 101 `JournalEntry.amount` son múltiplos de 100**, lo cual suggested
  centavos — pero **ese razonamiento no vale**: los importes redondos en lempiras
  (500000, 95000) también son múltiplos de 100. No prueba nada.
- **La fuente de verdad es el código que escribe, y hay dos con unidades
  distintas:**
  - `app/api/accounting/withholding-journal/route.ts:169` → `round2(item.retencion
    / 100)` y escribe **en lempiras** (normalizado a propósito para "no duplicar
    100× en libros y balanza").
  - `lib/services/automated-tax.ts` → escribe **en centavos**
    (`// in cents`, `taxAmountCents = Math.round(x * 100)`, `amount: totalCents`).
- O sea que **`JournalEntry.amount` tiene unidades mezcladas según el flujo que
  creó la fila** (7 de 101 no son múltiplo de 100, y eso encaja con que al menos
  un flujo escribe en lempiras). El `/100` de la vista acierta para unas filas y
  falla para otras.
- **Decisión: no se toca hasta normalizar la unidad**, y eso no es una migración de
  aislamiento sino una decisión de datos que **necesita al usuario**. Sin una
  columna que diga qué flujo creó cada fila no se puede saber cuál dividir.
- Otros `/100` y `* 100` pendientes de auditar por lo mismo: `TrialBalance.tsx:44`,
  `BankRec.tsx:157`, `MultiCurrencyTransactionForm.tsx:136`, `lib/utils.ts:12`,
  `components/ui/currency-input.tsx:14`, `lib/services/excel.ts:156`,
  `balance-comprobacion/page.tsx:115-119`, y el `*100` de
  `app/api/billing/invoices/route.ts` (ver línea 206 de este diario).

### Las 4 vistas que la 027 dejó en cero

De las 25 aisladas, **9 dan 0 filas**. Cinco ya estaban vacías por falta de datos
(0 facturas `EXPENSE`; las 3 facturas de Angelos están `PAID` y
`cuentas_por_cobrar` solo mira `ACTIVE/PENDING/SENT`). **Las otras 4 sí las vació
el filtro de empresa**: `libro_diario_honduras`,
`vista_estado_resultados_detallado`, `vista_resumen_estado_resultados` y
`vista_comparativo_mensual`, las cuatro del cruce
`Transaction ⋈ JournalEntry ⋈ Account`.

**Causa raíz medida: la que está rota es `Transaction`, no `JournalEntry`.**
Fixtures de fiabilidad de `company_id` contra el tenant propio de cada fila:

| Tabla | Coherente |
|---|---|
| `JournalEntry` | **101/101** |
| `Invoice` | 3/3 |
| `Purchase` | 2/2 |
| `Account` | 35/35 (+8 NULL legacy) |
| **`Transaction`** | **4/50** |
| **`Supplier`** | **0/3** |

**46 de 50 transacciones** tienen `company_id` de Clinica Dental Diamond
(`cVcLafoZitJmBOdSxNOlPgb0m`) mientras la fila dice tenant `1` o `ANGELOH7`.
`Supplier.company_id` guarda `"ANGELOH7"`, el **código de tenant**, no el
`companies.id` — la convención mixta que la 023 normalizó en otras tablas y se le
pasó en Supplier.

**No se aíslan** hasta reparar esto: las 4 funciones filtran por
`t."voucherType"` sobre `Transaction`, así que añadirles
`AND t.company_id = p_company_id` hoy haría que **Clinica viera 42 de las 45**
transacciones INGRESO/EGRESO (que son de Empresa 1 y Angelos) y que Angelos y
Empresa 1 vieran **0**. Fuga peor que la actual, y **parecería correcta** porque
el filtro está presente.

La reparación es determinista porque se comprobó que los asientos de una
transacción no se reparten entre empresas: 47 de 50 tienen todos sus asientos en
una sola empresa, **0** en varias; las 3 sin asientos caen al tenant y ninguna
está en `TEST1DS` (el único tenant con 2 empresas). Simulado: `Angelos=32,
Empresa 1=14, test 1=3, Clinica=1`; 46 de 50 filas cambian; **50/50 coherentes**.

→ **`prisma/migrations/027b_reparar_company_id_transaction_supplier.sql`**
**APLICADA Y VERIFICADA** (28 Sept 2026). Va al revés de lo que se propuso
primero: **`Transaction` toma la empresa de sus asientos**, porque propagar
`t.company_id` hacia `JournalEntry` habría contaminado los 101 asientos con el
dato de Clinica y destruido la única atribución coherente.

Resultado medido después de aplicarla:

| | antes | después |
|---|---|---|
| `Transaction` incoherentes | 46 de 50 | **0** (49 coherentes, 1 sin tenant) |
| reparto `Transaction` | Clinica=47, test 1=3 | **Angelos=32, Empresa 1=14, test 1=3, Clinica=1** |
| `Supplier` incoherentes | 3 de 3 | **0** (3/3 coherentes) |
| las 4 vistas en cero | 0 filas | **3+ filas cada una, con `company_id`** |

Los tres verificadores dan `TODO OK`: `verificar-aislamiento`,
`verificar-contexto`, `verificar-vistas`.

**Dos veces fallé a mitad de camino, y las dos por culpa mía, no del SQL:**
1. `left(r.id, 8)` reventó con `function left(uuid, integer) does not exist`:
   `Supplier.id` es `uuid` y `left()` solo existe para `text`. Como todo estaba
   dentro de un `BEGIN`, revirtió entero (confirmado: 46 incoherentes seguían
   ahí). Las 7 llamadas llevan `::text` ahora, y el JOIN de la sección 1 castea
   los dos lados a text para que un cambio de tipo futuro no lo tumbe.
2. La verificación exigía **0 incoherentes en toda la tabla `Supplier`**, y eso
   era insatisfacible porque los datos se contradicen. Ahora exige lo que sí
   importa: que **lo que la migración tocó** haya quedado coherente (si no, es
   fallo nuestro y aborta), que la tabla **no haya empeorado** (compara
   antes/después), y que lo no tocado se liste como pendiente de decisión humana.
   `Transaction` sí sigue exigiendo 0 absoluto, porque su reparación es
   determinista.

**Pendiente de decisión del usuario (la 027b no lo resuelve):**
- `Disnorte` y `TecnoGlobal` tenían `tenant_id="1"` pero `company_id="TEST1DS"`.
  La 027b siguió el `tenant_id` de la fila y los dejó en **Empresa 1**, avisando
  por `NOTICE`. **Sin confirmar.**
- `DICOSA` dice ser de Angelos (`tenant_id="ANGELOH7"`) pero sus **2 `Purchase`
  son de Empresa 1**. La 027b no lo tocó: `Purchase.company_id` sí es confiable,
  el que miente es el `tenant_id` del proveedor.
- `Transaction` fila `051e950a` (INGRESO #1, descripción `px`, 0 asientos,
  `totalAmount` 500000) tiene **`tenantId` = la cadena literal `"null"`**, no
  NULL. Se atribuyó a Clinica solo porque su `tenant_id` (snake) sí dice
  `cVcLafoZitJmBOdSxNOlPgb0m`; la 027b la saltó porque `tenantId <> ''` es cierto
  para `"null"`. **La 027c no debe fiarse solo de `"tenantId"`,** y cualquier
  código que compare `tenantId` contra una lista de tenants va a fallar con ella.

`Transaction` tiene además **tres juegos de columnas duplicadas que se contradicen**
(`tenantId="1"` vs `tenant_id="cVcLafoZitJmBOdSxNOlPgb0m"` vs `tenantid=""`; y
`totalAmount=517500` vs `total_amount=0` vs `totalamount=null`). Para el tenant se
usó `"tenantId"`, que es la que coincide con `JournalEntry`. Los montos
duplicados quedan fuera: son otro problema.

**Las 8 funciones contables (027c):** la lista resultó ser de **8, no de 4**.
`get_libro_diario_integrado`, `get_libro_mayor_integrado`,
`get_balance_comprobacion_integrado`, `get_resumen_ingresos_egresos`,
`get_egresos_with_entries`, `get_ingresos_with_entries`, y las dos de saldos
iniciales `get_accounts_with_opening_balances` y `update_opening_balances`.
Cuerpos medidos con `pg_get_functiondef`:
- Todas filtran **solo por `p_tenant_id`, que es `DEFAULT NULL`**: llamarlas sin
  argumento devuelve **todo**, sin filtro de empresa.
- `get_libro_mayor_integrado` y `get_balance_comprobacion_integrado` además
  filtran por fecha en el `WHERE` sobre un `LEFT JOIN`, que lo
  convierte en INNER y borra las cuentas sin movimientos. El parche
  `OR t."tenantId" IS NULL` no lo arreglaba: dejaba pasar asientos ajenos.
- **5 de las 8 son `SECURITY DEFINER`**, no 2: solo `get_ingresos_with_entries` y
  las dos de saldos iniciales no lo son. Inconsistencia entre sisters.
  `SECURITY DEFINER` sobre una función que recibe un tenant es escalada de
  privilegios; la 027c lo quita.
- **4 de las 8 dividen entre 100** (`je.amount / 100.0`), no 4 de 4: diario,
  mayor, balance y resumen. Egresos e ingresos no dividen. Mismo tema de unidades
  sin resolver, y la 027c **no lo toca**.
- `chart_of_accounts` (89 filas) **no es** `"Account"` (43 filas): las 2 funciones
  de saldos iniciales works sobre la legacy. Solo comparten Empresa 1.
- **Decisión del usuario: las 4 vistas wrapper se BORRAN**, no se convierten en
  vistas planas. Tenían 0 consumidores en `app/`. Corrige lo que se escribió aquí
  antes, que pedía convertirlas.
- **Ya se puede aislar:** con `Transaction` reparada, las 45 transacciones
  INGRESO/EGRESO quedan en Angelos=27, Empresa 1=14, test 1=3, Clinica=1. Antes
  de la 027b esa fila hacía que Clinica viera 42 filas que son de otras.

### El recordatorio que importa

La vista **no es la frontera**. Las rutas usan `SUPABASE_SERVICE_ROLE_KEY`, que
salta el RLS, y `security_invoker` tampoco ayuda contra service_role. Las 25
vistas ya exponen `company_id` para que la ruta **pueda** filtrar, pero hasta que
cada ruta ponga `.eq('company_id', empresa.companyId)`, un reporte sigue
mostrando la contabilidad de todas las empresas. La 027 habilita el filtro; no lo
aplica.

### Como salio el primer intento: `InvoiceSummary`

`CREATE OR REPLACE VIEW InvoiceSummary` **sin comillas** pliega el identificador
a `invoicesummary`, que no es la vista real. Lo grave no es que fallara: es que
**no fallo**. La sentencia no dio "no such view" (Postgres la crea si no existe),
creo una copia en minusculas y dejo `"InvoiceSummary"` sin `company_id`. El
guard final de la migracion lo detecto — *"1 vista(s) sin company_id expuesta"* —
pero sin decir cual, y a 25 recreaciones de distancia.

Tres arreglos:

1. `CREATE OR REPLACE VIEW "InvoiceSummary"`.
2. **Preflight 0b**: valida los 25 nombres **exactos** con
   `to_regclass(format('public.%I', v))` antes de recrear nada, y borra la
   `invoicesummary` del intento anterior si quedo. Con esto el fallo de mayusculas
   aparece al principio, cuando el mensaje es obvio.
3. El guard final ahora **nombra** las vistas que fallan, no solo las cuenta.

La transaccion habia revierto bien: al fallar el `COMMIT` no llego a correr y no
quedo ni la copia ni las 24 vistas a medias. Se comprobo con
`select relname from pg_class where relkind='v' and lower(relname) like 'invoicesummary%'`,
que devuelve solo la real.

### Una falsa alarma que casi se reporta como bug

Al verificar, `libro_ventas` filtrado por empresa devolvia 0 filas y la vista sin
filtrar devolvia 3. Parecia que la 027 habia roto el filtro. **No lo habia
hecho:** PostgREST devuelve `content-range: */*` en resultados vacios, no
`0-0/0`; `split('/')[1]` da `NaN`, y `NaN` es falsy, asi que el conteo salia 0
para una consulta que si tenia filas. El filtro devuelve las 3 correctas. El
script permanente ya no parsea el header para contar: mira el cuerpo.

### Lo que la 027 no pudo probar con datos

**Solo Angelos tiene facturas (3).** Las otras 7 empresas no tienen ni una, asi
que no hay dos empresas con datos a la vez contra las que observar una fuga real.
La correccion del `JOIN` a `JournalEntry` y del `GROUP BY "tenantId"` esta
comprobada leyendo la definicion resultante y contando que vista y tabla base
devuelven las mismas filas, no con un caso de fuga visto. Cuando se cargue una
segunda empresa, `verificar-vistas.mjs` es quien lo demuestra.

Las 8 filas con `company_id` NULL en `balance_general` y `libro_mayor` son las
cuentas huerfanas de `tenant_001` y `default-tenant`: salen con saldo 0 en vez
de arrastrar asientos ajenos.


---

## 30 Sept 2026 - 027b2: los datos en disputa, resueltos con evidencia

El encargo era resolver los datos en disputa "mejor", no dejarlos en un limbo.
La palabra clave era **mejor**: cada caso se resolvio con el campo que ya habia
salido confiable en la 027b, y donde no habia evidencia se dejo NULL en vez de
elegir al azar.

### Lo que se decidio

| Caso | Decision | Evidencia |
|---|---|---|
| `Distrubidora Comercial SA` (DICOSA) | **Empresa 1** | Sus **2 `Purchase`**, y `Purchase.company_id` ya habia dado 2/2 |
| `051e950a` | **sin empresa** (NULL) | 0 asientos, `tenantId` NULL, sin ninguna referencia |
| `Disnorte` / `TecnoGlobal` | Empresa 1, sin tocar | 0 compras y 0 referencias: ni a favor ni en contra |
| `Transaction.tenant_id` | espejo de `tenantId` | coincidencia 101/101 con `JournalEntry` |

Se descartaron dos senales que **parecian** evidencia y no lo eran: el
`Supplier.tenant_id = 'ANGELOH7'` de DICOSA (el campo no verificado, frente a
las compras, que si lo estaban) y el email `@dentaldiamondhn.com`, que no dice
de quien es el proveedor.

### El hallazgo que nadie habia buscado: `Transaction.tenant_id`

Al medir las tres columnas de tenant de `Transaction` para confirmar que
`tenantId` era la buena, aparecio esto:

| Columna | Distribucion en las 50 filas |
|---|---|
| `"tenantId"` | 32 `ANGELOH7` / 14 `1` / 3 `TEST1DS` / 1 NULL - **la buena** |
| `"tenant_id"` | **47 `cVcLafoZitJmBOdSxNOlPgb0m`** / 3 NULL - basura |
| `"tenantid"` | 50 vacias - columna muerta |

`tenant_id` tenia **la misma constante, la de Clinica Dental Diamond, en 47
filas** sin importar la empresa real. Las 46 filas con ambas columnas pobladas
**difieren en 46**. Filtrar por ahi devolvia transacciones de 4 empresas.

**Es la unica tabla del esquema con las dos convenciones a la vez y discrepantes**:
se comprobo con un barrido del OpenAPI de PostgREST comparando, en todas las
tablas que tengan dos columnas de tenant, si coinciden fila a fila.

**No habia fuga viva, de milagro.** Las unicas dos rutas que filtran
`Transaction` por la columna snake son los `alt` de
`app/api/accounting/ingresos/route.ts:61` y `app/api/accounting/egresos/route.ts:58`,
y las dos filtran ademas por `voucher_type = 'INGRESO'/'EGRESO'`, que **vale
`'FACTURA'` en las 50 filas**. Ese filtro no matchea nada: las dos consultas
devuelven 0 y son codigo muerto. Las otras ~20 rutas que tocan `Transaction`
usan `"tenantId"` bien.

**Era una mina armada:** en cuanto alguien "arreglara" el filtro de
`voucher_type` sin tocar el `tenant_id` de al lado, esas dos rutas filtrarian 47
filas de 4 empresas. La 027b2 lo cierra a nivel de datos.

### Cuatro fallos en el camino, y por que importaba cada uno

La 027b2 tardo cuatro intentos. Ninguno era de estilo; los cuatro salieron de
que el esquema tiene trampas que no se ven leyendo codigo.

1. **`operator does not exist: text = uuid`.** `companies.id` es `text`
   (porque los UUID de pantalla son de otras tablas) y las variables se
   declararon `uuid`. El mensaje apuntaba a una linea secundaria; la causa real
   estaba en el `DECLARE`. El hint de Postgres ya lo decia y no se leyo.
2. **`duplicate key ... unique_voucher_tenant`.** Las 3 transacciones de test 1
   comparten `(FACTURA, 1)` y **solo no violaban el indice porque las tres tienen
   `tenant_id` NULL**: en un indice unico los NULL no chocan. Al darles el
   tenant, la segunda choco con la primera. Se resolvio con `NOT EXISTS` y
   dejando esas 3 en NULL (cierran en falso, no filtran).
3. **`too many parameters specified for RAISE`.** En la verificacion se escribio
   `0 company_id incorrectos` como texto literal en vez de `%`: 2 placeholders
   con 3 argumentos. Como es un error de compilacion, **nada se ejecuto**. Se
   audito los 19 `RAISE` del archivo de una vez y era el unico.
4. **`1 transacciones siguen con company_id incorrecto`.** Este era el bueno:
   **un trigger lo revivia**. La 023 dejo en `Transaction` dos triggers
   `before insert or update` **sin columna especifica**, que rellenan `company_id`
   si esta NULL. Un `SET company_id = NULL` a secas dispara el trigger con el
   `tenant_id` viejo puesto y la empresa vuelve en la misma sentencia.
   **Hay que limpiar las dos columnas en el mismo `UPDATE`.**

Sin la verificacion 4b, el 4 habria pasado desapercibido: la fila
`051e950a` se habia atribuido a Clinica y el error de verdad estaba en el
trigger, tres bloques mas atras.

### Dos errores de sondeo que casi se reportan como bugs de datos

- **La cadena `"null"`.** Se reporto que `Transaction.tenantId` contenia la
  cadena literal `"null"` en una fila. **No es cierto: es SQL NULL.** El script
  de sondeo lo habia interpolated en una plantilla de JS, que convierte NULL en
  el texto `"null"`. Al filtrar en cliente: **0 de 50 filas** tienen esa cadena.
- **`clienteRTN` como senal de empresa.** `051e950a` tiene
  `clienteRTN = 05011991078008`, casi igual al RTN de Angelos
  (`05011991078001`): difieren en el ultimo digito. Parece una prueba. No lo es:
  `clienteRTN` identifica a un **cliente**, y al medirlo **0 de 23** coinciden
  con el RTN de alguna empresa. Es el RTN de "Sully Calix", que aparece en dos
  facturas de Angelos. Sirvio para descartarlo, no para atribuir.

### Estado verificado despues de aplicarla

```
supplier  Distrubidora Comercial SA -> Empresa 1   compras: 2 (Empresa 1)   OK
transaccion 051e950a -> tenantId=NULL  tenant_id=NULL  company_id=NULL
tenantId   {1:14, ANGELOH7:32, NULL:1, TEST1DS:3}
tenant_id  {1:14, ANGELOH7:32, NULL:4}
tenantid   {NULL:50}                                   <- columna muerta
voucher_number vs voucherNumber: difieren 49 de 50    <- las dos estan rotas
company_id que no corresponde a su tenantId : 0        OK
tenant_id no nulo que contradice tenantId  : 0        OK
reparto: Angelos=32  Empresa 1=14  test 1=3  sin empresa=1
```

Filtrar por `tenant_id` ya **solo devuelve filas propias** en las 8 empresas:
Angelos 32, Empresa 1 14, y 0 en las demas. test 1 ve 0 filas porque sus 3
transacciones quedaron con `tenant_id` NULL; antes via 47 filas de 4 empresas.

`node scripts/verificar-aislamiento.mjs` y `node scripts/verificar-vistas.mjs`
dan `TODO OK`. **`verificar-contexto.mjs` no** y no debe decirse que si: sigue
reportando las 51 tablas sin `company_id` y a Empresa 1 sin membresia.

### Lo que queda abierto de esto

- **`unique_voucher_tenant` protege las columnas equivocadas.** El indice es
  sobre `(voucher_type, voucher_number, tenant_id)`, y esas tres estan corruptas
  (`voucher_type` siempre `'FACTURA'`, `voucher_number` distinto del real en 49
  de 50). La app usa `voucherType`/`voucherNumber`
  (`app/api/accounting/transaction-import/route.ts`). Que no rompa ahora es
  casualidad. Rehacer ese indice es una migracion aparte, con su propia decision.
- **Los montos duplicados de `Transaction`** (`totalAmount` vs `total_amount`
  vs `totalamount`) siguen sin normalizar. No se tocaron aqui a proposito.

## 30 Sept 2026 · 027c escrita, PENDIENTE DE APLICAR (aislar las 8 funciones)

Archivo `prisma/migrations/027c_funciones_contables_aisladas.sql`. Cierra el
agujero que la 027 dejo: las 25 vistas quedaron aisladas, pero
`integrated-books/route.ts` llama a las **funciones**, que eran otra
implementacion paralela de los mismos reportes y no estaban aisladas.

Que hace, en orden: preflight (valida que existan las 8 funciones y las 4 vistas,
y vuelca las firmas de retorno actuales por si hay que comparar), mide cuantas
filas devuelven las 4 vistas sin filtro, borra las 4 vistas wrapper, dropea las
8 funciones con sus **tipos exactos**, las recrea, ajusta permisos y verifica.

- `p_company_id text` obligatorio y **sin `DEFAULT`**: sin el no se puede llamar.
- Se `DROP`ea y se recrea cada funcion. **`CREATE OR REPLACE` con otra firma no
  reemplaza: crea un overload y deja la vieja filtrando.** Por eso el `DROP`
  lleva los tipos exactos, y despues hay un bloque que aborta si sobrevive
  alguno.
- Se quitan los 5 `SECURITY DEFINER` y se devuelve `company_id` en el
  `RETURNS TABLE`.
- Filtros de `Transaction`/`JournalEntry` al `ON`, no al `WHERE`.
- `p_tenant_id` se conserva como filtro que solo estrecha: si no corresponde a la
  empresa, da 0 filas (van en AND, nunca en OR).
- **`update_opening_balances` era escritura sin empresa y con `EXECUTE` para
  `PUBLIC`** (anon key incluida). Ahora valida que la empresa exista, filtra por
  `company_id` y solo `service_role` la ejecuta.
- **`REVOKE ... FROM PUBLIC` en las 8.** Exigir `p_company_id` impide el "dame
  todo", pero no impide `?p_company_id=<la que sea>`: la funcion no sabe si el
  llamador tiene esa empresa. Solo la ruta lo sabe, y usa service role.
- Los `/100` quedan **intactos**: `JournalEntry.amount` tiene unidades mezcladas
  segun el flujo que escribio la fila, y eso es una decision de datos aparte.

Verificacion en la propia migracion (todo en la misma transaccion): por cada una
de las 8 empresas llama las 7 funciones de lectura y aborta si alguna devuelve
una fila de otra; comprueba que las 7 **fallan** si se llaman sin argumentos; y
que las 4 vistas ya no existen.

### Tres intentos antes de que corriera, y lo que cada uno dijo

1. `RAISE NOTICE ... FROM pg_proc ...` no compila: la gramática de plpgsql
   (`raise_stmt` -> `extended_expr_list`) solo admite expresiones separadas por
   comas, asi que el `FROM` se parseaba como parametros extra. El valor va en una
   variable.
2. `RAISE EXCEPTION '... public.%%: %', v, v_sobra` — el `%%` se me coló
   pensando que escapaba un literal y dejo **2 argumentos para 1 hueco**. Por eso
   el "near line 23" apuntaba al tercer bloque, no al primero. De ahi un chequeo
   estatico que compara placeholders contra argumentos en todos los `RAISE`.
3. `Returned type uuid does not match expected type text in column 1` en
   `get_accounts_with_opening_balances`: **los SQL del repo mienten sobre los
   tipos.** `supabase/FULL_SETUP.sql:1102` dice `chart_of_accounts.id TEXT` y en
   la base es `uuid`. Se cambio a `RETURNS SETOF chart_of_accounts` para que la
   forma de la fila la decida la tabla y no una lista escrita a mano.
   Ese error era ademas la buena noticia: venia del bloque 6a, o sea que **las
   6 funciones de reporte ya habian pasado la comprobacion de fuga** sin
   devolver una sola fila de otra empresa.

El bloque 6b tambien se corrigio: su `WHEN OTHERS` reportaba "falla en cerrado"
sin mirar el mensaje, asi que una funcion rota de verdad se habria dado por
buena. Ahora solo acepta `function ... does not exist` y revienta con cualquier
otro error.

## 30 Sept 2026 · `FULL_SETUP.sql` reventaba con 23505 en `idx_user_email`

Al correr `supabase/FULL_SETUP.sql`: `could not create unique index
"idx_user_email"` / `Key (email)=(gcalix12@hotmail.com) is duplicated`.

**No era un dato corrupto, era la restriccion equivocada.** Solo
`FULL_SETUP.sql:111` creaba ese indice como `UNIQUE(email)`; `MASTER_SETUP.sql` y
`scripts/migrations/SUPABASE_COMPLETE.sql` lo creaban **sin** `UNIQUE`. Tres
scripts del repo definiendo el mismo indice de tres maneras, y el que se corria
era el que mas restringia. En un esquema multi-tenant un correo puede ser usuario
legitimo de varios tenants, asi que `UNIQUE(email)` es incorrecto por diseno y
falla sin que haya ningun bug detras.

Cambiado a **`UNIQUE (email, tenantid)`** en `FULL_SETUP.sql` y
`MASTER_SETUP.sql` (con `DROP INDEX IF EXISTS idx_user_email` antes, para que no
queden dos indices sobre las mismas columnas). Verificado contra los datos antes
de escribirlo: **6 filas, 6 pares (email, tenantid) distintos, 0 colisiones, 0
`tenantid` NULL**. Se creo vacio porque el error demuestra que `idx_user_email` no
existia (con `IF NOT EXISTS`, un indice homonimo habria saltado el comando en
silencio).

Lo que NO se toco, y por que:

- **Los duplicados son dos, no uno.** Hay 6 filas para 4 correos:
  `gcalix12@hotmail.com` y `azuna22@outlook.com`, cada uno con 2 filas. Arreglar
  solo el que tiraba el error habria dejado el otro igual.
- **Cada fila tiene un `authid` de Clerk DISTINTO.** Son dos cuentas de Clerk por
  persona, no registros duplicados. El "un `User` y dos membresias" que venia
  documentado en AGENTS.md **no se puede hacer con un `DELETE`**: hay que resolver
  la identidad en Clerk primero.
- **Cada fila es `owner` de una empresa distinta** en `user_company_access` (las
  4 con authid propio son las 4 de las 7 membresias). Borrar una fila le quita la
  propiedad de esa empresa sin avisar. Es un cambio de permisos.
- Ojo: un indice unico trata los NULL como distintos, asi que dos filas con el
  mismo email y `tenantid` NULL no colisionarian. Hoy hay 0 NULL, pero haria falta
  `NOT NULL` aparte para cerrarlo de verdad.

### Hallazgo lateral: `check-email` consulta la tabla equivocada

`app/api/auth/check-email/route.ts:20` consulta **`users`** (otra tabla,
snake_case, con un `SUPER_ADMIN` que no es de auth) y no `User`. El fallback a
`"User"` de la linea 23 solo se dispara si `users` no existe, y ahi usa
`.maybeSingle()`, que con estos duplicados revienta con `PGRST116`. Ademas la
linea 27 filtra `PGRST116` como "sin error", asi que responderia `exists: false`:
la app creeria que el usuario no existe y el registro le haria una tercera fila.
**No se cambio**, porque arreglarlo hace que el endpoint empiece a decir la verdad
y eso cambia el flujo de registro: es decision del usuario.

### `SUPABASE_COMPLETE.sql` no debe correrse en esta base

`scripts/migrations/SUPABASE_COMPLETE.sql` es de otra generacion de esquema:
usa `"tenantId"`, `"isActive"`, `"createdAt"` en camelCase y tablas como
`"Product"`, `"PurchaseOrder"`, `"AccountPayable"`, `"BackupRecord"`,
`"UserActivity"`, que **no existen** aqui (la real es `product`, en minuscula, y
`tenantid`/`isactive`/`createdat`). Sus `CREATE INDEX` fallarian. No se toco.

### `FULL_SETUP.sql` tampoco: se paro en la 42703 y le quedaban 9 sentencias rotas

Arreglado el indice del email, la corrida **siguiente** fallo con
`42703: column "tenantid" does not exist`. Ese error **no era del cambio**:
la corrida anterior moria en la linea 111, o sea que todo lo de despues nunca se
habia ejecutado. Cada error siguiente es uno que ya venia ahi.

Se midio el archivo entero contra el esquema real (OpenAPI de PostgREST) en vez de
ir discovering linea por linea: de los `CREATE INDEX`, **42 compilan, 9 no**.

| Sentencia del script | Real |
|---|---|
| `idx_invoice_tenantid ON "Invoice"(tenantid)` | `tenantId` |
| `idx_invoice_date ON "Invoice"(invoicedate)` | `issueDate` |
| `idx_invoice_createdat ON "Invoice"(createdat)` | `createdAt` |
| `idx_invoice_type ON "Invoice"(invoicetype)` | `invoiceType` |
| `idx_invoice_number ON "Invoice"(invoicenumber)` | `invoiceNumber` |
| `idx_invoiceitem_invoiceid ON "InvoiceItem"(invoiceid)` | `invoiceId` |
| 3 indices sobre `invoice` / `invoiceitem` | **esas tablas no existen** |

Causa: `FULL_SETUP.sql` esta escrito en **snake_case** para las tablas de factura,
pero la base vive en **camelCase de Prisma**. El script es anterior a esa
migracion. Lo de `User` no se rompio porque esa tabla nunca paso al camelCase: tiene
`tenantid`, no `tenantId`.

Peor que los 9 fallos: el script **define las tablas de factura dos veces**,
`Invoice`/`InvoiceItem` en camelCase y `invoice`/`invoiceitem` en minusculas. Como
las minusculas no existen, `CREATE TABLE IF NOT EXISTS` las **crearia vacias**.
Correrlo aqui no arregla nada: anade un juego paralelo de tablas que nadie usa y
muere a mitad.

**Decision del usuario: no correr `FULL_SETUP.sql` en esta base.** El camino que
funciona es el de la serie 027 (migraciones dirigidas, aplicadas y verificadas una
a una). Se deja el archivo como bootstrap para una base nueva, con el indice del
email corregido porque ese si era un bug real.

## 30 Sept 2026 · 027c APLICADA, verificada desde fuera

El usuario la corrió y el SQL Editor devolvio "Success. No rows returned". Eso solo
**no prueba nada**: una migracion que son `DO $$` y `CREATE INDEX` siempre devuelve
eso, y los `RAISE NOTICE` salen en el panel de mensajes, no en la cuadricula. Asi que
se verifico por fuera, llamando a la base de verdad.

Resultado, todo read-only por RPC:

- **Las 4 vistas wrapper dan 404.** `libro_diario_integrado`, `libro_egresos`,
  `libro_ingresos` y `resumen_ingresos_egresos` ya no existen, o sea que el `DROP
  VIEW` de la 027c llego a correr de verdad (no se relajo a medias).
- **Las 7 funciones de lectura aislan, 0 fugas.** Angelos y Empresa 1 dan numeros
  distintos por funcion (13/15/15/6/14/13 contra 8/20/20/7/5/9), asi que no estan
  devolviendo "todo". test 2 y Clinica dan 0 filas en las 6 primeras.
- **`p_tenant_id` contradictorio da 0 filas**, siempre: empresa de test 1 con
  `ANGELOH7`, `TEST185` o `1` -> 0. El tenant estrecha, nunca amplia. Es la
  garantia importante, porque un filtro de tenant mal puesto amplifieria en vez de
  cerrar en falso.
- **Sin `p_company_id` no es invocable**: `PGRST202`, y el mensaje lista
  `available parameter(s): p_company_id`. En el primer sondeo esto se marco como MAL
  porque el regex buscaba "does not exist"; el comportamiento es el correcto,
  el check estaba mal escrito.

### El check de fuga que daba "ok" sin comprobar nada

`get_accounts_with_opening_balances` devolvio **16 filas para test 1 y 16 para
test 2**, el mismo numero exacto para dos empresas distintas. Sospechoso, asi que
se miro: **0 ids de cuenta compartidos**. Son dos conjuntos distintos que casualmente
tienen el mismo tamano. `chart_of_accounts` es su propia tabla (no `Account`), con
24 columnas, y de las 89 filas que devuelven las 5 empresas: Angelos 21,
Empresa 1 0, test 1 16, test 2 16, Clinica 36.

Pero al comprobarlo aparecio un agujero mas serio en el **metodo**: el filtro de fuga
era `filas.filter(f => f.company_id && f.company_id !== pedida)`. Si una funcion
**no devuelve** la columna `company_id`, `f.company_id` es `undefined`, el `&&` lo
descarta y el filtro no compara nada: sale "ok" sin haber mirado una sola fila. Un
"sin fugas" obtenido asi no vale nada.

Rehecho exigiendo `hasOwnProperty('company_id')` antes de concluir nada: **0 filas
sin la columna entre las que devuelven filas, 0 fugas reales**. Las que sale "NO" son
todas de funciones que devolvieron 0 filas, o sea que no hay nada que comparar.

Esto aplica a cualquier verificacion de aislamiento: **comprobar que el campo
existe antes de usar su ausencia como evidencia de que todo va bien.**

### El consumidor era la otra mitad del agujero

`app/api/accounting/integrated-books/route.ts` sacaba el tenant de `x-tenant-id`
**o de `?tenantId`**, sin validar nada: `?tenantId=ANGELOH7` bastaba para leer el
libro de otra empresa. Ahora usa `contextoDeEmpresa`, **400 si no puede
determinar empresa** (sin fallback a tenant) y manda `p_company_id`. El nombre
de la funcion sale de una allowlist, no de la query. Se quito el parametro
`?tenantId` como frontera: se sigue aceptando, pero solo agrupando.

Los dos clientes tienen que mandar `?companyId`, y **no se puede deducir en
servidor desde el tenant**: `TEST1DS` tiene dos empresas y elegir una es
adivinar. `AccountingBooks.tsx` lo saca del `[id]` de la ruta;
`IntegratedBooksViewer.tsx` de `useWorkspace().empresa.id`, y se le quito el
`currentTenant?.id || '1'`, que era un fallback fijo a la empresa 1 (ademas no es
un `companies.id`, asi que nunca sirvio como isolation key).

Typecheck: **481**, el baseline, sin errores nuevos.

Los dos `/100` de `get_libro_mayor_integrado` y `get_balance_comprobacion_integrado`
se movieron al ON por isolation, **sin tocar la division**.

## 30 Sept 2026 · 027d: se aplico, se borro, y era redundante desde el principio

PostgREST no expone los indices, asi que la 027d no se podia verificar por fuera.
Habia que pedir `pg_get_indexdef`, y ahi aparecio la pregunta que de verdad
importaba.

**`User_tenantId_email_unique` ya cubria la invariante:**

```sql
CREATE UNIQUE INDEX "User_tenantId_email_unique"
  ON public."User" USING btree (tenantid, email)
```

"Un usuario por tenant" ya estaba garantizado desde antes de que se escribiera
nada. `idx_user_email_tenant` era **el mismo unique con las columnas al reves**:
un segundo indice unico sobre lo ya cubierto. Se aplico, se confirmo que existia y
era unico, y luego se borro con `DROP INDEX IF EXISTS idx_user_email_tenant;`
(sin error). La migracion quedo **anulada** con el motivo escrito en su cabecera,
para que no aparezca en una lista de pendientes y alguien la ejecute otra vez.

### El error propio, que es lo que hay que sacar de esta entrada

La 027d se escribio porque se comprobo que **no existia un indice llamado
`idx_user_email`** (el que crea `FULL_SETUP.sql`) y de ahi se concluyo "no hay
unicidad de email". Eso no demuestra nada.

Lo que hay que verificar es si la **invariante** ya esta cubierta, no si un
**nombre** concreto esta. Y `CREATE UNIQUE` sobre columnas que ya son unicas
**no falla**: no da error, no avisa, no aparece nada en el SQL Editor. Solo cobra
el doble en cada escritura. **Un "Success" aqui no es evidencia de que hiciera
falta**, igual que un `CREATE TABLE IF NOT EXISTS` que se salta en silencio. La
prueba aqui salio del `pg_get_indexdef` completo, no del exito.

### Lo que la prueba revela sobre los duplicados

Los 4 duplicados (2 correos) **nunca violaron** ese unique, porque sus `tenantid`
son distintos entre si: `cVcLafoZ...`/`ANGELOH7` y `TEST185`/`TEST1DS`. O sea que
la duplicacion **nunca fue un problema de indices**. Es dos identidades de Clerk
por persona, que es un problema de Clerk, no de SQL. Un unico mas fuerte habria
sido solo mas ruido sobre una base que ya estaba bien en ese punto.

### Nombres de Prisma que parecen errores y no lo son

`User_tenantId_email_unique` esta sobre **`tenantid`** en minusculas, y
`User_isActive_idx` sobre **`isactive`**. Prisma nombra el indice por el campo del
schema y la columna real va mapeada con `@map`. **No "arreglarlos"**: si alguien
los renombra, Prisma cree que le faltaron los dos.

### Indice duplicado: YA ESTA BORRADO

`User_tenantId_idx` esta sobre `(tenantid)` y `idx_user_tenant_id` ** tambien
sobre `(tenantid)`: era el mismo indice dos veces. Se borro el manual y se
conserva el de Prisma, porque si se borra el de Prisma la proxima migracion
cree que falta el constraint y lo intente recrear.

```sql
DROP INDEX IF EXISTS idx_user_tenant_id;   -- ejecutado
```

Estado final medido de los indices de `"User"`: quedan 8, y son
`User_tenantId_email_unique (tenantid, email)`, `User_email_idx (email)`,
`User_tenantId_idx (tenantid)`, `User_pkey`, `User_isActive_idx`,
`idx_user_authid`, `idx_user_authid_tenant` e `idx_user_email_tenant_unique`.
**No existen** `idx_user_email_tenant` ni `idx_user_tenant_id`.

Al reves: `User_email_idx` sobre `(email)` **si hay que conservarlo**, aunque exista
el unique `(tenantid, email)`. Ese no sirve para `WHERE email = x` porque la columna
de cabecera es `tenantid`.

### `authid` no es unico

Solo hay `idx_user_authid`, no unico: nada impide que dos filas de `User` apunten
a la misma identidad de Clerk. No habria detectado este caso (el bug es el
contrario, dos Clerk distintos para una persona), pero es el indice que falta como
defensa de profundidad.

### Y entonces se corrio otra vez

La 027d se marco como anulada **solo con comentarios al principio del archivo**, y
eso resulto no ser suficiente: el usuario la volvio a correr y el cuerpo, que
seguia siendo ejecutable, **volvio a crear `idx_user_email_tenant`**. Indice
redundante de vuelta.

**Documentar "no la corras" no es lo mismo que hacer que no se pueda correr.** Un
comentario es una instruccion para quien lee; el cuerpo del archivo es lo que
Postgres ejecuta. Si un archivo no debe tener efecto, su cuerpo tiene que ser un
no-op, no una promesa.

El archivo se reescribio como **comprobacion pura**: un `DO $$` que verifica que
`User_tenantId_email_unique` existe y es unico, avisa con `RAISE WARNING` si
aparece el redundante, y **no crea ni borra nada**. Verificado que no queda ninguna
sentencia `CREATE`/`DROP`/`ALTER`/`INSERT`/`UPDATE` fuera de comentarios. Correrlo
ahora es seguro y no cambia el esquema.

La lesson general, que aplica a los `.sql` del repo: **un archivo de migración
anulado debe ser inocuo por construccion, no por advertencia.**

## 30 Sept 2026 — Las 9 rutas de `app/api/reports/*` migradas a `company_id`

Las 9 tenian **el mismo bug, copied**: leian `?tenantId` de la query y se lo
aceptaban tal cual, sin comprobar nada, con el service role debajo.

```ts
const tenantId = request.nextUrl.searchParams.get("tenantId");
if (!tenantId) return NextResponse.json({ error: "tenantId required" }, { status: 400 });
...  .from("libro_ventas").select("*").eq("tenant_id", tenantId)
```

Dos fallos, y el segundo es el que hacia dano:

1. **No validado.** Cualquiera autenticado ponia `?tenantId=ANGELOH7` y leia el
   reporte de otra empresa. Es el mismo agujero que ya se habia cerrado en
   `integrated-books`.
2. **Ni siquiera filtrando bien.** Aunque el tenant fuera el correcto, dentro de
   `TEST1DS` el filtro por `tenant_id` **mezcla "test 1" y "test 2"**, que es
   justo el caso que la 027 arreglo en las vistas y que estas rutas tiraban a
   suelo.

Las 10 rutas de `app/api/reports/*` (estas 9 mas `balance-general`) ahora usan
`contextoDeEmpresa(request)` + `.eq("tenant_id", empresa.tenantId)` +
`.match(filtroEmpresaOCompany(empresa))`. Las constantes `supabaseUrl`/
`supabaseKey` de la cabecera vieja se fueron: una era la service role.

El `.order(...)` de cada una **se conservo verbatim**. No se toco el orden de lo
que ya funcionaba.

### Los clientes ALSO estaban mal, y en dos sentidos distintos

Las 9 paginas de `/reports/*` mandaban `?tenantId=${currentTenant.id}`. Ahora
usan `useWorkspace().empresa.id` y mandan `?companyId=`. El guard y las deps
del `useEffect` pasaron de `currentTenant?.id` a `empresa?.id`, asi que ademas
**reaccionan a un cambio de empresa**; antes no lo hacian. `useTenant()` se
conserva porque esas paginas siguen mostrando `currentTenant.businessName`.

`WorkspaceProvider` esta en el `app/layout.tsx` raiz, asi que `useWorkspace()`
esta disponible en todo el arbol: no hizo falta tocar layouts.

Las 2 paginas de `app/companies/[id]/reports/` estaban **doblemente rotas**:
mandaban `?tenantId=${companyId}`, o sea un **`companies.id` pasado como tenant**.
Eso no da error, devuelve **cero filas**: es la trampa de `companies.id` vs
`tenant_id` documentada en `AGENTS.md`, presente en el propio cliente. Ahora
mandan `?companyId=${companyId}`.

### Lo que la verificacion NO demuestra (y la primera version que decia que si)

`node scripts/verificar-reportes.mjs` (nuevo, solo lectura) hace tres cosas:

1. Comprueba por **OpenAPI de PostgREST** que las 9 vistas exponen `company_id`
   y `tenant_id`. Va por el OpenAPI y no por una fila de muestra **a proposito**:
   `balanza_comprobacion`, `estado_resultados` y `libro_compras` estan vacias, y
   de una vista vacia no hay claves que sacar. Leer el esquema, no los datos.
2. Con el filtro nuevo, ninguna fila devuelta es de otra empresa. **Comprobado
   donde hay datos**: `libro_diario` 95, `flujo_efectivo_mensual` 10,
   `libro_ventas` 3, `top_clientes` 2, `declaracion_mensual` 1, `resumen_isv` 1.
3. Cuenta cuantas empresas distintas aparecen al filtrar **solo por tenant**.

**La primera version de ese script imprimia "TODO OK" y decia "aislado" con 0
filas a los dos lados.** Era un verde falso: en `TEST1DS` las dos empresas dan 0
filas, asi que "identicas" era trivialmente cierto y no comparaba nada. Es la
misma trampa que ya habia mordido dos veces en este proyecto (el `content-range`
con `**` y el check de fuga que no mira si la columna existe). Ahora el script
dice **"SIN DATOS: no demuestra nada"** y sale con el numero de vistas sin
datos.

**El aislamiento entre "test 1" y "test 2" sigue SIN DEMOSTRAR**, porque ninguna
de las dos tiene filas en estas vistas. La correccion es correcta por
construccion (las vistas exponen la columna, el filtro la usa, el contexto
valida la pertenencia), pero **el caso end-to-end sigue pendiente** hasta que se
carguen datos de la segunda empresa.

### El auditor baja de 76 a 67

`scripts/auditar-aislamiento-rutas.mjs` (heuristico: busca tokens de empresa en
el texto). Bajó de **76 a 67**, exactamente las 9 migradas, y de 63 a 72 las que
tienen algo de empresa. Los 67 restantes **no son 67 fugas confirmadas**: el
heuristico da falsos positivos en ambos sentidos, y ya se vio uno (una ruta que
separa la empresa en la consulta pero cuyo `.eq("tenant_id")` usa una variable
llamada `companyId`). Hay que leerlas una por una.

### Typecheck: el baseline de 481 estaba bien, mi conteo estaba mal

`node node_modules/typescript/bin/tsc --noEmit | Measure-Object -Line` dio **629**
y casi se reporta como "se-added 148 errores". No: son **481 errores TS** en 629
lineas de salida; las otras 148 son lineas en blanco y continuaciones del output
de tsc. **Contar lineas de salida no es contar errores**: hay que contar las que
casan con `error TS`. El baseline de 481 sigue siendo correcto, y los **21
archivos** tocados en este lote tienen **0 errores**.

---

## 2026-09-30 (tarde) — PIP por embeds, storage traversal, y la service role viva

### La service role del repo SIGUE VIVA. Es lo mas urgente de todo esto

**Medido el 2 Oct 2026: no es un fichero, son 33.** La clave de `service_role`
esta **en claro y commiteada** en **33 ficheros de `scripts/`**, todos
rastreados por git. Antes se documentaba como si fuera solo
`scripts/fix-postgres-connection.js:5`, y no lo es. El recuento real:

```
git ls-files -- scripts/            -> 195 ficheros rastreados
de esos, con service_role hardcodeada -> 33
```

Ninguno es un `.env`: `.gitignore` cubre `.env`, `.env*` y `.env.local`, y
`.env.local` **no** esta rastreado (correcto). El problema son codigos que
declaran la clave en una constante en vez de leer `process.env`. Por la forma de
la clave se les reconoce a simple vista: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9`
seguido de `"role":"service_role"`.

**CORRECCION IMPORTANTE (2 Oct 2026): NO hay 2 claves. Hay 1 y 30 copias
typo.** Al decodificar los 33 JWT en vez de compararlos como texto, salio que
**los 33 tienen la MISMA firma** (`BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c`)
pero **payloads distintos**:

| Variante | Ficheros | Que estaba mal |
|---|---|---|
| payload correcto | 25 | — |
| `"ref":"…esct"` | 26 | typo en el `ref` (`esct` en vez de `ec3t`) |
| `"rose":"service_role"` | 6 | **typo en la CLAVE: `rose`, no `role`** |

Y esto no son 33 credenciales distintas: **la firma es la misma en las 7
variantes de texto**, y como la firma cubre header+payload, **todos esos tokens
salvo uno son invalidos** (401 garantizado). Los de `"rose"` ademas ni siquiera
piden `service_role`. O sea que lo que hay en el repo es **una clave buena
copiada 33 veces, casi todas ya rotas**, no 33 claves exposure.

**Lo que esto cambia:** rotar **una sola clave** es suficiente. Antes se decia
"rotar las dos"; era una conclusion de comparar texto, y comparar texto no
distingue "dos claves" de "la misma clave con un typo". El riesgo real es
**la buena, que sigue viva y conectada** (probado el 2 Oct 2026: lee el esquema
de la base sin problema).

**Y el otro lado, que es el que importa:** 7 ficheros tienen el token corrupto,
y eso significa que **nunca funcionaron**. No es que se rompieran: es que
nunca transcribieron bien la clave. `scripts/verify-authId.js` entre ellos.

**Consecuencia de la rotacion:** `scripts/disable-rls.js`,
`scripts/disable-custom-taxes-rls-direct.js` y `scripts/execute-rls.js` existen
precisamente para **desactivar el RLS**. Con la service role en claro, cualquiera
con acceso al repo ejecutarlos deja **todas las tablas de produccion sin RLS**,
y el RLS es la unica barrera de lectura que queda para un `anon`. Ver la
seccion 1: `server-lazy.ts` usa service_role y salta el RLS, asi que la app
tampoco se protege sola.

Alcance real, medido: la clave esta commiteada desde el commit inicial y sigue
en varios commits posteriores, asi que **esta en el historial**. Rotarla la
invalida, pero **no la borra**: seguiria siendo recuperable con
`git log -p`. Si el repositorio es publico en algun momento, hay que tratarlo
como filtrada y no solo como "pendiente de rotar".

### Saneado HECHO (2 Oct 2026), rotacion PENDIENTE

Se sanearon los 33 + **2 mas que aparecieron fuera de `scripts/`**
(`delete-tenant-direct.ts` y `test-tenants-api.js`, que tenian el JWT completo;
los filtros por `scripts/` nunca los habian visto). Estado real ahora: **0 credenciales
en codigo**, verificado con `npm run verificar:credenciales`.

Lo que se hizo, y por que asi:

- **`scripts/_supabase-env.js`** (nuevo): lee `NEXT_PUBLIC_SUPABASE_URL` y
  `SUPABASE_SERVICE_ROLE_KEY` de `process.env` o de `.env.local`, y **aborta con
  un mensaje util** si faltan, en vez de dejar que `createClient` reviente con un
  error de supabase-js que no menciona la clave. Es **CommonJS** a proposito: los
  33 scripts ya eran CJS y un `require` dentro de un `.mjs` no funciona.
- **Ojo con el nombre de la URL:** el proyecto usa **`NEXT_PUBLIC_SUPABASE_URL`**,
  no `SUPABASE_URL`. El cargador acepta los dos, pero si se hubiera escrito solo
  `SUPABASE_URL` **todos los scripts habrian seguido fallando** y el saniado
  habria parecido un exito.
- **La URL tambien se sustituyo** por `supabaseEnv().url` en 32 ficheros. No era
  un secreto, pero viaja a otra instancia es un fallo de config que se lleva el
  script a produccion sin querer.
- **`.env.example`** documenta las dos variables y por que la `service_role` no
  se commitea (salta el RLS).
- **`scripts/verificar-credenciales.mjs` (nuevo)** + `npm run verificar:credenciales`:
  falla (exit 1) si vuelve a aparecer un JWT o una URL de Supabase en el codigo, o
  si un `.env` real acaba rastreado. **Probado por mutacion**: metiendo un JWT
  en un fichero rastreado, lo detecta (3 detecciones); al revertir, vuelve a verde.

Lo que **no** se hizo, a proposito:

- **La clave no se rota.** Eso es lo pendiente y lo unico que importa: sanear el
  fichero **no invalida** nada. La clave que estaba en los 33 sigue viva y
  comprometida, y **sigue en el historial de git**: **6 commits, desde `b858db0`
  (initial commit, 20 jul 2026)**, recuperable con `git log -p -S'eyJ'`. Guia paso
  a paso, con la comprobacion de que la clave vieja da 401, en
  **`docs/ROTAR_SERVICE_ROLE.md`**.
- **Los 6 scripts con token corrupto: probados 2 de 6, y el resultado cambia
  lo que habia escrito aqui.** Antes decia "no se tocaron, ya estan rotos de por
  si, se arreglaran solos". **Eso es medio verdad y induce a error:** el token
  corrupto si desaparece al sanear, pero **eso no significa que el script pase.**
  Medido el 2 Oct 2026:
  - `create-custom-taxes-table-simple.js` → **funciona**: lee `CustomTaxes` y
    dice que la tabla existe. La clave y el cargador van bien.
  - `create-custom-taxes-table.js` → **falla con `PGRST202`**, porque llama a
    `supabase.rpc('exec_sql')` y **`exec_sql` NO EXISTE** en esta base. O sea que
    el fallo no es de la clave: es que el script **nunca pudo crear la tabla**,
    porque su unico mecanismo para crearla no existe. Comprobado en solo lectura:
    `CustomTaxes` tiene **0 filas**, y `exec_sql` y `create_custom_taxes_table`
    devuelven `PGRST202` los dos.
  - Los otros **4 NO se ejecutaron**, y esa es la parte que hay que saber: hacen
    `INSERT` y/o `DELETE` de filas de prueba en `CustomTaxes` (y
    `create-custom-taxes-final.js` ademas usa la tabla `_temp_sql_execution`).
    `create-table-simple.js` tiene un **fallback que inserta** `'test-' +
    Date.now()` si el RPC falla; `create-custom-taxes-robust.js` inserta
    `'Setup Test Tax'` con `tenantId: 'DENTALWD'`, un tenant inventado.
    Ejecutarlos para "probar que funcionan" **escribiria basura en produccion**,
    asi que no se lanzo. `CustomTaxes` se verifico despues: sigue en **0 filas**.
  - O sea que **"deben funcionar ahora" era falso para 4 de 6**: uno dependia de
    un RPC inexistente. Probarlos de verdad es trabajo de decision (que hacer con
    `CustomTaxes`, si existe o debe crearse, y con que RLS), no una prueba de
    credenciales.
- **No se purgo el historial.** Es decision del usuario, y solo importa si el
  repo llega a ser publico. Guia en `docs/ROTAR_SERVICE_ROLE.md`.

Prueba de que el sanado no rompio nada: `scripts/check-tables.js` se ejecuto
contra Supabase y leyo el esquema real de `User`/`Tenant`. El 2 Oct 2026 la clave
**sigue funcionando**, asi que el cargador se probo de verdad, no solo
sintacticamente.

Esto no es un "problema de higiene". La service_role **salta el RLS por completo**
y da lectura y escritura sobre **todo el proyecto**, no solo de una empresa: con
esa clave se leen los datos de los 8 tenants, incluidos los historicos de nomina
de los empleados. Quien la tenga tiene la base entera.

Lo unico que lo arregla es rotarla en el panel de Supabase, y eso **no se puede
hacer desde aqui**: la API de administracion no es accesible con la propia clave.
Cuando se rote, el `.env.local` se actualiza y este archivo se borra, pero la
clave **seguira en el historial de git**, asi que rotar es obligatorio aunque el
archivo desaparezca. No basta con borrarlo.

### Las tablas hijas de PIP no tienen empresa: se aisan por el plan

Medido contra el esquema (OpenAPI), no supuesto: **`pip_goals`, `pip_evaluations`,
`pip_evidence` y `pip_attendance_metrics` NO tienen `company_id` ni `tenant_id`**.
Solo `pip_plans` las tiene, y de ahi cuelgan por FK.

El patron automatico habia puesto `.eq("tenant_id", ...)` y
`.match(filtroEmpresaOCompany(...))` en esas cuatro, lo que en runtime da
**`42703 column pip_evaluations_1.company_id does not exist`**: las rutas de PIP
estaban rotas, no solo sueltas. Y el `.insert()` con esas columnas daba
`23503`. Ahora:

- **GET**: `select('*, pip_plans!inner(id, tenant_id, company_id)')` y filtro sobre
  `pip_plans.tenant_id` / `pip_plans.company_id`.
- **POST**: se valida antes que el plan del cuerpo sea de esta empresa, y se
  inserta `pip_plan_id: plan.id`. El `goalId` tambien se valida por embed antes
  de actualizar el objetivo (antes era un IDOR abierto).
- **DELETE**: se comprueba la pertenencia con una lectura y, solo si es, se borra
  por `id`. Filtrar el `DELETE` directo por empresa no es posible.

**Comprobado que los embeds anidados existen** (que es lo que el typecheck no
puede ver, y si la relacion no estuviera declarada PostgREST daria `PGRST200` en
tiempo de ejecucion):

| Consulta | Resultado |
|---|---|
| `pip_evaluations -> pip_plans` | **200**, 6 filas |
| `pip_goals -> pip_plans` | **200**, 3 filas |
| `pip_attendance_metrics -> pip_plans` | **200**, 0 filas |
| **CONTROL**, misma consulta con `company_id` equivocado | **200, 0 filas** |

El control es lo que demuestra el aislamiento: mismo endpoint, empresa falsa, 0
filas. **Ojo: hoy todas las filas de PIP son de Angelos** (2 planes, 3 objetivos,
6 evaluaciones), asi que el reparto por empresa **no** alcanza a provar la fuga;
la prueba es el control, no que las otras den 0.

### El GET de `pip_evaluations` no filtraba NADA

Antes de esto el GET construia la consulta y le ponia `.order()`, sin filtro de
empresa ni de tenant. Con service role debajo, eso no devolvia cero filas: era
una lectura completa de la tabla para cualquier sesion valida. Es de los pocos
casos donde el bug era una fuga y no un cierre en falso.

### `hr/storage`: traversal sin autenticacion

`app/api/companies/[id]/hr/storage/route.ts` era el archivo mas roto de RRHH, y
no por un filtro que faltara:

1. **No tenia `auth()` ni contexto.** Cualquiera que llegara al handler podia
   ejecutarlo.
2. **El POST construia la ruta con `tenantId` del `formData`**, y con service
   role eso es escribir en el almacenamiento de otra empresa. Ademas
   `upsert: true` permitia **sobrescribir** un fichero existente.
3. **El DELETE era un traversal:** `bucket` y `path` los elegia el cliente y se
   ejecutaba `.remove([path])` sin comprobar nada. Con eso se borra en cualquier
   bucket.

Ahora: el bucket lo decide el servidor por tipo, el prefijo es el `tenant_id`
**real** derivado de la empresa validada, el empleado tiene que ser de esta
empresa, y el borrado exige que la ruta empiece por su prefijo y no tenga `..`.
Sigue **sin** comprobar que la ruta corresponda al empleado que se dice, pero ya
no sale de la empresa.

### Los buckets: `employee-photos` era PUBLICO y ya NO lo es

Medido con `GET /storage/v1/bucket`:

| Bucket | Antes | Ahora |
|---|---|---|
| `employee-photos` | **PUBLICO** | **privado** (`public=false`) |
| `employee-documents` | privado | privado (sin cambio) |
| `company-logos`, `product-photos`, `ticket-attachments` | publico | publico (a propósito: se sirven por URL) |

Las dos rutas de RRHH usaban **`getPublicUrl` para los dos**. Consecuencias:

- Una **foto de un empleado** era legible por cualquiera que tuviera la URL, sin
  sesion. Son datos personales.
- Un **documento de empleado**, al ser el bucket privado, devolvia una URL que da
  403: el POST respondia `success` con un enlace que no servia.

**Resuelto el 30 Sept 2026.** `employee-photos` se puso en `public=false` por la
API de Storage (sin DDL) y **ambos buckets estan vacios**, asi que no habia nada
que migrar. La UI se adapto en el mismo cambio: `components/hr/ArchivoPrivado.tsx`
convierte el path guardado en un `signedUrl` de 1 hora, y las dos paginas de RRHH
guardan **paths**, no URLs.

Verificado end-to-end contra el bucket, no de palabra: objeto temporal subido
(200), **URL publica da 400**, firma da 200, y la URL absoluta
`{SUPABASE_URL}/storage/v1/object/sign/...` se sirve bien (8 bytes). Objeto
borrado al terminar; los dos buckets quedaron en `[]`.

- **Cuidado:** `createSignedUrl` devuelve una ruta **relativa**
  (`/object/sign/...`). Para un `<img src>` hay que prefijarla con
  `${SUPABASE_URL}/storage/v1`, y el cliente **no conoce `SUPABASE_URL`** (es
  variable de servidor), asi que el GET del storage devuelve la URL ya absoluta.
  Por eso `ArchivoPrivado` llama a la API y no a supabase-js.
- La firma dura **3600 s**. `ArchivoPrivado` la pide en cuanto cambia el path, pero
  **no tiene temporizador**: si la foto se queda mucho tiempo en pantalla sin
  cambiar, caduca y se vera rota. Pendiente si molesta en la practica.

### `hr/accounting` reenviaba el empresaId como si fuera el tenant

Saco el `companyId` del **pathname** con `pathname.split("/")[3]`, sin validar
contra la sesion (`auth()` solo comprueba que haya usuario), y lo mandaba como
`tenantId` a contabilidad. O sea un `companies.id` en la columna de tenant: la
misma confusion que hace que estas rutas devuelvan cero filas sin error. Ahora usa
`contextoDeEmpresa` y propaga el tenant real. **No tiene ningun consumidor** (no
hay ni un fetch a `/hr/accounting`), asi que el cambio no rompe nada.

### `attendance/migrate` hace DDL sin autenticar — NO TOCADA

`POST` abre una conexion `pg` y ejecuta `ALTER TABLE attendance ADD COLUMN`. **Sin
`auth()`, sin contexto, sin nada.** Es una ruta de escritura de esquema
ejecutable por cualquiera que la alcance. **No la he tocado**: borrarla o protegerla
es decision del usuario, no una correccion silenciosa. Es el pendiente mas
importante que queda en RRHH.

### El auditor baja de 67 a 64

Los 3 que quedan menos son los de RRHH arreglados aqui. Quedan **64 rutas sin nada
de empresa**, y el bloque grande ya no es RRHH sino contabilidad
(`period-closing` con 14, `uploaded-files` con 7). `period-closing` toma el tenant
del header o de la query **sin validar** y filtra por tenant, o sea que en
`TEST1DS` el cierre de un tenant incluiria los movimientos de sus dos empresas. Es
el siguiente bloque de trabajo, y es grande.

**Typecheck: 481, el baseline intacto.** Los archivos tocados en esta tanda tienen
0 errores. Uno propio (`hr/accounting`, cabeceras con `string | null`) se corrigio
con una guarda explicita: `contextoDeEmpresa` devuelve `tenantId: string | null`, y
sin la guarda el `fetch` con `x-tenant-id: null` no compila.

---

## 2026-09-30 — 027f y 027g APLICADAS: el cierre en falso era de 7 vistas, no de 3

**"Success. No rows returned" es el resultado NORMAL de estas dos migraciones.**
`CREATE OR REPLACE VIEW` y los bloques `DO $$` no devuelven un conjunto de
resultados, asi que el SQL Editor no tiene nada que pintar. **Un "No rows
returned" aqui no es un fallo ni falta de datos: es que la sentencia no es un
SELECT.** La unica prueba de que funcionan es `verificar-reportes.mjs`.

### El canario: por que "0 fugas" no era prueba de nada

El verificador filtraba por tenant **y** empresa:

```ts
`${vista}?select=*&tenant_id=eq.${tid}&company_id=eq.${e.id}`
```

Con lo que un **0** aqui significa dos cosas indistinguibles: "esta bien aislada"
o "el filtro de tenant se ha comido sus propias filas". Las dos salian igual:
0 fugas, TODO OK. Se necesitaba el caso end-to-end de dos empresas del mismo
tenant, y ese caso existia: **test 1 y test 2 comparten `TEST1DS`, y test 1
tiene 3 transacciones y 6 asientos propios.** Solo que sus filas no llegaban a
la vista, y por eso test 1 salia como "sin datos".

Anadido el canario al verificador: consulta la vista **por `company_id` sola** y
compara. Si `porEmpresa > 0` y `conFiltro === 0`, avisa **CIERRE EN FALSO** y
cuenta como FALLA. Es la comprobacion que faltaba, y es la que hizo aparecer
esto a la primera.

### Lo que destapo: 7 vistas, y las peores eran las que tienen datos

El canario reporto 4 de las 9 vistas de reporte, y al medir la causa se
ampliaron a 7. Las columnas de tenant estan duplicadas y **las vistas leian la
columna equivocada**:

| Origen | Columna buena | Columna que leian las vistas |
|---|---|---|
| `Account` | `"tenantId"` (camel) — **43/43 cuentas** | `tenant_id` (snake) — **NULL en las 43** |
| `Transaction` | `"tenantId"` (camel) | `tenant_id` (snake) — NULL en las 3 de test 1 |

Las 7 afectadas: `balance_general`, `balanza_comprobacion`, `libro_mayor`,
`estado_resultados` (leian `a.tenant_id` de `Account`), y `libro_diario`,
`flujo_efectivo_mensual`, `v_transacciones_cierre` (leian `t.tenant_id` de
`Transaction`).

**Las 4 primeras eran las graves**, porque `Account.tenant_id` esta en NULL en
**todas** las cuentas, no solo en test 1:

| Vista | Antes | Despues |
|---|---|---|
| `balanza_comprobacion` | 0 filas (Angelos tenia **15** cuentas) | **35** |
| `estado_resultados` | 0 filas (Angelos 6, Empresa 1 8) | **14** |
| `libro_diario` | 95 filas, test 1 **0** de 6 | **101**, test 1 **6** |
| `flujo_efectivo_mensual` | 10 filas, test 1 **0** de 2 | **12**, test 1 **2** |

O sea: **la balanza y el estado de resultados le salian VACIOS a Angelos y a
Empresa 1**, que son las unicas empresas con datos de verdad. No era una fuga:
era al reves. Y durante semanas "0 fugas" lo habia dado por bueno.

`v_transacciones_cierre` era el caso mas extremo: tenia
`WHERE t.tenant_id IS NOT NULL`, o sea que las 3 transacciones de test 1
**no entraban en la vista** y el cierre de periodos no las veia. No es un
problema de filtro, es una fila que no existe para el consumidor.

### Las 2 migraciones

- **`027f_vistas_tenant_id_desde_camelcase.sql`** — `libro_diario`,
  `flujo_efectivo_mensual`, `v_transacciones_cierre` (las 3 ramas de la UNION).
- **`027g_vistas_tenant_id_de_account.sql`** — `balance_general`,
  `balanza_comprobacion`, `libro_mayor`, `estado_resultados`.

Usan `COALESCE("tenantId", tenant_id)` y no solo la camel, para que un flujo
antiguo que solo escriba la snake no vuelva a dejar ciego al reporte.

**No se rellena la columna `tenant_id` de las 3 transacciones de test 1**, que
siguen en NULL a proposito: comparten `(FACTURA, 1)` y rellenar haria chocar el
indice unico `unique_voucher_tenant`. Lo que cambia la migracion es **de donde
se lee** el tenant, no el dato almacenado. Ese era el error facil de cometer al
arreglar esto.

### El aislamiento entre test 1 y test 2: AHORA SI DEMOSTRADO

Es la primera vez que este proyecto tiene esa prueba, y salio de rebote: no hizo
falta cargar datos, ya habia un caso end-to-end en la base que nadie miraba.

`libro_diario` **test 1=6 / test 2=0** y `flujo_efectivo_mensual`
**test 1=2 / test 2=0**, las dos bajo el mismo tenant `TEST1DS`: "(distintas,
aislado)".

Y se comprobo la **direccion** de la fuga, que es la que importa y la que el
conteo por empresa no cubre: pedir una fila concreta de test 1 filtrando por
`company_id` de test 2 devuelve **0**. Con 6 filas de muestra, 0 fugas.

Ojo al leer ese resultado: "filtrada con el tenant de test 2 devuelve 6 filas"
**no es una fuga**. Las dos empresas comparten el literal `TEST1DS`, asi que el
tenant **no puede** separarlas por diseno; para eso esta `company_id`. Si
`company_id` devolviera filas ajenas, eso si seria una fuga.

### Estado

`verificar-reportes.mjs` -> **TODO OK (vistas sin datos: 1/9)**. Queda solo
`libro_compras`, que es falta de datos base (0 facturas `EXPENSE`), no un bug de
aislamiento. `verificar-aislamiento.mjs` y `verificar-vistas.mjs` siguen TODO OK.
Typecheck 481, baseline intacto.

**Lo que sigue pendiente de esto:** aplicar la canario tambien a
`verificar-hr.mjs`, que tiene la misma forma de check y por tanto el mismo
ciego. Y `Account.tenant_id` en NULL en las 43 cuentas es un dato sucio de
partida: las migraciones lo esquivan con `COALESCE`, pero la columna sigue sin
poblar y cualquier vista o consulta nueva que la lea se topa con lo mismo.

### 027e APLICADA: 48 de 49 empleados, y el que queda es correcto que quede

`verificar-hr.mjs` (con el canario de cierre en falso ya puesto) da **12 tablas
que pasaron de 0 filas a datos, 0 fugas**. Y avisa de **1 sola** fila sucia, no
49: la 027e esta aplicada.

La que queda es `Sully`, pero **esta nota estaba incompleta y se corrige** (medido
el 30 Sept 2026 con `select=*`, no con los nombres de columna adivinados):

| Campo | Valor real |
|---|---|
| `id` | `a8053f93-72b3-49c7-83f2-e66d404aba45` |
| nombre | **Sully Chieza** (no Calix) |
| `company_id` | `"demo-company-id"` — un **placeholder**, no un NULL |
| `tenant_id` | `NULL` |
| `employee_code` | `ANGE-0001` |
| RTN | `0501199107800` |

1. **NO es el super admin.** El `SUPER_ADMIN` es **Sully Calix**
   (`gcalix12@hotmail.com`, `auth_id user_3IbveWjN…`). Sully Chieza es otra
   persona distinta, con su propia identidad de Clerk
   (`azuna22@outlook.com`, `role USER`, `auth_id user_3JRMf9o…`). Comparten el
   nombre de pila, nada más.
2. **La evidencia se contradice y por eso no se toca:** el RTN `0501199107800`
   está documentado más arriba en este archivo como el de **Sully Calix**, y el
   `employee_code` es `ANGE-0001` (parece Angelos), pero el `company_id` es
   `"demo-company-id"`, que **no existe** en `companies`. O sea: los tres campos
   apuntan a tres sitios distintos.
3. Por eso **no se asigna ni se borra**: no hay forma fiable de saber a qué empresa
   pertenece. Necesita una decisión tuya. Lo más probable es una fila de semilla o
   demo que sobró, pero "probable" no es evidencia.

Con esto **las rutas de RRHH ya sirven datos de verdad**, que era el bloqueante
que arrastraba desde el principio del trabajo.

Anadido tambien a `verificar-hr.mjs` el canario de cierre en falso: consulta
por `company_id` sola y avisa si el filtro de tenant esconde filas propias. En
RRHH **no ha encontrado ninguno**, que es lo esperable: ahi el problema era el
contrario (filtros por `company.id` en vez de `companies.id`, o sea fuga), no
datos escondidos. El canario se puso igual porque el script tenia el mismo
ciego de forma, no porque se supiera que iba a dar positivo.

Las 4 tablas hijas de PIP salen "(no existe o no se puede leer)" porque **no
tienen columna `company_id`**: no es un fallo del script, es exactamente el
motivo por el que ahora se aisan por el embed a `pip_plans`. El script no cubre
el caso PIP; lo cubren la sonda de embeds y el canario de `verificar-reportes`.

---

## 30 Sept 2026 — Las 8 cuentas "basura legacy" NO eran basura (y 2 alimentan el 64% del libro)

Al ir a decidir que hacer con las 8 `Account` sin `company_id` que arrastraban
desde la 023, se midiieron los movimientos en vez de asumir. **La suposicion de
este archivo era falsa** y habria roto el historico contable:

| Cuenta | Tenant declarado | Asientos | Uso real |
|---|---|---|---|
| `1101` Caja y Bancos | `tenant_001` | **42** | Angelos 27, Empresa 1 12, test 1 3 |
| `4101` Ingresos por Servicios | `tenant_001` | **23** | Angelos 13, Empresa 1 7, test 1 3 |
| `1102`, `1301`, `1501`, `5102`, `5201`, `2201` | `tenant_001` / `default-tenant` | 0 | — |

`1101` y `4101` son **una unica fila de cuenta compartida por tres empresas**, con
un `tenantId` (`tenant_001`) que no existe en `Tenant`. Los datos son reales:
importes HNL no nulos (0 ceros de 65), 42 `Transaction` existentes, rango
2024-01-01 .. 2026-09-30, suma -167.560,00 HNL.

Tres consecuencias:

1. **Es el 64% del libro entero** (65 de 101 `JournalEntry`).
2. **`v_transacciones_cierre` no los muestra** (0 de 98 filas son de estas
   cuentas): la vista une por tenant, y estas cuentas no tienen el tenant de nadie.
   Los saldos de Angelos, Empresa 1 y test 1 salen mal en el cierre.
3. **La 028 no lo arregla**, y por eso sigue ahí: 028 solo rellena `tenant_id`
   cuando el tenant camel existe en `Tenant`, y `tenant_001` no existe.

**Reparacion escrita** (no aplicada): `030_dividir_cuentas_compartidas_por_empresa.sql`
crea una copia de `1101` y `4101` por cada empresa que las usa, con su `tenantId` y
`company_id` correctos, y reapunta cada asiento a la copia de su propia
`company_id` (que es dato fiable 101/101, segun la 027b). El criterio no admite
ambiguedad: cada asiento va a la cuenta de su empresa, sin heuristica. La 030
**aborta** si los conteos ya no son 42/23/3/8, e es **idempotente**. Las 6 cuentas
con 0 asientos si son basura, pero la 030 no las borra: eso es DML destructivo y
te toca a ti.

**Aplicar 030 en el SQL Editor y luego verificar** con las 4 consultas del pie del
archivo. Esperado: 98 -> 163 filas en `v_transacciones_cierre`, 0 asientos apuntando
a una cuenta sin `company_id`, y las 8 filas originales con 0 asientos (esa es la
condicion para poder borrarlas despues).

### La 030 (v1 y v2) fallaron con 23505 y el UNIQUE global era LA CAUSA, no un obstaculo

Primer intento: `ERROR: 23505 duplicate key value violates unique constraint
"Account_name_key"` / `Key (name)=(Caja y Bancos) already exists`. Todo dentro de
`BEGIN/COMMIT`, asi que **hizo rollback completo**: se comprobo despues que siguen
habiendo 8 cuentas sin `company_id` y 43 cuentas en total, sin estado a medias.
(Ese "43 en total con 8 huerfanas" era el estado del 30 Sept. **Hoy ya no: se
mide 43 en total y 0 sin `company_id`.** Ver "Migracion 039".)

La causa no fue un dato mio: **`Account` tiene un indice unico global sobre
`name`** (y con el mismo racha, `code`). En multi-empresa eso es un error de diseno,
porque **toda empresa tiene una "Caja y Bancos"**: con ese `UNIQUE` es imposible que
dos empresas tengan el mismo plan de cuentas. Y eso es precisamente lo que provoco el
bug original, en cadena:

1. La semilla quiso dar una `1101` a cada empresa.
2. El UNIQUE global de `name` se lo impidio.
3. Creo **una** `1101` compartida con un tenant inventado (`tenant_001`).
4. Le colgo los asientos de las tres empresas (65 en total).

O sea: el UNIQUE no estorbo para limpiar el problema, **lo creo**.

**El segundo intento fallo con el MISMO error exacto, y ahi estaba la leccion.** El
bloque 0b (v2) buscaba los unicos en `pg_constraint` con `contype='u'`, no encontro
el de `name`, no dropeo nada, y el `INSERT` volvio a chocar igual: **el unico de
Prisma se crea con `CREATE UNIQUE INDEX`, o sea que es un indice, no un constraint de
tabla**, y no aparece ahi. Pero Postgres **reporta tambien** `violates unique
constraint "Account_name_key"` para un indice suelto, porque el mensaje usa el nombre
del indice. Asi que el sintoma era identico y no daba ninguna pista de que el `DROP`
no se habia hecho.

La v3 recorre `pg_index` (`indisunique`, `indnkeyatts`,
`pg_get_indexdef(oid, 1, true)` para el nombre de la columna), salta la PK, y baja
`CONSTRAINT` o `INDEX` segun corresponda. **Y aborta si no dropea ninguno**, que es
justo el fallo silencioso que hacia perder un intento entero.

Comprobado ademas que **no hay nada en el codigo que dependa de ese UNIQUE**: ni un
`.eq('name')` sobre `Account` en todo el repo; `lib/accounting/resolve-account.ts`
resuelve por **prefijo de codigo**. Y `Account_name_key` **no esta en
`prisma/schema.prisma`** (alla `name` no es unico), asi que quitarlo **elimina**
drift en vez de crearlo.

La v3 pone los unicos que si tocan: `UNIQUE (company_id, code)` y
`UNIQUE (company_id, name)`. Medido antes de escribirlos: **0 duplicados** en ambas
combinaciones sobre las 35 cuentas legitimas, asi que se pueden crear.

**Bug latente que la 030 NO toca:** `unique_code_tenant` es
`UNIQUE (code, tenant_id)`, o sea por tenant y no por empresa. Como **test 1 y test
2 comparten `TEST1DS`**, las dos no pueden tener una `1101`. Hoy no choca porque
test 2 no tiene cuentas. Cambiarlo a `(code, company_id)` exigiria tocar tambien
`schema.prisma`, asi que queda pendiente.

**Dos errores propios que casi costaban la migracion**, por si aparecen otra vez:

- **`Account.id` es `text`, no `uuid`** (en el schema es `cuid()`). Escribi
  `gen_random_uuid()` a secas, que se apoya en que exista un cast uuid->text. Ahora
  va con `::text` explicito.
- El `UPDATE ... FROM` con un `JOIN` cuya condicion referenciaba la tabla destino
  (`copia."company_id" = je."company_id"`) se reescribio como `WITH destino AS
  (...) UPDATE ... FROM destino`, que es inequivoco. La forma con `JOIN` anidado
  en el `FROM` de un `UPDATE` es valida en Postgres pero fragil de leer y de
  depurar; cuando falle, no va a decirte por que.

### Consecuencia a decidir tras aplicar la 030

`resolveAccountId('ANGELOH7', ['1101'])` busca por prefijo con `.order('code')` y
`.limit(1)`. Angelos ya tenia `1101-01 Caja General` y `4101-01 Ingresos por
Ventas`; al crear la copia `1101`, **esa gana el prefijo** ( `"1101" < "1101-01"` )
y `1101-01` queda sin uso. No se pierde nada (los 13 y 27 asientos historicos se
quedan en la `1101` nueva), pero Angelos pasa a tener **dos cuentas de caja** y
habra que elegir cual manda. La 030 no cambia esa logica: es una decision de
contabilidad, no de codigo.

### Otras cosas corregidas en esta sesion

- **`Sully` no es el super admin** (detalle mas arriba): es **Sully Chieza**, con
  `company_id = "demo-company-id"` (placeholder) y `tenant_id` NULL. El super
  admin es **Sully Calix**. La nota anterior decia que "no tiene empresa que se le
  pueda asignar"; ahora se sabe que tiene un `company_id` que no existe, y que el
  RTN que trae es el de Calix. Sigue sin tocarse: la evidencia no alcanza.
- **`employee-photos` paso a privado** y la UI se adapto a URLs firmadas (detalle
  en la seccion de buckets). Los dos buckets de RRHH estan vacios.
- **Regla de PIP documentada en `AGENTS.md`**: `pip_evidence` (y las otras tablas
  hijas) no tienen `company_id`; se aisan validando el `planId` contra
  `pip_plans.company_id` **antes** de leer o escribir. No hay ninguna ruta de
  `pip_evidence` todavia, y la regla esta ahi para que la proxima no la invente.
- **Typecheck: 481, sin regressions.** Los cambios de storage/UI no
  suman errores. (Hubo un pico a 484 por el tipo de `ContextoEmpresa`, que es
  `string | null`: corregido guardando los NULLs en el validador.)

### La 030 sola NO arreglaba el cierre: faltaba la 031 (30 Sept 2026)

Tras aplicar la 030 el usuario reporto "Success. No rows returned", y la
verificacion contra la base dio: 6 copias creadas, 0 asientos apuntando a cuentas
sin `company_id`, 65/65 reapuntados. **Pero el cierre seguia mal.** Medido:

- `v_transacciones_cierre` devolvia **98 filas, 49 de ellas `PENDIENTE`, y 0 con
  `cuenta_codigo`**. Los 65 asientos reapuntados no aparecian con su cuenta.

**Causa raiz, medida y no supuesta:** `JournalEntry` tiene tres convenciones de
columna y estan pobladas de forma desigual:

| Columna | Filas pobladas (de 101) |
|---|---|
| `accountId` | **101** |
| `account_id` | 36 |
| `accountid` | 36 |
| `transactionId` | **101** |
| `transactionid` | 36 |

La app escribe y lee la camelCase. La **030 solo cambio `accountId`** (correcto:
es la buena). Pero `v_transacciones_cierre` (027f) unia por
`je.transactionid`/`je.accountid`, que para 65 asientos estan en **NULL**. Por eso:

- esos 65 no entran por la rama 1 (`je.transactionid = t.id` no casa);
- su transaccion cae en la rama 2, que con `NOT EXISTS (transactionid ...)` cree
  que no tiene asientos y la emite como `PENDIENTE` con `total_amount` entero;
- y donde si entra, `a.id = je.accountid` da NULL -> `cuenta_codigo` vacio.

El diagnostico viejo ("la vista une por tenant") era **incompleto**: el problema
no era el tenant, eran las columnas snake.

**La 031** (`031_v_transacciones_cierre_columnas_camel.sql`, **PENDIENTE de
aplicar**) reescribe las 3 ramas con `COALESCE(je."accountId", je.accountid,
je.account_id)` y `COALESCE(je."transactionId", je.transactionid)`. El `NOT EXISTS`
de la rama 2 usa la **misma** resolucion, o la transaccion sale dos veces. No toca
`origen`/`estado` a proposito: `Transaction.voucher_type` esta sucio (`FACTURA`
en las 50) y arreglarlo es otro tema. La verificacion final avisa (**WARNING, no
EXCEPTION**) de los asientos sin cuenta resoluble, porque eso es un problema de
datos que se repara en la 032 y no debe impedir desplegar la vista.

### La otra mitad: cuentas de empresa ajena (032)

Con la 031 ya se veria el problema que tapaba el bug de las columnas: **15 de los
101 asientos son de Angelos (`7bd123d8`) pero apuntan a cuentas de Empresa 1
(`73d5bbf7`): 14x `acct-6103` "Gastos Operativos" y 1x `acct-3101` "Capital
Social".** Son los "COGS" que se insertaron con el **id de cuenta cableado** de la
otra empresa. Bajo service role esto es saldo cruzado real.

**La 032** (`032_cuentas_de_otra_empresa.sql`, **PENDIENTE**) generaliza la 030 a
la forma inversa: para cada (cuenta, empresa de asiento) donde la cuenta es de
otra empresa, crea la copia para esa empresa y reapunta. Es generica (no codifica
`3101`/`6103`), con preflight que aborta si falta `companies.tenant_id` o si la
empresa destino ya tiene otra cuenta con el **mismo nombre y distinto codigo**
(eso es elegir nombre de cuenta, no un default). Verifica al final que quedan 0.

### El cierre ya no suma a ciegas lo que no puede clasificar

`app/api/accounting/period-closing/route.ts`:

- Nuevo `asientosSinCuenta`/`asientosSinCuentaCount`: asientos **publicados** con
  `cuenta_codigo` vacio. Antes se sumaban a `totalDebits/Credits` sin ir a ninguna
  cuenta, o sea descuadre invisible. Ahora `cerrarPeriodoContable` **rechaza el
  cierre** con un mensaje propio antes de mirar la balanza.
- Los totales y `isBalanced` se calculan **solo** sobre los asientos publicados con
  cuenta resoluble. Antes sumaban tambien los `PENDIENTE`, cuyo `debito`/`credito`
  sale del `total_amount` entero (una fila, no partida doble): `isBalanced` no
  significaba nada.

### Estado de migraciones al cerrar la sesion

Aplicadas y verificadas contra la base: **030**, **031**, **032**, **029**,
**033** y **028** (la corregida). Ninguna pendiente.
Typecheck: **481**. Sondas `_ver*`/`_probe*` borradas.

### La 028 decia "Success" pero afectaba 0 filas (bug de `<>` con NULL)

El usuario aplico 028, 029 y 033. Verificado:

- **033 OK**: la vista quedo en **103 filas, 0 `PUBLICADO` en blanco, 0
  transacciones con estados mezclados**. Los 2 `PENDIENTE` son transacciones
  `INGRESO` sin asiento (correcto).
- **029 OK**: `period_locks` 5 filas, 0 con `company_id` NULL, 0 duplicados en
  `(company_id, year, month)`.
- **028 NO hizo nada**: seguian 35 cuentas con `tenant_id` NULL y un `"tenantId"`
  que **si existe** en `Tenant` (20 de `1`, 15 de `ANGELOH7`).

**Causa:** el `UPDATE` de la 028 llevaba
`AND a."tenantId" <> a.tenant_id`. Con `a.tenant_id IS NULL`, esa comparacion es
`texto <> NULL` = **NULL**, no `TRUE`, asi que el `WHERE` descartaba justo las
filas que habia que rellenar: **afectaba 0 filas**. El editor dice "Success. No
rows returned" porque un `UPDATE` de 0 filas no es un error. Corregido a
`a."tenantId" IS DISTINCT FROM a.tenant_id`, y anadido un post-check que
**aborta** si queda alguna cuenta rellenable (para que un no-op silencioso no
vuelva a pasar). **Re-pendiente de aplicar la 028 corregida.**

Regla: al rellenar una columna que puede ser NULL, **`<>` nunca sirve como guard**;
usa `IS DISTINCT FROM`. Y una migracion de solo-`UPDATE` sin post-check no puede
distinguir "no habia nada que hacer" de "no hizo nada".

La version corregida tampoco se aplico desde el SQL Editor (se re-ejecuto texto
viejo: decia "Success" otra vez y seguian las 35). Se verifico que no era un
trigger que revirtiera (un `PATCH` de prueba a `1101-01` persistio) y **se aplico
por REST** el mismo UPDATE (`tenant_id` = `"tenantId"` en las que cumplian, 34
filas + 1 de la prueba). Estado final verificado: **43/51 con `tenant_id`**, 0
incoherentes, y las **8 huerfanas** (`tenant_001`, `default-tenant`) sin tocar.
`verificar-vistas`, `verificar-aislamiento` y `verificar-reportes`: **TODO OK**.

### Resultado real de la 031 + 032, y la 033 que hizo falta (30 Sept 2026)

El usuario aplico 031 y 032 ("Success. No rows returned"). Verificado contra la
base:

- **0** asientos apuntan a una cuenta de otra empresa (antes 15).
- `v_transacciones_cierre`: **105 filas, 101 con cuenta, 4 en blanco**.

Las 4 en blanco destaparon **otro bug, de la 027f original**: la **rama 1** hace
`LEFT JOIN "JournalEntry"` y no tenia `AND je.id IS NOT NULL AND a.id IS NOT NULL`.
Consecuencia: las transacciones **sin asiento** salian en la rama 1 como
`PUBLICADO` en blanco **y** en la rama 2 como `PENDIENTE` (duplicadas). Mismo
solape entre la rama 1 y la 3 para asientos sin cuenta. Los 2 casos medidos son
`a4639705` y `74c3ea30` (Empresa 1, `INGRESO`, **0 asientos** cada una).

Con las columnas snake de la 027f el solape quedaba tapado (la rama 1 casi siempre
daba blanco). Al arreglar las columnas en la 031, el defecto de la 027f salio a la
luz.

**La 033** (`033_v_transacciones_cierre_ramas_disjuntas.sql`, **PENDIENTE**) anade
los dos guards a la rama 1, dejando las tres ramas disjuntas. Verifica al final que
no queda ningun `PUBLICADO` sin cuenta ni transaccion con estados mezclados.
Resultado esperado: **103 filas, 0 en blanco**.

Nota para el cierre: los 2 `PENDIENTE` son transacciones `INGRESO` sin asiento
(incompletas de verdad), asi que el cierre las bloquea correctamente
(`asientosPendientesCount`). Tras la 033, `asientosSinCuenta` solo se activa con
cuentas realmente irresolubles (la rama 3), no con este falso positivo.

### Auditoria de las 3 rutas de PIP (30 Sept 2026)

`app/api/companies/[id]/hr/pip/route.ts`, `.../pip/metrics/route.ts` y
`.../pip/evaluations/route.ts`. El aislamiento por empresa ya estaba bien
(`contextoDeEmpresa` + filtro/embeds por plan), pero quedaban dos cosas:

1. **`ErrorDeEmpresa` se devolvia como 500.** Las tres rutas tenian
   `catch { ... status: 500 }` a secas, asi que un **403** ("esa empresa no es
   tuya") o un **400** (no se pudo determinar empresa) se reportaban como fallo de
   servidor. Se anadio `respuestaDeErrorDeEmpresa(error)` (helper nuevo en
   `lib/tenant-resolver.ts`) al principio de cada catch, y en el `DELETE` de
   `evaluations` se movio `contextoDeEmpresa` **dentro** del `try` (estaba fuera,
   asi que su 403 escapaba sin traducir).
2. **IDOR intra-empresa en el `PUT` de `pip/route.ts`.** Al actualizar/crear
   `pip_goals`, la validacion miraba `pip_plans.company_id` pero **no**
   `pip_plans.id = plan del cuerpo`: se podia tocar un goal de **otro plan de la
   misma empresa** pasando `body.id` de un plan y `g.id` de otro. Ahora el embed
   exige `.eq('pip_plans.id', data.id)` y el update/insert usa `data.id` (el plan
   ya validado), no `body.id`.

Typecheck: **481**, sin regresiones.

### `/api/workspace` y la empresa activa tras un reload (30 Sept 2026)

Al auditar `/api/workspace/route.ts` aparecio un fallo real (el resto del modulo
`lib/workspace.ts` esta bien: `empresasDelUsuario` filtra por `user_company_access`,
`contextoDeEspacio` re-valida y nunca cae a una empresa por defecto):

- El GET elegia la empresa activa solo con `?companyId` y, si no venia, caia a
  `empresas[0]` (la `is_default` o la alfabeticamente primera). **Ignoraba el
  header `x-company-id`**, que es el que `middleware.ts` deriva de la cookie
  `active_company_id`. El cliente, en la carga inicial, llama `cargar()` sin
  parametros. Resultado: al recargar `/companies/<X>`, el selector y el badge
  (`CompanySelector`/`ActiveCompanyBadge`, que leen `empresa` del contexto)
  mostraban `empresas[0]`, **distinta** de la `<X>` que consultan las paginas de
  esa ruta. Es exactamente el caso que el propio componente dice querer evitar
  ("cargar datos de la empresa equivocada creyendo que estas en la tuya"). No es
  una fuga (nunca devolvia una empresa ajena), pero si una incongruencia visible.
- **Medido (30 Sept 2026):** el usuario de `TEST1DS` (`azuna22@outlook.com`) tiene
  `test 1` y `test 2` como `accountant`, ninguna `is_default`; el orden
  alfabetico deja `empresas[0] = test 1`. En `/companies/971bec43-...` (test 2), un
  reload mostraba "test 1" en el badge. Con el arreglo, el `[id]` de la URL y la
  cookie apuntan a test 2 y el contexto coincide.
- Arreglo, con la misma precedencia que `contextoDeEspacio`: en el servidor,
  `?companyId` → `x-company-id` → por defecto; y en el cliente,
  `WorkspaceContext.cargar` pasa el `[id]` de `window.location.pathname` en la
  carga inicial (fuera de `/companies/...` no hay `[id]` y manda la cookie).

Fragilidad anotada, sin tocar: `usuarioAppId()` resuelve por `authid` con
`.maybeSingle()`. `authid` **no tiene indice unico** (ver AGENTS 1b), asi que si
dos filas de `User` compartieran `authid`, `maybeSingle()` devolveria error
(`PGRST116`) y el usuario veria un 401. Hoy los `authid` son distintos (los correos
duplicados tienen identidades Clerk distintas), asi que no pasa. La solucion real
es el indice unico, que es decision pendiente.

Typecheck: **481**, sin regresiones.

### `hr/storage` y la renovacion de firmas (30 Sept 2026)

`app/api/companies/[id]/hr/storage/route.ts` tenia el mismo problema 403->500:
sus tres `catch` (GET/POST/DELETE) respondian `500` a secas, asi que un
`ErrorDeEmpresa` (empresa ajena o no determinable) se reportaba como fallo de
servidor. Se les puso el guard `respuestaDeErrorDeEmpresa`. El GET ya devolvia
`expiresIn: 3600`; ahora el cliente lo usa.

`components/hr/ArchivoPrivado.tsx`: antes pedia la firma una vez y no la
renovaba, asi que una ficha abierta mas de 1 hora acababa con imagenes rotas.
Ahora programa un `setTimeout` para renovar 5 min antes de que caduque (o a mitad
de vida, si el TTL fuese menor que el margen) y, si la pestaa estuvo oculta y el
`setTimeout` se salto, renueva al volver a ser visible (`visibilitychange`). El
`vigente` por efecto sigue evitando respuestas viejas de un path anterior.

Typecheck: **481**, sin regresiones.

### Sully Chieza ASIGNADA a test 1 (30 Sept 2026) y el FK roto de `employees.tenant_id`

Decision del usuario: asignar la fila huerfana de **Sully Chieza**
(`employees.id = a8053f93-72b3-49c7-83f2-e66d404aba45`) a **test 1**
(`8143dd4e-a4ef-4619-87a2-0504d0c8c46a`, tenant `TEST1DS`). Evidencia que lo
sustenta, toda medida:

| Senal | Resultado |
|---|---|
| Direccion de la ficha | `Dental Diamond, Plaza Inhsol, Barrio Guamilito 6ta Calle Entre 9y10 Avenida` │ **identica** a la de `test 1` y `test 2` (ambas `TEST1DS`) |
| Direccion de Angelos | `Barrio Guamilito 6calle, entre 9y10 ave` │ parecida, **no** igual |
| Login `azuna22@outlook.com` (Sully Chieza) | owner de `Empresa TEST185`, `accountant` de `test 1` y `test 2`; **no** es miembro de Angelos |
| Su fila `User` de tenant `TEST1DS` | `company_id = 8143dd4e-… (UUID truncado en el original)` (**test 1**) |
| `employee_code` `ANGE-0001` | sugiere Angelos, pero Angelos usa `EMP###` para sus 48 empleados; `test 1`/`test 2` tienen 0 |
| Otras referencias | `employee_history` vacio; `employee_vacation_summary` solo hereda el `company_id` de la ficha |

Aplicado por REST (no DDL): `PATCH employees SET company_id='8143dd4e-…'`. El
`tenant_id` **sigue NULL a proposito**, por el bloqueo de abajo. `verificar-hr.mjs`
ya no marca la fila como sucia (`TODO OK`, sin el aviso de `demo-company-id`).

**Bloqueo real, medido:** `PATCH ... tenant_id='TEST1DS'` da **409 / 23503**:
`Key (tenant_id)=(TEST1DS) is not present in table "tenants"`, FK
**`employees_tenant_id_fkey`**. Es que el FK apunta a una tabla **`tenants`**
(minusculas, legacy) que contiene **una sola fila (`ANGELOH7`)**, mientras que la
que usa la app es **`Tenant`** (Prisma), con 7 filas (`ANGELOH7`, `TEST185`,
`TST20HM`, `1`, `CLINICB3`, `cVcLafoZ`, `TEST1DS`). Por eso **solo Angelos ha
podido tener empleados** con `tenant_id` relleno; cualquier otra empresa choca con
el FK. Es una trampa del mismo tipo que las convenciones mezcladas: los nombres
difieren en una `s` y en el casing, y el error aparece como violacion de FK, no
como "tabla equivocada".

DDL que necesita el usuario para completar la asignacion (y para que RRHH de
cualquier empresa que no sea Angelos pueda tener empleados):

```sql
-- 1) El FK apunta a la tabla equivocada. Repuntar a la de la app:
ALTER TABLE public.employees DROP CONSTRAINT IF EXISTS employees_tenant_id_fkey;
ALTER TABLE public.employees
  ADD CONSTRAINT employees_tenant_id_fkey
  FOREIGN KEY (tenant_id) REFERENCES public."Tenant"(id);
-- 2) Ya permitido TEST1DS, completar la asignacion de Sully:
UPDATE public.employees SET tenant_id = 'TEST1DS'
  WHERE id = 'a8053f93-72b3-49c7-83f2-e66d404aba45';
```

Antes de repuntar hay que comprobar si **otras tablas** tienen FKs contra
`tenants` (misma trampa) y si el FK nuevo pasa con los `tenant_id` ya existentes:
hoy solo `ANGELOH7` (existe en `Tenant`) y NULL, asi que pasaria.

**Hallazgo lateral, sin tocar (fuera del encargo):** las rutas de RRHH localizan
al empleado por **`tenant_id`, no por `company_id`**:
- `app/api/companies/[id]/hr/employees/search/route.ts` y
  `.../attendance/reports/route.ts` filtran `.eq("tenant_id", empresa.tenantId)`.
  Con dos empresas en `TEST1DS`, eso **no separa `test 1` de `test 2`**.
- `app/api/companies/[id]/employees/route.ts` es peor: usa el `[id]` de la ruta
  (que es `companies.id`, un UUID) como si fuera **`tenantId`**
  (`.eq('tenant_id', companyId)`), y **no tiene `contextoDeEmpresa` ni validacion
  de empresa**. Con los datos reales (`tenant_id` vale `ANGELOH7`/NULL) eso
  devuelve **0 filas para toda empresa**, y sin aislamiento. Es exactamente el bug
  "company_id vs tenant_id" de AGENTS 1, en la tabla de empleados.

Typecheck: **481**, sin regresiones.

## 1 Oct 2026 - rutas RRHH a `company_id`, y el FK de `employees.tenant_id` ya arreglado

El DDL de la sesion anterior **ya se aplico**: el FK `employees_tenant_id_fkey` ya
no apunta a la tabla legacy `tenants`. Comprobado de forma no destructiva con un
`PATCH employees set tenant_id='TEST1DS'` sobre el mismo valor (HTTP **200**, sin
23503), y Sully Chieza ya tiene `tenant_id='TEST1DS'` (medido por REST: test 1
devuelve 1 fila, test 2 devuelve 0).

### Codigo
- `app/api/companies/[id]/employees/route.ts` - **refactorizado entero** a
  `contextoDeEmpresa` + `filtroEmpresa(empresa)` (solo `company_id`) en GET/POST/PUT/
  DELETE. Antes usaba el `[id]` (que es `companies.id`) como `tenant_id` y devolvia
  0 filas para todas las empresas, sin validar pertenencia; el `PUT`/`DELETE` por
  solo `id` era un IDOR intra-empresa. Se anadio `respuestaDeErrorDeEmpresa` a los
  4 `catch`. INSERT/UPDATE escriben `tenant_id = empresa.tenantId` y
  `company_id = empresa.companyId`.
- `.../hr/employees/search/route.ts`, `.../hr/attendance/reports/route.ts`,
  `.../hr/payroll/employees/route.ts` - ya usaban `contextoDeEmpresa` +
  `filtroEmpresaOCompany`; se les **quito el `.eq("tenant_id")` redundante** de las
  consultas a `employees` (con `company_id` basta) y se movio `contextoDeEmpresa`
  dentro del `try` con `respuestaDeErrorDeEmpresa`.
- `.../hr/storage/route.ts` - la comprobacion del empleado pasa a `company_id` solo.

### Verificacion
- `node node_modules/typescript/bin/tsc --noEmit` -> **481** (baseline intacto).
- `node scripts/verificar-hr.mjs` -> **TODO OK**.
- Medido por REST: `employees` por `company_id` = Angelos 48, test 1 **1** (Sully
  Chieza), test 2 **0**. Sin fugas.

Pendiente (fuera del encargo): el resto del arbol HR (`work-schedules`, `teams`,
`payroll/uploads`, `payroll/closed`, `payroll/deductions`, `payroll/config`) sigue
filtrando solo por `.eq("tenant_id", empresa.tenantId)`, o sea que **no separa
`test 1` de `test 2`** en esas tablas. Hay que verificar `company_id` por tabla
antes de tocarlas (algunas, como `payroll_config`, parecen de nivel tenant).

## 1 Oct 2026 - purga de UI al cambiar de empresa (key + reset de estado)

Sintoma reportado: al cambiar de empresa en el selector superior, la UI no
limpiaba el estado previo ni refrescaba; se veian/mezclaban datos de la empresa
anterior. Diagnostico: no es la capa de datos de servidor (las rutas ya aislan
por `company_id`) sino el ESTADO DE CLIENTE:

1. El layout se reutiliza al cambiar de empresa, asi que React reconcilia el
   mismo tipo de componente en la misma posicion y CONSERVA los `useState`
   locales (filtros, formularios, paginas a medias).
2. Algunos efectos no dependian de la empresa activa. El caso medido:
   `components/accounting/IntegratedBooksViewer.tsx` tenia
   `useEffect(() => { fetchBookData(); }, [bookType])`; cambiar de empresa NO
   repetia el fetch y el libro de la anterior se quedaba en pantalla.

Ojo: el proyecto NO tiene React Query / TanStack / SWR / RTK / Redux / Zustand
(ver AGENTS.md seccion 1b). No hay `queryClient.clear()`. Se resuelve con React
Context + remontaje.

### Codigo
- `lib/contexts/WorkspaceContext.tsx`:
  - nuevo `activeCompanyId` (la empresa "comprometida" con la UI; sobrevive a la
    limpieza de `empresa` durante la transicion, para no remontar dos veces).
  - nuevo `limpiarEstado()`: deja `empresa`/`sede`/`sedes`/`consolidando` a cero
    (el "RESET_STORE" del proyecto).
  - `cambiarEmpresa` ahora hace, en orden: `abortarEnVuelo()` ->
    `borrarCacheLocal()` -> `limpiarEstado()` -> `setActiveCompanyId(id)` (dispara
    el remontaje) -> cookies -> `cargar(id)` -> `router.push('/companies/{id}')`.
  - `cargar` setea `activeCompanyId` SOLO cuando la carga termina bien: si falla,
    la key no cambia y no se remonta el arbol con datos a medias.
- Nuevo `components/workspace/WorkspaceShell.tsx`: `Fragment` con
  `key={activeCompanyId}`. Es la "UI purge": desmonta TODO el subarbol al cambiar
  de empresa y se lleva por delante el estado local heredado.
- `app/layout.tsx`: `<WorkspaceShell>` envuelve `<LayoutWrapper>{children}`, dentro
  de `<WorkspaceProvider>`.
- `IntegratedBooksViewer.tsx`: `useEffect(..., [bookType, companyId])` + `setData([])`
  antes del fetch (era el bug de "no refresca").
- Las 9 paginas de `app/reports/*` (`libro-diario`, `trial-balance` = balanza,
  `top-clientes`, `resumen-isv`, `balance-general`, `estado-resultados`,
  `flujo-efectivo`, `declaracion-mensual`, `libros-compras-ventas`): el efecto
  ahora vacia el dataset ANTES del fetch y descarta la respuesta si el efecto se
  limpio (`cancelado`). Ya tenian `empresa?.id` en las dependencias.

### Nota de arquitectura
Se mantiene el diseno previo: la "cache" de cliente a purgar es (a) los
`AbortController` en vuelo + el contador de generacion y (b) las claves `ws_*` de
`localStorage`; y ahora (c) el remontaje por key. No se migro a localStorage la
empresa activa: el mecanismo es cookie (`active_company_id`) -> header
`x-company-id`, porque los Server Components / `contextoDeEspacio` la necesitan;
una copia en localStorage solo anadiria un punto de desincronizacion.

### Verificacion
- `node node_modules/typescript/bin/tsc --noEmit` -> **481** (baseline intacto).

## 1 Oct 2026 - FK legacy de `employee_hr_documents`, `usuarioAppId` y documentos que se perdian

Tres pendientes del backlog de aislamiento, resueltos o acotados.

### `employee_hr_documents.tenant_id`: el FK que faltaba repuntar (migracion 034)

Confirmado por el OpenAPI de PostgREST (no supuesto):
`employee_hr_documents.tenant_id` es **NOT NULL** y su FK todavia apunta a la tabla
legacy **`tenants`** (una fila, `ANGELOH7`). Es el mismo bug que ya se arreglo en
`employees_tenant_id_fkey` (que hoy apunta a `Tenant`), pero a esta tabla se le
paso el repunte. Consecuencia: para cualquier empresa fuera de Angelos, el insert
de documentos da `23503` y la ruta solo lo logueaba -> el empleado se creaba y los
documentos desaparecian **sin aviso**.

- **Codigo**: `app/api/companies/[id]/employees/route.ts` (POST y PUT) ahora
  devuelve `hrDocumentsWarning` en la respuesta cuando el insert falla, con un
  mensaje claro si el codigo es `23503` (apuntando a la 034). El cliente solo lee
  `created.id` / `data.error`, asi que el campo extra no rompe nada. Con esto, la
  perdida deja de ser silenciosa aunque la migracion aun no este aplicada.
- **Migracion `034_hr_documentos_tenant_fk.sql`** (pendiente de aplicar en el SQL
  Editor): repunta el FK a `"Tenant"(id)`. Preflight comprueba tipos
  (`employee_hr_documents.tenant_id` = text, `"Tenant".id` = text; `tenants.id` es
  varchar(255)) y **aborta** si alguna fila tiene un `tenant_id` que no existe en
  `Tenant`, o si el `DROP` del FK legacy no dropeo nada. Idempotente.
- **No se tocan** `positions`, `departments`, `work_schedules`, `employee_history`
  ni `attendance`: tienen `tenant_id` NOT NULL **sin FK**, y sin FK no hay bloqueo.
  Anadirles uno solo crearia el mismo problema que la 034 viene a quitar.

### `usuarioAppId()`: `.maybeSingle()` sobre una columna duplicable

`lib/workspace.ts` resolvia `User.id` con `.eq("authid", userId).maybeSingle()`.
`authid` **no tiene indice unico** (solo `idx_user_authid`, no unico) y en los datos
reales hay correos con 2 filas de `User`; con 2+ filas `maybeSingle()` lanza
`PGRST116` y el usuario se quedaba sin resolver, sin pista del motivo. Ahora usa
`.order("id").limit(1)` y toma la primera fila de forma determinista.

### Aclaracion sobre "aislamiento = company_id y tenant_id"

Se mantiene la regla de `AGENTS.md` 1 / 1b: en `employees` el aislamiento es
**`company_id`**, y `tenant_id` **agrupa, no aisla**. NO se anadio `.eq("tenant_id")`
a las consultas de empleado a proposito: con `TEST1DS` compartido por test 1 y test
2, el filtro por tenant no separa nada, y ademas escondera filas con `tenant_id`
NULL. El verificador ya comprueba que no haya fugas (`TODO OK`).

### `YearEndClosing.tsx` eliminado

Era huerfano confirmado: no lo importaba nadie (`app/closing/page.tsx` ya renderiza
`ClosingWizard`); los unicos matches de "YearEndClosing" eran servicios sin relacion
(`performYearEndClosing`, `YearEndClosingService`). Estaba ademas roto (importaba
`formatCurrency` de `lib/date-utils` y usaba
`(await import('@/lib/db')).db.getTenantId?.()`). Decision del usuario:
**borrado** (1 Oct 2026). Se actualizaron las referencias en
`docs/REGISTROS_CONTABLES_REPORT.md` y `docs/LIBROS_LEGALES_REPORT.md`.

### Verificacion
- `node node_modules/typescript/bin/tsc --noEmit` -> **472** (bajo el baseline 481:
  el `YearEndClosing.tsx` borrado aportaba 9 de esos errores).
- `node scripts/verificar-hr.mjs` -> **TODO OK** (12 tablas de Angelos con datos,
  0 de otra empresa).
- `node scripts/verificar-contexto.mjs` -> sigue con los pendientes ya conocidos
  (**51 tablas** sin `company_id` y **Empresa 1 sin membresia**); no es regresion.
- `scripts/_tmp-*.mjs`: **no existe ninguno** (ya se habian borrado).

### Inventario: el dashboard no cambiaba al cambiar de empresa (1 Oct 2026)

En `/companies/TEST1DS/inventory/dashboard`, pasar de **test 1** a **test 2** mostraba
la misma informacion. Dos causas, las dos por usar el tenant como si fuera la empresa:

1. **`components/RoleBasedSidebar.tsx`** armaba el href de Inventario con
   `currentTenant.id`, que es el codigo del tenant (`"TEST1DS"`), **compartido por
   test 1 y test 2**. El `[id]` de `/companies/[id]/...` es `companies.id`. Ahora usa
   `useWorkspace().empresa?.id || tenantId`. (Solo se cambio el enlace de Inventario;
   el resto del sidebar sigue con el tenant, es el backlog de rutas tenant-only.)

2. **`app/api/companies/[id]/inventory/stats/route.ts`** filtraba `product` e
   `inventory_movement` **solo por `tenant_id`** (via `resolveTenant`), o sea todo el
   tenant. Ahora usa `contextoDeEmpresa(request, { companyIdDeRuta: id })` +
   `filtroEmpresaOCompany(empresa)` (el aislamiento real es `company_id`), y
   `respuestaDeErrorDeEmpresa` en el `catch` para que un 403 no salga como 500.
   `listWarehouses`/`listTransfers` reciben el `companies.id` resuelto, no el tenant.

- **Por que el tenant no bastaba:** `empresaDesde` (`lib/tenant-resolver.ts`) resuelve
  por `companies.id` y, si no, por codigo de tenant, y con varias empresas devuelve
  **la mas antigua**. Pasar `"TEST1DS"` siempre caia en test 1; hacia falta el company
  id para llegar a test 2.
- **Verificacion (medido):** por `company_id`, `product`/`inventory_movement` dan
  test1 = 2/1 y test2 = 0/0; `tsc --noEmit` = **472** (sin regresion).
- **Nota:** `tests/warehouse/warehouse-routes.test.mjs` falla al cargar por drift
  preexistente (su `warehouse-service-mock.mjs` no exporta `getWarehouseLocationCounts`,
  que si existe en `lib/services/warehouse-service.ts`). No es de este cambio.

## 1 Oct 2026 - Backlog de aislamiento: migraciones 035 y 036, payroll_config por empresa, hr/teams eliminada

Resuelto el backlog que el usuario aprobo, con los datos medidos antes de escribir DDL.

### Migracion 035 (APLICADA 1 Oct 2026) - company_id + payroll_config + unique_code_tenant

Archivo: `prisma/migrations/035_company_id_customer_packages_payroll_legal.sql`.

- **`company_id` a seis tablas**: `Customer`, `CustomerFiles`, `Packages`,
  `PackageProducts`, `payroll_details`, `legal_revisiones_historial` (+ indice por
  empresa). Eran las tablas base que faltaban para que las vistas
  `CustomersComplete`/`CustomersWithFiles`/`CustomersWithRetentions` y `PackageDetails`
  pudieran aislarse por empresa.
- **Backfill medido, sin adivinar**: `Customer`/`CustomerFiles`/
  `legal_revisiones_historial` tenian **0 filas**; `Packages` = 2 (tenant '1' ->
  Empresa 1); `PackageProducts` = 3 (via su paquete); `payroll_details` = 15 (via
  `employees.company_id`, NO via `payroll_periods.company_id`, que trae basura
  `COMP001`/`demo-company-id`). El mapeo tenant->empresa solo se usa cuando el
  tenant tiene **una sola** empresa: el unico tenant con dos es `TEST1DS`, y ninguna
  fila de esas tablas le pertenece, asi que no hay ambiguedad. Lo que no se pueda
  atribuir queda NULL y se avisa por `RAISE NOTICE`.
- **`payroll_config` de tenant a empresa**: `tenant_id` era `UNIQUE`
  (`supabase/HR_ALL_IN_ONE.sql:198`), o sea que test 1 y test 2 compartian config y
  la ruta se peleaba (GET filtraba por `company_id`, el upsert chocaba por
  `tenant_id`). La 035 dropea el UNIQUE de `tenant_id` y crea
  `UNIQUE (company_id)` (full, no parcial: `ON CONFLICT (company_id)` de PostgREST
  no admite indices parciales). La fila existente (tenant ANGELOH7) ya tenia
  `company_id`.
- **`unique_code_tenant` -> `(code, company_id)`**: la invariante correcta es por
  empresa (test 1 y test 2 no podian tener las dos una `1101`). Preflight de
  duplicados + `DROP CONSTRAINT/INDEX IF EXISTS unique_code_tenant` +
  `CREATE UNIQUE INDEX "Account_company_id_code_key" (company_id, code)`. Los NULL
  no colisionan, asi que las 8 cuentas legacy sin `company_id` no revientan.
- `PackageDetails` se recrea **anadiendo `company_id` al final** (via
  `pg_get_viewdef`, en un bloque con excepcion: si la vista viva tiene otra forma,
  avisa y no rompe). Las 3 vistas `Customers*` **no** se tocan: su DDL no esta en el
  repo y hoy tienen 0 filas; la 035 las avisa por NOTICE.

### `schema.prisma` y ruta `payroll_config`

- `prisma/schema.prisma` (Account): `@@unique([code, tenantId], map:"unique_code_tenant")`
  -> `@@unique([code, companyId], map:"Account_company_id_code_key")`.
- `app/api/companies/[id]/hr/payroll/config/route.ts`: `onConflict` de `'tenant_id'`
  a `'company_id'` (los 3 handlers) y el GET ya no compara `tenant_id`, solo
  `filtroEmpresaOCompany(empresa)`.

### Migracion 036 (APLICADA 1 Oct 2026) - dueno de Empresa 1

Archivo: `prisma/migrations/036_empresa_1_dueno.sql`. "Empresa 1" (tenant `'1'`) no
tenia ninguna fila en `user_company_access`: **nadie podia entrar**. Decision del
usuario: darle `owner` a `gcalix12@hotmail.com`
(`00dec7a4-...`, hoy ADMIN de Angelos), que ya comparte el historico de las cuentas
1101/4101 con Empresa 1. `is_default = false` (ya tiene Angelos por defecto).
Idempotente + post-check de que quedo un owner.

### `hr/teams` eliminada

`app/api/companies/[id]/hr/teams/route.ts` apuntaba a `employee_teams`/`team_members`,
que **no existen** (`PGRST205`): devolvia `[]` en silencio. Decision del usuario:
**borrarla**. Se limpio su unica referencia de UI
(`app/companies/[id]/hr/attendance/time-clock/page.tsx`): se quito el
`safeFetch(.../hr/teams)` del `Promise.all` y el `setTeams`; el estado `teams` queda
`[]` (no cambia lo que se ve, porque ya siempre estaba vacio).

### Verificacion

- `node node_modules/typescript/bin/tsc --noEmit` -> **472** (sin regresion).
  Nota: borrar la ruta dejo una referencia obsoleta en el generado
  `.next/types/validator.ts` (daba 473); se quito el bloque y vuelve a 472. Se
  regenera solo en el proximo `next dev`/`build`.
- El usuario aplico **035** y **036** en el SQL Editor el 1 Oct 2026
  ("Success. No rows returned", que es lo normal en DDL). Verificado despues con
  PostgREST, porque ese mensaje **no demuestra** nada (ver la seccion de abajo).
- Pendiente menor no tocado: las rutas HR que llaman `contextoDeEmpresa` **fuera** del
  `try` (work-schedules, payroll, attendance, departments, positions, permissions)
  devuelven **500** en vez de **403**; no estaban en el alcance aprobado esta vez.

## 1 Oct 2026 - traduccion de errores de empresa en todo el arbol de RRHH (500 -> 403)

Cierra el pendiente anterior. `contextoDeEmpresa` lanza `ErrorDeEmpresa` (400/401/403)
para denegar una empresa ajena. Cuando la llamada estaba **fuera** del `try`, el error
escapaba al framework y Next respondia **500**: un problema de permisos parecia un
fallo del servidor.

### Que se hizo (16 archivos)

En cada handler la llamada

```ts
const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
```

se sustituyo por un `try/catch` que asigna `empresa` y traduce el error:

```ts
let empresa;
try {
  empresa = await contextoDeEmpresa(request, { companyIdDeRuta: (await params).id });
} catch (error) {
  const respuesta = respuestaDeErrorDeEmpresa(error);
  if (respuesta) return respuesta;
  throw error;
}
```

Minimo cambio: no se reindenta el cuerpo del handler, y el resto sigue igual. La
importacion pasa a `{ contextoDeEmpresa, respuestaDeErrorDeEmpresa }`.

Archivos: `hr/work-schedules`, `hr/attendance`, `hr/attendance/config`,
`hr/attendance/holidays`, `hr/attendance/schedules`, `hr/attendance/time-tracking`,
`hr/departments`, `hr/positions`, `hr/payroll/config`, `hr/payroll/closed`,
`hr/payroll/deductions`, `hr/payroll/uploads`, `hr/permissions/requests`,
`hr/permissions/types`, `hr/permissions/used` y `hr/accounting` (esta ultima ya
tenia su `try`, solo se anadio la traduccion en su `catch`).

Ya estaban correctos (no se tocaron): `hr/storage`, `hr/pip`, `hr/pip/metrics`,
`hr/pip/evaluations`, `hr/payroll/employees`, `hr/attendance/reports` y
`hr/employees/search`; en ellos `contextoDeEmpresa` va dentro del `try` y el `catch`
ya usa `respuestaDeErrorDeEmpresa`.

**No se toco** `hr/attendance/migrate/route.ts`: no llama a `contextoDeEmpresa` en
absoluto (ruta de DDL sin auth ni contexto), que es otro problema distinto y sigue
pendiente.

### Verificacion

- `node node_modules/typescript/bin/tsc --noEmit` -> **472** (sin regresion; el cambio
  es de una linea por handler y no anade tipos nuevos).
- Las 16 llamadas `const empresa = await contextoDeEmpresa` que quedan estan todas
  **dentro** de un `try` de una ruta que ya traducia (storage, pip x3, payroll/employees,
  attendance/reports, employees/search, accounting).

## 1 Oct 2026 - verificacion de 035/036 ya aplicadas (y el fallo silencioso de PackageDetails)

El usuario ejecuto **035** y **036**; el SQL Editor dijo "Success. No rows returned"
(lo normal en DDL, no prueba nada). Verificado contra la BD real por PostgREST, sin
confiar en ese mensaje.

### 036: OK

`verificar-contexto.mjs` muestra `gcalix12@hotmail.com -> Empresa 1 [owner]` y la
seccion "Empresas sin membresia" queda **en ninguna**. Empresa 1 ya tiene dueno.

### 035: OK salvo PackageDetails

La 035 va en **un solo `BEGIN/COMMIT`**. Como las 6 columnas `company_id` existen
despues de aplicarla, la transaccion **commiteo**, y eso implica que pasaron el
preflight (0 duplicados), el `DROP`/`CREATE` de `unique_code_tenant` ->
`Account_company_id_code_key`, el cambio de `payroll_config` a `UNIQUE (company_id)`
y los post-checks. (Un `RAISE EXCEPTION` habria hecho rollback de todo.)

Backfill medido despues de aplicar (0 filas sin `company_id` en las 7 tablas):

| Tabla | Filas | company_id |
|---|---|---|
| `Customer` / `CustomerFiles` / `legal_revisiones_historial` | 0 | - |
| `Packages` | 2 | Empresa 1 (`73d5bbf7-...`) |
| `PackageProducts` | 3 | Empresa 1 (heredado del paquete) |
| `payroll_details` | 15 | Angelos (`7bd123d8-...`, via `employees`) |
| `payroll_config` | 1 | Angelos |

**El unico fallo: `PackageDetails` sigue sin `company_id`.** La 035 la recreaba con
`pg_get_viewdef(..., true)` dentro de un bloque con `EXCEPTION WHEN OTHERS`; esa
funcion devuelve la definicion con un **`;` final**, asi que `FROM (%s) base` quedaba
`FROM (SELECT ...;) base` -> *"syntax error at or near ;"*, y el `EXCEPTION` lo
convirtio en un simple `RAISE NOTICE`. **Leccion (ya en AGENTS): un `EXCEPTION WHEN
OTHERS` que solo avisa convierte un fallo en un falso verde.** La **037** corrige la
causa (quita el `;` con `regexp_replace`), **no** traga excepciones (si falla, aborta
y se ve), reescribe `security_invoker` y exige `company_id` en el post-check.
`PackageDetails` no tiene consumidores en `app/` ni `lib/` (solo SQL/docs): es de baja
prioridad.

**037 APLICADA Y VERIFICADA (1 Oct 2026).** El usuario la corrio en el SQL Editor
("Success. No rows returned", que no prueba nada). Verificado por PostgREST contra la BD
real: `PackageDetails` **ahora tiene `company_id`** (15 columnas) y sus **2 filas**
devuelven `73d5bbf7-8e47-470e-9430-da513e623ab7` (Empresa 1); select `company_id` -> 200
(0-1/2), select `*` -> 206 (0-0/2). `Packages` (13 col) y `PackageProducts` (6 col) siguen
con `company_id`. Con esto el unico paso que la 035 dejo mudo queda cerrado.

Las 3 vistas `CustomersComplete`/`CustomersWithFiles`/`CustomersWithRetentions` siguen
sin `company_id` **a proposito**: su DDL no esta en el repo y hoy tienen 0 filas (la
035 solo las avisa por NOTICE). `verificar-contexto.mjs` cierra con
"AUN NO esta listo / 45 tablas sin company_id": ese conteo incluye tablas fuera del
alcance de la 035 (`pip_*`, `asset_*`, `payroll_vouchers`, `accountant_*`, etc.) y las
vistas, no solo lo aprobado.

## 1 Oct 2026 - TenantBoundary / useTenantUI: adaptador, NO un segundo workspace

Se pidio crear `TenantBoundary` + `useTenantUI` + `CompanyLocationSelector` (el patron
localStorage + `?company_id` + `window.location.href`). **No se implemento literal**:
este repo ya tiene el contexto real (`WorkspaceContext` + `WorkspaceShell` +
`/api/workspace` validado contra `user_company_access`), y un segundo modelo de estado
en paralelo choca con AGENTS.md seccion 1b (el unico "reset" y el unico "key" ya
existen). El usuario eligio el adaptador.

- `lib/contexts/TenantBoundary.tsx`: `TenantBoundary` + `useTenantUI()`. Es una capa
  FINA sobre `useWorkspace()`:
  - `companyId` = `activeCompanyId` (la empresa comprometida con la UI; es la `key`
    de WorkspaceShell).
  - `locationId` = `consolidando ? "ALL" : (sede?.id ?? "ALL")`.
  - `changeCompany(id)` / `changeLocation(id)` delegan en `cambiarEmpresa`/`cambiarSede`
    (validado en servidor, aborta respuestas en vuelo, sube la generacion, navega a
    `/companies/[id]`). NO escribe localStorage ni hace hard reload.
  - **No anade `key`**: eso remontaria dos veces; el remontaje es de `WorkspaceShell`.
- `components/workspace/CompanyLocationSelector.tsx`: selector empresa + sede sobre
  `useTenantUI()`; props opcionales (`userRole`/`companies`/`locations`) que caen al
  contexto si no se pasan. El select de sede solo aparece para `business_owner`.
- `app/layout.tsx`: `<TenantBoundary>` va **dentro** de `<WorkspaceProvider>` (y por
  fuera de `<WorkspaceShell>`), envolviendo `SidebarProvider`.
- `tsc` sigue en **472** (el unico error que menciona `app/layout.tsx` es el de
  `ClerkProvider`/`afterSignInUrl`, preexistente). `WorkspaceBar`, `CompanySelector` y
  `LocationFilter` NO se tocaron: siguen usando `useWorkspace()`.
- Uso previsto en paginas: `const { companyId, locationId } = useTenantUI();` y pasar
  `company_id`/`location_id` al filtrar. Es azucar sobre el mismo estado; no cambia la
  regla de que el servidor revalida la pertenencia.

## 1 Oct 2026 - `uploaded-files` devolvia 400: exigia `x-tenant-id` y nada mas

Sintoma: `/companies/TEST1DS/accounting` -> `GET /api/accounting/uploaded-files?tenantId=TEST1DS`
**400**. Los otros dos fetch de la misma pagina (`transactions`, `accounts`) si cargaban.

Causa: `app/api/accounting/uploaded-files/route.ts` resolvia el tenant **solo** con
`request.headers.get("x-tenant-id")` e `if (!tenantId) return 400`. Ese header lo pone
`middleware.ts` a partir de los claims de Clerk, y **puede faltar** (sesion sin claim de
tenant): entonces la ruta devolvia 400 aunque la pagina mandara `?tenantId=TEST1DS`. Sus
hermanas `transactions`/`accounts` no fallaban porque aceptan `header || ?tenantId`.

Arreglado: la ruta usa `contextoDeEmpresa(request)` (con `respuestaDeErrorDeEmpresa` en el
catch) en GET y DELETE, como el resto del arbol. Cuando el header falta, cae a
`?companyId`/`?company_id` y, si no, a `tenantFromCompanyId(?tenantId)` -> `TEST1DS`; cuando
el header esta, sigue mandando el de sesion (mismo comportamiento de antes). No se cambio
la pagina. `tsc` sigue en **472**.

## 1 Oct 2026 - 038 escrita: company_id en las tablas contables que faltaban

Verificacion (OpenAPI/PostgREST, solo lectura) sobre 97 relaciones contables: **64 con
`company_id`, 33 sin** (28 tablas + 5 vistas). Las 33 sin se separaron en tres grupos:

- **Grupo empresa (15): lo cubre la 038.** `AccountPayable`, `AccountReceivable`,
  `BookClosing`, `Reconciliation`, `payment_vouchers`, `paymentreceipt`, `budget_lines`,
  `payroll_vouchers`, `employee_salary_history`, `employer_contributions`,
  `asset_depreciation`, `asset_disposals`, `asset_documents`, `asset_maintenance`,
  `asset_transfers`. Todas con 0 filas **salvo `payroll_vouchers` = 13**, y las 13
  resuelven a Angelos (`7bd123d8-...`) por `employee_id` y por `payroll_detail_id`
  (verificado antes de escribir el backfill).
- **Grupo hijas por padre (5): NO se toca.** Aislan por su tabla padre, que ya tiene
  `company_id`: `inventory_adjustment_item` (->`inventory_adjustment`),
  `inventory_transfer_item` (->`inventory_transfer`),
  `journal_entry_template_lines` (->`journal_entry_templates`),
  `recurring_entry_executions` (->`recurring_entries`),
  `payroll_detail_optional_deductions` (->`payroll_details`).
- **Grupo catalogos globales (5): NO se toca, a proposito.** `Taxes` (10 filas,
  `tenantid='default'`), `Retentions` (9 filas, `tenantid='default'`), `TaxConfig` (0),
  `ExchangeRate` (0), `CurrencyHistory` (0, hija de `Transaction`). Compartidos: filtrar
  por empresa los escondera.

`prisma/migrations/038_company_id_tablas_contables.sql`: idempotente
(`ADD COLUMN IF NOT EXISTS`), indice `idx_<tabla>_company_id`, backfill por padre (loop
`format('%I')`), `AccountPayable`/`AccountReceivable` por su `tenantid` solo si el tenant
tiene una sola empresa, y post-check que **aborta** si `payroll_vouchers` queda con NULL
(es la unica con datos). Sin `EXCEPTION WHEN OTHERS` que trague errores (leccion de la
035 con `PackageDetails`).

Detalle de la clasificacion (medido): `fixed_assets` es el maestro de activos y tiene
`company_id`, por eso `asset_*` se backfillean desde ahi; `budgets`, `payroll_details`,
`paymentlink`, `employees`, `payroll_periods` tambien tienen `company_id`. **Ninguna de
las 15 esta en `prisma/schema.prisma`: no hay drift que sincronizar.** `tsc` en **472**.

**038 APLICADA Y VERIFICADA (1 Oct 2026).** El usuario la corrio en el SQL Editor
("Success. No rows returned", que no prueba nada). Verificado por PostgREST: las 15
tablas exponen `company_id` (14 vacias = 0 filas; `payroll_vouchers` = 13 filas) y los
13 `payroll_vouchers` devuelven todos `7bd123d8-40fa-4383-93a4-d87e37b0ce3f` (Angelos).
`verificar-contexto.mjs` baja de **45 a 30** tablas sin `company_id`; las 15 restadas son
exactamente las de la 038 (el resto son hijas por padre, globales y no-contables).

## 1 Oct 2026 - Revision de aislamiento + 039 (cuentas legacy) + vistas

Auditoria de esquema completa (OpenAPI/PostgREST + Select-String; `DATABASE_URL` existe
pero el host de BD sigue sin resolver, asi que nada de `pg_get_viewdef`).

**Modelo real:** las rutas server usan `SUPABASE_SERVICE_ROLE_KEY` (comentarios
"bypass RLS" en `accounting/*` y `lib/supabase*`), asi que **RLS no protege**. Las
politicas del repo son por `tenant_id`, y `TEST1DS` tiene 2 empresas: RLS tampoco las
separaria. El aislamiento es **100% app-layer por `company_id`** (AGENTS seccion 1).

**Cobertura:** 126 tablas con `company_id` (el verificador cuenta 145; la diferencia es
la heuristica tabla/vista). Huecos reales de filas (tabla con columna, filas NULL):
- `Account` 8 filas (las legacy) y `Transaction` 1 fila (`051e950a`, descripcion `px`,
  `tenantId` NULL; ya documentada en AGENTS seccion 5 / 027b2).
- No contables: `audit_outbox` 295, `tenant_plan_statistics` 15, `User`/`users` 3,
  `SupportTicket` 2.
- Todo lo demas contable, 0 huecos: `payroll_details` 15, `Invoice`, `InvoiceItem`,
  `Purchase`, `JournalEntry` con `company_id`; los 13 `payroll_vouchers` -> Angelos.

**Tres sistemas de cuentas (no confundir):**
- `chart_of_accounts` = tabla **viva** (la que usa `lib/services/opening-balance.ts`,
  onboarding y `opening-balances/route.ts`). Tiene `company_id` y filas por empresa.
- `Account` (Prisma) = **fallback legacy**; `opening-balances/route.ts:22` cae a el
  solo si `chart_of_accounts` esta vacio. `Account.id` es text.
- `accounts` (minusculas) = **0 filas**, columnas distintas (sin `code`).

**039 escrita** (`prisma/migrations/039_borrar_cuentas_legacy.sql`, pendiente del
usuario). Borra las 8 cuentas legacy de `Account` + su auditoria. Contexto medido:
- Son las originales compartidas pre-030. La 030 ya creo copias por empresa de 1101/4101
  (Angelos `47a98a0e`/`0fed60e6`, test 1, Empresa 1) y reapunto los 65 asientos.
- **AGENTS seccion 5 decia "NO las borres"**: era valido ANTES de aplicar la 030 (1101 y
  4101 tenian 42/23 asientos reales). Hoy esos asientos apuntan a las copias: verificado
  que las 8 ids tienen **0 referencias** en `JournalEntry` (`account_id`/"accountId"/
  `accountid`) y que la unica tabla con filas que las referencia es `account_audit_log`
  (4 filas historicas de OPENING_BALANCE_UPDATE). Por eso la 039 borra tambien esas 4
  filas y trae una **guarda**: aborta si algun asiento volviera a apuntar a las legacy.
- `Account` pasa de 51 a 43 filas, y `company_id IS NULL` queda en 0 en `Account`.

**Vistas payroll/Customers: no se pueden tocar aqui.** `view_payroll_employee_history`,
`view_payroll_employee_yearly` y `view_payroll_periods_summary` NO exponen `company_id`
**ni** `tenant_id`; su DDL no esta en el repo y no hay acceso DDL a la BD. Ademas tienen
0 consumidores en `app/` (solo aparecen en `supabase/RLS_ALL_TABLES.sql`). Si se usan,
hay que entrar por `payroll_periods.company_id`/`employees.company_id`. Las
`CustomersComplete`/`CustomersWithFiles`/`CustomersWithRetentions` ya quedan documentadas
en la 035/027 (DDL no en repo, hoy 0 filas). `_backup_*` sin `company_id` son basura.

**Rutas accounting (Select-String sobre 36 `route.ts`):** **22 usan `tenant_id`/`x-tenant-id`
sin `company_id`** y **10 usan ambos** (incluye `transactions`, `trial-balance`,
`uploaded-files`); **0 usan solo `company_id`**. Es el pendiente grande del refactor.

## 1 Oct 2026 - Refactor `accounting/*`: lotes 1 y 2 y ampliacion

Se refactorizaron 25 de las 36 rutas de `app/api/accounting/` al patron
`contextoDeEmpresa(request)` + `filtroEmpresaOCompany(empresa)` +
`respuestaDeErrorDeEmpresa(error)` en el catch. Se usa `filtroEmpresaOCompany` (no
`filtroEmpresa`) porque `contextoDeEmpresa` devuelve `companyId: null` cuando el
cliente solo manda `?tenantId`: filtra por `company_id` si hay empresa y cae a
`tenant_id` si no, sin romper paginas que todavia mandan el tenant.

### Lote 1 (critico)
`accounts` (quitado fallback global del GET; POST/PUT/DELETE acotados; PUT/DELETE
eran **IDOR por `id`**), `opening-balances` (quitado fallback global; PUT ya no
actualiza por `id` a ciegas en `Account`), `accounts/delete-all` (ya no acepta
`?tenantId` libre; corregido `.or()` mal formado), `accounts/validate`,
`accounts/check-transactions` (no tenia ningun ambito), `uploaded-files`
(DELETE/PATCH eran IDOR; GET solo-tenant -> `.match(scope)`).

### Lote 2 (Supabase seguras)
`ingresos`, `egresos` (quitado helper `?tenantId` sin validar y fallback muerto),
`trial-balance` (eliminado fallback hardcodeado `.in("tenantId", ["1","tenant_001"])`),
`audit-logs` (scope en `account_audit_log`), `trial-balance-detailed` (reescrito
`fetchDetailed` a `scope`; quitado `toTenantId`), `cash-flow-comparatives`
(`fetchTrialItems(scope,...)`).

### Ampliacion
- `transactions/route.ts`: GET ya no usa la RPC tenant-only
  `get_transactions_with_entries`; PUT/POST ya no usan `getTenantFromRequest`
  (`?tenantId` sin validar) y usan `empresa`/`scope`; POST inyecta
  `companyId: empresa.companyId`; JournalEntry con `company_id`. Se tiparon los 2
  call-sites de `createJournalTransaction` con `supabaseService as unknown as
  SupaClient` (esto bajo el typecheck, ver abajo).
- `transaction-import`: contexto validado; el **numerador de comprobante ya no toma
  el maximo GLOBAL de todas las empresas**; `Transaction`/`JournalEntry` con
  `company_id`; `Account` por `scope`.
- `recurring-entries` y `recurring-entries/execute`: contexto validado (la tabla
  `recurring_entries` **no tiene `company_id`**: solo se aisla por tenant); al
  ejecutar, `Transaction`/`JournalEntry` llevan `company_id` y el correlativo usa
  `scope`.
- `withholding-journal`: contexto validado; la busqueda de asiento existente pasa de
  `tenantId`/`tenant_id` a `.match(scope)` (antes podia leer el asiento de la empresa
  hermana); `companyId` sale del contexto, no del body.
- `journal-templates` y `users`: contexto validado; ambas tablas son tenant-only
  (`journal_entry_templates` sin `company_id`, `User` por `tenantid`).
- `financial-ratios`: contexto validado (el helper sigue por tenant).

### Ampliacion 2
- `reversals`: reescrita; corregido **IDOR** (antes leia/revertia la transaccion de
  otra empresa por `id` a ciegas); las busquedas de `Transaction` usan
  `.match(scope)`; `Transaction`/`JournalEntry` con `company_id`; correlativo por
  `scope`; `journal_entry_reversals` es tenant-only.
- `export` y `export-audit`: contexto validado + `scope`; el POST de `export` toma
  `{ companyIdDeRuta: body?.companyId }`; `audit_log` es tenant-only.
- `excel-upload`: contexto validado (acepta `companyId` o, por compatibilidad,
  `tenantId`); **el correlativo ya no toma el maximo GLOBAL** (`getNextVoucherNumber(scope,...)`);
  `Account`/`Transaction`/`JournalEntry`/`File` con `company_id`; los helpers
  `ensureAccountsExist`/`ensureDynamicAccounts` ya no caen a cuentas globales.
- `voucher-number`: `getNextVoucherNumber(voucherType, tenantId, companyId?)` en
  `lib/actions/accounting.ts` ahora **filtra por `companyId`** (antes ignoraba el
  tenant y devolvia el maximo global); la ruta usa `contextoDeEmpresa` y
  `respuestaDeErrorDeEmpresa`.
- Se revisaron `sar-config`, `sar-session`, `diat-upload`, `det-upload`,
  `annual-tax-upload`: ya tienen `auth()` + `canAccessTenant`/`getUserTenantId`, no
  tienen el agujero de `?tenantId` sin validar. `template-download` es una plantilla
  estatica (sin tenant). Quedan documentadas como OK.

### Ampliacion 3 (frente "helpers" cerrado)
- `period-variations`: `getVariationsReport(client, tenantOrScope, from, to, options)` y
  `fetchPeriodBalances` aslan por `company_id`; sin empresa conservan el fallback
  legacy `tenantId -> tenant_id`. La ruta usa `contextoDeEmpresa` +
  `respuestaDeErrorDeEmpresa`.
- `opening-balances/auto`: `computeOpeningBalances(..., companyId?)` y
  `applyOpeningBalances(..., { companyId })` filtran `Transaction` y
  `chart_of_accounts` por empresa; el candado `assertPeriodOpen` recibe
  `{ companyId }` (una empresa hermana ya no bloquea). La ruta usa
  `contextoDeEmpresa`.
- `general-ledger/[accountId]`: `getGeneralLedger(..., scope?)` aade
  `companyId`/`tenantId` al `where` de Prisma (antes no filtraba nada). La ruta usa
  `contextoDeEmpresa`.
- **Tests:** se agreg `tests/accounting/tenant-resolver-mock.mjs` y su mapping en
  `tests/accounting/loader.mjs` (las rutas refactorizadas importan
  `@/lib/tenant-resolver`, que sin mock no resuelve con `ERR_MODULE_NOT_FOUND`); se
  normaliz `variations-service-mock.mjs` para aceptar `{ tenantId, companyId }`. La
  suite de esos 4 archivos queda en **18 pass / 8 fail**, exactamente las mismas 8
  fallas preexistentes de tests (antes y despus del cambio). En ese momento el
  `npm test` encadenaba con `&&` y **se detenia en warehouse**, asi que 5 suites
  siguientes no se ejecutaban y esas fallas de accounting ni se veian. Corregido
  el mock de warehouse y el import muerto de la ruta de PDF, la suite completa ya
  corre entera: ver la seccion de verificacion de la 040, que lista los 7 bloques.

### Verificacion
- `node node_modules/typescript/bin/tsc --noEmit` -> **464** (bajo el baseline 472;
  tipar los call-sites de `createJournalTransaction` quito 4 errores preexistentes de
  `TS2589`/`TS2345` en `transactions` y `withholding-journal`).
- `node --import ./tests/accounting/register.mjs --test <4 archivos de variaciones/apertura>`
  -> 18 pass / 8 fail (mismas fallas preexistentes, sin regresin).
- No se pudo probar por HTTP (requiere sesion de Clerk).

---

## Inventario: por que las empresas hermanas compartian datos (2 Oct 2026)

El usuario reporto que la pagina de inventario **ya** no aislaba los datos entre
empresas, siendo `products/route.ts` una de las rutas ya corregidas. No era esa
ruta: era **el contexto entero**, y afectaba a todo lo que cuelga de el.

### Causa raiz 1: `contextoDeEmpresa` no leia `x-company-id`

`middleware.ts` convierte la cookie `active_company_id` en el header
`x-company-id`, pero `contextoDeEmpresa` solo miraba `[id]` de la ruta,
`?companyId` y `?company_id`. **El header se consultaba solo como ultimo paso
antes de caer a tenant-only, y casi nunca se llegaba a el**: las rutas de
inventario no viven bajo `/companies/[id]/...`, asi que el header era su unico
pista y no se leia.

Consecuencia: `empresa.companyId` volvia **`null`**, y `filtroEmpresaOCompany`
degrada en silencio a `{ tenant_id }`. Como **test 1 y test 2 comparten
`TEST1DS`**, `/api/inventory/products`, `/movements`, `/alerts`, `/warehouses`,
`/adjustments` y `/accounting` devolvian **la union de las dos empresas**.

Corregido en `lib/tenant-resolver.ts`: el orden es ahora
`[id]` -> `?companyId`/`?company_id` -> `x-company-id` -> solo tenant.
El header se valida con **la misma regla** que la query (`403` si la empresa
existe y no es del tenant de la sesion). La unica diferencia: si el valor **no
resuelve** a ninguna fila de `companies` (cookie vieja de una empresa borrada)
se **ignora** en vez de dar 403, para no dejar la app entera sin datos por una
cookie caducada. No hay fuga posible: no hay empresa que autorizar.

### Causa raiz 2: la pagina mandaba el parametro equivocado

`app/companies/[id]/inventory/page.tsx` (la pagina a la que apunta el sidebar,
via `RoleBasedSidebar.tsx:440`) hacia:

```
/api/inventory/products?tenantId=${companyId}     <- companies.id como tenantId
/api/inventory/alerts?tenantId=${companyId}
/api/inventory/movements?tenantId=${companyId}&limit=50
```

`contextoDeEmpresa` **nunca lee `?tenantId`**, asi que la intencion de aislar se
perdia entera. Corregido a `?companyId=`. Mismo error en
`TransfersManager.tsx:116`.

### El resto de los arreglos de la sesion

- **`components/purchasing/SupplierPriceHistory.tsx` ya no manda empresa (cerrado
  el 2 Oct 2026).** Llevaba un prop `tenantId` y hacia
  `fetch('/api/inventory/products?companyId=' + tenantId)`, o sea un identificador
  con nombre de tenant traveling en el hueco de empresa.
  **Correccion a lo que se anotaba antes aqui:** decia que por eso test 2 ofrecia
  productos de test 1 porque el valor era un `Tenant.id`. **No era verdad, y la
  suposicion era Peligrosa**: quien lo montaba
  (`app/companies/[id]/suppliers/page.tsx`) pasaba `tenantId={companyId}`, o sea
  el `[id]` de la ruta, que **si** es un `companies.id`. El valor era correcto
  por casualidad y el prop mentia. Lo importante es otro, y es que
  **`/api/inventory/products` IGNORA `?companyId` a proposito** (sale del
  contexto validado, porque si no `?companyId` alcanza para leer otra empresa).
  O sea que el parametro no hacia falta para aislar: era puro ruido con un
  nombre peligroso. Se quito el prop entero y el parametro del fetch, y se
  documento por que en el propio componente. El riesgo real era que alguien
  "arreglara" el nombre del prop y empezara a mandar un `Tenant.id` de verdad.
- `InvoiceForm.tsx:161` mandaba `?tenantId=` (componente huerfano, sin
  consumidores). Ahora no manda parametro: lo resuelve el servidor desde la
  cookie, validada.
- `app/api/inventory/accounting` mandaba `companyId: tenantId` al asiento
  contable, o sea un `Tenant.id` donde `/api/accounting/transactions` espera un
  `companies.id`: las compras de inventario de test 2 se contabilizaban en el
  libro de test 1.

### Rutas migradas de `resolveTenant` a `contextoDeEmpresa`

`resolveTenant` no tiene concepto de empresa. Ademas `movements` y `adjustments`
hacian `resolveTenant(request) || body.tenant_id`, y `warehouses` tambien:
**el cuerpo de la peticion decidia en que empresa se guardaba la fila**.

| Ruta | Que se corrigio |
|---|---|
| `movements` | GET filtra por empresa; POST valida que el producto sea de esta empresa, escribe `company_id` en el movimiento y en los 3 UPDATE de stock |
| `alerts` | el listado de productos que genera las alertas se filtra por empresa |
| `adjustments` | listado por empresa; **correlativo `AJ-#####` por empresa** (era por tenant, asi que las dos empresas se repartian la serie); `company_id` en el INSERT |
| `warehouses` | listado por empresa; `company_id` en el INSERT de bodega |
| `products/image` | **no tenia contexto**: el prefijo del archivo salia de `formData.get('tenantId')` y el `UPDATE` de `product` era `.eq('id')` a secas (IDOR). Ahora valida que el producto sea de la empresa y el prefijo sale del servidor. El `DELETE` **borraba cualquier objeto del bucket** desde `?path=`; ahora exige que este bajo el prefijo del tenant resuelto |
| `products/import` | **tenia `|| '1'`**: una importacion sin `tenantId` guardaba todo en Empresa 1. Correlativo `PROD-` por empresa y `company_id` en producto y en el movimiento de stock inicial |

`inventory_adjustment` tiene `company_id`; `inventory_adjustment_item` **no**
(medido en el OpenAPI de PostgREST), asi que se aisla por el padre y solo se lee
embebido desde un ajuste ya filtrado.

### Lo que NO se tocaron (y sigue pendiente)

- **`/api/companies/[id]/inventory/*`** (warehouses, locations, stock, transfers,
  variations): aislan por `company_id`, pero pasan el `[id]` de la URL directo a
  los servicios **sin validar pertenencia** ? IDOR. Any authenticated user can
  point these at another company's UUID.
- **`app/inventory/page.tsx` y `components/inventory/InventoryManager.tsx`**
  consultan Supabase **desde el navegador** filtrando solo `tenant_id`, con
  `.eq('id', productId)` en update/delete sin filtro de empresa. El sidebar los
  sigue enlazando cuando no hay empresa activa (`RoleBasedSidebar.tsx:131/187/332`)
  y el dashboard de inventario navega a `/inventory` y `/inventory/kardex`
  (`InventoryDashboard.tsx:211-238`).
- **`product.code`**: `products/import` sigue leyendo los codigos de **todas** las
  empresas para no chocar con un `product_code_key` global. Ese UNIQUE **no
  aparece en ninguna migracion del repo** y no hay forma de verificarlo
  (PostgREST no expone indices y no hay `exec_sql`). Dejar el control es el lado
  conservador; lo que sale de ahi son codigos, no nombres ni precios. Pendiente
  confirmar el indice y, si es global, pasarlo a `(company_id, code)` como hizo la
  035 con `Account`.

### Verificacion

- `tests/inventory/contexto-empresa.test.mjs` (nuevo, 10 pass / 0 fail): cubre
  que el header resuelve empresa, que sin el el filtro cae a tenant (la fuga
  original, documentada como test), que `?tenantId` no resuelve empresa, que
  `?companyId` gana al header, los dos 403 (query y cookie manipulada), que una
  cookie de empresa borrada degrada en vez de romper, que el `[id]` de la ruta
  manda, y que sin sesion es 400 y nunca empresa 1. Va **primero** en la cadena
  de `npm test` para que corra siempre, porque el `&&` corta en warehouse.
- Suite de accounting: **38 pass / 16 fail**, identico a antes del cambio.
- `npm test` -> 43 pass / 3 fail y se detiene en `warehouse-routes.test.mjs`,
  falla **preexistente**.
- `tsc --noEmit` -> **464**, exactamente el baseline documentado, y **0 errores en
  los 8 archivos tocados**.
  Ojo con una cosa quearrya al perder tiempo: una primera corrida dio **607**, y
  era **`tsc.tsbuildinfo` obsoleto**, no una regresion. `tsc.tsbuildinfo` esta
  trackeado en git y hay que borrarlo o ignorar el total si parece disparado:
  comparar siempre contra el numero de la anotacion Y comprobar que los archivos
  que editaste tienen 0 errores, que es la comprobacion que si significa algo.

---

## El selector de empresa NO cambiaba de empresa (2 Oct 2026)

Sintoma: al pasar de test 1 a test 2, el enlace de Inventario seguia siendo
`/companies/8143dd4e.../inventory/dashboard` en los dos casos (`8143dd4e` = test 1,
medido contra la BD: test 1 = `8143dd4e-a4ef-4619-87a2-0504d0c8c46a`, test 2 =
`971bec43-5c57-44a3-92b0-db7f909c5276`, mismo `TEST1DS`, y el usuario
`17e8550f-...` es `accountant` de las dos, ninguna `is_default`).

**Habia DOS selectores de empresa, y el que se usa en la app no cambia de empresa.**

### El selector de la cabecera no hacia nada real

`components/dashboard/TenantHeader.tsx` esta montado en **6 layouts**
(`accountant`, `admin`, `dashboard`, `support`, `tenant-admin` y
`app/components/Header.tsx`), o sea en casi toda la aplicacion. Su `onChange`
hacia:

```tsx
setCompany(found);                                        // estado local + localStorage
router.push(`/companies/${found.id}?companyId=${found.id}`);
```

`setCompany` (`lib/contexts/TenantContext.tsx:301`) solo hace `setState` +
`localStorage.selected_company`. Consecuencias medidas:

- **No escribe la cookie `active_company_id`**, asi que `middleware.ts:102` sigue
  mandando `x-company-id` de la empresa ANTERIOR y **el servidor sigue filtrando
  por ella**. No era solo un enlace feo: se veian los datos de test 1 creyendo
  estar en test 2.
- **No sube la generacion ni aborta lo que esta en vuelo**, asi que la proteccion
  anti-carrera de `WorkspaceContext` no se activaba.
- `WorkspaceContext.empresa` no se enteraba, que es de donde saca el sidebar su
  enlace.
- El `?companyId=` de la URL de la pagina **no filtra nada**: las rutas API
  construyen su propia URL y no heredan los query params de la pagina. Este es el
  mismo error que el de la pagina de inventario, en otro sitio.
- Ademas duplicaba la navegacion: `setCompany` tambien hace `router.push`.

Corregido: el `onChange` ahora llama a `cambiarEmpresa(found.id)` (la via
unica: cookie -> header -> `/api/workspace` validado contra `user_company_access`
-> generacion -> navegar) y **ademas** `setCompany(found)`, este ultimo solo para
que el nombre/RTN de la cabecera y los `currentCompany?.id` que leen
`app/dashboard/page.tsx:100-105` y `app/tenant-admin/dashboard/page.tsx:43` no
queden en la empresa vieja. Son dos estados, pero ahora los dos aputan al mismo
lado; no se puede dejar solo `setCompany`, porque el que filtra los datos es el
otro.

### El resto del menu usaba el codigo de tenant donde va el UUID

`RoleBasedSidebar.tsx:434` hacia `const tenantId = (currentTenant as any)?.id`.
Ese es **`Tenant.id`**, el codigo (`"TEST1DS"`): lo devuelve `/api/tenants-api`
con `select('*')` de la tabla `Tenant` y se persiste en `localStorage.tenant_id`.
**No es un `companies.id`**, asi que `/companies/TEST1DS/accounting` no resuelve
empresa y esas paginas responden 400/403.

Solo "Inventario" se habia arreglado antes (usaba `empresa?.id`); **los otros seis**
enlaces seguian con el codigo: Mi Empresa, Contabilidad, Reportes, Facturacion,
Soporte Tecnico, Contactos y Modulos Disponibles.

Ademas `empresa?.id || tenantId`: `limpiarEstado()` vacia `empresa` al empezar el
cambio de empresa, asi que durante la transicion el enlace caia al `|| tenantId` y
seidia en `/companies/TEST1DS/inventory/dashboard`. El que hay que usar es
**`activeCompanyId`**, que existe justo para esto (es la `key` del arbol en
`WorkspaceShell` y sobrevive a la limpieza).

Corregido: los siete enlaces usan `activeCompanyId`, y si no hay empresa activa
el item se deja con su `href` estatico en vez de construir una ruta invalida.

### Un fallo al cambiar dejaba el menu en una empresa no autorizada

`cambiarEmpresa` hace `setActiveCompanyId(id)` **antes** del fetch, para que la
`key` de `WorkspaceShell` remonte el arbol de una vez. Pero si `/api/workspace`
responde 403 (empresa sin membresia), 401 o un error de red, ese `set` ya estaba
hecho y **no se deshacia**: el menu apuntaba a una empresa que el servidor no
acepta. Es el mismo sintoma del enlace congelado, por otra causa.

Era invisible mientras el unico llamador era `CompanySelector` (que solo ofrece
empresas de la lista, todas validas). Al conectarlo la cabecera, que se ve en los
layouts de `support`/`admin` donde el usuario puede no tener filas en
`user_company_access`, el caso pasa a ser alcanzable.

Arreglado: `cargar` devuelve `Promise<string | null>` con la empresa que el
servidor **confirmo** (`data.activeCompanyId`), y `cambiarEmpresa` compara. Si no
coincide con la pedida, **vuelve a la empresa anterior y restaura su cookie**, y no
navega. Un enlace a la empresa previa es feo; uno a una empresa rechazada es un
agujero y ademas vuelve a fallar al pedir datos.

### Lo que esto NO arregla

`TenantContext` sigue siendo un segundo modelo de estado de empresa (`currentCompany`
+ `localStorage.selected_company`) que convive con `WorkspaceContext`. Ahora los
dos se mueven juntos al cambiar desde la cabecera, pero cualquier otro consumidor
de `useTenant().currentCompany` puede volver a desincronizarse. La limpieza de
fondo es borrar `currentCompany`/`selected_company` y que todo el mundo lea
`useWorkspace()`, como ya hace `CompanySelector`. No se hizo aqui porque toca
`TenantContext`, los 6 layouts y `app/components/Header.tsx`.

### Verificacion

- `tsc --noEmit` -> **464**, el baseline, con 0 errores en los tres archivos
  tocados (`RoleBasedSidebar`, `TenantHeader`, `WorkspaceContext`).
- Suite de inventario: 10 pass / 0 fail.
- Los enlaces no se pueden comprobar por HTTP sin sesion de Clerk: la correccion se
  argumenta por lectura del flujo (cookie -> header -> `/api/workspace`) y por los
  ids medidos en la BD, **no** por navegacion real. **Pendiente que lo confirmes tu
  en el navegador**: cambiar a test 2 y comprobar que el enlace pasa a `971bec43` y
  que el inventario que carga es el de test 2.

## El header de Contabilidad mostraba la empresa equivocada (2 Oct 2026)

Sintoma: `/companies/8143dd4e…/accounting` (test 1) y
`/companies/971bec43…/accounting` (test 2) **mostraban las dos
"Contabilidad - test 2"**. El nombre sale de `company.business_name` en
`app/companies/[id]/accounting/page.tsx:852`.

**Causa raiz: un `find` que buscaba por `tenant_id` en una lista de `companies`.**
La pagina hace tres fetch y luego "enriquece":

```ts
const comp = comps.find((c) =>
  c.tenant_id === tenantIdReal || c.id === tenantIdReal ||
  c.tenant_code === companyId || c.id === companyId
);
```

`tenantIdReal` viene de `/api/companies/[id]`, que devuelve
`id = c.tenant_id || c.id`, o sea **el `tenant_id`**. Y `find` evalua en orden, asi
que `c.tenant_id === tenantIdReal` **gana siempre**. Como test 1 y test 2
comparten `TEST1DS` (medido), las dos paginas caian en **la misma fila**.

Simulado contra los datos reales antes de tocar nada:

```
test 1 (8143dd4e): tenant_id=TEST1DS -> VIEJO: test 1 | NUEVO: test 1
test 2 (971bec43): tenant_id=TEST1DS -> VIEJO: test 1 | NUEVO: test 2
```

O sea que el bug era **peor de lo que parecia**: no era que test 1 viera test 2,
era que **las dos veian la primera fila de la lista**. En test 1 coincidia por
casualidad y se llevaba bien; en test 2 se notaba. "Arreglarlo" para una sola de
las dos lo habria escondido.

**Arreglo: buscar solo por `c.id === companyId`.** El `[id]` de la ruta **es** el
`companies.id` y es unico; `tenant_id` no sirve para distinguir empresas. Y se
invierto el merge a `{ ...comp, ...companyData }`: con el orden viejo, `comp`
pisaba los campos de identidad de la respuesta ya resuelta.

**El mismo bug estaba en 4 paginas mas** de `reports/`, con `c.tenant_id ===
companyId || c.id === companyId`: `withholding-book`, `sales-book`,
`purchase-book` y `general-ledger`. Corregidas igual. **El patron a buscar en
revisiones: un `find`/`eq` que compare `tenant_id` contra el `[id]` de una ruta
`/companies/[id]/...`** — esos dos identificadores no son intercambiables, y
`TEST1DS` tiene dos empresas.

### Pendiente aparte: `/api/companies/[id]` NO valida pertenencia

La ruta (`app/api/companies/[id]/route.ts`) usa `supabase` de `lib/supabase-db`
(service role, salta RLS) y **no llama a `contextoDeEmpresa` ni comprueba
`user_company_access`**: devuelve la empresa que le pidan por id, sea del usuario o
no. Tiene **24 consumidores** (`SARForm221`, `BillingDashboard`,
`InvoiceSettings`, `BudgetsManager`, `ArchivoPrivado`, `InventoryDashboard`,
`InventoryVariations`…). Ademas busca en `Tenant` y por `tenant_code`, que es
justo lo que hace que su `.id` devuelva un `tenant_id`.

**Eso es un IDOR de lectura**, no el bug del header, y no se corrige aqui: exige
decidir si la ruta pasa a exigir pertenencia (y rompe los 24 consumidores que hoy
funcionan sin sesion de empresa valida) o se deja como esta. Dato medido:
`companies` no tiene columna `business_name`; el nombre real esta en `name`.

## business-reports: 3 de 4 pestañas eran MOCK, y las otras 2 fugaban (2 Oct 2026)

Sintoma: `/companies/8143dd4e…/business-reports` y `/companies/971bec43…/business-reports`
**enseñaban lo mismo**. La pagina (`app/companies/[id]/business-reports/page.tsx`) lo
hacia bien: pasa `companyId` a las 4 rutas. **El fallo estaba en las rutas.**

`app/companies/[id]/business-reports/page.tsx` llama a estas 4, y tienen **dos
problemas distintos**:

| Ruta | Problema | Estado |
|---|---|---|
| `reports/profitability` | **mock**: objeto literal fijo en el codigo | anotado |
| `reports/maintenance` | **mock**: idem | anotado |
| `reports/marketing` | **mock**: idem | anotado |
| `reports/occupancy` | **fuga real**: filtraba solo por `tenantId` | **arreglado** |
| `kpis` | **fuga real**: idem, en 3 consultas | **arreglado** |

### Las 3 mock: no es fuga, es que no hay datos

`profitability`, `maintenance` y `marketing` **no leen la base ni el `[id]` de la
ruta**: devuelven un objeto literal fijo (10 cubiculos, 15 activos, 45 leads,
recomendaciones inventadas). Dos empresas no pueden ver datos distintos porque
**no hay datos que ver**. Se dejo el comportamiento y se documento en la cabecera
de cada ruta, con el filtro de empresa que hay que usar cuando se implemente.

**Lo que estas paginas muestran hoy son numeros ficticios presentados como
reales.** Eso es peor que un error visible: un dueño mirando su rentabilidad ve
`totalRevenue: 1250000` y `netMargin: 30%` y puede decidir con eso.

### Las 2 fugas: el mismo bug, y por un comentario que mentia

`occupancy` y `kpis` filtraban **solo por `tenantId`**, resuelto del `[id]` de la
ruta. Test 1 y test 2 comparten `TEST1DS`, asi que salian con las mismas
facturas, transacciones y KPIs. **Era una fuga entre empresas, no datos iguales por
casualidad.**

La causa de fondo no era un `.eq()` olvidado, era **el comentario que lo
justificaba**:

> `Invoice` no tiene columna `company_id` […] antes se filtraba por `?companyId`
> (del cliente, y sobre una columna inexistente) […]

**Es falso en las dos partes.** Medido el 2 Oct 2026 contra la BD:

| Tabla | ¿Tiene `company_id`? |
|---|---|
| `Invoice` | **SÍ** (`tenantId`, `company_id`) |
| `Transaction` | **SÍ** (`tenantId`, `tenant_id`, `tenantid`, `company_id`) |
| `cost_payments` | **SÍ** (`.eq('company_id')` se acepta; `companyId` da `42703`) |

Y `AGENTS.md` **tambien decaia que `Transaction` NO tiene `company_id`** (seccion
4, "Esquema real"). Los dos documentos se copiaron el error del otro. **Un
comentario que "explica" por que algo no esta arreglado es el sitio mas peligroso
para meter una mentira**, porque el siguiente lo lee como justificacion y no lo
vuelve a medir.

Arreglado en ambas: filtro por `company_id` en la consulta **y en el fallback**
(los dos tenian un fallback que se olvidaba del filtro de empresa, asi que un 0
filas se convertia en los datos de la otra). En `kpis` desaparecio tambien
`tenantFromCompanyId` y su import: ya no se usa.

### Auditoria: 61 rutas, 36 sin contexto validado, 9 sospechosas restantes

`scripts/_auditar-rutas-company.mjs` (nuevo, solo lectura) revisa
`app/api/companies/[id]/**` y marca las que filtran por tenant y no por empresa.

**Las 9 que quedan NO se tocaron**, y no son el mismo problema: son `billing/config*`
(CAI, logos), `billing/stats`, `costs`, `custom-kpis` y tres de importacion de
inventario. Necesitan ver si su tabla tiene `company_id` y cual es el
`vinculo` correcto (varias ya usan `warehouse` o `product_location`, que aíslan por
otra via). Es trabajo por ruta, no un cambio de filtro.

## Los KPIs de business-reports NO se pueden verificar con test 1 y test 2 (3 Oct 2026)

El fix de `kpis`/`occupancy` esta bien, pero **hoy es imposible verlo en la
pagina**, y conviene saber porque antes de que alguien lo mire y concluya que no
se arreglo nada.

Medido contra la base el 3 Oct 2026:

| empresa | tenant | Transaction | Invoice | Account |
|---|---|---|---|---|
| test 1 | TEST1DS | 3 | 0 | 2 |
| **test 2** | TEST1DS | **0** | **0** | **0** |
| Angelos | ANGELOH7 | 32 | 3 | 19 |
| Empresa 1 | 1 | 14 | 0 | 22 |

Las otras 4 empresas no tienen nada. Dos motivos encadenados:

1. **test 2 no tiene ni una fila en toda la base.** Con el filtro viejo por tenant
   veía las 3 de test 1, y por eso el sintoma era "las dos mostran lo mismo".
   Ahora deberia ver 0.
2. **Las 3 transacciones de test 1 son de agosto y septiembre.** La ruta filtra
   `gte('date', primerDiaDelMesEnCurso)`, y hoy es 3 de octubre: **la transaccion
   mas reciente de TODA la base es del 30 de septiembre**. Osea que ahora mismo
   los KPIs dan **0 para cualquier empresa**, con o sin el fix.

**Consecuencia:** test 1 y test 2 van a salir los dos con ceros, y eso es
**correcto**, no es que el fix falle. Y las 3 pestanas mock seguiran mostrando
exactamente los mismos numeros inventados, porque no leen la base. **Lo primero
que vera el usuario es "siguen igual", y el sintoma es el mock, no la fuga.**

Como verificar de verdad, cuando se quiera:
- Insertar una transaccion de **octubre** en **test 1**, recargar: test 1 tiene que
  mover, test 2 tiene que seguir en 0. Esa es la prueba del aislamiento.
- No sirve Angelos vs Empresa 1: estan en tenants distintos, asi que el bug viejo
  nunca habria fugado entre ellas.
- Script: `npm run verificar:kpis` (solo lectura, compara el filtro bueno con el
  viejo, pero sin sesion Clerk solo prueba las consultas, no la pagina).

### Una transaccion huerfana: dato perdido, no fuga

`051e950a` (2025-04-30, 500000) tiene **`company_id` NULL y `tenantId` NULL**, y
tambien `tenant_id` NULL. Es invisible **para los dos filtros**: ni el viejo por
tenant ni el nuevo por empresa la ven, y no la ve ni el mas dueno. Se contabilizo
en su dia y desde entonces no la muestra nadie. No es una fuga: es un asiento que
se perdio. La 027b2 ya lo dejo declarado a proposito, sin empresa inventada.

## Compras y Proveedores: el modulo entero operaba sobre el tenant '1' (2 Oct 2026)

Elegiste priorizar este modulo. El hallazgo no era un `tenant_id` suelto: era que
**`lib/purchase-db.ts` exportaba `TENANT_ID = '1'` y lo aplicaba a TODAS sus
consultas**, asi que las 8 rutas de `/api/purchases` y `/api/suppliers` trabajaban
siempre sobre el tenant '1', sin importar que empresa tuviera el usuario en la
barra.

### Lo que hacia cada cosa (medido, 2 Oct 2026, PostgREST)

Empresa 1 = `73d5bbf7-8e47-470e-9430-da513e623ab7`, `tenant_id = '1'`.

| Tabla | Filas con `tenant_id='1'` | Con `company_id` de Empresa 1 |
|---|---|---|
| `Purchase` | 2 | 2 |
| `Supplier` | 2 | 2 |
| `PurchaseItem` | 3 | 3 |
| `product` | 6 | 6 |
| `warehouse` | 1 | 1 |
| `Account` | 22 | 22 |
| `Customer` | 1 | 1 |

Las dos compras son `951ee549-30b2-44e6-ab22-af1d47df337c` (factura
`0080020100018980`, 137) y `b7c3ccc9-e061-441c-9df8-bf0c1abc1726` (factura
`0080020100018981`, 482).

**Lo importante: los datos NO estaban mal atribuidos.** Todas las filas del tenant
'1' ya tienen el `company_id` correcto. Osea que la migracion 040 **no reasigna
nada**: normaliza el `tenant_id` que quedó viejo. Si llego a "reparar" moviendo
empresas, habria roto datos que ya estaban bien.

### Los 9 agujeros (no era uno, eran nueve)

1. `fetchPurchases` filtraba `.eq('tenant_id','1')` y **no filtraba por empresa**.
2. `createPurchase` tomaba `companyId` **del cuerpo**, sin validar, y lo escribia
   junto a un `tenant_id` fijo. O sea que el POST escribia donde dijera el cliente.
3. `PurchaseItem` se insertaba **sin `company_id`**: filas invisibles para todo
   filtro por empresa.
4. Busqueda de productos con `.eq('tenant_id', companyId)` — un `companies.id`
   (UUID) en una columna de codigo de tenant. No casa nunca: 0 productos
   encontrados, y por tanto **una copia nueva por cada compra**, en vez de
   actualizar el stock del existente.
5. Productos creados con `tenant_id: companyId` (UUID donde va un codigo) y sin
   `company_id`.
6. Cuentas contables del asiento resueltas con `.eq('code','1101').eq('tenant_id',
   tenantId).single()`. Con **test 1 y test 2 compartiendo `TEST1DS`** eso devuelve
   dos filas y `.single()` revienta con `PGRST116`: la compra se guardaba y el
   asiento no, sin avisar. Y si no revienta, el asiento va contra la cuenta de la
   hermana.
7. `updatePurchase`/`deletePurchase` con `.eq('id', id)` a secas: IDOR. Editar o
   borrar una compra de otra empresa era cuestion de conocer el UUID.
8. `/api/purchases/payments`: los 4 handlers con tenant fijo, y **el POST tomaba
   `purchase_id` del cuerpo sin comprobar de que empresa era**, con lo que un pago
   se colgaba de una compra ajena y recalculaba su saldo. PUT y DELETE por `.eq('id')`.
9. `/api/suppliers`: `buildInsert` fijaba `tenant_id` a `'1'` y `company_id` del
   cuerpo; el GET aceptaba **`?tenantId` como si fuera `company_id`** (dos
   convenciones distintas: `"1"` contra `73d5bbf7-...`, no casa nunca) y sin ninguno
   de los dos **no ponia filtro de empresa**; PATCH y DELETE por `.eq('id')`. Y el
   DELETE reportaba **cualquier** error como "tiene compras o pagos asociados", asi
   que un fallo de red se disfrazaba de regla de negocio.

### Y dos mas al mirarlos de cerca

- `lib/services/diat-generator.ts`: `fetchVentas` filtraba `libro_ventas` con
  `.eq('tenant_id', companyId)` (0 filas, UUID contra codigo) y **su "respaldo"
  consultaba la vista ENTERA sin filtro de empresa**. El DIAT de ventas salia con
  los datos de todas las empresas. `collectDiatPeriods` listaba meses de
  `libro_ventas` y `libro_compras` **sin filtro alguno**, asi que el selector de
  mes ofregia periodos que luego salian vacios.
- `app/api/diat/route.ts` solo comprobaba que `?companyId` **viniera**, no que fuera
  del usuario: `?companyId=<la que sea>` sacaba el DIAT de otra empresa.

### Como quedo

`lib/purchase-db.ts` ya no exporta `TENANT_ID`. Todas sus funciones reciben
`EmpresaCompra = { tenantId, companyId }`:

```ts
const empresa = exigirEmpresa(await contextoDeEmpresa(request));
```

`exigirEmpresa` es deliberado: `contextoDeEmpresa` devuelve `companyId: string | null`
porque cuando no puede resolver la empresa (requests sin sesion) se degrada a
tenant suelto. **Eso es exactamente la fuga original**, asi que Compras/Proveedores
exige empresa real y responde **400** en vez de caer a un filtro por tenant. Sin eso,
volveriamos a tener `TEST1DS` viendo lo de su hermana.

Ademas: `.eq('company_id', ...)` en toda lectura, `company_id` en todos los
INSERT/UPDATE, y la compra/pago/proveedor se valida contra la empresa **antes** de
escribir, con **404** (no 403) cuando es de otra, para no confirmarle que existe.

### Los tests de DIAT cambiaron de contrato, a proposito

`tests/diat/diat-route.test.mjs` tenia un test titulado **"400 - falta companyId"**
que exigia precisamente el comportamiento vulnerable: que `?companyId=ANGELOH7`
fuera suficiente. Ese test **codificaba el agujero**, asi que se reescribio:
ahora comprueba que sin empresa hay 400, que un `?companyId` de otra empresa da
403, y que el parametro se acepta si coincide con la activa. 8/8.

### Migracion 039 — SIN OBJETO: las 8 cuentas ya no existen (2 Oct 2026)

`prisma/migrations/039_borrar_cuentas_legacy.sql` iba a borrar las 8 `Account`
sin `company_id` (las de `tenant_001` y `default-tenant`). **Su objetivo ya se
cumple: no queda ninguna.** Medido tras el fallo:

| Chequeo | Valor |
|---|---|
| Las 8 por `id` | **0** |
| `Account` sin `company_id` | **0** |
| `Account` totales | 43 |
| Códigos `1101`/`4101`/`1102` | 6 |

Las 6 filas de `1101`/`4101`/`1102` son las copias por empresa que creo la 030
(Angelos, test 1 y Empresa 1), o sea que la 030 **si se aplico** y cumplio su
parte. La 039 ya no tiene nada que borrar.

#### El fallo, y por que la cabecera mentia

El primer intento dio:

```
ERROR: P0001: 039: se esperaban 8 bajas, hubo 0. Abortar.
CONTEXT: PL/pgSQL function inline_code_block line 12 at RAISE
```

`line 12` es el `RAISE EXCEPTION` del bloque 2. La causa era el **propio
mecanismo de idempotencia**: el bloque 0 terminaba con
`IF n = 0 THEN RAISE NOTICE '...'; RETURN; END IF;`, y **un `RETURN` en
PL/pgSQL solo sale de ESE bloque**. Los bloques 1, 2 y 3 se ejecutaban igual:
el 0 avisaba, el 1 y el 2 no hacian nada, y el 2 comparaba `0` contra `8` y
abortaba. La cabecera anunciaba una idempotencia que el codigo no tenia.

Corregido con settings de sesion **locales a la transaccion**
(`mig_039_skip`, `mig_039_total`) y un `RETURN` propio en los bloques 1, 2 y 3.
Ademas el bloque 2 ahora compara contra lo que el preflight **encontro**, no
contra 8 fijo: si solo quedaran 5 de las 8, borrar 5 es correcto y abortar
seria un falso negativo.

**No se corrio de nuevo** porque el diagnostico dio 0 filas que borrar: hacerlo
seria un no-op. No se aplico ni se va a aplicar. Si algun dia se agrega una fila
sin `company_id` de otra fuente, la 039 corregida la Saltaria entera (su
`id IN (...)` es de estas 8 concretas), y eso que es correcto: **esta migracion
no es un limpiador de `Account`, es el borrado de 8 filas concretas.** Para lo
general, el post-check avisa y decide una persona.

#### El "43 en total" RECONCILIADO (medido 2 Oct 2026)

Cerrado. El reparto por empresa de las 43 **explica los dos lados del 43**:

| Empresa | Cuentas | Que es |
|---|---|---|
| test 1 (`8143dd4e`) | **2** | `1101`, `4101`: solo las copias per-empresa de la 030 |
| Empresa 1 (`73d5bbf7`) | **22** | su plan de cuentas propio, codigos `1101`..`6401` |
| Angelos (`7bd123d8`) | **19** | su plan propio, con codigos con sufijo (`1101-01`, `1101.01`, `4101-01`...) |
| | **43** | |

Las 8 que "faltaban" el 30 Sept son **las 6 de Empresa 1 + las 2 de test 1**:
Empresa 1 ya tenia 22 el 30 Sept y test 1 no tenia ninguna (solo las compartidas
de las 3 empresas). Y las 8 que estaban sin empresa eran las compartidas, que la
030 borro al crear las copias por empresa. O sea que **el 43 es el mismo conjunto
de siempre**: lo que cambio es que cada fila tiene su empresa y las 8 huerfanas
desaparecieron al dividirse. No entro nada nuevo.

La segunda consulta (`GROUP BY company_id, code HAVING count(*) > 1`) devuelve
**0 filas**: no hay ni un codigo repetido dentro de una misma empresa. Las copias
de la 030 quedaron **una por empresa**, que es justo lo que debia hacer.

**Lo que si queda raro, y no es un problema de aislamiento:** Angelos tiene a la
vez `1101`, `1101-01` y `1101.01`, y lo mismo con `4101`. Son codigos
distintos, asi que el `UNIQUE (company_id, code)` no choca y no hay nada roto.
Pero `resolveAccountId` busca por **prefijo** (`.ilike('code', prefijo + '%')`)
con `.order('code').limit(1)`, y en Angelos el prefijo `1101` matchea tres
filas: gana `1101` (alfabetica, sin sufijo) y **`1101-01` queda sin uso**. Es el
caso que la seccion de `Account.name` ya anticipaba, ahora medido. No lo cambia
nadie sin decidir si Angelos tiene una caja o tres, y eso es una decision de
contabilidad, no de codigo.

Cierre: la 039 **no estaba pendiente por un fallo suyo**. Estaba pendiente
porque su trabajo ya lo habia hecho la 030 antes. Se deja el archivo corregido
por si reapareciesen esas 8 filas concretas, pero no hay que correrlo.
### Migracion 040 — APLICADA Y VERIFICADA (2 Oct 2026)

`prisma/migrations/040_compras_proveedores_tenant_coherente.sql`. Sincroniza
`tenant_id` con el tenant de la empresa que la fila ya declara, en `Purchase`,
`PurchaseItem`, `Supplier`, `SupplierPayment` y `supplier_price_history`.
Corre sin error y **verificada desde fuera** con las 3 consultas de abajo
(resultados medidos, no inferidos del "Success").

#### Fallo al ejecutarla: `EXECUTE of SELECT ... INTO is not implemented`

La primera version **fallo** en el SQL Editor:

```
ERROR:  0A000: EXECUTE of SELECT ... INTO is not implemented
HINT:  You might want to use EXECUTE ... INTO or EXECUTE CREATE TABLE ... AS instead.
CONTEXT:  PL/pgSQL function inline_code_block line 8 at EXECUTE
```

Causa: el bloque 1 (el de inventario) tenia el `INTO` **dentro** de la cadena
dinamica:

```sql
EXECUTE format($f$ SELECT count(*) INTO v_n FROM public.%I ... $f$, v_tabla);
```

`EXECUTE` **no implementa** `SELECT ... INTO`: solo `EXECUTE ... INTO` y
`EXECUTE CREATE TABLE ... AS`. La linea 8 del `DO` era exactamente la del
`EXECUTE`, asi que el `CONTEXT` la senala sin ambiguedad. Corregido a la forma
que ya usaban bien los bloques 3 y del post-check:

```sql
EXECUTE format($f$ SELECT count(*) FROM public.%I ... $f$, v_tabla) INTO v_n;
```

La transicion fallo en el bloque 1, **antes** del UPDATE del bloque 2, asi que no
llego a escribirse nada. Aun asi, al re-ejecutarla hay que leer los `NOTICE`: dan
el conteo por tabla, y eso es la unica prueba de que el UPDATE ocurrio.

**Leccion del falso verde:** la validacion estructural previa de esta migracion
conto 5 bloques `DO`, 6 usos de `%I` y dio **"0 problemas" con la migracion
rota**. Miraba la forma, no si el SQL de las cadenas era ejecutable, y el bug
estaba en la tercera linea del cuerpo. Se sustituyo por
`node scripts/validar-040.mjs`, que comprueba (entre otras cosas) que no haya
ningun `INTO` dentro de una cadena `$f$`, que cada `SELECT` en `EXECUTE` reciba
su valor, y que las variables esten declaradas. **Comprobado por mutacion:**
reintroducir el bug da exit 1 y dos problemas concretos.

Y un segundo defecto del propio validador, que tambien habria dado ruido:
**se enganchaba con su propia documentacion.** La cabecera de la 040 menciona
`$f$` en prosa, y eso descoloco el emparejamiento de cadenas: 7 falsos positivos.
Por eso ahora ignora comentarios, literales y dollar-quoting antes de analizar. Si
un verificador senala lo que acabas de escribir en prosa al lado, el defecto suele
estar en el verificador.

- **`company_id` no se toca**: es el campo confiable (la 027b lo reparo con
  evidencia). El que quedó viejo es el `tenant_id`.
- Filas con `company_id` NULL **no se tocan**: no hay empresa de la que deducir el
  tenant, y rellenarlo seria inventar.
- Usa `IS DISTINCT FROM`, no `<>`: con `tenant_id` NULL, `<>` da NULL (no TRUE) y el
  WHERE descartaria la fila. Es el fallo que hizo que la 028 no rellenara nada y
  el SQL Editor dijera "Success. No rows returned".
- Preflight que aborta si falta alguna columna, y post-check que **aborta** si queda
  alguna incoherencia: una migracion de solo UPDATE necesita medir su resultado, o
  no distingue "ya estaba bien" de "no hizo nada".
- El caso conocido que dispara esto es **DICOSA** (`693af3cd-ef07-457e-b001-a274417bc110`):
  la 027b2 la atribuyo a Empresa 1 por sus 2 `Purchase`, pero su `tenant_id`
  estaba en `'ANGELOH7'`. **Tras la 040 debe quedar en `'1'`.**
- El post-check de la migracion **aborta** si queda alguna incoherencia resoluble,
  asi que el hecho de que corriera sin error ya dice que **0 filas quedaron
  mal**. Eso es una garantia fuerte, pero no es lo mismo que medir el resultado:
  el post-check mide "no queda incoherencia", no "se actualizaron las filas que
  habia".

#### Verificacion desde fuera de la 040 (MEDIDA, 2 Oct 2026)

**Resultado 1 — incoherencias que quedan: 0 en las 5 tablas.**

| Tabla | Incoherentes |
|---|---|
| `Purchase` | 0 |
| `PurchaseItem` | 0 |
| `Supplier` | 0 |
| `SupplierPayment` | 0 |
| `supplier_price_history` | 0 |

**Resultado 2 — DICOSA** (`693af3cd-ef07-457e-b001-a274417bc110`):
`name='Distrubidora Comercial SA'`, **`tenant_id='1'`**, `company_id=Empresa 1`.
Antes era `tenant_id='ANGELOH7'` con empresa ya Empresa 1: exactamente la
contradiccion que la 040 pretendia cerrar. **Ya no existe.**

**Resultado 3 — la 040 NO movio empresas: `compras=2`, `proveedores=3`.**

Aqui hay que entender un numero que parece raro, porque **3 proveedores y no 2**
es lo correcto:

- La cabecera de la 040 dice "filas con `tenant_id='1'` -> 2 `Supplier`". Eso
  contaba por **tenant**, no por empresa.
- Este conteo es por **`company_id = Empresa 1`**, y da 3: los 2 de antes mas
  **DICOSA**, que ya era de Empresa 1 por `company_id` pero con `tenant_id`
  `ANGELOH7`. O sea que el 3 es justamente DICOSA, y los tres proveedores de
  Empresa 1 son **DICOSA, Disnorte y TecnoGlobal**.
- Cuadra con lo que la 027b2 dejo medido: **`Supplier` 3/3 coherentes**.

Asi que el mismo dato aparece como 2 y como 3 segun se cuente, y **los dos estan
bien**: 2 por `tenant_id`, 3 por `company_id`. La razon de que difieran es
justo lo que la 040 reparo. Si al releer esto parece una contradiccion, la
pregunta que la resuelve es "que columna estas contando".

Ojo al leer el resultado 1 por API, no por el SQL Editor: si alguna vez saliera
todo a 0 porque la consulta fallo, `[]` y "todo correcto" se parecen. Por eso
las consultas van con `count(*)` explicito por tabla: un `[]` en vez de cinco
filas con `count: 0` seria una senal de que la consulta no llego a ejecutarse.

Las consultas usadas fueron:

```sql
-- 1. Debe dar 0 en las 5. Cualquier valor > 0 es una incoherencia viva.
SELECT 'Purchase' t, count(*) FROM public."Purchase" r JOIN public.companies c ON c.id = r.company_id
  WHERE r.tenant_id IS DISTINCT FROM c.tenant_id
UNION ALL SELECT 'PurchaseItem', count(*) FROM public."PurchaseItem" r JOIN public.companies c ON c.id = r.company_id
  WHERE r.tenant_id IS DISTINCT FROM c.tenant_id
UNION ALL SELECT 'Supplier', count(*) FROM public."Supplier" r JOIN public.companies c ON c.id = r.company_id
  WHERE r.tenant_id IS DISTINCT FROM c.tenant_id
UNION ALL SELECT 'SupplierPayment', count(*) FROM public."SupplierPayment" r JOIN public.companies c ON c.id = r.company_id
  WHERE r.tenant_id IS DISTINCT FROM c.tenant_id
UNION ALL SELECT 'supplier_price_history', count(*) FROM public.supplier_price_history r JOIN public.companies c ON c.id = r.company_id
  WHERE r.tenant_id IS DISTINCT FROM c.tenant_id;

-- 2. DICOSA: tenant_id debe ser '1' (Empresa 1). Antes de la 040 era 'ANGELOH7'.
SELECT name, tenant_id, company_id FROM public."Supplier"
 WHERE id = '693af3cd-ef07-457e-b001-a274417bc110';

-- 3. Empresa 1 debe conservar sus 2 compras y 2 proveedores (la 040 no mueve empresas).
SELECT
  (SELECT count(*) FROM public."Purchase"  WHERE company_id = '73d5bbf7-8e47-470e-9430-da513e623ab7') AS compras,
  (SELECT count(*) FROM public."Supplier" WHERE company_id = '73d5bbf7-8e47-470e-9430-da513e623ab7') AS proveedores;
```

- Valores con los que **queda verificada** (los que devolvio): (1) todo 0,
  (2) `tenant_id='1'`, (3) `compras=2, proveedores=3`.
- Ojo con el detalle de siempre al leer el resultado por PostgREST/API: con
  resultado vacio el `content-range` viene con dos asteriscos, no `0-0/0`.
- Los `NOTICE` que emite la migracion son la otra prueba: uno por tabla con
  `PurchaseItem`, `Supplier`, `SupplierPayment` y `supplier_price_history`
  diciendo si ya estaban coherentes o cuantas filas se actualizaron. Si el panel
  del SQL Editor no los muestra, la (1) y la (2) los sustituyen.

### Verificacion

- Typecheck: **464**, el baseline exacto (0 errores en los 11 archivos tocados).
- SQL: `node scripts/validar-040.mjs` da **OK** (5 bloques DO, 4 cadenas
  dinamicas, 6 `%I`, 1 UPDATE). Comprobado por mutacion: reintroducir el `INTO`
  dentro de la cadena da exit 1. **Esto valida la estructura, no la ejecucion:**
  lo unico que prueba que corrio en la BD es el post-check, que aborta si queda
  alguna incoherencia.
- `npm test` completo, **los 7 bloques ejecutados por fin** (antes la cadena con
  `&&` moria en warehouse y 5 suites nunca llegaban a correr):
  inventario **10/10**, compras **18/18**, DIAT **8/8**, budgets **21/21**,
  warehouse **14/14**, pdf **13/13**, accounting **38/54**.

#### Dos bugs reales que salieron al desbloquear las suites

No eran problemas de los tests: eran codigo roto que las pruebas nunca llegaron
a ejecutar porque `npm test` se detenia antes.

1. **`app/api/documents/pdf/route.ts` no cargaba en produccion.** Importaba
   `getAllAuditLogs` y `getUserAuditLogs` de `@/lib/services/audit-service`, y
   **ninguna de las dos existe** (el servicio exporta `getPeriodAuditTrail`,
   `getRecordAuditOutbox`, `processAuditEntry`... y `getPeriodAuditTrail`). En ESM
   un import de un export inexistentelanza al cargar el modulo, asi que **toda** la
   ruta `/api/documents/pdf` estaba caida, no solo el reporte de auditoria. Y las
   dos funciones **no se usaban** en el archivo: la consulta de `account_audit_log`
   es inline. Import muerto; se borro. Lo detecto el `node --test` al no resolver
   el modulo, no una asercion.
2. **`tests/warehouse/warehouse-service-mock.mjs` no exportaba
   `getWarehouseLocationCounts`**, que `app/api/companies/[id]/inventory/stock/route.ts`
   importa junto a `getWarehouseStock`. Mismo efecto: el archivo entero de tests
   reventaba al importar.

La leccion: **un export que falta en un mock rompe el archivo de test entero, y
con `&&` en `npm test` se come todas las suites siguientes sin que se note.** Si
el numero de pruebas de una suite baja de golpe, sospecha de un error de import,
no de aserciones.

#### Las 16 fallas de accounting que quedan (preexistentes, NO de este trabajo)

Verificado con `git status`: los 6 archivos que fallan estan **intactos**,
sin modificar. Son mocks desalineados y expectativas sobre mensajes en espanol,
no regresiones:

| Archivo | Sintoma |
|---|---|
| `journal-service.test.mjs` | asserts sobre `/Cuentas repetidas/`, `/balanceada/` que el mock no produce |
| `opening-balance.test.mjs`, `period-closing.test.mjs` | `Missing expected rejection`; `items.filter is not a function` (el fake devuelve otra forma) |
| `opening-auto-route.test.mjs` | asserts sobre `/bloqueado/` |
| `transactions-route.test.mjs` | **carga entera rota**: `Cannot find package '@/lib'` desde `app/api/accounting/transactions/route.ts` (falta el mapeo en su loader) |
| `variations-route.test.mjs` | 4 aserciones de resultado |
| `supplier-price-history.test.mjs` | **si era mio y ya esta arreglado**, ver abajo |

- `assert.property is not a function` aparece en otra suite: esa API **no existe**
  en `node:assert/strict` (es `assert.ok('x' in obj)`). Test roto, no codigo roto.
- `supplier-price-history.test.mjs` si lo arregle yo: sus 5 llamadas a
  `recordSupplierPriceHistory` seguian con la firma vieja
  `(supabase, supplierId, items, tenantId, fecha)`, pero la funcion ya pide
  `(supabase, empresa, supplierId, items, fecha)`. `supplierId` caia en el hueco de
  `empresa` y `items` en el de `supplierId`, asi que `items.filter` reventaba con
  `items.filter is not a function`. **Pasaba porque `empresa` nunca se llego a
  usar.** Corregidas las 5, la suite da **5/5**.

- **Ojo con `npm test` y `&&`:** si una suite falla, las siguientes no se ejecutan y
  el resumen final no las menciona. Un "todo verde" parcial no es un todo verde:
  hay que leer el conteo de cada bloque, no el ultimo.

### Archivos

`lib/purchase-db.ts`, `lib/services/diat-generator.ts`, y las 10 rutas:
`app/api/purchases/{route,[id]/route,export/route,payments/route,reports/route}`,
`app/api/suppliers/{route,import/route,price-history/route}`, `app/api/diat/route`.

### Dos cosas que NO toque, y por que

- `app/api/purchases/route-original.ts` y `app/api/suppliers/route-original.ts`
  tienen `tenant_id: '1'` literal. **Estan muertos**: Next solo rutea `route.ts`, y
  nada en `app/`, `lib/` ni `components/` los referencia. Borrarlos es una decision
  tuya; mientras tanto son un riesgo de que alguien copie de ahi.
- `components/purchasing/SupplierManager.tsx` y `PurchaseOrdersManager.tsx` hacen
  consultas directas al navegador con `.eq('tenant_id', tenantId)`. Dos motivos para
  no tocarlos aqui: usan la **anon key** (el RLS si aplica, a diferencia del service
  role del servidor) y **ninguna pagina los renderiza**. Si en algun momento se
  montan, hay que migrarlos a las rutas.
