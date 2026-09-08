import { clerkGetUserList, clerkUpdateUser } from '../lib/clerk-api';

async function updateClerkMetadata() {
  try {
    const email = 'sucachi.123@gmail.com';
    
    console.log('🔧 Actualizando metadatos en Clerk para el usuario...');
    console.log('Email:', email);
    
    const users = await clerkGetUserList({ email_address: [email] });

    if (users.length === 0) {
      console.log('❌ Usuario no encontrado en Clerk');
      return;
    }

    const clerkUser = users[0];
    console.log('✅ Usuario encontrado en Clerk:');
    console.log('ID:', clerkUser.id);
    console.log('Metadatos actuales:', clerkUser.public_metadata);

    const updatedUser = await clerkUpdateUser(clerkUser.id, {
      publicMetadata: {
        role: 'SUPER_ADMIN',
        tenantId: 'tenant_001',
        tenantCode: 'DEMO001',
        permissions: [
          'system:admin',
          'users:manage',
          'tenants:manage',
          'audit:view',
          'reports:all',
          'tenant:*:access'
        ],
        isolation: {
          tenantScope: false,
          crossTenantAccess: true,
          dataVisibility: 'all_tenants'
        }
      }
    });

    console.log('✅ Metadatos actualizados exitosamente:');
    console.log('Nuevos metadatos:', updatedUser.public_metadata);

  } catch (error: any) {
    console.error('❌ Error al actualizar metadatos:', error.message);
  }
}

updateClerkMetadata();
