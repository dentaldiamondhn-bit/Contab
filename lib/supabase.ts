import { createClient, SupabaseClient } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DIRECTA (SIN PROXY) ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

// CREAR CLIENTE DIRECTO (sin el Proxy problemático)
export const supabaseDirect = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Alias para compatibilidad con código que usa supabaseAdmin
export const supabaseAdmin = supabaseDirect;

// Mantener el export 'supabase' para compatibilidad backwards, pero ya no es el principal
export const supabase = supabaseDirect;

// Ya no usamos el Proxy - las operaciones ahora usan supabaseDirect