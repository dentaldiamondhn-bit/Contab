import { supabase } from './standard-client'
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

// Helper para obtener el tenant actual desde cookies
async function getCurrentTenantFromCookies(): Promise<string | null> {
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

// Helper para obtener el usuario actual desde cookies
async function getCurrentUserFromCookies(): Promise<string | null> {
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

// Cliente Supabase con filtering automático por tenant
export async function createTenantSupabaseClient() {
  const supabaseClient = supabase;

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
      (async () => {
        const tenantId = await getCurrentTenantFromCookies();
        if (tenantId) {
          return (query as any).eq('tenantId', tenantId);
        }
      })();
    }

    return query;
  };

  return supabase;
}

// Cliente por defecto
export const tenantSupabase = (async () => await createTenantSupabaseClient())();

// Helper para crear query con tenant explícito
export async function createTenantQuery(table: string) {
  const supabaseClient = await createTenantSupabaseClient();
  const tenantId = await getCurrentTenantFromCookies();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  return (supabaseClient.from(table) as any).eq('tenantId', tenantId);
}

// Helper para insert con tenant automático
export async function insertWithTenant<T = any>(
  table: string, 
  data: Omit<T, 'tenantId'>
) {
  const supabaseClient = await createTenantSupabaseClient();
  const tenantId = await getCurrentTenantFromCookies();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const dataWithTenant = { ...data, tenantId } as T;
  
  const { data: result, error } = await supabaseClient
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

// Helper para update con tenant automático
export async function updateWithTenant<T = any>(
  table: string,
  id: string,
  data: Partial<T>
) {
  const supabaseClient = await createTenantSupabaseClient();
  const tenantId = await getCurrentTenantFromCookies();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const { data: result, error } = await supabaseClient
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

// Helper para delete con tenant automático
export async function deleteWithTenant(
  table: string,
  id: string
) {
  const supabaseClient = await createTenantSupabaseClient();
  const tenantId = await getCurrentTenantFromCookies();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  const { error } = await supabaseClient
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

// Helper para select con tenant automático
export async function selectWithTenant<T = any>(
  table: string,
  options?: {
    columns?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
) {
  const supabaseClient = await createTenantSupabaseClient();
  const tenantId = await getCurrentTenantFromCookies();
  
  if (!tenantId) {
    throw new Error('No tenant selected');
  }

  let query = supabaseClient
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

// Helper para verificar permisos del usuario
export async function checkUserPermission(permission: string): Promise<boolean> {
  const supabaseClient = await createTenantSupabaseClient();
  const userId = getCurrentUserFromCookies();
  
  if (!userId) {
    return false;
  }

  try {
    const { data: user } = await supabaseClient
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
