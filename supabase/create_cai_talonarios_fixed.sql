-- ========================================
-- VERSIÓN CORREGIDA - CREAR TABLAS CAI Y TALONARIOS
-- ========================================

-- Primero eliminar tablas si existen para recrearlas correctamente
DROP TABLE IF EXISTS talonarios CASCADE;
DROP TABLE IF EXISTS cai CASCADE;

-- 1. Crear tabla cai con estructura correcta
CREATE TABLE cai (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cai_number VARCHAR(50) NOT NULL UNIQUE,
    company_id VARCHAR(255) NOT NULL,
    fecha_asignacion DATE NOT NULL,
    fecha_limite_emision DATE NOT NULL,
    rango_inicial INTEGER NOT NULL,
    rango_final INTEGER NOT NULL,
    cantidad_recibos INTEGER NOT NULL,
    recibos_utilizados INTEGER DEFAULT 0,
    recibos_disponibles INTEGER NOT NULL,
    estado VARCHAR(20) DEFAULT 'activo',
    current_correlative INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Crear tabla talonarios con estructura correcta
CREATE TABLE talonarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cai_id UUID NOT NULL REFERENCES cai(id) ON DELETE CASCADE,
    company_id VARCHAR(255) NOT NULL,
    numero_talonario VARCHAR(50) NOT NULL UNIQUE,
    fecha_solicitud DATE NOT NULL,
    fecha_vencimiento DATE NOT NULL,
    cantidad_recibos INTEGER NOT NULL,
    recibos_utilizados INTEGER DEFAULT 0,
    recibos_disponibles INTEGER NOT NULL,
    estado VARCHAR(20) DEFAULT 'activo',
    current_correlative INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Deshabilitar RLS para permitir acceso temporal
ALTER TABLE cai DISABLE ROW LEVEL SECURITY;
ALTER TABLE talonarios DISABLE ROW LEVEL SECURITY;

-- 4. Insertar datos de prueba para la empresa DENTALWD
INSERT INTO cai (cai_number, company_id, fecha_asignacion, fecha_limite_emision, rango_inicial, rango_final, cantidad_recibos, recibos_disponibles, estado, current_correlative)
VALUES 
    ('CAI-TEST-001', 'DENTALWD', '2024-01-01', '2024-12-31', 1, 1000, 1000, 1000, 'activo', 1),
    ('CAI-TEST-002', 'DENTALWD', '2024-01-01', '2024-12-31', 1001, 2000, 1000, 1000, 'activo', 1);

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
WHERE c.company_id = 'DENTALWD';

-- 5. Verificación de tablas creadas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('cai', 'talonarios')
ORDER BY tablename;

-- 6. Verificación de estructura de tabla cai
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns 
WHERE table_schema = 'public' 
    AND table_name = 'cai'
ORDER BY ordinal_position;

-- 7. Conteo de registros
SELECT 'cai' as table_name, COUNT(*) as record_count FROM cai
UNION ALL
SELECT 'talonarios', COUNT(*) FROM talonarios
ORDER BY table_name;
