-- Migración: Compras y Proveedores a la BD (paso 1 de 2)
-- CAMBIA company_id de uuid a text para soportar los códigos de empresa existentes (ej. 'ANGELOH7')
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

-- 1) Purchase: company_id uuid -> text
ALTER TABLE "Purchase"
    ALTER COLUMN company_id TYPE text;

-- 2) Supplier: company_id uuid -> text
ALTER TABLE "Supplier"
    ALTER COLUMN company_id TYPE text;

-- 3) SupplierPayment: company_id uuid -> text (para registrar empresa del pago)
ALTER TABLE "SupplierPayment"
    ALTER COLUMN company_id TYPE text;

-- 4) Supplier.rtn: varchar(16) -> varchar(20) (el RTN con guiones llega a 17 caracteres)
ALTER TABLE "Supplier"
    ALTER COLUMN rtn TYPE varchar(20);

-- 5) Índices para filtrar por empresa/tennant
CREATE INDEX IF NOT EXISTS idx_purchase_company ON "Purchase" (company_id);
CREATE INDEX IF NOT EXISTS idx_purchase_tenant ON "Purchase" (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_company ON "Supplier" (company_id);
CREATE INDEX IF NOT EXISTS idx_supplier_tenant ON "Supplier" (tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_payment_company ON "SupplierPayment" (company_id);

-- Verificación (debe decir text en data_type para las columnas y no dar error)
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (table_name, column_name) IN (('Purchase', 'company_id'), ('Supplier', 'company_id'), ('SupplierPayment', 'company_id'));