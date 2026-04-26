-- Verificar tenant DENTAL
SELECT 
    id,
    businessname,
    businessemail,
    tenant_code,
    isactive
FROM "Tenant"
WHERE tenant_code = 'DENTAL';

-- Verificar usuario dentaldiamondhn@gmail.com
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.tenant_id,
    u.is_active,
    t.tenant_code,
    t.businessname
FROM users u
LEFT JOIN "Tenant" t ON u.tenant_id = t.id
WHERE u.email = 'dentaldiamondhn@gmail.com';

-- Verificar todos los usuarios del tenant DENTAL
SELECT 
    u.id,
    u.email,
    u.first_name,
    u.last_name,
    u.role,
    u.is_active,
    u.created_at
FROM users u
LEFT JOIN "Tenant" t ON u.tenant_id = t.id
WHERE t.tenant_code = 'DENTAL'
ORDER BY u.created_at;
