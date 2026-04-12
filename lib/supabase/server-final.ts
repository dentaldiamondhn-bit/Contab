import { headers } from 'next/headers'
import { supabase, getCurrentTenantFromHeaders, getCurrentUserFromHeaders } from './standard-client'

// Helper para obtener headers de la solicitud actual
export async function getRequestHeaders(): Promise<Headers> {
  return await headers()
}

// Helper para obtener el tenant actual
export async function getCurrentTenant(): Promise<string | null> {
  const requestHeaders = await getRequestHeaders()
  return getCurrentTenantFromHeaders(requestHeaders)
}

// Helper para obtener el usuario actual
export async function getCurrentUser(): Promise<string | null> {
  const requestHeaders = await getRequestHeaders()
  return getCurrentUserFromHeaders(requestHeaders)
}

// Helper para select con tenant automático - Server Component
export async function selectWithTenant<T = any>(
  table: string,
  options?: {
    columns?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
) {
  const requestHeaders = await getRequestHeaders()
  const tenantId = getCurrentTenantFromHeaders(requestHeaders)
  
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

// Helper para insert con tenant automático - Server Component
export async function insertWithTenant<T = any>(
  table: string, 
  data: Omit<T, 'tenantId'>
) {
  const requestHeaders = await getRequestHeaders()
  const tenantId = getCurrentTenantFromHeaders(requestHeaders)
  
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
  data: Partial<T>
) {
  const requestHeaders = await getRequestHeaders()
  const tenantId = getCurrentTenantFromHeaders(requestHeaders)
  
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
  id: string
) {
  const requestHeaders = await getRequestHeaders()
  const tenantId = getCurrentTenantFromHeaders(requestHeaders)
  
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

// Helper para verificar permisos del usuario - Server Component
export async function checkUserPermission(permission: string): Promise<boolean> {
  const requestHeaders = await getRequestHeaders()
  const userId = getCurrentUserFromHeaders(requestHeaders)
  
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
