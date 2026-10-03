-- =====================================================
-- FUNCIÓN: create_default_chart_of_accounts
-- =====================================================

CREATE OR REPLACE FUNCTION create_default_chart_of_accounts(p_company_id TEXT)
RETURNS VOID AS $$
BEGIN
    -- ==========================================
    -- CATÁLOGO DE CUENTAS ESTÁNDAR PARA HONDURAS/SAR
    -- ==========================================
    
    -- 1. ACTIVOS (Recursos de la empresa)
    -- ==========================================
    
    -- 11 - Activo Corriente
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '11', 'Activo Corriente', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 1101 - Caja y Bancos
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '1101', 'Caja y Bancos', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 110101 - Caja General
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '110101', 'Caja General', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 110102 - Bancos Cuentas Corrientes
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '110102', 'Bancos Cuentas Corrientes', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 1102 - Cuentas por Cobrar
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '1102', 'Cuentas por Cobrar', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 110201 - Clientes Nacionales
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '110201', 'Clientes Nacionales', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 110202 - Clientes del Extranjero
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '110202', 'Clientes del Extranjero', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 1103 - Inventarios
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '1103', 'Inventarios', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 110301 - Suministros y Materiales
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '110301', 'Suministros y Materiales', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 110302 - Productos Terminados
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '110302', 'Productos Terminados', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 1104 - Impuestos Pagados por Anticipado
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '1104', 'Impuestos Pagados por Anticipado', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 110401 - Crédito Fiscal ISV
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '110401', 'Crédito Fiscal ISV', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 110402 - Pagos a Cuenta ISR
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '110402', 'Pagos a Cuenta ISR', 'ASSET', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- ==========================================
    -- 2. PASIVOS (Deudas y Obligaciones)
    -- ==========================================
    
    -- 21 - Pasivo Corriente
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '21', 'Pasivo Corriente', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 2101 - Cuentas por Pagar Comerciales
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '2101', 'Cuentas por Pagar Comerciales', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 210101 - Proveedores Nacionales
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '210101', 'Proveedores Nacionales', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 210102 - Proveedores del Extranjero
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '210102', 'Proveedores del Extranjero', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 2102 - Obligaciones Fiscales
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '2102', 'Obligaciones Fiscales', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 210201 - ISV 15% por Pagar
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '210201', 'ISV 15% por Pagar', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 210202 - Retenciones de ISR por Pagar
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '210202', 'Retenciones de ISR por Pagar', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 210203 - Retenciones de Alquiler 10%
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '210203', 'Retenciones de Alquiler 10%', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 2103 - Obligaciones Laborales
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '2103', 'Obligaciones Laborales', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 210301 - IHSS por Pagar
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '210301', 'IHSS por Pagar', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 210302 - RAP / INFOP por Pagar
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '210302', 'RAP / INFOP por Pagar', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 210303 - Vacaciones y Aguinaldos por Pagar
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '210303', 'Vacaciones y Aguinaldos por Pagar', 'LIABILITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- ==========================================
    -- 3. PATRIMONIO (Capital y Reservas)
    -- ==========================================
    
    -- 31 - Capital Social
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '31', 'Capital Social', 'EQUITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 3101 - Capital Pagado
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '3101', 'Capital Pagado', 'EQUITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 32 - Resultados del Ejercicio
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '32', 'Resultados del Ejercicio', 'EQUITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 3201 - Utilidad del Ejercicio
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '3201', 'Utilidad del Ejercicio', 'EQUITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 3202 - Pérdida del Ejercicio
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '3202', 'Pérdida del Ejercicio', 'EQUITY', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- ==========================================
    -- 4. INGRESOS
    -- ==========================================
    
    -- 41 - Ingresos Operativos
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '41', 'Ingresos Operativos', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 4101 - Ingresos por Servicios
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '4101', 'Ingresos por Servicios', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 410101 - Servicios Profesionales
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '410101', 'Servicios Profesionales', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 410102 - Consultas Médicas
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '410102', 'Consultas Médicas', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 410103 - Tratamientos Dentales
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '410103', 'Tratamientos Dentales', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 4102 - Venta de Productos
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '4102', 'Venta de Productos', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 42 - Otros Ingresos
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '42', 'Otros Ingresos', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 4201 - Intereses Ganados
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '4201', 'Intereses Ganados', 'REVENUE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- ==========================================
    -- 5. GASTOS (Egresos)
    -- ==========================================
    
    -- 51 - Gastos Operativos
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '51', 'Gastos Operativos', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 5101 - Gastos de Personal
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '5101', 'Gastos de Personal', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510101 - Sueldos y Salarios
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510101', 'Sueldos y Salarios', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510102 - Decimotercer Mes (Aguinaldo)
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510102', 'Decimotercer Mes (Aguinaldo)', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510103 - Decimocuarto Mes
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510103', 'Decimocuarto Mes', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510104 - Aportaciones Patronales IHSS
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510104', 'Aportaciones Patronales IHSS', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510105 - Aportaciones Patronales RAP/INFOP
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510105', 'Aportaciones Patronales RAP/INFOP', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 5102 - Gastos de Administración
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '5102', 'Gastos de Administración', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510201 - Alquiler de Oficina
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510201', 'Alquiler de Oficina', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510202 - Servicios Públicos
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510202', 'Servicios Públicos', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510203 - Suministros de Oficina
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510203', 'Suministros de Oficina', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510204 - Telefonía e Internet
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510204', 'Telefonía e Internet', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 5103 - Gastos de Ventas
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '5103', 'Gastos de Ventas', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510301 - Publicidad y Marketing
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510301', 'Publicidad y Marketing', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- 510302 - Comisiones por Ventas
    INSERT INTO chart_of_accounts (company_id, code, name, type, is_default, is_active, balance, created_at, updated_at)
    VALUES (p_company_id, '510302', 'Comisiones por Ventas', 'EXPENSE', TRUE, TRUE, 0, NOW(), NOW())
    ON CONFLICT (company_id, code) DO NOTHING;
    
    -- Mensaje de éxito
    RAISE NOTICE 'Catálogo de cuentas estándar creado exitosamente para la compañía: %', p_company_id;
    
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- COMENTARIOS
-- =====================================================

-- Esta función crea un catálogo de cuentas completo siguiendo:
-- - Normas de Contabilidad Hondureña (SAR)
-- - Principios de Partida Doble
-- - Estructura NIIF adaptada a Honduras
-- - Códigos estándar para el sistema tributario

-- Uso:
-- SELECT create_default_chart_of_accounts('uuid-de-la-compañia');

-- La función es idempotente (usa ON CONFLICT DO NOTHING)
-- por lo que puede ejecutarse múltiples veces sin problemas.
