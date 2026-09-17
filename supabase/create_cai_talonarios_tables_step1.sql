-- ========================================
-- PASO 1: CREAR TABLAS CAI Y TALONARIOS
-- ========================================

-- 1. Crear tabla cai
CREATE TABLE IF NOT EXISTS cai (
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

-- 2. Crear tabla talonarios
CREATE TABLE IF NOT EXISTS talonarios (
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

-- 4. Verificación de tablas creadas
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
    AND tablename IN ('cai', 'talonarios')
ORDER BY tablename;
