// Cliente Supabase simplificado con filtering automático por tenant
// Compatible con Next.js 13+ App Router
import { createBrowserClient } from '@supabase/ssr';

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

// Cliente Supabase con filtering automático por tenant - Client Component
export function createTenantSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      'Las variables de entorno de Supabase no están definidas. Verifica tu archivo .env.local'
    );
  }

  return createBrowserClient(url, key);
}

// Cliente por defecto
export const tenantSupabase = createTenantSupabaseClient();

// Helper para insert con tenant automático - Client Component
export async function insertWithTenant<T = any>(
  table: string, 
  data: Omit<T, 'tenantId'>
) {
  const tenantId = getCurrentTenantFromClient();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const dataWithTenant = { ...data, tenantId } as T;
  
  const { data: result, error } = await tenantSupabase
    .from(table)
    .insert(dataWithTenant as any)
    .select()
    .single();

  if (error) {
    console.error(`Error inserting into ${table}:`, error);
    throw error;
  }

  return result;
}

// Helper para update con tenant automático - Client Component
export async function updateWithTenant<T = any>(
  table: string,
  id: string,
  data: Partial<T>
) {
  const tenantId = getCurrentTenantFromClient();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const { data: result, error } = await tenantSupabase
    .from(table)
    .update(data as any)
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

// Helper para delete con tenant automático - Client Component
export async function deleteWithTenant(
  table: string,
  id: string
) {
  const tenantId = getCurrentTenantFromClient();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const { error } = await tenantSupabase
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

// Helper para select con tenant automático - Client Component
export async function selectWithTenant<T = any>(
  table: string,
  options?: {
    columns?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
) {
  const tenantId = getCurrentTenantFromClient();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  let query = tenantSupabase
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

/**
 * Helper para consultas generales que NO requieren un tenantId previo.
 * Útil para cargar la lista inicial de empresas (tenants) disponibles para el usuario.
 */
export async function selectGlobal<T = any>(table: string, columns: string = '*', filters?: Record<string, any>) {
  let query = tenantSupabase.from(table).select(columns);

  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  const { data, error } = await query;

  if (error) {
    console.error(`Error in selectGlobal from ${table}:`, error);
    throw error;
  }
  return data as T[];
}

// Helper para verificar permisos del usuario - Client Component
export async function checkUserPermission(permission: string): Promise<boolean> {
  const userId = getCurrentUserFromClient();
  
  if (!userId) {
    return false;
  }

  try {
    const { data: user } = await tenantSupabase
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
