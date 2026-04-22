-- Migration: Super Admin System Setup
-- Create comprehensive admin system with multi-tenant support

-- 1. Update User model to support super admin role
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(255) REFERENCES Tenant(id) ON DELETE SET NULL;

-- First, normalize any invalid roles to 'USER' (the default role)
UPDATE users 
SET role = 'USER' 
WHERE role IS NULL 
   OR role NOT IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER', 'user', 'admin', 'manager', 'viewer');

-- Also handle case variations
UPDATE users SET role = 'USER' WHERE LOWER(role) = 'user' AND role != 'USER';
UPDATE users SET role = 'ADMIN' WHERE LOWER(role) = 'admin' AND role != 'ADMIN';
UPDATE users SET role = 'MANAGER' WHERE LOWER(role) = 'manager' AND role != 'MANAGER';
UPDATE users SET role = 'VIEWER' WHERE LOWER(role) = 'viewer' AND role != 'VIEWER';

-- Note: Check constraints with complex logic should be added manually after data migration
-- For now, we'll add a simple check constraint
ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (
  role IN ('SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER')
);

CREATE INDEX IF NOT EXISTS idx_users_tenant_role ON users(tenant_id, role);

-- 2. Create admin permissions system
CREATE TABLE IF NOT EXISTS admin_permissions (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default permissions (only if table is empty)
INSERT INTO admin_permissions (id, name, description) 
SELECT * FROM (VALUES
  ('manage_all_users', 'manage_all_users', 'Gestionar todos los usuarios del sistema'),
  ('manage_tenants', 'manage_tenants', 'Gestionar todos los tenants'),
  ('create_admin_users', 'create_admin_users', 'Crear usuarios con rol ADMIN'),
  ('view_user_details', 'view_user_details', 'Ver detalles de usuarios'),
  ('manage_user_roles', 'manage_user_roles', 'Cambiar roles de usuarios'),
  ('manage_user_status', 'manage_user_status', 'Activar/desactivar usuarios'),
  ('access_all_tenant_data', 'access_all_tenant_data', 'Acceder a todos los datos de tenants'),
  ('system_configuration', 'system_configuration', 'Configuración del sistema')
) AS v(id, name, description)
WHERE NOT EXISTS (SELECT 1 FROM admin_permissions LIMIT 1);

-- 3. Create user permissions mapping
CREATE TABLE IF NOT EXISTS user_admin_permissions (
  user_id UUID NOT NULL,
  permission_id VARCHAR(255) NOT NULL,
  granted_by UUID NOT NULL,
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, permission_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (permission_id) REFERENCES admin_permissions(id) ON DELETE CASCADE
);

-- 4. Create audit log for admin actions
CREATE TABLE IF NOT EXISTS admin_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  action VARCHAR(255) NOT NULL,
  target_type VARCHAR(100),
  target_id VARCHAR(255),
  old_values JSONB,
  new_values JSONB,
  ip_address VARCHAR(45),
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 5. Create tenant access control
CREATE TABLE IF NOT EXISTS tenant_user_access (
  user_id UUID NOT NULL,
  tenant_id VARCHAR(255) NOT NULL,
  access_level VARCHAR(50) NOT NULL DEFAULT 'limited',
  granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP,
  granted_by UUID NOT NULL,
  PRIMARY KEY (user_id, tenant_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (tenant_id) REFERENCES Tenant(id) ON DELETE CASCADE,
  FOREIGN KEY (granted_by) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_user_action ON admin_audit_log(user_id, action, created_at);
CREATE INDEX IF NOT EXISTS idx_admin_audit_log_target ON admin_audit_log(target_type, target_id, created_at);
CREATE INDEX IF NOT EXISTS idx_tenant_user_access_user ON tenant_user_access(user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_user_access_tenant ON tenant_user_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_admin_permissions_user ON user_admin_permissions(user_id);

-- 7. Create system settings table
CREATE TABLE IF NOT EXISTS system_settings (
  key VARCHAR(255) PRIMARY KEY,
  value TEXT NOT NULL,
  description TEXT,
  category VARCHAR(100) DEFAULT 'general',
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255)
);

-- Insert default system settings
INSERT INTO system_settings (key, value, description, category) VALUES
  ('allow_multi_tenant_admin', 'true', 'Permitir múltiples administradores de tenant', 'security'),
  ('require_tenant_for_admin', 'false', 'Los admins no necesitan estar asignados a un tenant específico', 'security'),
  ('max_admins_per_tenant', '1', 'Máximo de 1 admin por tenant (además del super admin)', 'security')
ON CONFLICT (key) DO NOTHING;

-- Migration completed successfully
