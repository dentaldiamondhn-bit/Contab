import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('🔍 Verificando estructura exacta de la tabla Tenant...');
    
    const { supabase } = await import('@/lib/supabase-db');
    
    const results = {};
    
    // 1. Intentar leer todas las columnas posibles
    console.log('📋 Intentando leer datos de Tenant...');
    
    try {
      const { data: tenantData, error: tenantError } = await supabase
        .from('Tenant')
        .select('*')
        .limit(1);
      
      if (!tenantError && tenantData && tenantData.length > 0) {
        console.log('✅ Datos encontrados:', Object.keys(tenantData[0]));
        results.actual_columns = Object.keys(tenantData[0]);
        results.sample_data = tenantData[0];
      } else if (tenantError) {
        console.log('❌ Error leyendo Tenant:', tenantError);
        results.read_error = tenantError;
      } else {
        console.log('📭 No hay datos en Tenant');
        results.no_data = true;
      }
    } catch (e) {
      console.log('❌ Error general:', e);
      results.general_error = e.message;
    }
    
    // 2. Intentar con diferentes combinaciones de columnas comunes
    const columnVariations = [
      // Con guiones bajos (formato estándar SQL)
      ['id', 'business_name', 'business_rtn', 'business_email', 'business_address', 'tenant_code', 'subscription_plan', 'max_users', 'max_storage', 'max_transactions', 'monthly_cost', 'is_active', 'created_at', 'updated_at'],
      
      // Sin guiones bajos (formato camelCase)
      ['id', 'businessname', 'businessrtn', 'businessemail', 'businessaddress', 'tenantcode', 'subscriptionplan', 'maxusers', 'maxstorage', 'maxtransactions', 'monthlycost', 'isactive', 'createdat', 'updatedat'],
      
      // Mixto (algunas columnas con guiones, otras sin)
      ['id', 'business_name', 'businessrtn', 'business_email', 'businessaddress', 'tenant_code', 'subscription_plan', 'maxusers', 'max_storage', 'maxtransactions', 'monthly_cost', 'is_active', 'created_at', 'updatedat'],
      
      // Columnas mínimas esenciales
      ['id', 'business_name', 'business_email'],
      ['id', 'businessname', 'businessemail']
    ];
    
    results.column_tests = {};
    
    for (let i = 0; i < columnVariations.length; i++) {
      const columns = columnVariations[i];
      const testName = `test_${i + 1}`;
      
      try {
        console.log(`🧪 Probando columnas: ${columns.join(', ')}`);
        
        const { data: testData, error: testError } = await supabase
          .from('Tenant')
          .select(columns.join(', '))
          .limit(1);
        
        if (!testError) {
          console.log(`✅ Test ${testName} exitoso`);
          results.column_tests[testName] = {
            success: true,
            columns: columns,
            data: testData
          };
        } else {
          console.log(`❌ Test ${testName} falló:`, testError.message);
          results.column_tests[testName] = {
            success: false,
            columns: columns,
            error: testError.message
          };
        }
      } catch (e) {
        console.log(`❌ Test ${testName} error:`, e.message);
        results.column_tests[testName] = {
          success: false,
          columns: columns,
          error: e.message
        };
      }
    }
    
    // 3. Encontrar la combinación exitosa
    const successfulTest = Object.entries(results.column_tests).find(([key, test]) => test.success);
    
    if (successfulTest) {
      const [testName, testResult] = successfulTest;
      results.recommended_columns = testResult.columns;
      results.success_test = testName;
    } else {
      results.recommended_columns = null;
      results.success_test = null;
    }
    
    return NextResponse.json({
      success: true,
      message: successfulTest ? 'Estructura de tabla identificada' : 'No se pudo identificar la estructura',
      results
    });
    
  } catch (error) {
    console.error('❌ Error verificando estructura:', error);
    return NextResponse.json({ 
      error: 'Error verificando estructura', 
      details: error 
    }, { status: 500 });
  }
}
