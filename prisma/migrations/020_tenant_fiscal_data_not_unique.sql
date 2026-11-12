-- 020_tenant_fiscal_data_not_unique.sql
-- El email y el RTN del tenant son DATOS FISCALES que se imprimen en facturas.
-- El onboarding los alteraba (`+<tenantCode>` en el email, timestamp en el RTN)
-- para cumplir el UNIQUE de `Tenant.businessemail`, lo que ensuciaba facturas y
-- reportes. Este script:
--   1. Quita TODOS los UNIQUE sobre businessemail/business_email/businessrtn/
--      business_rtn (hay uno por convencion de nombres) y deja indices no unicos.
--   2. Limpia los valores ya alterados en la base.
-- Ejecutar en el SQL Editor de Supabase. Es idempotente: si falla una sentencia
-- la transaccion entera se revierte, asi que se puede reintentar el archivo completo.

-- ---------------------------------------------------------------------------
-- 1. Los datos fiscales dejan de ser UNIQUE
--    La tabla tiene dos convenciones de nombres (camelCase y snake_case) y cada
--    una tiene su propio constraint UNIQUE, p.ej. `Tenant_New_businessemail_key`
--    y `Tenant_business_email_key`. Se quitan TODOS los UNIQUE que involucren
--    estas columnas, en cualquier combinacion.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  col TEXT;
  constraint_name TEXT;
BEGIN
  FOREACH col IN ARRAY ARRAY[
    'businessemail', 'business_email',
    'businessrtn',   'business_rtn'
  ] LOOP
    FOR constraint_name IN
      SELECT con.conname
      FROM pg_constraint con
      JOIN pg_class rel ON rel.oid = con.conrelid
      WHERE rel.relname = 'Tenant'
        AND con.contype = 'u'
        AND con.conkey = ARRAY[
              (SELECT attnum FROM pg_attribute
                WHERE attrelid = rel.oid AND attname = col)
            ]::smallint[]
    LOOP
      EXECUTE format('ALTER TABLE "Tenant" DROP CONSTRAINT %I', constraint_name);
      RAISE NOTICE 'Tenant: UNIQUE % eliminado de %', constraint_name, col;
    END LOOP;
  END LOOP;
END $$;

-- Se mantienen indices no unicos para no perder rendimiento en busquedas.
CREATE INDEX IF NOT EXISTS idx_tenant_businessemail ON "Tenant" (businessemail);
CREATE INDEX IF NOT EXISTS idx_tenant_business_email ON "Tenant" (business_email);
CREATE INDEX IF NOT EXISTS idx_tenant_businessrtn ON "Tenant" (businessrtn);
CREATE INDEX IF NOT EXISTS idx_tenant_business_rtn ON "Tenant" (business_rtn);

-- ---------------------------------------------------------------------------
-- 2. Limpieza de valores alterados
--    Solo toca filas cuyo valor sigue el patron exacto que generaba el bug,
--    para no modificar RTNs/emails introducidos a mano.
-- ---------------------------------------------------------------------------

-- 2.1 Email: quita el sufijo +<codigo> antes del dominio.
--     'dentaldiamondhn+TEST1DS@gmail.com' -> 'dentaldiamondhn@gmail.com'
--     'noreply+TST20HM@example.com'        -> 'noreply@example.com'
--     (los placeholders tambien se limpian: son tan solo datos de prueba)
UPDATE "Tenant"
SET businessemail = regexp_replace(businessemail, '\+[A-Za-z0-9]+(?=@)', '', 'g'),
    updatedat = now()
WHERE businessemail ~ '\+[A-Za-z0-9]+@';

UPDATE "Tenant"
SET business_email = regexp_replace(business_email, '\+[A-Za-z0-9]+(?=@)', '', 'g')
WHERE business_email ~ '\+[A-Za-z0-9]+@';

-- 2.2 RTN con guiones + sufijo numerico: '0101-0220-312304-1789620883990'
UPDATE "Tenant"
SET businessrtn = regexp_replace(businessrtn, '^((\d{4}-\d{4}-\d{6}))-\d+$', '\1'),
    updatedat = now()
WHERE businessrtn ~ '^\d{4}-\d{4}-\d{6}-\d+$';

UPDATE "Tenant"
SET business_rtn = regexp_replace(business_rtn, '^((\d{4}-\d{4}-\d{6}))-\d+$', '\1')
WHERE business_rtn ~ '^\d{4}-\d{4}-\d{6}-\d+$';

-- 2.3 RTN de 14 digitos + sufijo numerico: '05011991078001-1788048129466'
UPDATE "Tenant"
SET businessrtn = regexp_replace(businessrtn, '^(\d{13,14})-\d+$', '\1'),
    updatedat = now()
WHERE businessrtn ~ '^\d{13,14}-\d+$';

UPDATE "Tenant"
SET business_rtn = regexp_replace(business_rtn, '^(\d{13,14})-\d+$', '\1')
WHERE business_rtn ~ '^\d{13,14}-\d+$';

-- 2.4 Propaga el valor limpio a la columna espejo snake_case cuando esta vacia.
UPDATE "Tenant" SET business_email = businessemail WHERE (business_email IS NULL OR business_email = '') AND businessemail <> '';
UPDATE "Tenant" SET business_rtn   = businessrtn   WHERE (business_rtn   IS NULL OR business_rtn   = '') AND businessrtn   <> '';

-- ---------------------------------------------------------------------------
-- Verificacion
-- ---------------------------------------------------------------------------

-- a) Constraints UNIQUE que sigan envolvendo datos fiscales (debe salir vacio).
SELECT con.conname AS unique_constraint,
       string_agg(att.attname, ' + ' ORDER BY att.attnum) AS columnas
FROM pg_constraint con
JOIN pg_class rel ON rel.oid = con.conrelid
JOIN pg_attribute att ON att.attrelid = rel.oid AND att.attnum = ANY (con.conkey)
WHERE rel.relname = 'Tenant'
  AND con.contype = 'u'
  AND att.attname IN ('businessemail','business_email','businessrtn','business_rtn')
GROUP BY con.conname;

-- b) Valores finales. Debe salir 'OK' en la 3er columna.
SELECT id,
       businessname,
       CASE
         WHEN businessemail ~ '\+' OR businessrtn ~ '-\d{10,}$' THEN 'REVISAR'
         ELSE 'OK'
       END AS estado,
       businessemail,
       businessrtn
FROM "Tenant"
ORDER BY id;
