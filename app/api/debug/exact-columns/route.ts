import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('🔍 Verificando estructura EXACTA de columnas...');
    
    const { supabase } = await import('@/lib/supabase-db');
    
    // Intentar leer la información de la tabla directamente
    const results = {};
    
    // 1. Intentar describir la tabla Tenant
    try {
      // Método 1: Intentar leer información de columnas
      const { data: columnsInfo, error: columnsError } = await supabase
        .rpc('get_table_columns', { table_name: 'Tenant' });
      
      if (!columnsError && columnsInfo) {
        results.columns_method1 = columnsInfo;
      }
    } catch (e) {
      console.log('Método 1 falló:', e.message);
    }
    
    // 2. Intentar con información del esquema
    try {
      const { data: schemaInfo, error: schemaError } = await supabase
        .from('information_schema.columns')
        .select('column_name, data_type, character_maximum_length')
        .eq('table_name', 'Tenant')
        .eq('table_schema', 'public');
      
      if (!schemaError && schemaInfo) {
        results.columns_method2 = schemaInfo;
      }
    } catch (e) {
      console.log('Método 2 falló:', e.message);
    }
    
    // 3. Probar columnas individuales para saber cuáles existen
    const testColumns = [
      'business_name', 'businessname',
      'business_rtn', 'businessrtn',
      'business_email', 'businessemail',
      'business_address', 'businessaddress',
      'tenant_code', 'tenantcode',
      'subscription_plan', 'subscriptionplan',
      'max_users', 'maxusers',
      'max_storage', 'maxstorage',
      'max_transactions', 'maxtransactions',
      'monthly_cost', 'monthlycost',
      'is_active', 'isactive',
      'created_at', 'createdat',
      'updated_at', 'updatedat'
    ];
    
    results.column_tests = {};
    
    for (const column of testColumns) {
      try {
        const { data: testData, error: testError } = await supabase
          .from('Tenant')
          .select(column)
          .limit(1);
        
        results.column_tests[column] = {
          exists: !testError,
          error: testError?.message
        };
      } catch (e) {
        results.column_tests[column] = {
          exists: false,
          error: e.message
        };
      }
    }
    
    // 4. Determinar las columnas correctas
    const correctColumns = [];
    const columnMapping = {};
    
    for (const column of testColumns) {
      if (results.column_tests[column]?.exists) {
        correctColumns.push(column);
        
        // Crear mapeo para facilitar el uso
        if (column.includes('_')) {
          const camelCase = column.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
          columnMapping[camelCase] = column;
        } else {
          const snakeCase = column.replace(/([A-Z])/g, '_$1').toLowerCase();
          columnMapping[snakeCase] = column;
        }
      }
    }
    
    results.correct_columns = correctColumns;
    results.column_mapping = columnMapping;
    
    // 5. Crear el objeto de inserción correcto
    const insertObject = {
      id: 'test-exact-' + Date.now(),
      business_name: 'Test Tenant Exact',
      business_rtn: 'test-rtn-exact',
      business_email: 'test-exact@example.com',
      business_address: 'Test Address Exact',
      tenant_code: 'TESTEXACT',
      subscription_plan: 'BASIC',
      max_users: 5,
      max_storage: 1000,
      max_transactions: 1000,
      monthly_cost: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    // Filtrar solo las columnas que existen
    const filteredInsertObject = {};
    Object.keys(insertObject).forEach(key => {
      if (correctColumns.includes(key)) {
        filteredInsertObject[key] = insertObject[key];
      }
    });
    
    results.filtered_insert_object = filteredInsertObject;
    
    return NextResponse.json({
      success: true,
      message: 'Estructura exacta de columnas identificada',
      results
    });
    
  } catch (error) {
    console.error('❌ Error verificando columnas exactas:', error);
    return NextResponse.json({ 
      error: 'Error verificando columnas exactas', 
      details: error 
    }, { status: 500 });
  }
}
