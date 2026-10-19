-- 069: dueno de "test 2" (para el gate de aprobacion de compras)
--
-- APLICADA y verificada el 8 Oct 2026 (via PostgREST, service_role).
--
-- MOTIVO: la empresa test 2 (971bec43-5c57-44a3-92b0-db7f909c5276, tenant
-- TEST1DS) tenia un solo miembro, `azuna22@outlook.com`
-- (User.id 17e8550f-9e3b-4532-815c-07b3eb80e8e7), con
-- `user_company_access.relationship = 'accountant'` y 0 filas en
-- `PurchaseApprover`. Con la regla 073 de aprobacion de compras (aprueba/designa
-- el DUENO de la empresa o un designado), esa empresa quedaba sin nadie que
-- pudiera aprobar ni designar: un punto muerto. El usuario decidio darle
-- `owner` a su unico miembro.
--
-- Solo cambia `relationship` de una fila que ya existe; NO crea membresia ni
-- toca datos de empresa. La misma persona sigue siendo `accountant` en test 1
-- (el rol es POR EMPRESA, ver AGENTS.md 1b).

BEGIN;

-- Preflight: la empresa y la membresia deben existir.
DO $$
DECLARE
  v_company text := '971bec43-5c57-44a3-92b0-db7f909c5276';
  v_user    text := '17e8550f-9e3b-4532-815c-07b3eb80e8e7';
  n int;
BEGIN
  IF to_regclass('public.user_company_access') IS NULL OR to_regclass('public.companies') IS NULL THEN
    RAISE EXCEPTION '069: falta la tabla user_company_access o companies';
  END IF;
  SELECT count(*) INTO n FROM public.companies WHERE id = v_company;
  IF n = 0 THEN
    RAISE EXCEPTION '069: la empresa % (test 2) no existe en companies', v_company;
  END IF;
  SELECT count(*) INTO n
  FROM public.user_company_access
  WHERE company_id = v_company AND user_id = v_user;
  IF n = 0 THEN
    RAISE EXCEPTION '069: no existe la membresia de % en test 2', v_user;
  END IF;
END $$;

-- Cambio de rol (idempotente).
DO $$
DECLARE
  v_company text := '971bec43-5c57-44a3-92b0-db7f909c5276';
  v_user    text := '17e8550f-9e3b-4532-815c-07b3eb80e8e7';
  n int;
BEGIN
  UPDATE public.user_company_access
     SET relationship = 'owner'
   WHERE company_id = v_company AND user_id = v_user
     AND relationship IS DISTINCT FROM 'owner';
  GET DIAGNOSTICS n = ROW_COUNT;
  IF n = 0 THEN
    RAISE NOTICE '069: la membresia ya era owner, no se toco';
  ELSE
    RAISE NOTICE '069: % membresia(s) de test 2 pasaron a owner', n;
  END IF;
END $$;

-- Post-check: test 2 debe tener al menos un owner.
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM public.user_company_access
  WHERE company_id = '971bec43-5c57-44a3-92b0-db7f909c5276' AND relationship = 'owner';
  IF n = 0 THEN
    RAISE EXCEPTION '069: test 2 sigue sin owner';
  END IF;
  RAISE NOTICE '069: OK - test 2 tiene % owner(s)', n;
END $$;

COMMIT;
