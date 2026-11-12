-- ============================================
-- Contab Database Schema - SQL Tables
-- ============================================
-- Generated from Prisma Schema
-- Compatible with PostgreSQL
-- ============================================

-- Table: Account
CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "parent_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Add tenant_id column if table already exists without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Account' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE "Account" ADD COLUMN "tenant_id" TEXT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "unique_code_tenant" ON "Account"("code", "tenant_id");
CREATE INDEX IF NOT EXISTS "idx_account_tenant" ON "Account"("tenant_id");

-- Table: Transaction
CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "voucher_type" TEXT NOT NULL,
  "voucher_number" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'HNL',
  "exchange_rate" DECIMAL(10,2) NOT NULL DEFAULT 24.70,
  "total_amount" BIGINT NOT NULL,
  "cliente_rtn" TEXT,
  "proveedor_rtn" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Add missing columns if table already exists
DO $$
BEGIN
  -- Add tenant_id if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Transaction' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE "Transaction" ADD COLUMN "tenant_id" TEXT;
  END IF;
  
  -- Add voucher_type if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Transaction' AND column_name = 'voucher_type'
  ) THEN
    ALTER TABLE "Transaction" ADD COLUMN "voucher_type" TEXT;
  END IF;
  
  -- Add voucher_number if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Transaction' AND column_name = 'voucher_number'
  ) THEN
    ALTER TABLE "Transaction" ADD COLUMN "voucher_number" INTEGER;
  END IF;
  
  -- Add exchange_rate if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Transaction' AND column_name = 'exchange_rate'
  ) THEN
    ALTER TABLE "Transaction" ADD COLUMN "exchange_rate" DECIMAL(10,2) DEFAULT 24.70;
  END IF;
  
  -- Add total_amount if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Transaction' AND column_name = 'total_amount'
  ) THEN
    ALTER TABLE "Transaction" ADD COLUMN "total_amount" BIGINT;
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS "unique_voucher_tenant" ON "Transaction"("voucher_type", "voucher_number", "tenant_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_tenant" ON "Transaction"("tenant_id");

-- Table: JournalEntry
CREATE TABLE IF NOT EXISTS "JournalEntry" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "transaction_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "original_amount" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'HNL',
  "exchange_rate" DECIMAL(10,2) NOT NULL DEFAULT 24.70,
  "description" TEXT,
  "cleared" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Add tenant_id column if table already exists without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'JournalEntry' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE "JournalEntry" ADD COLUMN "tenant_id" TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_entry_tenant" ON "JournalEntry"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_entry_transaction" ON "JournalEntry"("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_entry_account" ON "JournalEntry"("account_id");

-- Table: Tenant
CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "business_name" TEXT NOT NULL,
  "business_rtn" TEXT NOT NULL UNIQUE,
  "business_email" TEXT NOT NULL UNIQUE,
  "business_address" TEXT,
  "tenant_code" TEXT NOT NULL UNIQUE,
  "country" TEXT NOT NULL DEFAULT 'HN',
  "phone_number" TEXT,
  "logo_url" TEXT,
  "timezone" TEXT NOT NULL DEFAULT 'America/Tegucigalpa',
  "currency" TEXT NOT NULL DEFAULT 'HNL',
  "subscription_plan" TEXT NOT NULL DEFAULT 'BASIC',
  "max_users" INTEGER NOT NULL DEFAULT 5,
  "max_storage" INTEGER NOT NULL DEFAULT 100,
  "max_transactions" INTEGER NOT NULL DEFAULT 10000,
  "monthly_cost" INTEGER NOT NULL DEFAULT 1000,
  "modules" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Add modules column if table already exists without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'Tenant' AND column_name = 'modules'
  ) THEN
    ALTER TABLE "Tenant" ADD COLUMN "modules" TEXT;
  END IF;
END $$;

-- Table: File
CREATE TABLE IF NOT EXISTS "File" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "original_name" TEXT NOT NULL,
  "file_name" TEXT NOT NULL,
  "file_path" TEXT NOT NULL,
  "file_size" INTEGER NOT NULL,
  "mime_type" TEXT NOT NULL,
  "file_type" TEXT NOT NULL,
  "category" TEXT NOT NULL,
  "description" TEXT,
  "tags" TEXT,
  "uploaded_by" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'active',
  "metadata" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,
  "deleted_at" TIMESTAMP(3)
);

-- Add tenant_id column if table already exists without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'File' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE "File" ADD COLUMN "tenant_id" TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_file_tenant" ON "File"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_file_uploaded_by" ON "File"("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_file_type" ON "File"("file_type");
CREATE INDEX IF NOT EXISTS "idx_file_category" ON "File"("category");
CREATE INDEX IF NOT EXISTS "idx_file_status" ON "File"("status");
CREATE INDEX IF NOT EXISTS "idx_file_created_at" ON "File"("created_at");

-- Table: FileProcessing
CREATE TABLE IF NOT EXISTS "FileProcessing" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "file_id" TEXT NOT NULL,
  "processing_type" TEXT NOT NULL,
  "status" TEXT NOT NULL,
  "progress" INTEGER NOT NULL DEFAULT 0,
  "total_rows" INTEGER,
  "processed_rows" INTEGER,
  "error_count" INTEGER NOT NULL DEFAULT 0,
  "errors" TEXT,
  "warnings" TEXT,
  "results" TEXT,
  "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "completed_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

CREATE INDEX IF NOT EXISTS "idx_processing_file_id" ON "FileProcessing"("file_id");
CREATE INDEX IF NOT EXISTS "idx_processing_status" ON "FileProcessing"("status");
CREATE INDEX IF NOT EXISTS "idx_processing_started_at" ON "FileProcessing"("started_at");

-- Table: FileTemplate
CREATE TABLE IF NOT EXISTS "FileTemplate" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "template_type" TEXT NOT NULL,
  "file_id" TEXT NOT NULL UNIQUE,
  "schema" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Add tenant_id column if table already exists without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'FileTemplate' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "tenant_id" TEXT;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "idx_template_tenant" ON "FileTemplate"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_template_type" ON "FileTemplate"("template_type");
CREATE INDEX IF NOT EXISTS "idx_template_is_active" ON "FileTemplate"("is_active");

-- Table: FileActivity
CREATE TABLE IF NOT EXISTS "FileActivity" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "file_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS "idx_activity_file_id" ON "FileActivity"("file_id");
CREATE INDEX IF NOT EXISTS "idx_activity_user_id" ON "FileActivity"("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_action" ON "FileActivity"("action");
CREATE INDEX IF NOT EXISTS "idx_activity_created_at" ON "FileActivity"("created_at");

-- Table: users
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "email" TEXT NOT NULL UNIQUE,
  "auth_id" TEXT UNIQUE,
  "first_name" TEXT,
  "last_name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "password" TEXT,
  "tenant_id" TEXT,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL
);

-- Add tenant_id column if table already exists without it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE "users" ADD COLUMN "tenant_id" TEXT;
  END IF;
END $$;

-- ============================================
-- Foreign Key Constraints (Safe - Only if not exists)
-- ============================================

-- File table foreign keys
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'file_tenant_id_fkey') THEN
    ALTER TABLE "File" ADD CONSTRAINT "file_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fileprocessing_file_id_fkey') THEN
    ALTER TABLE "FileProcessing" ADD CONSTRAINT "fileprocessing_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "File"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'filetemplate_file_id_fkey') THEN
    ALTER TABLE "FileTemplate" ADD CONSTRAINT "filetemplate_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "File"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'filetemplate_tenant_id_fkey') THEN
    ALTER TABLE "FileTemplate" ADD CONSTRAINT "filetemplate_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fileactivity_file_id_fkey') THEN
    ALTER TABLE "FileActivity" ADD CONSTRAINT "fileactivity_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "File"("id") ON DELETE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'users_tenant_id_fkey') THEN
    ALTER TABLE "users" ADD CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL;
  END IF;
END $$;

-- ============================================
-- Triggers for updated_at (Safe - Only if not exists)
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_account_updated_at') THEN
    CREATE TRIGGER update_account_updated_at BEFORE UPDATE ON "Account"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_transaction_updated_at') THEN
    CREATE TRIGGER update_transaction_updated_at BEFORE UPDATE ON "Transaction"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenant_updated_at') THEN
    CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON "Tenant"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_file_updated_at') THEN
    CREATE TRIGGER update_file_updated_at BEFORE UPDATE ON "File"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_fileprocessing_updated_at') THEN
    CREATE TRIGGER update_fileprocessing_updated_at BEFORE UPDATE ON "FileProcessing"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_filetemplate_updated_at') THEN
    CREATE TRIGGER update_filetemplate_updated_at BEFORE UPDATE ON "FileTemplate"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_users_updated_at') THEN
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  END IF;
END $$;
