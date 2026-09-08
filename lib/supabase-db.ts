import { createClient, SupabaseClient } from '@supabase/supabase-js';

let _supabaseDb: SupabaseClient | null = null;

function getSupabaseDb(): SupabaseClient {
  if (!_supabaseDb) {
    const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl) throw new Error('SUPABASE_URL or NEXT_PUBLIC_SUPABASE_URL is required');
    if (!supabaseServiceKey) throw new Error('SUPABASE_SERVICE_ROLE_KEY is required');

    _supabaseDb = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });
  }
  return _supabaseDb;
}

// Legacy export for backward compatibility
export const supabase = new Proxy({} as SupabaseClient, {
  get(_, prop) {
    return (getSupabaseDb() as any)[prop]
  }
});

// Función para configurar el contexto de tenant
export async function setTenantContext(tenantId: string) {
  try {
    const client = getSupabaseDb();
    await client.rpc('set_config', {
      key: 'app.current_tenant_id',
      value: tenantId
    });
    console.log(`✅ Tenant context set to: ${tenantId}`);
  } catch (error) {
    console.error('❌ Error setting tenant context:', error);
  }
}

// Función para obtener usuarios del tenant actual
export async function getTenantUsers(tenantId: string) {
  try {
    console.log('🔍 Getting users for tenant:', tenantId);
    await setTenantContext(tenantId);
    const client = getSupabaseDb();

    const { data, error } = await client
      .from('User')
      .select('*')
      .eq('tenantid', tenantId);
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return [];
    }
    
    console.log('✅ Users fetched from DB:', data);
    console.log('📊 User count:', data?.length || 0);
    
    const transformedUsers = (data || []).map(user => ({
      id: user.id,
      email: user.email,
      firstName: user.firstname,
      lastName: user.lastname,
      role: user.role,
      isActive: user.isactive,
      createdAt: user.createdat,
      lastLogin: user.lastlogin
    }));
    
    console.log('✅ Transformed users:', transformedUsers);
    return transformedUsers;
  } catch (error) {
    console.error('❌ Error in getTenantUsers:', error);
    return [];
  }
}

// Función para obtener tenants (solo para super admins)
export async function getAllTenants() {
  try {
    const client = getSupabaseDb();
    const { data, error } = await client
      .from('Tenant')
      .select('*');
    
    if (error) {
      console.error('❌ Error fetching tenants:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Error in getAllTenants:', error);
    return [];
  }
}

// Función para crear usuario
export async function createTenantUser(userData: any) {
  try {
    await setTenantContext(userData.tenantId);
    const client = getSupabaseDb();

    const { data, error } = await client
      .from('User')
      .insert([{
        tenantid: userData.tenantId,
        email: userData.email,
        passwordhash: userData.passwordHash,
        firstname: userData.firstName,
        lastname: userData.lastName,
        role: userData.role,
        isactive: true,
        createdat: new Date().toISOString(),
        updatedat: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error creating user:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error in createTenantUser:', error);
    throw error;
  }
}

// Función para actualizar usuario
export async function updateTenantUser(userId: string, userData: any) {
  try {
    const client = getSupabaseDb();
    const { data, error } = await client
      .from('User')
      .update({
        firstname: userData.firstName,
        lastname: userData.lastName,
        role: userData.role,
        isactive: userData.isActive,
        updatedat: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();
    
    if (error) {
      console.error('❌ Error updating user:', error);
      throw error;
    }
    
    return data;
  } catch (error) {
    console.error('❌ Error in updateTenantUser:', error);
    throw error;
  }
}

// Función para eliminar usuario
export async function deleteTenantUser(userId: string) {
  try {
    const client = getSupabaseDb();
    const { error } = await client
      .from('User')
      .delete()
      .eq('id', userId);
    
    if (error) {
      console.error('❌ Error deleting user:', error);
      throw error;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error in deleteTenantUser:', error);
    throw error;
  }
}
