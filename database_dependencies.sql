-- ========================================
-- VERIFICACIÓN DE DEPENDENCIAS
-- ========================================

-- Paso 1: Verificar qué objetos dependen de tenant_plan_statistics
SELECT 
    dependent_ns.nspname AS schema_name,
    dependent_ns.relname AS object_name,
    dependent_ns.relkind AS object_type,
    source_ns.nspname AS source_schema,
    source_ns.relname AS source_table
FROM pg_depend 
JOIN pg_class AS source_ns ON pg_depend.refobjid = source_ns.oid
JOIN pg_namespace ON pg_namespace.oid = source_ns.relnamespace
JOIN pg_class AS dependent_ns ON pg_depend.objid = dependent_ns.oid
JOIN pg_namespace AS dependent_ns_nsp ON dependent_ns_nsp.oid = dependent_ns.relnamespace
WHERE 
    source_ns.relname = 'tenant_plan_statistics'
    AND source_ns.nspname = 'public'
    AND dependent_ns_nsp.nspname = 'public'
ORDER BY dependent_ns.relkind, dependent_ns.relname;

-- Paso 2: Verificar definición actual de la vista tenant_plan_summary
SELECT 
    definition
FROM information_schema.views 
WHERE table_name = 'tenant_plan_summary' 
AND table_schema = 'public';

-- Paso 3: Opción 1: Eliminar con CASCADE (agresivo pero efectivo)
-- DROP TABLE tenant_plan_statistics CASCADE;

-- Paso 4: Opción 2: Eliminar dependencias manualmente (más seguro)
-- Primero eliminar la vista, luego la tabla
DROP VIEW IF EXISTS tenant_plan_summary;
DROP TABLE IF EXISTS tenant_plan_statistics;

-- Paso 5: Opción 3: Verificar si podemos recrear la vista después
-- CREATE TABLE tenant_plan_statistics (...);
-- CREATE OR REPLACE VIEW tenant_plan_summary AS (...);

-- Paso 6: Verificar estado final
SELECT 
    table_name,
    table_type
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('tenant_plan_statistics', 'tenant_plan_summary')
ORDER BY table_name;
