-- 074 — Medidas por producto (`product_measure`) + precio con impuestos + unidad en lineas
--
-- PENDIENTE de aplicar en el SQL Editor de Supabase (el asistente no puede
-- ejecutar DDL: el host de Postgres no resuelve por DNS y solo hay PostgREST
-- con service_role). Se valida con: node scripts/validar-040.mjs prisma/migrations/074_product_measures.sql
--
-- QUE CREA:
--   1. Tabla `product_measure`: unidades de medida alternativas por producto
--      (Unidad / Caja / Paquete / Libra...) con su factor de conversion, su
--      costo y su precio de venta.
--   2. `product.price_includes_tax boolean NOT NULL DEFAULT false`.
--   3. `unit text` y `unit_factor integer DEFAULT 1` en las lineas de
--      `PurchaseItem`, `InvoiceItem` y `PurchaseReturnItem` (6 columnas, y esas
--      3 tablas son camelCase y con comillas dobles; `product` y
--      `product_measure` van en minusculas).
--
-- REGLAS DEL PROYECTO QUE CUMPLE:
--   - La frontera es `company_id`: el indice unico es
--     (company_id, product_id, lower(name)). El MISMO nombre de medida en dos
--     empresas distintas es legitimo; dentro de una empresa no se repite.
--   - Importes en LEMPIRAS (`cost`, `sale_price`): aqui no se divide ni se
--     multiplica por 100 (AGENTS.md, seccion 2).
--   - El guard `factor >= 1` vive en la BASE (CHECK), no solo en la API: con el
--     limite unicamente en el cliente, un POST con el cuerpo hecho a mano pasa
--     (leccion de los CHECK 1..5 de supplier_ratings, 042).
--   - Sin GRANT: la 062 no expone las tablas nuevas al Data API y aqui no se
--     anade ninguno (ni a anon, ni a authenticated, ni a PUBLIC).
--   - `prisma/schema.prisma` NO se toca (drift consciente, decidido en el plan).
--
-- MEDIDO antes de escribirla (18 Oct 2026, OpenAPI de PostgREST con
-- `service_role`, no supuesto):
--   - `product.id`           -> uuid   (default gen_random_uuid()).
--   - `product.company_id`   -> text   (format "text", nullable).
--   - `product_measure`      -> NO existe aun (no esta en las definitions).
--   - `PurchaseItem`, `InvoiceItem`, `PurchaseReturnItem` existen y NINGUNA
--     tiene hoy `unit` ni `unit_factor` (el preflight lo vuelve a medir).
--   - `product.price_includes_tax` tampoco existe aun.
--   - `product.unit` ya existe (text, default 'Unidad'): es la unidad BASE del
--     producto; `product_measure` guarda las demas medidas.
--   - En `product`, `sale_price` es bigint y `unit_price` es bigint: por eso
--     `product_measure.sale_price` va bigint y `cost` numeric.
--
-- IDEMPOTENTE, con preflight / execute / post-check en `DO $$` (patron de la
-- 073). Preflight que ABORTA con detalle si:
--   - no existe `product`, o `product.id` no es `uuid`, o `product.company_id`
--     no es `text` (el repo ya se comio un `operator does not exist: uuid =
--     text` por no medir, AGENTS.md seccion 5);
--   - `product_measure` ya existe pero con tipos distintos en sus columnas
--     criticas;
--   - alguna de las 6 columnas de linea o `product.price_includes_tax` ya
--     existe con OTRO tipo (`ADD COLUMN IF NOT EXISTS` no cambia el tipo: se lo
--     traga en silencio y el fallo sale despues, lejos de la causa);
--   - hay filas duplicadas por empresa+producto+nombre(minusculas), o filas con
--     `factor < 1` (si no, el CREATE UNIQUE o el ADD CONSTRAINT revientarian a
--     mitad sin decir cual es la fila).
-- Post-check que ABORTA si falta la tabla, alguna columna, el CHECK o algun
-- indice, o si queda alguna fila con `factor < 1`.
--
-- El indice unico se localiza POR COLUMNAS con `pg_index` + `pg_get_indexdef`
-- (lecciones 044/051/067): nunca comparando un `array_agg` contra un literal
-- escrito a mano, y con `btrim(..., '"')` porque `pg_get_indexdef` entrecomilla
-- los identificadores mixtos. Como ademas la expression es `lower(name)` (el
-- texto exacto que devuelve pg_pretty no esta medido aun, porque la tabla no
-- existe), el post-check acepta TAMBIEN el nombre fijo que aqui se crea
-- (`product_measure_empresa_producto_nombre_key`): el nombre si es nuestro.

-- ============================================================================
-- PREFLIGHT
-- ============================================================================
DO $$
DECLARE
  v_existe_producto boolean;
  v_existe_pm       boolean;
  v_tipo_id         text;
  v_tipo_empresa    text;
  v_real            text;
  v_col             text;
  v_esp             text;
  v_t               text;
  v_parte           text;
  v_idx_unico       text;
  v_idx_plano       text;
  v_check           text;
  v_dupes           text;
  n_factor          bigint;
  v_objetos text[] := ARRAY[
    'product|price_includes_tax|boolean',
    'PurchaseItem|unit|text',
    'PurchaseItem|unit_factor|integer',
    'InvoiceItem|unit|text',
    'InvoiceItem|unit_factor|integer',
    'PurchaseReturnItem|unit|text',
    'PurchaseReturnItem|unit_factor|integer'
  ];
  v_pm_tipos text[] := ARRAY[
    'product_id|uuid',
    'company_id|text',
    'factor|integer'
  ];
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. Los tipos que el FK y los filtros dan por hechos.
  -- ---------------------------------------------------------------------------
  SELECT to_regclass(format('public.%I', 'product')) IS NOT NULL
    INTO v_existe_producto;
  IF NOT v_existe_producto THEN
    RAISE EXCEPTION '074 ABORTA: no existe la tabla public.product.';
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo_id
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'product'
     AND a.attname = 'id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_tipo_id IS NULL THEN
    RAISE EXCEPTION '074 ABORTA: product.id no existe.';
  END IF;
  IF v_tipo_id <> 'uuid' THEN
    RAISE EXCEPTION '074 ABORTA: product.id es % y se esperaba uuid. El FK de
      product_measure apunta a product(id); el tipo hay que corregirlo a mano.',
      v_tipo_id;
  END IF;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo_empresa
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'product'
     AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_tipo_empresa IS NULL THEN
    RAISE EXCEPTION '074 ABORTA: product.company_id no existe. Aplica la 023
      (company_level_isolation) antes.';
  END IF;
  IF v_tipo_empresa <> 'text' THEN
    RAISE EXCEPTION '074 ABORTA: product.company_id es % y se esperaba text:
      uuid contra text da "operator does not exist: uuid = text" en runtime.',
      v_tipo_empresa;
  END IF;
  RAISE NOTICE '074: medido product.id = uuid, product.company_id = text.';

  -- ---------------------------------------------------------------------------
  -- 2. Si product_measure ya existe (re-ejecucion), sus tipos criticos tienen
  --    que ser los medidos: CREATE TABLE IF NOT EXISTS NO cambia tipos.
  -- ---------------------------------------------------------------------------
  SELECT to_regclass(format('public.%I', 'product_measure')) IS NOT NULL
    INTO v_existe_pm;

  IF v_existe_pm THEN
    FOREACH v_parte IN ARRAY v_pm_tipos LOOP
      v_col := split_part(v_parte, '|', 1);
      v_esp := split_part(v_parte, '|', 2);
      SELECT format_type(a.atttypid, a.atttypmod) INTO v_real
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public' AND c.relname = 'product_measure'
         AND a.attname = v_col AND a.attnum > 0 AND NOT a.attisdropped;
      IF v_real IS NULL THEN
        RAISE EXCEPTION '074 ABORTA: la tabla product_measure ya existe pero le
          falta la columna %.', v_col;
      END IF;
      IF v_real <> v_esp THEN
        RAISE EXCEPTION '074 ABORTA: product_measure.% es % y se esperaba %.
          Corregir a mano antes de aplicar la 074.', v_col, v_real, v_esp;
      END IF;
    END LOOP;
    RAISE NOTICE '074: la tabla product_measure ya existe; re-ejecucion idempotente.';
  ELSE
    RAISE NOTICE '074: product_measure todavia no existe; se creara.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 3. Las 6 columnas de linea + product.price_includes_tax: si ya existen,
  --    tienen que traer el tipo esperado (`ADD COLUMN IF NOT EXISTS` no cambia
  --    el tipo: se lo traga en silencio y el error de runtime sale despues).
  -- ---------------------------------------------------------------------------
  FOREACH v_parte IN ARRAY v_objetos LOOP
    v_t   := split_part(v_parte, '|', 1);
    v_col := split_part(v_parte, '|', 2);
    v_esp := split_part(v_parte, '|', 3);

    SELECT format_type(a.atttypid, a.atttypmod) INTO v_real
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = v_t
       AND a.attname = v_col AND a.attnum > 0 AND NOT a.attisdropped;

    IF v_real IS NOT NULL AND v_real <> v_esp THEN
      RAISE EXCEPTION '074 ABORTA: %.% ya existe con tipo %, y la migracion
        esperaba %. ADD COLUMN IF NOT EXISTS no cambia el tipo: corregirlo a
        mano antes de aplicar la 074.', v_t, v_col, v_real, v_esp;
    END IF;
    IF v_real IS NOT NULL THEN
      RAISE NOTICE '074: %.% ya existe con tipo %; no se toca.', v_t, v_col, v_real;
    END IF;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- 4. Datos: si la tabla ya hay filas, que sean consistentes antes de crear
  --    el indice unico y el CHECK (los dos validan las filas existentes).
  -- ---------------------------------------------------------------------------
  IF v_existe_pm THEN
    SELECT count(*) INTO n_factor
      FROM public.product_measure
     WHERE factor < 1;
    IF n_factor > 0 THEN
      RAISE EXCEPTION '074 ABORTA: % filas de product_measure con factor < 1.
        Corregirlas a mano antes (el CHECK product_measure_factor_positivo las
        rechazaria sin decir cuales son).', n_factor;
    END IF;

    SELECT string_agg(d, '  |  ') INTO v_dupes FROM (
      SELECT format('%s / %s / %s (x%s)', company_id, product_id,
                    lower(name), count(*)) AS d
        FROM public.product_measure
       GROUP BY company_id, product_id, lower(name)
      HAVING count(*) > 1
    ) q;
    IF v_dupes IS NOT NULL THEN
      RAISE EXCEPTION '074 ABORTA: medidas duplicadas por empresa+producto+nombre:
        %', v_dupes;
    END IF;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 5. El indice unico POR COLUMNAS (lecciones 044/051/067): recorrer pg_index
  --    con indnkeyatts y pg_get_indexdef(..., n, true) por POSICION, con
  --    btrim(..., '"'). La tercera clave es una expression: lower(name).
  -- ---------------------------------------------------------------------------
  SELECT pg_get_indexdef(i.indexrelid) INTO v_idx_unico
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'product_measure'
     AND i.indisunique AND i.indnkeyatts = 3
     AND (ic.relname = 'product_measure_empresa_producto_nombre_key'
          OR (btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
              AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'product_id'
              AND btrim(pg_get_indexdef(i.indexrelid, 3, true), '"')
                  IN ('lower(name)', '(lower(name))')))
   LIMIT 1;

  IF v_idx_unico IS NULL THEN
    RAISE NOTICE '074: el indice unico (company_id, product_id, lower(name)) todavia
      no existe; se creara.';
  ELSE
    RAISE NOTICE '074: el indice unico YA existe: %', v_idx_unico;
  END IF;

  SELECT pg_get_indexdef(i.indexrelid) INTO v_idx_plano
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'product_measure'
     AND i.indnkeyatts = 2
     AND (ic.relname = 'product_measure_producto_idx'
          OR (btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
              AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'product_id'))
   LIMIT 1;

  IF v_idx_plano IS NOT NULL THEN
    RAISE NOTICE '074: el indice product_measure_producto_idx YA existe: %', v_idx_plano;
  END IF;

  -- El CHECK: si ya esta, no se vuelve a anadir.
  IF v_existe_pm THEN
    SELECT con.conname INTO v_check
      FROM pg_constraint con
     WHERE con.conrelid = to_regclass('public.product_measure')
       AND con.contype = 'c'
       AND con.conname = 'product_measure_factor_positivo';
    IF v_check IS NOT NULL THEN
      RAISE NOTICE '074: el CHECK product_measure_factor_positivo ya existe.';
    END IF;
  END IF;
END $$;

-- ============================================================================
-- CAMBIOS
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Tabla de medidas por producto.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.product_measure (
  id                 uuid        NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id          text        NOT NULL,
  company_id         text        NOT NULL,
  product_id         uuid        NOT NULL REFERENCES public.product (id) ON DELETE CASCADE,
  name               text        NOT NULL,
  factor             integer     NOT NULL DEFAULT 1,
  cost               numeric,
  sale_price         bigint,
  price_includes_tax boolean     NOT NULL DEFAULT false,
  is_active          boolean     NOT NULL DEFAULT true,
  created_at         timestamptz DEFAULT now(),
  updated_at         timestamptz DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- 2. El guard `factor >= 1` en la BASE, no solo en la API.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_existe boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM pg_constraint con
     WHERE con.conrelid = to_regclass('public.product_measure')
       AND con.contype = 'c'
       AND con.conname = 'product_measure_factor_positivo'
  ) INTO v_existe;

  IF v_existe THEN
    RAISE NOTICE '074: el CHECK product_measure_factor_positivo ya existe; no se anade de nuevo.';
  ELSE
    ALTER TABLE public.product_measure
      ADD CONSTRAINT product_measure_factor_positivo CHECK (factor >= 1);
    RAISE NOTICE '074: creado CHECK product_measure_factor_positivo (factor >= 1).';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. El indice unico: mismo nombre de medida repetible ENTRE empresas, unico
--    DENTRO de la misma empresa y el mismo producto.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_existe boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
      FROM pg_index i
      JOIN pg_class ic ON ic.oid = i.indexrelid
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
     WHERE nsp.nspname = 'public' AND tc.relname = 'product_measure'
       AND i.indisunique AND i.indnkeyatts = 3
       AND (ic.relname = 'product_measure_empresa_producto_nombre_key'
            OR (btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
                AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'product_id'
                AND btrim(pg_get_indexdef(i.indexrelid, 3, true), '"')
                    IN ('lower(name)', '(lower(name))')))
  ) INTO v_existe;

  IF v_existe THEN
    RAISE NOTICE '074: el indice unico por empresa ya existe; no se crea de nuevo.';
  ELSE
    CREATE UNIQUE INDEX "product_measure_empresa_producto_nombre_key"
      ON public.product_measure (company_id, product_id, lower(name));
    RAISE NOTICE '074: creado "product_measure_empresa_producto_nombre_key".';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Indice de lectura: las medidas de un producto dentro de una empresa.
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS "product_measure_producto_idx"
  ON public.product_measure (company_id, product_id);

-- ---------------------------------------------------------------------------
-- 5. product.price_includes_tax: si el precio de venta ya lleva ISV.
-- ---------------------------------------------------------------------------
ALTER TABLE public.product
  ADD COLUMN IF NOT EXISTS price_includes_tax boolean NOT NULL DEFAULT false;

-- ---------------------------------------------------------------------------
-- 6. Las 6 columnas de linea de compra / factura / devolucion. Ojo: esas 3
--    tablas son camelCase y con comillas dobles.
-- ---------------------------------------------------------------------------
ALTER TABLE "PurchaseItem"
  ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE "PurchaseItem"
  ADD COLUMN IF NOT EXISTS unit_factor integer DEFAULT 1;

ALTER TABLE "InvoiceItem"
  ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE "InvoiceItem"
  ADD COLUMN IF NOT EXISTS unit_factor integer DEFAULT 1;

ALTER TABLE "PurchaseReturnItem"
  ADD COLUMN IF NOT EXISTS unit text;
ALTER TABLE "PurchaseReturnItem"
  ADD COLUMN IF NOT EXISTS unit_factor integer DEFAULT 1;

COMMIT;

-- ============================================================================
-- POST-CHECK
-- ============================================================================
DO $$
DECLARE
  v_parte   text;
  v_t       text;
  v_col     text;
  v_esp     text;
  v_real    text;
  v_falta   text := '';
  v_idx      text;
  v_check    text;
  n_factor   bigint;
  v_objetos text[] := ARRAY[
    'product_measure|id|uuid',
    'product_measure|tenant_id|text',
    'product_measure|company_id|text',
    'product_measure|product_id|uuid',
    'product_measure|name|text',
    'product_measure|factor|integer',
    'product_measure|cost|numeric',
    'product_measure|sale_price|bigint',
    'product_measure|price_includes_tax|boolean',
    'product_measure|is_active|boolean',
    'product_measure|created_at|timestamp with time zone',
    'product_measure|updated_at|timestamp with time zone',
    'product|price_includes_tax|boolean',
    'PurchaseItem|unit|text',
    'PurchaseItem|unit_factor|integer',
    'InvoiceItem|unit|text',
    'InvoiceItem|unit_factor|integer',
    'PurchaseReturnItem|unit|text',
    'PurchaseReturnItem|unit_factor|integer'
  ];
BEGIN
  -- ---------------------------------------------------------------------------
  -- 1. La tabla tiene que estar.
  -- ---------------------------------------------------------------------------
  IF to_regclass('public.product_measure') IS NULL THEN
    RAISE EXCEPTION '074 FALLA: no quedo la tabla public.product_measure.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 2. Las 19 columnas, con su tipo. Hace falta medir tambien el tipo: un
  --    ADD COLUMN IF NOT EXISTS que no cambio un tipo erroneo pasaria este
  --    chequeo solo por nombre.
  -- ---------------------------------------------------------------------------
  FOREACH v_parte IN ARRAY v_objetos LOOP
    v_t   := split_part(v_parte, '|', 1);
    v_col := split_part(v_parte, '|', 2);
    v_esp := split_part(v_parte, '|', 3);

    SELECT format_type(a.atttypid, a.atttypmod) INTO v_real
      FROM pg_attribute a
      JOIN pg_class c ON c.oid = a.attrelid
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relname = v_t
       AND a.attname = v_col AND a.attnum > 0 AND NOT a.attisdropped;

    IF v_real IS NULL THEN
      v_falta := v_falta || '  AUSENTE: ' || v_t || '.' || v_col || ';';
    ELSIF v_real <> v_esp THEN
      v_falta := v_falta || '  TIPO MALO: ' || v_t || '.' || v_col
                 || ' es ' || v_real || ' y se esperaba ' || v_esp || ';';
    END IF;
  END LOOP;
  IF v_falta <> '' THEN
    RAISE EXCEPTION '074 FALLA: columnas: %', v_falta;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 3. El CHECK y los dos indices.
  -- ---------------------------------------------------------------------------
  SELECT con.conname INTO v_check
    FROM pg_constraint con
   WHERE con.conrelid = to_regclass('public.product_measure')
     AND con.contype = 'c'
     AND con.conname = 'product_measure_factor_positivo';
  IF v_check IS NULL THEN
    RAISE EXCEPTION '074 FALLA: no quedo el CHECK product_measure_factor_positivo.';
  END IF;

  SELECT pg_get_indexdef(i.indexrelid) INTO v_idx
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'product_measure'
     AND i.indisunique AND i.indnkeyatts = 3
     AND (ic.relname = 'product_measure_empresa_producto_nombre_key'
          OR (btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
              AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'product_id'
              AND btrim(pg_get_indexdef(i.indexrelid, 3, true), '"')
                  IN ('lower(name)', '(lower(name))')))
   LIMIT 1;
  IF v_idx IS NULL THEN
    RAISE EXCEPTION '074 FALLA: no quedo el indice unico
      (company_id, product_id, lower(name)).';
  END IF;

  SELECT pg_get_indexdef(i.indexrelid) INTO v_idx
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'product_measure'
     AND i.indnkeyatts = 2
     AND (ic.relname = 'product_measure_producto_idx'
          OR (btrim(pg_get_indexdef(i.indexrelid, 1, true), '"') = 'company_id'
              AND btrim(pg_get_indexdef(i.indexrelid, 2, true), '"') = 'product_id'))
   LIMIT 1;
  IF v_idx IS NULL THEN
    RAISE EXCEPTION '074 FALLA: no quedo el indice product_measure_producto_idx.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 4. Ninguna fila con factor < 1 (mide el resultado, no el exito de la
  --    sentencia: un ADD CONSTRAINT que no corrio daria el mismo "Success").
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO n_factor
    FROM public.product_measure
   WHERE factor < 1;
  IF n_factor > 0 THEN
    RAISE EXCEPTION '074 FALLA: % filas de product_measure con factor < 1.', n_factor;
  END IF;

  RAISE NOTICE '074 OK: tabla product_measure (12 columnas), product.price_includes_tax,
    6 columnas de linea, CHECK factor >= 1, indice unico por empresa y indice de
    producto. 0 filas con factor < 1.';
END $$;
