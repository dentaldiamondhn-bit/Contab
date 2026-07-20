import { clerkClient } from '@clerk/nextjs/server';

const email = 'jainreyes8763@gmail.com';

async function setSupportRole() {
  try {
    const client = await clerkClient();
    
    // Buscar usuario por email
    const users = await client.users.getUserList({
      emailAddress: [email]
    });
    
    if (users.data.length === 0) {
      console.log('❌ Usuario no encontrado:', email);
      return;
    }
    
    const user = users.data[0];
    
    console.log('Usuario encontrado:', {
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
      currentRole: user.publicMetadata?.role
    });
    
    // Actualizar metadata
    await client.users.updateUser(user.id, {
      publicMetadata: {
        role: 'SUPPORT',
        permissions: ['support', 'view_all_tenants', 'reset_passwords'],
        isolation: {
          mode: 'support',
          tenantScope: 'all'
        }
      },
      privateMetadata: {
        supportAccess: true,
        supportLevel: 'full'
      }
    });
    
    console.log('✅ Rol SUPPORT asignado exitosamente a:', email);
    
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

setSupportRole();
