# Reporte de Estado y Plan de Ejecución: Inventario

> **Última actualización: 21 Octubre 2026.** Lo nuevo está en la sección
> "Actualización 19-21 Oct 2026 — Conversión de unidades de medida (tareas 0-10)" al final;
> las secciones fechadas (8, 16-17, 18 Oct) se conservan como histórico.
>
> **Conversión de unidades de medida (084, 19-21 Oct 2026):** un producto ya puede tener
> **medidas** (unidad, docena, caja) con costo y precio de venta propios por medida, con
> el **stock siempre en unidad base** y el flag **"Incluye ISV"** por medida y por
> producto. **Migración `074` APLICADA** (21 Oct 2026, SQL Editor). Tareas **0-10 completadas** (de un plan de 15): módulo puro `measure-calc.ts`, servicio `product-measures.ts`, API de
> productos con `measures`, modal "Medidas y precios", conversión a base en Compras
> (`createPurchase`/`aplicarEfectosCompra`), devoluciones en medida (T9) y UI de Compras con selector de medida + "precio incluye ISV" (T10). **Pendientes 11-15:** POS/facturación y cierre.

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Gestión de Productos** | Completo | 1 página (1537+ líneas) | 1 ruta | 1 tabla (`product`) | Supabase |
| **Medidas por producto** | Parcial (tareas 0-10 de 15 del plan, 21 Oct 2026) | Modal "Medidas y precios" + UI Compras selector de medida | En `products` (GET/POST/PATCH) | 1 tabla nueva (`product_measure`, migración 074 **APLICADA**) | Supabase |
| **Control de Stock** | Completo | En página | 1 ruta | 2 tablas | Supabase |
| **Movimientos de Inventario** | Completo | En página | 1 ruta | 2 tablas | Supabase |
| **Alertas de Stock** | Parcial | En página | 1 ruta | — | Cálculos en código |
| **Reportes de Inventario** | Completo | 1 componente | 1 ruta | — | Supabase |
| **Dashboard de Inventario** | Completo (28 Sept 2026) | 1 página + 1 componente | 1 ruta | — | Supabase |
| **Ubicación (física) de Producto** | Completo (28 Sept 2026) | En página + kardex + dashboard | 1 ruta | Columna `location` en `product` | Supabase |
| **Categorías y Paquetes** | Parcial | En página | 0 rutas | — | Supabase |
| **Importación Masiva** | Completo | En página (Productos, Ubicaciones, Almacenes, Traslados) | 4 rutas (`products/import`, `locations/import`, `warehouses/import`, `transfers/import`) | — | Excel/CSV |
| **Almacenes** | Completo (Etapa 2) | 1 tab + componente | 3 rutas (`warehouses`, `[warehouseId]`, `warehouses/import`) | 1 tabla (`warehouse`) | Supabase |
| **Traslados/Logística** | Completo (Etapa 2) | 1 tab + componente | 3 rutas (`transfers`, `[transferId]`, `transfers/import`) | 2 tablas (`inventory_transfer` + `_item`) | Supabase |
| **Listas de Precios** | Completo (21 Oct 2026) | 1 tab + `PriceListsManager` | 2 rutas (`price-lists`, `[id]`) | 2 tablas (`price_list`, `price_list_item`, migración 090 **APLICADA**) | Supabase |
| **Tracking por Lote** | No Iniciado | 0 | 0 | 0 | — |
| **Inventario Físico** | No Iniciado | 0 | 0 | 0 | — |
| **Valoración FIFO/Promedio** | No Iniciado | 0 | 0 | — | Columna existe sin lógica |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~70% | Etapa 2 (multi-almacén + traslados) completa; sin lotes, FIFO, inventario físico |
| Cobertura de Pruebas | Parcial | 103 tests node:test (21 Oct 2026): inventario **64/64** (rutas + stock-sale + `measure-calc` + `product-measures`) + warehouse **15/15** (cálculo, rutas, códigos ALM) + transfers-import **10/10** + compras **223/223** (incluye T7/T8/T9 de medidas) + billing **34/34** |
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
| `app/api/inventory/products/route.ts` | API CRUD de productos (GET adjunta `measures`; POST/PATCH aceptan `measures` + `price_includes_tax`) |
| `lib/purchase-db.ts` | Upsert best-effort de producto (stock/costo) desde Compras; convierte a unidad base con `unit_factor` |
| `lib/services/measure-calc.ts` | Módulo puro (0 imports): factor, unidades base, desglose de ISV y `validarMedidas` |
| `lib/services/product-measures.ts` | Servicio CRUD de `product_measure` (patrón `warehouse-service.ts`) |

#### Tablas de Base de Datos

- `product` (canónico, snake_case) — id, code, name, description, unit, unit_price, current_cost, tax_rate, is_service, is_active, current_stock, stock_quantity, min_stock, max_stock, category, product_type, valuation_method, expiration_date, location, tags, is_discount, discount_price, promotion_start_date, promotion_end_date, created_by, supplier_id, tenant_id, **sale_price** (071), **price_includes_tax** (074)
- `product_measure` (migración 074, **APLICADA**) — id, tenant_id, company_id, product_id, name, factor, cost, sale_price, price_includes_tax, is_active, created_at, updated_at. El **stock siempre se lleva en unidad base**; `factor` es cuántas unidades base contiene la medida

> Las tablas legacy `Product` (PascalCase) y `products` (plural) y la **vista** `Products` fueron eliminadas en la migración 008 (16 Sept 2026). Backups: `_backup_product_008`, `_backup_products_008`.

> **Esquema consolidado** ✅ — `product` es la única tabla de productos desde la migración 008 (16 Sept 2026).

#### Lo que Falta

- ~~Multi-almacén NO funcional~~ ✅ Resuelto: stock por almacén (kardex) y transferencias con flujo logístico (Etapa 2, 17 Sept 2026); inventario físico pendiente (Etapa 4)
- ~~Sin imágenes de producto~~ ✅ Resuelto: fotos en bucket `product-photos` + columna `product.image_url` (28 Sept 2026; ver "Fotos de Producto")
- ~~Sin conversión de unidades de medida~~ ✅ **Parcial (084, 19-21 Oct 2026)**: un producto puede tener medidas (Docena, Caja…) con costo y precio propios, stock en unidad base e "Incluye ISV" por medida. **074 APLICADA**. Tareas 0-10 de 15: falta POS/facturación y cierre (ver sección 19-21 Oct 2026)
- ~~Sin códigos de barras~~ ✅ Resuelto: EAN-13 + QR + foto del código impreso, editable y con columna en el import (077, 17 Oct 2026; ver "Codigo de barras en productos")

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

- ~~Sin exportación Excel~~ **Parcial (medido 18 Oct 2026):** Excel funciona para **importación** — las 4 pestañas (Productos, Ubicaciones, Almacenes, Traslados) descargan plantilla `.xlsx` y cargan archivos `.xlsx/.xls` (librería `xlsx`). Falta la exportación de **datos/reportes** a `.xlsx`: hoy es CSV solamente (`InventoryReports`, dashboard, variaciones, stock por almacén, traslados; Productos ni eso)
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

## Actualizacion 8 Oct 2026 — Aislamiento del stock, precio de venta y ganancia

Tres cambios de inventario, todos sobre la empresa correcta (`company_id`, no `tenant_id`).

### Stock al vender: aislado por empresa (071)

`lib/services/stock-sale.ts` (`checkSaleStock`/`applySaleStock`) filtraba el stock por
**`tenant_id`**, asi que test 1 y test 2 (ambas de `TEST1DS`) podian **vender y descontar
el producto de la hermana**. Ahora:

- `checkSaleStock(companyId, lines)` compara `p.company_id !== companyId`; el `UPDATE`
  del stock y el `inventory_movement` se filtran/escriben por **`company_id`** (ademas del
  `tenant_id`, que es `NOT NULL`). Las dos reversiones (stock cambiado / fallo del
  movimiento) tambien filtran por empresa.
- **Sin migracion:** `product` (15 filas) e `inventory_movement` (5) ya tenian
  `company_id` al 0% NULL. Pruebas: `tests/billing/stock-sale.test.mjs` (10 casos).

### Precio de venta (`sale_price`) en productos (075)

La tabla `product` no tenia columna de precio de venta, asi que la pantalla de
inventario no la mostraba. **Migracion `prisma/migrations/071_product_sale_price.sql`**
(**APLICADA y verificada 8 Oct 2026**, validada con `validar-040.mjs` -> OK):
`ALTER TABLE public.product ADD COLUMN IF NOT EXISTS sale_price bigint DEFAULT 0`
(preflight `to_regclass` + post-check que aborta si no quedo). **Verificado desde
fuera** (PostgREST + `service_role`, no por el "Success"): la columna existe
(`bigint`, default 0), las filas reales la traen y el round-trip `0 -> 54321 -> 0` es OK.

- **API** `app/api/inventory/products/route.ts`: GET mapea `sale_price`; PATCH/POST
  escriben `salePrice` -> `sale_price` (0 si viene vacio). Importes en **lempiras
  enteros** (BIGINT), igual que `unit_price`/`current_cost`.
- **Importador** `.../products/import/route.ts`: alias `sale_price`/`precio_de_venta`/
  `pvp` (sin colisionar con `precio_venta`, que es `unit_price`).
- **UI** `app/companies/[id]/inventory/page.tsx`: columna **"Precio Venta"** y campo en
  los modales de crear/editar.

> **Leccion del validador:** la version guardada de la 071 tenia los bloques `DO` **sin
> dollar-quoting** (`DO` + `BEGIN ... END ;`), daba `42601: syntax error at or near
> "BEGIN"`. El `validar-040.mjs` daba **verde en falso** porque su regla contaba solo
> `DO $$` (un `DO` pelado daba 0 y 0). Se endurecio para contar todo `\bDO\b` y exigir
> `$$` tras cada uno.

### Ganancia por producto calculada al introducir el precio (076)

`app/companies/[id]/inventory/page.tsx`, **solo UI, sin migracion** (ya existen
`sale_price` y `current_cost`). Ganancia = `precio_de_venta - costo_actual`, margen =
`ganancia / precio_de_venta`.

- Helper puro `calcularGanancia(precioVenta, costo)` -> `{ ganancia, margen }`.
- **Columna "Ganancia"** en la tabla (entre "Precio Venta" y "Valor Total"), verde si
  es >= 0 y rojo si es negativa (venta por debajo del costo).
- **Vista previa en vivo** en los modales de crear y editar: badge "Ganancia por unidad
  L X (Y%)" que se recalcula al teclear el precio. En crear usa `currentCost ||
  unitPrice`; en editar, `currentCost || unitPrice`. Solo aparece si el precio > 0.

**Verificado:** `tsc --noEmit` **459** (0 nuevos), inventario **18/18 PASS**.
**Pendiente:** retest en navegador (ver la columna Ganancia y el calculo en vivo al
cambiar el precio). **Hallazgo adyacente (no tocado):** `lib/services/warehouse-service.ts`
tambien escribe `inventory_movement` con solo `tenant_id` (traslados) — mismo patron que
el de stock-sale, queda como pendiente.

## Actualizacion 17 Oct 2026 - Codigo de barras en productos (077)

Se agrega **codigo de barras** a los productos del inventario, en **los dos formatos**
a la vez: lineal (Code128) y QR. Decisiones del usuario: **campo editable con boton
"Generar"** y **foto opcional** ademas de generar.

### Dos formas de tener codigo, y la foto manda

1. **Generarlo:** el boton "Generar" crea un **EAN-13 valido** (`740` + 9 digitos +
   digito verificador, `740` es el prefijo de Honduras) que **no este ya usado en la
   misma empresa**. Se compara contra los codigos ya cargados de la empresa (en editar
   se excluye el propio producto), sin refetch.
2. **Escribirlo a mano:** el campo es editable, asi que sirve para teclear el codigo que
   el producto ya tenga (EAN, codigo del proveedor, texto libre). Lo que se teclea es lo
   que se codifica; no hay que respetar EAN-13.

La **vista previa se recalcula al teclear** y muestra los dos formatos juntos. En la
tabla, el boton de la columna **"Cod. Barras"** abre un dialogo con el lineal, el QR,
el valor y la foto si existe.

La **foto de un codigo ya impreso** (subida desde el modal) **tiene prioridad de
visualizacion**: si hay foto, la tabla muestra la foto; si no, el icono/generado. Los
dos conviven en la misma fila (`barcode` + `barcode_image_url`), no son exclusivos.

### Donde vive cada cosa

| Pieza | Archivo |
|---|---|
| Render lineal + QR | `components/inventory/BarcodeDisplay.tsx` |
| Subida de la foto | `components/inventory/BarcodePhotoUploader.tsx` |
| API de la foto (POST/DELETE) | `app/api/inventory/products/barcode-image/route.ts` |
| Escritura del valor | `app/api/inventory/products/route.ts` (PATCH/POST) |
| Import CSV (columna `barcode`) | `app/api/inventory/products/import/route.ts` |
| Columna, modales, dialogo, "Generar" | `app/companies/[id]/inventory/page.tsx` |
| Columnas nuevas | `prisma/migrations/072_product_barcode.sql` |

La foto se sube al bucket **`product-photos`** con prefijo `${tenantId}/barcodes/...`
**resuelto en el servidor** (el cliente no decide la ruta), y el borrado exige que el
`path` empiece por ese prefijo, asi que no puede borrar objetos de otro sitio.

### Pendiente

~~**Aplicar `prisma/migrations/072_product_barcode.sql` en el SQL Editor**~~ (anade
`barcode` y `barcode_image_url` a `product`; validada con
`node scripts/validar-040.mjs` -> OK). **APLICADA y verificada desde fuera el
18 Oct 2026** (PostgREST + `service_role`, no por el "Success" del SQL Editor):
`product.barcode` y `product.barcode_image_url` existen en el OpenAPI como `string`
(junto a `sale_price` integer e `image_url` string). Queda el retest en navegador.

**No se puso UNIQUE sobre `barcode`**: la unica unica es la del generador, resuelta en
codigo dentro de la empresa (dos empresas distintas pueden compartir un mismo codigo).
Misma regla que la de Proveedores.

**Verificado:** `tsc --noEmit` **459** (0 errores nuevos), inventario **18/18 PASS**,
compras **183/183 PASS**.

> **Incidente de entorno (17 Oct 2026), y su leccion:** el `npm install` de jsbarcode
> murio por timeout a mitad de reify y dejo `node_modules` a medias: **40 paquetes
> perdieron sus `.d.ts`** (`typescript`, `next`, `class-variance-authority`,
> `@supabase/ssr`, `jspdf`...), y `tsc --noEmit` salto de **459 a 2388** (un alud de
> TS2322 en todos los `<Button variant="...">`: sin tipos de `cva` el `variant` deja de
> inferirse). **Los `.js` sobrevivieron, asi que las pruebas seguian en VERDE** (18/18
> y 183/183): un `node_modules` roto puede pasar la suite igualmente; **el typecheck fue
> el unico que lo delató**. Reparado sin tocar versiones ni lock: por cada paquete cuyo
> campo `types`/`typings` del `package.json` apuntaba a un archivo inexistente en disco,
> `npm pack <pkg>@<version>` (**no dispara resolucion de arbol**, a diferencia de
> `npm install`) + `tar -xzf` + `robocopy` -> 38 paquetes reparados, 0 danados, y el
> typecheck volvio a 459 exacto. Cuando `npm install` no termina, `npm pack` es la via
> quirurgica.

## Actualizacion 18 Oct 2026 — Codigos por empresa (079-081) e importacion visible (082)

Cuatro entregas sobre el modulo de inventario, todas por `company_id`. El baseline de
typecheck bajo de **459 a 456** (el trabajo de inventario arreglo 3 errores preexistentes
en ficheros que toco).

### Codigos de ubicaciones UB-### por empresa (079)

- **`lib/services/location-service.ts`**: `proximoNumeroCodigoUbicacion(companyId, tenantId)`
  calcula el maximo de los codigos `UB-\d+` de **esa empresa** (`.eq('company_id')`; los
  legacy `PRINCIPAL` y las filas sin empresa no cuentan). `createLocation` genera
  `UB-${padStart(3,'0')}` si no viene codigo explicito; si viene, se preserva.
- **UI** (`components/inventory/LocationsManager.tsx`): en crear, el campo Codigo va
  `disabled` con placeholder `"Se generara automaticamente (UB-001, UB-002...)"`; en
  editar queda habilitado (se puede corregir un codigo).
- **Import** (`.../inventory/locations/import/route.ts`): las filas sin `code` completan
  la serie con la misma funcion (`let proximoCodigo = await proximoNumeroCodigoUbicacion(...)`).

### Codigos de almacenes ALM-### por empresa (080)

Mismo patron que 079, replicado en `lib/services/warehouse-service.ts`
(`proximoNumeroCodigoAlmacen`; serie `ALM-\d+` de la empresa, sin contar `company_id`
NULL ni legacy `PRINCIPAL`):

- `createWarehouse` acepta `code?: string`; vacio -> `ALM-###`, explicito -> se respeta
  (mayusculas). Desaparecio el `throw 'code es requerido'`.
- **Import de almacenes**: cabecera solo exige `name`; `codePropio` opcional (dedupe por
  empresa y entre filas); sin codigo -> `ALM-###` de la serie.
- **UI** (`WarehousesManager.tsx`): campo Codigo `disabled` en crear (placeholder
  "Se generara automaticamente (ALM-001, ALM-002...)"); plantilla Excel/CSV sin el
  antiguo `PRINCIPAL`.
- **Tests**: `tests/warehouse/` sumo `warehouse-codes.test.mjs` (6 casos: serie continua,
  serie por empresa, `PRINCIPAL`/NULL no cuentan, codigo explicito se respeta, filtro
  por empresa presente, `createWarehouse` sin `name` -> 400). Soporte fake: tabla
  `warehouse` en `tests/inventory/fake-companies.mjs`.

### Reparacion del 500 al crear almacen: el UNIQUE real era por tenant (081)

Al crear un almacen salia **500 en el navegador**. Causa raiz medida contra la BD real:
existia un `UNIQUE (tenant_id, code)` en `warehouse` (`warehouse_tenant_code_unique`)
**que no esta en el repo**. La serie ALM-### es por empresa (decision 080), asi que test
2 generaba `ALM-001` y chocaba con el de test 1 (mismo tenant). El objeto de error de
PostgREST **no es `instanceof Error`** (es `{code, details, hint, message}` plano), por
eso la ruta respondia "Error interno" 500.

- **Migracion `prisma/migrations/073_warehouse_code_unique_per_company.sql`**
  (**APLICADA y verificada 17 Oct 2026** desde fuera, PostgREST + `service_role`):
  dropea el UNIQUE `(tenant_id, code)` por columnas (`pg_index`, patron 067) y crea
  `warehouse_company_id_code_key` sobre `(company_id, code)`. Sonda medida: `ALM-001`
  en test 2 -> **201** (antes el 500); repetir en test 2 -> `23505` del unique nuevo;
  `ALM-001` en test 1 -> `23505` (sigue impidiendo duplicado dentro de la empresa).
  Ojo: `product_location` **no tiene ningun unique** (medido), asi que la serie UB-###
  no necesita migracion.
- **`warehouse-service.ts`**: `createWarehouse` traduce el `23505` a `Error` con mensaje
  claro; `proximoNumeroCodigoAlmacen` ya no ignora el error de la query.
- **Ruta `warehouses/route.ts`**: el duplicado responde **409**, no 500.
- **Tests**: caso "POST 409 si el codigo ya existe" en `tests/warehouse/warehouse-routes.test.mjs`.

> Ojo con la numeracion: la **migracion 073** es esta (`073_warehouse_code_unique_per_company.sql`);
> el "073" que cita el reporte de Compras (§6.16) es un numero de entrada del diario, no
> una migracion. Son dos series distintas.

### Importacion visible en Productos y Traslados + import de traslados (082)

Los botones de importacion (Subir Archivo / Plantilla Excel / Plantilla CSV) estaban
escondidos en el desplegable "Menu"; ahora estan **visibles, igual que en Almacenes**,
en las pestanas Productos y Traslados de `/companies/[id]/inventory`:

- **Productos**: botones en el CardHeader de "Inventario de Productos"
  (`app/companies/[id]/inventory/page.tsx`); el modal y los handlers ya existian.
- **Traslados — UI** (`TransfersManager.tsx`): botones en el encabezado (el de exportar
  CSV se renombro **"Exportar CSV"** para no confundirlo con la plantilla), modal de
  import, plantilla `plantilla_traslados.xlsx|csv`
  (`transfer_number, origin, destination, date, product_code, quantity, carrier,
  guide_number, notes`) y auto-cierre del modal tras 1200 ms.
- **Ruta NUEVA** `.../inventory/transfers/import/route.ts`: requiere
  `origin/destination/product_code/quantity`; almacenes por codigo ALM-### o nombre
  (case-insensitive, solo activos, origen != destino) y productos por codigo, ambos
  filtrados por empresa. `transfer_number` **SOLO agrupa** (vacio = un traslado por
  fila); mismo grupo exige mismo origen/destino/fecha; items repetidos se fusionan;
  errores `{row, message}` limitados a 20; cada grupo se crea con `createTransfer`
  (quedan `pending`).
- **Bug destapado por el primer test y corregido**: el check de "mismo grupo" comparaba
  el **texto crudo** de las celdas (`ALM-001` vs `Bodega Uno`), asi que el mismo almacen
  referenciado por codigo en una fila y por nombre en otra se rechazaba como mismatch.
  Ahora compara los **ids resueltos** (`originId`/`destId`).
- **Suite nueva `tests/transfers-import/` (10/10)**: loader propio que mockea
  `warehouse-service` y `server-lazy` (→ `fake-db.mjs` con fixtures de aislamiento:
  almacen inactivo, duplicado en la otra empresa, producto ajeno); `tenant-resolver` y
  `company-scope` van al fichero REAL.

**Verificado (18 Oct 2026, re-ejecutado):** inventario **29/29 PASS**, warehouse
**15/15 PASS**, transfers-import **10/10 PASS**, compras **183/183 PASS** (sin
regresion), `tsc --noEmit` **456** (= baseline). **072 APLICADA** (medida el 18 Oct
contra el OpenAPI de PostgREST: `barcode`/`barcode_image_url` en `product`).
**Pendiente:** retest en navegador (botones Subir Archivo en Productos y Traslados;
Nuevo Almacen sin codigo -> `ALM-001`; crear `ALM-001` repetido -> 409).

## Actualización 19-21 Oct 2026 — Conversión de unidades de medida (084, tareas 0-10 de 15)

Plan `docs/superpowers/plans/2026-10-18-conversion-unidades-medida.md`. Objetivo: que un
producto pueda venderse/comprarse en varias medidas (unidad, docena, caja) con **costo y
precio de venta propios por medida**, con el **stock siempre en unidad base**, y con la
conversión correcta en Compras y Facturación (incluido si el precio **incluye ISV** o hay
que sumarlo). Rama `feat/medidas-producto`. **Estado real: tareas 0-10 completadas; 11-15
pendientes.** **Migración `074` APLICADA** (21 Oct 2026).

### Migración 074 — `prisma/migrations/074_product_measures.sql` (**APLICADA**)

- Tabla **`product_measure`** (12 columnas): `product_id uuid` FK a `product(id)` ON DELETE
  CASCADE, `name`, `factor integer` (>= 1, CHECK **en la base**), `cost numeric`,
  `sale_price bigint`, `price_includes_tax boolean`, `is_active`, timestamps. UNIQUE
  `(company_id, product_id, lower(name))` (la misma medida en dos empresas es legítima;
  dentro de una empresa no) + índice `(company_id, product_id)`.
- `product.price_includes_tax boolean DEFAULT false`.
- `unit text` + `unit_factor integer DEFAULT 1` en `PurchaseItem`, `InvoiceItem` y
  `PurchaseReturnItem` (6 columnas; snapshot de en qué medida se compró/vendió).
- Sin GRANT (regla 062). Idempotente con preflight/post-check; el único se localiza por
  **columnas** (`pg_get_indexdef(...,n,true)` + `btrim(...,'"')`). `validar-040.mjs` -> OK.
- **Aplicada** en SQL Editor (21 Oct 2026), verificada por OpenAPI.

### Módulo puro `lib/services/measure-calc.ts` (0 imports)

`redondear`, `factorValido` (laxo: vacío/0 -> 1), `exigirFactor` (throw si no es entero >= 1),
`unidadesBase` (throw si la base no da entero > 0), `desglosarImpuesto` (si `incluye`, saca el
ISV: `base = precio/(1+tasa)`; si no, lo suma) y `precioNeto`. **Regla:** `base = factor ×
cantidad`. `validarMedidas` vive aquí (no en el servicio) por seguridad: la página de
inventario es `'use client'` e importar el módulo servidor metería la
`SUPABASE_SERVICE_ROLE_KEY` en el bundle del navegador.

### Servicio `lib/services/product-measures.ts`

CRUD de `product_measure` por producto (patrón `warehouse-service.ts`: `getSupabaseServer()`
+ `resolveTenant`), con variantes `...Con(supabase, empresa, ...)`. `medidasDeProductos`
**degrada a `Map` vacío** si falta la 074 (el producto se sigue vendiendo en unidad base);
la escritura lanza error claro de "migración pendiente". Aísla por `.eq('company_id')`.

### API de productos (`app/api/inventory/products/route.ts`)

GET adjunta `measures` en un solo viaje; POST/PATCH aceptan `measures` + `price_includes_tax`
(PATCH reemplaza medidas solo si vienen); POST borra el producto si falla el alta de medidas.
Validación de medida inválida -> **400**; GET sin empresa -> `measures: []` con cero consultas.

### UI — modal "Medidas y precios" (`app/companies/[id]/inventory/page.tsx`)

Tabla Medida / Unidades por medida / Costo / Precio de venta / **Incluye ISV** (checkbox por
fila), con el equivalente por unidad bajo cada precio (`= L 9.00 por Unidad`). Columna
**"Incluye ISV"** en la tabla de productos y descomposición del stock con las medidas
(`104 Unidad (2 Caja + 4)`). El atajo Docena/Caja es **solo sugerencia**: no se persiste si
el usuario no lo toca.

### Compras — stock y costo en unidad base (`lib/purchase-db.ts`)

- **T7** `createPurchase`/`updatePurchase` persisten `unit`/`unit_factor` y validan el
  factor **antes** de escribir (un factor inválido ya no deja compra huérfana/sin líneas).
- **T8** `aplicarEfectosCompra` (con la compra **aprobada**): **dos pasadas** (normaliza
  todos los ítems antes de escribir; si uno lanza, el stock de ninguno cambia). El factor e
  `incluyeIsv` salen del **maestro** (`medidasDeProductosCon`), no de la línea (la 074 no
  añade `price_includes_tax` a `PurchaseItem`). `current_stock` sube `cantidad × factor` y
  `current_cost = round(precioNeto(...)/factor)` (neto con 2 decimales, entero al final).
  La compra **no** escribe `inventory_movement` (mueve stock por `current_stock`).
  **Fail-closed** (`b177f82`): si falla la lectura del producto existente se lanza, en vez
  de crear un duplicado en silencio (caso de la 074 sin aplicar, `42703`).
- **T9** `purchase-returns-db.ts`: devoluciones restan/repone stock en **unidad base** (`cantidadBase = unidadesBase(cantidad, exigirFactor(...))`), guardan `unit`/`unit_factor` en `PurchaseReturnItem`, `deletePurchaseReturn` usa `factorValido` para devoluciones pre-074.
- **T10** UI de Compras (`app/companies/[id]/purchases/page.tsx`): selector de medida por línea (Unidad/base o medida del maestro), precarga `cost` si vacío, checkbox **"El precio ya incluye ISV"**, etiqueta `Cantidad (Unidad/Medida)` y `Unidades por Medida`, guarda `unit_factor`/`price_includes_tax`/`product_id`. `handleAddItem` calcula subtotal con la medida correcta.

**Verificado (21 Oct 2026):** `tsc --noEmit` **454**; inventario **64/64**,
warehouse **15/15**, compras **223/223**, billing **34/34**, transfers-import **10/10**
(todas 0 fail); `validar-040.mjs 074` **OK**.
**Pendiente:** retests en navegador (POS/facturación T11-T13, cierre T14-T15). T9 y T10 completados.
