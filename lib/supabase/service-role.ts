import { createClient } from "@supabase/supabase-js";

// Service Role Client - Bypass RLS for administrative operations
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseServiceKey) {
    throw new Error("Critical Security Error: SUPABASE_SERVICE_ROLE_KEY is not defined.");
  }
  
  if (!supabaseUrl) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL no está configurado en las variables de entorno");
  }
  
  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Helper para operaciones administrativas
export async function withServiceRole<T>(
  operation: (supabase: ReturnType<typeof createServiceRoleClient>) => Promise<T>
): Promise<T> {
  const supabase = createServiceRoleClient();
  return await operation(supabase);
}
