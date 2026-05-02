import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function POST(request: Request) {
  try {
    console.log('🔧 Iniciando reparación simple de tenants...');
    
    // Intentar leer ambas tablas para ver cuál funciona
    let workingTable = null;
    let tableData = [];
    
    // 1. Intentar con tabla 'Tenant'
    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from('Tenant')
        .select('*')
        .limit(10);
      
      if (!tenantError && tenantData) {
        workingTable = 'Tenant';
        tableData = tenantData;
        console.log('✅ Tabla Tenant funciona, encontrados:', tenantData.length, 'registros');
      }
    } catch (e) {
      console.log('❌ Tabla Tenant no funciona');
    }
    
    // 2. Si Tenant no funciona, intentar con 'tenants'
    if (!workingTable) {
      try {
        const { data: tenantsData, error: tenantsError } = await supabase
          .from('tenants')
          .select('*')
          .limit(10);
        
        if (!tenantsError && tenantsData) {
          workingTable = 'tenants';
          tableData = tenantsData;
          console.log('✅ Tabla tenants funciona, encontrados:', tenantsData.length, 'registros');
        }
      } catch (e) {
        console.log('❌ Tabla tenants no funciona');
      }
    }
    
    if (!workingTable) {
      return NextResponse.json({ 
        error: 'No se encontró ninguna tabla funcional de tenants',
        workingTable: null 
      }, { status: 500 });
    }
    
    // 3. Buscar el tenant "Angel Ring"
    const angelRing = tableData.find(t => 
      t.business_name === 'Angel Ring' || 
      t.businessName === 'Angel Ring'
    );
    
    if (angelRing) {
      console.log('🎯 Tenant Angel Ring encontrado:', angelRing.id);
      
      // 4. Eliminar Angel Ring
      const { error: deleteError } = await supabase
        .from(workingTable)
        .delete()
        .eq('id', angelRing.id);
      
      if (deleteError) {
        console.error('❌ Error eliminando Angel Ring:', deleteError);
        return NextResponse.json({ 
          error: 'Error eliminando Angel Ring', 
          details: deleteError,
          workingTable 
        }, { status: 500 });
      }
      
      console.log('✅ Angel Ring eliminado correctamente');
      
      return NextResponse.json({
        success: true,
        message: 'Tenant Angel Ring eliminado correctamente',
        workingTable,
        deletedTenant: angelRing,
        remainingCount: tableData.length - 1
      });
      
    } else {
      return NextResponse.json({
        success: true,
        message: 'Tenant Angel Ring no encontrado (ya eliminado)',
        workingTable,
        tenantsFound: tableData.length,
        tenantNames: tableData.map(t => t.business_name || t.businessName)
      });
    }
    
  } catch (error) {
    console.error('❌ Error en el proceso:', error);
    return NextResponse.json({ 
      error: 'Error en el proceso', 
      details: error 
    }, { status: 500 });
  }
}
