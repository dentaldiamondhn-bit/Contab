import { supabase as supabaseImport } from './standard-client'
import { cookies } from 'next/headers'

// Tipos para el contexto de tenant
interface TenantContext {
  currentTenant: {
    id: string;
    businessName: string;
    businessRTN?: string;
    industry?: string;
  } | null;
}

// Helper para obtener el tenant actual desde cookies - Server Component
export async function getCurrentTenantFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const selectedTenant = cookieStore.get('selected_tenant');
    if (selectedTenant?.value) {
      const tenant = JSON.parse(selectedTenant.value);
      return tenant.id;
    }
    return null;
  } catch (error) {
    console.error('Error getting tenant from cookies:', error);
    return null;
  }
}

// Helper para obtener el usuario actual desde cookies - Server Component
export async function getCurrentUserFromCookies(): Promise<string | null> {
  try {
    const cookieStore = await cookies();
    const userSession = cookieStore.get('supabase-auth-token');
    if (userSession?.value) {
      const session = JSON.parse(userSession.value);
      return session.user?.id || null;
    }
    return null;
  } catch (error) {
    console.error('Error getting user from cookies:', error);
    return null;
  }
}

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
  const supabaseClient = supabaseImport;

  // Wrapper para SELECT con filtering automático
  const originalFrom = supabaseClient.from.bind(supabaseClient);
  supabaseClient.from = function(table: string) {
    const query = originalFrom(table);
    
    // Solo aplicar filtering a tablas multi-tenant
    const multiTenantTables = [
      'User', 'Account', 'Contacto', 'Transaction', 'JournalEntry',
      'ConfigFiscal', 'CAI', 'Withholding', 'Reconciliation',
      'BookClosing', 'AuditLog', 'TaxConfig', 'ExchangeRate',
      'CurrencyHistory', 'CAIAlert', 'GlobalSettings'
    ];

    if (multiTenantTables.includes(table)) {
      const tenantId = getCurrentTenantFromClient();
      if (tenantId) {
        return (query as any).eq('tenantId', tenantId);
      }
    }

    return query;
  };

  return supabaseClient;
}

// Cliente por defecto
export const tenantSupabase = createTenantSupabaseClient();

// Helper para consultas manuales con tenant filtering - Server Component
export async function createTenantQuery(table: string) {
  const supabaseClient = supabaseImport;
  const tenantId = await getCurrentTenantFromCookies();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  return (supabaseImport as any).from(table).eq('tenantId', tenantId);
}

// Helper para insert con tenant automático - Server Component
export async function insertWithTenant<T = any>(
  table: string, 
  data: Omit<T, 'tenantId'>
) {
  const supabaseClient = supabaseImport;
  const tenantId = await getCurrentTenantFromCookies();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const dataWithTenant = { ...data, tenantId } as T;
  
  const { data: result, error } = await supabaseImport
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
  const supabaseLocal = supabaseImport;;
  const tenantId = await getCurrentTenantFromCookies();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const { data: result, error } = await supabaseImport
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
  const supabaseLocal = supabaseImport;;
  const tenantId = await getCurrentTenantFromCookies();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const { error } = await supabaseLocal
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
  }
) {
  const supabaseLocal = supabaseImport;;
  const tenantId = await getCurrentTenantFromCookies();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  let query = supabaseLocal
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
export async function checkUserPermission(permission: string): Promise<boolean> {
  const supabaseLocal = supabaseImport;;
  const userId = await getCurrentUserFromCookies();
  
  if (!userId) {
    return false;
  }

  try {
    const { data: user } = await supabaseLocal
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

// Client-side helpers para Components

// Helper para insert con tenant automático - Client Component
export async function insertWithTenantClient<T = any>(
  table: string, 
  data: Omit<T, 'tenantId'>
) {
  const supabase = createTenantSupabaseClient();
  const tenantId = getCurrentTenantFromClient();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const dataWithTenant = { ...data, tenantId } as T;
  
  const { data: result, error } = await supabaseImport
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

// Helper para update con tenant automático - Client Component
export async function updateWithTenantClient<T = any>(
  table: string,
  id: string,
  data: Partial<T>
) {
  const supabase = createTenantSupabaseClient();
  const tenantId = getCurrentTenantFromClient();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const { data: result, error } = await supabaseImport
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

// Helper para delete con tenant automático - Client Component
export async function deleteWithTenantClient(
  table: string,
  id: string
) {
  const supabase = createTenantSupabaseClient();
  const tenantId = getCurrentTenantFromClient();
  
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

// Helper para select con tenant automático - Client Component
export async function selectWithTenantClient<T = any>(
  table: string,
  options?: {
    columns?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
) {
  const supabase = createTenantSupabaseClient();
  const tenantId = getCurrentTenantFromClient();
  
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
