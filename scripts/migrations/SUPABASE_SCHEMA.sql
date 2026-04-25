-- Habilitar extension UUID para PostgreSQL
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Función para generar CUID (compatible con Prisma)
CREATE OR REPLACE FUNCTION generate_cuid()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '0123456789abcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  i INT;
BEGIN
  -- Prefijo 'c' seguido de timestamp y caracteres aleatorios
  result := 'c';
  FOR i IN 1..24 LOOP
    result := result || substr(chars, (floor(random() * 36) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Tabla: Tenant
CREATE TABLE IF NOT EXISTS "Tenant" (
  "id" TEXT PRIMARY KEY DEFAULT generate_cuid(),
  "business_name" TEXT NOT NULL,
  "business_rtn" TEXT NOT NULL UNIQUE,
  "business_email" TEXT NOT NULL UNIQUE,
  "business_address" TEXT NOT NULL,
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
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Índices para Tenant
CREATE INDEX IF NOT EXISTS "idx_tenant_business_name" ON "Tenant"("business_name");
CREATE INDEX IF NOT EXISTS "idx_tenant_tenant_code" ON "Tenant"("tenant_code");
CREATE INDEX IF NOT EXISTS "idx_tenant_subscription_plan" ON "Tenant"("subscription_plan");
CREATE INDEX IF NOT EXISTS "idx_tenant_is_active" ON "Tenant"("is_active");

-- Tabla: User
CREATE TABLE IF NOT EXISTS "users" (
  "id" TEXT PRIMARY KEY DEFAULT generate_cuid(),
  "email" TEXT NOT NULL UNIQUE,
  "auth_id" TEXT UNIQUE,
  "first_name" TEXT,
  "last_name" TEXT,
  "role" TEXT NOT NULL DEFAULT 'user',
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "password" TEXT,
  "tenant_id" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "users_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Índices para User
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_auth_id" ON "users"("auth_id");
CREATE INDEX IF NOT EXISTS "idx_users_tenant_id" ON "users"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users"("role");
CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users"("is_active");

-- Tabla: Account
CREATE TABLE IF NOT EXISTS "Account" (
  "id" TEXT PRIMARY KEY DEFAULT generate_cuid(),
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "description" TEXT,
  "parent_id" TEXT,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "account_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "account_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "Account"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT "unique_code_tenant" UNIQUE ("code", "tenant_id")
);

-- Índices para Account
CREATE INDEX IF NOT EXISTS "idx_account_tenant" ON "Account"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_account_code" ON "Account"("code");
CREATE INDEX IF NOT EXISTS "idx_account_type" ON "Account"("type");
CREATE INDEX IF NOT EXISTS "idx_account_parent_id" ON "Account"("parent_id");
CREATE INDEX IF NOT EXISTS "idx_account_is_active" ON "Account"("is_active");

-- Tabla: Transaction
CREATE TABLE IF NOT EXISTS "Transaction" (
  "id" TEXT PRIMARY KEY DEFAULT generate_cuid(),
  "tenant_id" TEXT NOT NULL,
  "date" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "description" TEXT NOT NULL,
  "reference" TEXT,
  "voucher_type" TEXT NOT NULL,
  "voucher_number" INTEGER NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'HNL',
  "exchange_rate" NUMERIC(10, 2) NOT NULL DEFAULT 24.70,
  "total_amount" BIGINT NOT NULL,
  "cliente_rtn" TEXT,
  "proveedor_rtn" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "transaction_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "unique_voucher_tenant" UNIQUE ("voucher_type", "voucher_number", "tenant_id")
);

-- Índices para Transaction
CREATE INDEX IF NOT EXISTS "idx_transaction_tenant" ON "Transaction"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_transaction_date" ON "Transaction"("date");
CREATE INDEX IF NOT EXISTS "idx_transaction_voucher_type" ON "Transaction"("voucher_type");
CREATE INDEX IF NOT EXISTS "idx_transaction_voucher_number" ON "Transaction"("voucher_number");
CREATE INDEX IF NOT EXISTS "idx_transaction_currency" ON "Transaction"("currency");

-- Tabla: JournalEntry
CREATE TABLE IF NOT EXISTS "JournalEntry" (
  "id" TEXT PRIMARY KEY DEFAULT generate_cuid(),
  "transaction_id" TEXT NOT NULL,
  "account_id" TEXT NOT NULL,
  "tenant_id" TEXT NOT NULL,
  "amount" BIGINT NOT NULL,
  "original_amount" BIGINT NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'HNL',
  "exchange_rate" NUMERIC(10, 2) NOT NULL DEFAULT 24.70,
  "description" TEXT,
  "cleared" BOOLEAN NOT NULL DEFAULT false,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "journal_entry_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "journal_entry_account_id_fkey" FOREIGN KEY ("account_id") REFERENCES "Account"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "journal_entry_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Índices para JournalEntry
CREATE INDEX IF NOT EXISTS "idx_entry_tenant" ON "JournalEntry"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_entry_transaction" ON "JournalEntry"("transaction_id");
CREATE INDEX IF NOT EXISTS "idx_entry_account" ON "JournalEntry"("account_id");
CREATE INDEX IF NOT EXISTS "idx_entry_cleared" ON "JournalEntry"("cleared");

-- Tabla: File
CREATE TABLE IF NOT EXISTS "File" (
  "id" TEXT PRIMARY KEY DEFAULT generate_cuid(),
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
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "deleted_at" TIMESTAMP WITH TIME ZONE,
  CONSTRAINT "file_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Índices para File
CREATE INDEX IF NOT EXISTS "idx_file_tenant" ON "File"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_file_uploaded_by" ON "File"("uploaded_by");
CREATE INDEX IF NOT EXISTS "idx_file_type" ON "File"("file_type");
CREATE INDEX IF NOT EXISTS "idx_file_category" ON "File"("category");
CREATE INDEX IF NOT EXISTS "idx_file_status" ON "File"("status");
CREATE INDEX IF NOT EXISTS "idx_file_created_at" ON "File"("created_at");
CREATE INDEX IF NOT EXISTS "idx_file_deleted_at" ON "File"("deleted_at");

-- Tabla: FileProcessing
CREATE TABLE IF NOT EXISTS "FileProcessing" (
  "id" TEXT PRIMARY KEY DEFAULT generate_cuid(),
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
  "started_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "completed_at" TIMESTAMP WITH TIME ZONE,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "file_processing_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Índices para FileProcessing
CREATE INDEX IF NOT EXISTS "idx_processing_file_id" ON "FileProcessing"("file_id");
CREATE INDEX IF NOT EXISTS "idx_processing_status" ON "FileProcessing"("status");
CREATE INDEX IF NOT EXISTS "idx_processing_started_at" ON "FileProcessing"("started_at");

-- Tabla: FileTemplate
CREATE TABLE IF NOT EXISTS "FileTemplate" (
  "id" TEXT PRIMARY KEY DEFAULT generate_cuid(),
  "tenant_id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "template_type" TEXT NOT NULL,
  "file_id" TEXT NOT NULL UNIQUE,
  "schema" TEXT NOT NULL,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "is_default" BOOLEAN NOT NULL DEFAULT false,
  "created_by" TEXT NOT NULL,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "file_template_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "file_template_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Índices para FileTemplate
CREATE INDEX IF NOT EXISTS "idx_template_tenant" ON "FileTemplate"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_template_type" ON "FileTemplate"("template_type");
CREATE INDEX IF NOT EXISTS "idx_template_is_active" ON "FileTemplate"("is_active");

-- Tabla: FileActivity
CREATE TABLE IF NOT EXISTS "FileActivity" (
  "id" TEXT PRIMARY KEY DEFAULT generate_cuid(),
  "file_id" TEXT NOT NULL,
  "user_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "details" TEXT,
  "ip_address" TEXT,
  "user_agent" TEXT,
  "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT "file_activity_file_id_fkey" FOREIGN KEY ("file_id") REFERENCES "File"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Índices para FileActivity
CREATE INDEX IF NOT EXISTS "idx_activity_file_id" ON "FileActivity"("file_id");
CREATE INDEX IF NOT EXISTS "idx_activity_user_id" ON "FileActivity"("user_id");
CREATE INDEX IF NOT EXISTS "idx_activity_action" ON "FileActivity"("action");
CREATE INDEX IF NOT EXISTS "idx_activity_created_at" ON "FileActivity"("created_at");

-- Trigger para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a todas las tablas que tienen updated_at
CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON "Tenant"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_account_updated_at BEFORE UPDATE ON "Account"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_transaction_updated_at BEFORE UPDATE ON "Transaction"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_updated_at BEFORE UPDATE ON "File"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_processing_updated_at BEFORE UPDATE ON "FileProcessing"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_file_template_updated_at BEFORE UPDATE ON "FileTemplate"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comentarios para documentación
COMMENT ON TABLE "Tenant" IS 'Tabla de tenants/empresas del sistema multi-tenant';
COMMENT ON TABLE "users" IS 'Tabla de usuarios del sistema';
COMMENT ON TABLE "Account" IS 'Tabla de cuentas contables';
COMMENT ON TABLE "Transaction" IS 'Tabla de transacciones contables';
COMMENT ON TABLE "JournalEntry" IS 'Tabla de asientos contables';
COMMENT ON TABLE "File" IS 'Tabla de archivos subidos por usuarios';
COMMENT ON TABLE "FileProcessing" IS 'Tabla de procesamiento de archivos';
COMMENT ON TABLE "FileTemplate" IS 'Tabla de plantillas de archivos';
COMMENT ON TABLE "FileActivity" IS 'Tabla de actividad de archivos (auditoría)';
