-- ============================================================================
-- 036 - Dar dueno a "Empresa 1" (tenant '1'), que no tenia membresia
-- ----------------------------------------------------------------------------
-- PENDIENTE DE APLICAR EN EL SQL EDITOR DE SUPABASE.
--
-- Medido (1 Oct 2026): la empresa "Empresa 1" (id
-- 73d5bbf7-8e47-470e-9430-da513e623ab7, tenant_id '1') existe pero NO tiene
-- ninguna fila en `user_company_access`, asi que NADIE puede entrar a ella.
-- Ningun `User` tiene `tenantid = '1'` (el `User.tenantid` es legacy y no es la
-- fuente de verdad; la membresia es `user_company_access`).
--
-- Decision del usuario: asignar como dueno a `gcalix12@hotmail.com`
-- (user 00dec7a4-59f7-46c4-b475-dcf735df816e, hoy ADMIN de Angelos), porque
-- Empresa 1 comparte el historico de las cuentas 1101/4101 con Angelos.
--
-- `is_default` se deja en false: gcalix12 ya tiene Angelos como empresa por
-- defecto (`is_default = true`), y no se le cambia el defecto.
--
-- Idempotente: si la membresia ya existe, no hace nada.
-- ============================================================================

BEGIN;

DO $$
DECLARE
  v_user    text := '00dec7a4-59f7-46c4-b475-dcf735df816e';
  v_company text := '73d5bbf7-8e47-470e-9430-da513e623ab7';
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public."User" WHERE id = v_user) THEN
    RAISE EXCEPTION '036: no existe el usuario % en "User"', v_user;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.companies WHERE id = v_company) THEN
    RAISE EXCEPTION '036: no existe la empresa % en companies', v_company;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.user_company_access
    WHERE user_id = v_user AND company_id = v_company
  ) THEN
    RAISE NOTICE '036: la membresia ya existe, no se toca';
  ELSE
    INSERT INTO public.user_company_access (user_id, company_id, relationship, is_default)
    VALUES (v_user, v_company, 'owner', false);
    RAISE NOTICE '036: creada membresia owner para % en Empresa 1', v_user;
  END IF;
END $$;

-- Post-check: Empresa 1 debe tener al menos un owner.
DO $$
DECLARE
  n int;
BEGIN
  SELECT count(*) INTO n
  FROM public.user_company_access
  WHERE company_id = '73d5bbf7-8e47-470e-9430-da513e623ab7' AND relationship = 'owner';
  IF n = 0 THEN
    RAISE EXCEPTION '036: Empresa 1 sigue sin owner';
  END IF;
  RAISE NOTICE '036: OK - Empresa 1 tiene % owner(s)', n;
END $$;

COMMIT;
