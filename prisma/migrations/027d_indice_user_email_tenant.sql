-- 30 Sept 2026 — ANULADA. NO CREA NADA. Este archivo es solo una COMPROBACION.
--
-- ============================================================================
-- POR QUE ESTA ANULADA
--
-- Se aplico una vez y el indice que creaba resulto redundante. Prisma ya
-- garantia la invariante desde antes:
--
--   CREATE UNIQUE INDEX "User_tenantId_email_unique"
--     ON public."User" USING btree (tenantid, email)
--
-- `idx_user_email_tenant` era el mismo unique con las columnas al reves: un
-- segundo indice unico sobre lo ya cubierto. Se borro y se documento el motivo.
-- Pero documentar "no la corras" NO impidio que se corriera otra vez y volviera
-- a crear el indice, asi que el cuerpo se sustituyo por una comprobacion que no
-- toca el esquema. Ejecutarla es seguro y no cambia nada.
--
-- ERROR PROPIO, IMPORTA PARA QUE NO SE REPITA: la 027d se escribio porque se
-- comprobo que no existiera un indice llamado `idx_user_email` —el que crea
-- `FULL_SETUP.sql`— y se concluyo "no hay unicidad de email". Eso no demuestra
-- nada: lo que hay que verificar es si la INVARIANTE ya esta cubierta, no si un
-- NOMBRE concreto esta. `CREATE UNIQUE` sobre columnas que ya son unicas NO
-- falla: no da error, no avisa, sale "Success" y solo cobra el doble en cada
-- escritura. Un "Success" aqui no es evidencia de que hiciera falta.
-- El fallo se vio al pedir `pg_get_indexdef` de los indices de "User".
--
-- Lo que sigue en comentarios es la documentacion de por que `UNIQUE(email)` en
-- `FULL_SETUP.sql` es incorrecto. Esa parte sigue siendo cierta y util.
-- ============================================================================
--
-- El email NO puede ser unico solo: es unico POR TENANT.
--
-- `supabase/FULL_SETUP.sql` lo creaba como `UNIQUE (email)` y al correrlo
-- reventaba con:
--   23505 could not create unique index "idx_user_email"
--   Key (email)=(gcalix12@hotmail.com) is duplicated.
--
-- Eso NO es un dato corrupto: es la restriccion equivocada. En un esquema
-- multi-tenant un mismo correo puede ser usuario legitimo de varios tenants,
-- asi que `UNIQUE(email)` falla por diseno y no porque haya ningun bug detras.
-- Los tres scripts del repo ademas definian el mismo indice de tres maneras
-- distintas (FULL_SETUP con UNIQUE, MASTER_SETUP y SUPABASE_COMPLETE sin
-- UNIQUE), y el que se ejecutaba era el que mas restringia. En FULL_SETUP y
-- MASTER_SETUP quedo como `UNIQUE (email, tenantid)`.
--
-- Los duplicados que existen son DOS correos, no uno, asi que arreglar solo el
-- que tiraba el error habria dejado el otro igual:
--
--   gcalix12@hotmail.com  x2   tenantid: cVcLafoZitJmBOdSxNOlPgb0m / ANGELOH7
--   azuna22@outlook.com  x2   tenantid: TEST185 / TEST1DS
--
-- Y no violan el unique de Prisma justamente porque sus tenantid son distintos
-- entre si. Ojo: cada fila tiene un `authid` de Clerk DISTINTO. Son dos cuentas
-- de Clerk por persona, no registros duplicados, y cada fila es ademas `owner` de
-- una empresa distinta en `user_company_access`. La duplicacion NO es un problema
-- de indices: es un problema de Clerk, y arreglarlo cambia permisos.

-- ============================================================================
-- COMPROBACION. No crea, no borra, no altera nada. Idempotente por definicion.
-- ============================================================================
DO $$
DECLARE
  v_unico boolean;
  v_def text;
  v_sobra boolean;
BEGIN
  SELECT x.indisunique, pg_get_indexdef(x.indexrelid)
  INTO v_unico, v_def
  FROM pg_class t
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN pg_index x ON x.indrelid = t.oid
  JOIN pg_class ic ON ic.oid = x.indexrelid
  WHERE n.nspname = 'public'
    AND t.relname = 'User'
    AND ic.relname = 'User_tenantId_email_unique';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'No existe User_tenantId_email_unique en public."User". Si se llego a borrar, la invariante "un usuario por (email, tenantid)" ya no la cubre nadie y hay que decidir de nuevo: mira primero TODOS los indices de "User" con pg_get_indexdef, no adivines.';
  END IF;

  IF NOT v_unico THEN
    RAISE EXCEPTION 'User_tenantId_email_unique existe pero NO es unico: %', v_def;
  END IF;

  SELECT EXISTS (SELECT 1 FROM pg_class WHERE relname = 'idx_user_email_tenant')
  INTO v_sobra;

  IF v_sobra THEN
    RAISE WARNING 'idx_user_email_tenant esta presente y es REDUNDANTE con User_tenantId_email_unique. No molesta al dato, pero es un segundo indice unico sobre las mismas columnas. Borralo con: DROP INDEX IF EXISTS idx_user_email_tenant;';
  END IF;

  RAISE NOTICE 'OK, nada que hacer. La invariante ya la cubre: %', v_def;
END
$$;
