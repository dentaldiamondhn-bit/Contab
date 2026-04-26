// Script para restaurar el tenantId del super admin
const { Clerk } = require('@clerk/clerk-sdk-node');

const clerk = new Clerk({
  secretKey: 'sk_test_UwGrJ3a12Pz71qmNBHchT02OWV6yc8HLV0Gb9Qg44L'
});

async function restoreAdminTenant() {
  try {
    console.log('🔍 Buscando usuario super admin...');
    
    // Buscar el usuario admin por email
    const userList = await clerk.users.getUserList();
    const adminUser = userList.find(user => 
      user.emailAddresses[0]?.emailAddress === 'sucachi.123@gmail.com'
    );
    
    if (!adminUser) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }
    
    console.log('👤 Usuario super admin encontrado:');
    console.log(`  ID: ${adminUser.id}`);
    console.log(`  Email: ${adminUser.emailAddresses[0]?.emailAddress}`);
    console.log(`  Tenant ID actual: ${adminUser.publicMetadata?.tenantId || 'No asignado'}`);
    
    // Restaurar el tenantId original del super admin
    console.log('🔧 Restaurando tenantId a "tenant_001" (super admin general)...');
    
    await clerk.users.updateUser(adminUser.id, {
      publicMetadata: {
        ...adminUser.publicMetadata,
        tenantId: 'tenant_001',
        tenantCode: 'DEMO001'
      }
    });
    
    console.log('✅ TenantId restaurado exitosamente');
    
    // Verificar la actualización
    const updatedUser = await clerk.users.getUser(adminUser.id);
    console.log('🔍 Verificación:');
    console.log(`  Tenant ID restaurado: ${updatedUser.publicMetadata?.tenantId}`);
    console.log(`  Tenant Code restaurado: ${updatedUser.publicMetadata?.tenantCode}`);
    
  } catch (error) {
    console.error('❌ Error al restaurar usuario:', error);
  }
}

restoreAdminTenant();
