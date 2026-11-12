import { supabaseDirect } from "@/lib/supabase-db";

// Crear y exportar un cliente Supabase de uso server-side directo
// Usa supabaseDirect en lugar del Proxy problemático de server-lazy
export const getSupabaseDirect = () => supabaseDirect;