// ============================================================================
// CONTAB - Sistema Centralizado de Permisos
// ============================================================================

export type Role = 'SUPER_ADMIN' | 'SUPPORT' | 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'USER' | 'VIEWER';

export type Permission =
  // Gestión global
  | 'tenants:manage'
  | 'tenants:view'
  | 'users:global_manage'
  | 'users:global_view'
  | 'system:config'
  | 'audit:view_global'
  // Tenant admin
  | 'users:tenant_manage'
  | 'tenant:config'
  | 'billing:manage'
  // Contabilidad
  | 'accounting:manage'      // plan de cuentas, pólizas
  | 'accounting:view'        // ver pólizas
  | 'closing:manage'         // cierre de períodos
  | 'financial_statements:view' // estados financieros
  // Facturación
  | 'invoices:create'
  | 'invoices:view'
  | 'cai:manage'
  // Inventario
  | 'inventory:view'
  | 'inventory:manage'       // gestionar productos
  | 'inventory:movements'    // movimientos de stock
  // Compras
  | 'purchases:view'
  | 'purchases:manage'
  // Impuestos
  | 'tax:config'             // config ISV/retenciones
  | 'tax:view'               // ver reportes fiscales
  | 'det:manage'             // DET/DEI
  // Reportes
  | 'reports:financial'
  | 'reports:support'
  // Soporte
  | 'support:tickets'
  | 'support:reset_password';

// Matriz de permisos por rol
const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  SUPER_ADMIN: [
    // Acceso total
    'tenants:manage', 'tenants:view', 'users:global_manage', 'users:global_view',
    'system:config', 'audit:view_global',
    'users:tenant_manage', 'tenant:config', 'billing:manage',
    'accounting:manage', 'accounting:view', 'closing:manage', 'financial_statements:view',
    'invoices:create', 'invoices:view', 'cai:manage',
    'inventory:view', 'inventory:manage', 'inventory:movements',
    'purchases:view', 'purchases:manage',
    'tax:config', 'tax:view', 'det:manage',
    'reports:financial', 'reports:support',
    'support:tickets', 'support:reset_password',
  ],

  SUPPORT: [
    // Gestión tenants/usuarios
    'tenants:view', 'users:global_view', 'users:tenant_manage',
    'audit:view_global',
    // Config sistema
    'system:config',
    // Contabilidad
    'accounting:view', 'closing:manage', 'financial_statements:view',
    // Facturación
    'billing:manage', 'invoices:view',
    // Inventario
    'inventory:view', 'inventory:manage', 'inventory:movements',
    // Compras
    'purchases:view', 'purchases:manage',
    // Impuestos
    'tax:config', 'tax:view', 'det:manage',
    // Reportes
    'reports:financial', 'reports:support',
    // Soporte
    'support:tickets', 'support:reset_password',
  ],

  ADMIN: [
    // Tenant admin
    'users:tenant_manage', 'tenant:config', 'billing:manage',
    // Contabilidad
    'accounting:manage', 'accounting:view', 'closing:manage', 'financial_statements:view',
    // Facturación
    'invoices:create', 'invoices:view', 'cai:manage',
    // Inventario
    'inventory:view', 'inventory:manage', 'inventory:movements',
    // Compras
    'purchases:view', 'purchases:manage',
    // Impuestos
    'tax:config', 'tax:view', 'det:manage',
    // Reportes
    'reports:financial',
    // Soporte
    'support:tickets', 'support:reset_password',
  ],

  MANAGER: [
    // Contabilidad
    'accounting:manage', 'accounting:view', 'closing:manage', 'financial_statements:view',
    // Facturación
    'invoices:create', 'invoices:view',
    // Inventario
    'inventory:view', 'inventory:manage', 'inventory:movements',
    // Compras
    'purchases:view', 'purchases:manage',
    // Impuestos
    'tax:config', 'tax:view', 'det:manage',
    // Reportes
    'reports:financial',
    // Soporte
    'support:tickets',
  ],

  ACCOUNTANT: [
    // Contabilidad
    'accounting:manage', 'accounting:view', 'closing:manage', 'financial_statements:view',
    // Facturación
    'invoices:create', 'invoices:view', 'cai:manage',
    // Impuestos
    'tax:config', 'tax:view', 'det:manage',
    // Reportes
    'reports:financial',
    // Ver todo
    'inventory:view', 'purchases:view',
    // Soporte
    'support:tickets',
  ],

  USER: [
    // Ver todo
    'accounting:view', 'financial_statements:view',
    'invoices:create', 'invoices:view',
    'inventory:view', 'inventory:movements',
    'purchases:view',
    'tax:view', 'det:manage',
    'reports:financial',
    'support:tickets',
  ],

  VIEWER: [
    // Solo lectura
    'accounting:view', 'financial_statements:view',
    'invoices:view',
    'inventory:view',
    'purchases:view',
    'tax:view',
    'reports:financial',
  ],
};

// Verificar si un rol tiene un permiso
export function hasPermission(role: Role | string | undefined, permission: Permission): boolean {
  if (!role) return false;
  const typedRole = role as Role;
  if (typedRole === 'SUPER_ADMIN') return true; // SUPER_ADMIN siempre tiene todo
  const permissions = ROLE_PERMISSIONS[typedRole];
  if (!permissions) return false;
  return permissions.includes(permission);
}

// Verificar si un rol tiene ALGUNO de los permisos
export function hasAnyPermission(role: Role | string | undefined, permissions: Permission[]): boolean {
  return permissions.some(p => hasPermission(role, p));
}

// Verificar si un rol tiene TODOS los permisos
export function hasAllPermissions(role: Role | string | undefined, permissions: Permission[]): boolean {
  return permissions.every(p => hasPermission(role, p));
}

// Obtener todos los permisos de un rol
export function getRolePermissions(role: Role | string | undefined): Permission[] {
  if (!role) return [];
  if (role === 'SUPER_ADMIN') {
    // Devolver todos los permisos únicos
    const allPerms = new Set<Permission>();
    Object.values(ROLE_PERMISSIONS).forEach(perms => perms.forEach(p => allPerms.add(p)));
    return Array.from(allPerms);
  }
  return ROLE_PERMISSIONS[role as Role] || [];
}

// Roles que pueden acceder a un módulo
export function canAccessModule(role: Role | string | undefined, module: string): boolean {
  if (!role) return false;
  if (role === 'SUPER_ADMIN') return true;

  const modulePermissions: Record<string, Permission[]> = {
    'accounting': ['accounting:manage', 'accounting:view'],
    'billing': ['invoices:create', 'invoices:view', 'cai:manage'],
    'inventory': ['inventory:view', 'inventory:manage', 'inventory:movements'],
    'purchases': ['purchases:view', 'purchases:manage'],
    'tax': ['tax:config', 'tax:view', 'det:manage'],
    'reports': ['reports:financial', 'reports:support'],
    'admin': ['users:tenant_manage', 'tenant:config', 'billing:manage'],
    'support': ['support:tickets', 'support:reset_password'],
    'closing': ['closing:manage'],
    'financial_statements': ['financial_statements:view'],
  };

  const perms = modulePermissions[module];
  if (!perms) return false;
  return hasAnyPermission(role, perms);
}

// Obtener el nivel de acceso del rol (para comparaciones)
export function getRoleLevel(role: Role | string | undefined): number {
  const levels: Record<string, number> = {
    SUPER_ADMIN: 100,
    SUPPORT: 80,
    ADMIN: 60,
    MANAGER: 50,
    ACCOUNTANT: 40,
    USER: 20,
    VIEWER: 10,
  };
  return levels[role || ''] || 0;
}

// Verificar si un rol puede gestionar otro rol
export function canManageRole(managerRole: Role | string | undefined, targetRole: Role | string): boolean {
  if (!managerRole) return false;
  if (managerRole === 'SUPER_ADMIN') return true;
  return getRoleLevel(managerRole) > getRoleLevel(targetRole);
}

// Todos los roles válidos
export const VALID_ROLES: Role[] = ['SUPER_ADMIN', 'SUPPORT', 'ADMIN', 'MANAGER', 'ACCOUNTANT', 'USER', 'VIEWER'];

// Labels de roles en español
export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: 'Super Administrador',
  SUPPORT: 'Soporte',
  ADMIN: 'Administrador',
  MANAGER: 'Gerente',
  ACCOUNTANT: 'Contador',
  USER: 'Usuario',
  VIEWER: 'Observador',
};

// Colores de roles para UI
export const ROLE_COLORS: Record<Role, string> = {
  SUPER_ADMIN: 'bg-purple-100 text-purple-800',
  SUPPORT: 'bg-yellow-100 text-yellow-800',
  ADMIN: 'bg-cyan-100 text-cyan-800',
  MANAGER: 'bg-green-100 text-green-800',
  ACCOUNTANT: 'bg-cyan-100 text-cyan-800',
  USER: 'bg-gray-100 text-gray-800',
  VIEWER: 'bg-slate-100 text-slate-800',
};
