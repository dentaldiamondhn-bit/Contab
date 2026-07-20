import { supabase } from '../lib/supabase-db';

async function syncUserRoles() {
  try {
    console.log('🔄 Sincronizando roles de usuarios...');
    
    // Mapeo de emails a roles correctos
    const roleUpdates = [
      { email: 'jainreyes8763@gmail.com', role: 'SUPPORT' },
      { email: 'sucachi.123@gmail.com', role: 'SUPER_ADMIN' }
    ];

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
      } else {
        console.log(`✅ ${email} actualizado a ${role}:`, data);
      }
    }

    console.log('🎉 Sincronización completada');
    
  } catch (error) {
    console.error('❌ Error en sincronización:', error);
  }
}

syncUserRoles();
