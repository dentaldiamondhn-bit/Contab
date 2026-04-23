-- ============================================
-- Migration Script - Preserve Existing Data
-- ============================================
-- This script migrates existing data to match the new schema
-- It adds missing columns and migrates data where needed
-- ============================================

-- ============================================
-- Step 1: Add missing columns to existing tables
-- ============================================

-- Account table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Account' AND column_name = 'tenant_id') THEN
    ALTER TABLE "Account" ADD COLUMN "tenant_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Account' AND column_name = 'parent_id') THEN
    ALTER TABLE "Account" ADD COLUMN "parent_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Account' AND column_name = 'is_active') THEN
    ALTER TABLE "Account" ADD COLUMN "is_active" BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Account' AND column_name = 'updated_at') THEN
    ALTER TABLE "Account" ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Account' AND column_name = 'created_at') THEN
    ALTER TABLE "Account" ADD COLUMN "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Transaction table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'tenant_id') THEN
    ALTER TABLE "Transaction" ADD COLUMN "tenant_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'voucher_type') THEN
    ALTER TABLE "Transaction" ADD COLUMN "voucher_type" TEXT DEFAULT 'FACTURA';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'voucher_number') THEN
    ALTER TABLE "Transaction" ADD COLUMN "voucher_number" INTEGER DEFAULT 1;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'currency') THEN
    ALTER TABLE "Transaction" ADD COLUMN "currency" TEXT DEFAULT 'HNL';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'exchange_rate') THEN
    ALTER TABLE "Transaction" ADD COLUMN "exchange_rate" DECIMAL(10,2) DEFAULT 24.70;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'total_amount') THEN
    ALTER TABLE "Transaction" ADD COLUMN "total_amount" BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'cliente_rtn') THEN
    ALTER TABLE "Transaction" ADD COLUMN "cliente_rtn" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'proveedor_rtn') THEN
    ALTER TABLE "Transaction" ADD COLUMN "proveedor_rtn" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'updated_at') THEN
    ALTER TABLE "Transaction" ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'created_at') THEN
    ALTER TABLE "Transaction" ADD COLUMN "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- JournalEntry table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JournalEntry' AND column_name = 'transaction_id') THEN
    ALTER TABLE "JournalEntry" ADD COLUMN "transaction_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JournalEntry' AND column_name = 'account_id') THEN
    ALTER TABLE "JournalEntry" ADD COLUMN "account_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JournalEntry' AND column_name = 'tenant_id') THEN
    ALTER TABLE "JournalEntry" ADD COLUMN "tenant_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JournalEntry' AND column_name = 'original_amount') THEN
    ALTER TABLE "JournalEntry" ADD COLUMN "original_amount" BIGINT DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JournalEntry' AND column_name = 'currency') THEN
    ALTER TABLE "JournalEntry" ADD COLUMN "currency" TEXT DEFAULT 'HNL';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JournalEntry' AND column_name = 'exchange_rate') THEN
    ALTER TABLE "JournalEntry" ADD COLUMN "exchange_rate" DECIMAL(10,2) DEFAULT 24.70;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JournalEntry' AND column_name = 'description') THEN
    ALTER TABLE "JournalEntry" ADD COLUMN "description" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JournalEntry' AND column_name = 'cleared') THEN
    ALTER TABLE "JournalEntry" ADD COLUMN "cleared" BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'JournalEntry' AND column_name = 'created_at') THEN
    ALTER TABLE "JournalEntry" ADD COLUMN "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Tenant table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'modules') THEN
    ALTER TABLE "Tenant" ADD COLUMN "modules" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'max_storage') THEN
    ALTER TABLE "Tenant" ADD COLUMN "max_storage" INTEGER DEFAULT 100;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'max_transactions') THEN
    ALTER TABLE "Tenant" ADD COLUMN "max_transactions" INTEGER DEFAULT 10000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'monthly_cost') THEN
    ALTER TABLE "Tenant" ADD COLUMN "monthly_cost" INTEGER DEFAULT 1000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'updated_at') THEN
    ALTER TABLE "Tenant" ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'created_at') THEN
    ALTER TABLE "Tenant" ADD COLUMN "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- File table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'tenant_id') THEN
    ALTER TABLE "File" ADD COLUMN "tenant_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'original_name') THEN
    ALTER TABLE "File" ADD COLUMN "original_name" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'file_name') THEN
    ALTER TABLE "File" ADD COLUMN "file_name" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'file_path') THEN
    ALTER TABLE "File" ADD COLUMN "file_path" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'file_size') THEN
    ALTER TABLE "File" ADD COLUMN "file_size" INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'mime_type') THEN
    ALTER TABLE "File" ADD COLUMN "mime_type" TEXT DEFAULT 'application/octet-stream';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'file_type') THEN
    ALTER TABLE "File" ADD COLUMN "file_type" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'category') THEN
    ALTER TABLE "File" ADD COLUMN "category" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'description') THEN
    ALTER TABLE "File" ADD COLUMN "description" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'tags') THEN
    ALTER TABLE "File" ADD COLUMN "tags" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'uploaded_by') THEN
    ALTER TABLE "File" ADD COLUMN "uploaded_by" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'status') THEN
    ALTER TABLE "File" ADD COLUMN "status" TEXT DEFAULT 'active';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'metadata') THEN
    ALTER TABLE "File" ADD COLUMN "metadata" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'updated_at') THEN
    ALTER TABLE "File" ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'deleted_at') THEN
    ALTER TABLE "File" ADD COLUMN "deleted_at" TIMESTAMP(3);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'File' AND column_name = 'created_at') THEN
    ALTER TABLE "File" ADD COLUMN "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- FileTemplate table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'file_id') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "file_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'tenant_id') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "tenant_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'name') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "name" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'description') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "description" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'template_type') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "template_type" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'schema') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "schema" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'is_active') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "is_active" BOOLEAN DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'is_default') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "is_default" BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'created_by') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "created_by" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'updated_at') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileTemplate' AND column_name = 'created_at') THEN
    ALTER TABLE "FileTemplate" ADD COLUMN "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- FileProcessing table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'file_id') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "file_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'processing_type') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "processing_type" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'status') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "status" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'progress') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "progress" INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'total_rows') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "total_rows" INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'processed_rows') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "processed_rows" INTEGER;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'error_count') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "error_count" INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'errors') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "errors" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'warnings') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "warnings" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'results') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "results" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'started_at') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "started_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'completed_at') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "completed_at" TIMESTAMP(3);
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'updated_at') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileProcessing' AND column_name = 'created_at') THEN
    ALTER TABLE "FileProcessing" ADD COLUMN "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- users table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
    ALTER TABLE "users" ADD COLUMN "tenant_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE "users" ADD COLUMN "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- FileActivity table
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileActivity' AND column_name = 'file_id') THEN
    ALTER TABLE "FileActivity" ADD COLUMN "file_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileActivity' AND column_name = 'user_id') THEN
    ALTER TABLE "FileActivity" ADD COLUMN "user_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileActivity' AND column_name = 'action') THEN
    ALTER TABLE "FileActivity" ADD COLUMN "action" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileActivity' AND column_name = 'details') THEN
    ALTER TABLE "FileActivity" ADD COLUMN "details" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileActivity' AND column_name = 'ip_address') THEN
    ALTER TABLE "FileActivity" ADD COLUMN "ip_address" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileActivity' AND column_name = 'user_agent') THEN
    ALTER TABLE "FileActivity" ADD COLUMN "user_agent" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'FileActivity' AND column_name = 'created_at') THEN
    ALTER TABLE "FileActivity" ADD COLUMN "created_at" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- ============================================
-- Step 2: Migrate data from old column names if needed
-- ============================================

-- If there's an old 'amount' column in Transaction that needs to be moved to total_amount
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'amount')
     AND NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Transaction' AND column_name = 'total_amount_old') THEN
    -- Rename old amount to total_amount_old temporarily
    ALTER TABLE "Transaction" RENAME COLUMN "amount" TO "total_amount_old";
    -- Copy data to new total_amount
    UPDATE "Transaction" SET "total_amount" = CAST("total_amount_old" AS BIGINT) WHERE "total_amount" IS NULL OR "total_amount" = 0;
  END IF;
END $$;

-- ============================================
-- Step 3: Create indexes (only if they don't exist)
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS "unique_code_tenant" ON "Account"("code", "tenant_id");
CREATE INDEX IF NOT EXISTS "idx_account_tenant" ON "Account"("tenant_id");

CREATE UNIQUE INDEX IF NOT EXISTS "unique_voucher_tenant" ON "Transaction"("voucher_type", "voucher_number", "tenant_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_tenant" ON "Transaction"("tenant_id");

CREATE INDEX IF NOT EXISTS "idx_entry_tenant" ON "JournalEntry"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_entry_transaction" ON "JournalEntry"("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_entry_account" ON "JournalEntry"("account_id");

CREATE INDEX IF NOT EXISTS "idx_file_tenant" ON "File"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_file_uploaded_by" ON "File"("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_file_type" ON "File"("file_type");
CREATE INDEX IF NOT EXISTS "idx_file_category" ON "File"("category");
CREATE INDEX IF NOT EXISTS "idx_file_status" ON "File"("status");
CREATE INDEX IF NOT EXISTS "idx_file_created_at" ON "File"("created_at");

CREATE INDEX IF NOT EXISTS "idx_processing_file_id" ON "FileProcessing"("file_id");
CREATE INDEX IF NOT EXISTS "idx_processing_status" ON "FileProcessing"("status");
CREATE INDEX IF NOT EXISTS "idx_processing_started_at" ON "FileProcessing"("started_at");

CREATE INDEX IF NOT EXISTS "idx_template_tenant" ON "FileTemplate"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_template_type" ON "FileTemplate"("template_type");
CREATE INDEX IF NOT EXISTS "idx_template_is_active" ON "FileTemplate"("is_active");

CREATE INDEX IF NOT EXISTS "idx_activity_file_id" ON "FileActivity"("file_id");
CREATE INDEX IF NOT EXISTS "idx_activity_user_id" ON "FileActivity"("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_action" ON "FileActivity"("action");
CREATE INDEX IF NOT EXISTS "idx_activity_created_at" ON "FileActivity"("created_at");

-- ============================================
-- Step 4: Create foreign keys (only if they don't exist)
-- ============================================

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
-- Step 5: Create triggers for updated_at
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

-- ============================================
-- Migration Complete
-- ============================================
