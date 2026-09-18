import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { NextRequest } from 'next/server'

// Type for the JWT claims structure
interface SupabaseJWTPayload {
  aud: string
  role: string
  iat: number
  exp: number
  [key: string]: any
}

/**
 * Creates a Supabase client authenticated with a user's JWT token.
 * This enables Row Level Security (RLS) to work properly in PostgreSQL,
 * as the JWT claims (including tenant_id) are sent with each request.
 *
 * @param jwtToken The JWT token from Clerk authentication
 * @returns A SupabaseClient instance with RLS-enabled access
 */
export function createSupabaseJWTClient(jwtToken: string): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      global: {
        headers: {
          Authorization: `Bearer ${jwtToken}`,
        },
      },
    }
  )
}

/**
 * Gets the current user's JWT token from the Next.js request.
 * This can be used to create a Supabase client with RLS enabled.
 */
export async function getJWTTokenFromRequest(request: NextRequest): Promise<string | null> {
  // Try to get the session from Clerk
  const authorization = request.headers.get('authorization') || ''

  // Check for Bearer token in authorization header
  if (authorization.startsWith('Bearer ')) {
    return authorization.substring(7)
  }

  // Try to get from cookies ( Clerk sets these)
  const clerkToken = request.cookies.get('clerk_jwt')
  if (clerkToken && clerkToken.value) {
    return clerkToken.value
  }

  // Try to get from local storage via headers (for SSR)
  // Clerk may also set this in a cookie
  return null
}

/**
 * Helper to create a Supabase JWT client from the current context.
 * Should be called within an API route or server component that has access to the request.
 */
export async function getSupabaseJWTClient(): Promise<SupabaseClient | null> {
  // In Next.js App Router, we can get the request from the event
  // For now, we'll try to get it from the environment and auth state

  // Check if we have a user session via Clerk
  try {
    const { auth } = await import('@clerk/nextjs/server')
    const { userId } = await auth()

    if (userId) {
      // Get the full user token - we need to use the clerk client
      const { clerkClient } = await import('@clerk/nextjs/server')
      const client = await clerkClient()
      const user = await client.users.getUser(userId)

      // Get the JWT token from Clerk
      const token = user.session?.jwtToken
      if (token) {
        return createSupabaseJWTClient(token)
      }
    }
  } catch (error) {
    console.error('Error getting JWT token for Supabase RLS:', error)
  }

  return null
}

/**
 * Middleware-style function to set up RLS-aware Supabase client.
 * Usage in API routes:
 *   import { getSupabaseJWTClient } from '@/lib/supabase-client-jwt'
 *   import { NextResponse } from 'next/server'
 *
 *   export async function POST(request: Request) {
 *     const supabase = await getSupabaseJWTClient()
 *     if (supabase) {
 *       const { data, error } = await supabase
 *         .from('transactions')
 *         .select('*')
 *         .eq('tenant_id', tenantId)
 *     }
 *     ...
 *   }
 */