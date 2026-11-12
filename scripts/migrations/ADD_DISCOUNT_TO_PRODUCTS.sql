-- ========================================
-- AGREGAR DESCUENTO A PRODUCTOS
-- ========================================

-- Agregar columna tags a la tabla Product (si no existe)
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT '{}';

-- Agregar columna isDiscount a la tabla Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "isDiscount" BOOLEAN DEFAULT false;

-- Agregar columna discountPrice a la tabla Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "discountPrice" DECIMAL(10,2);

-- Agregar columna expirationDate a la tabla Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "expirationDate" DATE;

-- Agregar columnas de fechas de promoción
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "promotionStartDate" DATE;
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "promotionEndDate" DATE;

-- Actualizar vista Products para incluir descuento, fecha de expiración y fechas de promoción
DROP VIEW IF EXISTS "Products";

CREATE VIEW "Products" AS
SELECT 
    p."id",
    p."tenantid",
    p."sku",
    p."name",
    p."description",
    p."category",
    p."unit",
    p."cost",
    p."price",
    p."discountPrice",
    p."isDiscount",
    p."stock",
    p."minstock",
    p."maxstock",
    p."tags",
    p."isActive",
    p."expirationDate",
    p."promotionStartDate",
    p."promotionEndDate",
    p."createdat",
    p."updatedat"
FROM "Product" p
WHERE p."isActive" = true;
