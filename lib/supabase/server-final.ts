import { headers, cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';

/**
 * Helper interno para inicializar el cliente de Supabase en el servidor.
 */
async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Se puede ignorar en Server Components si no se están modificando cookies
          }
        },
      },
    }
  );
}

/**
 * Realiza un SELECT filtrando automáticamente por el tenantId obtenido de los headers.
 */
export async function selectWithTenant<T>(
  table: string,
  options?: {
    columns?: string;
    filters?: Record<string, any>;
    orderBy?: { column: string; ascending?: boolean };
    limit?: number;
  }
) {
  const headerList = await headers();
  const tenantId = headerList.get('x-tenant-id');

  // Log de depuración para verificar el Tenant ID en el servidor
  console.log(`🔍 [Supabase Server] Query en tabla '${table}' | x-tenant-id: ${tenantId || '❌ NO ENCONTRADO'}`);

  if (!tenantId) {
    return [] as T[];
  }

  const supabase = await createClient();
  let query = supabase.from(table).select(options?.columns || '*').eq('tenantId', tenantId);

  // Aplicar filtros adicionales dinámicos
  if (options?.filters) {
    Object.entries(options.filters).forEach(([key, value]) => {
      query = query.eq(key, value);
    });
  }

  // Aplicar límite
  if (options?.limit) {
    query = query.limit(options.limit);
  }

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, {
      ascending: options.orderBy.ascending ?? true,
    });
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as T[];
}

/**
 * Inserta un registro inyectando automáticamente el tenantId del contexto actual.
 */
export async function insertWithTenant<T>(table: string, data: any) {
  const headerList = await headers();
  const tenantId = headerList.get('x-tenant-id');
  if (!tenantId) throw new Error('Acceso denegado: No se identificó el tenant.');

  const supabase = await createClient();
  const { data: result, error } = await supabase
    .from(table)
    .insert({ ...data, tenantId } as any)
    .select()
    .single();

  if (error) throw error;
  return result as T;
}

/**
 * Actualiza un registro validando que pertenezca al tenant del usuario actual.
 */
export async function updateWithTenant<T>(table: string, id: string, data: any) {
  const headerList = await headers();
  const tenantId = headerList.get('x-tenant-id');
  if (!tenantId) throw new Error('Acceso denegado: No se identificó el tenant.');

  const supabase = await createClient();
  const { data: result, error } = await supabase
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
 * Elimina un registro validando que pertenezca al tenant del usuario actual.
 */
export async function deleteWithTenant(table: string, id: string) {
  const headerList = await headers();
  const tenantId = headerList.get('x-tenant-id');
  if (!tenantId) throw new Error('Acceso denegado: No se identificó el tenant.');

  const supabase = await createClient();
  const { error } = await supabase
    .from(table)
    .delete()
    .eq('id', id)
    .eq('tenantId', tenantId);

  if (error) throw error;
  return true;
}

/**
 * Realiza una consulta GLOBAL ignorando el filtrado por tenantId.
 * EXCLUSIVO para uso en rutas /admin protegidas.
 */
export async function selectGlobalServer<T>(
  table: string,
  options?: {
    columns?: string;
    limit?: number;
    orderBy?: { column: string; ascending?: boolean };
  }
) {
  const supabase = await createClient();
  let query = supabase.from(table).select(options?.columns || '*');

  if (options?.orderBy) {
    query = query.order(options.orderBy.column, { ascending: options.orderBy.ascending });
  }
  if (options?.limit) query = query.limit(options.limit);

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as T[];
}