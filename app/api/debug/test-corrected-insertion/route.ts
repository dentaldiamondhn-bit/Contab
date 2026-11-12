import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('🧪 Probando inserción con tenant_code corregido...');
    
    const { supabase } = await import('@/lib/supabase-db');
    
    // Función corregida para generar tenant code (máximo 10 caracteres)
    function generateTenantCode(businessName: string): string {
      const cleanName = businessName
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .substring(0, 6); // 6 caracteres del nombre
      
      const randomSuffix = Math.random().toString(36).substring(2, 4).toUpperCase(); // 2 caracteres aleatorios
      return `${cleanName}${randomSuffix}`; // Total: 8 caracteres (dentro del límite de 10)
    }
    
    // Intentar crear tenant con tenant_code corregido
    const testTenant = {
      id: 'test-corrected-' + Date.now(),
      business_name: 'Test Tenant Corrected',
      business_rtn: 'test-rtn-correct',
      business_email: 'test-corrected@example.com',
      business_address: 'Test Address Corrected',
      tenant_code: generateTenantCode('Test Tenant Corrected'), // Ahora será máximo 8 caracteres
      subscription_plan: 'BASIC',
      max_users: 5,
      max_storage: 1000,
      max_transactions: 1000,
      monthly_cost: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📊 Datos a insertar (tenant_code corregido):', testTenant);
    console.log('📏 Longitud del tenant_code:', testTenant.tenant_code.length);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('Tenant')
      .insert([testTenant])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error en inserción corregida:', insertError);
      return NextResponse.json({
        success: false,
        error: insertError,
        testData: testTenant,
        tenantCodeLength: testTenant.tenant_code.length,
        message: 'La inserción con tenant_code corregido falló'
      });
    }
    
    console.log('✅ Inserción corregida exitosa:', insertResult);
    
    // Limpiar el tenant de prueba
    const { error: deleteError } = await supabase
      .from('Tenant')
      .delete()
      .eq('id', insertResult.id);
    
    if (deleteError) {
      console.error('❌ Error limpiando tenant de prueba:', deleteError);
    } else {
      console.log('✅ Tenant de prueba eliminado');
    }
    
    return NextResponse.json({
      success: true,
      message: '✅ ¡INSERCIÓN CORREGIDA EXITOSA! El tenant_code ahora está dentro del límite.',
      insertedTenant: insertResult,
      tenantCodeLength: testTenant.tenant_code.length,
      cleanupSuccess: !deleteError,
      nextSteps: [
        '1. El generateTenantCode ahora genera códigos de 8 caracteres',
        '2. Cierra sesión del usuario actual',
        '3. Inicia sesión con azuna22@outlook.com', 
        '4. Completa onboarding con "casa vieja"',
        '5. Verifica que el dashboard muestre "casa vieja"'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error en prueba corregida:', error);
    return NextResponse.json({ 
      error: 'Error en prueba corregida', 
      details: error 
    }, { status: 500 });
  }
}
