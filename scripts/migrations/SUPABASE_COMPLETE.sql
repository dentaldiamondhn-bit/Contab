-- =====================================================
-- SQL COMPLETO PARA SUPABASE - SISTEMA CONTABLE
-- =====================================================
-- Este script configura todo el esquema para el sistema contable
-- Compatible con la aplicación Next.js
-- =====================================================

-- =====================================================
-- 1. TABLAS PRINCIPALES
-- =====================================================

-- Tabla Tenant (Empresas/Clientes)
CREATE TABLE IF NOT EXISTS "Tenant" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    businessname TEXT NOT NULL,
    businessrtn TEXT UNIQUE,
    businessemail TEXT UNIQUE,
    isactive BOOLEAN DEFAULT true,
    createdat TIMESTAMP DEFAULT NOW(),
    updatedat TIMESTAMP DEFAULT NOW()
);

-- Tabla Account (Catálogo de Cuentas)
CREATE TABLE IF NOT EXISTS "Account" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    name TEXT NOT NULL,
    code TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE')),
    description TEXT,
    parentId TEXT,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, tenantId)
);

-- Tabla User (Usuarios)
CREATE TABLE IF NOT EXISTS "User" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    email TEXT UNIQUE,
    name TEXT NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('ADMIN', 'MANAGER', 'USER', 'VIEWER')),
    isActive BOOLEAN DEFAULT true,
    lastLogin TIMESTAMP,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    UNIQUE(email, tenantId)
);

-- Tabla UserActivity (Actividades de Usuario)
CREATE TABLE IF NOT EXISTS "UserActivity" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    userId TEXT NOT NULL,
    action TEXT NOT NULL,
    description TEXT,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

-- Tabla BackupRecord (Registros de Respaldo)
CREATE TABLE IF NOT EXISTS "BackupRecord" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    userId TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('MANUAL', 'AUTOMATIC', 'SCHEDULED')),
    description TEXT NOT NULL,
    fileName TEXT NOT NULL,
    fileSize BIGINT NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'FAILED')),
    createdAt TIMESTAMP DEFAULT NOW(),
    completedAt TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES "User"(id) ON DELETE CASCADE
);

-- Índices para User
CREATE INDEX IF NOT EXISTS idx_user_tenant ON "User"("tenantId");
CREATE INDEX IF NOT EXISTS idx_user_email ON "User"("email");
CREATE INDEX IF NOT EXISTS idx_user_role ON "User"("role");
CREATE INDEX IF NOT EXISTS idx_user_active ON "User"("isActive");
CREATE INDEX IF NOT EXISTS idx_user_created ON "User"("createdAt");

-- Índices para UserActivity
CREATE INDEX IF NOT EXISTS idx_user_activity_tenant ON "UserActivity"("tenantId");
CREATE INDEX IF NOT EXISTS idx_user_activity_user ON "UserActivity"("userId");
CREATE INDEX IF NOT EXISTS idx_user_activity_created ON "UserActivity"("createdAt");
CREATE INDEX IF NOT EXISTS idx_user_activity_action ON "UserActivity"("action");

-- Índices para BackupRecord
CREATE INDEX IF NOT EXISTS idx_backup_record_tenant ON "BackupRecord"("tenantId");
CREATE INDEX IF NOT EXISTS idx_backup_record_user ON "BackupRecord"("userId");
CREATE INDEX IF NOT EXISTS idx_backup_record_created ON "BackupRecord"("createdAt");
CREATE INDEX IF NOT EXISTS idx_backup_record_status ON "BackupRecord"("status");

-- =====================================================
-- 9. DATOS INICIALES PARA PRUEBAS
-- =====================================================

-- Insertar usuarios de ejemplo (opcional)
INSERT INTO "User" (id, tenantId, email, name, role, isActive, createdAt, updatedAt) VALUES
    (gen_random_uuid()::TEXT, 'default', 'admin@contab.com', 'Administrador Principal', 'ADMIN', true, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'default', 'gerente@contab.com', 'Gerente de Contabilidad', 'MANAGER', true, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'default', 'usuario@contab.com', 'Usuario Contador', 'USER', true, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'default', 'lector@contab.com', 'Lector de Reportes', 'VIEWER', true, NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'default', 'inactivo@contab.com', 'Usuario Inactivo', 'USER', false, NOW(), NOW());

-- Insertar actividades de ejemplo (opcional)
INSERT INTO "UserActivity" (id, tenantId, userId, action, description, ipAddress, userAgent, createdAt) VALUES
    (gen_random_uuid()::TEXT, 'default', (SELECT id FROM "User" WHERE email = 'admin@contab.com'), 'login', 'Inicio de sesión del administrador', '192.168.1.100', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW()),
    (gen_random_uuid()::TEXT, 'default', (SELECT id FROM "User" WHERE email = 'gerente@contab.com'), 'create', 'Creación de nuevo usuario', '192.168.1.101', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW()),
    (gen_random_uuid()::TEXT, 'default', (SELECT id FROM "User" WHERE email = 'usuario@contab.com'), 'permission_change', 'Cambio de rol a usuario', '192.168.1.102', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW()),
    (gen_random_uuid()::TEXT, 'default', (SELECT id FROM "User" WHERE email = 'inactivo@contab.com'), 'logout', 'Cierre de sesión de usuario inactivo', '192.168.1.103', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', NOW());

-- Insertar registros de respaldo de ejemplo (opcional)
INSERT INTO "BackupRecord" (id, tenantId, userId, type, description, fileName, fileSize, status, createdAt, completedAt) VALUES
    (gen_random_uuid()::TEXT, 'default', (SELECT id FROM "User" WHERE email = 'admin@contab.com'), 'MANUAL', 'Respaldo manual completo del sistema', 'backup_completo_2025_03_28.sql', 52428800, 'COMPLETED', NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'default', (SELECT id FROM "User" WHERE email = 'admin@contab.com'), 'AUTOMATIC', 'Respaldo automático programado', 'backup_automatico_2025_03_28.sql', 104857600, 'COMPLETED', NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'default', (SELECT id FROM "User" WHERE email = 'gerente@contab.com'), 'SCHEDULED', 'Respaldo programado semanal', 'backup_semanal_2025_03_28.sql', 26214400, 'COMPLETED', NOW(), NOW()),
    (gen_random_uuid()::TEXT, 'default', (SELECT id FROM "User" WHERE email = 'usuario@contab.com'), 'MANUAL', 'Respaldo manual de datos de prueba', 'backup_prueba_2025_03_28.sql', 1048576, 'PENDING', NOW(), NULL);

-- Tabla Customer (Clientes)
CREATE TABLE IF NOT EXISTS "Customer" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    rtn TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    creditLimit BIGINT DEFAULT 0,
    currentBalance BIGINT DEFAULT 0,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    UNIQUE(rtn, tenantId)
);

-- Tabla Invoice (Facturas)
CREATE TABLE IF NOT EXISTS "Invoice" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    customerId TEXT,
    invoiceNumber TEXT NOT NULL,
    date DATE NOT NULL,
    dueDate DATE,
    subtotal BIGINT NOT NULL,
    taxAmount BIGINT NOT NULL,
    totalAmount BIGINT NOT NULL,
    status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED')),
    currency TEXT DEFAULT 'HNL',
    exchangeRate DECIMAL(10,4) DEFAULT 24.70,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    UNIQUE(invoiceNumber, tenantId),
    FOREIGN KEY (customerId) REFERENCES "Customer"(id)
);

-- Tabla InvoiceItem (Detalles de Factura)
CREATE TABLE IF NOT EXISTS "InvoiceItem" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    invoiceId TEXT NOT NULL,
    accountId TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(12,4) NOT NULL,
    unitPrice BIGINT NOT NULL,
    taxRate DECIMAL(5,4) NOT NULL,
    taxAmount BIGINT NOT NULL,
    totalAmount BIGINT NOT NULL,
    createdAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (invoiceId) REFERENCES "Invoice"(id),
    FOREIGN KEY (accountId) REFERENCES "Account"(id)
);

-- Tabla Product (Productos)
CREATE TABLE IF NOT EXISTS "Product" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    code TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    category TEXT,
    unit TEXT,
    currentStock DECIMAL(12,4) DEFAULT 0,
    minStock DECIMAL(12,4) DEFAULT 0,
    maxStock DECIMAL(12,4),
    unitCost BIGINT DEFAULT 0,
    unitPrice BIGINT DEFAULT 0,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    UNIQUE(code, tenantId)
);

-- Tabla InventoryTransaction (Movimientos de Inventario)
CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    productId TEXT NOT NULL,
    transactionType TEXT NOT NULL CHECK (transactionType IN ('IN', 'OUT')),
    quantity DECIMAL(12,4) NOT NULL,
    unitCost BIGINT NOT NULL,
    totalCost BIGINT NOT NULL,
    reference TEXT,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (productId) REFERENCES "Product"(id)
);

-- Tabla Supplier (Proveedores)
CREATE TABLE IF NOT EXISTS "Supplier" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    rtn TEXT NOT NULL,
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    address TEXT,
    creditLimit BIGINT DEFAULT 0,
    currentBalance BIGINT DEFAULT 0,
    isActive BOOLEAN DEFAULT true,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    UNIQUE(rtn, tenantId)
);

-- Tabla PurchaseOrder (Órdenes de Compra)
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    supplierId TEXT NOT NULL,
    orderNumber TEXT NOT NULL,
    orderDate DATE NOT NULL,
    expectedDate DATE NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('DRAFT', 'SENT', 'RECEIVED', 'PARTIAL', 'PAID', 'CANCELLED')),
    subtotal BIGINT DEFAULT 0,
    taxAmount BIGINT DEFAULT 0,
    totalAmount BIGINT DEFAULT 0,
    notes TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (supplierId) REFERENCES "Supplier"(id)
);

-- Tabla PurchaseOrderItem (Items de Órdenes de Compra)
CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    purchaseOrderId TEXT NOT NULL,
    productId TEXT NOT NULL,
    description TEXT NOT NULL,
    quantity DECIMAL(12,4) NOT NULL,
    unitPrice BIGINT NOT NULL,
    taxRate DECIMAL(5,4) NOT NULL,
    taxAmount BIGINT NOT NULL,
    totalAmount BIGINT NOT NULL,
    createdAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (purchaseOrderId) REFERENCES "PurchaseOrder"(id),
    FOREIGN KEY (productId) REFERENCES "Product"(id)
);

-- Tabla AccountPayable (Cuentas por Pagar)
CREATE TABLE IF NOT EXISTS "AccountPayable" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    supplierId TEXT NOT NULL,
    purchaseOrderId TEXT,
    amount BIGINT NOT NULL,
    paidAmount BIGINT DEFAULT 0,
    balanceAmount BIGINT GENERATED ALWAYS AS (amount - paidAmount) STORED,
    dueDate DATE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID')),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (supplierId) REFERENCES "Supplier"(id),
    FOREIGN KEY (purchaseOrderId) REFERENCES "PurchaseOrder"(id)
);

-- Tabla AccountReceivable (Cuentas por Cobrar)
CREATE TABLE IF NOT EXISTS "AccountReceivable" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    customerId TEXT NOT NULL,
    invoiceId TEXT,
    amount BIGINT NOT NULL,
    paidAmount BIGINT DEFAULT 0,
    balanceAmount BIGINT GENERATED ALWAYS AS (amount - paidAmount) STORED,
    dueDate DATE,
    status TEXT DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PARTIAL', 'PAID')),
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    FOREIGN KEY (customerId) REFERENCES "Customer"(id),
    FOREIGN KEY (invoiceId) REFERENCES "Invoice"(id)
);

-- Tabla Transaction (Transacciones/Pólizas)
CREATE TABLE IF NOT EXISTS "Transaction" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    tenantId TEXT,
    date DATE NOT NULL,
    description TEXT NOT NULL,
    reference TEXT,
    voucherType TEXT NOT NULL CHECK (voucherType IN ('INGRESO', 'EGRESO', 'DIARIO', 'AJUSTE')),
    voucherNumber INTEGER NOT NULL,
    currency TEXT DEFAULT 'HNL',
    exchangeRate DECIMAL(10,4) DEFAULT 24.70,
    totalAmount BIGINT NOT NULL,
    clienteRTN TEXT,
    proveedorRTN TEXT,
    createdAt TIMESTAMP DEFAULT NOW(),
    updatedAt TIMESTAMP DEFAULT NOW(),
    UNIQUE(voucherType, voucherNumber, tenantId)
);

-- Tabla JournalEntry (Asientos Contables)
CREATE TABLE IF NOT EXISTS "JournalEntry" (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    transactionId TEXT NOT NULL,
    accountId TEXT NOT NULL,
    tenantId TEXT,
    amount BIGINT NOT NULL,
    originalAmount BIGINT NOT NULL,
    currency TEXT DEFAULT 'HNL',
    exchangeRate DECIMAL(10,4) DEFAULT 24.70,
    description TEXT,
    cleared BOOLEAN DEFAULT false,
    createdAt TIMESTAMP DEFAULT NOW()
);

-- =====================================================
-- 2. ÍNDICES PARA RENDIMIENTO
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_account_tenant ON "Account"("tenantId");
CREATE INDEX IF NOT EXISTS idx_account_code ON "Account"(code);
CREATE INDEX IF NOT EXISTS idx_account_type ON "Account"(type);

CREATE INDEX IF NOT EXISTS idx_product_tenant ON "Product"("tenantId");
CREATE INDEX IF NOT EXISTS idx_product_code ON "Product"(code);
CREATE INDEX IF NOT EXISTS idx_product_category ON "Product"(category);
CREATE INDEX IF NOT EXISTS idx_product_active ON "Product"(isActive);

CREATE INDEX IF NOT EXISTS idx_inventory_transaction_tenant ON "InventoryTransaction"("tenantId");
CREATE INDEX IF NOT EXISTS idx_inventory_transaction_product ON "InventoryTransaction"("productId");
CREATE INDEX IF NOT EXISTS idx_inventory_transaction_type ON "InventoryTransaction"("transactionType");
CREATE INDEX IF NOT EXISTS idx_inventory_transaction_date ON "InventoryTransaction"("createdAt");

CREATE INDEX IF NOT EXISTS idx_supplier_tenant ON "Supplier"("tenantId");
CREATE INDEX IF NOT EXISTS idx_supplier_rtn ON "Supplier"(rtn);
CREATE INDEX IF NOT EXISTS idx_supplier_active ON "Supplier"(isActive);

CREATE INDEX IF NOT EXISTS idx_purchase_order_tenant ON "PurchaseOrder"("tenantId");
CREATE INDEX IF NOT EXISTS idx_purchase_order_supplier ON "PurchaseOrder"(supplierId);
CREATE INDEX IF NOT EXISTS idx_purchase_order_status ON "PurchaseOrder"(status);
CREATE INDEX IF NOT EXISTS idx_purchase_order_date ON "PurchaseOrder"(orderDate);

CREATE INDEX IF NOT EXISTS idx_purchase_order_item_tenant ON "PurchaseOrderItem"("tenantId");
CREATE INDEX IF NOT EXISTS idx_purchase_order_item_order ON "PurchaseOrderItem"(purchaseOrderId);
CREATE INDEX IF NOT EXISTS idx_purchase_order_item_product ON "PurchaseOrderItem"(productId);

CREATE INDEX IF NOT EXISTS idx_account_payable_tenant ON "AccountPayable"("tenantId");
CREATE INDEX IF NOT EXISTS idx_account_payable_supplier ON "AccountPayable"(supplierId);
CREATE INDEX IF NOT EXISTS idx_account_payable_status ON "AccountPayable"(status);
CREATE INDEX IF NOT EXISTS idx_account_payable_due_date ON "AccountPayable"(dueDate);

-- =====================================================
-- 3. ROW LEVEL SECURITY (RLS)
-- =====================================================

ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountReceivable" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InventoryTransaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PurchaseOrderItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "AccountPayable" ENABLE ROW LEVEL SECURITY;

-- Eliminar políticas existentes
DROP POLICY IF EXISTS "Tenant isolation" ON "Account";
DROP POLICY IF EXISTS "Tenant isolation" ON "Transaction";
DROP POLICY IF EXISTS "Tenant isolation" ON "JournalEntry";
DROP POLICY IF EXISTS "Tenant isolation" ON "Customer";
DROP POLICY IF EXISTS "Tenant isolation" ON "Invoice";
DROP POLICY IF EXISTS "Tenant isolation" ON "InvoiceItem";
DROP POLICY IF EXISTS "Tenant isolation" ON "AccountReceivable";
DROP POLICY IF EXISTS "Tenant isolation" ON "Product";
DROP POLICY IF EXISTS "Tenant isolation" ON "InventoryTransaction";
DROP POLICY IF EXISTS "Tenant isolation" ON "Supplier";
DROP POLICY IF EXISTS "Tenant isolation" ON "PurchaseOrder";
DROP POLICY IF EXISTS "Tenant isolation" ON "PurchaseOrderItem";
DROP POLICY IF EXISTS "Tenant isolation" ON "AccountPayable";

CREATE POLICY "Tenant isolation" ON "Account"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "Transaction"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "JournalEntry"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "Supplier"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "PurchaseOrder"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "PurchaseOrderItem"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "AccountPayable"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "Customer"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "Invoice"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "InvoiceItem"
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM "Invoice" i 
        WHERE i.id = "InvoiceItem".invoiceId 
        AND i."tenantId" = current_setting('app.current_tenant_id', true)
    ));

CREATE POLICY "Tenant isolation" ON "AccountReceivable"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "Product"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Tenant isolation" ON "InventoryTransaction"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- =====================================================
-- 4. FUNCIONES AUXILIARES
-- =====================================================

-- Función para establecer el tenant actual (usada por la aplicación)
CREATE OR REPLACE FUNCTION set_tenant(tenant_id TEXT)
RETURNS VOID AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', tenant_id, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el tenant actual
CREATE OR REPLACE FUNCTION get_current_tenant()
RETURNS TEXT AS $$
BEGIN
    RETURN current_setting('app.current_tenant_id', true);
END;
$$ LANGUAGE plpgsql;

-- =====================================================
-- 5. VISTAS CONTABLES (LIBROS FISCALES)
-- =====================================================

-- Eliminar vistas si existen
DROP VIEW IF EXISTS libro_ventas;
DROP VIEW IF EXISTS libro_compras;
DROP VIEW IF EXISTS estado_resultados;
DROP VIEW IF EXISTS balance_general;
DROP VIEW IF EXISTS libro_mayor;
DROP VIEW IF EXISTS libro_diario;

-- LIBRO DIARIO: Todas las transacciones con sus asientos
CREATE OR REPLACE VIEW libro_diario AS
SELECT
    t.id as transaction_id,
    DATE(t.date) as fecha,
    t."voucherType" as tipo_comprobante,
    t."voucherNumber" as numero_comprobante,
    t.description as descripcion,
    te.businessname as empresa,
    a.code as codigo_cuenta,
    a.name as nombre_cuenta,
    CASE WHEN je.amount > 0 THEN je.amount / 100.0 ELSE 0 END as debe,
    CASE WHEN je.amount < 0 THEN ABS(je.amount) / 100.0 ELSE 0 END as haber,
    t.currency as moneda,
    t."exchangeRate" as tipo_cambio
FROM "Transaction" t
JOIN "JournalEntry" je ON t.id = je."transactionId"
JOIN "Account" a ON je."accountId" = a.id
JOIN "Tenant" te ON t."tenantId" = te.id
ORDER BY t.date, t."voucherNumber", a.code;

-- LIBRO MAYOR: Saldos acumulados por cuenta
CREATE OR REPLACE VIEW libro_mayor AS
SELECT
    a.code as codigo_cuenta,
    a.name as nombre_cuenta,
    a.type as tipo_cuenta,
    SUM(CASE WHEN je.amount > 0 THEN je.amount / 100.0 ELSE 0 END) as total_debe,
    SUM(CASE WHEN je.amount < 0 THEN ABS(je.amount) / 100.0 ELSE 0 END) as total_haber,
    SUM(je.amount) / 100.0 as saldo,
    te.businessname as empresa
FROM "Account" a
JOIN "JournalEntry" je ON a.id = je."accountId"
JOIN "Transaction" t ON je."transactionId" = t.id
JOIN "Tenant" te ON a."tenantId" = te.id
GROUP BY a.id, a.code, a.name, a.type, te.businessname
ORDER BY a.code;

-- BALANCE GENERAL: Activos, Pasivos y Patrimonio
CREATE OR REPLACE VIEW balance_general AS
-- Activos Corrientes (códigos 1xxx)
SELECT
    'ACTIVO CORRIENTE' as categoria,
    a.code as codigo_cuenta,
    a.name as nombre_cuenta,
    SUM(je.amount) / 100.0 as saldo,
    te.businessname as empresa
FROM "Account" a
JOIN "JournalEntry" je ON a.id = je."accountId"
JOIN "Transaction" t ON je."transactionId" = t.id
JOIN "Tenant" te ON a."tenantId" = te.id
WHERE a.type = 'ASSET' AND a.code LIKE '1%' AND a."tenantId" = current_setting('app.current_tenant_id', true)
GROUP BY a.id, a.code, a.name, te.businessname

UNION ALL

-- Activos No Corrientes (códigos 2xxx)
SELECT
    'ACTIVO NO CORRIENTE' as categoria,
    a.code as codigo_cuenta,
    a.name as nombre_cuenta,
    SUM(je.amount) / 100.0 as saldo,
    te.businessname as empresa
FROM "Account" a
JOIN "JournalEntry" je ON a.id = je."accountId"
JOIN "Transaction" t ON je."transactionId" = t.id
JOIN "Tenant" te ON a."tenantId" = te.id
WHERE a.type = 'ASSET' AND a.code LIKE '2%' AND a."tenantId" = current_setting('app.current_tenant_id', true)
GROUP BY a.id, a.code, a.name, te.businessname

UNION ALL

-- Pasivos (códigos 3xxx)
SELECT
    'PASIVO CORRIENTE' as categoria,
    a.code as codigo_cuenta,
    a.name as nombre_cuenta,
    SUM(je.amount) / 100.0 as saldo,
    te.businessname as empresa
FROM "Account" a
JOIN "JournalEntry" je ON a.id = je."accountId"
JOIN "Transaction" t ON je."transactionId" = t.id
JOIN "Tenant" te ON a."tenantId" = te.id
WHERE a.type = 'LIABILITY' AND a."tenantId" = current_setting('app.current_tenant_id', true)
GROUP BY a.id, a.code, a.name, te.businessname

UNION ALL

-- Patrimonio (códigos 4xxx)
SELECT
    'PATRIMONIO' as categoria,
    a.code as codigo_cuenta,
    a.name as nombre_cuenta,
    SUM(je.amount) / 100.0 as saldo,
    te.businessname as empresa
FROM "Account" a
JOIN "JournalEntry" je ON a.id = je."accountId"
JOIN "Transaction" t ON je."transactionId" = t.id
JOIN "Tenant" te ON a."tenantId" = te.id
WHERE a.type = 'EQUITY' AND a."tenantId" = current_setting('app.current_tenant_id', true)
GROUP BY a.id, a.code, a.name, te.businessname

ORDER BY categoria, codigo_cuenta;

-- ESTADO DE RESULTADOS: Ingresos y Gastos
CREATE OR REPLACE VIEW estado_resultados AS
-- Ingresos (códigos 5xxx)
SELECT
    'INGRESOS' as categoria,
    a.code as codigo_cuenta,
    a.name as nombre_cuenta,
    SUM(CASE WHEN je.amount < 0 THEN ABS(je.amount) / 100.0 ELSE 0 END) as monto,
    te.businessname as empresa
FROM "Account" a
JOIN "JournalEntry" je ON a.id = je."accountId"
JOIN "Transaction" t ON je."transactionId" = t.id
JOIN "Tenant" te ON a."tenantId" = te.id
WHERE a.type = 'REVENUE'
GROUP BY a.id, a.code, a.name, te.businessname

UNION ALL

-- Gastos (códigos 6xxx)
SELECT
    'GASTOS' as categoria,
    a.code as codigo_cuenta,
    a.name as nombre_cuenta,
    SUM(CASE WHEN je.amount > 0 THEN je.amount / 100.0 ELSE 0 END) as monto,
    te.businessname as empresa
FROM "Account" a
JOIN "JournalEntry" je ON a.id = je."accountId"
JOIN "Transaction" t ON je."transactionId" = t.id
JOIN "Tenant" te ON a."tenantId" = te.id
WHERE a.type = 'EXPENSE'
GROUP BY a.id, a.code, a.name, te.businessname

ORDER BY categoria, codigo_cuenta;

-- LIBRO DE COMPRAS: Para IVA Crédito Fiscal
CREATE OR REPLACE VIEW libro_compras AS
SELECT
    DATE(t.date) as fecha,
    t."voucherNumber" as numero_factura,
    t."proveedorRTN" as rtn_proveedor,
    t.description as descripcion_compra,
    t."totalAmount" / 100.0 as monto_compra,
    ROUND((t."totalAmount" / 100.0) * 0.15, 2) as credito_fiscal,
    CASE
        WHEN t."totalAmount" > 100000 THEN ROUND((t."totalAmount" / 100.0) * 0.15 * 0.46, 2)
        ELSE 0
    END as cf_pendiente,
    te.businessname as empresa,
    t.currency as moneda
FROM "Transaction" t
JOIN "Tenant" te ON t."tenantId" = te.id
WHERE t."voucherType" = 'EGRESO'
    AND t."proveedorRTN" IS NOT NULL
ORDER BY t.date;

-- LIBRO DE VENTAS: Para IVA Débito Fiscal
CREATE OR REPLACE VIEW libro_ventas AS
SELECT
    DATE(t.date) as fecha,
    t."voucherNumber" as numero_factura,
    t."clienteRTN" as rtn_cliente,
    t.description as descripcion_venta,
    t."totalAmount" / 100.0 as monto_venta,
    ROUND((t."totalAmount" / 100.0) * 0.15, 2) as debito_fiscal,
    CASE
        WHEN t."totalAmount" > 100000 THEN ROUND((t."totalAmount" / 100.0) * 0.15 * 0.31, 2)
        ELSE 0
    END as df_pendiente,
    te.businessname as empresa,
    t.currency as moneda
FROM "Transaction" t
JOIN "Tenant" te ON t."tenantId" = te.id
WHERE t."voucherType" = 'INGRESO'
    AND t."clienteRTN" IS NOT NULL
ORDER BY t.date;

-- =====================================================
-- 7. FUNCIONES RPC PARA LA APLICACIÓN
-- =====================================================

-- Función RPC para crear transacciones contables completas (optimizada)
CREATE OR REPLACE FUNCTION create_accounting_transaction(
  p_tenant_id TEXT,
  p_date DATE,
  p_description TEXT,
  p_voucher_type TEXT,
  p_voucher_number INTEGER,
  p_total_amount BIGINT,
  p_entries JSONB -- Array de objetos: {account_id, amount, description}
)
RETURNS TEXT AS $$
DECLARE
  v_transaction_id TEXT;
  v_entry_sum BIGINT := 0;
  v_item JSONB;
BEGIN
  -- 1. Validar que el asiento esté cuadrado
  -- Debe (+) y Haber (-) deben sumar cero.
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    v_entry_sum := v_entry_sum + (v_item->>'amount')::BIGINT;
  END LOOP;

  IF v_entry_sum != 0 THEN
    RAISE EXCEPTION 'El asiento contable no está cuadrado. La diferencia es % centavos', v_entry_sum;
  END IF;

  -- 2. Insertar la Cabecera de la Transacción
  INSERT INTO "Transaction" (
    "tenantId", 
    "date", 
    "description", 
    "voucherType", 
    "voucherNumber", 
    "totalAmount"
  ) VALUES (
    p_tenant_id, 
    p_date, 
    p_description, 
    p_voucher_type, 
    p_voucher_number, 
    p_total_amount
  ) RETURNING id INTO v_transaction_id;

  -- 3. Insertar los detalles (Journal Entries)
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_entries)
  LOOP
    INSERT INTO "JournalEntry" (
      "transactionId", 
      "accountId", 
      "tenantId", 
      "amount", 
      "originalAmount", 
      "description"
    ) VALUES (
      v_transaction_id,
      (v_item->>'account_id')::TEXT,
      p_tenant_id,
      (v_item->>'amount')::BIGINT,
      ABS((v_item->>'amount')::BIGINT),
      COALESCE(v_item->>'description', p_description)
    );
  END LOOP;

  RETURN v_transaction_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función simplificada para obtener cuentas por tenant
CREATE OR REPLACE FUNCTION get_accounts_by_tenant(p_tenant_id TEXT)
RETURNS TABLE(
    id TEXT,
    code TEXT,
    name TEXT,
    type TEXT,
    description TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM set_config('app.current_tenant_id', p_tenant_id, false);
    
    RETURN QUERY
    SELECT 
        a.id, a.code, a.name, a.type, a.description
    FROM "Account" a
    WHERE a.tenantId = p_tenant_id
    ORDER BY a.code;
END;
$$;
-- =====================================================
-- 8. DATOS INICIALES (CATÁLOGO DE CUENTAS BÁSICO)
-- =====================================================

-- Insertar cuentas contables básicas (opcional)
-- Descomenta si quieres crear cuentas por defecto:

-- ACTIVOS (1xxx)
INSERT INTO "Account" (id, code, name, type, description, tenantId) VALUES
    (gen_random_uuid()::TEXT, '1101', 'Caja', 'ASSET', 'Efectivo en caja y bancos', 'default'),
    (gen_random_uuid()::TEXT, '1102', 'Bancos', 'ASSET', 'Cuentas bancarias', 'default'),
    (gen_random_uuid()::TEXT, '1103', 'Clientes', 'ASSET', 'Cuentas por cobrar', 'default'),
    (gen_random_uuid()::TEXT, '1104', 'Inventario', 'ASSET', 'Mercancía', 'default'),
    (gen_random_uuid()::TEXT, '1105', 'Propiedades, Planta y Equipo', 'ASSET', 'NO DEPRECIABLE', 'default'),
    (gen_random_uuid()::TEXT, '1201', 'Mobiliario y Equipo', 'ASSET', 'NO DEPRECIABLE', 'default'),
    (gen_random_uuid()::TEXT, '2101', 'Proveedor', 'LIABILITY', 'Cuentas por pagar', 'default'),
    (gen_random_uuid()::TEXT, '2102', 'Impuestos por Pagar', 'LIABILITY', 'default'),
    (gen_random_uuid()::TEXT, '3101', 'Capital Social', 'EQUITY', 'PATRIMONIO', 'default'),
    (gen_random_uuid()::TEXT, '3201', 'Utilidades Retenidas', 'EQUITY', 'PATRIMONIO', 'default'),
    (gen_random_uuid()::TEXT, '4101', 'Ventas', 'REVENUE', 'INGRESO', 'default'),
    (gen_random_uuid()::TEXT, '4102', 'Costo de Ventas', 'EXPENSE', 'default'),
    (gen_random_uuid()::TEXT, '5101', 'Devoluciones y Devoluciones', 'REVENUE', 'INGRESO', 'default'),
    (gen_random_uuid()::TEXT, '6101', 'Compras', 'EXPENSE', 'default'),
    (gen_random_uuid()::TEXT, '6102', 'Servicios', 'EXPENSE', 'default'),
    (gen_random_uuid()::TEXT, '6203', 'Gastos Operativos', 'EXPENSE', 'default'),
    (gen_random_uuid()::TEXT, '6204', 'Gastos Financieros', 'EXPENSE', 'default');

-- GASTOS (6xxx)
INSERT INTO "Account" (id, code, name, type, description, tenantId) VALUES
    (gen_random_uuid()::TEXT, '6105', 'Impuestos', 'EXPENSE', 'Impuestos pagados', 'default');

-- INSERTAR PROVEEDORES DE EJEMPLO
INSERT INTO "Supplier" (id, tenantId, rtn, name, email, phone, address, creditLimit) VALUES
    (gen_random_uuid()::TEXT, 'default', '0801-1999-00010', 'Office Depot Honduras', 'contacto@officedepot.hn', '+504 1234 5678', 'Boulevard Suyapa, Tegucigalpa', 5000000),
    (gen_random_uuid()::TEXT, 'default', '0801-1999-00020', 'Distribuidora ABC', 'compras@distribuidoraabc.hn', '+504 2222 3333', 'Colonia Miraflores, Tegucigalpa', 3000000),
    (gen_random_uuid()::TEXT, 'default', '0801-1999-00030', 'Tech Solutions SA', 'ventas@techsolutions.hn', '+504 4444 5555', 'Avenida Morazán, San Pedro Sula', 10000000),
    (gen_random_uuid()::TEXT, 'default', '0801-1999-00045', 'Papelería Central', 'info@papeleriacentral.hn', '+504 9999 8888', 'Centro Comercial, San Pedro Sula', 7500000),
    (gen_random_uuid()::TEXT, 'default', '0801-1999-00060', 'Insumos Industriales', 'compras@insumos.hn', '+504 3333 7777', 'Zona Industrial, Cortés', 20000000);


-- =====================================================
-- INSTRUCCIONES DE USO:
-- =====================================================
-- 1. Ejecutar este script en SQL Editor de Supabase
-- 2. Configurar las variables de entorno en .env:
--    NEXT_PUBLIC_SUPABASE_URL=<tu-url>
--    NEXT_PUBLIC_SUPABASE_ANON_KEY=<tu-anon-key>
-- 3. La aplicación usará RLS para aislamiento de datos por empresa
-- 4. Las vistas generan automáticamente los libros contables
-- =====================================================
