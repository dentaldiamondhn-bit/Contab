-- Script de migración para actualizar esquema existente en Supabase
-- Este script verifica y modifica las tablas existentes

-- Función para generar CUID (compatible con Prisma)
CREATE OR REPLACE FUNCTION generate_cuid()
RETURNS TEXT AS $$
DECLARE
  chars TEXT := '0123456789abcdefghijklmnopqrstuvwxyz';
  result TEXT := '';
  i INT;
BEGIN
  result := 'c';
  FOR i IN 1..24 LOOP
    result := result || substr(chars, (floor(random() * 36) + 1)::INT, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Verificar y crear tabla Tenant si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'Tenant') THEN
    CREATE TABLE "Tenant" (
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
  END IF;
END $$;

-- Alterar tabla Tenant si existe para agregar columnas faltantes
DO $$
BEGIN
  -- Agregar columnas si no existen
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'business_name') THEN
    ALTER TABLE "Tenant" ADD COLUMN "business_name" TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'business_rtn') THEN
    ALTER TABLE "Tenant" ADD COLUMN "business_rtn" TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'business_email') THEN
    ALTER TABLE "Tenant" ADD COLUMN "business_email" TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'business_address') THEN
    ALTER TABLE "Tenant" ADD COLUMN "business_address" TEXT NOT NULL DEFAULT '';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'tenant_code') THEN
    ALTER TABLE "Tenant" ADD COLUMN "tenant_code" TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'country') THEN
    ALTER TABLE "Tenant" ADD COLUMN "country" TEXT NOT NULL DEFAULT 'HN';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'phone_number') THEN
    ALTER TABLE "Tenant" ADD COLUMN "phone_number" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'logo_url') THEN
    ALTER TABLE "Tenant" ADD COLUMN "logo_url" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'timezone') THEN
    ALTER TABLE "Tenant" ADD COLUMN "timezone" TEXT NOT NULL DEFAULT 'America/Tegucigalpa';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'currency') THEN
    ALTER TABLE "Tenant" ADD COLUMN "currency" TEXT NOT NULL DEFAULT 'HNL';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'subscription_plan') THEN
    ALTER TABLE "Tenant" ADD COLUMN "subscription_plan" TEXT NOT NULL DEFAULT 'BASIC';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'max_users') THEN
    ALTER TABLE "Tenant" ADD COLUMN "max_users" INTEGER NOT NULL DEFAULT 5;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'max_storage') THEN
    ALTER TABLE "Tenant" ADD COLUMN "max_storage" INTEGER NOT NULL DEFAULT 100;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'max_transactions') THEN
    ALTER TABLE "Tenant" ADD COLUMN "max_transactions" INTEGER NOT NULL DEFAULT 10000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'monthly_cost') THEN
    ALTER TABLE "Tenant" ADD COLUMN "monthly_cost" INTEGER NOT NULL DEFAULT 1000;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'modules') THEN
    ALTER TABLE "Tenant" ADD COLUMN "modules" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'is_active') THEN
    ALTER TABLE "Tenant" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'created_at') THEN
    ALTER TABLE "Tenant" ADD COLUMN "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Tenant' AND column_name = 'updated_at') THEN
    ALTER TABLE "Tenant" ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Verificar y crear tabla users si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users') THEN
    CREATE TABLE "users" (
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
      "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
    );
  END IF;
END $$;

-- Alterar tabla users si existe para agregar columnas faltantes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'auth_id') THEN
    ALTER TABLE "users" ADD COLUMN "auth_id" TEXT UNIQUE;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'first_name') THEN
    ALTER TABLE "users" ADD COLUMN "first_name" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'last_name') THEN
    ALTER TABLE "users" ADD COLUMN "last_name" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'role') THEN
    ALTER TABLE "users" ADD COLUMN "role" TEXT NOT NULL DEFAULT 'user';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'is_active') THEN
    ALTER TABLE "users" ADD COLUMN "is_active" BOOLEAN NOT NULL DEFAULT true;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'password') THEN
    ALTER TABLE "users" ADD COLUMN "password" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'tenant_id') THEN
    ALTER TABLE "users" ADD COLUMN "tenant_id" TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'created_at') THEN
    ALTER TABLE "users" ADD COLUMN "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'users' AND column_name = 'updated_at') THEN
    ALTER TABLE "users" ADD COLUMN "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW();
  END IF;
END $$;

-- Crear foreign key para users.tenant_id si no existe
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                 WHERE constraint_name = 'users_tenant_id_fkey' 
                 AND table_name = 'users') THEN
    ALTER TABLE "users" 
    ADD CONSTRAINT "users_tenant_id_fkey" 
    FOREIGN KEY ("tenant_id") REFERENCES "Tenant"("id") 
    ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- Crear índices para Tenant
CREATE INDEX IF NOT EXISTS "idx_tenant_business_name" ON "Tenant"("business_name");
CREATE INDEX IF NOT EXISTS "idx_tenant_tenant_code" ON "Tenant"("tenant_code");
CREATE INDEX IF NOT EXISTS "idx_tenant_subscription_plan" ON "Tenant"("subscription_plan");
CREATE INDEX IF NOT EXISTS "idx_tenant_is_active" ON "Tenant"("is_active");

-- Crear índices para users
CREATE INDEX IF NOT EXISTS "idx_users_email" ON "users"("email");
CREATE INDEX IF NOT EXISTS "idx_users_auth_id" ON "users"("auth_id");
CREATE INDEX IF NOT EXISTS "idx_users_tenant_id" ON "users"("tenant_id");
CREATE INDEX IF NOT EXISTS "idx_users_role" ON "users"("role");
CREATE INDEX IF NOT EXISTS "idx_users_is_active" ON "users"("is_active");

-- Trigger para actualizar columnas de timestamp automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  -- Columna correcta en la tabla Tenant: "updatedat" (sin guión bajo)
  -- Columna correcta en la tabla "User": "updatedAt" (camelCase)
  IF TG_TABLE_NAME = 'Tenant' THEN
    NEW."updatedat" = CURRENT_TIMESTAMP;
  ELSIF TG_TABLE_NAME = 'User' THEN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
  ELSE
    NEW."updated_at" = CURRENT_TIMESTAMP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Aplicar trigger a Tenant
DROP TRIGGER IF EXISTS update_tenant_updated_at ON "Tenant";
CREATE TRIGGER update_tenant_updated_at BEFORE UPDATE ON "Tenant"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Aplicar trigger a users
DROP TRIGGER IF EXISTS update_users_updated_at ON "users";
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON "users"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
