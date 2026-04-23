# Reporte de Archivos Duplicados en migrations/

## Archivos Identificados como Duplicados

### 1. Correcciones de isActive (4 archivos duplicados)
Todos estos archivos hacen lo mismo: renombrar `isactive` a `isActive` en la tabla Product.

- ❌ `FINAL_ISACTIVE_FIX.sql` - Renombra columna isactive a isActive
- ❌ `QUICK_FIX_ISACTIVE.sql` - Renombra y agrega si no existe
- ❌ `SIMPLE_ISACTIVE_FIX.sql` - Renombra con manejo de errores
- ❌ `SAFE_UPDATE_ISACTIVE.sql` - Renombra con verificación paso a paso

**Recomendación**: Mantener solo `SAFE_UPDATE_ISACTIVE.sql` (el más completo) y eliminar los otros 3.

---

### 2. Tablas Customer (3 versiones)
Archivos con versiones diferentes de la tabla Customer.

- ✅ `CUSTOMER_TABLE_WORKING.sql` - Versión compatible con estructura existente (MANTENER)
- ❌ `CUSTOMER_TABLE.sql` - Versión básica obsoleta
- ❌ `CUSTOMER_TABLE_UPDATED.sql` - Versión con campos adicionales (integrar en WORKING)

**Recomendación**: Mantener `CUSTOMER_TABLE_WORKING.sql`, eliminar los otros 2.

---

### 3. Actualización de Stock (2 archivos idénticos)
Archivos idénticos que actualizan stock basado en movimientos.

- ❌ `UPDATE_STOCK_FROM_MOVEMENTS.sql` - Original
- ❌ `UPDATE_STOCK_FROM_MOVEMENTS_FIXED.sql` - Duplicado idéntico

**Recomendación**: Mantener solo `UPDATE_STOCK_FROM_MOVEMENTS.sql` y eliminar el duplicado.

---

### 4. Correcciones de Columnas FIX (7 archivos similares)
Archivos que corrigen nombres de columnas.

- ❌ `FIX_COLUMNS_SAFE.sql` - Corrección segura de columnas
- ❌ `FIX_COLUMN_CASE.sql` - Corrección de mayúsculas/minúsculas
- ❌ `FIX_COLUMN_NAMES.sql` - Corrección de nombres
- ❌ `FIX_ONLY_COLUMNS.sql` - Corrección específica
- ❌ `FIX_DATA_TYPES.sql` - Corrección de tipos de datos
- ❌ `FIX_INVENTORY_NAMES.sql` - Corrección de nombres en inventario

**Recomendación**: Revisar cuál es el más actual y consolidar en uno solo.

---

### 5. Correcciones RLS (5 archivos similares)
Archivos que corrigen políticas de Row Level Security.

- ❌ `FIX_RLS_CUSTOMER_RETENTIONS.sql` - RLS para customer retentions
- ❌ `FIX_RLS_FOR_CLERK.sql` - RLS para Clerk
- ❌ `FIX_RLS_PERMISSIVE.sql` - RLS permisivo
- ❌ `FIX_RLS_POLICIES.sql` - Corrección de políticas
- ❌ `FIX_RLS_SAFE.sql` - RLS seguro

**Recomendación**: Consolidar en un solo archivo `FIX_RLS_CONSOLIDATED.sql`.

---

### 6. Verificaciones (4 archivos similares)
Archivos que verifican estructura de columnas.

- ❌ `CHECK_EXISTING_COLUMNS.sql` - Verifica columnas existentes
- ❌ `VERIFY_COLUMNS.sql` - Verifica columnas
- ❌ `VERIFY_COLUMN_NAMES.sql` - Verifica nombres de columnas
- ❌ `VERIFY_MOVEMENT_COLUMNS.sql` - Verifica columnas de movimientos

**Recomendación**: Consolidar en `VERIFY_STRUCTURE.sql`.

---

### 7. Setup Completos (3 archivos grandes)
Archivos que realizan setup completo del sistema.

- ❌ `COMPLETE_SYSTEM_SETUP.sql` - Setup completo
- ❌ `SUPABASE_COMPLETE.sql` - Setup completo de Supabase
- ❌ `PACKAGES_SYSTEM_COMPLETE.sql` - Setup completo de packages

**Recomendación**: Mantener solo el más actualizado y consolidar funcionalidad.

---

### 8. Correcciones Customer (3 archivos)
Archivos que corrigen tabla Customer.

- ❌ `FIX_CUSTOMER_COLUMNS.sql` - Corrige columnas de Customer
- ❌ `FIX_CUSTOMER_TABLE.sql` - Corrige tabla Customer
- ❌ `FIX_CUSTOMER_RETENTIONS_COLUMNS.sql` - Corrige retenciones

**Recomendación**: Consolidar en `FIX_CUSTOMER_CONSOLIDATED.sql`.

---

### 9. Correcciones Taxes (3 archivos)
Archivos que corrigen tabla Taxes.

- ❌ `FIX_TAXES_ISACTIVE_COLUMN.sql` - Corrige isActive en Taxes
- ❌ `FIX_TAXES_RETENTIONS_COLUMNS.sql` - Corrige retenciones en Taxes
- ❌ `FIX_TAXES_RLS_POLICY.sql` - Corrige RLS en Taxes

**Recomendación**: Consolidar en `FIX_TAXES_CONSOLIDATED.sql`.

---

## Resumen de Limpieza

### Archivos a Eliminar (Duplicados Confirmados)
1. `FINAL_ISACTIVE_FIX.sql`
2. `QUICK_FIX_ISACTIVE.sql`
3. `SIMPLE_ISACTIVE_FIX.sql`
4. `CUSTOMER_TABLE.sql`
5. `CUSTOMER_TABLE_UPDATED.sql`
6. `UPDATE_STOCK_FROM_MOVEMENTS_FIXED.sql`

### Archivos a Consolidar (Similar Functionality)
1. Archivos FIX_* - Consolidar en FIX_CONSOLIDATED.sql
2. Archivos FIX_RLS_* - Consolidar en FIX_RLS_CONSOLIDATED.sql
3. Archivos VERIFY_* - Consolidar en VERIFY_STRUCTURE.sql
4. Archivos SETUP_* - Revisar y mantener solo el más actual
5. Archivos FIX_CUSTOMER_* - Consolidar en FIX_CUSTOMER_CONSOLIDATED.sql
6. Archivos FIX_TAXES_* - Consolidar en FIX_TAXES_CONSOLIDATED.sql

---

## Archivos a Mantener (Necesarios)

### Scripts Específicos
- ✅ `ADD_DISCOUNT_TO_PRODUCTS.sql` - Agrega descuento a productos
- ✅ `ADD_EXPIRATION_DATE.sql` - Agrega fecha de expiración
- ✅ `ADD_PROMOTION_FIELD.sql` - Agrega campo de promoción
- ✅ `CREATE_CAI_TABLE.sql` - Crea tabla CAI
- ✅ `CREATE_INVENTORY_TABLES.sql` - Crea tablas de inventario
- ✅ `INSERT_SAMPLE_DATA.sql` - Inserta datos de prueba
- ✅ `REMOVE_DUPLICATE_COLUMN.sql` - Elimina columnas duplicadas
- ✅ `RENAME_ISACTIVE_COLUMN.sql` - Renombra columna isActive
- ✅ `RE_ENABLE_RLS.sql` - Rehabilita RLS

### Scripts de Verificación
- ✅ `check_account_structure.sql` - Verifica estructura de cuentas
- ✅ `check_constraints.sql` - Verifica restricciones
- ✅ `check_user_structure.sql` - Verifica estructura de usuarios
- ✅ `debug_account_columns.sql` - Debug de columnas de cuentas

### Scripts de Setup
- ✅ `LEGAL_REVISIONES_PROCEDURES_V2.sql` - Procedimientos legales
- ✅ `LEGAL_REVISIONES_SCHEMA.sql` - Schema legal
- ✅ `LOGIN_SETUP.sql` - Setup de login
- ✅ `ONBOARDING_SETUP.sql` - Setup de onboarding

---

## Recomendación de Acción

### Paso 1: Eliminar duplicados confirmados ✅ COMPLETADO
```bash
cd scripts/migrations
rm FINAL_ISACTIVE_FIX.sql ✅ ELIMINADO
rm QUICK_FIX_ISACTIVE.sql ✅ ELIMINADO
rm SIMPLE_ISACTIVE_FIX.sql ✅ ELIMINADO
rm CUSTOMER_TABLE.sql ✅ ELIMINADO
rm CUSTOMER_TABLE_UPDATED.sql ✅ ELIMINADO
rm UPDATE_STOCK_FROM_MOVEMENTS_FIXED.sql ✅ ELIMINADO
```

### Paso 2: Crear archivos consolidados
Crear archivos consolidados para grupos similares y eliminar los originales.

### Paso 3: Reorganizar estructura
Organizar los archivos restantes en carpetas lógicas:
- `setup/` - Scripts de setup inicial
- `fixes/` - Correcciones y actualizaciones
- `verification/` - Scripts de verificación
- `data/` - Scripts de datos de muestra

---

## Total de Archivos

**Antes de la limpieza**: 64 archivos
**Duplicados eliminados**: 6 archivos
**Archivos restantes**: 58 archivos
**Reducción actual**: ~9% de archivos
**Reducción potencial consolidando**: ~40% adicional

---

## Nota

Este reporte se basa en el análisis de nombres y contenido de los archivos. Se recomienda revisar el contenido completo de cada archivo antes de eliminar para asegurar que no se pierda funcionalidad importante.
