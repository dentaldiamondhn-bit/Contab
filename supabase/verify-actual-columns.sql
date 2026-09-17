-- Verify ACTUAL existing columns by testing each one
-- This will give us the definitive list of columns that truly exist

-- 1. Test business columns individually
DO $$
BEGIN
    -- Test business_name
    BEGIN
        EXECUTE 'SELECT business_name FROM Tenant LIMIT 1';
        RAISE NOTICE '✅ business_name EXISTS';
    EXCEPTION WHEN undefined_column THEN
        RAISE NOTICE '❌ business_name DOES NOT EXIST';
    END;
    
    -- Test businessname
    BEGIN
        EXECUTE 'SELECT businessname FROM Tenant LIMIT 1';
        RAISE NOTICE '✅ businessname EXISTS';
    EXCEPTION WHEN undefined_column THEN
        RAISE NOTICE '❌ businessname DOES NOT EXIST';
    END;
    
    -- Test business_email
    BEGIN
        EXECUTE 'SELECT business_email FROM Tenant LIMIT 1';
        RAISE NOTICE '✅ business_email EXISTS';
    EXCEPTION WHEN undefined_column THEN
        RAISE NOTICE '❌ business_email DOES NOT EXIST';
    END;
    
    -- Test businessemail
    BEGIN
        EXECUTE 'SELECT businessemail FROM Tenant LIMIT 1';
        RAISE NOTICE '✅ businessemail EXISTS';
    EXCEPTION WHEN undefined_column THEN
        RAISE NOTICE '❌ businessemail DOES NOT EXIST';
    END;
END $$;

-- 2. Test all columns we plan to use
DO $$
DECLARE
    col_name TEXT;
    col_list TEXT[] := ARRAY[
        'id', 'tenant_code', 'subscription_plan', 'max_users', 'max_storage', 
        'max_transactions', 'monthly_cost', 'is_active', 'created_at', 'updated_at',
        'logo_url', 'phone_number', 'country', 'currency', 'timezone', 'modules',
        'business_name', 'business_rtn', 'business_email', 'business_address'
    ];
BEGIN
    FOREACH col_name IN ARRAY col_list
    LOOP
        BEGIN
            EXECUTE format('SELECT %I FROM Tenant LIMIT 1', col_name);
            RAISE NOTICE '✅ %s EXISTS', col_name;
        EXCEPTION WHEN undefined_column THEN
            RAISE NOTICE '❌ %s DOES NOT EXIST', col_name;
        END;
    END LOOP;
END $$;

-- 3. Get definitive column list from actual table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'Tenant' AND table_schema = 'public' 
ORDER BY ordinal_position;
