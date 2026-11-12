import { createClient, SupabaseClient, PostgrestError } from '@supabase/supabase-js';

// --- CONFIGURACIÓN DIRECTA SIN PROXY ---
// Usamos variables de entorno con valores por defecto seguros
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://kudsqsbxbmviesiaesct.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imt1ZHNxc2J4Ym12aWVzaWFlc2N0Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NDQ4NTI5MSwiZXhwIjoyMDkwMDYxMjkxfQ.BvHT1ClcshuGXZTVkTj3TZNcCWboOyUagutdmDXYd8c';

// CREAR CLIENTE DIRECTO - SIN PROBLEMAS DE SINTAXIS
// La sintaxis balanceada: createClient(url, key, { auth: { ... } })
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Exportar también supabaseDirect para compatibilidad con los endpoints API
export const supabaseDirect = supabase;

// Alias para compatibilidad
export const supabaseAdmin = supabaseDirect;

// Tipos para las funciones
interface TenantData {
  id: string;
  businessname: string;
  businessrtn: string;
  businessemail: string;
  businessaddress: string;
  tenant_code: string;
  country: string;
  phoneNumber?: string;
  logourl?: string;
  timezone: string;
  currency: string;
  subscriptionplan: string;
  maxusers: number;
  maxstorage: number;
  maxtransactions: number;
  monthlycost: number;
  modules?: string;
  isactive: boolean;
  createdat: string;
  updatedat: string;
}

interface UserData {
  id: string;
  email: string;
  auth_id?: string;
  first_name?: string;
  last_name?: string;
  role: string;
  is_active: boolean;
  tenant_id?: string;
  created_at: string;
  updated_at: string;
}

// Función para obtener todos los tenants
export async function getAllTenants(): Promise<{ data: TenantData[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('Tenant')
    .select('*')
    .order('createdat', { ascending: false });
  return { data, error };
}

// Función para obtener usuarios de un tenant
export async function getTenantUsers(tenantId: string): Promise<{ data: UserData[] | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('User')
    .select('*')
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false });
  return { data, error };
}

// Función para crear usuario en un tenant
export async function createTenantUser(tenantId: string, userData: Partial<UserData>): Promise<{ data: UserData | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('User')
    .insert([{ ...userData, tenant_id: tenantId }])
    .select()
    .single();
  return { data, error };
}

// Función para actualizar usuario
export async function updateTenantUser(userId: string, userData: Partial<UserData>): Promise<{ data: UserData | null; error: PostgrestError | null }> {
  const { data, error } = await supabase
    .from('User')
    .update(userData)
    .eq('id', userId)
    .select()
    .single();
  return { data, error };
}

// Función para eliminar usuario
export async function deleteTenantUser(userId: string): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase
    .from('User')
    .delete()
    .eq('id', userId);
  return { error };
}

// Función para configurar contexto de tenant (RLS)
export async function setTenantContext(tenantId: string): Promise<{ error: PostgrestError | null }> {
  const { error } = await supabase.rpc('set_tenant_context', { p_tenant_id: tenantId });
  return { error };
}