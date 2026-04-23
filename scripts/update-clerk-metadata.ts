import { createClerkClient } from '@clerk/clerk-sdk-node';

// Inicializar cliente de Clerk
const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

async function updateClerkMetadata() {
  try {
    const email = 'sucachi.123@gmail.com';
    
    console.log('🔧 Actualizando metadatos en Clerk para el usuario...');
    console.log('Email:', email);
    
    // Buscar usuario en Clerk
    const users = await clerk.users.getUserList({
      emailAddress: [email],
      limit: 1
    });

    if (users.length === 0) {
      console.log('❌ Usuario no encontrado en Clerk');
      return;
    }

    const clerkUser = users[0];
    console.log('✅ Usuario encontrado en Clerk:');
    console.log('ID:', clerkUser.id);
    console.log('Email:', clerkUser.emailAddresses[0]?.emailAddress);
    console.log('Metadatos actuales:', clerkUser.publicMetadata);

    // Actualizar metadatos
    const updatedUser = await clerk.users.updateUser(clerkUser.id, {
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
    console.log('Nuevos metadatos:', updatedUser.publicMetadata);

  } catch (error: any) {
    console.error('❌ Error al actualizar metadatos:', error.message);
    if (error.response?.data) {
      console.error('Detalles del error:', error.response.data);
    }
  }
}

// Ejecutar la función
updateClerkMetadata();
