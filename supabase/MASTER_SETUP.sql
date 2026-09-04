-- ============================================================
-- CONTAB - MASTER SETUP SQL (Consolidated)
-- ============================================================
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- Reemplaza: FULL_SETUP.sql, FIX_COLUMNS.sql, SUPABASE_COMPLETE.sql
-- Fecha: 2026-09-03
-- ============================================================
-- NOTA: Ejecutar completo. Usa IF NOT EXISTS / ADD COLUMN IF NOT EXISTS
-- para ser idempotente (seguro ejecutar multiples veces).
-- ============================================================


-- ============================================================
-- PASO 0: Eliminar constraints conflictivos
-- ============================================================

-- Account: eliminar unique global si existe (el correcto es por tenant)
DO $$
BEGIN
  -- Eliminar constraint global Account_code_key si existe
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Account_code_key') THEN
    ALTER TABLE "Account" DROP CONSTRAINT "Account_code_key";
  END IF;
  -- Eliminar unique global voucher si existe
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Transaction_voucherType_voucherNumber_key') THEN
    ALTER TABLE "Transaction" DROP CONSTRAINT "Transaction_voucherType_voucherNumber_key";
  END IF;
  -- Eliminar si existe en cualquier forma
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'unique_voucher_global') THEN
    ALTER TABLE "Transaction" DROP CONSTRAINT "unique_voucher_global";
  END IF;
END $$;


-- ============================================================
-- 1. Tenant (empresas/clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Tenant" (
  id                TEXT PRIMARY KEY,
  businessname      TEXT NOT NULL DEFAULT '',
  businessrtn       TEXT UNIQUE NOT NULL DEFAULT '',
  businessemail     TEXT UNIQUE NOT NULL DEFAULT '',
  businessaddress   TEXT NOT NULL DEFAULT '',
  tenant_code       TEXT UNIQUE NOT NULL,
  country           TEXT NOT NULL DEFAULT 'HN',
  phonenumber       TEXT NOT NULL DEFAULT '',
  logourl           TEXT,
  timezone          TEXT NOT NULL DEFAULT 'America/Tegucigalpa',
  currency          TEXT NOT NULL DEFAULT 'HNL',
  subscriptionplan  TEXT NOT NULL DEFAULT 'BASIC',
  maxusers          INTEGER NOT NULL DEFAULT 5,
  maxstorage        INTEGER NOT NULL DEFAULT 100,
  maxtransactions   INTEGER NOT NULL DEFAULT 10000,
  monthlycost       INTEGER NOT NULL DEFAULT 1000,
  modules           TEXT,
  isactive          BOOLEAN NOT NULL DEFAULT true,
  createdat         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedat         TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Columnas adicionales que el código espera
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS paymentmethod TEXT;

-- Columnas snake_case legacy
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS business_name TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS business_rtn TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS business_email TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS business_address TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS phone_number TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS max_users INTEGER;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS max_storage INTEGER;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS max_transactions INTEGER;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS monthly_cost INTEGER;
ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS is_active BOOLEAN;

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role" ON "Tenant";
CREATE POLICY "Allow all for service_role" ON "Tenant" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read tenants" ON "Tenant";
CREATE POLICY "Authenticated users can read tenants" ON "Tenant" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "Tenant" TO service_role;
GRANT SELECT ON "Tenant" TO authenticated;


-- ============================================================
-- 2. Plan (planes de suscripcion)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Plan" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name             TEXT NOT NULL,
  code             TEXT UNIQUE NOT NULL,
  price            INTEGER NOT NULL DEFAULT 0,
  max_users        INTEGER NOT NULL DEFAULT 5,
  max_storage      INTEGER NOT NULL DEFAULT 100,
  max_transactions INTEGER NOT NULL DEFAULT 10000,
  features         TEXT NOT NULL DEFAULT '[]',
  modules          TEXT NOT NULL DEFAULT '[]',
  is_active        BOOLEAN NOT NULL DEFAULT true,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "Plan" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role" ON "Plan";
CREATE POLICY "Allow all for service_role" ON "Plan" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read plans" ON "Plan";
CREATE POLICY "Authenticated users can read plans" ON "Plan" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "Plan" TO service_role;
GRANT SELECT ON "Plan" TO authenticated;


-- ============================================================
-- 3. User (PascalCase - tabla principal de usuarios)
-- ============================================================
CREATE TABLE IF NOT EXISTS "User" (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email        TEXT NOT NULL,
  authid       TEXT,
  firstname    TEXT NOT NULL DEFAULT '',
  lastname     TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'USER',
  isactive     BOOLEAN NOT NULL DEFAULT true,
  phone        TEXT,
  tenantid     TEXT,
  passwordhash TEXT,
  permissions  TEXT,
  createdat    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedat    TIMESTAMPTZ NOT NULL DEFAULT now(),
  lastloginat  TIMESTAMPTZ,
  lastlogin    TIMESTAMPTZ,
  passwordresettoken TEXT,
  passwordresetexpires TIMESTAMPTZ,
  emailverified BOOLEAN DEFAULT false,
  avatarurl    TEXT
);

CREATE INDEX IF NOT EXISTS idx_user_email ON "User" (email);
CREATE INDEX IF NOT EXISTS idx_user_tenant ON "User" (tenantid);
CREATE INDEX IF NOT EXISTS idx_user_authid ON "User" (authid);
CREATE INDEX IF NOT EXISTS idx_user_role ON "User" (role);

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on User" ON "User";
CREATE POLICY "Allow all for service_role on User" ON "User" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read User" ON "User";
CREATE POLICY "Authenticated users can read User" ON "User" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "User" TO service_role;
GRANT SELECT, INSERT, UPDATE ON "User" TO authenticated;


-- ============================================================
-- 4. users (lowercase - tabla de perfil extendido)
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  username     TEXT,
  auth_id      TEXT,
  first_name   TEXT NOT NULL DEFAULT '',
  last_name    TEXT NOT NULL DEFAULT '',
  firstname    TEXT,
  lastname     TEXT,
  role         TEXT NOT NULL DEFAULT 'USER',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  is_verified  BOOLEAN DEFAULT false,
  password     TEXT,
  tenant_id    TEXT,
  tenantid     TEXT,
  phone        TEXT,
  company      TEXT,
  department   TEXT,
  timezone     TEXT,
  language     TEXT,
  preferred_language TEXT,
  email_notifications BOOLEAN DEFAULT true,
  push_notifications  BOOLEAN DEFAULT true,
  two_factor_enabled  BOOLEAN DEFAULT false,
  avatar_url   TEXT,
  subscription_plan TEXT,
  api_access   BOOLEAN DEFAULT false,
  email_verified BOOLEAN DEFAULT false,
  email_verified_at TIMESTAMPTZ,
  last_sign_in_at   TIMESTAMPTZ,
  last_login_at     TIMESTAMPTZ,
  last_login_ip     TEXT,
  locked_until      TIMESTAMPTZ,
  failed_login_attempts INTEGER DEFAULT 0,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenantid ON users (tenantid);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on users" ON users;
CREATE POLICY "Allow all for service_role on users" ON users FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read users" ON users;
CREATE POLICY "Authenticated users can read users" ON users FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON users TO service_role;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;


-- ============================================================
-- 5. Account (cuentas contables)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Account" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL,
  tenantid    TEXT NOT NULL,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  type        TEXT NOT NULL,
  description TEXT,
  parent_id   TEXT,
  parentId    TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  isactive    BOOLEAN,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  createdat   TIMESTAMPTZ,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedat   TIMESTAMPTZ
);

-- Constraint correcto: unique por tenant (no global)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('unique_code_tenant', 'unique_account_code_per_tenant')) THEN
    ALTER TABLE "Account" ADD CONSTRAINT unique_code_tenant UNIQUE (code, tenant_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_account_tenant ON "Account" (tenant_id);

ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on Account" ON "Account";
CREATE POLICY "Allow all for service_role on Account" ON "Account" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read Account" ON "Account";
CREATE POLICY "Authenticated users can read Account" ON "Account" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "Account" TO service_role;
GRANT SELECT ON "Account" TO authenticated;


-- ============================================================
-- 6. Transaction (transacciones contables)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Transaction" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id      TEXT NOT NULL,
  tenantid       TEXT NOT NULL,
  date           TIMESTAMPTZ NOT NULL DEFAULT now(),
  description    TEXT NOT NULL DEFAULT '',
  reference      TEXT,
  voucher_type   TEXT NOT NULL,
  voucherType    TEXT,
  voucher_number INTEGER NOT NULL,
  voucherNumber  INTEGER,
  type           TEXT,
  currency       TEXT NOT NULL DEFAULT 'HNL',
  exchange_rate  NUMERIC NOT NULL DEFAULT 24.70,
  exchangeRate   NUMERIC,
  total_amount   BIGINT NOT NULL DEFAULT 0,
  totalAmount    BIGINT,
  totalamount    BIGINT,
  functionalCurrency TEXT,
  functionalAmount BIGINT,
  functionalamount BIGINT,
  originalTotal  BIGINT,
  originaltotal  BIGINT,
  cliente_rtn    TEXT,
  clienteRTN     TEXT,
  proveedor_rtn  TEXT,
  proveedorRTN   TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  createdat      TIMESTAMPTZ,
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedat      TIMESTAMPTZ
);

-- Constraint: unique por tipo + numero + tenant (NO global)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('unique_voucher_tenant', 'Transaction_voucherType_voucherNumber_tenant_id_key')) THEN
    ALTER TABLE "Transaction" ADD CONSTRAINT unique_voucher_tenant UNIQUE (voucher_type, voucher_number, tenant_id);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transaction_tenant ON "Transaction" (tenant_id);

ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on Transaction" ON "Transaction";
CREATE POLICY "Allow all for service_role on Transaction" ON "Transaction" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read Transaction" ON "Transaction";
CREATE POLICY "Authenticated users can read Transaction" ON "Transaction" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "Transaction" TO service_role;
GRANT SELECT ON "Transaction" TO authenticated;


-- ============================================================
-- 7. JournalEntry (asientos contables)
-- ============================================================
CREATE TABLE IF NOT EXISTS "JournalEntry" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transaction_id  TEXT NOT NULL,
  transactionId   TEXT,
  account_id      TEXT NOT NULL,
  accountId       TEXT,
  tenant_id       TEXT NOT NULL,
  tenantid        TEXT NOT NULL,
  amount          BIGINT NOT NULL DEFAULT 0,
  original_amount BIGINT NOT NULL DEFAULT 0,
  originalAmount  BIGINT,
  originalamount  BIGINT,
  currency        TEXT NOT NULL DEFAULT 'HNL',
  exchange_rate   NUMERIC NOT NULL DEFAULT 24.70,
  exchangeRate    NUMERIC,
  exchangerate    NUMERIC,
  description     TEXT,
  type            TEXT,
  cleared         BOOLEAN NOT NULL DEFAULT false,
  reconciliationId TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  createdat       TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_entry_tenant ON "JournalEntry" (tenant_id);
CREATE INDEX IF NOT EXISTS idx_entry_transaction ON "JournalEntry" (transaction_id);
CREATE INDEX IF NOT EXISTS idx_entry_account ON "JournalEntry" (account_id);

ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on JournalEntry" ON "JournalEntry";
CREATE POLICY "Allow all for service_role on JournalEntry" ON "JournalEntry" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read JournalEntry" ON "JournalEntry";
CREATE POLICY "Authenticated users can read JournalEntry" ON "JournalEntry" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "JournalEntry" TO service_role;
GRANT SELECT ON "JournalEntry" TO authenticated;


-- ============================================================
-- 8. Invoice (PascalCase - facturas legacy)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Invoice" (
  id                  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenantid            TEXT NOT NULL,
  invoicenumber       TEXT UNIQUE NOT NULL,
  invoicedate         TEXT NOT NULL,
  duedate             TEXT,
  invoicetype         TEXT NOT NULL DEFAULT 'CUSTOMER',
  customerid          TEXT NOT NULL DEFAULT '',
  customerrtn         TEXT NOT NULL DEFAULT '',
  customername        TEXT NOT NULL DEFAULT '',
  customeremail       TEXT,
  customeraddress     TEXT NOT NULL DEFAULT '',
  issuerrtn           TEXT NOT NULL DEFAULT '',
  issuername          TEXT NOT NULL DEFAULT '',
  issueraddress       TEXT NOT NULL DEFAULT '',
  issuerphone         TEXT,
  issueremail         TEXT,
  cai                 TEXT NOT NULL DEFAULT '',
  rangestart          INTEGER NOT NULL DEFAULT 0,
  rangeend            INTEGER NOT NULL DEFAULT 0,
  expirydate          TEXT,
  establishmentcode   TEXT NOT NULL DEFAULT '0001',
  pointofsalecode     TEXT NOT NULL DEFAULT '0001',
  items               TEXT NOT NULL DEFAULT '[]',
  subtotal            NUMERIC NOT NULL DEFAULT 0,
  tax                 NUMERIC NOT NULL DEFAULT 0,
  totaltax            NUMERIC NOT NULL DEFAULT 0,
  total               NUMERIC NOT NULL DEFAULT 0,
  notes               TEXT,
  currency            TEXT NOT NULL DEFAULT 'HNL',
  taxrate             NUMERIC NOT NULL DEFAULT 15,
  status              TEXT NOT NULL DEFAULT 'ACTIVE',
  invoiceimageurl     TEXT,
  caiid               TEXT,
  createdat           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedat           TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_tenantid ON "Invoice" (tenantid);
CREATE INDEX IF NOT EXISTS idx_invoice_status ON "Invoice" (status);
CREATE INDEX IF NOT EXISTS idx_invoice_date ON "Invoice" (invoicedate);

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on Invoice" ON "Invoice";
CREATE POLICY "Allow all for service_role on Invoice" ON "Invoice" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read Invoice" ON "Invoice";
CREATE POLICY "Authenticated users can read Invoice" ON "Invoice" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "Invoice" TO service_role;
GRANT SELECT ON "Invoice" TO authenticated;


-- ============================================================
-- 9. InvoiceItem (PascalCase - detalles facturas legacy)
-- ============================================================
CREATE TABLE IF NOT EXISTS "InvoiceItem" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoiceid   TEXT NOT NULL,
  planid      TEXT,
  planname    TEXT,
  description TEXT,
  quantity    INTEGER NOT NULL DEFAULT 1,
  unitprice   NUMERIC NOT NULL DEFAULT 0,
  totalamount NUMERIC NOT NULL DEFAULT 0,
  taxrate     NUMERIC NOT NULL DEFAULT 15,
  taxamount   NUMERIC NOT NULL DEFAULT 0,
  total       NUMERIC NOT NULL DEFAULT 0,
  createdat   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoiceitem_invoiceid ON "InvoiceItem" (invoiceid);

ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on InvoiceItem" ON "InvoiceItem";
CREATE POLICY "Allow all for service_role on InvoiceItem" ON "InvoiceItem" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read InvoiceItem" ON "InvoiceItem";
CREATE POLICY "Authenticated users can read InvoiceItem" ON "InvoiceItem" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "InvoiceItem" TO service_role;
GRANT SELECT ON "InvoiceItem" TO authenticated;


-- ============================================================
-- 10. cai (autorizaciones fiscales - lowercase)
-- ============================================================
CREATE TABLE IF NOT EXISTS cai (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cai             TEXT NOT NULL,
  cai_number      TEXT,
  company_id      TEXT,
  start_number    BIGINT NOT NULL DEFAULT 0,
  end_number      BIGINT NOT NULL DEFAULT 0,
  current_number  BIGINT NOT NULL DEFAULT 1,
  current_correlative BIGINT,
  issue_date      TEXT NOT NULL,
  expiration_date TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  tenant_id       TEXT NOT NULL DEFAULT '1',
  fecha_asignacion TEXT,
  fecha_limite_emision TEXT,
  rango_inicial    BIGINT,
  rango_final      BIGINT,
  cantidad_recibos INTEGER,
  recibos_utilizados INTEGER,
  recibos_disponibles INTEGER,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE cai ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on cai" ON cai;
CREATE POLICY "Allow all for service_role on cai" ON cai FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read cai" ON cai;
CREATE POLICY "Authenticated users can read cai" ON cai FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON cai TO service_role;
GRANT SELECT ON cai TO authenticated;


-- ============================================================
-- 11. invoice (facturas - lowercase, billing module)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoice (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_number     TEXT NOT NULL,
  cai                TEXT,
  customer_rtn       TEXT NOT NULL DEFAULT '',
  customer_name      TEXT NOT NULL DEFAULT '',
  customer_email     TEXT,
  customer_phone     TEXT,
  subtotal           BIGINT NOT NULL DEFAULT 0,
  tax_15             BIGINT NOT NULL DEFAULT 0,
  tax_18             BIGINT NOT NULL DEFAULT 0,
  total              BIGINT NOT NULL DEFAULT 0,
  payment_method     TEXT NOT NULL DEFAULT 'cash',
  payment_reference  TEXT,
  status             TEXT NOT NULL DEFAULT 'PAGADA',
  date               TEXT NOT NULL,
  due_date           TEXT,
  notes              TEXT,
  tenant_id          TEXT NOT NULL DEFAULT '1',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoice ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on invoice" ON invoice;
CREATE POLICY "Allow all for service_role on invoice" ON invoice FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read invoice" ON invoice;
CREATE POLICY "Authenticated users can read invoice" ON invoice FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON invoice TO service_role;
GRANT SELECT ON invoice TO authenticated;


-- ============================================================
-- 12. invoiceitem (detalles facturas - lowercase)
-- ============================================================
CREATE TABLE IF NOT EXISTS invoiceitem (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_id    TEXT NOT NULL,
  product_code  TEXT,
  product_name  TEXT NOT NULL DEFAULT '',
  product_description TEXT,
  quantity      NUMERIC NOT NULL DEFAULT 1,
  unit_price    BIGINT NOT NULL DEFAULT 0,
  tax_rate      NUMERIC NOT NULL DEFAULT 15,
  discount      NUMERIC NOT NULL DEFAULT 0,
  subtotal      BIGINT NOT NULL DEFAULT 0,
  tax_amount    BIGINT NOT NULL DEFAULT 0,
  total         BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE invoiceitem ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on invoiceitem" ON invoiceitem;
CREATE POLICY "Allow all for service_role on invoiceitem" ON invoiceitem FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read invoiceitem" ON invoiceitem;
CREATE POLICY "Authenticated users can read invoiceitem" ON invoiceitem FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON invoiceitem TO service_role;
GRANT SELECT ON invoiceitem TO authenticated;


-- ============================================================
-- 13. customer (clientes)
-- ============================================================
CREATE TABLE IF NOT EXISTS customer (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  rtn            TEXT NOT NULL DEFAULT '',
  name           TEXT NOT NULL,
  email          TEXT,
  phone          TEXT,
  address        TEXT,
  credit_limit   NUMERIC NOT NULL DEFAULT 0,
  current_debt   NUMERIC NOT NULL DEFAULT 0,
  is_active      BOOLEAN NOT NULL DEFAULT true,
  tenant_id      TEXT NOT NULL DEFAULT '1',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE customer ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on customer" ON customer;
CREATE POLICY "Allow all for service_role on customer" ON customer FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read customer" ON customer;
CREATE POLICY "Authenticated users can read customer" ON customer FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON customer TO service_role;
GRANT SELECT ON customer TO authenticated;


-- ============================================================
-- 14. Product (PascalCase - productos/inventario principal)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Product" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenantid         TEXT NOT NULL,
  sku              TEXT,
  name             TEXT NOT NULL,
  description      TEXT,
  category         TEXT,
  unit             TEXT,
  cost             BIGINT DEFAULT 0,
  price            BIGINT DEFAULT 0,
  stock            NUMERIC DEFAULT 0,
  current_stock    NUMERIC DEFAULT 0,
  stock_quantity   NUMERIC DEFAULT 0,
  minstock         NUMERIC DEFAULT 0,
  min_stock        NUMERIC DEFAULT 0,
  maxstock         NUMERIC DEFAULT 0,
  max_stock        NUMERIC DEFAULT 0,
  isActive         BOOLEAN DEFAULT true,
  is_active        BOOLEAN DEFAULT true,
  is_service       BOOLEAN DEFAULT false,
  product_type     TEXT DEFAULT 'product',
  valuation_method TEXT DEFAULT 'FIFO',
  tags             TEXT,
  isDiscount       BOOLEAN DEFAULT false,
  discountPrice    BIGINT,
  expirationDate   TEXT,
  promotionStartDate TEXT,
  promotionEndDate TEXT,
  createdby        TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  createdat        TIMESTAMPTZ,
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedat        TIMESTAMPTZ
);

ALTER TABLE "Product" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on Product" ON "Product";
CREATE POLICY "Allow all for service_role on Product" ON "Product" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read Product" ON "Product";
CREATE POLICY "Authenticated users can read Product" ON "Product" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "Product" TO service_role;
GRANT SELECT ON "Product" TO authenticated;


-- ============================================================
-- 15. product (lowercase - tabla principal de inventario)
-- ============================================================
CREATE TABLE IF NOT EXISTS product (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code             TEXT NOT NULL DEFAULT '',
  name             TEXT NOT NULL,
  description      TEXT,
  unit             TEXT DEFAULT 'Unidad',
  unit_price       BIGINT NOT NULL DEFAULT 0,
  current_cost     BIGINT NOT NULL DEFAULT 0,
  tax_rate         NUMERIC NOT NULL DEFAULT 15,
  is_service       BOOLEAN NOT NULL DEFAULT false,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  stock_quantity   NUMERIC NOT NULL DEFAULT 0,
  current_stock    NUMERIC NOT NULL DEFAULT 0,
  min_stock        NUMERIC NOT NULL DEFAULT 0,
  max_stock        NUMERIC NOT NULL DEFAULT 0,
  category         TEXT,
  product_type     TEXT DEFAULT 'product',
  valuation_method TEXT DEFAULT 'weighted_average',
  warehouse_id     TEXT,
  lot_number       TEXT,
  expiration_date  TEXT,
  tenant_id        TEXT NOT NULL DEFAULT '1',
  tenantid         TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE product ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on product" ON product;
CREATE POLICY "Allow all for service_role on product" ON product FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read product" ON product;
CREATE POLICY "Authenticated users can read product" ON product FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON product TO service_role;
GRANT SELECT ON product TO authenticated;


-- ============================================================
-- 16. warehouse (bodegas)
-- ============================================================
CREATE TABLE IF NOT EXISTS warehouse (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL DEFAULT '1',
  code        TEXT NOT NULL DEFAULT '',
  name        TEXT NOT NULL,
  location    TEXT,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE warehouse ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on warehouse" ON warehouse;
CREATE POLICY "Allow all for service_role on warehouse" ON warehouse FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read warehouse" ON warehouse;
CREATE POLICY "Authenticated users can read warehouse" ON warehouse FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON warehouse TO service_role;
GRANT SELECT ON warehouse TO authenticated;


-- ============================================================
-- 17. inventory_movement (movimientos de inventario)
-- ============================================================
CREATE TABLE IF NOT EXISTS inventory_movement (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id     TEXT NOT NULL DEFAULT '1',
  product_id    TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  movement_reason TEXT,
  quantity      NUMERIC NOT NULL,
  unit_cost     BIGINT NOT NULL DEFAULT 0,
  total_cost    BIGINT NOT NULL DEFAULT 0,
  stock_before  NUMERIC,
  stock_after   NUMERIC,
  reference_id  TEXT,
  reference_type TEXT,
  reference_number TEXT,
  lot_number    TEXT,
  expiration_date TEXT,
  reference     TEXT,
  description   TEXT,
  warehouse_id  TEXT,
  notes         TEXT,
  created_by    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movement_product ON inventory_movement (product_id);
CREATE INDEX IF NOT EXISTS idx_movement_tenant ON inventory_movement (tenant_id);

ALTER TABLE inventory_movement ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on inventory_movement" ON inventory_movement;
CREATE POLICY "Allow all for service_role on inventory_movement" ON inventory_movement FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read inventory_movement" ON inventory_movement;
CREATE POLICY "Authenticated users can read inventory_movement" ON inventory_movement FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON inventory_movement TO service_role;
GRANT SELECT ON inventory_movement TO authenticated;


-- ============================================================
-- 18. bankaccount (cuentas bancarias)
-- ============================================================
CREATE TABLE IF NOT EXISTS bankaccount (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type   TEXT NOT NULL DEFAULT 'checking',
  account_holder TEXT,
  currency       TEXT NOT NULL DEFAULT 'HNL',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  tenant_id      TEXT NOT NULL DEFAULT '1',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bankaccount ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on bankaccount" ON bankaccount;
CREATE POLICY "Allow all for service_role on bankaccount" ON bankaccount FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read bankaccount" ON bankaccount;
CREATE POLICY "Authenticated users can read bankaccount" ON bankaccount FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON bankaccount TO service_role;
GRANT SELECT ON bankaccount TO authenticated;


-- ============================================================
-- 19. auditlog (registro de auditoria)
-- ============================================================
CREATE TABLE IF NOT EXISTS auditlog (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tablename     TEXT NOT NULL,
  recordid      TEXT NOT NULL,
  action        TEXT NOT NULL CHECK (action IN ('CREATE', 'UPDATE', 'DELETE')),
  oldvalues     JSONB,
  newvalues     JSONB,
  changedfields JSONB,
  userid        TEXT,
  useragent     TEXT,
  ipaddress     TEXT,
  tenantid      TEXT,
  "timestamp"   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auditlog_timestamp ON auditlog ("timestamp" DESC);
CREATE INDEX IF NOT EXISTS idx_auditlog_tenant    ON auditlog (tenantid);
CREATE INDEX IF NOT EXISTS idx_auditlog_action    ON auditlog (action);
CREATE INDEX IF NOT EXISTS idx_auditlog_tablename ON auditlog (tablename);

ALTER TABLE auditlog ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on auditlog" ON auditlog;
CREATE POLICY "Allow all for service_role on auditlog" ON auditlog FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON auditlog;
CREATE POLICY "Authenticated users can read audit logs" ON auditlog FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON auditlog TO service_role;
GRANT SELECT ON auditlog TO authenticated;


-- ============================================================
-- 20. SupportTicket (tickets de soporte)
-- ============================================================
CREATE TABLE IF NOT EXISTS "SupportTicket" (
  id            TEXT DEFAULT gen_random_uuid()::text PRIMARY KEY,
  subject       TEXT NOT NULL,
  description   TEXT,
  priority      TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  ticket_type   TEXT NOT NULL DEFAULT 'support' CHECK (ticket_type IN ('support', 'bug', 'feature', 'question', 'billing')),
  status        TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  user_email    TEXT NOT NULL DEFAULT '',
  user_name     TEXT,
  tenant_name   TEXT,
  tenant_code   TEXT,
  tenant_id     TEXT,
  assigned_to   TEXT,
  assigned_name TEXT,
  created_by    TEXT,
  comments      TEXT,
  timeline      JSONB DEFAULT '[]'::jsonb,
  attachments   JSONB DEFAULT '[]'::jsonb,
  created_at    TIMESTAMPTZ DEFAULT now(),
  updated_at    TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_support_ticket_status ON "SupportTicket" (status);
CREATE INDEX IF NOT EXISTS idx_support_ticket_priority ON "SupportTicket" (priority);
CREATE INDEX IF NOT EXISTS idx_support_ticket_tenant ON "SupportTicket" (tenant_id);

ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on SupportTicket" ON "SupportTicket";
CREATE POLICY "Allow all for service_role on SupportTicket" ON "SupportTicket" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read support tickets" ON "SupportTicket";
CREATE POLICY "Authenticated users can read support tickets" ON "SupportTicket" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "SupportTicket" TO service_role;
GRANT SELECT, INSERT, UPDATE ON "SupportTicket" TO authenticated;


-- ============================================================
-- 21. company_logos
-- ============================================================
CREATE TABLE IF NOT EXISTS company_logos (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id  TEXT NOT NULL,
  logo_url   TEXT NOT NULL,
  logo_name  TEXT,
  logo_size  INTEGER,
  logo_type  TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname IN ('unique_tenant_logo', 'company_logos_tenant_id_key')) THEN
    ALTER TABLE company_logos ADD CONSTRAINT unique_tenant_logo UNIQUE (tenant_id);
  END IF;
END $$;

ALTER TABLE company_logos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on company_logos" ON company_logos;
CREATE POLICY "Allow all for service_role on company_logos" ON company_logos FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read company_logos" ON company_logos;
CREATE POLICY "Authenticated users can read company_logos" ON company_logos FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON company_logos TO service_role;
GRANT SELECT ON company_logos TO authenticated;


-- ============================================================
-- 22. File (archivos)
-- ============================================================
CREATE TABLE IF NOT EXISTS "File" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id     TEXT NOT NULL,
  tenantId      TEXT,
  original_name TEXT NOT NULL,
  originalName  TEXT,
  file_name     TEXT NOT NULL,
  fileName      TEXT,
  file_path     TEXT NOT NULL,
  filePath      TEXT,
  file_size     INTEGER NOT NULL DEFAULT 0,
  fileSize      INTEGER,
  mime_type     TEXT NOT NULL DEFAULT '',
  mimeType      TEXT,
  file_type     TEXT NOT NULL DEFAULT '',
  fileType      TEXT,
  category      TEXT NOT NULL DEFAULT '',
  description   TEXT,
  tags          TEXT,
  uploaded_by   TEXT NOT NULL DEFAULT '',
  uploadedBy    TEXT,
  status        TEXT NOT NULL DEFAULT 'active',
  metadata      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  createdAt     TIMESTAMPTZ,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedAt     TIMESTAMPTZ,
  deleted_at    TIMESTAMPTZ,
  deletedAt     TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_file_tenant ON "File" (tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_type ON "File" (file_type);
CREATE INDEX IF NOT EXISTS idx_file_category ON "File" (category);
CREATE INDEX IF NOT EXISTS idx_file_status ON "File" (status);
CREATE INDEX IF NOT EXISTS idx_file_created_at ON "File" (created_at);

ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on File" ON "File";
CREATE POLICY "Allow all for service_role on File" ON "File" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read File" ON "File";
CREATE POLICY "Authenticated users can read File" ON "File" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "File" TO service_role;
GRANT SELECT ON "File" TO authenticated;


-- ============================================================
-- 23. ticket_email_logs
-- ============================================================
CREATE TABLE IF NOT EXISTS ticket_email_logs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_id       TEXT NOT NULL,
  email_type      TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'SENT',
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE ticket_email_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on ticket_email_logs" ON ticket_email_logs;
CREATE POLICY "Allow all for service_role on ticket_email_logs" ON ticket_email_logs FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON ticket_email_logs TO service_role;


-- ============================================================
-- 24. CustomTaxes (impuestos personalizados)
-- ============================================================
CREATE TABLE IF NOT EXISTS "CustomTaxes" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  rate        NUMERIC NOT NULL DEFAULT 0,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  tenant_id   TEXT NOT NULL DEFAULT '1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "CustomTaxes" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on CustomTaxes" ON "CustomTaxes";
CREATE POLICY "Allow all for service_role on CustomTaxes" ON "CustomTaxes" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read CustomTaxes" ON "CustomTaxes";
CREATE POLICY "Authenticated users can read CustomTaxes" ON "CustomTaxes" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "CustomTaxes" TO service_role;
GRANT SELECT ON "CustomTaxes" TO authenticated;


-- ============================================================
-- 25. chat_message (mensajes de chat)
-- ============================================================
CREATE TABLE IF NOT EXISTS chat_message (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sender_id   TEXT NOT NULL,
  receiver_id TEXT,
  message     TEXT NOT NULL,
  is_read     BOOLEAN NOT NULL DEFAULT false,
  tenant_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chat_message ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on chat_message" ON chat_message;
CREATE POLICY "Allow all for service_role on chat_message" ON chat_message FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read chat_message" ON chat_message;
CREATE POLICY "Authenticated users can read chat_message" ON chat_message FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON chat_message TO service_role;
GRANT SELECT, INSERT ON chat_message TO authenticated;


-- ============================================================
-- 26. talonarios (talonarios de facturacion)
-- ============================================================
CREATE TABLE IF NOT EXISTS talonarios (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cai_id          TEXT,
  company_id      TEXT,
  numero_talonario TEXT,
  fecha_solicitud TEXT,
  fecha_vencimiento TEXT,
  cantidad_recibos INTEGER,
  recibos_utilizados INTEGER,
  recibos_disponibles INTEGER,
  estado          TEXT,
  cai_code        TEXT NOT NULL DEFAULT '',
  range_start     BIGINT NOT NULL DEFAULT 0,
  range_end       BIGINT NOT NULL DEFAULT 0,
  current_number  BIGINT NOT NULL DEFAULT 1,
  current_correlative BIGINT,
  issue_date      TEXT NOT NULL DEFAULT '',
  expiry_date     TEXT NOT NULL DEFAULT '',
  status          TEXT NOT NULL DEFAULT 'active',
  tenant_id       TEXT NOT NULL DEFAULT '1',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE talonarios ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on talonarios" ON talonarios;
CREATE POLICY "Allow all for service_role on talonarios" ON talonarios FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON talonarios TO service_role;
GRANT SELECT ON talonarios TO authenticated;


-- ============================================================
-- 27. chart_of_accounts (catalogo de cuentas)
-- ============================================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id  TEXT,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  description TEXT,
  parent_code TEXT,
  parent_id   TEXT,
  is_default  BOOLEAN DEFAULT false,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  balance     BIGINT DEFAULT 0,
  nature      TEXT DEFAULT 'DEBIT',
  level       INTEGER DEFAULT 1,
  is_selectable BOOLEAN DEFAULT true,
  currency    TEXT DEFAULT 'HNL',
  fiscal_code TEXT DEFAULT '',
  last_edited_by TEXT DEFAULT '',
  tenant_id   TEXT NOT NULL DEFAULT '1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on chart_of_accounts" ON chart_of_accounts;
CREATE POLICY "Allow all for service_role on chart_of_accounts" ON chart_of_accounts FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON chart_of_accounts TO service_role;
GRANT SELECT ON chart_of_accounts TO authenticated;


-- ============================================================
-- 28. account_audit_log (auditoria de cuentas contables)
-- ============================================================
CREATE TABLE IF NOT EXISTS account_audit_log (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL,
  account_id  TEXT NOT NULL,
  account_code TEXT NOT NULL,
  action      TEXT NOT NULL,
  old_values  JSONB DEFAULT '{}',
  new_values  JSONB DEFAULT '{}',
  performed_by TEXT DEFAULT '',
  performed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE account_audit_log ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on account_audit_log" ON account_audit_log;
CREATE POLICY "Allow all for service_role on account_audit_log" ON account_audit_log FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON account_audit_log TO service_role;
GRANT SELECT ON account_audit_log TO authenticated;


-- ============================================================
-- 29. Supplier (proveedores)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Supplier" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenantid        TEXT,
  tenant_id       TEXT,
  rtn             TEXT NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  creditLimit     BIGINT DEFAULT 0,
  credit_limit    BIGINT DEFAULT 0,
  currentBalance  BIGINT DEFAULT 0,
  current_balance BIGINT DEFAULT 0,
  isActive        BOOLEAN DEFAULT true,
  is_active       BOOLEAN DEFAULT true,
  createdAt       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updatedAt       TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "Supplier" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on Supplier" ON "Supplier";
CREATE POLICY "Allow all for service_role on Supplier" ON "Supplier" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read Supplier" ON "Supplier";
CREATE POLICY "Authenticated users can read Supplier" ON "Supplier" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "Supplier" TO service_role;
GRANT SELECT ON "Supplier" TO authenticated;


-- ============================================================
-- 30. Purchase (compras)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Purchase" (
  id               UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  supplier_id      TEXT NOT NULL,
  supplier_name    TEXT,
  invoice_number   TEXT NOT NULL,
  cai              TEXT,
  invoice_date     TEXT,
  subtotal         NUMERIC DEFAULT 0,
  tax_rate         NUMERIC DEFAULT 15,
  tax_amount       NUMERIC DEFAULT 0,
  total            NUMERIC DEFAULT 0,
  purchase_type    TEXT DEFAULT 'merchandise',
  expense_category TEXT,
  document_url     TEXT,
  is_credit        BOOLEAN DEFAULT false,
  due_date         TEXT,
  status           TEXT DEFAULT 'completed',
  amount_paid      NUMERIC DEFAULT 0,
  balance_due      NUMERIC DEFAULT 0,
  approved_by      TEXT,
  approved_at      TIMESTAMPTZ,
  inventory_movement_id TEXT,
  journal_entry_id TEXT,
  tenant_id        TEXT,
  company_id       TEXT,
  created_by       TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "Purchase" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on Purchase" ON "Purchase";
CREATE POLICY "Allow all for service_role on Purchase" ON "Purchase" FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read Purchase" ON "Purchase";
CREATE POLICY "Authenticated users can read Purchase" ON "Purchase" FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON "Purchase" TO service_role;
GRANT SELECT ON "Purchase" TO authenticated;


-- ============================================================
-- 31. deduction_templates (plantillas de deducciones)
-- ============================================================
CREATE TABLE IF NOT EXISTS deduction_templates (
  id                     TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  company_id             TEXT,
  code                   TEXT NOT NULL,
  name                   TEXT NOT NULL,
  category               TEXT,
  description            TEXT,
  calculation_type       TEXT,
  default_amount         NUMERIC DEFAULT 0,
  default_percentage     NUMERIC DEFAULT 0,
  default_is_recurring   BOOLEAN DEFAULT false,
  allows_installments    BOOLEAN DEFAULT false,
  is_active              BOOLEAN DEFAULT true,
  default_payment_frequency TEXT,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by             TEXT,
  updated_by             TEXT
);

ALTER TABLE deduction_templates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on deduction_templates" ON deduction_templates;
CREATE POLICY "Allow all for service_role on deduction_templates" ON deduction_templates FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON deduction_templates TO service_role;
GRANT SELECT ON deduction_templates TO authenticated;


-- ============================================================
-- 32. system_config (configuracion del sistema)
-- ============================================================
CREATE TABLE IF NOT EXISTS system_config (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  key         TEXT UNIQUE NOT NULL,
  value       TEXT NOT NULL,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  tenant_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on system_config" ON system_config;
CREATE POLICY "Allow all for service_role on system_config" ON system_config FOR ALL USING (auth.role() = 'service_role');
DROP POLICY IF EXISTS "Authenticated users can read system_config" ON system_config;
CREATE POLICY "Authenticated users can read system_config" ON system_config FOR SELECT USING (auth.role() = 'authenticated');
GRANT ALL ON system_config TO service_role;
GRANT SELECT ON system_config TO authenticated;


-- ============================================================
-- 33. PushSubscription (notificaciones push)
-- ============================================================
CREATE TABLE IF NOT EXISTS "PushSubscription" (
  id           TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  endpoint     TEXT NOT NULL,
  p256dh       TEXT NOT NULL,
  auth         TEXT NOT NULL,
  user_id      TEXT,
  tenant_id    TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "PushSubscription" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on PushSubscription" ON "PushSubscription";
CREATE POLICY "Allow all for service_role on PushSubscription" ON "PushSubscription" FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON "PushSubscription" TO service_role;


-- ============================================================
-- 34. FileTemplate (plantillas de archivos)
-- ============================================================
CREATE TABLE IF NOT EXISTS "FileTemplate" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id     TEXT NOT NULL,
  name          TEXT NOT NULL,
  description   TEXT,
  template_type TEXT NOT NULL,
  file_id       TEXT UNIQUE NOT NULL,
  schema        TEXT NOT NULL DEFAULT '{}',
  is_active     BOOLEAN NOT NULL DEFAULT true,
  is_default    BOOLEAN NOT NULL DEFAULT false,
  created_by    TEXT NOT NULL DEFAULT '',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "FileTemplate" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on FileTemplate" ON "FileTemplate";
CREATE POLICY "Allow all for service_role on FileTemplate" ON "FileTemplate" FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON "FileTemplate" TO service_role;


-- ============================================================
-- 35. FileProcessing (procesamiento de archivos)
-- ============================================================
CREATE TABLE IF NOT EXISTS "FileProcessing" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  file_id         TEXT NOT NULL,
  processing_type TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'pending',
  progress        INTEGER NOT NULL DEFAULT 0,
  total_rows      INTEGER,
  processed_rows  INTEGER,
  error_count     INTEGER NOT NULL DEFAULT 0,
  errors          TEXT,
  warnings        TEXT,
  results         TEXT,
  started_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at    TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "FileProcessing" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on FileProcessing" ON "FileProcessing";
CREATE POLICY "Allow all for service_role on FileProcessing" ON "FileProcessing" FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON "FileProcessing" TO service_role;


-- ============================================================
-- 36. FileActivity (actividad de archivos)
-- ============================================================
CREATE TABLE IF NOT EXISTS "FileActivity" (
  id         TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  file_id    TEXT NOT NULL,
  user_id    TEXT NOT NULL DEFAULT '',
  action     TEXT NOT NULL,
  details    TEXT,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE "FileActivity" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on FileActivity" ON "FileActivity";
CREATE POLICY "Allow all for service_role on FileActivity" ON "FileActivity" FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON "FileActivity" TO service_role;


-- ============================================================
-- 37. InventoryTransaction (PascalCase - movimientos inventario)
-- ============================================================
CREATE TABLE IF NOT EXISTS "InventoryTransaction" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenantid        TEXT,
  tenant_id       TEXT,
  productid       TEXT,
  productId       TEXT,
  transactiontype TEXT,
  transactionType TEXT,
  quantity        NUMERIC DEFAULT 0,
  unitcost        BIGINT DEFAULT 0,
  unitCost        BIGINT DEFAULT 0,
  totalcost       BIGINT DEFAULT 0,
  totalCost       BIGINT DEFAULT 0,
  reference       TEXT,
  notes           TEXT,
  createdAt       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "InventoryTransaction" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on InventoryTransaction" ON "InventoryTransaction";
CREATE POLICY "Allow all for service_role on InventoryTransaction" ON "InventoryTransaction" FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON "InventoryTransaction" TO service_role;


-- ============================================================
-- 38. PurchaseOrder (ordenes de compra)
-- ============================================================
CREATE TABLE IF NOT EXISTS "PurchaseOrder" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenantid        TEXT,
  tenant_id       TEXT,
  supplierid      TEXT,
  supplierId      TEXT,
  ordernumber     TEXT,
  orderNumber     TEXT,
  orderdate       DATE,
  orderDate       DATE,
  expecteddate    DATE,
  expectedDate    DATE,
  status          TEXT DEFAULT 'DRAFT',
  subtotal        BIGINT DEFAULT 0,
  taxamount       BIGINT DEFAULT 0,
  taxAmount       BIGINT DEFAULT 0,
  totalamount     BIGINT DEFAULT 0,
  totalAmount     BIGINT DEFAULT 0,
  notes           TEXT,
  createdAt       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updatedAt       TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "PurchaseOrder" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on PurchaseOrder" ON "PurchaseOrder";
CREATE POLICY "Allow all for service_role on PurchaseOrder" ON "PurchaseOrder" FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON "PurchaseOrder" TO service_role;


-- ============================================================
-- 39. PurchaseOrderItem (items de ordenes de compra)
-- ============================================================
CREATE TABLE IF NOT EXISTS "PurchaseOrderItem" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenantid         TEXT,
  tenant_id        TEXT,
  purchaseorderid  TEXT,
  purchaseOrderId  TEXT,
  productid        TEXT,
  productId        TEXT,
  description      TEXT NOT NULL DEFAULT '',
  quantity         NUMERIC DEFAULT 0,
  unitprice        BIGINT DEFAULT 0,
  unitPrice        BIGINT DEFAULT 0,
  taxrate          NUMERIC DEFAULT 0,
  taxRate          NUMERIC DEFAULT 0,
  taxamount        BIGINT DEFAULT 0,
  taxAmount        BIGINT DEFAULT 0,
  totalamount      BIGINT DEFAULT 0,
  totalAmount      BIGINT DEFAULT 0,
  createdAt        TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "PurchaseOrderItem" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on PurchaseOrderItem" ON "PurchaseOrderItem";
CREATE POLICY "Allow all for service_role on PurchaseOrderItem" ON "PurchaseOrderItem" FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON "PurchaseOrderItem" TO service_role;


-- ============================================================
-- 40. AccountPayable (cuentas por pagar)
-- ============================================================
CREATE TABLE IF NOT EXISTS "AccountPayable" (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenantid         TEXT,
  tenant_id        TEXT,
  supplierid       TEXT,
  supplierId       TEXT,
  purchaseorderid  TEXT,
  purchaseOrderId  TEXT,
  amount           BIGINT NOT NULL DEFAULT 0,
  paidamount       BIGINT DEFAULT 0,
  paidAmount       BIGINT DEFAULT 0,
  duedate          DATE,
  dueDate          DATE,
  status           TEXT DEFAULT 'PENDING',
  createdAt        TIMESTAMPTZ DEFAULT now(),
  created_at       TIMESTAMPTZ DEFAULT now(),
  updatedAt        TIMESTAMPTZ DEFAULT now(),
  updated_at       TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "AccountPayable" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on AccountPayable" ON "AccountPayable";
CREATE POLICY "Allow all for service_role on AccountPayable" ON "AccountPayable" FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON "AccountPayable" TO service_role;


-- ============================================================
-- 41. AccountReceivable (cuentas por cobrar)
-- ============================================================
CREATE TABLE IF NOT EXISTS "AccountReceivable" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenantid        TEXT,
  tenant_id       TEXT,
  customerid      TEXT,
  customerId      TEXT,
  invoiceid       TEXT,
  invoiceId       TEXT,
  amount          BIGINT NOT NULL DEFAULT 0,
  paidamount      BIGINT DEFAULT 0,
  paidAmount      BIGINT DEFAULT 0,
  duedate         DATE,
  dueDate         DATE,
  status          TEXT DEFAULT 'PENDING',
  createdAt       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updatedAt       TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "AccountReceivable" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on AccountReceivable" ON "AccountReceivable";
CREATE POLICY "Allow all for service_role on AccountReceivable" ON "AccountReceivable" FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON "AccountReceivable" TO service_role;


-- ============================================================
-- 42. Customer (PascalCase - clientes legacy)
-- ============================================================
CREATE TABLE IF NOT EXISTS "Customer" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenantid        TEXT,
  tenant_id       TEXT,
  rtn             TEXT NOT NULL,
  name            TEXT NOT NULL,
  email           TEXT,
  phone           TEXT,
  address         TEXT,
  creditlimit     BIGINT DEFAULT 0,
  creditLimit     BIGINT DEFAULT 0,
  currentbalance  BIGINT DEFAULT 0,
  currentBalance  BIGINT DEFAULT 0,
  isactive        BOOLEAN DEFAULT true,
  isActive        BOOLEAN DEFAULT true,
  createdAt       TIMESTAMPTZ DEFAULT now(),
  created_at      TIMESTAMPTZ DEFAULT now(),
  updatedAt       TIMESTAMPTZ DEFAULT now(),
  updated_at      TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE "Customer" ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for service_role on Customer" ON "Customer";
CREATE POLICY "Allow all for service_role on Customer" ON "Customer" FOR ALL USING (auth.role() = 'service_role');
GRANT ALL ON "Customer" TO service_role;
GRANT SELECT ON "Customer" TO authenticated;


-- ============================================================
-- DONE - 42 tablas consolidadas
-- ============================================================
-- Resumen:
-- 1.  Tenant          11. Invoice (Pascal)  21. File             31. deduction_templates  41. AccountReceivable
-- 2.  Plan            12. InvoiceItem       22. ticket_email_logs 32. system_config       42. Customer
-- 3.  User            13. cai               23. CustomTaxes      33. PushSubscription
-- 4.  users           14. invoice           24. chat_message     34. FileTemplate
-- 5.  Account         15. invoiceitem       25. talonarios       35. FileProcessing
-- 6.  Transaction     16. customer          26. chart_of_accounts 36. FileActivity
-- 7.  JournalEntry    17. Product           27. account_audit_log 37. InventoryTransaction
-- 8.  InvoiceItem     18. product           28. Supplier         38. PurchaseOrder
-- 9.  cai             19. warehouse         29. Purchase         39. PurchaseOrderItem
-- 10. invoice         20. inventory_movement 30. bankaccount     40. AccountPayable
-- ============================================================
