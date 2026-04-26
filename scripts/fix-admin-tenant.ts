// Script para corregir el tenantId del usuario admin
const { Clerk } = require('@clerk/clerk-sdk-node');

const clerk = new Clerk({
  secretKey: 'sk_test_UwGrJ3a12Pz71qmNBHchT02OWV6yc8HLV0Gb9Qg44L'
});

async function fixAdminTenant() {
  try {
    console.log('🔍 Buscando usuario admin...');
    
    // Buscar el usuario admin por email
    const userList = await clerk.users.getUserList();
    const adminUser = userList.find(user => 
      user.emailAddresses[0]?.emailAddress === 'sucachi.123@gmail.com'
    );
    
    if (!adminUser) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }
    
    console.log('👤 Usuario admin encontrado:');
    console.log(`  ID: ${adminUser.id}`);
    console.log(`  Email: ${adminUser.emailAddresses[0]?.emailAddress}`);
    console.log(`  Tenant ID actual: ${adminUser.publicMetadata?.tenantId || 'No asignado'}`);
    
    // Actualizar el tenantId del usuario admin
    console.log('🔧 Actualizando tenantId a "angel-ring-123"...');
    
    await clerk.users.updateUser(adminUser.id, {
      publicMetadata: {
        ...adminUser.publicMetadata,
        tenantId: 'angel-ring-123',
        tenantCode: 'AR001'
      }
    });
    
    console.log('✅ TenantId actualizado exitosamente');
    
    // Verificar la actualización
    const updatedUser = await clerk.users.getUser(adminUser.id);
    console.log('🔍 Verificación:');
    console.log(`  Nuevo Tenant ID: ${updatedUser.publicMetadata?.tenantId}`);
    console.log(`  Nuevo Tenant Code: ${updatedUser.publicMetadata?.tenantCode}`);
    
  } catch (error) {
    console.error('❌ Error al actualizar usuario:', error);
  }
}

fixAdminTenant();
