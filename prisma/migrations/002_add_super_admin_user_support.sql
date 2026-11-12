-- Migration: Add Super Admin User Support
-- Add tenantId field to users table for multi-tenant support
-- Add relation between users and tenants

-- Add tenantId column to users table
ALTER TABLE users ADD COLUMN tenant_id VARCHAR(255) REFERENCES Tenant(id) ON DELETE SET NULL;

-- Update existing users to have default tenant if they don't have SUPER_ADMIN role
UPDATE users 
SET tenant_id = (SELECT id FROM Tenant LIMIT 1) 
WHERE tenant_id IS NULL AND role != 'SUPER_ADMIN';

-- Create index for better performance
CREATE INDEX idx_users_tenant ON users(tenant_id);

-- Update role comments for clarity
COMMENT ON COLUMN users.role IS 'User roles: SUPER_ADMIN (can see all tenants), ADMIN (tenant admin), MANAGER (can manage accounts), USER (regular user), VIEWER (read-only)';
