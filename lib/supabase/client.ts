import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Singleton instance to prevent multiple clients
let supabaseInstance: ReturnType<typeof createClient> | null = null;

// Cliente Supabase para Client Components
export function createSupabaseClient() {
  if (!supabaseInstance) {
    supabaseInstance = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }
  return supabaseInstance;
}

// Cliente por defecto (singleton)
export const supabase = createSupabaseClient();

// Helper para consultas con tenant explícito
export function createTenantQuery(table: string, tenantId: string) {
  return (supabase as any).from(table).eq('tenantId', tenantId);
}

// Helper para insert con tenant explícito
export async function insertWithTenant<T = any>(
  table: string, 
  tenantId: string,
  data: Omit<T, 'tenantId'>
) {
  const dataWithTenant = { ...data, tenantId } as T;
  
  const { data: result, error } = await (supabase as any)
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

// Helper para select con tenant explícito
export async function selectWithTenant<T = any>(
  table: string,
  tenantId: string,
  options?: {
    columns?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
) {
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

// Helper para update con tenant explícito
export async function updateWithTenant<T = any>(
  table: string,
  tenantId: string,
  id: string,
  data: Partial<T>
) {
  const { data: result, error } = await (supabase as any)
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

// Helper para delete con tenant explícito
export async function deleteWithTenant(
  table: string,
  tenantId: string,
  id: string
) {
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
