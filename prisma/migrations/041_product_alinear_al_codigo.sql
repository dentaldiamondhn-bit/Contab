-- 041_product_alinear_al_codigo.sql
--
-- MOTIVO
-- La tabla `Product` de la base real no coincidia con el codigo, asi que TODO el
-- inventario respondia 500:
--
--   GET /api/inventory/products
--     -> PGRST205  Could not find the table 'public.product'
--        (hint: Perhaps you meant the table 'public.Product')
--
-- Medido contra la base (spec OpenAPI de PostgREST + sondeo columna a columna):
--
--   tabla    : `Product`      (el codigo consulta `product`, en minusculas)
--   tenant   : `tenantId`     (el codigo filtra por `tenant_id`)
--   stock    : `currentStock` (el codigo usa `current_stock`)
--   faltaban : is_active, unit_cost, sale_price, unit_price, current_cost,
--              min_stock, max_stock, tax_rate, type, unit, product_type,
--              valuation_method, warehouse_id, image_url, created_at, updated_at
--
-- ESTADO: `Product` tiene 0 filas (verificado con count exact). No hay datos que
-- migrar ni que se puedan perder, asi que los RENAME son seguros.
--
-- QUE HACE
--   1. Renombra la tabla `Product` -> `product`.
--   2. Renombra las columnas camelCase a los nombres snake_case que usa el codigo.
--   3. Anade las columnas que faltan, con los defaults que el codigo asume.
--   4. Indices que el esquema Prisma declara y las consultas necesitan.
--
-- NO se crea una vista `"Product"`: ninguna ruta del proyecto consulta ese nombre
-- (solo aparece en `@@map` de Prisma). Anadirla seria una capa de compatibilidad
-- sin consumidores.
--
-- REVISA ESTE ARCHIVO ANTES DE EJECUTARLO: es un cambio de esquema.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tabla: Product -> product
-- ---------------------------------------------------------------------------
ALTER TABLE IF EXISTS "Product" RENAME TO product;

-- ---------------------------------------------------------------------------
-- 2. Columnas camelCase -> snake_case
-- ---------------------------------------------------------------------------
-- Cada RENAME va en su propia sentencia, con guarda de existencia.
--
-- Antes esto era un unico bloque `DO $$ ... $$` que ademas leia
-- `information_schema`. Es fragil: PL/pgSQL cachea los planes de sus consultas y
-- el bloque mezclaba DDL con lecturas del catalogo de la MISMA tabla (estado
-- obsoleto). Con sentencias sueltas el orden es explicito y verificable.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='product' AND column_name='tenantId') THEN
    ALTER TABLE public.product RENAME COLUMN "tenantId" TO tenant_id;
  END IF;
END $$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns
             WHERE table_schema='public' AND table_name='product' AND column_name='currentStock') THEN
    ALTER TABLE public.product RENAME COLUMN "currentStock" TO current_stock;
  END IF;
END $$;

-- `companyId` y `company_id` coexisten (ambas existen, verificado). NO se borra
-- `companyId`: se copia su valor a `company_id` y se deja la columna en su sitio.
-- Borrarla seria destructivo si algun dia trae datos; hoy la tabla esta vacia,
-- pero el RENAME/DROP no es necesario para que el codigo funcione.
-- Si quieres eliminarla, hazlo en una migracion aparte y a proposito.
UPDATE public.product
   SET company_id = "companyId"
 WHERE company_id IS NULL
   AND "companyId" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- 3. Columnas que el codigo usa y no existen.
--    Tipos y defaults segun el esquema Prisma (model Product) y los valores que
--    ya aplican las rutas al insertar.
-- ---------------------------------------------------------------------------
ALTER TABLE public.product
  ADD COLUMN IF NOT EXISTS type             text        NOT NULL DEFAULT 'PRODUCT',
  ADD COLUMN IF NOT EXISTS category         text,
  ADD COLUMN IF NOT EXISTS unit             text        DEFAULT 'Unidad',
  ADD COLUMN IF NOT EXISTS min_stock        numeric     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS max_stock        numeric     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS unit_cost        numeric     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS sale_price       numeric     NOT NULL DEFAULT 0,
  -- El codigo lee/escribe `unit_price` y `current_cost` (products/route.ts).
  -- Se anaden como columnas reales en vez de reescribir 60 puntos de llamada.
  ADD COLUMN IF NOT EXISTS unit_price       numeric     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS current_cost     numeric     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_active        boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS is_trackable     boolean     NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS tax_rate         numeric     NOT NULL DEFAULT 15,
  ADD COLUMN IF NOT EXISTS product_type     text        NOT NULL DEFAULT 'product',
  ADD COLUMN IF NOT EXISTS valuation_method text        NOT NULL DEFAULT 'weighted_average',
  ADD COLUMN IF NOT EXISTS warehouse_id     text,
  ADD COLUMN IF NOT EXISTS image_url        text,
  ADD COLUMN IF NOT EXISTS is_service       boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stock_quantity   numeric     NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS created_at       timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at       timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS deleted_at       timestamptz;

-- Si `current_stock` ya venia con datos (0 filas hoy), reflejarlos en stock_quantity.
UPDATE public.product
   SET stock_quantity = current_stock
 WHERE stock_quantity <> current_stock;

-- ---------------------------------------------------------------------------
-- 4. Indices declarados en Prisma y usados por las consultas.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_product_tenant  ON public.product (tenant_id);
CREATE INDEX IF NOT EXISTS idx_product_company ON public.product (company_id);
CREATE INDEX IF NOT EXISTS idx_product_active  ON public.product (is_active);
CREATE UNIQUE INDEX IF NOT EXISTS unique_product_code_company
  ON public.product (code, company_id);

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICACION (ejecutar despues, debe devolver 21 columnas clave y la tabla en
-- minusculas). Si Supabase sigue diciendo PGRST205, recargar el cache de esquema:
--   NOTIFY pgrst, 'reload schema';
-- ---------------------------------------------------------------------------
-- SELECT column_name FROM information_schema.columns
--  WHERE table_schema='public' AND table_name='product' ORDER BY 1;
