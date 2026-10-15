-- 044: `Supplier` deja de tratar al tenant como si las empresas fueran familia
--
-- QUE ARREGLA. Dos cosas, y las dos medidas el 5 Oct 2026 antes de escribir esto:
--
-- 1. `UNIQUE (rtn, tenant_id)` (`unique_supplier_rtn_per_tenant`).
--
--    test 1 (`8143dd4e-...`) y test 2 (`971bec43-...`) comparten el tenant
--    `TEST1DS` pero son empresas SIN relacion. Ese indice las trata como
--    hermanas y por eso forbids algo legitimo. Probado de verdad:
--
--      test 1 registra RTN 0801-9999-888-777  -> 201 insertado
--      test 2 registra EL MISMO proveedor      -> 409 23505
--         duplicate key value violates unique constraint
--         "unique_supplier_rtn_per_tenant"
--
--    O sea: un proveedor que atiende a las dos empresas no se puede registrar en
--    la segunda. Y es incoherente con el resto del sistema por partida doble:
--
--      - `email` NO tiene indice ni unico, asi que el MISMO correo si se puede
--        repetir entre empresas (probado: 201 y 201).
--      - el dedup del import ya es POR EMPRESA: `import/route.ts:231` carga los
--        RTN existentes con `.eq('company_id', empresa.companyId)`. El codigo dice
--        que si y la base dice que no.
--
--    Se borra el indice y NO se reemplaza por nada. No se pone un
--    `UNIQUE(rtn, company_id)` a proposito: el usuario dijo que no se ponga
--    ninguna restriccion, y ademas el dedup por empresa ya esta en el codigo,
--    que es donde puede decir "esto es un duplicado" en lugar de reventar con un
--    23505 que no dice que empresa esta duplicando.
--
-- 2. La FK `company_id -> companies(id)` pasa de `ON DELETE CASCADE` a `NO ACTION`.
--
--    El CASCADE lo puso la 043 y fue mala eleccion: borrar una fila de `companies`
--    se llevaba en cascada sus proveedores, y con ellos sus precios y sus
--    calificaciones, sin avisar. Con `NO ACTION` el borrado de la empresa se
--    bloquea mientras tenga proveedores, y la decision se toma a mano. Es lo que
--    ya usan las tablas hijas (`supplier_price_history` y `supplier_ratings` usan
--    NO ACTION para su autor).
--
--    Ojo con lo que NO es un problema aqui: `NO ACTION` protege a la EMPRESA, no
--    al proveedor. No impide borrar un proveedor; impide borrar una empresa que
--    aun tiene proveedores. Son cosas distintas.
--
-- LO QUE ESTA MIGRACION NO TOCA: ninguna fila. Las dos cosas son schema puro.
--
-- IDEMPOTENTE, y con la comprobacion de que dropea algo. Un `DROP` que no
-- encuentra su objetivo no falla: seguiria dando "Success" mientras la
-- restriccion siguiera viva, y el `INSERT` de prueba seguiria dando 23505 con el
-- mismo error y sin ninguna pista. Por eso al final se comprueba que el indice
-- YA NO ESTA, leyendo `pg_index` (no `pg_constraint`, que es donde uno mira
-- primero y no lo encuentra: un `@unique` de Prisma es un INDICE).

-- ============================================================================
-- PREFLIGHT
-- ============================================================================
DO $$
DECLARE
  v_indice_nombre text;
  v_indice_def    text;
-- `confdeltype` es de tipo `"char"`, NO boolean: 'a'=NO ACTION, 'c'=CASCADE,
  -- 'r'=RESTRICT, 'n'=SET NULL, 'd'=SET DEFAULT. Declararla boolean hace que
  -- Postgres intente el casteo implicito de 'c' a boolean y revienta con
  -- `22P02 invalid input syntax for type boolean: "c"`. Se habia dejado como
  -- boolean y aqui estaba mal: el post-check (mas abajo) si la tenia como
  -- `"char"`, o sea que el mismo hecho estaba escrito bien en un sitio y mal
  -- en el otro.
  v_cascada       "char";
  v_fk_nombre     text;
  v_columna_tipo  text;
  v_proveedores   bigint;
BEGIN
  -- La columna tiene que existir y ser `text`, igual que en la 043.
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_columna_tipo
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'Supplier'
     AND a.attname = 'company_id' AND a.attnum > 0 AND NOT a.attisdropped;

  IF v_columna_tipo IS NULL THEN
    RAISE EXCEPTION '043 ABORTA: "Supplier"."company_id" no existe. Esta migracion
      da por hecha la 043: aplicala antes.';
  END IF;
  IF v_columna_tipo <> 'text' THEN
    RAISE EXCEPTION '044 ABORTA: "Supplier"."company_id" es % y se esperaba text.',
      v_columna_tipo;
  END IF;

  SELECT count(*) INTO v_proveedores FROM public."Supplier";
  RAISE NOTICE '044: % proveedores. Ninguna fila se va a tocar.', v_proveedores;

  -- ---------------------------------------------------------------------------
  -- Localizar el indice unico de RTN, por COLUMNAS y no por nombre.
  --
  -- El nombre en el repo es `unique_supplier_rtn_tenant` (schema.prisma:324) y
  -- en la base es `unique_supplier_rtn_per_tenant`: no coinciden. Buscar por el
  -- nombre de Prisma no habria encontrado nada y el `DROP IF EXISTS` habria sido
  -- un no-op silencioso con la restriccion viva. Se busca por la definicion:
  -- unico, sobre (rtn, tenant_id), en la tabla `Supplier`.
  -- ---------------------------------------------------------------------------
  SELECT ic.relname, pg_get_indexdef(i.indexrelid)
    INTO v_indice_nombre, v_indice_def
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'Supplier'
     AND i.indisunique
     AND i.indnkeyatts = 2
     AND pg_get_indexdef(i.indexrelid, 1, true) = 'rtn'
     AND pg_get_indexdef(i.indexrelid, 2, true) = 'tenant_id'
   LIMIT 1;

  IF v_indice_nombre IS NULL THEN
    RAISE NOTICE '044: no hay ningun UNIQUE (rtn, tenant_id) en "Supplier". Ya
      esta como se quiere; no se hace nada.';
  ELSE
    RAISE NOTICE '044: encontrado % sobre (rtn, tenant_id).', v_indice_def;
  END IF;

  -- ---------------------------------------------------------------------------
  -- ¿De que tipo es la FK actual? Hay que saber si el indice de arriba es un
  -- indice suelto o el que sostiene un CONSTRAINT, porque:
  --   - indice suelto      -> `DROP INDEX`
  --   - indice de un const -> `DROP INDEX` da ERROR, hay que bajar el CONSTRAINT
  -- Y el nombre del constraint tambien puede no ser el que se espera.
  -- ---------------------------------------------------------------------------
  SELECT con.conname INTO v_fk_nombre
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.confrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE con.conrelid = 'public."Supplier"'::regclass
     AND con.contype = 'f'
     AND nsp.nspname = 'public' AND rel.relname = 'companies'
   LIMIT 1;

  IF v_fk_nombre IS NULL THEN
    RAISE EXCEPTION '044 ABORTA: no hay FK de "Supplier"."company_id" a
      companies(id). La 043 deberia haberla creado. Revisar antes de seguir.';
  END IF;

  SELECT con.confdeltype INTO v_cascada
    FROM pg_constraint con WHERE con.conname = v_fk_nombre;

  -- `c` = CASCADE, `a` = NO ACTION, `r` = RESTRICT, `n` = SET NULL
  RAISE NOTICE '044: la FK % existe con ON DELETE % (se espera cambiarlo a NO ACTION).',
    v_fk_nombre, CASE v_cascada WHEN 'c' THEN 'CASCADE' WHEN 'a' THEN 'NO ACTION'
      WHEN 'r' THEN 'RESTRICT' WHEN 'n' THEN 'SET NULL' ELSE 'lo que sea' END;
END $$;

-- ============================================================================
-- CAMBIOS
-- ============================================================================
BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Fuera el UNIQUE (rtn, tenant_id).
--
-- Se borra el CONSTRAINT si el indice lo sostiene, y el indice si es suelto. Se
-- hace por los dos caminos porque no se puede saber de antemano cual es, y
-- hacer `DROP INDEX` a ciegas sobre un indice de constraint aborta la
-- transaccion entera.
--
-- El `IF EXISTS` de cada uno es para que la migracion sea reejecutable, NO para
-- tolerar que no haya nada: que dropee algo se comprueba en el post-check.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_con_nombre text;
  v_ind_nombre  text;
  v_dropeo      text := 'nada';
BEGIN
  SELECT con.conname INTO v_con_nombre
    FROM pg_constraint con
    JOIN pg_index i ON i.indrelid = 'public."Supplier"'::regclass
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'Supplier'
     AND i.indisunique AND i.indnkeyatts = 2
     AND pg_get_indexdef(i.indexrelid, 1, true) = 'rtn'
     AND pg_get_indexdef(i.indexrelid, 2, true) = 'tenant_id'
     AND con.conindid = i.indexrelid
   LIMIT 1;

  IF v_con_nombre IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public."Supplier" DROP CONSTRAINT %I', v_con_nombre);
    v_dropeo := 'CONSTRAINT ' || v_con_nombre;
  ELSE
    SELECT ic.relname INTO v_ind_nombre
      FROM pg_index i
      JOIN pg_class ic ON ic.oid = i.indexrelid
      JOIN pg_class tc ON tc.oid = i.indrelid
      JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
     WHERE nsp.nspname = 'public' AND tc.relname = 'Supplier'
       AND i.indisunique AND i.indnkeyatts = 2
       AND pg_get_indexdef(i.indexrelid, 1, true) = 'rtn'
       AND pg_get_indexdef(i.indexrelid, 2, true) = 'tenant_id'
     LIMIT 1;

    IF v_ind_nombre IS NOT NULL THEN
      EXECUTE format('DROP INDEX public.%I', v_ind_nombre);
      v_dropeo := 'INDEX ' || v_ind_nombre;
    END IF;
  END IF;

  RAISE NOTICE '044: dropeado %.', v_dropeo;
END $$;

-- ---------------------------------------------------------------------------
-- 2. La FK pasa de CASCADE a NO ACTION.
--
-- Se borra y se recrea porque `ALTER TABLE ... ALTER COLUMN` no cambia el
-- `ON DELETE`: hay que recrear el constraint. Se comprueba antes que el destino
-- sea `companies` (el preflight ya lo hizo) y se filtra el nombre: si la 043 no
-- llego a crearla, esto no habria que llegar aqui.
--
-- El nombre se conserva (`supplier_company_id_fkey`) para que el post-check y
-- los scripts que lo busquen sigan encontrandolo.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  v_ya_no_action boolean;
BEGIN
  SELECT (con.confdeltype = 'a') INTO v_ya_no_action
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.confrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE con.conrelid = 'public."Supplier"'::regclass
     AND con.contype = 'f'
     AND nsp.nspname = 'public' AND rel.relname = 'companies'
   LIMIT 1;

  IF v_ya_no_action THEN
    RAISE NOTICE '044: la FK ya era NO ACTION. No se toca.';
  ELSE
    -- El nombre lo elige Postgres si no se le da uno. Se deja el de la 043 para
    -- no romper lo que lo busque por nombre.
    ALTER TABLE public."Supplier"
      DROP CONSTRAINT IF EXISTS supplier_company_id_fkey;

    ALTER TABLE public."Supplier"
      ADD CONSTRAINT supplier_company_id_fkey
      FOREIGN KEY (company_id) REFERENCES public.companies(id);
    RAISE NOTICE '044: FK recreada sin ON DELETE (NO ACTION). Borrar una empresa
      con proveedores dara error en vez de arrastrarlos.';
  END IF;
END $$;

COMMIT;

-- ============================================================================
-- POST-CHECK
-- ============================================================================
-- Dos comprobaciones, y las dos leen el catalogo de Postgres en vez de creerse
-- a si mismas:
--   1. NO queda ningun UNIQUE sobre (rtn, tenant_id).
--   2. La FK a companies NO es CASCADE.
--
-- La 1 es la que importa: un `DROP` que no encuentra su objetivo no da error,
-- asi que sin esto la migracion podria "pasar" con la restriccion viva.
DO $$
DECLARE
  v_queda_unico  text;
  v_confdeltype  "char";
  v_tiene_fk     boolean;
  v_no_cascada   boolean;
  v_proveedores  bigint;
  v_nulos        bigint;
BEGIN
  -- Solo el nombre: era `SELECT ic.relname, pg_get_indexdef(i.indexrelid)
  -- INTO v_queda_unico`, o sea 2 columnas y 1 variable, que es error de runtime
  -- (no hay 2 destinos). El `pg_get_indexdef` no aportaba nada aqui: el aviso
  -- imprime el nombre.
  SELECT ic.relname INTO v_queda_unico
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    JOIN pg_class tc ON tc.oid = i.indrelid
    JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
   WHERE nsp.nspname = 'public' AND tc.relname = 'Supplier'
     AND i.indisunique AND i.indnkeyatts = 2
     AND pg_get_indexdef(i.indexrelid, 1, true) = 'rtn'
     AND pg_get_indexdef(i.indexrelid, 2, true) = 'tenant_id'
   LIMIT 1;

  IF v_queda_unico IS NOT NULL THEN
    RAISE WARNING '044: SIGUE HABIENDO un UNIQUE (rtn, tenant_id): %. El DROP no
      funciono y el mismo RTN en dos empresas del mismo tenant seguira dando
      23505.', v_queda_unico;
  ELSE
    RAISE NOTICE '044: ya no hay UNIQUE (rtn, tenant_id). Verificado en pg_index.';
  END IF;

  SELECT con.confdeltype INTO v_confdeltype
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.confrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
   WHERE con.conrelid = 'public."Supplier"'::regclass
     AND con.contype = 'f'
     AND nsp.nspname = 'public' AND rel.relname = 'companies'
   LIMIT 1;

  v_tiene_fk   := v_confdeltype IS NOT NULL;
  v_no_cascada := v_confdeltype IS DISTINCT FROM 'c';

  IF NOT v_tiene_fk THEN
    RAISE WARNING '044: no hay FK a companies. Revisar.';
  ELSIF NOT v_no_cascada THEN
    RAISE WARNING '044: la FK sigue en ON DELETE CASCADE. Revisar.';
  ELSE
    RAISE NOTICE '044: la FK a companies ya NO es CASCADE.';
  END IF;

  SELECT count(*) INTO v_proveedores FROM public."Supplier";
  SELECT count(*) INTO v_nulos FROM public."Supplier" WHERE company_id IS NULL;

  RAISE NOTICE '044 listo: % proveedores, % sin empresa. Verificacion externa
    sugerida: registrar el mismo RTN en test 1 y en test 2 tiene que dar 201 en
    los dos (antes daba 409 en el segundo).', v_proveedores, v_nulos;
END $$;
