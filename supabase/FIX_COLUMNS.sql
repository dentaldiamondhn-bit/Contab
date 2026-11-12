-- =============================================
-- CONTAB - FIX: Agregar columnas faltantes
-- Ejecutar en el SQL Editor de Supabase
-- Agrega columnas que el codigo espera pero que
-- no existen en las tablas actuales.
-- =============================================

-- =============================================
-- 1. Tabla "Tenant" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Tenant') THEN
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS businessname TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS businessrtn TEXT UNIQUE NOT NULL DEFAULT '';
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS businessemail TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS businessaddress TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS tenant_code TEXT UNIQUE NOT NULL DEFAULT '';
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS phonenumber TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS logourl TEXT;
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS timezone TEXT NOT NULL DEFAULT 'America/Tegucigalpa';
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'HNL';
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS subscriptionplan TEXT NOT NULL DEFAULT 'BASIC';
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS maxusers INTEGER NOT NULL DEFAULT 5;
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS maxstorage INTEGER NOT NULL DEFAULT 100;
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS maxtransactions INTEGER NOT NULL DEFAULT 10000;
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS monthlycost INTEGER NOT NULL DEFAULT 1000;
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS modules TEXT;
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS isactive BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS createdat TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS updatedat TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "Tenant" ADD COLUMN IF NOT EXISTS country TEXT NOT NULL DEFAULT 'HN';
  END IF;
END $$;


-- =============================================
-- 2. Tabla "User" (PascalCase) - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'User') THEN
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS email TEXT NOT NULL DEFAULT '';
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS authid TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS firstname TEXT NOT NULL DEFAULT '';
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS lastname TEXT NOT NULL DEFAULT '';
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER';
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS isactive BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS tenantid TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS passwordhash TEXT;
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS createdat TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS updatedat TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS lastlogin TIMESTAMPTZ;
  END IF;
END $$;


-- =============================================
-- 3. Tabla users (lowercase) - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'users') THEN
    ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_id TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS first_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS last_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'USER';
    ALTER TABLE users ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS password TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS tenantid TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS firstname TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS lastname TEXT;
    ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 4. Tabla "Account" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Account') THEN
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS tenantid TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS parent_id TEXT;
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS isActive BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "Account" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 5. Tabla "Transaction" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Transaction') THEN
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS tenantid TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS type TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS totalamount BIGINT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS total_amount BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS totalAmount BIGINT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS functionalAmount BIGINT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS originalTotal BIGINT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS description TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS reference TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS voucherType TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS voucher_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS voucherNumber INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS voucher_number INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'HNL';
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS exchangeRate NUMERIC NOT NULL DEFAULT 24.70;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC NOT NULL DEFAULT 24.70;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS clienteRTN TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS proveedorRTN TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS cliente_rtn TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS proveedor_rtn TEXT;
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS createdAt TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS updatedAt TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 6. Tabla "JournalEntry" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'JournalEntry') THEN
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS tenantid TEXT NOT NULL DEFAULT '';
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS accountId TEXT;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS account_id TEXT;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS transactionId TEXT;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS transaction_id TEXT;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS amount BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS originalAmount BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS original_amount BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS type TEXT;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'HNL';
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS exchangeRate NUMERIC NOT NULL DEFAULT 24.70;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC NOT NULL DEFAULT 24.70;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS cleared BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS createdAt TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "JournalEntry" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 7. Tabla "Invoice" (PascalCase) - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Invoice') THEN
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS tenantid TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS invoicenumber TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS invoiceNumber TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS invoicedate TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS duedate TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS invoicetype TEXT NOT NULL DEFAULT 'CUSTOMER';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS invoiceType TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS customerid TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS customerrtn TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS customername TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS customeremail TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS customeraddress TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS issuerrtn TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS issuername TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS issueraddress TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS issuerphone TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS issueremail TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS cai TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS rangestart INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS rangeend INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS expirydate TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS establishmentcode TEXT NOT NULL DEFAULT '0001';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS pointofsalecode TEXT NOT NULL DEFAULT '0001';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS items TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS subtotal NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS tax NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS totaltax NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS total NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS notes TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'HNL';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS taxrate NUMERIC NOT NULL DEFAULT 15;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'ACTIVE';
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS invoiceimageurl TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS caiid TEXT;
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS createdat TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS updatedat TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS createdAt TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 8. Tabla "InvoiceItem" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'InvoiceItem') THEN
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS invoiceid TEXT NOT NULL DEFAULT '';
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS planid TEXT;
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS planname TEXT;
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS quantity INTEGER NOT NULL DEFAULT 1;
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS unitprice NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS totalamount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS taxrate NUMERIC NOT NULL DEFAULT 15;
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS taxamount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS total NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE "InvoiceItem" ADD COLUMN IF NOT EXISTS createdat TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 9. Tabla "SupportTicket" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'SupportTicket') THEN
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS user_email TEXT NOT NULL DEFAULT '';
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS user_name TEXT;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS tenant_name TEXT;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS tenant_code TEXT;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS assigned_to TEXT;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS assigned_name TEXT;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS created_by TEXT;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS comments TEXT;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS priority TEXT NOT NULL DEFAULT 'medium';
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS ticket_type TEXT NOT NULL DEFAULT 'support';
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'open';
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
    ALTER TABLE "SupportTicket" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 10. Tabla auditlog - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'auditlog') THEN
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS tablename TEXT NOT NULL DEFAULT '';
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS recordid TEXT NOT NULL DEFAULT '';
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT 'UPDATE';
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS oldvalues JSONB;
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS newvalues JSONB;
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS changedfields JSONB;
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS userid TEXT;
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS useragent TEXT;
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS ipaddress TEXT;
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS tenantid TEXT;
    ALTER TABLE auditlog ADD COLUMN IF NOT EXISTS "timestamp" TIMESTAMPTZ DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 11. Tabla "Plan" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'Plan') THEN
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS price INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS max_users INTEGER NOT NULL DEFAULT 5;
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS max_storage INTEGER NOT NULL DEFAULT 100;
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS max_transactions INTEGER NOT NULL DEFAULT 10000;
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS features TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS modules TEXT NOT NULL DEFAULT '[]';
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 12. Tabla cai - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'cai') THEN
    ALTER TABLE cai ADD COLUMN IF NOT EXISTS cai TEXT NOT NULL DEFAULT '';
    ALTER TABLE cai ADD COLUMN IF NOT EXISTS start_number BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE cai ADD COLUMN IF NOT EXISTS end_number BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE cai ADD COLUMN IF NOT EXISTS current_number BIGINT NOT NULL DEFAULT 1;
    ALTER TABLE cai ADD COLUMN IF NOT EXISTS issue_date TEXT NOT NULL DEFAULT '';
    ALTER TABLE cai ADD COLUMN IF NOT EXISTS expiration_date TEXT NOT NULL DEFAULT '';
    ALTER TABLE cai ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE cai ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '1';
    ALTER TABLE cai ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE cai ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 13. Tabla invoice (lowercase) - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoice') THEN
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS invoice_number TEXT NOT NULL DEFAULT '';
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS cai TEXT;
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS customer_rtn TEXT NOT NULL DEFAULT '';
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS customer_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS subtotal BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS tax_15 BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS tax_18 BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS total BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS payment_method TEXT NOT NULL DEFAULT 'cash';
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS payment_reference TEXT;
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'PAGADA';
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS date TEXT NOT NULL DEFAULT '';
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '1';
    ALTER TABLE invoice ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 14. Tabla invoiceitem (lowercase) - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoiceitem') THEN
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS invoice_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS product_code TEXT;
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS product_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS quantity NUMERIC NOT NULL DEFAULT 1;
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS unit_price BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS tax_rate NUMERIC NOT NULL DEFAULT 15;
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS discount NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS subtotal BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS tax_amount BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS total BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE invoiceitem ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 15. Tabla customer - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'customer') THEN
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS rtn TEXT NOT NULL DEFAULT '';
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS email TEXT;
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS address TEXT;
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS credit_limit NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS current_debt NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '1';
    ALTER TABLE customer ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 16. Tabla product - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'product') THEN
    ALTER TABLE product ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
    ALTER TABLE product ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE product ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS unit_price BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS current_cost BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS tax_rate NUMERIC NOT NULL DEFAULT 15;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS is_service BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS stock_quantity NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS current_stock NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS min_stock NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS max_stock NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS category TEXT;
    ALTER TABLE product ADD COLUMN IF NOT EXISTS product_type TEXT DEFAULT 'product';
    ALTER TABLE product ADD COLUMN IF NOT EXISTS valuation_method TEXT DEFAULT 'FIFO';
    ALTER TABLE product ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '1';
    ALTER TABLE product ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE product ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 17. Tabla warehouse - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'warehouse') THEN
    ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
    ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS location TEXT;
    ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '1';
    ALTER TABLE warehouse ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 18. Tabla inventory_movement - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'inventory_movement') THEN
    ALTER TABLE inventory_movement ADD COLUMN IF NOT EXISTS product_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE inventory_movement ADD COLUMN IF NOT EXISTS movement_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE inventory_movement ADD COLUMN IF NOT EXISTS quantity NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE inventory_movement ADD COLUMN IF NOT EXISTS unit_cost BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE inventory_movement ADD COLUMN IF NOT EXISTS total_cost BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE inventory_movement ADD COLUMN IF NOT EXISTS reference TEXT;
    ALTER TABLE inventory_movement ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE inventory_movement ADD COLUMN IF NOT EXISTS warehouse_id TEXT;
    ALTER TABLE inventory_movement ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '1';
    ALTER TABLE inventory_movement ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 19. Tabla bankaccount - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'bankaccount') THEN
    ALTER TABLE bankaccount ADD COLUMN IF NOT EXISTS bank_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE bankaccount ADD COLUMN IF NOT EXISTS account_number TEXT NOT NULL DEFAULT '';
    ALTER TABLE bankaccount ADD COLUMN IF NOT EXISTS account_type TEXT NOT NULL DEFAULT 'checking';
    ALTER TABLE bankaccount ADD COLUMN IF NOT EXISTS account_holder TEXT;
    ALTER TABLE bankaccount ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'HNL';
    ALTER TABLE bankaccount ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE bankaccount ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '1';
    ALTER TABLE bankaccount ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 20. Tabla system_config - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'system_config') THEN
    ALTER TABLE system_config ADD COLUMN IF NOT EXISTS key TEXT UNIQUE NOT NULL DEFAULT '';
    ALTER TABLE system_config ADD COLUMN IF NOT EXISTS value TEXT NOT NULL DEFAULT '';
    ALTER TABLE system_config ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE system_config ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE system_config ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    ALTER TABLE system_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE system_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 21. Tabla "File" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'File') THEN
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS original_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS file_name TEXT NOT NULL DEFAULT '';
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS file_path TEXT NOT NULL DEFAULT '';
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS file_size INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS mime_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS file_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT '';
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS tags TEXT;
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS uploaded_by TEXT NOT NULL DEFAULT '';
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS metadata TEXT;
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "File" ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
  END IF;
END $$;


-- =============================================
-- 22. Tabla "FileTemplate" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'FileTemplate') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS file_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS schema TEXT NOT NULL DEFAULT '{}';
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS is_default BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS created_by TEXT NOT NULL DEFAULT '';
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "FileTemplate" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 23. Tabla "FileProcessing" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'FileProcessing') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS file_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS processing_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS progress INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS total_rows INTEGER;
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS processed_rows INTEGER;
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS error_count INTEGER NOT NULL DEFAULT 0;
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS errors TEXT;
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS warnings TEXT;
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS results TEXT;
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "FileProcessing" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 24. Tabla "FileActivity" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'FileActivity') THEN
    ALTER TABLE "FileActivity" ADD COLUMN IF NOT EXISTS file_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE "FileActivity" ADD COLUMN IF NOT EXISTS user_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE "FileActivity" ADD COLUMN IF NOT EXISTS action TEXT NOT NULL DEFAULT '';
    ALTER TABLE "FileActivity" ADD COLUMN IF NOT EXISTS details TEXT;
    ALTER TABLE "FileActivity" ADD COLUMN IF NOT EXISTS ip_address TEXT;
    ALTER TABLE "FileActivity" ADD COLUMN IF NOT EXISTS user_agent TEXT;
    ALTER TABLE "FileActivity" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 25. Tabla company_logos - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'company_logos') THEN
    ALTER TABLE company_logos ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE company_logos ADD COLUMN IF NOT EXISTS logo_url TEXT NOT NULL DEFAULT '';
    ALTER TABLE company_logos ADD COLUMN IF NOT EXISTS logo_name TEXT;
    ALTER TABLE company_logos ADD COLUMN IF NOT EXISTS logo_size INTEGER;
    ALTER TABLE company_logos ADD COLUMN IF NOT EXISTS logo_type TEXT;
    ALTER TABLE company_logos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE company_logos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 26. Tabla ticket_email_logs - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'ticket_email_logs') THEN
    ALTER TABLE ticket_email_logs ADD COLUMN IF NOT EXISTS ticket_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE ticket_email_logs ADD COLUMN IF NOT EXISTS email_type TEXT NOT NULL DEFAULT '';
    ALTER TABLE ticket_email_logs ADD COLUMN IF NOT EXISTS recipient_email TEXT NOT NULL DEFAULT '';
    ALTER TABLE ticket_email_logs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'SENT';
    ALTER TABLE ticket_email_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
    ALTER TABLE ticket_email_logs ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 27. Tabla "CustomTaxes" - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'CustomTaxes') THEN
    ALTER TABLE "CustomTaxes" ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE "CustomTaxes" ADD COLUMN IF NOT EXISTS rate NUMERIC NOT NULL DEFAULT 0;
    ALTER TABLE "CustomTaxes" ADD COLUMN IF NOT EXISTS description TEXT;
    ALTER TABLE "CustomTaxes" ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE "CustomTaxes" ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '1';
    ALTER TABLE "CustomTaxes" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
    ALTER TABLE "CustomTaxes" ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 28. Tabla chat_message - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chat_message') THEN
    ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS sender_id TEXT NOT NULL DEFAULT '';
    ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS receiver_id TEXT;
    ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS message TEXT NOT NULL DEFAULT '';
    ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS is_read BOOLEAN NOT NULL DEFAULT false;
    ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    ALTER TABLE chat_message ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 29. Tabla PushSubscription - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'PushSubscription') THEN
    ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS endpoint TEXT NOT NULL DEFAULT '';
    ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS p256dh TEXT NOT NULL DEFAULT '';
    ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS auth TEXT NOT NULL DEFAULT '';
    ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS user_id TEXT;
    ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS tenant_id TEXT;
    ALTER TABLE "PushSubscription" ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 30. Tabla talonarios - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'talonarios') THEN
    ALTER TABLE talonarios ADD COLUMN IF NOT EXISTS cai_code TEXT NOT NULL DEFAULT '';
    ALTER TABLE talonarios ADD COLUMN IF NOT EXISTS range_start BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE talonarios ADD COLUMN IF NOT EXISTS range_end BIGINT NOT NULL DEFAULT 0;
    ALTER TABLE talonarios ADD COLUMN IF NOT EXISTS current_number BIGINT NOT NULL DEFAULT 1;
    ALTER TABLE talonarios ADD COLUMN IF NOT EXISTS issue_date TEXT NOT NULL DEFAULT '';
    ALTER TABLE talonarios ADD COLUMN IF NOT EXISTS expiry_date TEXT NOT NULL DEFAULT '';
    ALTER TABLE talonarios ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
    ALTER TABLE talonarios ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '1';
    ALTER TABLE talonarios ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- 31. Tabla chart_of_accounts - columnas faltantes
-- =============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'chart_of_accounts') THEN
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT '';
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS parent_code TEXT;
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true;
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS tenant_id TEXT NOT NULL DEFAULT '1';
    ALTER TABLE chart_of_accounts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT now();
  END IF;
END $$;


-- =============================================
-- DONE - 31 tablas parcheadas
-- =============================================
