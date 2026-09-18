-- RLS v4: cierre final via REVOKE para los 3 objetos restantes (17 Sept 2026)
-- Ejecutar en Supabase SQL Editor.
--
-- Diagnóstico: libro_diario_integrado, libro_egresos y resumen_ingresos_egresos
-- siguen legibles con anon pese a v2+v3. Son vistas MATERIALIZADAS (u objetos
-- sin RLS posible): ALTER VIEW ... SET (security_invoker) no aplica a
-- materializadas y corren como owner, evadiendo el RLS de las tablas base.
-- El cierre correcto es revocar el acceso a los roles anon/authenticated.
-- service_role NO se ve afectado (bypass + grants propios): toda la API
-- server-side (incl. /api/accounting/integrated-books) sigue funcionando.
-- Ningún componente cliente lee estos 3 objetos directo (verificado en código).

-- Diagnóstico (solo lectura: confirma el tipo de objeto; m = materializada)
SELECT c.relname AS objeto,
       CASE c.relkind WHEN 'm' THEN 'materialized view' WHEN 'v' THEN 'view' WHEN 'r' THEN 'table' WHEN 'f' THEN 'foreign table' ELSE c.relkind::text END AS tipo
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public'
  AND c.relname IN ('libro_diario_integrado', 'libro_egresos', 'resumen_ingresos_egresos');

-- Cierre: revocar todo acceso anon/authenticated (service_role intacto)
REVOKE ALL ON "libro_diario_integrado" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON "libro_egresos" FROM anon, authenticated, PUBLIC;
REVOKE ALL ON "resumen_ingresos_egresos" FROM anon, authenticated, PUBLIC;

-- Verificación 1: tablas sin RLS (debe imprimir OK)
DO $$
DECLARE
  r RECORD;
  n INTEGER := 0;
BEGIN
  FOR r IN SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity ORDER BY 1
  LOOP
    RAISE NOTICE 'SIN RLS: %', r.tablename;
    n := n + 1;
  END LOOP;
  IF n = 0 THEN RAISE NOTICE 'OK: RLS habilitado en todas las tablas'; END IF;
END $$;
