import { supabase } from './lib/supabase-db';

async function deleteAngelRingTenant() {
  console.log('🗑️ Iniciando eliminación del tenant "Angel Ring"...');
  
  try {
    // ID del tenant "Angel Ring"
    const tenantId = 'cmofey73w000087izrdfvtlve';
    
    console.log('📋 Tenant ID a eliminar:', tenantId);
    
    // 1. Eliminar usuarios asociados al tenant
    console.log('🔄 Eliminando usuarios...');
    const { error: usersError } = await supabase
      .from('User')
      .delete()
      .eq('tenantid', tenantId);
    
    if (usersError) {
      console.error('❌ Error eliminando usuarios:', usersError);
    } else {
      console.log('✅ Usuarios eliminados correctamente');
    }
    
    // 2. Eliminar cuentas bancarias de compañías
    console.log('🔄 Eliminando cuentas bancarias...');
    const { error: bankAccountsError } = await supabase
      .from('company_bank_accounts')
      .delete()
      .in('company_id', 
        supabase.from('companies').select('id').eq('tenant_id', tenantId)
      );
    
    if (bankAccountsError) {
      console.error('❌ Error eliminando cuentas bancarias:', bankAccountsError);
    } else {
      console.log('✅ Cuentas bancarias eliminadas correctamente');
    }
    
    // 3. Eliminar compañías asociadas al tenant
    console.log('🔄 Eliminando compañías...');
    const { error: companiesError } = await supabase
      .from('companies')
      .delete()
      .eq('tenant_id', tenantId);
    
    if (companiesError) {
      console.error('❌ Error eliminando compañías:', companiesError);
    } else {
      console.log('✅ Compañías eliminadas correctamente');
    }
    
    // 4. Eliminar el tenant
    console.log('🔄 Eliminando tenant...');
    const { error: tenantError } = await supabase
      .from('Tenant')
      .delete()
      .eq('id', tenantId);
    
    if (tenantError) {
      console.error('❌ Error eliminando tenant:', tenantError);
      throw tenantError;
    }
    
    console.log('✅ Tenant "Angel Ring" eliminado correctamente');
    
    // Verificación
    const { data: remainingTenants } = await supabase
      .from('Tenant')
      .select('id, business_name')
      .eq('business_name', 'Angel Ring');
    
    console.log('📊 Verificación - Tenants restantes con nombre "Angel Ring":', remainingTenants?.length || 0);
    
    if (remainingTenants && remainingTenants.length === 0) {
      console.log('🎉 ¡Eliminación completada exitosamente!');
    } else {
      console.log('⚠️ Quedaron tenants sin eliminar');
    }
    
  } catch (error) {
    console.error('❌ Error en el proceso de eliminación:', error);
    throw error;
  }
}

// Ejecutar el script
deleteAngelRingTenant()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Script falló:', error);
    process.exit(1);
  });
