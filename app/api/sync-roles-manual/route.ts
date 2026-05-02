import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Crear cliente Supabase directamente
const supabaseUrl = 'https://your-project.supabase.co'; // Reemplaza con tu URL real
const supabaseKey = 'your-anon-key'; // Reemplaza con tu key real

const supabase = createClient(supabaseUrl, supabaseKey);

export async function POST() {
  try {
    console.log('🔄 Sincronizando roles de usuarios...');
    
    // Mapeo de emails a roles correctos
    const roleUpdates = [
      { email: 'jainreyes8763@gmail.com', role: 'SUPPORT' },
      { email: 'sucachi.123@gmail.com', role: 'SUPER_ADMIN' }
    ];

    const results = [];

    for (const { email, role } of roleUpdates) {
      console.log(`📝 Actualizando ${email} a rol: ${role}`);
      
      // Actualizar en Supabase
      const { data, error } = await supabase
        .from('User')
        .update({ 
          role: role,
          updatedat: new Date().toISOString()
        })
        .eq('email', email)
        .select();

      if (error) {
        console.error(`❌ Error actualizando ${email}:`, error);
        results.push({ email, success: false, error: error.message });
      } else {
        console.log(`✅ ${email} actualizado a ${role}:`, data);
        results.push({ email, success: true, data });
      }
    }

    console.log('🎉 Sincronización completada');
    
    return NextResponse.json({
      success: true,
      message: 'Roles sincronizados exitosamente',
      results
    });
    
  } catch (error: any) {
    console.error('❌ Error en sincronización:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
