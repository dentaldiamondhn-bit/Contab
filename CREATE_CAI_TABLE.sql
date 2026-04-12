-- Crear tabla de Autorizaciones CAI
CREATE TABLE IF NOT EXISTS cai_authorizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    codigo VARCHAR(255) NOT NULL,
    tipo_documento VARCHAR(100) NOT NULL,
    rango_inicial VARCHAR(50) NOT NULL,
    rango_final VARCHAR(50) NOT NULL,
    fecha_limite DATE NOT NULL,
    estado VARCHAR(20) DEFAULT 'activo',
    current_number INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Crear índice para búsquedas por compañía
CREATE INDEX IF NOT EXISTS idx_cai_authorizations_company_id ON cai_authorizations(company_id);

-- Comentario de la tabla
COMMENT ON TABLE cai_authorizations IS 'Autorizaciones CAI para facturación electrónica SAR';
