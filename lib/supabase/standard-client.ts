import { createClient } from '@supabase/supabase-js'

// Cliente Supabase estándar
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

// Helper para obtener el tenant actual desde localStorage - Client Component
export function getCurrentTenantFromClient(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const selectedTenant = localStorage.getItem('selected_tenant');
    if (selectedTenant) {
      const tenant = JSON.parse(selectedTenant);
      return tenant.id;
    }
    return null;
  } catch (error) {
    console.error('Error getting tenant from localStorage:', error);
    return null;
  }
}

// Helper para obtener el usuario actual desde localStorage - Client Component
export function getCurrentUserFromClient(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    
    const userSession = localStorage.getItem('supabase-auth-token');
    if (userSession) {
      const session = JSON.parse(userSession);
      return session.user?.id || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user from localStorage:', error);
    return null;
  }
}

// Helper para obtener el tenant actual desde headers - Server Component
export function getCurrentTenantFromHeaders(headers: Headers): string | null {
  try {
    const tenantId = headers.get('x-tenant-id');
    return tenantId || null;
  } catch (error) {
    console.error('Error getting tenant from headers:', error);
    return null;
  }
}

// Helper para obtener el usuario actual desde headers - Server Component
export function getCurrentUserFromHeaders(headers: Headers): string | null {
  try {
    const userId = headers.get('x-user-id');
    return userId || null;
  } catch (error) {
    console.error('Error getting user from headers:', error);
    return null;
  }
}

// Helper para insert con tenant automático - Server Component
export async function insertWithTenant<T = any>(
  table: string, 
  data: Omit<T, 'tenantId'>,
  headers?: Headers
) {
  const tenantId = headers ? getCurrentTenantFromHeaders(headers) : getCurrentTenantFromClient();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const dataWithTenant = { ...data, tenantId } as T;
  
  const { data: result, error } = await supabase
    .from(table)
    .insert(dataWithTenant)
    .select()
    .single();

  if (error) {
    console.error(`Error inserting into ${table}:`, error);
    throw error;
  }

  return result;
}

// Helper para update con tenant automático - Server Component
export async function updateWithTenant<T = any>(
  table: string,
  id: string,
  data: Partial<T>,
  headers?: Headers
) {
  const tenantId = headers ? getCurrentTenantFromHeaders(headers) : getCurrentTenantFromClient();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const { data: result, error } = await supabase
    .from(table)
    .update(data)
    .eq('id', id)
    .eq('tenantId', tenantId)
    .select()
    .single();

  if (error) {
    console.error(`Error updating ${table}:`, error);
    throw error;
  }

  return result;
}

// Helper para delete con tenant automático - Server Component
export async function deleteWithTenant(
  table: string,
  id: string,
  headers?: Headers
) {
  const tenantId = headers ? getCurrentTenantFromHeaders(headers) : getCurrentTenantFromClient();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('tenantId', tenantId);

  if (error) {
    console.error(`Error deleting from ${table}:`, error);
    throw error;
  }

  return true;
}

// Helper para select con tenant automático - Server Component
export async function selectWithTenant<T = any>(
  table: string,
  options?: {
    columns?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  },
  headers?: Headers
) {
  const tenantId = headers ? getCurrentTenantFromHeaders(headers) : getCurrentTenantFromClient();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  let query = supabase
    .from(table)
    .select(options?.columns || '*')
    .eq('tenantId', tenantId);

  // Aplicar filtros adicionales
  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  // Aplicar ordenamiento
  if (options?.orderBy) {
    query = query.order(options.orderBy.column, { 
      ascending: options.orderBy.ascending ?? true 
    });
  }

  // Aplicar límite
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error selecting from ${table}:`, error);
    throw error;
  }

  return data as T[];
}

// Helper para verificar permisos del usuario - Server Component
export async function checkUserPermission(
  permission: string,
  headers?: Headers
): Promise<boolean> {
  const userId = headers ? getCurrentUserFromHeaders(headers) : getCurrentUserFromClient();
  
  if (!userId) {
    return false;
  }

  try {
    const { data: user } = await supabase
      .from('User')
      .select('role')
      .eq('id', userId)
      .single();

    if (!user) return false;

    const permissions = {
      ADMIN: ['read', 'write', 'delete', 'manage_users', 'manage_tenants'],
      MANAGER: ['read', 'write', 'delete', 'manage_accounts'],
      USER: ['read', 'write'],
      VIEWER: ['read']
    };

    return permissions[user.role as keyof typeof permissions]?.includes(permission) || false;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
}
