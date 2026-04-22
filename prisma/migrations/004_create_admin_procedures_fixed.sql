-- Migration: Create Admin Procedures and Functions
-- This migration creates stored procedures for admin management

-- 1. Create procedure to promote user to admin
CREATE OR REPLACE FUNCTION promote_user_to_admin(
    target_user_id VARCHAR(255),
    promoted_by VARCHAR(255),
    promotion_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    old_role VARCHAR(50);
    user_email VARCHAR(255);
    user_tenant_id VARCHAR(255);
BEGIN
    -- Get current user info
    SELECT role, email, tenant_id INTO old_role, user_email, user_tenant_id
    FROM users WHERE id = target_user_id;
    
    -- Check if promoter is super admin
    IF EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = promoted_by 
        AND u.role = 'SUPER_ADMIN'
    ) THEN
        -- Promote user
        UPDATE users 
        SET role = 'ADMIN' 
        WHERE id = target_user_id;
        
        -- Log the promotion
        INSERT INTO admin_audit_log (
            user_id, action, target_type, target_id, old_values, new_values
        ) VALUES (
            promoted_by,
            'promote_to_admin',
            'user',
            target_user_id,
            jsonb_build_object('role', old_role, 'email', user_email, 'tenant_id', user_tenant_id),
            jsonb_build_object('role', 'ADMIN')
        );
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- 2. Create function to check admin permissions
CREATE OR REPLACE FUNCTION check_admin_permission(
    p_user_id VARCHAR(255),
    p_permission_name VARCHAR(255)
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM user_admin_permissions uap
        JOIN admin_permissions ap ON uap.permission_id = ap.id
        WHERE uap.user_id = p_user_id 
        AND ap.name = p_permission_name
    );
END;
$$;

-- 3. Create function to get user permissions
CREATE OR REPLACE FUNCTION get_user_permissions(
    p_user_id VARCHAR(255)
)
RETURNS TABLE(permission_name VARCHAR(255))
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT ap.name 
    FROM user_admin_permissions uap
    JOIN admin_permissions ap ON uap.permission_id = ap.id
    WHERE uap.user_id = p_user_id;
END;
$$;

-- 4. Create procedure to revoke tenant access
CREATE OR REPLACE FUNCTION revoke_tenant_access(
    p_target_user_id VARCHAR(255),
    p_target_tenant_id VARCHAR(255),
    p_revoked_by VARCHAR(255),
    p_reason TEXT DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if revoker is super admin
    IF EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = p_revoked_by 
        AND u.role = 'SUPER_ADMIN'
    ) THEN
        -- Revoke tenant access
        DELETE FROM tenant_user_access 
        WHERE user_id = p_target_user_id AND tenant_id = p_target_tenant_id;
        
        -- Log the revocation
        INSERT INTO admin_audit_log (
            user_id, action, target_type, target_id, old_values, new_values
        ) VALUES (
            p_revoked_by,
            'revoke_tenant_access',
            'user',
            p_target_user_id,
            jsonb_build_object('user_id', p_target_user_id, 'tenant_id', p_target_tenant_id),
            jsonb_build_object('access_revoked', true, 'reason', p_reason)
        );
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- 5. Create procedure to grant tenant access
CREATE OR REPLACE FUNCTION grant_tenant_access(
    p_target_user_id VARCHAR(255),
    p_target_tenant_id VARCHAR(255),
    p_granted_by VARCHAR(255),
    p_access_level VARCHAR(50) DEFAULT 'limited',
    p_expires_days INTEGER DEFAULT 90
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Check if granter is super admin
    IF EXISTS (
        SELECT 1 FROM users u 
        WHERE u.id = p_granted_by 
        AND u.role = 'SUPER_ADMIN'
    ) THEN
        -- Grant tenant access
        INSERT INTO tenant_user_access (
            user_id, tenant_id, access_level, granted_at, expires_at, granted_by
        ) VALUES (
            p_target_user_id,
            p_target_tenant_id,
            p_access_level,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP + (p_expires_days || ' days')::INTERVAL,
            p_granted_by
        )
        ON CONFLICT (user_id, tenant_id) 
        DO UPDATE SET 
            access_level = EXCLUDED.access_level,
            granted_at = EXCLUDED.granted_at,
            expires_at = EXCLUDED.expires_at,
            granted_by = EXCLUDED.granted_by;
        
        -- Log the action
        INSERT INTO admin_audit_log (
            user_id, action, target_type, target_id, old_values, new_values
        ) VALUES (
            p_granted_by,
            'grant_tenant_access',
            'user',
            p_target_user_id,
            jsonb_build_object('user_id', p_target_user_id, 'tenant_id', p_target_tenant_id),
            jsonb_build_object('access_level', p_access_level, 'expires_days', p_expires_days)
        );
        
        RETURN TRUE;
    ELSE
        RETURN FALSE;
    END IF;
END;
$$;

-- 6. Create trigger to audit user changes
CREATE OR REPLACE FUNCTION audit_user_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF TG_OP = 'UPDATE' THEN
        INSERT INTO admin_audit_log (
            user_id, action, target_type, target_id, old_values, new_values
        ) VALUES (
            COALESCE(current_setting('app.current_user_id', true), 'system'),
            'user_updated',
            'user',
            OLD.id,
            jsonb_build_object(
                'role', OLD.role,
                'email', OLD.email,
                'tenant_id', OLD.tenant_id,
                'is_active', OLD.is_active
            ),
            jsonb_build_object(
                'role', NEW.role,
                'email', NEW.email,
                'tenant_id', NEW.tenant_id,
                'is_active', NEW.is_active
            )
        );
    END IF;
    
    RETURN NEW;
END;
$$;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS audit_user_changes ON users;

-- Create trigger on users table
CREATE TRIGGER audit_user_changes
    AFTER UPDATE ON users
    FOR EACH ROW
    EXECUTE FUNCTION audit_user_change();

-- Migration completed successfully
