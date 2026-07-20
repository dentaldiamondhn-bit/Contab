-- ========================================
-- PASO 2: INSERTAR DATOS DE PRUEBA
-- ========================================

-- 5. Insertar datos de prueba para la empresa DENTALWD
INSERT INTO cai (cai_number, company_id, fecha_asignacion, fecha_limite_emision, rango_inicial, rango_final, cantidad_recibos, recibos_disponibles, estado, current_correlative)
VALUES 
    ('CAI-TEST-001', 'DENTALWD', '2024-01-01', '2024-12-31', 1, 1000, 1000, 1000, 'activo', 1),
    ('CAI-TEST-002', 'DENTALWD', '2024-01-01', '2024-12-31', 1001, 2000, 1000, 1000, 'activo', 1)
ON CONFLICT (cai_number) DO NOTHING;

INSERT INTO talonarios (cai_id, company_id, numero_talonario, fecha_solicitud, fecha_vencimiento, cantidad_recibos, recibos_disponibles, estado, current_correlative)
SELECT 
    c.id,
    'DENTALWD',
    'TAL-' || EXTRACT(YEAR FROM NOW()) || '-' || ROW_NUMBER() OVER (ORDER BY c.cai_number),
    CURRENT_DATE,
    CURRENT_DATE + INTERVAL '1 year',
    100,
    100,
    'activo',
    1
FROM cai c 
WHERE c.company_id = 'DENTALWD'
ON CONFLICT (numero_talonario) DO NOTHING;

-- 6. Conteo de registros
SELECT 'cai' as table_name, COUNT(*) as record_count FROM cai
UNION ALL
SELECT 'talonarios', COUNT(*) FROM talonarios
ORDER BY table_name;
