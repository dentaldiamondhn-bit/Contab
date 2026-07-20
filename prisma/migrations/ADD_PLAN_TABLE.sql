-- Crear tabla Plan en SQLite
CREATE TABLE IF NOT EXISTS "Plan" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "name" TEXT NOT NULL,
  "code" TEXT NOT NULL UNIQUE,
  "price" INTEGER NOT NULL,
  "max_users" INTEGER NOT NULL,
  "max_storage" INTEGER NOT NULL,
  "max_transactions" INTEGER NOT NULL,
  "features" TEXT NOT NULL DEFAULT '[]',
  "modules" TEXT NOT NULL DEFAULT '[]',
  "is_active" INTEGER NOT NULL DEFAULT 1,
  "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Crear índices
CREATE INDEX IF NOT EXISTS "idx_plan_code" ON "Plan"("code");
CREATE INDEX IF NOT EXISTS "idx_plan_is_active" ON "Plan"("is_active");
