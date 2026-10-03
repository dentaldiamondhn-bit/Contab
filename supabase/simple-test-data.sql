-- Script simplificado para insertar datos de prueba
-- Basado en la estructura real de la base de datos

-- 1. Insertar CAI de prueba usando tenant_id existente (1)
INSERT INTO "cai" (
    id,
    tenant_id,
    cai,
    start_number,
    end_number,
    current_number,
    issue_date,
    expiration_date,
    status,
    created_at,
    updated_at
) VALUES 
(
    '22302117-3ee7-4268-bd15-5ee3285813c1',
    '1',
    'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
    1,
    1000,
    1,
    '2026-04-08',
    '2027-04-08',
    'active',
    NOW(),
    NOW()
),
(
    '22302117-3ee7-4268-bd15-5ee3285813c2',
    '1',
    'B7E2-9F3C-5A8D-E1B4-6C7D-2F9A-8E3C',
    1001,
    2000,
    1001,
    '2026-04-08',
    '2027-04-08',
    'active',
    NOW(),
    NOW()
) ON CONFLICT (id) DO NOTHING;

-- 2. Verificar los CAIs insertados
SELECT 
    'CAIs de prueba:' as info,
    id,
    cai,
    start_number,
    end_number,
    current_number,
    issue_date,
    expiration_date,
    status,
    tenant_id
FROM "cai" 
WHERE cai LIKE 'TEST-CAI-%'
ORDER BY created_at DESC;

-- 3. Ver todos los CAIs del tenant_id = 1
SELECT 
    'Todos los CAIs del tenant:' as info,
    id,
    cai,
    start_number,
    end_number,
    current_number,
    status
FROM "cai" 
WHERE tenant_id = '1'
ORDER BY created_at DESC;

-- 4. Para limpiar los datos de prueba si es necesario:
-- DELETE FROM "cai" WHERE cai LIKE 'TEST-CAI-%';
