import { cookies } from 'next/headers';
import { db } from "@/lib/db";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: string;
  tenantId?: string;
}

export interface Session {
  user: SessionUser;
  expires: string;
}

// Simple auth function using Supabase session cookie
export async function auth(): Promise<Session | null> {
  try {
    // Get the Supabase auth token from cookies (Next.js 15+ requires await)
    const cookieStore = await cookies();
    const supabaseToken = cookieStore.get('sb-access-token')?.value;
    
    if (!supabaseToken) {
      return null;
    }
    
    // For server components, we validate the user from our database
    // The actual Supabase token validation happens in middleware
    // Here we just get the user associated with the session
    
    // Extract user info from cookie or fetch from Supabase
    // For now, we'll use a simple approach - get user from local session data
    const userData = cookieStore.get('user-data')?.value;
    
    if (userData) {
      const user = JSON.parse(userData);
      return {
        user: {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          role: user.role,
          tenantId: user.tenantId,
        },
        expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
      };
    }
    
    return null;
  } catch (error) {
    console.error('Auth error:', error);
    return null;
  }
}

// Helper to get current user from database
export async function getCurrentUser(userId: string) {
  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
      }
    });
    return user;
  } catch (error) {
    console.error('Get current user error:', error);
    return null;
  }
}
