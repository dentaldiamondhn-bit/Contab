-- 062_desexponer_tablas_nuevas_data_api.sql
--
-- Motivo: Supabase deja de otorgar automaticamente acceso al Data API a las
-- tablas NUEVAS del esquema public a partir del 30 Oct 2026 (las EXISTENTES
-- conservan sus permisos). Este proyecto decide ADOPTAR ese comportamiento ya,
-- pero SOLO para lo nuevo: las tablas que ya existen NO se tocan. Media app
-- cliente (unos 24 componentes) consulta tablas existentes con la anon key y
-- revocarlas la rompe.
--
-- Que hace:
--   * Quita a los roles PUBLICOS del Data API (anon, authenticated) el GRANT
--     por defecto sobre tablas, secuencias y funciones NUEVAS.
--   * Mantiene a service_role (el backend; clave secreta) con acceso por
--     defecto, para que las rutas del servidor sigan funcionando sin tener que
--     acordarse de un GRANT en cada migracion.
--   * Cierra EXECUTE por defecto sobre funciones nuevas para PUBLIC.
--
-- Que NO hace:
--   * No revoca nada sobre las tablas/funciones/secuencias YA existentes.
--   * No cambia el RLS ni los grants actuales.
--
-- LECCION de la primera version (abortada el 8 Oct 2026): revocar solo
-- SELECT, INSERT, UPDATE, DELETE en tablas y USAGE, SELECT en secuencias DEJA
-- RESIDUO si el default concede mas (TRUNCATE/REFERENCES/TRIGGER en tablas,
-- UPDATE en secuencias). El post-check lo caza ("Quedan 2 default(s)") y
-- aborta. Se revoca con ALL, que es lo unico completo. Y se cubre TAMBIEN el
-- default GLOBAL (sin IN SCHEMA): un default por esquema se SUMA al global y no
-- puede quitar lo que el global concede.
--
-- Ojo: ALTER DEFAULT PRIVILEGES solo afecta a objetos FUTUROS. Los objetos que
-- cree despues el rol postgres (el que usa el SQL Editor) no seran alcanzables
-- por anon/authenticated hasta que se les haga un GRANT explicito. Si alguna
-- pantalla cliente necesitara una tabla nueva por la anon key, habria que
-- anadir a mano: grant select on public.NOMBRE to anon;
--
-- Nota de mantenimiento: si despues del 30 Oct 2026 Supabase aplicase su propio
-- revoke tambien sobre service_role, las tablas nuevas dejarian de ser visibles
-- para el backend. Mitigacion: volver a correr esta migracion (es idempotente).

BEGIN;

-- 1. Tablas nuevas: fuera anon/authenticated; service_role conserva acceso.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;

-- 2. Secuencias nuevas (serial / identity).
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;

-- 3. Funciones nuevas.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
  GRANT ALL ON FUNCTIONS TO service_role;

-- 4. Default GLOBAL (sin esquema): si aqui hay grant a anon/authenticated, el
--    REVOKE por esquema de arriba no lo quita (solo suma). Se revoca tambien.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON TABLES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON SEQUENCES FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE ALL ON FUNCTIONS FROM anon, authenticated;

-- 5. PUBLIC (todos los roles) no debe poder ejecutar funciones nuevas. Va SIN
--    esquema a proposito: un default "in schema" no puede quitar el default
--    GLOBAL de PUBLIC para funciones.
ALTER DEFAULT PRIVILEGES FOR ROLE postgres
  REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 6. Post-check: aborta si algun rol publico del Data API sigue en el default
--    (global o de public) de tablas/secuencias/funciones. No comprueba las
--    tablas EXISTENTES (esas se quedan como estan a proposito; ver 063).
DO $$
DECLARE
  v_fuga int;
BEGIN
  SELECT count(*) INTO v_fuga
  FROM pg_default_acl d
  LEFT JOIN pg_namespace n ON n.oid = d.defaclnamespace
  JOIN pg_roles r ON r.oid = d.defaclrole
  WHERE r.rolname = 'postgres'
    AND (d.defaclnamespace = 0 OR n.nspname = 'public')
    AND d.defaclobjtype IN ('r', 'S', 'f')
    AND EXISTS (
      SELECT 1 FROM aclexplode(d.defaclacl) a
      WHERE a.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'anon')
         OR a.grantee = (SELECT oid FROM pg_roles WHERE rolname = 'authenticated')
    );

  IF v_fuga > 0 THEN
    RAISE EXCEPTION 'Quedan % default(s) con anon/authenticated (public o global): el REVOKE no surtio efecto', v_fuga;
  END IF;

  RAISE NOTICE '062 OK: anon/authenticated ya no reciben acceso por defecto a lo nuevo (public ni global).';
END $$;

COMMIT;
