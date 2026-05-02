import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function POST(request: Request) {
  try {
    console.log('🧹 Iniciando limpieza completa...');
    
    const results = [];
    
    // 1. Eliminar todos los usuarios
    console.log('🗑️ Eliminando todos los usuarios...');
    const { error: usersError } = await supabase
      .from('User')
      .delete()
      .neq('id', 'fake-id'); // Eliminar todos
    
    if (usersError) {
      console.error('❌ Error eliminando usuarios:', usersError);
      results.push({ action: 'delete_users', status: 'error', error: usersError });
    } else {
      console.log('✅ Usuarios eliminados correctamente');
      results.push({ action: 'delete_users', status: 'success' });
    }
    
    // 2. Eliminar todos los tenants
    console.log('🗑️ Eliminando todos los tenants...');
    const { error: tenantsError } = await supabase
      .from('Tenant')
      .delete()
      .neq('id', 'fake-id'); // Eliminar todos
    
    if (tenantsError) {
      console.error('❌ Error eliminando tenants:', tenantsError);
      results.push({ action: 'delete_tenants', status: 'error', error: tenantsError });
    } else {
      console.log('✅ Tenants eliminados correctamente');
      results.push({ action: 'delete_tenants', status: 'success' });
    }
    
    // 3. Eliminar todas las compañías
    console.log('🗑️ Eliminando todas las compañías...');
    const { error: companiesError } = await supabase
      .from('companies')
      .delete()
      .neq('id', 'fake-id'); // Eliminar todos
    
    if (companiesError) {
      console.error('❌ Error eliminando compañías:', companiesError);
      results.push({ action: 'delete_companies', status: 'error', error: companiesError });
    } else {
      console.log('✅ Compañías eliminadas correctamente');
      results.push({ action: 'delete_companies', status: 'success' });
    }
    
    // 4. Verificación final
    console.log('🔍 Verificando limpieza...');
    
    const { data: remainingTenants, error: checkError } = await supabase
      .from('Tenant')
      .select('id, business_name');
    
    const { data: remainingUsers, error: usersCheckError } = await supabase
      .from('User')
      .select('id, email');
    
    const success = !checkError && !usersCheckError && 
                   (!remainingTenants || remainingTenants.length === 0) &&
                   (!remainingUsers || remainingUsers.length === 0);
    
    console.log('📊 Verificación final:', {
      tenantsRemaining: remainingTenants?.length || 0,
      usersRemaining: remainingUsers?.length || 0,
      success
    });
    
    return NextResponse.json({
      success,
      message: success ? 
        '✅ Limpieza completada exitosamente - Sistema listo para nuevo onboarding' :
        '⚠️ Limpieza parcial - Revisar errores',
      results,
      verification: {
        tenantsRemaining: remainingTenants?.length || 0,
        usersRemaining: remainingUsers?.length || 0,
        remainingTenants: remainingTenants || [],
        remainingUsers: remainingUsers || []
      }
    });
    
  } catch (error) {
    console.error('❌ Error en el proceso de limpieza:', error);
    return NextResponse.json({ 
      error: 'Error en el proceso de limpieza', 
      details: error 
    }, { status: 500 });
  }
}
