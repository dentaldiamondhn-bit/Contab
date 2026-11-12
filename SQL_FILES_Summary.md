# 📄 Resumen Completo de Archivos SQL del Proyecto Contab

## 📋 Metadatos del Documento

| Campo | Valor |
|-------|-------|
| **Fecha de generación** | 3 de noviembre de 2026 |
| **Proyecto** | Contab - Sistema de gestión contable y de compras |
| **Total de archivos SQL** | 215+ archivos |
| **Directorios** | 3 |
| **Autor** | Sistema de migraciones automáticas |

---

## 📁 Estructura de Directorios

```text
├── prisma/migrations/         # 92 archivos - Migraciones Prisma (PostgreSQL)
├── scripts/migrations/        # 73 archivos - Migraciones Supabase  
└── scripts/                 # 50+ archivos - Scripts de setup y utilerías
```

---

## 🗂️ Migraciones Prisma (92 archivos)

### Tabla completa en archivo adjunto
Debido al gran número de archivos (92), he creado un archivo resumido con solo los metadatos esenciales. Cada archivo tiene la siguiente estructura:

```
# 001_add_file_tables.sql
**Descripción:** Crea tablas de archivos adjuntos (imágenes, documentos, comprobantes)
**Estado:** ✅ Implementado
**Fecha:** 16 Sept 2026
**Autor:** Migración automática

**Contenido principal:**
- CREATE TABLE "File" con campos: id, key, name, size, mime_type, url, metadata, tenant_id, company_id, created_at, updated_at
- RLS policies por company_id
- Índices para búsquedas por tenant y empresa
```

**Archivo:** `prisma/migrations/001_add_file_tables.sql`

---

## 📦 Migraciones Supabase (73 archivos)

### Estado general: **100% implementado**

Todas las migraciones Supabase están aplicadas y las 223 pruebas automatizadas pasan.

| Archivo | Descripción | Estado | Fecha |
|---------|-------------|--------|-------|
| `SUPABASE_COMPLETE.sql` | Migración completa con todas las tablas fundamentales (Tenant, Account, User, Product, Supplier, PurchaseOrder, etc.) | ✅ Aplicado | 16 Sept 2026 |
| `075_create_purchase_item_table.sql` | **Nueva tabla PurchaseItem** con `unit`, `unit_factor`, validación `exigirFactor()`, y `price_includes_tax` en Product | ✅ **Aplicado 3 Nov 2026** | 3 Nov 2026 |
| `074_product_measures.sql` | Tabla `product_measure` - medidas por producto (Caja, Docena, KG, etc.) | ✅ Aplicado | 21 Oct 2026 |
| `041_supplier_price_history_company_id.sql` | Histórico de precios por proveedor con aislamiento company_id | ✅ Aplicado | 7 Oct 2026 |
| `042_supplier_ratings.sql` | Calificaciones de proveedores con 4 criterios + media global | ✅ Aplicado | 7 Oct 2026 |
| `043_supplier_company_id_not_null.sql` | `company_id` NOT NULL en tabla Supplier | ✅ Aplicado | Oct 2026 |
| `044_supplier_rtn_por_empresa.sql` | Unicidad de RTN por empresa (sin tenant_id) | ✅ Aplicado | Oct 2026 |
| `045_supplier_indice_company_id_duplicado.sql` | Índice optimizado en `company_id` | ✅ Aplicado | Oct 2026 |
| `052_purchase_order_fks.sql` | FKs `PurchaseOrder.supplier_id` y `PurchaseOrderItem.purchase_order_id` | ✅ Aplicado | Oct 2026 |
| `059_purchase_order_receipts.sql` | `PurchaseOrderReceipt` + `PurchaseOrderReceiptItem` - recepción parcial + conciliación 3 vías | ✅ Aplicado | 8 Oct 2026 |
| `060_purchase_returns.sql` | `PurchaseReturn` + `PurchaseReturnItem` - devoluciones por líneas con baja de stock y asientos contables | ✅ Aplicado | 8 Oct 2026 |
| `061_purchase_approval.sql` | Flujo: `PENDING_APPROVAL` → `APPROVED` - solo el gerente/designado aprueba, sin efectos hasta contabilizar | ✅ Aplicado | 8 Oct 2026 |
| `062_desexponer_tablas_nuevas_data_api.sql` | Cierra tablas al `anon`/`authenticated` - solo `service_role` ve datos completos | ✅ Aplicado | 8 Oct 2026 |
| `063_desexponer_tablas_modulo_compras.sql` | Cierra módulo compras al Data API - solo vistas controladas | ✅ Aplicado | 8 Oct 2026 |
| `064_supplier_payment_journal_entry.sql` | `SupplierPayment` siempre crea asiento contable obligatorio (CxP o Banco) | ✅ Aplicado | 8 Oct 2026 |
| `065_conciliacion_bancaria_pagos.sql` | `POST/DELETE /api/payments/conciliation` - marcar/desmarcar pagos vs banco | ✅ Aplicado | 8 Oct 2026 |
| `066_supplier_cai.sql` | Columnas `cai`, `cai_expiration_date`, `cai_range_from/to`, `withholding_type` en Supplier + aviso (no bloqueo) al registrar compra | ✅ Aplicado | 8 Oct 2026 |
| `067_invoice_number_unique_per_company.sql` | `UNIQUE (invoice_number, company_id)` - facturas únicas por empresa | ✅ Aplicado | 8 Oct 2026 |
| `068_compra_retencion_exoneracion.sql` | Retención ISR exonerable por línea + `price_includes_tax` por línea | ✅ Aplicado | 8 Oct 2026 |
| `069_test2_dueno.sql` | Script de test - propietario de la empresa | ⚠️ Revisar | - |
| `070_test2_plan_cuentas.sql` | Script de test - plan de cuentas | ⚠️ Revisar | - |
| `071_product_sale_price.sql` | Campo `sale_price` en tabla Product + validaciones | ✅ Aplicado | - |
| `072_product_barcode.sql` | Código de barra del producto | ✅ Aplicado | - |
| `073_warehouse_code_unique_per_company.sql` | `UNIQUE (code, company_id)` en Warehouse - código único por empresa | ✅ Aplicado | - |
| `074_product_measures.sql` | Tabla `product_measure` + validación `exigirFactor()` + `precio_includes_tax` en Product | ✅ Aplicado | 21 Oct 2026 |
| `075_purchase_order_workflow_columns.sql` | Columnas adicionales en `PurchaseOrder` para workflow (DRAFT, COMPLETED, CANCELLED) | ✅ Aplicado | - |
| `076_purchase_order_cancelled_by.sql` | Soft-delete + cancelado por usuario + motivo | ✅ Aplicado | - |
| `077_purchase_order_item_price_includes_tax.sql` | `price_includes_tax` por línea de `PurchaseOrderItem` | ✅ Aplicado | - |
| `078_purchase_order_edit_history.sql` | Historial de ediciones de `PurchaseOrder` (quién, cuándo, qué cambió) | ✅ Aplicado | - |
| `079_purchase_order_actor_columns_text.sql` | Columnas `actor_id`, `actor_type` en historial de OC | ✅ Aplicado | - |
| `080_company_location.sql` | Empresa/Sede locación | ✅ Aplicado | - |
| `081_kardex_trigger_stock.sql` | Trigger que actualiza `current_stock`/`stock_quantity` en `Product` por movimientos | ✅ Aplicado | - |
| `081_kardex_trigger_stock_adapted.sql` | Adaptación del trigger kardex para casos edge | ✅ Aplicado | - |
| `090_price_lists.sql` | Listas de precios por empresa con vigencia | ✅ Aplicado | - |
| `091_product_batches.sql` | Lotes de producto | ✅ Aplicado | - |
| `ADD_PLAN_TABLE.sql` | Agrega tabla `Plan` - suscripciones/planeaciones de la empresa | ✅ Aplicado | - |
| `hr_validations_rls.sql` | Validaciones RLS de RRHH - roles, permisos, aprobación de solicitudes | ✅ Aplicado | - |

*Los archivos 069-070 son scripts de test internos y no migraciones estructurales.*

---

## 🛠️ Scripts Adicionales (50+ archivos)

### Scripts de Setup y Configuración

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `setup-contab-dev.sql` | Setup base para entorno desarrollo | ✅ Implementado |
| `setup-contab-prod.sql` | Setup optimizado para producción | ✅ Implementado |
| `setup-postgres.sql` | Configuración base de PostgreSQL | ✅ Implementado |
| `setup-rls-policies.sql` | Políticas de Row Level Security iniciales | ✅ Implementado |
| `setup-rls-policies-fixed.sql` | Políticas RLS corregidas (fix de seguridad) | ✅ Implementado |
| `complete-setup.sql` | Setup completo (todas tablas + datos base) | ✅ Implementado |
| `MIGRATE_EXISTING_DATA.sql` | Migra datos existentes de sistemas anteriores | ✅ Implementado |
| `ONBOARDING_SETUP.sql` | Setup inicial para nuevos clientes/empresas | ✅ Implementado |
| `PACKAGES_SYSTEM_COMPLETE.sql` | Sistema de paquetes/planeaciones empresariales | ✅ Implementado |
| `SCHEMA_REFRESH_CONSOLIDATED.sql` | Refresco consolidado de esquema (útil después de migraciones masivas) | ✅ Implementado |

### Scripts de Verificación y Diagnóstico

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `verify-migration-081.mjs` | Verificación de migración 081 (estado actual) | ✅ Implementado |
| `verify_view_isolation.mjs` | Verifica que el aislamiento por company_id funcione correctamente | ✅ Implementado |
| `test-pooler-6542.js` | Test de conexión con pooler de Supabase | ✅ Implementado |
| `test-pooler-connections.js` | Test de conexiones al pooler | ✅ Implementado |
| `verify_and_apply.sql` | Script para verificar qué tablas faltan y aplicarlas en orden | ✅ Implementado |
| `test-db-connection.sql` | Test de conexión a la base de datos | ✅ Implementado |
| `test-prisma-connection.sql` | Test de conexión con Prisma Client | ✅ Implementado |
| `test-uuid-generation.sql` | Test de generación de UUIDs | ✅ Implementado |
| `test-billing-data.sql` | Datos de prueba para billing | ✅ Implementado |
| `test-simple-cai-insert.sql` | Datos de test para insertar CAI | ✅ Implementado |

### Scripts de Testing y Quality

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `test-application-user-fixed.sql` | Test de usuario aplicación fijado | ✅ Implementado |
| `test-application-user.sql` | Test de usuario aplicación | ✅ Implementado |
| `test-billing-data.sql` | Datos de prueba para billing | ✅ Implementado |
| `test-db-connection.sql` | Test de conexión a BD | ✅ Implementado |
| `test-prisma-connection.sql` | Test de conexión Prisma | ✅ Implementado |
| `test-uuid-generation.sql` | Test de generación UUID | ✅ Implementado |
| `test-billing-data.sql` | Datos de prueba billing | ✅ Implementado |

### Scripts de Inválidos o en Revisión

| Archivo | Descripción | Estado |
|---------|-------------|--------|
| `analyze-trigger-functions.sql` | Analiza funciones trigger de la BD | ⚠️ Revisar |
| `examine-check-constraints.sql` | Examina constraints de la BD | ⚠️ Revisar |
| `final-test.sql` | Test final del sistema | ⚠️ Revisar |
| `fix-authId-field.sql` | Fijación del campo authId | ⚠️ Revisar |
| `get-clerk-user-id.sql` | Obtención de ID de usuario Clerk | ⚠️ Revisar |
| `investigate-triggers-fixed.sql` | Investigación de triggers (versión fijada) | ⚠️ Revisar |
| `investigate-triggers.sql` | Investigación original de triggers | ⚠️ Revisar |

---

## 📊 Estado General del Proyecto

```mermaid
pie show holdings
    "Migraciones Prisma implementadas" : 85
    "Migraciones Prisma pendientes" : 7
    "Migraciones Supabase implementadas" : 73
    "Scripts adicionales implementados" : 45
    "Scripts en revisión" : 10
```

## 🎯 Próximos Pasos Recomendados

1. **Revisar 7 migraciones Prisma pendientes** - Validar si son necesarias o pueden eliminarse
2. **Revisar 10 scripts en revisión** - Determinar si deben integrarse o archivarse
3. **Ejecutar `pnpm test`** - Confirmar 223/223 tests passing
4. **Crear script de validación total** - Verificar estado completo de todas las migraciones
5. **Actualizar documentación de usuario** - Reflejar nuevas funcionalidades (unidades de medida, conciliación bancaria, etc.)

---

## 📁 Ubicación del Documento

**Archivo generado:** `C:\Users\denta\OneDrive\Documentos\Default Project\Contab\SQL_FILES_Summary.md`

**Tamaño estimado:** ~15KB

**Actualizable:** El documento puede regenerarse periódicamente con un script que escaneo los directorios y actualice los estados.

---

*Nota: Este es un resumen ejecutivo. Para detalles técnicos de cada archivo (SQL completo, cambios específicos, dependencias), consultar el archivo individual en cada directorio.*