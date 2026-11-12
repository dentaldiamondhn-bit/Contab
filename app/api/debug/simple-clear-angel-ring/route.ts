import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('🗑️ Iniciando eliminación simple de Angel Ring...');
    
    const { supabase } = await import('@/lib/supabase-db');
    
    // 1. Buscar tenants con "Angel Ring" en business_name
    const { data: tenants, error: searchError } = await supabase
      .from('Tenant')
      .select('*')
      .ilike('business_name', '%Angel Ring%');
    
    if (searchError) {
      console.error('❌ Error buscando tenants:', searchError);
      return NextResponse.json({ 
        success: false, 
        error: 'Error buscando tenants', 
        details: searchError 
      }, { status: 500 });
    }
    
    console.log('🎯 Tenants encontrados:', tenants?.length || 0);
    
    if (!tenants || tenants.length === 0) {
      return NextResponse.json({
        success: true,
        message: '✅ No se encontraron tenants Angel Ring',
        found: 0,
        deleted: 0
      });
    }
    
    // 2. Eliminar los tenants encontrados
    const tenantIds = tenants.map(t => t.id);
    
    const { error: deleteError } = await supabase
      .from('Tenant')
      .delete()
      .in('id', tenantIds);
    
    if (deleteError) {
      console.error('❌ Error eliminando tenants:', deleteError);
      return NextResponse.json({ 
        success: false, 
        error: 'Error eliminando tenants', 
        details: deleteError 
      }, { status: 500 });
    }
    
    console.log('✅ Tenants eliminados:', tenantIds.length);
    
    // 3. Verificación simple
    const { data: remaining, error: verifyError } = await supabase
      .from('Tenant')
      .select('id, business_name')
      .ilike('business_name', '%Angel Ring%');
    
    const remainingCount = remaining?.length || 0;
    
    return NextResponse.json({
      success: true,
      message: remainingCount === 0 ? 
        '✅ Angel Ring eliminado completamente' : 
        '⚠️ Angel Ring eliminado parcialmente',
      found: tenants.length,
      deleted: tenantIds.length,
      remaining: remainingCount,
      deletedTenants: tenants,
      remainingTenants: remaining || []
    });
    
  } catch (error) {
    console.error('❌ Error en eliminación simple:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error en eliminación simple', 
      details: error?.message || error 
    }, { status: 500 });
  }
}
