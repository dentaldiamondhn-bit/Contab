-- ============================================================================
-- 041 - supplier_price_history: company_id en las migraciones + backfill
-- ----------------------------------------------------------------------------
-- *** PENDIENTE DE APLICAR EN EL SQL EDITOR DE SUPABASE ***
-- El host de la BD no resuelve desde la maquina del asistente, asi que el DDL
-- lo tiene que aplicar el usuario. Ver `CLAUDE.md`.
--
-- EL PROBLEMA QUE ESTA MIGRACION CIERRA (medido 5 Oct 2026, PostgREST)
--
-- El historial de precios por proveedor YA EXISTIA entero: tabla, modelo
-- Prisma, ruta CRUD (`app/api/suppliers/price-history/route.ts`), registro
-- automatico al crear compra (`lib/purchase-db.ts:350`), UI y tests (5/5
-- verdes). Lo que no existia era esto:
--
-- 1. `supplier_price_history.company_id` NO ESTABA EN NINGUNA MIGRACION, y si
--    estaba en el modelo Prisma. Pero el codigo lo escribe
--    (`lib/purchase-db.ts:363`) y lo filtra en GET, PATCH y DELETE
--    (`route.ts:45,166,198`).
--    O sea: la columna se creo A MANO en el SQL Editor en algun momento. Se
--    verifico que hoy SI existe y que ademas tiene su FK a `companies(id)`.
--
-- 2. ESO ROMPIA LA REPRODUCIBILIDAD Y LA 040. La migracion 040 comprueba en
--    su preflight que las 5 tablas del modulo tengan `company_id`
--    (`040:110-115`) y ABORTA si falta alguna. Como la columna no venia de
--    ninguna migracion, una base reconstruida desde el repo fallaria en el
--    preflight de la 040 antes de empezar. La 040 esta marcada como aplicada
--    solo porque se corrio contra una base donde la columna ya estaba a mano.
--
-- 3. ADEMAS NO HAY NI UN SOLO REGISTRO: 0 filas, con 2 `Purchase` y 3
--    `PurchaseItem` correctamente enlazados. La pantalla no ensena nada. Los
--    3 items si son_recuperables, asi que esta migracion tambien los backfillea.
--
-- QUE HACE
--   Bloque 0  preflight: que existan las tablas y columnas que se van a leer.
--   Bloque 1  inventario previo: cuantas filas hay y cuantas sin `company_id`.
--   Bloque 2  `ADD COLUMN IF NOT EXISTS company_id text` + FK + indice.
--             Idempotente: hoy la columna ya existe, asi que no hace nada.
--   Bloque 3  backfill de `company_id` en las filas que ya existieran.
--   Bloque 4  backfill de las FILAS de precio desde PurchaseItem x Purchase.
--   Bloque 5  politicas RLS por `user_company_access` (no por `tenant_id`).
--   Post-check aborta si queda alguna fila aislable sin empresa.
--
-- QUE NO HACE
--   - No reasigna empresas. `Purchase.company_id` es 2/2 coherente y
--     `Supplier` 3/3 (027b2 y 040), asi que la empresa se COPIA, no se decide.
--   - No inventa `company_id` donde no hay proveedor real que lo aporte.
--   - No toca la moneda ni la precision mas alla del comentario del bloque 4.
--
-- MEDIDO ANTES DE ESCRIBIR ESTO (5 Oct 2026, PostgREST)
--   supplier_price_history: 0 filas. Columnas reales: id uuid, tenant_id text,
--     supplier_id text, product_id text, price numeric, currency text,
--     effective_date timestamptz, expiry_date timestamptz, notes text,
--     created_at timestamptz, updated_at timestamptz, company_id text (FK a
--     companies.id).
--   Purchase: 2 filas, las 2 de DICOSA (693af3cd-ef07-457e-b001-a274417bc110),
--     tenant_id '1', company_id 73d5bbf7-8e47-470e-9430-da513e623ab7 (Empresa 1).
--     facturas 0080020100018980 (2026-09-03) y 0080020100018981 (2026-09-04).
--   PurchaseItem: 3 filas, y las 3 enlazadas a esas 2 compras (NO huerfanas):
--     'Guantes' 119 (product_id NULL), 'Guantes' 2 (product_id
--     1dca7ec1-...), 'gasas' 6 (product_id NULL).
--   Las 3 cumplen el criterio de elegibilidad del codigo
--   (`recordSupplierPriceHistory`): product_id, product_name o description.
--   O sea que el backfill espera 3 filas.
--   `PurchaseItem` tiene `company_id` (FK a companies.id) y `tenant_id`.
--   `Purchase.invoice_date` es de tipo **`date`**, no `text`: medido en el
--   OpenAPI de PostgREST, `format: "date"`. Lo primero que vi fue el JSON
--   ('2026-09-03') y lo lei como TEXT; el tipo importa mas que como se vea.
--   Por eso el cast de mas abajo pasa por `::text`: `(date || unknown)` no
--   existe, `date ~ regex` tampoco. Un tipo mal supuesto rompe en RUNTIME, no
--   al parsear: el error sale en la linea del INSERT y a paginas de la causa.
--
-- `company_id` es `text` y no `uuid` porque `companies.id` es `text`. Declararlo
-- uuid rompe la migracion (AGENTS.md, seccion 5).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Bloque 0: preflight. Un UPDATE/INSERT sobre una columna o tabla que no existe
-- falla lejos de su causa, y el error que se lee no dice que faltaba el
-- esquema. Se comprueba TODO antes de escribir nada.
--
-- `to_regclass` con un identificador sin comillas lo pliega a minusculas y
-- devuelve NULL aunque el objeto exista, asi que las columnas se comprueban en
-- `information_schema`, que no sufre el plegado.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_tabla  text;
  v_faltan text;
BEGIN
  FOREACH v_tabla IN ARRAY ARRAY[
    'supplier_price_history', 'Purchase', 'PurchaseItem', 'Supplier',
    'companies', 'user_company_access', 'User'
  ]
  LOOP
    IF to_regclass(format('public.%I', v_tabla)) IS NULL THEN
      RAISE EXCEPTION '041: no existe la tabla public.%', v_tabla;
    END IF;
  END LOOP;

  -- Columnas de origen del backfill. Si `Purchase.invoice_date` desapareciera
  -- el cast del bloque 4 reventaria lejos de la causa.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'Purchase'
      AND column_name IN ('supplier_id', 'invoice_number', 'invoice_date', 'company_id')
    GROUP BY 1 HAVING count(*) = 4
  ) THEN
    -- Ojo: los cuatro mensajes usan `coalesce(v_faltan || ', ', ...)`, incluido el
-- primero. Con `:=` a secas, reordenar estos chequeos haria que el primero que
-- se ejecute **pisase** los hallazgos de los anteriores en vez de añadirlos.
v_faltan := coalesce(v_faltan || ', ') || 'Purchase.{supplier_id|invoice_number|invoice_date|company_id}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'PurchaseItem'
      AND column_name IN ('purchase_id', 'product_id', 'product_name', 'description', 'unit_price')
    GROUP BY 1 HAVING count(*) = 5
  ) THEN
    v_faltan := coalesce(v_faltan || ', ') || 'PurchaseItem.{purchase_id|product_id|product_name|description|unit_price}';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'supplier_price_history'
      AND column_name IN ('tenant_id', 'supplier_id', 'product_id', 'price', 'currency', 'effective_date', 'notes', 'created_at', 'updated_at')
    GROUP BY 1 HAVING count(*) = 9
  ) THEN
    v_faltan := coalesce(v_faltan || ', ') || 'supplier_price_history.{tenant_id|supplier_id|product_id|price|currency|effective_date|notes|created_at|updated_at}';
  END IF;

  -- El destino de las politicas del bloque 5.
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'user_company_access'
      AND column_name IN ('user_id', 'company_id')
    GROUP BY 1 HAVING count(*) = 2
  ) THEN
    v_faltan := coalesce(v_faltan || ', ') || 'user_company_access.{user_id|company_id}';
  END IF;

  IF v_faltan IS NOT NULL THEN
    RAISE EXCEPTION '041: faltan columnas esperadas: %', v_faltan;
  END IF;

  RAISE NOTICE '041: preflight OK - las 7 tablas existen con las columnas esperadas';
END $$;

-- ---------------------------------------------------------------------------
-- Bloque 1: inventario. Que sepas cuantas filas hay ANTES de escribir, y
-- cuantas serian recuperables desde PurchaseItem. Una migracion de solo-INSERT
-- sin este numero no permite distinguir "no habia nada" de "no funciono".
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_total     int;
  v_sin_empresa int;
  v_recuperables int;
BEGIN
  SELECT count(*) INTO v_total FROM public.supplier_price_history;
  SELECT count(*) INTO v_sin_empresa
    FROM public.supplier_price_history WHERE company_id IS NULL;

  -- Mismo criterio de elegibilidad que `recordSupplierPriceHistory`: se
  -- registra si el item trae product_id, product_name o description. Ojo con
  -- la cadena vacia: en JS `''` es falsy, asi que `nullif` + comparacion, no
  -- solo `IS NOT NULL`.
  SELECT count(*) INTO v_recuperables
    FROM public."PurchaseItem" i
    JOIN public."Purchase" p ON p.id = i.purchase_id
    WHERE i.product_id IS NOT NULL
       OR coalesce(nullif(i.product_name, ''), '') <> ''
       OR coalesce(nullif(i.description, ''), '') <> '';

  RAISE NOTICE '041: antes - % fila(s) de historial, % sin company_id, % PurchaseItem recuperables',
    v_total, v_sin_empresa, v_recuperables;
END $$;

-- ---------------------------------------------------------------------------
-- Bloque 2: la columna, su FK y su indice. Los tres idempotentes.
--
-- En la base viva la columna YA existe (con su FK), asi que las tres lineas no
-- hacen nada. En una base reconstruida desde el repo, si. Ese es el drift que
-- se cierra: a partir de aqui, `041` seguida de `042` da el mismo esquema que
-- la base actual, y el preflight de la `040` se puede volver a correr.
--
-- El indice sigue el nombre que usa Prisma para no crear un segundo indice
-- equivalente: el modelo declara `idx_supplier_price_company`.
-- ---------------------------------------------------------------------------
ALTER TABLE public.supplier_price_history
  ADD COLUMN IF NOT EXISTS company_id text;

DO $$
BEGIN
  -- El chequeo es POR COLUMNA y no por nombre. En la base viva la FK ya existe
  -- (medido via OpenAPI: `company_id` es FK a `companies.id`), pero se creo a
  -- mano y su nombre no es el que pone Postgres por defecto: el PostgREST lo
  -- declara como `supplier_price_history_company_id_fkey`, que es la convencion
  -- de Postgres, pero no se ha medido el `conname` real. Preguntar por el
  -- nombre podria no encontrar la FK existente y anadir una segunda sobre la
  -- misma columna: Postgres lo permite, asi que NO fallaria, y quedaria un
  -- constraint redundante que no dice nada y que nadie encontraria despues.
  -- Preguntar por "hay ALGUNA FK desde esta columna" no tiene ese fallo.
  IF EXISTS (
    SELECT 1
    FROM pg_constraint con
    JOIN unnest(con.conkey) AS k(attnum) ON true
    JOIN pg_attribute att
      ON att.attrelid = con.conrelid AND att.attnum = k.attnum
    JOIN pg_class rel ON rel.oid = con.confrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    WHERE con.conrelid = 'public.supplier_price_history'::regclass
      AND con.contype = 'f'
      AND att.attname = 'company_id'
      AND nsp.nspname = 'public'
      AND rel.relname = 'companies'
  ) THEN
    RAISE NOTICE '041: FK company_id -> companies(id) ya existia';
  ELSE
    ALTER TABLE public.supplier_price_history
      ADD CONSTRAINT supplier_price_history_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    RAISE NOTICE '041: FK company_id -> companies(id) creada';
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_supplier_price_company
  ON public.supplier_price_history (company_id);

-- El filtro de la ruta es `(supplier_id, product_id)` mas el orden por
-- `effective_date`. Este indice compuesto evita el sort en el GET.
CREATE INDEX IF NOT EXISTS idx_supplier_price_company_supplier_product_date
  ON public.supplier_price_history (company_id, supplier_id, product_id, effective_date DESC);

-- ---------------------------------------------------------------------------
-- Bloque 3: backfill de `company_id` en las filas que YA existieran.
-- Hoy son 0, asi que no escribe nada, pero sin esto una base con historico
-- previo dejaria filas que la ruta NO puede ver: GET filtra por
-- `.eq('company_id', empresa.companyId)` (`route.ts:45`), o sea que una fila con
-- `company_id` NULL es invisible para todos, sin error.
--
-- La empresa se COPIA de `Supplier`, que es 3/3 coherente (027b2 y 040).
-- `Supplier` gana porque el precio es "de este proveedor": es la relacion que
-- la fila declara en `supplier_id`. Si el proveedor no esta, se intenta por
-- `Purchase`; y si tampoco, la fila se avisa y se deja como estaba: no hay
-- empresa de la que deducirla y rellenarla seria inventar.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_n int;
BEGIN
  -- Los `::text` no son cosmeticos. `Supplier.id` y `Purchase.supplier_id` son
  -- `uuid`, pero `supplier_price_history.supplier_id` es `text`, y para `uuid`
  -- no hay conversion automatica en la comparacion: `s.id = r.supplier_id` da
  -- `operator does not exist: uuid = text`. Es el fallo que AGENTS.md (seccion 5)
  -- ya cobro una vez. La conversacion directa es por texto a proposito: no hace
  -- falta formatear el UUID, y no depende del formato de salida de `uuid_out`.
  UPDATE public.supplier_price_history r
  SET company_id = s.company_id
  FROM public."Supplier" s
  WHERE s.id::text = r.supplier_id
    AND r.company_id IS NULL
    AND s.company_id IS NOT NULL;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE '041: % fila(s) con company_id rellenada(s) desde Supplier', v_n;

  UPDATE public.supplier_price_history r
  SET company_id = p.company_id
  FROM public."Purchase" p
  WHERE p.supplier_id::text = r.supplier_id
    AND r.company_id IS NULL
    AND p.company_id IS NOT NULL;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE '041: % fila(s) rellenada(s) desde Purchase (Supplier no resolvia)', v_n;
END $$;

-- ---------------------------------------------------------------------------
-- Bloque 3b: `company_id` pasa a NOT NULL.
--
-- Medido (5 Oct 2026, OpenAPI): la columna hoy es NULLABLE, y con el filtro
-- `.eq('company_id', empresa.companyId)` de la ruta GET (`route.ts:45`), una fila
-- con `company_id` NULL NO la ve NADIE: no es un error ni una fila sin empresa,
-- es una fila que desaparece. Ese es el modo de fallo silencioso que conviene
-- cerrar en la BD y no solo por convencion.
--
-- Los dos unicos caminos de escritura ya la ponen, asi que el NOT NULL no rompe
-- nada legitimo:
--   - `recordSupplierPriceHistory` -> `company_id: empresa.companyId`
--     (`lib/purchase-db.ts:363`)
--   - `buildInsert` de la ruta POST -> `company_id: empresa.companyId`
--     (`route.ts:20`)
-- Y el PATCH no puede dejarla en NULL: solo copia `PRICE_COLUMNS`
-- (`route.ts:140`), que no incluye `company_id`.
--
-- Va DESPUES del bloque 3 y no antes porque `SET NOT NULL` falla si queda un
-- NULL, y solo el backfill puede resolverlos. Y va con guarda para que el
-- `ALTER` no reviente con `23502 column contains null values`: si quedara alguno
-- irresoluble avisa aqui y deja la columna como estaba, con un NOTICE que dice
-- cual es. El post-check del final es quien aborta ante ese caso, que es donde
-- se decide: una fila sin empresa es un dato que hay que arreglar a mano, no
-- algo que esta migracion pueda inventar.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_nulos int;
BEGIN
  SELECT count(*) INTO v_nulos
    FROM public.supplier_price_history WHERE company_id IS NULL;

  IF v_nulos > 0 THEN
    RAISE NOTICE '041: ATENCION - % fila(s) siguen sin company_id y el NOT NULL NO se aplica. Revisa el NOTICE del bloque 3.', v_nulos;
  ELSE
    ALTER TABLE public.supplier_price_history
      ALTER COLUMN company_id SET NOT NULL;
    RAISE NOTICE '041: company_id pasa a NOT NULL - una fila sin empresa ya no puede insertarse en silencio';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Bloque 4: backfill de las FILAS de precio desde PurchaseItem x Purchase.
-- --
-- Se replica lo que hace `recordSupplierPriceHistory` (`lib/purchase-db.ts:350`)
-- para que el historico que ya existe en la base se vea igual que el que
-- produciria la app hoy.
--
-- `notes` sale con el MISMO formato que el codigo:
--     `Registrado en compra - ${product_name || description || 'Producto'}`
-- Ojo: el codigo anade ` (Factura ${item.invoice_number})` si existe, pero
-- `invoice_number` nunca viene en el item, asi que en la practica esa parte
-- NUNCA sale. Aqui tampoco se anade: replicar el formato real es lo que hace
-- que el guard de idempotencia de abajo sea fiable.
--
-- `effective_date` replica el cast del codigo,
-- `new Date(invoiceDate + 'T00:00:00').toISOString()`: midnight UTC del dia de
-- la factura. `Purchase.invoice_date` es `date`, asi que hay que pasar por
-- `::text` antes de concatenar. Y el `Z` va EXPLICITO a proposito: sin el, un
-- 'YYYY-MM-DDT00:00:00' sin offset lo interpreta Postgres en el `TimeZone` de
-- la sesion, asi que el backfill moveria la fila un dia entero respecto a lo que
-- hace la app si el servidor no corre en UTC. Con `Z` el valor es el mismo
-- siempre. (La app usa el hora local del servidor; bajo UTC -- que es lo que
-- afirman los tests y lo que corre Supabase -- las dos coinciden.)
--
-- `price` se escribe SIN redondear. `recordSupplierPriceHistory` hace
-- `Math.round(...)` y la columna es `numeric`; con DECIMAL(18,4) ese redondeo
-- tira los decimales. Los 3 items de hoy (119, 2, 6) son enteros, asi que no
-- cambia nada aqui, pero el backfill deja el valor exacto y no arrastra el
-- defecto a datos nuevos. El `Math.round` del codigo sigue pendiente.
--
-- IDEMPOTENCIA: `supplier_price_history` no guarda el id de la compra, asi que
-- no hay una clave mejor que `(supplier_id, product_id, effective_date, price,
-- notes)`. Con esos 5 campos dos compras distintas del mismo proveedor, mismo
-- producto, mismo dia y mismo precio se considerarian la misma fila. Es el
-- limite de un historico que no referencia su origen; el post-check mide si el
-- backfill dejo filas sin resolver. Medido hoy: 3 items de 2 facturas con
-- fechas DISTINTAS (2026-09-03 y 2026-09-04), asi que aqui no colisionan.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_n int;
  v_esperados int;
  v_sin_fecha int;
BEGIN
  -- `invoice_date` es un `date` de verdad: Postgres no admite una fecha
  -- invalida, asi que el unico caso que hay que tratar es NULL. No hace falta
  -- (ni tendria sentido) un guard de regex, y con `date` daria
  -- `operator does not exist: date ~~ unknown`.
  SELECT count(*) INTO v_esperados
    FROM public."PurchaseItem" i
    JOIN public."Purchase" p ON p.id = i.purchase_id
    WHERE (i.product_id IS NOT NULL
           OR coalesce(nullif(i.product_name, ''), '') <> ''
           OR coalesce(nullif(i.description, ''), '') <> '')
      AND p.invoice_date IS NOT NULL;

  -- Se avisan ANTES de insertar, porque son justo las que el post-check no va
  -- a poder reconciliar. Inventar la fecha seria falsear el historico: el precio
  -- es lo que el proveedor cobraba en la fecha de SU factura, no en cualquiera.
  SELECT count(*) INTO v_sin_fecha
    FROM public."PurchaseItem" i
    JOIN public."Purchase" p ON p.id = i.purchase_id
    WHERE (i.product_id IS NOT NULL
           OR coalesce(nullif(i.product_name, ''), '') <> ''
           OR coalesce(nullif(i.description, ''), '') <> '')
      AND p.invoice_date IS NULL;

  IF v_sin_fecha > 0 THEN
    RAISE NOTICE '041: ATENCION - % PurchaseItem sin invoice_date. NO se registran: inventar la fecha seria falsear el historico.', v_sin_fecha;
  END IF;

  INSERT INTO public.supplier_price_history (
    tenant_id, company_id, supplier_id, product_id,
    price, currency, effective_date, notes, created_at, updated_at
  )
  SELECT
    p.tenant_id,
    p.company_id,
    p.supplier_id::text,
    i.product_id::text,
    i.unit_price,
    'HNL',
    (p.invoice_date::text || 'T00:00:00Z')::timestamptz,
    'Registrado en compra - ' || coalesce(nullif(i.product_name, ''), nullif(i.description, ''), 'Producto'),
    now(),
    now()
  FROM public."PurchaseItem" i
  JOIN public."Purchase" p ON p.id = i.purchase_id
  WHERE (i.product_id IS NOT NULL
         OR coalesce(nullif(i.product_name, ''), '') <> ''
         OR coalesce(nullif(i.description, ''), '') <> '')
    AND p.invoice_date IS NOT NULL
    AND p.tenant_id IS NOT NULL
    AND p.company_id IS NOT NULL
    AND NOT EXISTS (
      -- El guard compara `text` contra `uuid` por los dos lados
      -- (`supplier_id` y `product_id`), asi que los dos necesitan `::text`. Sin
      -- ellos el guard revienta con `operator does not exist: text = uuid` y la
      -- migracion aborta: el mecanismo que la hace idempotente seria justo lo que
      -- impide que corra.
      SELECT 1 FROM public.supplier_price_history r
      WHERE r.supplier_id = p.supplier_id::text
        AND r.product_id IS NOT DISTINCT FROM i.product_id::text
        AND r.effective_date = (p.invoice_date::text || 'T00:00:00Z')::timestamptz
        AND r.price IS NOT DISTINCT FROM i.unit_price
        AND r.notes IS NOT DISTINCT FROM
            'Registrado en compra - ' || coalesce(nullif(i.product_name, ''), nullif(i.description, ''), 'Producto')
    );

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RAISE NOTICE '041: % fila(s) de historial insertada(s) desde PurchaseItem (de % elegible(s))', v_n, v_esperados;

  -- Ojo con el filtro de arriba: usa `IS NOT NULL` y no `<>` para
  -- `p.tenant_id`/`p.company_id`. Con `<>`, un NULL da NULL (no TRUE) y el
  -- WHERE dejaria pasar la fila sin avisar, con una entrada sin empresa que el
  -- GET no veria nunca.
END $$;

-- ---------------------------------------------------------------------------
-- Bloque 5: las politicas RLS.
--
-- Lo que hay hoy (`supabase/014_supplier_price_history_rls.sql`) son 4
-- politicas que filtran SOLO por `tenant_id = (SELECT tenantid FROM "User"
-- WHERE authid = auth.uid()::TEXT)`. Ese es exactamente el patron que el
-- proyecto ya pays como su bug mas caro: `TEST1DS` tiene DOS empresas, asi que
-- un filtro por tenant no las separa y las dos se verian el historial la de la
-- otra.
--
-- Ademas `User.tenantid` es un campo LEGACY (AGENTS.md, seccion 1b): la fuente
-- de verdad de "a que empresas entra este usuario" es `user_company_access`.
-- Por eso las politicas nuevas van por `user_company_access.company_id` y no
-- por `"User".tenantid`.
--
-- Se avisa de algo que conviene no olvidar: esto NO cambia el comportamiento
-- de la aplicacion, porque `lib/supabase/server-lazy.ts` usa la
-- `SUPABASE_SERVICE_ROLE_KEY`, que salta el RLS por completo. El aislamiento
-- real sigue dependiendo del `.eq('company_id', ...)` del codigo. Lo que se
-- arregla aqui es que la politica, si alguien llega a depender del RLS, no
-- este equivocada.
--
-- `CREATE POLICY` no admite `IF NOT EXISTS`, asi que el patron idempotente es
-- `DROP POLICY IF EXISTS` + `CREATE`. Se conservan los nombres de la 014 para
-- que los `DROP POLICY IF EXISTS` de esta migracion losneyen sobre las
-- antiguas y no queden dos juegos de politicas vivos a la vez.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "Tenants can view own supplier price history" ON public.supplier_price_history;
DROP POLICY IF EXISTS "Tenants can insert own supplier price history" ON public.supplier_price_history;
DROP POLICY IF EXISTS "Tenants can update own supplier price history" ON public.supplier_price_history;
DROP POLICY IF EXISTS "Tenants can delete own supplier price history" ON public.supplier_price_history;

CREATE POLICY "Tenants can view own supplier price history" ON public.supplier_price_history
  FOR SELECT USING (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ));

CREATE POLICY "Tenants can insert own supplier price history" ON public.supplier_price_history
  FOR INSERT WITH CHECK (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ));

CREATE POLICY "Tenants can update own supplier price history" ON public.supplier_price_history
  FOR UPDATE USING (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ))
  WITH CHECK (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ));

CREATE POLICY "Tenants can delete own supplier price history" ON public.supplier_price_history
  FOR DELETE USING (company_id IN (
    SELECT uca.company_id
    FROM public.user_company_access uca
    JOIN public."User" u ON u.id = uca.user_id
    WHERE u.authid = auth.uid()::text
  ));

-- ---------------------------------------------------------------------------
-- Post-check. Una migracion de solo INSERT/UPDATE necesita medir su resultado:
-- sin esto no distingue "no habia nada que arreglar" de "no hizo nada".
-- Aborta si queda alguna fila con empresa que se pueda resolver.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_total      int;
  v_sin_empresa int;
  v_huerfanas  int;
  v_duplicadas int;
  v_persistidas int;
BEGIN
  SELECT count(*) INTO v_total FROM public.supplier_price_history;

  -- Filas que la ruta NO puede ver: GET filtra por company_id, asi que un NULL
  -- aqui es una fila invisible, no una fila sin empresa.
  SELECT count(*) INTO v_sin_empresa
    FROM public.supplier_price_history WHERE company_id IS NULL;

  -- company_id que no resuelve a ninguna empresa: no se puede arreglar, se
  -- avisa con NOTICE.
  SELECT count(*) INTO v_huerfanas
    FROM public.supplier_price_history r
    WHERE r.company_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM public.companies c WHERE c.id = r.company_id);

  IF v_sin_empresa > 0 THEN
    RAISE EXCEPTION '041: % fila(s) de historial sin company_id. La ruta GET las filtraria y serian invisibles.', v_sin_empresa;
  END IF;

  IF v_huerfanas > 0 THEN
    RAISE NOTICE '041: ATENCION - % fila(s) con company_id que no existe en companies. NO se tocaron.', v_huerfanas;
  END IF;

  -- El backfill es idempotente, asi que re-correrlo no debe crear mas filas.
  SELECT count(*) INTO v_duplicadas
  FROM (
    SELECT supplier_id, product_id, effective_date, price, notes, count(*) AS n
    FROM public.supplier_price_history
    GROUP BY supplier_id, product_id, effective_date, price, notes
    HAVING count(*) > 1
  ) d;

  IF v_duplicadas > 0 THEN
    RAISE NOTICE '041: ATENCION - % grupo(s) con duplicados en (supplier_id, product_id, effective_date, price, notes). El historico no referencia su compra de origen, asi que puede ser legitimo.', v_duplicadas;
  END IF;

  -- Comprobacion explicita del caso medido: los 3 items de DICOSA.
  SELECT count(*) INTO v_persistidas
  FROM public.supplier_price_history
  WHERE supplier_id = '693af3cd-ef07-457e-b001-a274417bc110';

  RAISE NOTICE '041: OK - % fila(s) de historial totales, 0 sin empresa', v_total;
  RAISE NOTICE '041: OK - % precio(s) historizados de DICOSA (se esperaban 3)', v_persistidas;
END $$;

COMMIT;

-- ============================================================================
-- VERIFICACION DESDE FUERA (no confiar en el "Success" del SQL Editor).
-- Solo lectura:
--
--   -- Debe dar 3: los 3 PurchaseItem de DICOSA.
--   SELECT count(*) FROM public.supplier_price_history
--    WHERE supplier_id = '693af3cd-ef07-457e-b001-a274417bc110';
--
--   SELECT supplier_id, product_id, price, currency, effective_date, notes
--     FROM public.supplier_price_history ORDER BY effective_date;
--
--   -- Debe dar 0. Cualquier valor > 0 es una fila que la ruta no puede ver.
--   SELECT count(*) FROM public.supplier_price_history WHERE company_id IS NULL;
--
--   -- Empresa 1 debe seguir con sus 2 compras y 3 proveedores: el backfill
--   -- escribe en supplier_price_history, no toca Purchase ni Supplier.
--   SELECT count(*) FROM public."Purchase" WHERE company_id = '73d5bbf7-8e47-470e-9430-da513e623ab7';
--   SELECT count(*) FROM public."Supplier" WHERE company_id = '73d5bbf7-8e47-470e-9430-da513e623ab7';
--
--   -- Las 4 politicas RLS, ahora por user_company_access y no por tenantid.
--   SELECT policyname, cmd FROM pg_policies
--    WHERE tablename = 'supplier_price_history';
--
--   -- Los indices que declara el modelo Prisma.
--   SELECT indexname FROM pg_indexes
--    WHERE tablename = 'supplier_price_history' ORDER BY indexname;
-- ============================================================================