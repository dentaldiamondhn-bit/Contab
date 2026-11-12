import { clerkGetUserList, clerkUpdateUser } from '../lib/clerk-api';

async function fixAdminTenant() {
  try {
    console.log('🔍 Buscando usuario admin...');
    
    const userList = await clerkGetUserList({ limit: 100 });
    const adminUser = userList.find(user => 
      user.email_addresses.some(e => e.email_address === 'sucachi.123@gmail.com')
    );
    
    if (!adminUser) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }
    
    const primaryEmail = adminUser.email_addresses.find(e => e.id === adminUser.primary_email_address_id);
    console.log('👤 Usuario admin encontrado:');
    console.log(`  ID: ${adminUser.id}`);
    console.log(`  Email: ${primaryEmail?.email_address}`);
    console.log(`  Tenant ID actual: ${adminUser.public_metadata?.tenantId || 'No asignado'}`);
    
    console.log('🔧 Actualizando tenantId a "angel-ring-123"...');
    
    await clerkUpdateUser(adminUser.id, {
      publicMetadata: {
        ...adminUser.public_metadata,
        tenantId: 'angel-ring-123',
        tenantCode: 'AR001'
      }
    });
    
    console.log('✅ TenantId actualizado exitosamente');
    
    const { clerkGetUser } = await import('../lib/clerk-api');
    const updatedUser = await clerkGetUser(adminUser.id);
    console.log('🔍 Verificación:');
    console.log(`  Nuevo Tenant ID: ${updatedUser.public_metadata?.tenantId}`);
    console.log(`  Nuevo Tenant Code: ${updatedUser.public_metadata?.tenantCode}`);
    
  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
  }
}

fixAdminTenant();
