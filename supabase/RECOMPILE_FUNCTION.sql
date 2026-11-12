-- FINAL FIX: Recompile the trigger function
-- This makes PostgreSQL recognize the new unique constraint

-- Recompile the update_tenant_statistics function
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

-- Verify the function was updated
SELECT routine_name, routine_definition 
FROM information_schema.routines 
WHERE routine_name = 'update_tenant_statistics';
