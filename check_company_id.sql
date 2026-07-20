-- Verificar el ID real de la empresa DENTALWD
SELECT id, name, tenant_id FROM companies WHERE tenant_id = 'DENTALWD' OR name LIKE '%DENTALWD%';
