# Reporte de Estado y Plan de Ejecución: Inventario

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Gestión de Productos** | Completo | 1 página (1537+ líneas) | 1 ruta | 2 tablas (dual) | Supabase |
| **Control de Stock** | Completo | En página | 1 ruta | 2 tablas | Supabase |
| **Movimientos de Inventario** | Completo | En página | 1 ruta | 2 tablas | Supabase |
| **Alertas de Stock** | Parcial | En página | 1 ruta | — | Cálculos en código |
| **Reportes de Inventario** | Completo | 1 componente | 1 ruta | — | Supabase |
| **Categorías y Paquetes** | Parcial | En página | 0 rutas | — | Supabase |
| **Importación Masiva** | Completo | En página | — | — | Excel/CSV |
| **Almacenes** | Básico | 0 páginas | 1 ruta | 1 tabla | Supabase |
| **Tracking por Lote** | No Iniciado | 0 | 0 | 0 | — |
| **Inventario Físico** | No Iniciado | 0 | 0 | 0 | — |
| **Valoración FIFO/Promedio** | No Iniciado | 0 | 0 | — | Columna existe sin lógica |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~55% | CRUD y movimientos fuertes; sin multi-almacén, lotes, FIFO |
| Cobertura de Pruebas | 0% | No existen pruebas |
| Persistencia | ~60% | Dual schema (PascalCase + lowercase); sin consolidar |
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

#### Tablas de Base de Datos

- `Product` (PascalCase) — id, tenantid, sku, name, description, category, unit, cost, price, stock, minstock, maxstock, isActive, tags, expirationDate, discountPrice, isDiscount, promotionStartDate, promotionEndDate
- `product` (lowercase) — id, code, name, description, unit_price, current_cost, tax_rate, is_service, is_active, stock_quantity, min_stock, max_stock, category, product_type, valuation_method, tenant_id

#### Lo que Falta

- **Dual schema inconsistente**
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
| `scripts/migrations/CREATE_INVENTORY_TABLES.sql` | Trigger de auto-actualización de stock |

#### Tablas

- `InventoryMovement` (PascalCase) — id, tenantid, productid, type (IN/OUT/ADJUSTMENT), quantity, unitCost, totalCost, reference, notes
- `inventory_movement` (lowercase) — id, product_id, movement_type, quantity, unit_cost, total_cost, reference, description, warehouse_id, tenant_id

#### Funcionalidad

- Movimientos IN, OUT, AJUSTE con trigger automático de stock
- Integración con asientos contables
- Referencia y notas por movimiento

#### Lo que Falta

- Sin transferencias entre almacenes
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

#### Lo que Falta

- Sin exportación Excel
- Sin reporte de rotación por período
- Sin pronóstico de demanda

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | Dual schema de productos | Confusión, inconsistencia | Crítica |
| 2 | Sin multi-almacén funcional | Imposible para empresas con múltiples ubicaciones | Alta |
| 3 | Sin valoración FIFO/promedio | Costos de inventario inexactos | Alta |
| 4 | Sin inventario físico | Sin control real de stock | Alta |
| 5 | Sin tracking por lotes | Sin trazabilidad | Media |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Consolidación de Esquema

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | Consolidar esquemas de producto en uno solo | Migraciones SQL | Esquema único |
| 1.2 | Migrar datos entre esquemas | Script de migración | Datos migrados |
| 1.3 | Actualizar API y UI para esquema único | `inventory/page.tsx`, API routes | Código actualizado |

### Etapa 2: Multi-Almacén

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | UI de gestión de almacenes | `app/inventory/warehouses/page.tsx` | Página de almacenes |
| 2.2 | Transferencias entre almacenes | `components/inventory/TransferForm.tsx` | Formulario |
| 2.3 | Stock por almacén | `lib/services/warehouse-stock.ts` | Consulta por almacén |

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
| Etapa 1: Consolidación | 3 tareas | Alta | 2-3 semanas |
| Etapa 2: Multi-Almacén | 3 tareas | Alta | 2-3 semanas |
| Etapa 3: Valoración | 3 tareas | Alta | 3-4 semanas |
| Etapa 4: Físico/Lotes | 3 tareas | Media | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total** | **14 tareas** | — | **10-14 semanas** |
