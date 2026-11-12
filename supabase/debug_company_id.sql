-- Debug: Verificar IDs de empresas y CAIs
SELECT 
  c.id as company_id,
  c.name as company_name,
  c.tenant_id,
  ca.id as cai_id,
  ca.cai_number,
  ca.company_id as cai_company_id
FROM companies c
LEFT JOIN cai ca ON c.tenant_id = ca.company_id
WHERE c.tenant_id = 'DENTALWD' OR ca.company_id = 'DENTALWD';
