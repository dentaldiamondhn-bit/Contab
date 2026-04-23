-- ========================================
-- PROCEDIMIENTOS ALMACENADOS PARA CALENDARIO DE REVISIONES LEGALES
-- ========================================

-- 1. Procedimiento para obtener revisiones con filtros
CREATE OR REPLACE FUNCTION obtener_revisiones_legales(
    p_company_id TEXT,
    p_dias_vencer INTEGER DEFAULT NULL,
    p_anio_fiscal INTEGER DEFAULT NULL,
    p_categoria VARCHAR(20) DEFAULT NULL,
    p_estado VARCHAR(20) DEFAULT NULL
)
RETURNS TABLE (
    id UUID,
    categoria VARCHAR(20),
    titulo VARCHAR(255),
    descripcion TEXT,
    fecha_vencimiento DATE,
    estado VARCHAR(20),
    monto DECIMAL(12,2),
    detalles JSONB,
    contacto JSONB,
    dias_restantes INTEGER,
    nivel_urgencia VARCHAR(20),
    proximas_acciones TEXT[]
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        lr.id,
        lr.categoria,
        lr.titulo,
        lr.descripcion,
        lr.fecha_vencimiento,
        lr.estado,
        lr.monto,
        lr.detalles,
        lr.contacto,
        (lr.fecha_vencimiento - CURRENT_DATE) AS dias_restantes,
        CASE 
            WHEN lr.fecha_vencimiento - CURRENT_DATE <= 0 THEN 'vencido'
            WHEN lr.fecha_vencimiento - CURRENT_DATE <= 30 THEN 'critico'
            WHEN lr.fecha_vencimiento - CURRENT_DATE <= 60 THEN 'proximo'
            ELSE 'seguro'
        END AS nivel_urgencia,
        ARRAY(
            SELECT acc.accion_sugerida::TEXT
            FROM legal_revisiones_acciones acc
            WHERE acc.revision_id = lr.id
            AND acc.completado = false
            ORDER BY acc.dias_antes DESC
        ) AS proximas_acciones
    FROM legal_revisiones lr
    WHERE lr.company_id = p_company_id
        AND (p_categoria IS NULL OR lr.categoria = p_categoria)
        AND (p_estado IS NULL OR lr.estado = p_estado)
        AND (p_anio_fiscal IS NULL OR lr.anio_fiscal = p_anio_fiscal)
        AND (p_dias_vencer IS NULL OR (lr.fecha_vencimiento - CURRENT_DATE) <= p_dias_vencer)
    ORDER BY lr.fecha_vencimiento ASC;
END;
$$ LANGUAGE plpgsql;

-- 2. Procedimiento para crear o actualizar una revisión
CREATE OR REPLACE FUNCTION guardar_revision_legal(
    p_company_id TEXT,
    p_categoria VARCHAR(20),
    p_titulo VARCHAR(255),
    p_fecha_vencimiento DATE,
    p_descripcion TEXT DEFAULT NULL,
    p_estado VARCHAR(20) DEFAULT 'proximo',
    p_monto DECIMAL(12,2) DEFAULT NULL,
    p_detalles JSONB DEFAULT NULL,
    p_contacto JSONB DEFAULT NULL,
    p_anio_fiscal INTEGER DEFAULT 2026,
    p_usuario_id TEXT DEFAULT NULL,
    p_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_revision_id UUID;
BEGIN
    -- Validar parámetros obligatorios
    IF p_company_id IS NULL OR p_categoria IS NULL OR p_titulo IS NULL OR p_fecha_vencimiento IS NULL THEN
        RAISE EXCEPTION 'Parámetros obligatorios faltantes: company_id, categoria, titulo, fecha_vencimiento';
    END IF;
    
    -- Validar valores permitidos
    IF p_categoria NOT IN ('arrendamiento', 'seguro', 'licencia') THEN
        RAISE EXCEPTION 'Categoría no válida. Debe ser: arrendamiento, seguro o licencia';
    END IF;
    
    IF p_estado NOT IN ('vigente', 'proximo', 'vencido') THEN
        RAISE EXCEPTION 'Estado no válido. Debe ser: vigente, próximo o vencido';
    END IF;
    
    -- Insertar o actualizar
    IF p_id IS NULL THEN
        -- Crear nueva revisión
        INSERT INTO legal_revisiones (
            company_id, categoria, titulo, descripcion, fecha_vencimiento, 
            estado, monto, detalles, contacto, anio_fiscal, created_by, updated_by
        ) VALUES (
            p_company_id, p_categoria, p_titulo, p_descripcion, p_fecha_vencimiento,
            p_estado, p_monto, p_detalles, p_contacto, p_anio_fiscal, p_usuario_id, p_usuario_id
        ) RETURNING id INTO v_revision_id;
        
        -- Crear acciones recomendadas por defecto
        IF p_categoria = 'arrendamiento' THEN
            INSERT INTO legal_revisiones_acciones (revision_id, dias_antes, accion_sugerida, categoria_accion, prioridad)
            VALUES 
                (v_revision_id, 60, 'Iniciar negociación de renovación', 'negociacion', 1),
                (v_revision_id, 30, 'Preparar ajuste presupuestario', 'pago', 2),
                (v_revision_id, 15, 'Verificar retención ISR', 'verificacion', 3);
        ELSIF p_categoria = 'seguro' THEN
            INSERT INTO legal_revisiones_acciones (revision_id, dias_antes, accion_sugerida, categoria_accion, prioridad)
            VALUES 
                (v_revision_id, 30, 'Solicitar cotización de renovación', 'renovacion', 1),
                (v_revision_id, 15, 'Verificar estado de pagos', 'pago', 2),
                (v_revision_id, 7, 'Confirmar renovación', 'renovacion', 3);
        ELSIF p_categoria = 'licencia' THEN
            INSERT INTO legal_revisiones_acciones (revision_id, dias_antes, accion_sugerida, categoria_accion, prioridad)
            VALUES 
                (v_revision_id, 30, 'Preparar documentación', 'preparacion', 2),
                (v_revision_id, 15, 'Verificar requisitos', 'verificacion', 3);
        END IF;
        
        -- Crear recordatorios por defecto
        INSERT INTO legal_revisiones_recordatorios (revision_id, tipo_recordatorio, dias_antes, mensaje_template, esta_activo, creado_por)
        VALUES 
            (v_revision_id, 'email', 60, 'Recordatorio: La revisión "' || p_titulo || '" vence en 60 días', true, p_usuario_id),
            (v_revision_id, 'email', 30, 'Recordatorio: La revisión "' || p_titulo || '" vence en 30 días', true, p_usuario_id),
            (v_revision_id, 'email', 15, 'Recordatorio: La revisión "' || p_titulo || '" vence en 15 días', true, p_usuario_id),
            (v_revision_id, 'alerta', 7, 'Alerta: La revisión "' || p_titulo || '" vence en 7 días', true, p_usuario_id);
            
    ELSE
        -- Actualizar revisión existente
        UPDATE legal_revisiones SET
            categoria = p_categoria,
            titulo = p_titulo,
            descripcion = p_descripcion,
            fecha_vencimiento = p_fecha_vencimiento,
            estado = p_estado,
            monto = p_monto,
            detalles = p_detalles,
            contacto = p_contacto,
            anio_fiscal = p_anio_fiscal,
            updated_by = p_usuario_id
        WHERE id = p_id AND company_id = p_company_id
        RETURNING id INTO v_revision_id;
        
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Revisión no encontrada o no pertenece a la empresa especificada';
        END IF;
    END IF;
    
    RETURN v_revision_id;
END;
$$ LANGUAGE plpgsql;
