-- =====================================================
-- TABLA Customer (Clientes)
-- =====================================================

CREATE TABLE IF NOT EXISTS "Customer" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT NOT NULL,
    rtn TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    creditLimit BIGINT DEFAULT 0,
    currentBalance BIGINT DEFAULT 0,
    isActive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW(),
    UNIQUE(rtn, tenantId)
);

-- =====================================================
-- ÍNDICES para optimización
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_customer_tenant ON "Customer"("tenantId");
CREATE INDEX IF NOT EXISTS idx_customer_rtn ON "Customer"("rtn");
CREATE INDEX IF NOT EXISTS idx_customer_active ON "Customer"("isActive");
CREATE INDEX IF NOT EXISTS idx_customer_created_at ON "Customer"("createdat");

-- =====================================================
-- POLÍTICAS DE SEGURIDAD (Row Level Security)
-- =====================================================

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;

-- Política de aislamiento por tenant
CREATE POLICY "Tenant isolation" ON "Customer"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- =====================================================
-- INSERCIONES DE DATOS DE EJEMPLO
-- =====================================================

INSERT INTO "Customer" (
    tenantId,
    rtn,
    name,
    email,
    phone,
    address,
    creditLimit,
    currentBalance,
    isActive,
    createdat,
    updatedat
) VALUES
    -- Clientes de ejemplo para tenant 'default'
    ('default', '0801-1999-00001', 'Constructora Hondureña S.A.', 'info@constructorahn.hn', '+504 2234-5678', 'Boulevard Suyapa, Tegucigalpa, Honduras', 5000000, 1250000, true, NOW(), NOW()),
    ('default', '0801-1999-00002', 'Distribuidora Médica Central', 'contacto@distribuidoramedica.hn', '+504 2555-8901', 'Colonia Miraflores, Tegucigalpa', 3000000, 750000, true, NOW(), NOW()),
    ('default', '0801-1999-00003', 'Tech Solutions Honduras', 'ventas@techsolutions.hn', '+504 2666-1234', 'Avenida Morazán, San Pedro Sula', 10000000, 2500000, true, NOW(), NOW()),
    ('default', '0801-1999-00004', 'Papelería El Estudiante', 'pedidos@papeleriaestudiante.hn', '+504 2444-5555', 'Centro Comercial, San Pedro Sula', 1500000, 375000, true, NOW(), NOW()),
    ('default', '0801-1999-00005', 'Restaurantes Gourmet S.A.', 'reservas@gourmet.hn', '+504 2777-9999', 'Colonia Palmira, Tegucigalpa', 2000000, 500000, true, NOW(), NOW()),
    ('default', '0801-1999-00006', 'Transportes Rápidos del Norte', 'logistica@transportesrn.hn', '+504 2334-6789', 'Kilómetro 5, Carretera al Atlántico', 8000000, 2000000, true, NOW(), NOW()),
    ('default', '0801-1999-00007', 'Agencia de Viajes Tropical', 'info@tropicaltravel.hn', '+504 2111-2233', 'Boulevard Morazán, Tegucigalpa', 1200000, 300000, false, NOW(), NOW()), -- Cliente inactivo
    ('default', '0801-1999-00008', 'Supermercado La Familia', 'compras@supermercadolfamilia.hn', '+504 2999-8765', 'Colonia Alameda, San Pedro Sula', 6000000, 1500000, true, NOW(), NOW()),
    ('default', '0801-1999-00009', 'Clínica Dental Sonrisas', 'citas@sonrisasdental.hn', '+504 2555-4321', 'Edificio Médico, Tegucigalpa', 3500000, 875000, true, NOW(), NOW()),
    ('default', '0801-1999-00010', 'Importadora Textil del Caribe', 'ventas@textilcaribe.hn', '+504 2777-1111', 'Zona Franca, Puerto Cortés', 15000000, 3750000, true, NOW(), NOW());

-- =====================================================
-- VISTAS ÚTILES
-- =====================================================

-- Vista de clientes activos por tenant
CREATE OR REPLACE VIEW "ActiveCustomers" AS
SELECT 
    id,
    tenantId,
    rtn,
    name,
    email,
    phone,
    address,
    creditLimit,
    currentBalance,
    createdat,
    updatedat
FROM "Customer"
WHERE isActive = true;

-- Vista de resumen de clientes por tenant
CREATE OR REPLACE VIEW "CustomerSummary" AS
SELECT 
    tenantId,
    COUNT(*) as total_customers,
    COUNT(CASE WHEN isActive = true THEN 1 END) as active_customers,
    COUNT(CASE WHEN isActive = false THEN 1 END) as inactive_customers,
    SUM(creditLimit) as total_credit_limit,
    SUM(currentBalance) as total_current_balance,
    AVG(creditLimit) as avg_credit_limit,
    AVG(currentBalance) as avg_current_balance
FROM "Customer"
GROUP BY tenantId;

-- =====================================================
-- TRIGGER para actualizar updatedat automáticamente
-- =====================================================

CREATE OR REPLACE FUNCTION update_customer_updatedat()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_customer_updatedat
    BEFORE UPDATE ON "Customer"
    FOR EACH ROW
    EXECUTE FUNCTION update_customer_updatedat();

-- =====================================================
-- CONSULTAS DE EJEMPLO
-- =====================================================

-- Obtener todos los clientes de un tenant específico
SELECT * FROM "Customer" 
WHERE tenantId = 'default' AND isActive = true 
ORDER BY createdat DESC;

-- Buscar clientes por RTN o nombre
SELECT * FROM "Customer" 
WHERE tenantId = 'default' 
  AND (rtn ILIKE '%0801%' OR name ILIKE '%constructor%')
  AND isActive = true;

-- Obtener clientes con saldo pendiente
SELECT * FROM "Customer" 
WHERE tenantId = 'default' 
  AND currentBalance > 0 
  AND isActive = true;

-- Estadísticas de clientes por tenant
SELECT * FROM "CustomerSummary" 
WHERE tenantId = 'default';

-- =====================================================
-- COMENTARIOS ADICIONALES
-- =====================================================

/*
NOTAS SOBRE LA ESTRUCTURA:

1. RELACIONES:
   - tenantId: Relación con la tabla Tenant (empresas)
   - Las facturas (Invoice) deberían tener una foreign key a customerId
   - Las cuentas por cobrar (AccountReceivable) deberían tener una foreign key a customerId

2. CAMPOS FINANCIEROS:
   - creditLimit: Límite de crédito en centavos (ej: 5000000 = L. 50,000)
   - currentBalance: Saldo actual en centavos
   - isActive: Para activar/desactivar clientes sin eliminarlos

3. ÍNDICES:
   - tenantId: Para filtrar rápidamente por empresa
   - rtn: Para búsquedas rápidas por RTN
   - isActive: Para obtener solo clientes activos
   - createdat: Para ordenamiento por fecha de creación

4. SEGURIDAD:
   - Row Level Security activado
   - Política de aislamiento por tenant
   - Solo usuarios del mismo tenant pueden ver sus clientes

5. TRIGGERS:
   - updatedat se actualiza automáticamente en cada modificación

6. VISTAS:
   - ActiveCustomers: Solo clientes activos
   - CustomerSummary: Estadísticas agregadas por tenant

USO RECOMENDADO:
- Usar las vistas para consultas frecuentes
- Mantener isActive = true para clientes activos
- Usar creditLimit y currentBalance en centavos para precisión
- El RTN debe ser único por tenant (UNIQUE constraint)
*/
