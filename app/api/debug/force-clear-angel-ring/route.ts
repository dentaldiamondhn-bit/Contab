import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('🗑️ Forzando eliminación completa de Angel Ring...');
    
    const { supabase } = await import('@/lib/supabase-db');
    
    // 1. Buscar todos los tenants con "Angel Ring"
    const { data: angelRingTenants, error: searchError } = await supabase
      .from('Tenant')
      .select('*')
      .or('business_name.ilike.%Angel Ring%,businessname.ilike.%Angel Ring%');
    
    if (searchError) {
      console.error('❌ Error buscando Angel Ring:', searchError);
      return NextResponse.json({ error: 'Error buscando Angel Ring', details: searchError }, { status: 500 });
    }
    
    console.log('🎯 Tenants Angel Ring encontrados:', angelRingTenants?.length || 0);
    
    if (!angelRingTenants || angelRingTenants.length === 0) {
      return NextResponse.json({
        success: true,
        message: '✅ No se encontraron tenants Angel Ring - ya están eliminados',
        found: 0
      });
    }
    
    // 2. Eliminar todos los tenants Angel Ring
    const tenantIds = angelRingTenants.map(t => t.id);
    
    console.log('🗑️ Eliminando tenants:', tenantIds);
    
    const { error: deleteError } = await supabase
      .from('Tenant')
      .delete()
      .in('id', tenantIds);
    
    if (deleteError) {
      console.error('❌ Error eliminando Angel Ring:', deleteError);
      return NextResponse.json({ error: 'Error eliminando Angel Ring', details: deleteError }, { status: 500 });
    }
    
    // 3. Eliminar usuarios asociados
    const { error: usersDeleteError } = await supabase
      .from('User')
      .delete()
      .in('tenantid', tenantIds);
    
    if (usersDeleteError) {
      console.error('❌ Error eliminando usuarios asociados:', usersDeleteError);
    }
    
    // 4. Eliminar compañías asociadas
    const { error: companiesDeleteError } = await supabase
      .from('companies')
      .delete()
      .in('tenant_id', tenantIds);
    
    if (companiesDeleteError) {
      console.error('❌ Error eliminando compañías asociadas:', companiesDeleteError);
    }
    
    console.log('✅ Angel Ring eliminado completamente');
    
    // 5. Verificación final
    const { data: remainingTenants, error: verifyError } = await supabase
      .from('Tenant')
      .select('id, business_name, businessname');
    
    return NextResponse.json({
      success: true,
      message: '✅ Angel Ring eliminado completamente',
      deleted: angelRingTenants.length,
      deletedTenants: angelRingTenants,
      remainingTenants: remainingTenants || [],
      verification: {
        totalRemaining: remainingTenants?.length || 0,
        angelRingRemaining: remainingTenants?.filter(t => 
          t.business_name?.includes('Angel Ring') || t.businessname?.includes('Angel Ring')
        ).length || 0
      }
    });
    
  } catch (error) {
    console.error('❌ Error en eliminación forzada:', error);
    return NextResponse.json({ 
      error: 'Error en eliminación forzada', 
      details: error 
    }, { status: 500 });
  }
}
