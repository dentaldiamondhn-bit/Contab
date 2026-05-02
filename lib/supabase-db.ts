import { createClient } from '@supabase/supabase-js';

// Configuración de Supabase
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente de Supabase para operaciones del servidor
export const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Función para configurar el contexto de tenant
export async function setTenantContext(tenantId: string) {
  try {
    // Configurar el tenant_id en el contexto de la sesión
    await supabase.rpc('set_config', {
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
    // Configurar contexto
    await setTenantContext(tenantId);
    
    // Obtener usuarios - RLS filtrará automáticamente por tenant
    const { data, error } = await supabase
      .from('User')
      .select('*')
      .eq('tenantid', tenantId);
    
    if (error) {
      console.error('❌ Error fetching users:', error);
      return [];
    }
    
    return data || [];
  } catch (error) {
    console.error('❌ Error in getTenantUsers:', error);
    return [];
  }
}

// Función para obtener tenants (solo para super admins)
export async function getAllTenants() {
  try {
    const { data, error } = await supabase
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
    // Configurar contexto
    await setTenantContext(userData.tenantId);
    
    const { data, error } = await supabase
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
    const { data, error } = await supabase
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
    const { error } = await supabase
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
