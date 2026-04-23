-- Verificar constraints de la tabla Account
SELECT 
    tc.constraint_name,
    tc.constraint_type,
    kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'Account' 
    AND tc.table_schema = 'public'
ORDER BY tc.constraint_name;

-- Verificar datos existentes en Account
SELECT id, "name", code, type, "tenantId" 
FROM "Account" 
WHERE "name" = 'Caja y Bancos' OR "name" LIKE '%Caja%';
