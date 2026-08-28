-- =============================================
-- CONTAB - Script SQL COMPLETO para Supabase
-- Ejecutar en el SQL Editor de Supabase Dashboard
-- Version: 2026-07-27
-- =============================================
-- NOTA: Ejecutar bloque por bloque si hay errores de dependencias.
-- Las tablas con FK dependen de que la tabla padre exista primero.
-- =============================================

-- =============================================
-- 1. Tabla: Tenant (empresas/clientes)
-- =============================================
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

CREATE INDEX IF NOT EXISTS idx_tenant_code ON "Tenant" (tenant_code);
CREATE INDEX IF NOT EXISTS idx_tenant_isactive ON "Tenant" (isactive);

ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role" ON "Tenant";
CREATE POLICY "Allow all for service_role"
  ON "Tenant" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read tenants" ON "Tenant";
CREATE POLICY "Authenticated users can read tenants"
  ON "Tenant" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "Tenant" TO service_role;
GRANT SELECT ON "Tenant" TO authenticated;


-- =============================================
-- 2. Tabla: Plan (planes de suscripcion)
-- =============================================
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
CREATE POLICY "Allow all for service_role"
  ON "Plan" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read plans" ON "Plan";
CREATE POLICY "Authenticated users can read plans"
  ON "Plan" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "Plan" TO service_role;
GRANT SELECT ON "Plan" TO authenticated;


-- =============================================
-- 3. Tabla: "User" (PascalCase - tabla principal de usuarios)
-- Usada por: admin/tenants, supabase-db.ts,
-- support/users GET, support/tenants-with-users,
-- tenant-admin/dashboard
-- =============================================
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
  createdat    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updatedat    TIMESTAMPTZ NOT NULL DEFAULT now(),
  lastlogin    TIMESTAMPTZ
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_user_email ON "User" (email);
CREATE INDEX IF NOT EXISTS idx_user_tenant ON "User" (tenantid);
CREATE INDEX IF NOT EXISTS idx_user_authid ON "User" (authid);
CREATE INDEX IF NOT EXISTS idx_user_role ON "User" (role);

ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on User" ON "User";
CREATE POLICY "Allow all for service_role on User"
  ON "User" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read User" ON "User";
CREATE POLICY "Authenticated users can read User"
  ON "User" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "User" TO service_role;
GRANT SELECT, INSERT, UPDATE ON "User" TO authenticated;


-- =============================================
-- 4. Tabla: users (lowercase - tabla Prisma)
-- Usada por: proxy.ts, user/profile,
-- support/tickets POST, support/users POST/PUT/DELETE
-- =============================================
CREATE TABLE IF NOT EXISTS users (
  id           UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  email        TEXT NOT NULL UNIQUE,
  auth_id      TEXT,
  first_name   TEXT NOT NULL DEFAULT '',
  last_name    TEXT NOT NULL DEFAULT '',
  role         TEXT NOT NULL DEFAULT 'USER',
  is_active    BOOLEAN NOT NULL DEFAULT true,
  password     TEXT,
  tenant_id    TEXT,
  tenantid     TEXT,
  firstname    TEXT,
  lastname     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_tenant ON users (tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_tenantid ON users (tenantid);
CREATE INDEX IF NOT EXISTS idx_users_role ON users (role);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on users" ON users;
CREATE POLICY "Allow all for service_role on users"
  ON users FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read users" ON users;
CREATE POLICY "Authenticated users can read users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON users TO service_role;
GRANT SELECT, INSERT, UPDATE ON users TO authenticated;


-- =============================================
-- 5. Tabla: Account (cuentas contables)
-- =============================================
CREATE TABLE IF NOT EXISTS "Account" (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id   TEXT NOT NULL,
  tenantid    TEXT NOT NULL,
  name        TEXT NOT NULL,
  code        TEXT NOT NULL,
  type        TEXT NOT NULL,
  description TEXT,
  parent_id   TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_account_tenant ON "Account" (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_code_tenant ON "Account" (code, tenant_id);

ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on Account" ON "Account";
CREATE POLICY "Allow all for service_role on Account"
  ON "Account" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read Account" ON "Account";
CREATE POLICY "Authenticated users can read Account"
  ON "Account" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "Account" TO service_role;
GRANT SELECT ON "Account" TO authenticated;


-- =============================================
-- 6. Tabla: Transaction (transacciones contables)
-- =============================================
CREATE TABLE IF NOT EXISTS "Transaction" (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id      TEXT NOT NULL,
  tenantid       TEXT NOT NULL,
  date           TIMESTAMPTZ NOT NULL DEFAULT now(),
  description    TEXT NOT NULL,
  reference      TEXT,
  voucher_type   TEXT NOT NULL,
  voucher_number INTEGER NOT NULL,
  type           TEXT,
  currency       TEXT NOT NULL DEFAULT 'HNL',
  exchange_rate  DECIMAL NOT NULL DEFAULT 24.70,
  total_amount   BIGINT NOT NULL DEFAULT 0,
  totalamount    BIGINT,
  cliente_rtn    TEXT,
  proveedor_rtn  TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_transaction_tenant ON "Transaction" (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS unique_voucher_tenant ON "Transaction" (voucher_type, voucher_number, tenant_id);

ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on Transaction" ON "Transaction";
CREATE POLICY "Allow all for service_role on Transaction"
  ON "Transaction" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read Transaction" ON "Transaction";
CREATE POLICY "Authenticated users can read Transaction"
  ON "Transaction" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "Transaction" TO service_role;
GRANT SELECT ON "Transaction" TO authenticated;


-- =============================================
-- 7. Tabla: JournalEntry (asientos contables)
-- =============================================
CREATE TABLE IF NOT EXISTS "JournalEntry" (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  transaction_id  TEXT NOT NULL,
  account_id      TEXT NOT NULL,
  tenant_id       TEXT NOT NULL,
  tenantid        TEXT NOT NULL,
  amount          BIGINT NOT NULL DEFAULT 0,
  original_amount BIGINT NOT NULL DEFAULT 0,
  currency        TEXT NOT NULL DEFAULT 'HNL',
  exchange_rate   DECIMAL NOT NULL DEFAULT 24.70,
  description     TEXT,
  type            TEXT,
  cleared         BOOLEAN NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_entry_tenant ON "JournalEntry" (tenant_id);
CREATE INDEX IF NOT EXISTS idx_entry_transaction ON "JournalEntry" (transaction_id);
CREATE INDEX IF NOT EXISTS idx_entry_account ON "JournalEntry" (account_id);

ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on JournalEntry" ON "JournalEntry";
CREATE POLICY "Allow all for service_role on JournalEntry"
  ON "JournalEntry" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read JournalEntry" ON "JournalEntry";
CREATE POLICY "Authenticated users can read JournalEntry"
  ON "JournalEntry" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "JournalEntry" TO service_role;
GRANT SELECT ON "JournalEntry" TO authenticated;


-- =============================================
-- 8. Tabla: Invoice (facturas - tabla PascalCase)
-- Usada por: tenant-admin/dashboard, admin/billing
-- =============================================
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
CREATE INDEX IF NOT EXISTS idx_invoice_createdat ON "Invoice" (createdat);
CREATE INDEX IF NOT EXISTS idx_invoice_type ON "Invoice" (invoicetype);
CREATE INDEX IF NOT EXISTS idx_invoice_number ON "Invoice" (invoicenumber);

ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on Invoice" ON "Invoice";
CREATE POLICY "Allow all for service_role on Invoice"
  ON "Invoice" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read Invoice" ON "Invoice";
CREATE POLICY "Authenticated users can read Invoice"
  ON "Invoice" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "Invoice" TO service_role;
GRANT SELECT ON "Invoice" TO authenticated;


-- =============================================
-- 9. Tabla: InvoiceItem (detalles de facturas)
-- =============================================
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
CREATE POLICY "Allow all for service_role on InvoiceItem"
  ON "InvoiceItem" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read InvoiceItem" ON "InvoiceItem";
CREATE POLICY "Authenticated users can read InvoiceItem"
  ON "InvoiceItem" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "InvoiceItem" TO service_role;
GRANT SELECT ON "InvoiceItem" TO authenticated;


-- =============================================
-- 10. Tabla: cai (autorizaciones fiscales - lowercase)
-- Usada por: billing/cai, billing/invoices
-- =============================================
CREATE TABLE IF NOT EXISTS cai (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cai             TEXT NOT NULL,
  start_number    BIGINT NOT NULL DEFAULT 0,
  end_number      BIGINT NOT NULL DEFAULT 0,
  current_number  BIGINT NOT NULL DEFAULT 1,
  issue_date      TEXT NOT NULL,
  expiration_date TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  tenant_id       TEXT NOT NULL DEFAULT '1',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cai_tenant ON cai (tenant_id);
CREATE INDEX IF NOT EXISTS idx_cai_status ON cai (status);

ALTER TABLE cai ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on cai" ON cai;
CREATE POLICY "Allow all for service_role on cai"
  ON cai FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read cai" ON cai;
CREATE POLICY "Authenticated users can read cai"
  ON cai FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON cai TO service_role;
GRANT SELECT ON cai TO authenticated;


-- =============================================
-- 11. Tabla: invoice (facturas - lowercase, billing module)
-- Usada por: billing/invoices, billing/cai
-- Montos en centavos
-- =============================================
CREATE TABLE IF NOT EXISTS invoice (
  id                 TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_number     TEXT NOT NULL,
  cai                TEXT,
  customer_rtn       TEXT NOT NULL DEFAULT '',
  customer_name      TEXT NOT NULL DEFAULT '',
  subtotal           BIGINT NOT NULL DEFAULT 0,
  tax_15             BIGINT NOT NULL DEFAULT 0,
  tax_18             BIGINT NOT NULL DEFAULT 0,
  total              BIGINT NOT NULL DEFAULT 0,
  payment_method     TEXT NOT NULL DEFAULT 'cash',
  payment_reference  TEXT,
  status             TEXT NOT NULL DEFAULT 'PAGADA',
  date               TEXT NOT NULL,
  tenant_id          TEXT NOT NULL DEFAULT '1',
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoice_tenant ON invoice (tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoice_status_lower ON invoice (status);

ALTER TABLE invoice ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on invoice" ON invoice;
CREATE POLICY "Allow all for service_role on invoice"
  ON invoice FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read invoice" ON invoice;
CREATE POLICY "Authenticated users can read invoice"
  ON invoice FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON invoice TO service_role;
GRANT SELECT ON invoice TO authenticated;


-- =============================================
-- 12. Tabla: invoiceitem (detalles facturas - lowercase)
-- =============================================
CREATE TABLE IF NOT EXISTS invoiceitem (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  invoice_id    TEXT NOT NULL,
  product_code  TEXT,
  product_name  TEXT NOT NULL DEFAULT '',
  quantity      NUMERIC NOT NULL DEFAULT 1,
  unit_price    BIGINT NOT NULL DEFAULT 0,
  tax_rate      NUMERIC NOT NULL DEFAULT 15,
  discount      NUMERIC NOT NULL DEFAULT 0,
  subtotal      BIGINT NOT NULL DEFAULT 0,
  tax_amount    BIGINT NOT NULL DEFAULT 0,
  total         BIGINT NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoiceitem_invoice ON invoiceitem (invoice_id);

ALTER TABLE invoiceitem ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on invoiceitem" ON invoiceitem;
CREATE POLICY "Allow all for service_role on invoiceitem"
  ON invoiceitem FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read invoiceitem" ON invoiceitem;
CREATE POLICY "Authenticated users can read invoiceitem"
  ON invoiceitem FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON invoiceitem TO service_role;
GRANT SELECT ON invoiceitem TO authenticated;


-- =============================================
-- 13. Tabla: customer (clientes)
-- =============================================
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
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE customer ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on customer" ON customer;
CREATE POLICY "Allow all for service_role on customer"
  ON customer FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read customer" ON customer;
CREATE POLICY "Authenticated users can read customer"
  ON customer FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON customer TO service_role;
GRANT SELECT ON customer TO authenticated;


-- =============================================
-- 14. Tabla: product (productos/inventario)
-- =============================================
CREATE TABLE IF NOT EXISTS product (
  id               TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code             TEXT NOT NULL DEFAULT '',
  name             TEXT NOT NULL,
  description      TEXT,
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
  valuation_method TEXT DEFAULT 'FIFO',
  tenant_id        TEXT NOT NULL DEFAULT '1',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE product ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on product" ON product;
CREATE POLICY "Allow all for service_role on product"
  ON product FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read product" ON product;
CREATE POLICY "Authenticated users can read product"
  ON product FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON product TO service_role;
GRANT SELECT ON product TO authenticated;


-- =============================================
-- 15. Tabla: warehouse (bodegas)
-- =============================================
CREATE TABLE IF NOT EXISTS warehouse (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code        TEXT NOT NULL DEFAULT '',
  name        TEXT NOT NULL,
  location    TEXT,
  description TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  tenant_id   TEXT NOT NULL DEFAULT '1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE warehouse ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on warehouse" ON warehouse;
CREATE POLICY "Allow all for service_role on warehouse"
  ON warehouse FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read warehouse" ON warehouse;
CREATE POLICY "Authenticated users can read warehouse"
  ON warehouse FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON warehouse TO service_role;
GRANT SELECT ON warehouse TO authenticated;


-- =============================================
-- 16. Tabla: inventory_movement (movimientos de inventario)
-- =============================================
CREATE TABLE IF NOT EXISTS inventory_movement (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  product_id    TEXT NOT NULL,
  movement_type TEXT NOT NULL,
  quantity      NUMERIC NOT NULL,
  unit_cost     BIGINT NOT NULL DEFAULT 0,
  total_cost    BIGINT NOT NULL DEFAULT 0,
  reference     TEXT,
  description   TEXT,
  warehouse_id  TEXT,
  tenant_id     TEXT NOT NULL DEFAULT '1',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_movement_product ON inventory_movement (product_id);
CREATE INDEX IF NOT EXISTS idx_movement_tenant ON inventory_movement (tenant_id);

ALTER TABLE inventory_movement ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on inventory_movement" ON inventory_movement;
CREATE POLICY "Allow all for service_role on inventory_movement"
  ON inventory_movement FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read inventory_movement" ON inventory_movement;
CREATE POLICY "Authenticated users can read inventory_movement"
  ON inventory_movement FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON inventory_movement TO service_role;
GRANT SELECT ON inventory_movement TO authenticated;


-- =============================================
-- 17. Tabla: bankaccount (cuentas bancarias)
-- =============================================
CREATE TABLE IF NOT EXISTS bankaccount (
  id             TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  bank_name      TEXT NOT NULL,
  account_number TEXT NOT NULL,
  account_type   TEXT NOT NULL DEFAULT 'checking',
  account_holder TEXT,
  currency       TEXT NOT NULL DEFAULT 'HNL',
  is_active      BOOLEAN NOT NULL DEFAULT true,
  tenant_id      TEXT NOT NULL DEFAULT '1',
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE bankaccount ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on bankaccount" ON bankaccount;
CREATE POLICY "Allow all for service_role on bankaccount"
  ON bankaccount FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read bankaccount" ON bankaccount;
CREATE POLICY "Authenticated users can read bankaccount"
  ON bankaccount FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON bankaccount TO service_role;
GRANT SELECT ON bankaccount TO authenticated;


-- =============================================
-- 18. Tabla: auditlog (registro de auditoria)
-- =============================================
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

DROP POLICY IF EXISTS "Authenticated users can read audit logs" ON auditlog;
CREATE POLICY "Authenticated users can read audit logs"
  ON auditlog FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT INSERT ON auditlog TO service_role;
GRANT SELECT ON auditlog TO authenticated;


-- =============================================
-- 19. Tabla: SupportTicket (tickets de soporte)
-- =============================================
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
CREATE INDEX IF NOT EXISTS idx_support_ticket_email ON "SupportTicket" (user_email);

ALTER TABLE "SupportTicket" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on SupportTicket" ON "SupportTicket";
CREATE POLICY "Allow all for service_role on SupportTicket"
  ON "SupportTicket" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read support tickets" ON "SupportTicket";
CREATE POLICY "Authenticated users can read support tickets"
  ON "SupportTicket" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "SupportTicket" TO service_role;
GRANT SELECT, INSERT, UPDATE ON "SupportTicket" TO authenticated;


-- =============================================
-- 20. Tabla: system_config (configuracion del sistema)
-- =============================================
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
CREATE POLICY "Allow all for service_role on system_config"
  ON system_config FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read system_config" ON system_config;
CREATE POLICY "Authenticated users can read system_config"
  ON system_config FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON system_config TO service_role;
GRANT SELECT ON system_config TO authenticated;


-- =============================================
-- 21. Tabla: company_logos
-- =============================================
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

CREATE UNIQUE INDEX IF NOT EXISTS unique_tenant_logo ON company_logos (tenant_id);

ALTER TABLE company_logos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on company_logos" ON company_logos;
CREATE POLICY "Allow all for service_role on company_logos"
  ON company_logos FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read company_logos" ON company_logos;
CREATE POLICY "Authenticated users can read company_logos"
  ON company_logos FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON company_logos TO service_role;
GRANT SELECT ON company_logos TO authenticated;


-- =============================================
-- 22. Tabla: File (archivos)
-- =============================================
CREATE TABLE IF NOT EXISTS "File" (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  tenant_id     TEXT NOT NULL,
  original_name TEXT NOT NULL,
  file_name     TEXT NOT NULL,
  file_path     TEXT NOT NULL,
  file_size     INTEGER NOT NULL DEFAULT 0,
  mime_type     TEXT NOT NULL DEFAULT '',
  file_type     TEXT NOT NULL DEFAULT '',
  category      TEXT NOT NULL DEFAULT '',
  description   TEXT,
  tags          TEXT,
  uploaded_by   TEXT NOT NULL DEFAULT '',
  status        TEXT NOT NULL DEFAULT 'active',
  metadata      TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_file_tenant ON "File" (tenant_id);
CREATE INDEX IF NOT EXISTS idx_file_type ON "File" (file_type);
CREATE INDEX IF NOT EXISTS idx_file_category ON "File" (category);
CREATE INDEX IF NOT EXISTS idx_file_status ON "File" (status);
CREATE INDEX IF NOT EXISTS idx_file_created_at ON "File" (created_at);

ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on File" ON "File";
CREATE POLICY "Allow all for service_role on File"
  ON "File" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read File" ON "File";
CREATE POLICY "Authenticated users can read File"
  ON "File" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "File" TO service_role;
GRANT SELECT ON "File" TO authenticated;


-- =============================================
-- 23. Tabla: FileTemplate (plantillas de archivos)
-- =============================================
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

CREATE INDEX IF NOT EXISTS idx_template_tenant ON "FileTemplate" (tenant_id);
CREATE INDEX IF NOT EXISTS idx_template_type ON "FileTemplate" (template_type);

ALTER TABLE "FileTemplate" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on FileTemplate" ON "FileTemplate";
CREATE POLICY "Allow all for service_role on FileTemplate"
  ON "FileTemplate" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read FileTemplate" ON "FileTemplate";
CREATE POLICY "Authenticated users can read FileTemplate"
  ON "FileTemplate" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "FileTemplate" TO service_role;
GRANT SELECT ON "FileTemplate" TO authenticated;


-- =============================================
-- 24. Tabla: FileProcessing (procesamiento de archivos)
-- =============================================
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

CREATE INDEX IF NOT EXISTS idx_processing_file_id ON "FileProcessing" (file_id);
CREATE INDEX IF NOT EXISTS idx_processing_status ON "FileProcessing" (status);

ALTER TABLE "FileProcessing" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on FileProcessing" ON "FileProcessing";
CREATE POLICY "Allow all for service_role on FileProcessing"
  ON "FileProcessing" FOR ALL
  USING (auth.role() = 'service_role');

GRANT ALL ON "FileProcessing" TO service_role;


-- =============================================
-- 25. Tabla: FileActivity (actividad de archivos)
-- =============================================
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

CREATE INDEX IF NOT EXISTS idx_activity_file_id ON "FileActivity" (file_id);
CREATE INDEX IF NOT EXISTS idx_activity_user_id ON "FileActivity" (user_id);

ALTER TABLE "FileActivity" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on FileActivity" ON "FileActivity";
CREATE POLICY "Allow all for service_role on FileActivity"
  ON "FileActivity" FOR ALL
  USING (auth.role() = 'service_role');

GRANT ALL ON "FileActivity" TO service_role;


-- =============================================
-- 26. Tabla: ticket_email_logs
-- =============================================
CREATE TABLE IF NOT EXISTS ticket_email_logs (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_id       TEXT NOT NULL,
  email_type      TEXT NOT NULL,
  recipient_email TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'SENT',
  error_message   TEXT,
  sent_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_email_log_ticket_id ON ticket_email_logs (ticket_id);

ALTER TABLE ticket_email_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on ticket_email_logs" ON ticket_email_logs;
CREATE POLICY "Allow all for service_role on ticket_email_logs"
  ON ticket_email_logs FOR ALL
  USING (auth.role() = 'service_role');

GRANT ALL ON ticket_email_logs TO service_role;


-- =============================================
-- 27. Tabla: CustomTaxes (impuestos personalizados)
-- =============================================
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
CREATE POLICY "Allow all for service_role on CustomTaxes"
  ON "CustomTaxes" FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read CustomTaxes" ON "CustomTaxes";
CREATE POLICY "Authenticated users can read CustomTaxes"
  ON "CustomTaxes" FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON "CustomTaxes" TO service_role;
GRANT SELECT ON "CustomTaxes" TO authenticated;


-- =============================================
-- 28. Tabla: PushSubscription (notificaciones push)
-- =============================================
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
CREATE POLICY "Allow all for service_role on PushSubscription"
  ON "PushSubscription" FOR ALL
  USING (auth.role() = 'service_role');

GRANT ALL ON "PushSubscription" TO service_role;


-- =============================================
-- 29. Tabla: chat_message (mensajes de chat)
-- =============================================
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
CREATE POLICY "Allow all for service_role on chat_message"
  ON chat_message FOR ALL
  USING (auth.role() = 'service_role');

DROP POLICY IF EXISTS "Authenticated users can read chat_message" ON chat_message;
CREATE POLICY "Authenticated users can read chat_message"
  ON chat_message FOR SELECT
  USING (auth.role() = 'authenticated');

GRANT ALL ON chat_message TO service_role;
GRANT SELECT, INSERT ON chat_message TO authenticated;


-- =============================================
-- 30. Tabla: talonarios (talonarios de facturacion)
-- =============================================
CREATE TABLE IF NOT EXISTS talonarios (
  id              TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cai_code        TEXT NOT NULL,
  range_start     BIGINT NOT NULL DEFAULT 0,
  range_end       BIGINT NOT NULL DEFAULT 0,
  current_number  BIGINT NOT NULL DEFAULT 1,
  issue_date      TEXT NOT NULL,
  expiry_date     TEXT NOT NULL,
  status          TEXT NOT NULL DEFAULT 'active',
  tenant_id       TEXT NOT NULL DEFAULT '1',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE talonarios ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on talonarios" ON talonarios;
CREATE POLICY "Allow all for service_role on talonarios"
  ON talonarios FOR ALL
  USING (auth.role() = 'service_role');

GRANT ALL ON talonarios TO service_role;
GRANT SELECT ON talonarios TO authenticated;


-- =============================================
-- 31. Tabla: chart_of_accounts (catalogo de cuentas legacy)
-- =============================================
CREATE TABLE IF NOT EXISTS chart_of_accounts (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  code        TEXT NOT NULL,
  name        TEXT NOT NULL,
  type        TEXT NOT NULL,
  parent_code TEXT,
  is_active   BOOLEAN NOT NULL DEFAULT true,
  tenant_id   TEXT NOT NULL DEFAULT '1',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE chart_of_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for service_role on chart_of_accounts" ON chart_of_accounts;
CREATE POLICY "Allow all for service_role on chart_of_accounts"
  ON chart_of_accounts FOR ALL
  USING (auth.role() = 'service_role');

GRANT ALL ON chart_of_accounts TO service_role;
GRANT SELECT ON chart_of_accounts TO authenticated;


-- =============================================
-- DONE
-- =============================================
-- 31 tablas creadas. Ejecutar este archivo completo
-- en el SQL Editor de Supabase Dashboard.
-- =============================================
