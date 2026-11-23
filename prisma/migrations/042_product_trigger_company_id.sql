-- 042_product_trigger_company_id.sql
--
-- MOTIVO
-- Despues de la 041 (renombrar `Product` -> `product` y `tenantId` -> `tenant_id`),
-- el SELECT funciona pero el INSERT falla:
--
--   insert into product (...) -> ERROR 42703
--     record "new" has no field "tenantId"
--
-- Causa: en `product` quedo enganchado el trigger que usa la funcion camelCase
-- `set_company_id_from_tenantid()`, que hace `new."tenantId"`. Al renombrar la
-- columna a `tenant_id`, PL/pgSQL ya no encuentra ese campo y aborta CUALQUIER
-- insert (y por tanto POST /api/inventory/products).
--
-- Segun la migracion 023, `product` pertenece al grupo snake (seccion 3a) y su
-- trigger deberia llamar a `set_company_id_from_tenant_id()` (`new.tenant_id`).
-- El grupo camel (3c) es solo para Account, Transaction, JournalEntry y "File".
-- La base tenia el trigger camel en `product`, asi que 023 se aplico en un estado
-- anterior a esa separacion y el archivo se edito despues sin re-ejecutarse.
--
-- QUE HACE
--   1. Quita de `product` cualquier trigger de empresa que use la funcion camel.
--   2. Deja exactamente un trigger `trg_set_company_id` con la funcion snake.
--   3. Comprueba que no queda ninguna referencia a `new."tenantId"` rota.
--
-- Es idempotente: se puede ejecutar mas de una vez.
-- Aplicar en el SQL Editor de Supabase (Prisma no la ejecuta sola).
--
-- DEPENDE de la 041 (la columna debe llamarse ya `tenant_id`).

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Quitar triggers camelCase que apunten a columnas inexistentes.
--    Se recorren los triggers de `product` y se borran los que llaman a la
--    funcion camel. Se hace por catalogo para no depender de nombres exactos.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  n integer := 0;
BEGIN
  FOR r IN
    SELECT t.tgname
      FROM pg_trigger t
      JOIN pg_class c   ON c.oid = t.tgrelid
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      JOIN pg_proc p    ON p.oid = t.tgfoid
     WHERE ns.nspname = 'public'
       AND c.relname  = 'product'
       AND NOT t.tgisinternal
       AND p.proname  = 'set_company_id_from_tenantid'
  LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS %I ON public.product', r.tgname);
    RAISE NOTICE '042: trigger camel eliminado en product: %', r.tgname;
    n := n + 1;
  END LOOP;
  RAISE NOTICE '042: triggers camel eliminados = %', n;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Dejar el trigger correcto (funcion snake, `new.tenant_id`).
--    La funcion ya existe (creada por la 023); se recrea por si acaso para que
--    esta migracion sea autosuficiente.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.set_company_id_from_tenant_id()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF new.company_id IS NULL AND new.tenant_id IS NOT NULL THEN
    new.company_id := public.oldest_company_of_tenant(new.tenant_id);
  END IF;
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_company_id ON public.product;
CREATE TRIGGER trg_set_company_id
  BEFORE INSERT OR UPDATE OF tenant_id ON public.product
  FOR EACH ROW EXECUTE FUNCTION public.set_company_id_from_tenant_id();

-- ---------------------------------------------------------------------------
-- 3. Verificacion: `product` no debe tener ningun trigger no interno que llame a
--    una funcion que mencione tenantId. Si aparece algo, la migracion avisa.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  r record;
  malos integer := 0;
BEGIN
  FOR r IN
    SELECT t.tgname, p.proname, pg_get_functiondef(p.oid) AS def
      FROM pg_trigger t
      JOIN pg_class c      ON c.oid = t.tgrelid
      JOIN pg_namespace ns ON ns.oid = c.relnamespace
      JOIN pg_proc p       ON p.oid = t.tgfoid
     WHERE ns.nspname = 'public'
       AND c.relname  = 'product'
       AND NOT t.tgisinternal
  LOOP
    IF r.def LIKE '%tenantId%' THEN
      RAISE WARNING '042: el trigger % sigue usando tenantId (funcion %)', r.tgname, r.proname;
      malos := malos + 1;
    ELSE
      RAISE NOTICE '042 OK: trigger % -> % (sin tenantId)', r.tgname, r.proname;
    END IF;
  END LOOP;

  IF malos > 0 THEN
    RAISE EXCEPTION '042: quedan % triggers con tenantId en product; revisar antes de dar por buena la migracion.', malos;
  END IF;
END $$;

COMMIT;

-- ---------------------------------------------------------------------------
-- VERIFICACION MANUAL (opcional, tras ejecutar):
--
--   SELECT tgname, pg_get_triggerdef(oid)
--     FROM pg_trigger
--    WHERE tgrelid = 'public.product'::regclass AND NOT tgisinternal;
--
--   -- Prueba de insercion real:
--   INSERT INTO public.product (tenant_id, code, name)
--   VALUES ('TEST1DS', '__PRUEBA__', '__PRUEBA__')
--   RETURNING id, company_id;
--   DELETE FROM public.product WHERE code = '__PRUEBA__';
-- ---------------------------------------------------------------------------
