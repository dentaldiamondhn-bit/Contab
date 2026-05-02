// Script para verificar y asignar rol de super admin
const { Clerk } = require('@clerk/clerk-sdk-node');

const clerk = new Clerk({
  secretKey: 'sk_test_UwGrJ3a12Pz71qmNBHchT02OWV6yc8HLV0Gb9Qg44L'
});

async function checkAndAssignSuperAdminRole() {
  try {
    console.log('🔍 Verificando rol del super admin...');
    
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
    console.log(`  Rol actual: ${adminUser.publicMetadata?.role || 'No asignado'}`);
    console.log(`  Todos los metadatos:`, adminUser.publicMetadata);
    
    // Si no tiene rol SUPER_ADMIN, asignarlo
    if (adminUser.publicMetadata?.role !== 'SUPER_ADMIN') {
      console.log('🔧 Asignando rol SUPER_ADMIN...');
      
      await clerk.users.updateUser(adminUser.id, {
        publicMetadata: {
          ...adminUser.publicMetadata,
          role: 'SUPER_ADMIN',
          tenantId: 'tenant_001',
          tenantCode: 'DEMO001'
        }
      });
      
      console.log('✅ Rol SUPER_ADMIN asignado exitosamente');
      
      // Verificar la actualización
      const updatedUser = await clerk.users.getUser(adminUser.id);
      console.log('🔍 Verificación:');
      console.log(`  Nuevo rol: ${updatedUser.publicMetadata?.role}`);
      console.log(`  Tenant ID: ${updatedUser.publicMetadata?.tenantId}`);
      console.log(`  Tenant Code: ${updatedUser.publicMetadata?.tenantCode}`);
    } else {
      console.log('✅ El usuario ya tiene rol SUPER_ADMIN');
    }
    
  } catch (error) {
    console.error('❌ Error verificando/actualizando usuario:', error);
  }
}

checkAndAssignSuperAdminRole();
