import { createClient } from "@supabase/supabase-js";

// Service Role Client - Bypass RLS for administrative operations
export function createServiceRoleClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://kudsqsbxbmviesiaesct.supabase.co";
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c";
  
  console.log("🔍 DEBUG: Service role vars:", { 
    url: supabaseUrl ? "✅ Set" : "❌ Missing",
    key: supabaseServiceKey ? "✅ Set" : "❌ Missing",
    usingFallback: !process.env.SUPABASE_SERVICE_ROLE_KEY
  });
  
  if (!supabaseServiceKey) {
    console.error("❌ SUPABASE_SERVICE_ROLE_KEY missing - using fallback");
    throw new Error("SUPABASE_SERVICE_ROLE_KEY no está configurado en las variables de entorno");
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
