-- =================================================================
-- SETUP COMPLETO DEL SISTEMA MULTI-TENANT
-- Fusion de todos los scripts SQL necesarios
-- =================================================================

-- =================================================================
-- 1. MIGRACIÓN PARA AGREGAR TENANT_CODE
-- =================================================================

-- 1. Agregar columna tenantCode
ALTER TABLE "Tenant" 
ADD COLUMN "tenant_code" VARCHAR(10) UNIQUE;

-- 2. Generar códigos para tenants existentes
WITH tenant_with_codes AS (
  SELECT 
    "id",
    "businessname",
    CASE 
      WHEN "businessname" ILIKE '%dental%' THEN 'DEN001'
      WHEN "businessname" ILIKE '%contad%' THEN 'CON001'
      WHEN "businessname" ILIKE '%clinic%' THEN 'CLI001'
      WHEN "businessname" ILIKE '%hospital%' THEN 'HOS001'
      WHEN "businessname" ILIKE '%pharma%' THEN 'FAR001'
      ELSE NULL
    END as predefined_code,
    ROW_NUMBER() OVER (ORDER BY "createdat") as rn
  FROM "Tenant"
  WHERE "tenant_code" IS NULL
),
tenant_final_codes AS (
  SELECT 
    "id",
    COALESCE(
      predefined_code,
      UPPER(SUBSTRING(REPLACE(REPLACE("businessname", ' ', ''), '.', ''), 1, 3)) || 
      LPAD(rn::TEXT, 3, '0')
    ) as final_code
  FROM tenant_with_codes
)
UPDATE "Tenant" 
SET "tenant_code" = tfc.final_code
FROM tenant_final_codes tfc
WHERE "Tenant"."id" = tfc."id";

-- 3. Verificar que todos los códigos sean únicos
SELECT 
  "tenant_code",
  COUNT(*) as duplicate_count,
  STRING_AGG("businessname", ', ') as businesses
FROM "Tenant" 
WHERE "tenant_code" IS NOT NULL
GROUP BY "tenant_code"
HAVING COUNT(*) > 1;

-- 4. Si hay duplicados, generar códigos únicos
WITH duplicate_tenants AS (
  SELECT 
    "id",
    "businessname",
    "tenant_code",
    ROW_NUMBER() OVER (PARTITION BY "tenant_code" ORDER BY "createdat") as rn
  FROM "Tenant"
  WHERE "tenant_code" IS NOT NULL
),
duplicate_fix AS (
  SELECT 
    "id",
    UPPER(SUBSTRING(REPLACE(REPLACE("businessname", ' ', ''), '.', ''), 1, 3)) || 
    LPAD((SELECT COUNT(*) + 1 FROM "Tenant" t2 WHERE t2."businessname" <= dt."businessname")::TEXT, 3, '0') as new_code
  FROM duplicate_tenants dt
  WHERE rn > 1
)
UPDATE "Tenant" 
SET "tenant_code" = df.new_code
FROM duplicate_fix df
WHERE "Tenant"."id" = df."id";

-- 5. Verificar resultado final
SELECT 
  "id",
  "businessname",
  "tenant_code",
  "isactive",
  "createdat"
FROM "Tenant" 
ORDER BY "tenant_code";

-- 6. Crear índice para mejor rendimiento
CREATE INDEX IF NOT EXISTS "idx_tenant_tenant_code" ON "Tenant"("tenant_code");

-- =================================================================
-- 2. FUNCIONES SQL PARA SUPER_ADMIN
-- =================================================================

-- 2.1 Función para generar códigos de tenant únicos
CREATE OR REPLACE FUNCTION generate_tenant_code(business_name TEXT)
RETURNS TEXT AS $$
DECLARE
    prefix TEXT;
    counter INTEGER := 1;
    code TEXT;
BEGIN
    -- Extraer prefijo del nombre del negocio
    prefix := UPPER(REGEXP_REPLACE(business_name, '[^a-zA-Z]', '', 'g'));
    prefix := SUBSTRING(prefix, 1, 3);
    
    -- Si el prefijo está vacío, usar 'GEN'
    IF prefix = '' THEN
        prefix := 'GEN';
    END IF;
    
    -- Generar código único
    LOOP
        code := prefix || LPAD(counter::TEXT, 3, '0');
        
        -- Verificar si el código ya existe
        IF NOT EXISTS (SELECT 1 FROM "Tenant" WHERE tenant_code = code) THEN
            EXIT;
        END IF;
        
        counter := counter + 1;
        
        -- Prevención de bucle infinito
        IF counter > 9999 THEN
            RAISE EXCEPTION 'No se pudo generar código único para %', business_name;
        END IF;
    END LOOP;
    
    RETURN code;
END;
$$ LANGUAGE plpgsql;

-- 2.2 Función para que SUPER_ADMIN obtenga todos los tenants
CREATE OR REPLACE FUNCTION super_admin_get_all_tenants()
RETURNS TABLE (
    id TEXT,
    businessname TEXT,
    businessrtn TEXT,
    businessemail TEXT,
    businessaddress TEXT,
    tenant_code TEXT,
    country TEXT,
    phonenumber TEXT,
    subscriptionplan TEXT,
    maxusers INTEGER,
    maxstorage INTEGER,
    maxtransactions INTEGER,
    monthlycost INTEGER,
    isactive BOOLEAN,
    createdat TIMESTAMP,
    updatedat TIMESTAMP,
    usercount BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        t.id,
        t.businessname,
        t.businessrtn,
        t.businessemail,
        t.businessaddress,
        t.tenant_code,
        t.country,
        t.phonenumber,
        t.subscriptionplan,
        t.maxusers,
        t.maxstorage,
        t.maxtransactions,
        t.monthlycost,
        t.isactive,
        t.createdat,
        t.updatedat,
        COALESCE(COUNT(u.id), 0) as usercount
    FROM "Tenant" t
    LEFT JOIN "users" u ON t.id = u.tenant_id
    GROUP BY t.id, t.businessname, t.businessrtn, t.businessemail, 
             t.businessaddress, t.tenant_code, t.country, t.phonenumber,
             t.subscriptionplan, t.maxusers, t.maxstorage, t.maxtransactions,
             t.monthlycost, t.isactive, t.createdat, t.updatedat
    ORDER BY t.createdat DESC;
END;
$$ LANGUAGE plpgsql;

-- 2.3 Función para crear tenant con código automático
CREATE OR REPLACE FUNCTION create_tenant_with_code(
    businessname TEXT,
    businessrtn TEXT,
    businessemail TEXT,
    businessaddress TEXT,
    country TEXT DEFAULT 'HN',
    phonenumber TEXT DEFAULT NULL,
    subscriptionplan TEXT DEFAULT 'BASIC',
    maxusers INTEGER DEFAULT 5,
    maxstorage INTEGER DEFAULT 100,
    maxtransactions INTEGER DEFAULT 10000,
    monthlycost INTEGER DEFAULT 1000
)
RETURNS TABLE (
    tenantid TEXT,
    tenant_code TEXT,
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    newtenantid TEXT;
    newtenantcode TEXT;
BEGIN
    -- Generar código único
    newtenantcode := generate_tenant_code(businessname);
    
    -- Insertar tenant
    INSERT INTO "Tenant" (
        businessname,
        businessrtn,
        businessemail,
        businessaddress,
        tenant_code,
        country,
        phonenumber,
        subscriptionplan,
        maxusers,
        maxstorage,
        maxtransactions,
        monthlycost,
        isactive,
        createdat,
        updatedat
    ) VALUES (
        businessname,
        businessrtn,
        businessemail,
        businessaddress,
        newtenantcode,
        country,
        phonenumber,
        subscriptionplan,
        maxusers,
        maxstorage,
        maxtransactions,
        monthlycost,
        TRUE,
        NOW(),
        NOW()
    ) RETURNING id INTO newtenantid;
    
    RETURN QUERY
    SELECT newtenantid, newtenantcode, TRUE, 'Tenant creado exitosamente'::TEXT;
    
EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY
        SELECT NULL::TEXT, NULL::TEXT, FALSE, 'RTN o email ya existe'::TEXT;
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT NULL::TEXT, NULL::TEXT, FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 2.4 Función para actualizar tenant
CREATE OR REPLACE FUNCTION update_tenant(
    tenantid TEXT,
    businessname TEXT DEFAULT NULL,
    businessrtn TEXT DEFAULT NULL,
    businessemail TEXT DEFAULT NULL,
    businessaddress TEXT DEFAULT NULL,
    phonenumber TEXT DEFAULT NULL,
    subscriptionplan TEXT DEFAULT NULL,
    maxusers INTEGER DEFAULT NULL,
    maxstorage INTEGER DEFAULT NULL,
    maxtransactions INTEGER DEFAULT NULL,
    monthlycost INTEGER DEFAULT NULL,
    isactive BOOLEAN DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT
) AS $$
DECLARE
    tenantexists BOOLEAN;
    newtenantcode TEXT;
BEGIN
    -- Verificar que el tenant existe
    SELECT EXISTS(SELECT 1 FROM "Tenant" WHERE id = tenantid) INTO tenantexists;
    
    IF NOT tenantexists THEN
        RETURN QUERY
        SELECT FALSE, 'Tenant no encontrado'::TEXT;
        RETURN;
    END IF;
    
    -- Si se actualiza el nombre, generar nuevo código
    IF businessname IS NOT NULL THEN
        newtenantcode := generate_tenant_code(businessname);
    END IF;
    
    -- Actualizar tenant
    UPDATE "Tenant" SET
        businessname = COALESCE(businessname, businessname),
        businessrtn = COALESCE(businessrtn, businessrtn),
        businessemail = COALESCE(businessemail, businessemail),
        businessaddress = COALESCE(businessaddress, businessaddress),
        tenant_code = COALESCE(newtenantcode, tenant_code),
        phonenumber = COALESCE(phonenumber, phonenumber),
        subscriptionplan = COALESCE(subscriptionplan, subscriptionplan),
        maxusers = COALESCE(maxusers, maxusers),
        maxstorage = COALESCE(maxstorage, maxstorage),
        maxtransactions = COALESCE(maxtransactions, maxtransactions),
        monthlycost = COALESCE(monthlycost, monthlycost),
        isactive = COALESCE(isactive, isactive),
        updatedat = NOW()
    WHERE id = tenantid;
    
    RETURN QUERY
    SELECT TRUE, 'Tenant actualizado exitosamente'::TEXT;
    
EXCEPTION
    WHEN unique_violation THEN
        RETURN QUERY
        SELECT FALSE, 'RTN o email ya existe'::TEXT;
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT FALSE, SQLERRM::TEXT;
END;
$$ LANGUAGE plpgsql;

-- 2.5 Función para eliminar tenant (con verificación de seguridad)
CREATE OR REPLACE FUNCTION delete_tenant_safely(tenantid TEXT)
RETURNS TABLE (
    success BOOLEAN,
    message TEXT,
    usersdeleted INTEGER
) AS $$
DECLARE
    tenantexists BOOLEAN;
    usercount INTEGER;
BEGIN
    -- Verificar que el tenant existe
    SELECT EXISTS(SELECT 1 FROM "Tenant" WHERE id = tenantid) INTO tenantexists;
    
    IF NOT tenantexists THEN
        RETURN QUERY
        SELECT FALSE, 'Tenant no encontrado'::TEXT, 0;
        RETURN;
    END IF;
    
    -- Contar usuarios
    SELECT COUNT(*) INTO usercount FROM "users" WHERE tenant_id = tenantid;
    
    -- Eliminar usuarios primero (cascade debería manejar esto, pero por seguridad)
    DELETE FROM "users" WHERE tenant_id = tenantid;
    
    -- Eliminar tenant
    DELETE FROM "Tenant" WHERE id = tenantid;
    
    RETURN QUERY
    SELECT TRUE, 
           format('Tenant y %s usuarios eliminados exitosamente', usercount)::TEXT,
           usercount;
    
EXCEPTION
    WHEN OTHERS THEN
        RETURN QUERY
        SELECT FALSE, SQLERRM::TEXT, 0;
END;
$$ LANGUAGE plpgsql;

-- 2.6 Función para estadísticas generales (simplificada)
DROP FUNCTION IF EXISTS super_adminstatistics();

CREATE FUNCTION super_adminstatistics()
RETURNS TABLE (
    totaltenants INTEGER,
    activetenants INTEGER,
    totalusers INTEGER,
    activeusers INTEGER,
    tenantscreatedthismonth INTEGER
) AS $$
DECLARE
    v_totaltenants INTEGER;
    v_activetenants INTEGER;
    v_totalusers INTEGER;
    v_activeusers INTEGER;
    v_tenantscreatedthismonth INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_totaltenants FROM "Tenant";
    SELECT COUNT(*) INTO v_activetenants FROM "Tenant" WHERE isactive = TRUE;
    SELECT COUNT(*) INTO v_totalusers FROM "users";
    SELECT COUNT(*) INTO v_activeusers FROM "users" WHERE is_active = TRUE;
    SELECT COUNT(*) INTO v_tenantscreatedthismonth FROM "Tenant" WHERE createdat >= DATE_TRUNC('month', CURRENT_DATE);
    
    RETURN QUERY SELECT 
        v_totaltenants,
        v_activetenants,
        v_totalusers,
        v_activeusers,
        v_tenantscreatedthismonth;
END;
$$ LANGUAGE plpgsql;

-- =================================================================
-- 3. VISTAS Y TRIGGERS
-- =================================================================

-- 3.1 Vista para estadísticas de tenants
CREATE OR REPLACE VIEW tenantstatistics AS
SELECT 
    t.tenant_code,
    t.businessname,
    t.subscriptionplan,
    t.maxusers,
    COUNT(u.id) as currentusers,
    t.maxusers - COUNT(u.id) as availableslots,
    ROUND((COUNT(u.id)::NUMERIC / t.maxusers::NUMERIC) * 100, 2) as usagepercentage,
    t.isactive,
    t.createdat
FROM "Tenant" t
LEFT JOIN "users" u ON t.id = u.tenant_id AND u.is_active = TRUE
GROUP BY t.id, t.tenant_code, t.businessname, t.subscriptionplan, 
         t.maxusers, t.isactive, t.createdat
ORDER BY t.createdat DESC;

-- 3.2 Vista alternativa para estadísticas por plan
CREATE OR REPLACE VIEW tenant_plan_statistics AS
SELECT 
    t.subscriptionplan,
    COUNT(u.id) as usercount
FROM "Tenant" t
LEFT JOIN "users" u ON t.id = u.tenant_id
GROUP BY t.subscriptionplan
ORDER BY usercount DESC;

-- 3.3 Trigger para actualizar timestamp en tenants
CREATE OR REPLACE FUNCTION update_tenant_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updatedat = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER tenant_update_timestamp
    BEFORE UPDATE ON "Tenant"
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_timestamp();

-- =================================================================
-- 4. VERIFICACIÓN FINAL
-- =================================================================

-- Verificar que todo esté creado correctamente
SELECT 
    'generate_tenant_code' as functionname,
    CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'generate_tenant_code') THEN 'OK' ELSE 'ERROR' END as status
UNION ALL
SELECT 
    'super_admin_get_all_tenants' as functionname,
    CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'super_admin_get_all_tenants') THEN 'OK' ELSE 'ERROR' END as status
UNION ALL
SELECT 
    'create_tenant_with_code' as functionname,
    CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'create_tenant_with_code') THEN 'OK' ELSE 'ERROR' END as status
UNION ALL
SELECT 
    'update_tenant' as functionname,
    CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'update_tenant') THEN 'OK' ELSE 'ERROR' END as status
UNION ALL
SELECT 
    'delete_tenant_safely' as functionname,
    CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'delete_tenant_safely') THEN 'OK' ELSE 'ERROR' END as status
UNION ALL
SELECT 
    'super_admin_statistics' as functionname,
    CASE WHEN EXISTS(SELECT 1 FROM pg_proc WHERE proname = 'super_admin_statistics') THEN 'OK' ELSE 'ERROR' END as status
UNION ALL
SELECT 
    'tenantstatistics' as functionname,
    CASE WHEN EXISTS(SELECT 1 FROM pg_matviews WHERE matviewname = 'tenant_statistics') THEN 'OK' ELSE 'ERROR' END as status
UNION ALL
SELECT 
    'tenant_plan_statistics' as functionname,
    CASE WHEN EXISTS(SELECT 1 FROM pg_matviews WHERE matviewname = 'tenant_plan_statistics') THEN 'OK' ELSE 'ERROR' END as status
UNIONION ALL
SELECT 
    'tenant_update_timestamp' as functionname,
    CASE WHEN EXISTS(SELECT 1 FROM pg_trigger WHERE tgname = 'tenant_update_timestamp') THEN 'OK' ELSE 'ERROR' END as status;

-- =================================================================
-- 5. VERIFICACIÓN DE DATOS
-- =================================================================

-- Verificar tenants con códigos
SELECT 
  "id",
  "businessname",
  "tenant_code",
  "isactive",
  "createdat"
FROM "Tenant" 
ORDER BY "tenant_code";

-- Verificar conteo de usuarios por tenant
SELECT 
  t."tenant_code",
  t."businessname",
  t."subscriptionplan",
  COUNT(u.id) as current_users,
  t."maxusers"
FROM "Tenant" t
LEFT JOIN "users" u ON t.id = u."tenant_id"
GROUP BY t."tenant_code", t."businessname", t."subscriptionplan", t."maxusers"
ORDER BY t."businessname";
