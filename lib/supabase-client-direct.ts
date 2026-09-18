import { createClient, SupabaseClient } from '@supabase/supabase-js'

// Tipos para el cliente con RLS directo
export interface SupabaseClientDirect extends SupabaseClient {
  // Método para obtener el token de usuario JWT actual
  getJwtToken(): Promise<string | null>
}

// Crear cliente Supabase anónimo para operaciones normales
function getSupabaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required')
  return url
}

function getSupabaseAnonKey(): string {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required')
  return key
}

// Cliente Supabase estándar (para operaciones del lado del servidor)
export const supabase = createClient(getSupabaseUrl(), getSupabaseAnonKey())

// Cliente Supabase con RLS directo usando token de usuario JWT
// Este cliente se usa cuando las consultas deben pasar por la política RLS de PostgreSQL
export async function createSupabaseClientWithJwt(userToken: string): SupabaseClientDirect {
  const directSupabase = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    global: {
      headers: {
        Authorization: `Bearer ${userToken}`
      }
    },
    // Importante: No usar service_role key - queremos que RLS funcione
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  })
  
  // Añadir método para obtener el token
  ;(directSupabase as any).getJwtToken = async () => userToken
  
  return directSupabase
}

// Hook para obtener cliente Supabase con RLS directo en componentes del cliente
// Usa el token JWT del usuario autenticado para que RLS actúe en PostgreSQL
export function useSupabaseDirect() {
  const { data: { session } } = supabase.auth.getSession()
  
  return async <T>(query: () => Promise<T>): Promise<T> => {
    if (!session?.access_token) {
      throw new Error('No user session available')
    }
    
    const client = await createSupabaseClientWithJwt(session.access_token)
    return query()
  }
}

/**
 * Creates a Supabase JWT client from the Next.js request headers.
 * This is useful for API routes where we have access to the request object
 * and want to create a client with RLS enabled based on the authenticated user.
 * 
 * The function reads the x-user-jwt and x-tenant-id headers set by the middleware.
 */
export async function createSupabaseClientFromRequestHeaders(request: Request): Promise<SupabaseClientDirect | null> {
  try {
    const url = new URL(request.url)
    
    // Get JWT token from headers (set by middleware)
    const userToken = request.headers.get('x-user-jwt') || ''
    const tenantId = request.headers.get('x-tenant-id') || ''
    
    if (!userToken) {
      return null
    }
    
    const client = await createSupabaseClientWithJwt(userToken)
    
    // If we have a tenantId, we can set it as a comment or use it in queries
    // For now, the tenant isolation in RLS policies will handle it via JWT claims
    
    return client
  } catch (error) {
    console.error('Error creating Supabase client from request headers:', error)
    return null
  }
}

export default supabase