-- ========================================
-- ESQUEMA PARA CALENDARIO DE REVISIONES LEGALES
-- ========================================

-- 1. Tabla principal de revisiones legales
CREATE TABLE legal_revisiones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES "Tenant"(id),
    categoria VARCHAR(20) NOT NULL CHECK (categoria IN ('arrendamiento', 'seguro', 'licencia')),
    titulo VARCHAR(255) NOT NULL,
    descripcion TEXT,
    fecha_vencimiento DATE NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'proximo' CHECK (estado IN ('vigente', 'proximo', 'vencido')),
    monto DECIMAL(12,2),
    detalles JSONB,
    contacto JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    anio_fiscal INTEGER NOT NULL DEFAULT 2026,
    created_by TEXT REFERENCES "User"(id),
    updated_by TEXT REFERENCES "User"(id)
);

-- 2. Tabla para historial de cambios
CREATE TABLE legal_revisiones_historial (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES legal_revisiones(id),
    campo_modificado VARCHAR(50) NOT NULL,
    valor_anterior JSONB,
    valor_nuevo JSONB,
    fecha_cambio TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    usuario_id TEXT REFERENCES "User"(id),
    motivo_cambio TEXT
);

-- 3. Tabla para documentos adjuntos
CREATE TABLE legal_revisiones_documentos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES legal_revisiones(id),
    nombre_archivo VARCHAR(255) NOT NULL,
    tipo_documento VARCHAR(50) NOT NULL CHECK (tipo_documento IN ('contrato', 'poliza', 'licencia', 'recibo', 'otro')),
    url_archivo VARCHAR(500),
    tamano_bytes INTEGER,
    tipo_mime VARCHAR(100),
    fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    subido_por TEXT REFERENCES "User"(id)
);

-- 4. Tabla para recordatorios y alertas
CREATE TABLE legal_revisiones_recordatorios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES legal_revisiones(id),
    tipo_recordatorio VARCHAR(20) NOT NULL CHECK (tipo_recordatorio IN ('email', 'notificacion', 'alerta')),
    dias_antes INTEGER NOT NULL,
    mensaje_template TEXT,
    esta_activo BOOLEAN DEFAULT true,
    enviado BOOLEAN DEFAULT false,
    fecha_envio TIMESTAMP WITH TIME ZONE,
    creado_por TEXT REFERENCES "User"(id)
);

-- 5. Tabla para acciones recomendadas
CREATE TABLE legal_revisiones_acciones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    revision_id UUID NOT NULL REFERENCES legal_revisiones(id),
    dias_antes INTEGER NOT NULL,
    accion_sugerida TEXT NOT NULL,
    categoria_accion VARCHAR(50) NOT NULL CHECK (categoria_accion IN ('negociacion', 'pago', 'renovacion', 'verificacion', 'preparacion')),
    prioridad INTEGER DEFAULT 1 CHECK (prioridad BETWEEN 1 AND 5),
    completado BOOLEAN DEFAULT false,
    fecha_completado TIMESTAMP WITH TIME ZONE,
    responsable TEXT REFERENCES "User"(id)
);

-- ========================================
-- ÍNDICES PARA OPTIMIZAR RENDIMIENTO
-- ========================================

-- Índices para la tabla principal
CREATE INDEX idx_legal_revisiones_company_id ON legal_revisiones(company_id);
CREATE INDEX idx_legal_revisiones_categoria ON legal_revisiones(categoria);
CREATE INDEX idx_legal_revisiones_estado ON legal_revisiones(estado);
CREATE INDEX idx_legal_revisiones_fecha_vencimiento ON legal_revisiones(fecha_vencimiento);
CREATE INDEX idx_legal_revisiones_anio_fiscal ON legal_revisiones(anio_fiscal);
CREATE INDEX idx_legal_revisiones_created_at ON legal_revisiones(created_at);

-- Índices compuestos para consultas frecuentes
CREATE INDEX idx_legal_revisiones_company_categoria ON legal_revisiones(company_id, categoria);
CREATE INDEX idx_legal_revisiones_company_estado ON legal_revisiones(company_id, estado);
CREATE INDEX idx_legal_revisiones_vencimiento_estado ON legal_revisiones(fecha_vencimiento, estado);

-- Índices para tablas relacionadas
CREATE INDEX idx_legal_historial_revision_id ON legal_revisiones_historial(revision_id);
CREATE INDEX idx_legal_historial_fecha_cambio ON legal_revisiones_historial(fecha_cambio);
CREATE INDEX idx_legal_documentos_revision_id ON legal_revisiones_documentos(revision_id);
CREATE INDEX idx_legal_recordatorios_revision_id ON legal_revisiones_recordatorios(revision_id);
CREATE INDEX idx_legal_acciones_revision_id ON legal_revisiones_acciones(revision_id);

-- ========================================
-- POLÍTICAS DE SEGURIDAD (RLS)
-- ========================================

-- Habilitar RLS en todas las tablas
ALTER TABLE legal_revisiones ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_revisiones_historial ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_revisiones_documentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_revisiones_recordatorios ENABLE ROW LEVEL SECURITY;
ALTER TABLE legal_revisiones_acciones ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla principal
CREATE POLICY "Usuarios pueden ver sus propias revisiones" ON legal_revisiones
    FOR SELECT USING (company_id = current_setting('app.current_company_id'));

CREATE POLICY "Usuarios pueden insertar sus propias revisiones" ON legal_revisiones
    FOR INSERT WITH CHECK (company_id = current_setting('app.current_company_id'));

CREATE POLICY "Usuarios pueden actualizar sus propias revisiones" ON legal_revisiones
    FOR UPDATE USING (company_id = current_setting('app.current_company_id'));

CREATE POLICY "Usuarios pueden eliminar sus propias revisiones" ON legal_revisiones
    FOR DELETE USING (company_id = current_setting('app.current_company_id'));

-- Políticas para tablas relacionadas (heredan seguridad de la tabla principal)
CREATE POLICY "Acceso a documentos según revisión" ON legal_revisiones_documentos
    FOR ALL USING (revision_id IN (
        SELECT id FROM legal_revisiones WHERE company_id = current_setting('app.current_company_id')
    ));

CREATE POLICY "Acceso a historial según revisión" ON legal_revisiones_historial
    FOR ALL USING (revision_id IN (
        SELECT id FROM legal_revisiones WHERE company_id = current_setting('app.current_company_id')
    ));

CREATE POLICY "Acceso a recordatorios según revisión" ON legal_revisiones_recordatorios
    FOR ALL USING (revision_id IN (
        SELECT id FROM legal_revisiones WHERE company_id = current_setting('app.current_company_id')
    ));

CREATE POLICY "Acceso a acciones según revisión" ON legal_revisiones_acciones
    FOR ALL USING (revision_id IN (
        SELECT id FROM legal_revisiones WHERE company_id = current_setting('app.current_company_id')
    ));

-- ========================================
-- TRIGGERS PARA ACTUALIZACIÓN AUTOMÁTICA
-- ========================================

-- Trigger para actualizar updated_at
CREATE OR REPLACE FUNCTION actualizar_timestamp_legal_revisiones()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    NEW.updated_by = current_setting('app.current_user_id');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_actualizar_timestamp_legal_revisiones
    BEFORE UPDATE ON legal_revisiones
    FOR EACH ROW
    EXECUTE FUNCTION actualizar_timestamp_legal_revisiones();

-- Trigger para registrar cambios en historial
CREATE OR REPLACE FUNCTION registrar_cambios_legal_revisiones()
RETURNS TRIGGER AS $$
DECLARE
    campo TEXT;
BEGIN
    -- Registrar cambios específicos
    IF OLD.titulo IS DISTINCT FROM NEW.titulo THEN
        INSERT INTO legal_revisiones_historial (revision_id, campo_modificado, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.id, 'titulo', to_jsonb(OLD.titulo), to_jsonb(NEW.titulo), current_setting('app.current_user_id'));
    END IF;
    
    IF OLD.fecha_vencimiento IS DISTINCT FROM NEW.fecha_vencimiento THEN
        INSERT INTO legal_revisiones_historial (revision_id, campo_modificado, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.id, 'fecha_vencimiento', to_jsonb(OLD.fecha_vencimiento), to_jsonb(NEW.fecha_vencimiento), current_setting('app.current_user_id'));
    END IF;
    
    IF OLD.estado IS DISTINCT FROM NEW.estado THEN
        INSERT INTO legal_revisiones_historial (revision_id, campo_modificado, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.id, 'estado', to_jsonb(OLD.estado), to_jsonb(NEW.estado), current_setting('app.current_user_id'));
    END IF;
    
    IF OLD.monto IS DISTINCT FROM NEW.monto THEN
        INSERT INTO legal_revisiones_historial (revision_id, campo_modificado, valor_anterior, valor_nuevo, usuario_id)
        VALUES (NEW.id, 'monto', to_jsonb(OLD.monto), to_jsonb(NEW.monto), current_setting('app.current_user_id'));
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_registrar_cambios_legal_revisiones
    AFTER UPDATE ON legal_revisiones
    FOR EACH ROW
    EXECUTE FUNCTION registrar_cambios_legal_revisiones();

-- ========================================
-- VISTAS ÚTILES
-- ========================================

-- Vista para revisiones próximas a vencer
CREATE VIEW vista_revisiones_proximas_vencer AS
SELECT 
    lr.*,
    CASE 
        WHEN lr.fecha_vencimiento - CURRENT_DATE <= 0 THEN 'vencido'
        WHEN lr.fecha_vencimiento - CURRENT_DATE <= 30 THEN 'critico'
        WHEN lr.fecha_vencimiento - CURRENT_DATE <= 60 THEN 'proximo'
        ELSE 'seguro'
    END AS nivel_urgencia,
    (lr.fecha_vencimiento - CURRENT_DATE) AS dias_restantes
FROM legal_revisiones lr
WHERE lr.estado IN ('vigente', 'proximo')
ORDER BY lr.fecha_vencimiento ASC;

-- Vista para resumen por categoría
CREATE VIEW vista_resumen_categoria AS
SELECT 
    lr.company_id,
    lr.categoria,
    COUNT(*) as total_revisiones,
    COUNT(*) FILTER (WHERE lr.estado = 'vigente') as vigentes,
    COUNT(*) FILTER (WHERE lr.estado = 'proximo') as proximos,
    COUNT(*) FILTER (WHERE lr.estado = 'vencido') as vencidos,
    COALESCE(SUM(lr.monto), 0) as monto_total,
    MIN(lr.fecha_vencimiento) as proximo_vencimiento
FROM legal_revisiones lr
GROUP BY lr.company_id, lr.categoria
ORDER BY lr.categoria;

-- Vista para historial de cambios
CREATE VIEW vista_historial_cambios AS
SELECT 
    lrh.id,
    lrh.revision_id,
    lrh.campo_modificado,
    lrh.valor_anterior,
    lrh.valor_nuevo,
    lrh.fecha_cambio,
    lrh.usuario_id,
    lrh.motivo_cambio,
    lr.titulo as revision_titulo,
    lr.categoria as revision_categoria
FROM legal_revisiones_historial lrh
JOIN legal_revisiones lr ON lrh.revision_id = lr.id
ORDER BY lrh.fecha_cambio DESC;

-- ========================================
-- DATOS DE EJEMPLO PARA PRUEBAS
-- ========================================

-- Insertar datos de ejemplo (descomentar para pruebas)
/*
-- Insertar revisiones de ejemplo
INSERT INTO legal_revisiones (company_id, categoria, titulo, descripcion, fecha_vencimiento, estado, monto, detalles, contacto, anio_fiscal) VALUES
-- Arrendamiento
(gen_random_uuid(), 'arrendamiento', 'Contrato de Arrendamiento - Consultorio Principal', 'Local comercial en Colonia Los Robles', '2026-12-31', 'proximo', 15000.00, 
 '{"Monto Alquiler": "L 15,000.00", "Ajuste Anual": "5%", "Retención Aplicable": "10%", "Depósito Garantía": "L 45,000.00", "Arrendador": "Inmobiliaria Honduras S.A."}', 
'{"nombre": "Carlos Hernández", "telefono": "504-2234-5678", "email": "carlos@inmobiliaria.hn"}', 2026),

-- Seguro
(gen_random_uuid(), 'seguro', 'Póliza de Seguro - Responsabilidad Civil', 'Cobertura general para la clínica dental', '2026-06-15', 'proximo', 36000.00,
'{"Prima Anual": "L 36,000.00", "Forma de Pago": "12 cuotas mensuales", "Cuota Mensual": "L 3,000.00", "Compañía": "Seguros Atlántida S.A.", "Póliza": "RC-2024-12345"}',
'{"nombre": "Carlos Méndez", "telefono": "504-2234-5678", "email": "carlos.mendez@segurosatlantida.hn"}', 2026),

-- Licencia Municipal
(gen_random_uuid(), 'licencia', 'Permiso de Operación Municipal', 'Licencia de funcionamiento emitida por Alcaldía', '2026-12-31', 'proximo', NULL,
'{"Impuesto Municipal": "L 8,000.00", "Fecha Emisión": "2024-12-31", "Número de Licencia": "MUN-2024-12345"}', NULL, 2026),

-- Colegiación
(gen_random_uuid(), 'licencia', 'Colegiación de Cirujanos Dentistas', 'Licencia profesional para odontólogos', '2026-06-30', 'proximo', NULL,
'{"Miembros Activos": "3", "Cuota Anual": "L 6,000.00", "Fecha Último Pago": "2025-06-15", "Número de Colegiado": "CCD-2024-67890"}', NULL, 2026);

-- Insertar acciones recomendadas
INSERT INTO legal_revisiones_acciones (revision_id, dias_antes, accion_sugerida, categoria_accion, prioridad) VALUES
-- Para arrendamiento
((SELECT id FROM legal_revisiones WHERE categoria = 'arrendamiento' LIMIT 1), 60, 'Iniciar negociación de renovación', 'negociacion', 1),
((SELECT id FROM legal_revisiones WHERE categoria = 'arrendamiento' LIMIT 1), 30, 'Preparar ajuste presupuestario', 'pago', 2),
((SELECT id FROM legal_revisiones WHERE categoria = 'arrendamiento' LIMIT 1), 15, 'Verificar retención ISR', 'verificacion', 3),

-- Para seguros
((SELECT id FROM legal_revisiones WHERE categoria = 'seguro' LIMIT 1), 30, 'Solicitar cotización de renovación', 'renovacion', 1),
((SELECT id FROM legal_revisiones WHERE categoria = 'seguro' LIMIT 1), 15, 'Verificar estado de pagos', 'pago', 2),
((SELECT id FROM legal_revisiones WHERE categoria = 'seguro' LIMIT 1), 7, 'Confirmar renovación', 'renovacion', 3),

-- Para licencias
((SELECT id FROM legal_revisiones WHERE categoria = 'licencia' AND titulo LIKE '%Municipal%' LIMIT 1), 30, 'Tramitar solvencia municipal', 'renovacion', 1),
((SELECT id FROM legal_revisiones WHERE categoria = 'licencia' AND titulo LIKE '%Colegiación%' LIMIT 1), 30, 'Pagar cuota anual', 'pago', 1);

-- Insertar recordatorios
INSERT INTO legal_revisiones_recordatorios (revision_id, tipo_recordatorio, dias_antes, mensaje_template, esta_activo) VALUES
-- Recordatorios para todas las revisiones
((SELECT id FROM legal_revisiones LIMIT 1), 'email', 60, 'Recordatorio: La revisión "{titulo}" vence en 60 días', true),
((SELECT id FROM legal_revisiones LIMIT 1), 'email', 30, 'Recordatorio: La revisión "{titulo}" vence en 30 días', true),
((SELECT id FROM legal_revisiones LIMIT 1), 'email', 15, 'Recordatorio: La revisión "{titulo}" vence en 15 días', true),
((SELECT id FROM legal_revisiones LIMIT 1), 'alerta', 7, 'Alerta: La revisión "{titulo}" vence en 7 días', true);
*/

-- ========================================
-- COMENTARIOS FINALES
-- ========================================

/*
Este esquema proporciona:

1. **Estructura completa** para gestionar revisiones legales
2. **Flexibilidad** con JSONB para detalles y contactos
3. **Seguridad** con RLS a nivel de empresa
4. **Auditoría** completa con historial de cambios
5. **Automatización** con triggers y vistas
6. **Escalabilidad** con índices optimizados
7. **Extensibilidad** para documentos y recordatorios

Uso:
- Las revisiones se filtran automáticamente por empresa
- El historial registra todos los cambios importantes
- Los documentos se pueden adjuntar a cada revisión
- Los recordatorios automatizados se pueden configurar
- Las acciones recomendadas ayudan al cumplimiento

Para activar los datos de ejemplo, descomentar los INSERTs al final del archivo.
*/
