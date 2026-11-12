-- ========================================
-- AGREGAR FECHA DE EXPIRACIÓN A PRODUCTOS
-- ========================================

-- Agregar columna expirationDate a la tabla Product
ALTER TABLE "Product" ADD COLUMN IF NOT EXISTS "expirationDate" DATE;

-- Actualizar vista Products para incluir fecha de expiración
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
    p."createdat",
    p."updatedat"
FROM "Product" p
WHERE p."isActive" = true;
