-- 28 Sept 2026 — El numero de factura debe ser unico POR EMPRESA, no global.
--
-- "Invoice_invoiceNumber_key" es un UNIQUE global sobre invoiceNumber, asi que
-- dos empresas distintas no pueden tener a la vez el correlativo
-- 001-01-01-00000001. Eso es incorrecto: la numeracion fiscal va por emisor y
-- cada empresa lleva su propia serie. Peor aun, obliga a
-- app/api/billing/invoices a reintentar con un correlativo siguiente
-- (reserveInvoiceNumber con `suelo`) para esquivar el choque, dejando huecos en
-- la serie propia.
--
-- Idempotente: se puede ejecutar mas de una vez. PENDIENTE de aplicar en el
-- SQL Editor de Supabase.

-- 1. Si hay duplicados dentro de una misma empresa, el indice no se puede crear.
--    Se aborta aqui con el detalle en vez de dejar la tabla a medias.
DO $$
DECLARE
  dupes text;
BEGIN
  SELECT string_agg(d, '; ') INTO dupes FROM (
    SELECT format('%s / %s (x%s)', "tenantId", "invoiceNumber", n) AS d
    FROM (
      SELECT "tenantId", "invoiceNumber", count(*) AS n
      FROM "Invoice"
      GROUP BY "tenantId", "invoiceNumber"
      HAVING count(*) > 1
    ) q
  ) s;
  IF dupes IS NOT NULL THEN
    RAISE EXCEPTION 'Facturas duplicadas por empresa; corrigelas antes: %', dupes;
  END IF;
END
$$;

-- 2. Fuera el UNIQUE global. Puede ser un constraint (Prisma) o un indice suelto.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Invoice_invoiceNumber_key') THEN
    ALTER TABLE "Invoice" DROP CONSTRAINT "Invoice_invoiceNumber_key";
  ELSE
    DROP INDEX IF EXISTS "Invoice_invoiceNumber_key";
  END IF;
END
$$;

-- 3. El UNIQUE correcto: la serie es por empresa.
DROP INDEX IF EXISTS "Invoice_tenantId_invoiceNumber_key";
CREATE UNIQUE INDEX "Invoice_tenantId_invoiceNumber_key" ON "Invoice" ("tenantId", "invoiceNumber");
