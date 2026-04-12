-- ========================================
-- SETUP COMPLETO DEL SISTEMA - BASE DE DATOS Y REVISIONES LEGALES
-- ========================================
-- Este script crea toda la estructura necesaria para el funcionamiento completo
-- Orden de ejecución recomendada:
-- 1. SUPABASE_COMPLETE.sql (ya existe)
-- 2. COMPLETE_SYSTEM_SETUP.sql (este archivo)
-- 3. LEGAL_REVISIONES_SCHEMA.sql (ya existe)
-- 4. LEGAL_REVISIONES_PROCEDURES_V2.sql (ya existe)
-- 5. SUPABASE_RLS_SETUP.sql (ya existe)
-- ========================================

-- =====================================================
-- VERIFICACIÓN Y CORRECCIÓN DE ESTRUCTURA
-- =====================================================

-- Asegurar que la tabla Tenant existe (ya está en SUPABASE_COMPLETE.sql)
-- Tabla Account ya existe en SUPABASE_COMPLETE.sql
-- Tabla User ya existe en SUPABASE_COMPLETE.sql
-- Tabla Transaction ya existe en SUPABASE_COMPLETE.sql
-- Tabla JournalEntry ya existe en SUPABASE_COMPLETE.sql

-- =====================================================
-- CORRECCIÓN DE REFERENCIAS EN LEGAL_REVISIONES
-- =====================================================

-- Nota: El schema legal_revisiones ya fue corregido para referenciar "Tenant"(id)
-- en lugar de companies(id)

-- =====================================================
-- INSERCIÓN DE DATOS DE EJEMPLO PARA CUENTAS
-- =====================================================

-- Insertar cuentas contables básicas si no existen
-- Primero verificar si ya existen datos para evitar duplicados
DO $$
BEGIN
    -- Solo insertar si la tabla está vacía o tiene pocos registros
    IF (SELECT COUNT(*) FROM "Account" WHERE "tenantId" = 'default-tenant') < 5 THEN
        INSERT INTO "Account" (id, "name", code, type, description, "tenantId", "createdAt", "updatedAt")
        VALUES 
            ('acc-caja', 'Caja y Bancos', '1101', 'ASSET', 'Cuentas de efectivo y bancos', 'default-tenant', NOW(), NOW()),
            ('acc-bancos', 'Bancos Cuentas Corrientes', '1102', 'ASSET', 'Cuentas bancarias', 'default-tenant', NOW(), NOW()),
            ('acc-cuentas-por-cobrar', 'Cuentas por Cobrar', '1201', 'ASSET', 'Cuentas por cobrar clientes', 'default-tenant', NOW(), NOW()),
            ('acc-inventario', 'Inventario', '1301', 'ASSET', 'Inventario de productos', 'default-tenant', NOW(), NOW()),
            ('acc-activos-fijos', 'Activos Fijos', '1501', 'ASSET', 'Mobiliario y equipo', 'default-tenant', NOW(), NOW()),
            ('acc-cuentas-por-pagar', 'Cuentas por Pagar', '2101', 'LIABILITY', 'Proveedores y acreedores', 'default-tenant', NOW(), NOW()),
            ('acc-salarios', 'Salarios y Sueldos', '5101', 'EXPENSE', 'Nómina y salarios', 'default-tenant', NOW(), NOW()),
            ('acc-servicios', 'Servicios Profesionales', '5102', 'EXPENSE', 'Servicios externos', 'default-tenant', NOW(), NOW()),
            ('acc-alquiler', 'Alquiler de Oficina', '5201', 'EXPENSE', 'Renta de local', 'default-tenant', NOW(), NOW()),
            ('acc-ingresos-servicios', 'Ingresos por Servicios', '4101', 'INCOME', 'Ingresos operativos', 'default-tenant', NOW(), NOW()),
            ('acc-ventas', 'Ventas', '4102', 'INCOME', 'Ventas de productos', 'default-tenant', NOW(), NOW()),
            ('acc-isv-por-pagar', 'ISV por Pagar', '2201', 'LIABILITY', 'Impuestos por pagar', 'default-tenant', NOW(), NOW()),
            ('acc-capital', 'Capital Social', '3101', 'EQUITY', 'Capital inicial', 'default-tenant', NOW(), NOW())
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- =====================================================
-- USUARIO ADMINISTRADOR POR DEFECTO
-- =====================================================

-- Insertar usuario administrador si no existe
-- Primero verificar si ya existe el usuario
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM "User" WHERE email = 'admin@contab.com') THEN
        INSERT INTO "User" (id, email, "name", role, "createdAt", "updatedAt")
        VALUES 
            ('admin-user-id', 'admin@contab.com', 'Administrador', 'ADMIN', NOW(), NOW());
    END IF;
END $$;

-- =====================================================
-- DATOS DE EJEMPLO PARA REVISIONES LEGALES
-- =====================================================

-- Nota: Estas inserciones son solo si las tablas legales ya existen
-- Se ejecutan después de LEGAL_REVISIONES_SCHEMA.sql

-- Ejemplo de inserción (descomentar si se necesitan datos de prueba)
/*
INSERT INTO legal_revisiones (
    company_id, categoria, titulo, descripcion, fecha_vencimiento, 
    estado, monto, detalles, contacto, anio_fiscal, created_by, updated_by
) VALUES
-- Arrendamiento
('default-tenant', 'arrendamiento', 'Contrato de Arrendamiento - Consultorio Principal', 
 'Local comercial en Colonia Los Robles', '2026-12-31', 'proximo', 15000.00, 
 '{"Monto Alquiler": "L 15,000.00", "Ajuste Anual": "5%", "Retención Aplicable": "10%", "Depósito Garantía": "L 45,000.00", "Arrendador": "Inmobiliaria Honduras S.A."}',
 '{"nombre": "Carlos Méndez", "telefono": "504-2234-5678", "email": "carlos.mendez@inmobiliaria.hn"}',
 2026, 'admin-user-id', 'admin-user-id'),

-- Seguro
('default-tenant', 'seguro', 'Póliza de Seguro - Responsabilidad Civil', 
 'Cobertura general para la clínica dental', '2026-06-15', 'proximo', 36000.00,
 '{"Prima Anual": "L 36,000.00", "Forma de Pago": "12 cuotas mensuales", "Cuota Mensual": "L 3,000.00", "Compañía": "Seguros Atlántida S.A."}',
 '{"nombre": "Ana García", "telefono": "504-2234-9999", "email": "ana.garcia@segurosatlantida.hn"}',
 2026, 'admin-user-id', 'admin-user-id'),

-- Licencia
('default-tenant', 'licencia', 'Permiso de Operación Municipal', 
 'Licencia de funcionamiento emitida por Alcaldía', '2026-12-31', 'proximo', 8000.00,
 '{"Impuesto Municipal": "L 8,000.00", "Fecha Emisión": "2024-12-31", "Número de Licencia": "MUN-2024-12345"}',
 NULL, 2026, 'admin-user-id', 'admin-user-id')

ON CONFLICT (id) DO NOTHING;
*/

-- =====================================================
-- ÍNDICES ADICIONALES PARA RENDIMIENTO
-- =====================================================

-- Índices para legal_revisiones (si no existen en el schema principal)
CREATE INDEX IF NOT EXISTS idx_legal_revisiones_company_categoria ON legal_revisiones(company_id, categoria);
CREATE INDEX IF NOT EXISTS idx_legal_revisiones_estado_vencimiento ON legal_revisiones(estado, fecha_vencimiento);
CREATE INDEX IF NOT EXISTS idx_legal_revisiones_anio_fiscal ON legal_revisiones(anio_fiscal);

-- Índices para Account (si no existen)
CREATE INDEX IF NOT EXISTS idx_account_tenant_type ON "Account"("tenantId", type);
CREATE INDEX IF NOT EXISTS idx_account_active ON "Account"("createdAt");

-- Índices para Transaction (si no existen)
CREATE INDEX IF NOT EXISTS idx_transaction_tenant_date ON "Transaction"("tenantId", date);
CREATE INDEX IF NOT EXISTS idx_transaction_voucher_type ON "Transaction"("voucherType");

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista para resumen de cuentas por tenant
CREATE OR REPLACE VIEW vista_resumen_cuentas AS
SELECT 
    a."tenantId",
    a.type,
    COUNT(*) as total_cuentas
FROM "Account" a
GROUP BY a."tenantId", a.type;

-- Vista para revisiones próximas a vencer (si las tablas legales existen)
/*
CREATE OR REPLACE VIEW vista_revisiones_proximas_vencer AS
SELECT 
    lr.company_id,
    lr.categoria,
    COUNT(*) as total_proximas_vencer,
    COUNT(*) FILTER (WHERE lr.fecha_vencimiento - CURRENT_DATE <= 15) as criticas_15_dias,
    COUNT(*) FILTER (WHERE lr.fecha_vencimiento - CURRENT_DATE <= 30) as alertas_30_dias,
    MIN(lr.fecha_vencimiento) as proximo_vencimiento
FROM legal_revisiones lr
WHERE lr.estado IN ('vigente', 'proximo')
    AND lr.fecha_vencimiento > CURRENT_DATE
GROUP BY lr.company_id, lr.categoria;
*/

-- =====================================================
-- FUNCIONES AUXILIARES
-- =====================================================

-- Función para obtener tenant actual
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', 'default-tenant');
END;
$$ LANGUAGE plpgsql;

-- Función para verificar permisos de usuario
CREATE OR REPLACE FUNCTION check_user_permission(p_user_id TEXT, p_required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM "User" u 
        WHERE u.id = p_user_id 
        AND u.role = p_required_role 
        AND u.isActive = true
    );
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================

/*
ESTRUCTURA COMPLETA DEL SISTEMA:

1. TABLAS PRINCIPALES:
   - Tenant: Empresas/Clientes (multitenant)
   - User: Usuarios del sistema
   - Account: Catálogo de cuentas contables
   - Transaction: Transacciones/pólizas
   - JournalEntry: Asientos contables

2. TABLAS DE REVISIONES LEGALES:
   - legal_revisiones: Revisiones principales
   - legal_revisiones_historial: Auditoría de cambios
   - legal_revisiones_documentos: Gestión de documentos
   - legal_revisiones_recordatorios: Sistema de alertas
   - legal_revisiones_acciones: Acciones recomendadas

3. SEGURIDAD:
   - Row Level Security (RLS) en todas las tablas
   - Políticas por tenant
   - Índices optimizados

4. INTEGRACIÓN:
   - Compatibilidad con Next.js
   - API endpoints funcionales
   - Frontend React integrado

ORDEN DE EJECUCIÓN RECOMENDADA:
1. Ejecutar SUPABASE_COMPLETE.sql
2. Ejecutar COMPLETE_SYSTEM_SETUP.sql (este archivo)
3. Ejecutar LEGAL_REVISIONES_SCHEMA.sql
4. Ejecutar LEGAL_REVISIONES_PROCEDURES_V2.sql
5. Ejecutar SUPABASE_RLS_SETUP.sql

VERIFICACIÓN FINAL:
- Todas las tablas creadas con relaciones correctas
- Índices optimizados para rendimiento
- Datos de ejemplo insertados
- Sistema listo para uso con frontend
*/
