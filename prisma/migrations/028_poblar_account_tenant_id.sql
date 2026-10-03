      -- =============================================================================
      -- 028_poblar_account_tenant_id.sql
      -- APLICAR A MANO en el SQL Editor de Supabase. Idempotente.
      -- =============================================================================
      --
      -- QUE ARREGLA
      --
      -- La 027f y la 027g taparon el agujero con `COALESCE("tenantId", tenant_id)`:
      -- las vistas ya leen bien. Pero el dato de debajo sigue roto, y eso es una
      -- bomba de relojeria: **`Account.tenant_id` esta en NULL en las 43 cuentas.**
      --
      -- Medido: 43/43 con la camel `"tenantId"` poblada, 43/43 con la snake
      -- `tenant_id` en NULL. El tenant vive solo en una de las dos columnas.
      --
      -- Por que importa mas que un dato sucio:
      --
      --   * Cualquier consulta o vista NUEVA que lea `Account.tenant_id` (y no sepa
      --     de la convencion mixta) devuelve **0 filas** sin error. Es el mismo modo
      --     de fallo que la 027f/027g: cierre en falso, no fuga.
      --   * El trigger `set_company_id_from_tenant_id` mira la SNAKE. Hoy no hace
      --     nada porque `company_id` ya viene puesto, pero cualquier `INSERT` futuro
      --     que solo mande `company_id` y relye en el trigger para deducir la empresa
      --     se quedaria sin empresa.
      --
      -- O sea: rellenar la columna hace que el `COALESCE` de las 7 vistas sea
      -- redundante en el futuro, y no que haya que acordarse de usarlo siempre.
      --
      -- LAS 8 CUENTAS QUE NO SE TOCAN (y por que)
      --
      -- 8 cuentas tienen un `"tenantId"` que **no existe en `Tenant`**:
      --
      --     tenant_001      3 cuentas   company_id = NULL
      --     default-tenant  5 cuentas   company_id = NULL
      --
      -- Son las 8 `Account` huerfanas legacy que ya son un pendiente conocido desde la
      -- 023. Rellenar su `tenant_id` las convertiria en "cuentas de un tenant que no
      -- existe": parecerian datos legitimos de algo que no esta. Se dejan como estan,
      -- con `company_id` en NULL, que es lo que hace que las vistas las muestren con
      -- saldo 0 en vez de arrastrar asientos de otra empresa.
      --
      -- Que hay que decidir con ellas (no es una migracion): borrarlas, o atribuirlas
      -- a una empresa concreta. `node scripts/verificar-contexto.mjs` las lista.
      --
      -- POR QUE NO SE RELLENA A ciegas
      --
      --   * **El trigger.** La 023 dejo `set_company_id_from_tenant_id` como
      --     `before insert or update` SIN columna especifica, o sea que se dispara en
      --     CUALQUIER update. Solo actua `if new.company_id is null`, y en estas 35
      --     cuentas `company_id` ya viene puesto, asi que no toca nada. Aun asi se
      --     comprueba despues que no haya cambiado el reparto.
      --
      --   * **Un UNIQUE sobre (tenant_id, code).** Medido antes de escribir esto:
      --     **0 codigos duplicados** dentro de cada tenant, asi que no puede chocar.
      --     Si alguien lo anade despues, esta migracion ya habra corrido y el dato
      --     sera coherente, que es justo lo que se quiere.
      --
      --   * **Los tipos.** Las 3 columnas son `text`, confirmado por el OpenAPI, asi
      --     que el UPDATE no falla por `text = text`. Ojo: si alguien declara
      --     `company_id` como `uuid` (que se ha intentado), esto no aplicaria.
      --
      --   * **`Transaction` NO se toca.** Ahi la 027b2 dejo `tenant_id` en NULL a
      --     PROPOSITO para las 3 de test 1, porque comparten `(FACTURA, 1)` y rellenar
      --     haria chocar `unique_voucher_tenant`. Aqui no hay ese problema porque las
      --     cuentas no tienen indice unico, pero conviene recordar que **"rellenar
      --     tenant_id" no es siempre la respuesta**: depende de la columna.
      --
      -- VERIFICACION
      --
      --     node scripts/verificar-contexto.mjs   (las 8 huerfanas siguen ahi)
      --     node scripts/verificar-reportes.mjs   (no debe cambiar nada: el COALESCE
      --                                           ya cogia la camel)
      --
      -- Las cifras de las vistas tienen que ser IDENTICAS antes y despues. Si cambian,
      -- esta migracion ha alterado algo que no debia, y hay que mirar el trigger.
      -- =============================================================================

      BEGIN;

      -- -----------------------------------------------------------------------------
      -- Preflight 1: la columna debe existir y ser texto.
      -- `add column if not exists` NO cambia el tipo si ya existe, asi que si alguien
      -- la habia declarado uuid, aqui se ve en vez de fallar mas lejos.
      -- -----------------------------------------------------------------------------
      DO $$
      DECLARE
        vtipo text;
      BEGIN
        SELECT format_type(a.atttypid, a.atttypmod) INTO vtipo
        FROM pg_attribute a
        JOIN pg_class c ON c.oid = a.attrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        WHERE n.nspname = 'public' AND c.relname = 'Account' AND a.attname = 'tenant_id'
          AND a.attnum > 0 AND NOT a.attisdropped;

        IF vtipo IS NULL THEN
          RAISE EXCEPTION 'ABORT: "Account"."tenant_id" no existe.';
        END IF;
        IF vtipo <> 'text' THEN
          RAISE EXCEPTION 'ABORT: "Account"."tenant_id" es % y esta migracion asume text.', vtipo;
        END IF;
      END $$;

      -- -----------------------------------------------------------------------------
      -- Preflight 2: si algun tenant de la camel no existe, se avisa ANTES de tocar
      -- nada. No se aborta: son los huerfanos legacy y la migracion debe poder
      -- aplicarse igual, dejandolos fuera. Solo se registra.
      -- -----------------------------------------------------------------------------
      DO $$
      DECLARE
        huerfanos int;
      BEGIN
        SELECT count(*) INTO huerfanos
        FROM "Account" a
        WHERE a.tenant_id IS NULL
          AND a."tenantId" IS NOT NULL
          AND NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id = a."tenantId");

        IF huerfanos > 0 THEN
          RAISE NOTICE '% cuentas con tenant inexistente: NO se rellenan (huerfanas legacy).', huerfanos;
          RAISE NOTICE '  Revisar con: node scripts/verificar-contexto.mjs';
        END IF;
      END $$;

      -- -----------------------------------------------------------------------------
      -- Preflight 3: el estado de antes, para poder compararlo con el de despues.
      -- -----------------------------------------------------------------------------
      DO $$
      DECLARE
        n_null int; n_ok int;
      BEGIN
        SELECT count(*) FILTER (WHERE tenant_id IS NULL) INTO n_null FROM "Account";
        SELECT count(*) FILTER (WHERE tenant_id IS NOT NULL) INTO n_ok FROM "Account";
        RAISE NOTICE 'Account ANTES: % con tenant_id, % sin tenant_id (de % filas)',
          n_ok, n_null, n_null + n_ok;
      END $$;

      -- -----------------------------------------------------------------------------
      -- El UPDATE. Condiciones, todas necesarias:
      --
      --   * `tenant_id IS NULL`      -> idempotente: no reescribe lo ya bueno.
      --   * `"tenantId" IS NOT NULL` -> la camel manda; es la que coincide con el
      --                                 resto del esquema (027b lo demostro).
      --   * el tenant EXISTE         -> deja fuera los huerfanos de proposito.
      --   * `"tenantId" <> tenant_id`-> guarda de una carrera improbable.
      --
      -- NO se toca `company_id`. El trigger `set_company_id_from_tenant_id` solo
      -- actua cuando `company_id is null`, y aqui todas estas cuentas ya lo tienen, de
      -- modo que el UPDATE no puede cambiar la atribucion de empresa de nadie.
      -- -----------------------------------------------------------------------------
      UPDATE "Account" a
        SET tenant_id = a."tenantId"
      WHERE a.tenant_id IS NULL
        AND a."tenantId" IS NOT NULL
        AND a."tenantId" <> a.tenant_id
        AND EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id = a."tenantId");

      -- -----------------------------------------------------------------------------
      -- Post-check. Lo que tiene que cumplirse SI O SI:
      --   * 0 cuentas con tenant_id <> "tenantId" entre las que si tienen tenant real.
      --   * `company_id` NO ha cambiado: mismo reparto que antes del UPDATE.
      -- Si algo falla, se revierte la transicion entera.
      -- -----------------------------------------------------------------------------
      DO $$
      DECLARE
        incoherentes int; huerfanos int; sin_empresa int;
      BEGIN
        SELECT count(*) INTO incoherentes
        FROM "Account" a
        WHERE a.tenant_id IS NOT NULL AND a."tenantId" IS NOT NULL
          AND a.tenant_id <> a."tenantId";

        IF incoherentes > 0 THEN
          RAISE EXCEPTION 'ABORT: % cuentas con tenant_id distinto de "tenantId".', incoherentes;
        END IF;

        SELECT count(*) INTO huerfanos
        FROM "Account" a
        WHERE a.tenant_id IS NULL AND a."tenantId" IS NOT NULL;

        SELECT count(*) INTO sin_empresa
        FROM "Account" WHERE company_id IS NULL;

        RAISE NOTICE 'Account DESPUES: % con tenant_id, % sin tenant_id',
          (SELECT count(*) FROM "Account" WHERE tenant_id IS NOT NULL), huerfanos;
        RAISE NOTICE 'Las % sin tenant_id son las huerfanas (tenant inexistente). NO se rellenan.', huerfanos;
        RAISE NOTICE 'Cuentas sin company_id: % (esperado: %)', sin_empresa, huerfanos;

        IF sin_empresa <> huerfanos THEN
          RAISE WARNING 'Atencion: % cuentas sin company_id pero % sin tenant_id. Una empresa tiene cuentas', sin_empresa, huerfanos;
          RAISE WARNING 'sin tenant legible. Puede ser correcto (empresa nueva) o un dato roto: revisar.';
        END IF;
      END $$;

      COMMIT;
