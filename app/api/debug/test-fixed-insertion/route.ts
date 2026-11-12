import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    console.log('🧪 Probando inserción con columnas corregidas...');
    
    const { supabase } = await import('@/lib/supabase-db');
    
    // Intentar crear tenant con columnas correctas (sin guiones bajos)
    const testTenant = {
      id: 'test-fixed-' + Date.now(),
      businessname: 'Test Tenant Fixed',
      businessrtn: 'test-rtn-fixed',
      businessemail: 'test-fixed@example.com',
      businessaddress: 'Test Address Fixed',
      tenantcode: 'TESTCODEFIX',
      subscriptionplan: 'BASIC',
      maxusers: 5,
      maxstorage: 1000,
      maxtransactions: 1000,
      monthlycost: 0,
      isactive: true,
      createdat: new Date().toISOString(),
      updatedat: new Date().toISOString()
    };
    
    console.log('📊 Datos a insertar:', testTenant);
    
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
        testData: testTenant
      }, { status: 500 });
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
      message: '✅ Inserción con columnas corregidas funciona correctamente',
      insertedTenant: insertResult,
      cleanupSuccess: !deleteError
    });
    
  } catch (error) {
    console.error('❌ Error en prueba de inserción:', error);
    return NextResponse.json({ 
      error: 'Error en prueba de inserción', 
      details: error 
    }, { status: 500 });
  }
}
