-- DROP AND RECREATE TRIGGER FUNCTION
-- This forces PostgreSQL to completely recompile and recognize the constraint

-- 1. Drop the trigger first
DROP TRIGGER IF EXISTS trigger_update_tenant_statistics ON "Tenant";

-- 2. Drop the function
DROP FUNCTION IF EXISTS update_tenant_statistics();

-- 3. Recreate the function fresh
CREATE OR REPLACE FUNCTION update_tenant_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_plan_statistics (
        id, 
        tenant_id, 
        subscriptionplan, 
        plan_code, 
        quantity, 
        usercount, 
        monthly_cost, 
        updated_at
    )
    VALUES (
        gen_random_uuid()::text,
        NEW.id,
        COALESCE(NEW.subscriptionplan, 'BASIC'),
        CASE 
            WHEN COALESCE(NEW.subscriptionplan, 'BASIC') LIKE '%BASIC%' THEN 'BASIC'
            WHEN COALESCE(NEW.subscriptionplan, 'BASIC') LIKE '%PRO%' THEN 'PRO'
            WHEN COALESCE(NEW.subscriptionplan, 'BASIC') LIKE '%ENTERPRISE%' THEN 'ENTERPRISE'
            ELSE 'BASIC'
        END,
        1,
        (SELECT COUNT(*) FROM "User" u WHERE u.tenantid = NEW.id AND u.isactive = true),
        COALESCE(NEW.monthlycost, 1000),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (tenant_id) 
    DO UPDATE SET 
        subscriptionplan = EXCLUDED.subscriptionplan,
        plan_code = EXCLUDED.plan_code,
        usercount = EXCLUDED.usercount,
        monthly_cost = EXCLUDED.monthly_cost,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. Recreate the trigger
CREATE TRIGGER trigger_update_tenant_statistics
    AFTER INSERT OR UPDATE ON "Tenant"
    FOR EACH ROW
    EXECUTE FUNCTION update_tenant_statistics();

-- 5. Verify
SELECT trigger_name, event_manipulation, action_timing 
FROM information_schema.triggers 
WHERE trigger_name = 'trigger_update_tenant_statistics';
