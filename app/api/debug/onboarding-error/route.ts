import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('🔍 Debug - Verificando estado actual del sistema...');
    
    // Importar supabase para verificar
    const { supabase } = await import('@/lib/supabase-db');
    
    const debug: {
      timestamp: string;
      checks: Record<string, any>;
    } = {
      timestamp: new Date().toISOString(),
      checks: {}
    };
    
    // 1. Verificar conexión a Supabase
    try {
      const { data: connectionTest, error: connectionError } = await supabase
        .from('Tenant')
        .select('count')
        .limit(1);
      
      debug.checks.supabase_connection = {
        success: !connectionError,
        error: connectionError,
        data: connectionTest
      };
    } catch (e) {
      debug.checks.supabase_connection = {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }
    
    // 2. Verificar tabla Tenant
    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from('Tenant')
        .select('*')
        .limit(5);
      
      debug.checks.tenant_table = {
        success: !tenantError,
        error: tenantError,
        count: tenantData?.length || 0,
        data: tenantData
      };
    } catch (e) {
      debug.checks.tenant_table = {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }
    
    // 3. Verificar tabla User
    try {
      const { data: userData, error: userError } = await supabase
        .from('User')
        .select('*')
        .limit(5);
      
      debug.checks.user_table = {
        success: !userError,
        error: userError,
        count: userData?.length || 0,
        data: userData
      };
    } catch (e) {
      debug.checks.user_table = {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }
    
    // 4. Intentar crear un tenant de prueba
    try {
      const testTenant = {
        id: 'test-' + Date.now(),
        business_name: 'Test Tenant',
        business_rtn: 'test-rtn',
        business_email: 'test@example.com',
        business_address: 'Test Address',
        tenant_code: 'TESTCODE',
        subscription_plan: 'BASIC',
        max_users: 5,
        max_storage: 1000,
        max_transactions: 1000,
        monthly_cost: 0,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      const { data: insertResult, error: insertError } = await supabase
        .from('Tenant')
        .insert([testTenant])
        .select()
        .single();
      
      debug.checks.insert_test = {
        success: !insertError,
        error: insertError,
        data: insertResult
      };
      
      // Si tuvo éxito, eliminar el tenant de prueba
      if (!insertError && insertResult) {
        await supabase
          .from('Tenant')
          .delete()
          .eq('id', insertResult.id);
        
        debug.checks.insert_test.cleanup = 'success';
      }
      
    } catch (e) {
      debug.checks.insert_test = {
        success: false,
        error: e instanceof Error ? e.message : String(e)
      };
    }
    
    // 5. Verificar variables de entorno
    debug.checks.environment = {
      supabase_url: process.env.SUPABASE_URL ? 'configured' : 'missing',
      supabase_key: process.env.SUPABASE_SERVICE_ROLE_KEY ? 'configured' : 'missing',
      node_env: process.env.NODE_ENV
    };
    
    // 6. Verificar permisos de la tabla
    try {
      const { data: schemaInfo, error: schemaError } = await supabase
        .rpc('get_table_info', { table_name: 'Tenant' });
      
      debug.checks.table_permissions = {
        success: !schemaError,
        error: schemaError,
        data: schemaInfo
      };
    } catch (e) {
      debug.checks.table_permissions = {
        success: false,
        error: e instanceof Error ? e.message : String(e),
        note: 'RPC function may not exist'
      };
    }
    
    return NextResponse.json({
      success: true,
      message: 'Debug completado',
      debug
    });
    
  } catch (error) {
    console.error('❌ Error en debug:', error);
    return NextResponse.json({ 
      error: 'Error en debug', 
      details: error 
    }, { status: 500 });
  }
}
