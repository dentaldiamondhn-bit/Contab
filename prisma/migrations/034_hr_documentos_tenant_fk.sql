-- =============================================================================
-- 034_hr_documentos_tenant_fk.sql
-- REPUNTAR EL FK LEGACY DE `employee_hr_documents.tenant_id`
-- =============================================================================
-- POR QUE ESTA MIGRACION
--
-- `employee_hr_documents.tenant_id` es NOT NULL y su FK apunta a **`tenants`**
-- (minusculas), la tabla legacy con UNA sola fila (`ANGELOH7`). La app escribe
-- `tenant_id = empresa.tenantId`, que sale de `Tenant` (7 filas). Consecuencia
-- medida el 1 Oct 2026 (confirmado en el OpenAPI de PostgREST):
--
--   employee_hr_documents.tenant_id -> FK a `tenants.id`
--
-- Para cualquier empresa fuera de Angelos, el insert revienta con
--   23503 Key (tenant_id)=(TEST1DS) is not present in table "tenants"
-- y el alta de documentos se pierde en SILENCIO: la ruta captura el error y solo
-- lo loguea, asi que el empleado se crea y los documentos desaparecen.
--
-- Es EXACTAMENTE el mismo bug que ya se arreglo en `employees_tenant_id_fkey`
-- (que hoy apunta a `Tenant`, verificado: acepta 'TEST1DS' con HTTP 200). A
-- `employee_hr_documents` se le paso el repunte.
--
-- QUE HACE: dropea el FK que apunta a `tenants` y crea uno hacia `"Tenant"(id)`.
--
-- TIPOS (medidos en el OpenAPI, no supuestos):
--   employee_hr_documents.tenant_id = text
--   "Tenant".id                     = text            <- compatible
--   tenants.id                      = varchar(255)
-- El preflight aborta si los tipos dejan de ser compatibles.
--
-- LO QUE ESTA MIGRACION **NO** TOCA (a proposito):
--   `positions`, `departments`, `work_schedules`, `employee_history` y
--   `attendance` tienen `tenant_id` NOT NULL **sin FK**. NO hay que anadirle FK:
--   sin FK no hay bloqueo, que es justo el problema de aqui. Se dejan como estan.
--
-- APLICAR EN SUPABASE SQL EDITOR. Es DDL: backup antes. Idempotente.
-- Sigue las reglas de AGENTS.md: comprueba los tipos, valida que el DROP haya
-- dropeado algo y aborta con detalle si algo no cuadra.
-- =============================================================================

BEGIN;

DO $$
DECLARE
  v_att_smallint smallint;
  v_tipo_col     text;
  v_tipo_tenant  text;
  v_huerfanos    int;
  v_fila         record;
  v_dropeados    int := 0;
  v_ok_tenant    int := 0;
BEGIN
  -- ---------------------------------------------------------------------------
  -- 0a. Existen las piezas
  -- ---------------------------------------------------------------------------
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relname = 'employee_hr_documents' AND n.nspname = 'public') = 0 THEN
    RAISE EXCEPTION 'No existe public.employee_hr_documents. Revisar el esquema antes de continuar.';
  END IF;
  IF (SELECT count(*) FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE c.relname = 'Tenant' AND n.nspname = 'public') = 0 THEN
    RAISE EXCEPTION 'No existe public."Tenant". Revisar el esquema antes de continuar.';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 0b. Tipos compatibles (FK exige operador de igualdad)
  -- ---------------------------------------------------------------------------
  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo_col
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'employee_hr_documents'
     AND a.attname = 'tenant_id' AND a.attnum > 0;

  SELECT format_type(a.atttypid, a.atttypmod) INTO v_tipo_tenant
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'Tenant'
     AND a.attname = 'id' AND a.attnum > 0;

  IF v_tipo_col IS NULL OR v_tipo_tenant IS NULL THEN
    RAISE EXCEPTION 'No se pudo leer el tipo de employee_hr_documents.tenant_id (%) o "Tenant".id (%)',
      v_tipo_col, v_tipo_tenant;
  END IF;

  -- Ambos deben ser de la familia de texto. `text` y `character varying` son
  -- compatibles entre si; cualquier otra cosa no lo es.
  IF v_tipo_col NOT IN ('text', 'character varying') OR v_tipo_tenant NOT IN ('text', 'character varying') THEN
    RAISE EXCEPTION 'Tipos incompatibles para el FK: employee_hr_documents.tenant_id=%, "Tenant".id=%',
      v_tipo_col, v_tipo_tenant;
  END IF;

  -- ---------------------------------------------------------------------------
  -- 0c. Datos: todo tenant_id existente debe existir en "Tenant", o el FK nuevo
  --     no se puede VALIDAR. Se aborta con el detalle (no se completa a ciegas).
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_huerfanos
    FROM employee_hr_documents d
   WHERE d.tenant_id IS NOT NULL
     AND NOT EXISTS (SELECT 1 FROM "Tenant" t WHERE t.id = d.tenant_id);

  RAISE NOTICE 'preflight: employee_hr_documents.tenant_id=% | "Tenant".id=% | filas con tenant_id fuera de "Tenant"=%',
    v_tipo_col, v_tipo_tenant, v_huerfanos;

  IF v_huerfanos > 0 THEN
    RAISE EXCEPTION
      'Hay % fila(s) de employee_hr_documents cuyo tenant_id no existe en "Tenant". Repuntar el FK fallaria. Revisar esos valores antes de aplicar la 034.',
      v_huerfanos;
  END IF;

  -- attnum de tenant_id, para comprobar que el FK cubre esa columna exacta.
  SELECT a.attnum INTO v_att_smallint
    FROM pg_attribute a
    JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
   WHERE n.nspname = 'public' AND c.relname = 'employee_hr_documents'
     AND a.attname = 'tenant_id' AND a.attnum > 0;

  -- ---------------------------------------------------------------------------
  -- 1. Dropear el/los FK que apunten a la tabla legacy `tenants`
  -- ---------------------------------------------------------------------------
  FOR v_fila IN
    SELECT c.conname
      FROM pg_constraint c
      JOIN pg_class t  ON t.oid = c.conrelid
      JOIN pg_class rf ON rf.oid = c.confrelid
      JOIN pg_namespace n ON n.oid = t.relnamespace
     WHERE n.nspname = 'public'
       AND t.relname  = 'employee_hr_documents'
       AND rf.relname = 'tenants'
       AND c.contype  = 'f'
  LOOP
    EXECUTE format('ALTER TABLE public.employee_hr_documents DROP CONSTRAINT %I', v_fila.conname);
    v_dropeados := v_dropeados + 1;
    RAISE NOTICE 'FK legacy eliminado: %', v_fila.conname;
  END LOOP;

  -- ---------------------------------------------------------------------------
  -- 2. Ya existe un FK hacia "Tenant" que cubre tenant_id? (idempotencia)
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_ok_tenant
    FROM pg_constraint c
    JOIN pg_class t  ON t.oid = c.conrelid
    JOIN pg_class rf ON rf.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname  = 'employee_hr_documents'
     AND rf.relname = 'Tenant'
     AND c.contype  = 'f'
     AND c.conkey   = ARRAY[v_att_smallint];

  IF v_ok_tenant > 0 THEN
    -- Reeaplicacion: el FK correcto ya esta. Nada que crear.
    RAISE NOTICE 'employee_hr_documents.tenant_id ya apunta a "Tenant": nada que hacer.';
  ELSE
    -- Si no habia legacy NI un FK correcto, el estado no es el esperado: mejor
    -- abortar que crear un FK sobre una suposicion.
    IF v_dropeados = 0 THEN
      RAISE EXCEPTION
        'No habia FK de employee_hr_documents.tenant_id hacia `tenants` ni hacia "Tenant". Estado inesperado; revisar el esquema antes de continuar.';
    END IF;

    ALTER TABLE public.employee_hr_documents
      DROP CONSTRAINT IF EXISTS employee_hr_documents_tenant_id_fkey;
    ALTER TABLE public.employee_hr_documents
      ADD CONSTRAINT employee_hr_documents_tenant_id_fkey
      FOREIGN KEY (tenant_id) REFERENCES "Tenant"(id) NOT VALID;
    ALTER TABLE public.employee_hr_documents
      VALIDATE CONSTRAINT employee_hr_documents_tenant_id_fkey;
    RAISE NOTICE 'FK nuevo creado y validado: employee_hr_documents_tenant_id_fkey -> "Tenant"(id).';
  END IF;

  -- ---------------------------------------------------------------------------
  -- 3. Post-check: no queda FK hacia `tenants` y SI existe el correcto
  -- ---------------------------------------------------------------------------
  SELECT count(*) INTO v_huerfanos
    FROM pg_constraint c
    JOIN pg_class t  ON t.oid = c.conrelid
    JOIN pg_class rf ON rf.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname  = 'employee_hr_documents'
     AND rf.relname = 'tenants'
     AND c.contype  = 'f';

  IF v_huerfanos > 0 THEN
    RAISE EXCEPTION 'Quedan % FK de employee_hr_documents hacia la tabla legacy `tenants`.', v_huerfanos;
  END IF;

  SELECT count(*) INTO v_ok_tenant
    FROM pg_constraint c
    JOIN pg_class t  ON t.oid = c.conrelid
    JOIN pg_class rf ON rf.oid = c.confrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
   WHERE n.nspname = 'public'
     AND t.relname  = 'employee_hr_documents'
     AND rf.relname = 'Tenant'
     AND c.contype  = 'f'
     AND c.conkey   = ARRAY[v_att_smallint];

  IF v_ok_tenant = 0 THEN
    RAISE EXCEPTION 'No quedo un FK de employee_hr_documents.tenant_id hacia "Tenant".';
  END IF;

  RAISE NOTICE '034 OK: employee_hr_documents.tenant_id -> "Tenant"(id). Empresas fuera de Angelos ya pueden guardar documentos.';
END $$;

COMMIT;
