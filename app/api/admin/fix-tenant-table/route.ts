import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-db';

export async function POST(request: Request) {
  try {
    console.log('🔧 Iniciando reparación de tablas de tenants...');
    
    // 1. Verificar qué tablas existen usando RPC
    let hasTenant = false;
    let hasTenants = false;
    
    try {
      // Intentar leer de Tenant
      const { data: tenantData, error: tenantError } = await supabase
        .from('Tenant')
        .select('id')
        .limit(1);
      
      if (!tenantError) {
        hasTenant = true;
        console.log('✅ Tabla Tenant existe');
      }
    } catch (e) {
      console.log('❌ Tabla Tenant no existe o no es accesible');
    }
    
    try {
      // Intentar leer de tenants
      const { data: tenantsData, error: tenantsError } = await supabase
        .from('tenants')
        .select('id')
        .limit(1);
      
      if (!tenantsError) {
        hasTenants = true;
        console.log('✅ Tabla tenants existe');
      }
    } catch (e) {
      console.log('❌ Tabla tenants no existe o no es accesible');
    }
    
    console.log('📋 Estado de tablas:', { hasTenant, hasTenants });
    
    let results = [];
    
    // 2. Si ambas tablas existen, migrar datos
    if (hasTenants && hasTenant) {
      console.log('🔄 Migrando datos de tenants a Tenant...');
      
      // Obtener datos de la tabla antigua
      const { data: oldTenants, error: oldError } = await supabase
        .from('tenants')
        .select('*');
      
      if (oldError) {
        console.error('❌ Error leyendo tabla tenants:', oldError);
        return NextResponse.json({ error: 'Error leyendo tabla tenants', details: oldError }, { status: 500 });
      }
      
      console.log(`📊 Encontrados ${oldTenants?.length || 0} registros en 'tenants'`);
      
      // Migrar datos que no existen en la nueva tabla
      for (const tenant of oldTenants || []) {
        const { error: insertError } = await supabase
          .from('Tenant')
          .upsert(tenant, { onConflict: 'id' });
        
        if (insertError) {
          console.error(`❌ Error insertando tenant ${tenant.id}:`, insertError);
          results.push({ tenant: tenant.id, status: 'error', error: insertError });
        } else {
          console.log(`✅ Tenant ${tenant.id} migrado correctamente`);
          results.push({ tenant: tenant.id, status: 'migrated' });
        }
      }
      
      // 3. No eliminar tabla antigua automáticamente (requiere permisos especiales)
      console.log('⚠️ Tabla antigua tenants no eliminada automáticamente (requiere permisos de admin)');
      console.log('📝 Para eliminar manualmente: DROP TABLE tenants;');
      results.push({ action: 'migration_complete', note: 'Tabla antigua requiere eliminación manual' });
      
    } else if (hasTenants && !hasTenant) {
      console.log('🔄 Solo existe tabla tenants, creando vista Tenant...');
      
      // Crear vista Tenant que apunte a tenants
      const { error: viewError } = await supabase.rpc('exec_sql', {
        sql: 'CREATE VIEW IF NOT EXISTS "Tenant" AS SELECT * FROM tenants;'
      });
      
      if (viewError) {
        console.error('❌ Error creando vista Tenant:', viewError);
        // Si no se puede crear vista, simplemente trabajaremos con la tabla tenants
        console.log('⚠️ Trabajando directamente con tabla tenants');
        results.push({ action: 'using_tenants_directly', table: 'tenants' });
      } else {
        console.log('✅ Vista Tenant creada correctamente');
        results.push({ action: 'view_created', from: 'tenants', to: 'Tenant' });
      }
      
    } else {
      console.log('✅ Solo existe tabla Tenant, no hay conflicto');
      results.push({ action: 'no_conflict', table: 'Tenant' });
    }
    
    // 4. Verificación final
    const { data: finalCheck, error: checkError } = await supabase
      .from('Tenant')
      .select('id, business_name, is_active');
    
    if (checkError) {
      console.error('❌ Error en verificación final:', checkError);
      return NextResponse.json({ error: 'Error en verificación final', details: checkError }, { status: 500 });
    }
    
    console.log(`📊 Verificación final: ${finalCheck?.length || 0} tenants en la tabla Tenant`);
    
    return NextResponse.json({
      success: true,
      message: 'Tablas de tenants unificadas correctamente',
      results,
      finalCount: finalCheck?.length || 0,
      tenants: finalCheck?.map(t => ({ id: t.id, name: t.business_name, active: t.is_active }))
    });
    
  } catch (error) {
    console.error('❌ Error en el proceso de reparación:', error);
    return NextResponse.json({ 
      error: 'Error en el proceso de reparación', 
      details: error 
    }, { status: 500 });
  }
}
