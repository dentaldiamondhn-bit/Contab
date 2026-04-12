-- =====================================================
-- SQL PARA ONBOARDING - CONFIGURACIÓN INICIAL DE EMPRESAS
-- =====================================================

-- Tabla: onboarding_companies (Datos de configuración inicial)
CREATE TABLE IF NOT EXISTS onboarding_companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL,
    company_name VARCHAR(255) NOT NULL,
    rtn VARCHAR(20),
    address TEXT,
    contact_phone VARCHAR(20),
    client_phone VARCHAR(20),
    company_phone VARCHAR(20),
    country VARCHAR(50) DEFAULT 'Honduras',
    email VARCHAR(255),
    industry VARCHAR(100),
    business_type VARCHAR(50), -- clinica_dental, farmacia, etc.
    logo_url TEXT,
    setup_completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE onboarding_companies IS 'Datos de configuración inicial durante el onboarding';

-- Tabla: company_bank_accounts (Cuentas bancarias de la empresa)
CREATE TABLE IF NOT EXISTS company_bank_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    bank_name VARCHAR(100) NOT NULL,
    account_number VARCHAR(50) NOT NULL,
    account_type VARCHAR(20) NOT NULL, -- ahorro, corriente, plazo_fijo
    currency VARCHAR(3) DEFAULT 'HNL', -- HNL, USD
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE company_bank_accounts IS 'Cuentas bancarias asociadas a cada empresa';

CREATE INDEX IF NOT EXISTS idx_company_bank_accounts_company_id ON company_bank_accounts(company_id);

-- Tabla: chart_of_accounts (Catálogo de cuentas contables)
CREATE TABLE IF NOT EXISTS chart_of_accounts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    code VARCHAR(20) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(20) NOT NULL, -- ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
    description TEXT,
    parent_id UUID REFERENCES chart_of_accounts(id),
    is_default BOOLEAN DEFAULT FALSE,
    is_active BOOLEAN DEFAULT TRUE,
    balance DECIMAL(15,2) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE chart_of_accounts IS 'Catálogo de cuentas contables por empresa';

CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_company_id ON chart_of_accounts(company_id);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_code ON chart_of_accounts(code);
CREATE INDEX IF NOT EXISTS idx_chart_of_accounts_type ON chart_of_accounts(type);

-- Tabla: sales_configuration (Configuración de ventas y facturación)
CREATE TABLE IF NOT EXISTS sales_configuration (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id TEXT NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,
    cai_enabled BOOLEAN DEFAULT FALSE,
    cai_type VARCHAR(20) DEFAULT 'auto_impresion', -- auto_impresion, imprenta
    cai_code VARCHAR(50),
    cai_range_start VARCHAR(20),
    cai_range_end VARCHAR(20),
    cai_expiry_date DATE,
    tax_rate INTEGER DEFAULT 15, -- Porcentaje ISV
    invoice_prefix VARCHAR(20) DEFAULT '001-001-',
    current_invoice_number INTEGER DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

COMMENT ON TABLE sales_configuration IS 'Configuración de ventas, CAI y facturación por empresa';

CREATE INDEX IF NOT EXISTS idx_sales_config_company_id ON sales_configuration(company_id);

-- =====================================================
-- DATOS PREDETERMINADOS: CATÁLOGO DE CUENTAS ESTÁNDAR
-- =====================================================

-- Función para crear catálogo de cuentas por defecto (Estructura HN/SAR)
CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(p_company_id TEXT)
RETURNS VOID AS $$
BEGIN
    -- ==========================================
    -- 1. ACTIVOS (Recursos de la empresa)
    -- ==========================================
    
    -- 11 - Activo Corriente
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default) VALUES
    (p_company_id, '11', 'Activo Corriente', 'ASSET', TRUE),
    
    -- 1101 - Caja y Bancos
    (p_company_id, '1101', 'Caja y Bancos', 'ASSET', TRUE),
    (p_company_id, '110101', 'Caja General', 'ASSET', TRUE),
    (p_company_id, '110102', 'Bancos', 'ASSET', TRUE),
    
    -- 1102 - Cuentas por Cobrar
    (p_company_id, '1102', 'Cuentas por Cobrar', 'ASSET', TRUE),
    (p_company_id, '110201', 'Clientes Locales', 'ASSET', TRUE),
    (p_company_id, '110205', '(-) Estimación de Cuentas Incobrables', 'ASSET', TRUE),
    
    -- 1103 - Inventarios
    (p_company_id, '1103', 'Inventarios', 'ASSET', TRUE),
    (p_company_id, '110301', 'Suministros Dentales', 'ASSET', TRUE),
    (p_company_id, '110302', 'Material de Oficina', 'ASSET', TRUE),
    
    -- 1104 - Impuestos Pagados por Anticipado
    (p_company_id, '1104', 'Impuestos Pagados por Anticipado', 'ASSET', TRUE),
    (p_company_id, '110401', 'Crédito Fiscal (ISV 15% Pagado)', 'ASSET', TRUE),
    (p_company_id, '110402', 'Pagos a Cuenta ISR', 'ASSET', TRUE),
    
    -- 12 - Activo No Corriente
    (p_company_id, '12', 'Activo No Corriente', 'ASSET', TRUE),
    
    -- 1201 - Propiedad, Planta y Equipo
    (p_company_id, '1201', 'Propiedad, Planta y Equipo', 'ASSET', TRUE),
    (p_company_id, '120101', 'Equipo Médico y Dental', 'ASSET', TRUE),
    (p_company_id, '120102', 'Mobiliario y Equipo de Oficina', 'ASSET', TRUE),
    (p_company_id, '120105', '(-) Depreciación Acumulada', 'ASSET', TRUE);
    
    -- ==========================================
    -- 2. PASIVOS (Deudas y Obligaciones)
    -- ==========================================
    
    -- 21 - Pasivo Corriente
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default) VALUES
    (p_company_id, '21', 'Pasivo Corriente', 'LIABILITY', TRUE),
    
    -- 2101 - Cuentas por Pagar Comerciales
    (p_company_id, '2101', 'Cuentas por Pagar Comerciales', 'LIABILITY', TRUE),
    (p_company_id, '210101', 'Proveedores Locales', 'LIABILITY', TRUE),
    
    -- 2102 - Obligaciones Fiscales (SAR)
    (p_company_id, '2102', 'Obligaciones Fiscales (SAR)', 'LIABILITY', TRUE),
    (p_company_id, '210201', 'ISV 15% por Pagar', 'LIABILITY', TRUE),
    (p_company_id, '210202', 'Retenciones de ISR por Pagar', 'LIABILITY', TRUE),
    (p_company_id, '210203', 'Retenciones de Alquiler (10%)', 'LIABILITY', TRUE),
    
    -- 2103 - Obligaciones Laborales
    (p_company_id, '2103', 'Obligaciones Laborales', 'LIABILITY', TRUE),
    (p_company_id, '210301', 'IHSS por Pagar', 'LIABILITY', TRUE),
    (p_company_id, '210302', 'RAP / INFOP por Pagar', 'LIABILITY', TRUE),
    
    -- 22 - Pasivo No Corriente
    (p_company_id, '22', 'Pasivo No Corriente', 'LIABILITY', TRUE),
    (p_company_id, '2201', 'Préstamos Bancarios a Largo Plazo', 'LIABILITY', TRUE);
    
    -- ==========================================
    -- 3. PATRIMONIO (Capital y Reservas)
    -- ==========================================
    
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default) VALUES
    (p_company_id, '3', 'Patrimonio', 'EQUITY', TRUE),
    
    -- 31 - Capital Social
    (p_company_id, '31', 'Capital Social', 'EQUITY', TRUE),
    (p_company_id, '3101', 'Capital Pagado', 'EQUITY', TRUE),
    
    -- 32 - Resultados
    (p_company_id, '32', 'Resultados', 'EQUITY', TRUE),
    (p_company_id, '3201', 'Utilidades Retenidas', 'EQUITY', TRUE),
    (p_company_id, '3202', 'Utilidad/Pérdida del Ejercicio Actual', 'EQUITY', TRUE);
    
    -- ==========================================
    -- 4. INGRESOS
    -- ==========================================
    
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default) VALUES
    (p_company_id, '4', 'Ingresos', 'REVENUE', TRUE),
    
    -- 41 - Ingresos Operativos
    (p_company_id, '41', 'Ingresos Operativos', 'REVENUE', TRUE),
    (p_company_id, '4101', 'Prestación de Servicios Dentales', 'REVENUE', TRUE),
    (p_company_id, '4102', 'Venta de Productos Especializados', 'REVENUE', TRUE),
    
    -- 42 - Otros Ingresos
    (p_company_id, '42', 'Otros Ingresos', 'REVENUE', TRUE),
    (p_company_id, '4201', 'Intereses Ganados', 'REVENUE', TRUE);
    
    -- ==========================================
    -- 5. GASTOS (Egresos)
    -- ==========================================
    
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default) VALUES
    (p_company_id, '5', 'Gastos', 'EXPENSE', TRUE),
    
    -- 51 - Gastos de Operación
    (p_company_id, '51', 'Gastos de Operación', 'EXPENSE', TRUE),
    
    -- 5101 - Gastos de Personal
    (p_company_id, '5101', 'Gastos de Personal', 'EXPENSE', TRUE),
    (p_company_id, '510101', 'Sueldos y Salarios', 'EXPENSE', TRUE),
    (p_company_id, '510102', 'Decimotercer Mes (Aguinaldo)', 'EXPENSE', TRUE),
    (p_company_id, '510103', 'Decimocuarto Mes', 'EXPENSE', TRUE),
    (p_company_id, '510105', 'Aportaciones Patronales (IHSS/RAP)', 'EXPENSE', TRUE),
    
    -- 5102 - Gastos de Administración
    (p_company_id, '5102', 'Gastos de Administración', 'EXPENSE', TRUE),
    (p_company_id, '510201', 'Alquileres', 'EXPENSE', TRUE),
    (p_company_id, '510202', 'Servicios Públicos (EEH, SANAA)', 'EXPENSE', TRUE),
    (p_company_id, '510203', 'Papelería y Útiles', 'EXPENSE', TRUE),
    (p_company_id, '510205', 'Seguros y Fianzas', 'EXPENSE', TRUE),
    
    -- 5103 - Gastos de Ventas / Marketing
    (p_company_id, '5103', 'Gastos de Ventas / Marketing', 'EXPENSE', TRUE),
    (p_company_id, '510301', 'Publicidad', 'EXPENSE', TRUE);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_default_chart_of_accounts IS 'Crea el catálogo de cuentas estándar para una nueva empresa';

-- =====================================================
-- EJEMPLOS DE USO
-- =====================================================

-- Crear catálogo de cuentas para una empresa:
-- SELECT create_default_chart_of_accounts('uuid-de-la-empresa');

-- Ver todas las cuentas de una empresa:
-- SELECT * FROM chart_of_accounts WHERE company_id = 'uuid' ORDER BY code;

-- Agregar cuenta bancaria:
-- INSERT INTO company_bank_accounts (company_id, bank_name, account_number, account_type, currency)
-- VALUES ('uuid', 'Banco Atlántida', '1234567890', 'corriente', 'HNL');

-- Configurar ventas/CAI:
-- INSERT INTO sales_configuration (company_id, cai_enabled, cai_code, tax_rate, invoice_prefix)
-- VALUES ('uuid', TRUE, '3B2D-5F1A-9876-1234', 15, '001-001-');

-- =====================================================
-- COMENTARIOS FINALES
-- =====================================================
COMMENT ON TABLE onboarding_companies IS 'Almacena datos temporales durante el proceso de onboarding';
COMMENT ON TABLE company_bank_accounts IS 'Cuentas bancarias asociadas a cada empresa con encriptación recomendada';
COMMENT ON TABLE chart_of_accounts IS 'Catálogo de cuentas contables siguiendo NIIF y principios de partida doble';
COMMENT ON TABLE sales_configuration IS 'Configuración de facturación electrónica y parámetros SAR';
