import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('🧪 Probando inserción FINAL con columnas correctas...');
    
    const { supabase } = await import('@/lib/supabase-db');
    
    // Intentar crear tenant con las columnas CORRECTAS (con guiones bajos)
    const testTenant = {
      id: 'test-final-' + Date.now(),
      business_name: 'Test Tenant Final',
      business_rtn: 'test-rtn-final',
      business_email: 'test-final@example.com',
      business_address: 'Test Address Final',
      tenant_code: 'TESTCODEFINAL',
      subscription_plan: 'BASIC',
      max_users: 5,
      max_storage: 1000,
      max_transactions: 1000,
      monthly_cost: 0,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    console.log('📊 Datos a insertar (columnas correctas):', testTenant);
    
    const { data: insertResult, error: insertError } = await supabase
      .from('Tenant')
      .insert([testTenant])
      .select()
      .single();
    
    if (insertError) {
      console.error('❌ Error en inserción final:', insertError);
      return NextResponse.json({
        success: false,
        error: insertError,
        testData: testTenant,
        message: 'La inserción con columnas correctas todavía falla'
      });
    }
    
    console.log('✅ Inserción final exitosa:', insertResult);
    
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
      message: '✅ ¡INSERCIÓN FINAL EXITOSA! El onboarding ahora debería funcionar.',
      insertedTenant: insertResult,
      cleanupSuccess: !deleteError,
      nextSteps: [
        '1. Cierra sesión del usuario actual',
        '2. Inicia sesión con azuna22@outlook.com', 
        '3. Completa onboarding con "casa vieja"',
        '4. Verifica que el dashboard muestre "casa vieja"'
      ]
    });
    
  } catch (error) {
    console.error('❌ Error en prueba final:', error);
    return NextResponse.json({ 
      error: 'Error en prueba final', 
      details: error 
    }, { status: 500 });
  }
}
