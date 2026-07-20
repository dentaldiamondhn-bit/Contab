import { createBrowserClient } from '@supabase/ssr';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !key) {
  throw new Error(
    'Supabase env vars (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY) are not defined.'
  );
}

/**
 * Supabase client singleton.
 * Used by server-helper.ts (server-side) and multiple app pages (client-side).
 */
export const supabase = createBrowserClient(url, key);

/**
 * Reads the tenant id from localStorage - Client Component / Browser.
 */
export function getCurrentTenantFromClient(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const selectedTenant = localStorage.getItem('selected_tenant');
    if (selectedTenant) {
      const tenant = JSON.parse(selectedTenant);
      return tenant.id;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Reads the user id from localStorage - Client Component / Browser.
 */
export function getCurrentUserFromClient(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    const userSession = localStorage.getItem('supabase-auth-token');
    if (userSession) {
      const session = JSON.parse(userSession);
      return session.user?.id || null;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Helper for tenant-scoped inserts.
 */
export async function insertWithTenant<T = any>(
  table: string,
  data: Omit<T, 'tenantId'>
): Promise<T> {
  const tenantId = getCurrentTenantFromClient();
  if (!tenantId) throw new Error('No tenant selected');
  const { data: result, error } = await (supabase as any)
    .from(table)
    .insert({ ...data, tenantId })
    .select()
    .single();
  if (error) throw error;
  return result as T;
}

/**
 * Helper for tenant-scoped updates.
 */
export async function updateWithTenant<T = any>(
  table: string,
  id: string,
  data: Partial<T>
): Promise<T> {
  const tenantId = getCurrentTenantFromClient();
  if (!tenantId) throw new Error('No tenant selected');
  const { data: result, error } = await (supabase as any)
    .from(table)
    .update(data as any)
    .eq('id', id)
    .eq('tenantId', tenantId)
    .select()
    .single();
  if (error) throw error;
  return result as T;
}

/**
 * Helper for tenant-scoped deletes.
 */
export async function deleteWithTenant(table: string, id: string): Promise<boolean> {
  const tenantId = getCurrentTenantFromClient();
  if (!tenantId) throw new Error('No tenant selected');
  const { error } = await (supabase as any)
    .from(table)
    .delete()
    .eq('id', id)
    .eq('tenantId', tenantId);
  if (error) throw error;
  return true;
}

/**
 * Helper for tenant-scoped selects.
 */
export async function selectWithTenant<T = any>(
  table: string,
  options?: {
    columns?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
): Promise<T[]> {
  const tenantId = getCurrentTenantFromClient();
  if (!tenantId) throw new Error('No tenant selected');
  let query = (supabase as any).from(table).select(options?.columns || '*').eq('tenantId', tenantId);
  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]: [string, any]) => {
      query = (query as any).eq(key, value);
    });
  }
  if (options?.orderBy) {
    query = (query as any).order(options.orderBy.column, { ascending: options.orderBy.ascending ?? true });
  }
  if (options?.limit) query = (query as any).limit(options.limit);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as T[];
}
