import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function POST(request: Request) {
  try {
    console.log('🗑️ Iniciando eliminación del tenant "Angel Ring"...');
    
    const { tenantId } = await request.json();
    
    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID is required' }, { status: 400 });
    }
    
    console.log('📋 Tenant ID a eliminar:', tenantId);
    
    // 1. Eliminar usuarios asociados al tenant
    console.log('🔄 Eliminando usuarios...');
    const { error: usersError } = await supabase
      .from('User')
      .delete()
      .eq('tenantid', tenantId);
    
    if (usersError) {
      console.error('❌ Error eliminando usuarios:', usersError);
      return NextResponse.json({ error: 'Error eliminando usuarios', details: usersError }, { status: 500 });
    }
    
    console.log('✅ Usuarios eliminados correctamente');
    
    // 2. Eliminar compañías asociadas al tenant
    console.log('🔄 Eliminando compañías...');
    const { error: companiesError } = await supabase
      .from('companies')
      .delete()
      .eq('tenant_id', tenantId);
    
    if (companiesError) {
      console.error('❌ Error eliminando compañías:', companiesError);
      return NextResponse.json({ error: 'Error eliminando compañías', details: companiesError }, { status: 500 });
    }
    
    console.log('✅ Compañías eliminadas correctamente');
    
    // 3. Eliminar el tenant
    console.log('🔄 Eliminando tenant...');
    const { error: tenantError } = await supabase
      .from('Tenant')
      .delete()
      .eq('id', tenantId);
    
    if (tenantError) {
      console.error('❌ Error eliminando tenant:', tenantError);
      return NextResponse.json({ error: 'Error eliminando tenant', details: tenantError }, { status: 500 });
    }
    
    console.log('✅ Tenant eliminado correctamente');
    
    // Verificación
    const { data: remainingTenants } = await supabase
      .from('Tenant')
      .select('id, business_name')
      .eq('id', tenantId);
    
    console.log('📊 Verificación - Tenants restantes:', remainingTenants?.length || 0);
    
    return NextResponse.json({ 
      success: true, 
      message: 'Tenant eliminado correctamente',
      remainingCount: remainingTenants?.length || 0
    });
    
  } catch (error) {
    console.error('❌ Error en el proceso de eliminación:', error);
    return NextResponse.json({ 
      error: 'Error en el proceso de eliminación', 
      details: error 
    }, { status: 500 });
  }
}
