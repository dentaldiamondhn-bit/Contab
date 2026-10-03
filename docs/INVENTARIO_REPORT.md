# Reporte de Estado y Plan de Ejecución: Inventario

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Gestión de Productos** | Completo | 1 página (1537+ líneas) | 1 ruta | 1 tabla (`product`) | Supabase |
| **Control de Stock** | Completo | En página | 1 ruta | 2 tablas | Supabase |
| **Movimientos de Inventario** | Completo | En página | 1 ruta | 2 tablas | Supabase |
| **Alertas de Stock** | Parcial | En página | 1 ruta | — | Cálculos en código |
| **Reportes de Inventario** | Completo | 1 componente | 1 ruta | — | Supabase |
| **Dashboard de Inventario** | Completo (28 Sept 2026) | 1 página + 1 componente | 1 ruta | — | Supabase |
| **Ubicación (física) de Producto** | Completo (28 Sept 2026) | En página + kardex + dashboard | 1 ruta | Columna `location` en `product` | Supabase |
| **Categorías y Paquetes** | Parcial | En página | 0 rutas | — | Supabase |
| **Importación Masiva** | Completo | En página | — | — | Excel/CSV |
| **Almacenes** | Completo (Etapa 2) | 1 tab + componente | 2 rutas | 1 tabla (`warehouse`) | Supabase |
| **Traslados/Logística** | Completo (Etapa 2) | 1 tab + componente | 2 rutas | 2 tablas (`inventory_transfer` + `_item`) | Supabase |
| **Tracking por Lote** | No Iniciado | 0 | 0 | 0 | — |
| **Inventario Físico** | No Iniciado | 0 | 0 | 0 | — |
| **Valoración FIFO/Promedio** | No Iniciado | 0 | 0 | — | Columna existe sin lógica |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~70% | Etapa 2 (multi-almacén + traslados) completa; sin lotes, FIFO, inventario físico |
| Cobertura de Pruebas | Parcial | 12 tests node:test en almacenes/traslados (cálculo + rutas API) |
| Persistencia | ~60% | Esquema único canónico (`product`/`inventory_movement`); consolidado el 16 Sept 2026 |
| Integración Contable | ~50% | Integración con asientos contables existe pero parcial |
| Importación | ~80% | CSV y Excel funcionales |

---

## 2. Inventario Detallado

### 2.1 Gestión de Productos

**Estado: Completo (~80%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/inventory/page.tsx` | Página completa (1537+ líneas): CRUD de productos, movimientos, categorías, paquetes, promociones, importación CSV/Excel, gestión de descuentos, vinculación con proveedores, multi-vista (tarjetas/tabla/lista), validación, filtro de stock |
| `components/inventory/InventoryManager.tsx` | Gestor: CRUD productos, movimientos (IN/OUT), estado de stock, valoración, integración contable |
| `app/api/inventory/products/route.ts` | API CRUD de productos |
| `lib/purchase-db.ts` | Upsert best-effort de producto (stock/costo) desde Compras |

#### Tablas de Base de Datos

- `product` (canónico, snake_case) — id, code, name, description, unit, unit_price, current_cost, tax_rate, is_service, is_active, current_stock, stock_quantity, min_stock, max_stock, category, product_type, valuation_method, expiration_date, location, tags, is_discount, discount_price, promotion_start_date, promotion_end_date, created_by, supplier_id, tenant_id

> Las tablas legacy `Product` (PascalCase) y `products` (plural) y la **vista** `Products` fueron eliminadas en la migración 008 (16 Sept 2026). Backups: `_backup_product_008`, `_backup_products_008`.

> **Esquema consolidado** ✅ — `product` es la única tabla de productos desde la migración 008 (16 Sept 2026).

#### Lo que Falta

- ~~Multi-almacén NO funcional~~ ✅ Resuelto: stock por almacén (kardex) y transferencias con flujo logístico (Etapa 2, 17 Sept 2026); inventario físico pendiente (Etapa 4)
- Sin imágenes de producto
- Sin conversión de unidades de medida
- Sin códigos de barras

---

### 2.2 Movimientos de Inventario

**Estado: Completo (~70%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/api/inventory/movements/route.ts` | API de movimientos |
| `lib/actions/accounting.ts` | Integración contable (asiento automático por movimiento) |
| `scripts/migrations/008_consolidate_inventory_schema.sql` | Consolidación a `product`/`inventory_movement` (trigger legacy de stock eliminado) |

#### Tablas

- `inventory_movement` (canónico, snake_case) — id, tenant_id, product_id, warehouse_id, movement_type (IN/OUT/ADJUSTMENT), movement_reason, quantity, unit_cost, total_cost, stock_before, stock_after, reference_number, notes, created_by

> La tabla legacy `InventoryMovement` (PascalCase) y `InventoryTransaction` fueron eliminadas en la migración 008 (16 Sept 2026). Backups: `_backup_inventorymovement_008`, `_backup_inventorytransaction_008`.

#### Funcionalidad

- Movimientos IN, OUT, AJUSTE; el stock (`product.current_stock`/`stock_quantity`) se actualiza en la aplicación (sin trigger)
- Integración con asientos contables
- Referencia y notas por movimiento

#### Lo que Falta

- ~~Sin transferencias entre almacenes~~ ✅ Traslados con flujo pending → in_transit → received/cancelled + movimientos de kardex automáticos (17 Sept 2026)
- Sin movimientos por lote
- Sin motivo de ajuste estandarizado

---

### 2.3 Reportes de Inventario

**Estado: Completo (~70%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/inventory/InventoryReports.tsx` | Resumen, valoración por categoría, rotación, stock muerto, KPIs, CSV export |
| `components/legal/InventoryBalanceBook.tsx` | Libro legal de inventarios y balances |
| `app/api/dashboard/inventory-stats/route.ts` | API de estadísticas |

#### Dashboard de Inventario (28 Sept 2026)

| Archivo | Propósito |
|---|---|
| `app/api/companies/[id]/inventory/stats/route.ts` | API de estadísticas: KPIs, tendencia mensual, entradas/salidas por período, categorías, top 10 productos por valor, stock por almacén, 20 movimientos recientes. Params `months=3/6/12` y `warehouseId` (multiempresa) |
| `components/inventory/InventoryDashboard.tsx` | UI con Recharts (KPIs, gráficos de tendencia/IN-OUT/categorías), filtros por período y almacén, exportación CSV client-side; muestra ubicación en "Top Productos" y "Movimientos Recientes" |
| `app/companies/[id]/inventory/dashboard/page.tsx` | Página del dashboard |
| `app/companies/[id]/modules/page.tsx`, `components/RoleBasedSidebar.tsx` | Accesos rápidos al dashboard (`/inventory/dashboard`) desde módulos y sidebar |
| Botón "Dashboard" en `app/companies/[id]/inventory/page.tsx` | Acceso directo desde la página de inventario |

#### Ubicación Física de Producto (28 Sept 2026)

| Cambio | Detalle |
|---|---|
| Migración | `prisma/migrations/015_product_location.sql` — `ALTER TABLE product ADD COLUMN IF NOT EXISTS location TEXT` + índice `idx_product_location` (idempotente; ⚠️ ejecutar en SQL Editor de Supabase) |
| API | `app/api/inventory/products/route.ts` — POST y PATCH aceptan y persisten `location` |
| UI | Tabla de productos con columna **Ubicación** (entre Unidad y Stock, muestra "—" si está vacía), campo "Ubicación" en modales de crear/editar y en el reset del formulario (`app/companies/[id]/inventory/page.tsx`) |
| Kardex | `app/companies/[id]/inventory/kardex/page.tsx` — muestra ubicación en el selector de producto y en el panel de información del producto seleccionado |
| Dashboard | `location` incluida en el select de la API de stats y mostrada en "Top Productos" y "Movimientos Recientes" |

#### Lo que Falta

- Sin exportación Excel
- Sin reporte de rotación por período
- Sin pronóstico de demanda

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | ~~Dual schema de productos~~ | Resuelto: esquema único `product` (migración 008, 16 Sept 2026) | — |
| 2 | ~~Sin multi-almacén funcional~~ | Resuelto: almacenes, stock por almacén y traslados con logística (Etapa 2, 17 Sept 2026) | — |
| 3 | Sin valoración FIFO/promedio | Costos de inventario inexactos | Alta |
| 4 | Sin inventario físico | Sin control real de stock | Alta |
| 5 | Sin tracking por lotes | Sin trazabilidad | Media |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Consolidación de Esquema — ✅ Completada (16 Sept 2026)

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | Consolidar esquemas de producto en uno solo | Migraciones SQL | ✅ Esquema único `product` |
| 1.2 | Migrar datos entre esquemas | Script de migración | ✅ Datos migrados (backups `_backup_*_008`) |
| 1.3 | Actualizar API y UI para esquema único | `inventory/page.tsx`, API routes | ✅ Código actualizado |

### Etapa 2: Multi-Almacén — ✅ Completada (17 Sept 2026)

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | ✅ UI de gestión de almacenes | Tabs "Almacenes" en `app/companies/[id]/inventory/page.tsx` + `components/inventory/WarehousesManager.tsx` (CRUD, activar/desactivar) | Tab + componente |
| 2.2 | ✅ Transferencias entre almacenes | Tabs "Traslados" + `components/inventory/TransfersManager.tsx`; servicio `lib/services/warehouse-service.ts`; API `app/api/companies/[id]/inventory/transfers/**` | Flujo pending → in_transit → received/cancelled |
| 2.3 | ✅ Stock por almacén | Derivado del kardex en `warehouse-service.ts` (`getWarehouseStock`); API `.../inventory/stock`; vista con valorizado, mínimo y CSV | Consulta por almacén |

### Etapa 3: Valoración y Costos

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Implementar valoración FIFO | `lib/services/inventory-valuation.ts` | Cálculo FIFO |
| 3.2 | Implementar valoración promedio ponderado | `lib/services/inventory-valuation.ts` | Cálculo promedio |
| 3.3 | Reporte de valoración por método | `app/reports/inventory-valuation/page.tsx` | Reporte |

### Etapa 4: Inventario Físico y Lotes

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 4.1 | Conteo de inventario físico | `components/inventory/PhysicalCount.tsx` | Formulario de conteo |
| 4.2 | Ajustes por differencias | `lib/services/stock-adjustment.ts` | Ajustes automáticos |
| 4.3 | Tracking por lote/serie | `lib/services/batch-tracking.ts` | Trazabilidad |

### Etapa 5: QA

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 5.1 | Pruebas de movimientos y stock | `__tests__/inventory/` | Pruebas unitarias |
| 5.2 | Pruebas E2E de inventario | `__tests__/e2e/inventory/` | Pruebas E2E |

---

## 5. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: Consolidación | 3 tareas | Alta | ✅ Completada (16 Sept 2026) |
| Etapa 2: Multi-Almacén | 3 tareas | Alta | ✅ Completada (17 Sept 2026) |
| Etapa 3: Valoración | 3 tareas | Alta | 3-4 semanas |
| Etapa 4: Físico/Lotes | 3 tareas | Media | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total restante** | **8 tareas** | — | **6-8 semanas** |

---

## Actualizaciones de Infraestructura (16 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 16.3.5 | Restaurado desde 15.5.25; build y dev OK en Vercel (16 Sept 2026) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |
| Stack validado | Next.js 16.3.5 (Turbopack), React 19, Clerk, Supabase (Postgres), Prisma 5.x, Tailwind, shadcn/ui; `output: 'standalone'` |
| Build | `pnpm build` EXIT=0 (16 Sept 2026) |
| Consolidación BD | Inventario unificado a `product`/`inventory_movement`; legacy eliminado (migración 008, verificado 16 Sept 2026) |

*Estado validado al 17 de Septiembre de 2026.*

## Actualizaciones de Multi-Almacén y Logística (17 Sept 2026)

Etapa 2 completada: almacenes funcionales, stock por almacén derivado del kardex y traslados con flujo logístico.

| Cambio | Detalle |
|---|---|
| Tablas | `supabase/WAREHOUSE_LOGISTICS.sql`: `company_id` en `warehouse` + `inventory_transfer`; campos logísticos (`carrier`, `guide_number`, `dispatched_by/at`); CHECK de estados pending/in_transit/received/cancelled; índices + RLS por tenant. Tablas base (`warehouse`, `inventory_transfer`, `inventory_transfer_item`) ya existían |
| Servicio | `lib/services/warehouse-service.ts`: CRUD almacenes (con bloqueo de desactivación si hay traslados abiertos), `getWarehouseStock` (agrega kardex por almacén/producto), traslados con validación de stock en origen, numeración `TRF-00001`, movimientos de kardex automáticos (`transfer_out/in/return` con `reference_type='transfer'`) y ajuste de `product.current_stock` |
| Cálculo puro | `lib/services/transfer-calc.ts`: transiciones válidas, numeración, agregación de stock, faltantes, validación de entrada |
| API | `GET/POST .../inventory/warehouses`, `PUT .../warehouses/[warehouseId]`, `GET .../inventory/stock?warehouseId=&productId=`, `GET/POST .../inventory/transfers`, `GET/PUT .../transfers/[transferId]` (action dispatch/receive/cancel; 400 validación, 404 no encontrado) |
| UI | Tabs "Almacenes" y "Traslados" en `app/companies/[id]/inventory/page.tsx` (`WarehousesManager`: CRUD + stock valorizado con mínimo y CSV; `TransfersManager`: crear con disponibilidad en origen, despachar/recibir/anular, guía y transportista, CSV) |
| Tests | `tests/warehouse/` (5 cálculo + 7 rutas, `node:test`); `npm test` → 38 pass (6 DIAT + 20 presupuestos + 12 almacenes) |
| Variaciones de inventario (17 Sept 2026) | `aggregateStockAt` + `periodFlows` en `transfer-calc.ts`; `getInventoryVariations` (stock acumulado al cierre de cada mes + flujos IN/OUT por almacén/producto) + `GET .../inventory/variations?from=&to=[&warehouseId=]` + tab "Variaciones" (`InventoryVariations` con filtros, badges y CSV) |
| Build | `next build` → `EXIT=0`, 6 rutas registradas |
| ⚠️ Pendiente del usuario | Ejecutar `supabase/WAREHOUSE_LOGISTICS.sql` en el SQL Editor de Supabase (sin acceso DDL directo); la UI muestra aviso con esta instrucción si falta la migración |

## Actualizaciones de Dashboard y Ubicación (28 Sept 2026)

Dashboard de inventario creado y columna de ubicación física de producto añadida a lo largo de inventario, kardex y dashboard.

| Cambio | Detalle |
|---|---|
| Dashboard | **Nuevo** `app/api/companies/[id]/inventory/stats/route.ts` (KPIs, tendencia mensual, IN/OUT, categorías, top 10 por valor, stock por almacén, movimientos recientes; `months=3/6/12` y `warehouseId`) + `components/inventory/InventoryDashboard.tsx` (Recharts, filtros período/almacén, export CSV) + `app/companies/[id]/inventory/dashboard/page.tsx` |
| Enlaces | Módulo Inventario en `modules/page.tsx` y sidebar (`RoleBasedSidebar.tsx`) apuntan a `/inventory/dashboard`; botón "Dashboard" en la cabecera de la página de inventario |
| Columna `location` | Migración `prisma/migrations/015_product_location.sql` (idempotente, columna TEXT + índice); API `app/api/inventory/products/route.ts` (POST/PATCH) la persiste; columna **Ubicación** en la tabla y campo en modales de crear/editar (`inventory/page.tsx`) |
| Kardex | `kardex/page.tsx` muestra la ubicación en el selector de producto y en el panel de información |
| TypeScript | `tsc --noEmit` sin errores en archivos de inventario y dashboard |
| ⚠️ Pendiente del usuario | Ejecutar `prisma/migrations/015_product_location.sql` en el SQL Editor de Supabase (sin acceso DDL directo) y reiniciar el dev server |

## Actualizaciones de Fotos de Producto (28 Sept 2026)

Fotos para los productos del inventario (bucket público `product-photos` + columna `image_url`).

| Cambio | Detalle |
|---|---|
| Migración | `prisma/migrations/016_product_image_url.sql` — `ALTER TABLE product ADD COLUMN IF NOT EXISTS image_url TEXT` (idempotente) |
| Bucket | `supabase/PRODUCT_PHOTOS.sql` — bucket público `product-photos` (5MB, JPG/PNG/GIF/WebP) + policies INSERT/UPDATE/SELECT/DELETE |
| API | **Nuevo** `app/api/inventory/products/image/route.ts` — POST sube la imagen, obtiene URL pública y persiste `image_url` (con `productId` opcional para productos existentes); DELETE elimina el archivo y limpia la columna |
| API productos | `app/api/inventory/products/route.ts` — POST/PATCH aceptan `imageUrl` (mapeado a `image_url`) |
| UI | **Nuevo** `components/inventory/ProductPhotoUploader.tsx` (preview + subir/cambiar/quitar, validaciones de tipo y 5MB); columna **Foto** con miniatura en la tabla y widget en modales de crear/editar (`app/companies/[id]/inventory/page.tsx`) |
| TypeScript | `tsc --noEmit` sin errores en los archivos de fotos e inventario |
| ⚠️ Pendiente del usuario | Ejecutar `prisma/migrations/016_product_image_url.sql` y `supabase/PRODUCT_PHOTOS.sql` en el SQL Editor de Supabase y reiniciar el dev server |

## Actualizaciones de Tabla Maestra de Ubicaciones (28 Sept 2026)

Tabla maestra `product_location` para administrar las ubicaciones físicas y vincularlas a los productos.

| Cambio | Detalle |
|---|---|
| Migración | `prisma/migrations/017_location_master.sql` — tabla `product_location` (tenant_id, company_id, code, name, aisle, shelf, description, is_active, timestamps) + `ALTER TABLE product ADD COLUMN IF NOT EXISTS location_id TEXT` + índices (idempotente) |
| RLS | `supabase/LOCATION_MASTER.sql` — políticas SELECT/INSERT/UPDATE/DELETE por tenant en `product_location` |
| Servicio | **Nuevo** `lib/services/location-service.ts` — `listLocations` (activeOnly + conteo de productos por ubicación), `createLocation`, `updateLocation` (editar/activar/desactivar), `deleteLocation` (desvincula productos); detección de migración pendiente |
| API | **Nuevo** `app/api/companies/[id]/inventory/locations/route.ts` (GET/POST) y `[locationId]/route.ts` (PUT/DELETE) |
| API productos | `app/api/inventory/products/route.ts` — POST/PATCH aceptan `locationId` (→ `location_id`); GET con `select('*')` ya devuelve `location_id` |
| UI | **Nuevo** `components/inventory/LocationsManager.tsx` (pestaña CRUD: código, nombre, pasillo, estante, contador de productos, activar/desactivar/eliminar); nueva pestaña **Ubicaciones** en `app/companies/[id]/inventory/page.tsx`; el formulario de producto usa un Select alimentado por las ubicaciones maestras (fallback a texto libre si no hay) en los modales de crear/editar |
| TypeScript | `tsc --noEmit` sin errores |
| ⚠️ Pendiente del usuario | Ejecutar `prisma/migrations/017_location_master.sql` y `supabase/LOCATION_MASTER.sql` en el SQL Editor de Supabase y reiniciar el dev server |

---

## Actualizacion 28 Sept 2026 — Aislamiento por empresa y descuento de stock

### Aislamiento por empresa (corregido, 24 pruebas en verde)
Todas las rutas de inventario tenían `tenant_id: "1"` fijo: **el inventario de cualquier
empresa consultaba el de la empresa 1**. Ahora usan `resolveTenant()`
(`?companyId=` -> header `x-tenant-id` -> `?tenantId=`) y devuelven **400** sin tenant, en
vez de caer a la empresa 1.

Corregidas: `app/api/inventory/{adjustments,warehouses,accounting,alerts,movements,products}/route.ts`
y `app/api/billing/cai/route.ts`.

- **`app/api/inventory/accounting/route.ts` estaba muerta**: el `fetch` interno a
  `/api/accounting/transactions` no pasaba tenant ni por header ni por query, asi que los
  cuatro tipos de asiento (`COMPRA`, `EGRESO` costo de ventas, `AJUSTE`, consumo interno)
  devolvian **401 siempre**.
- `adjustments`: el POST generaba el correlativo `AJ-#####` sobre el ultimo ajuste de la
  empresa 1, y si fallaba el insert de items dejaba un borrador con total 0 que despues se
  aplicaba al inventario. Ahora borra el ajuste y correlativo por tenant.
- `cai/route.ts`: el POST **desactivaba todos los CAI del tenant `"1"`** antes de insertar,
  asi que registrar un CAI desde otra empresa apagaba los de la empresa 1.

### Descuento de stock al emitir (nuevo)
`lib/services/stock-sale.ts`: `checkSaleStock()` antes de crear la factura y
`applySaleStock()` despues, porque Supabase REST no soporta transacciones. Si el descuento
falla, la ruta borra factura e items.

- **Actualizacion optimista** (`.eq('current_stock', stockBefore)`) e **idempotente** por
  `(reference_type='invoice', reference_id=<uuid>)`. Dos ventas simultaneas de 4 unidades
  con stock 5: una se aplico, la otra se rechazo, stock final 1.
- Bloquea si un `product_id` apunta a un producto de otra empresa, y no toca servicios.
- **24 pruebas en verde**, con el inventario restaurado a su estado original.

### Ojo con el stock (no es bug, es una trampa)
- **`product.current_stock` es la fuente real; `stock_quantity` es un espejo.** Los 6
  productos del tenant `1` tienen `stock_quantity = 0` con `current_stock = 100`.
- `inventory_movement.reference_id` es **UUID**, no texto.

### Pendiente
- `applySaleStock` **no sincroniza `stock_quantity`** al vender: el espejo se queda viejo.
- Migraciones `018`, `019` y `021`: **aplicadas** (28 Sept 2026 se verificó contra la BD
  que `product_location.image_url`, `product_location.warehouse_id` e
  `InvoiceItem.product_id` existen). Este reporte decía lo contrario.
- `inventory_movement` tiene `company_id` desde la 023 y **`location_id` desde la 026**,
  así que el inventario ya se puede aislar por empresa y por sede.
  Ojo: `product.location_id` es **`text` y apunta al estante** (`product_location`),
  mientras que `warehouse.location_id` es **`uuid` y apunta a la sede**
  (`company_location`). El mismo nombre, dos cosas distintas.
