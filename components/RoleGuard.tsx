import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { ReactNode } from 'react';

interface RoleGuardProps {
  /** The content to show if the user has the required role */
  children: ReactNode;
  /** Array of roles allowed to see the children (e.g., ['admin', 'manager']) */
  allowedRoles: string[];
  /** Optional component to show if access is denied */
  fallback?: ReactNode;
}

/**
 * A reusable Server Component to protect UI fragments based on user roles from profiles table.
 */
export default async function RoleGuard({ 
    children, 
    allowedRoles, 
    fallback = null 
  }: RoleGuardProps) {
    // Validate environment variables
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseAnonKey) {
      console.error('Missing Supabase environment variables');
      // Denegar acceso por seguridad si la configuración es incorrecta
      return <>{fallback}</>;
    }

    const cookieStore = await cookies();
    const supabase = createServerClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );
    
    // getUser() is used here for security to validate the user session on the server
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) {
      console.error('Error fetching user session:', error);
      // Denegar acceso si hay un error en la sesión por seguridad
      return <>{fallback}</>;
    }

    if (!user) {
      // No user signed in
      return <>{fallback}</>;
    }

    // Fetch user's role from the profiles table
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching user profile:', profileError);
      // If we can't fetch the profile, deny access for security
      return <>{fallback}</>;
    }

    const userRole = profile?.role as string | undefined;

    if (!userRole || !allowedRoles.includes(userRole)) {
      return <>{fallback}</>;
    }

    return <>{children}</>;
}
