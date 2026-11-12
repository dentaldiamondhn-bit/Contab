import { clerkGetUserList, clerkUpdateUser, clerkGetUser } from '../lib/clerk-api';

async function checkAndAssignSuperAdminRole() {
  try {
    console.log('🔍 Verificando rol del super admin...');
    
    const userList = await clerkGetUserList({ limit: 100 });
    const adminUser = userList.find(user => 
      user.email_addresses.some(e => e.email_address === 'sucachi.123@gmail.com')
    );
    
    if (!adminUser) {
      console.log('❌ Usuario admin no encontrado');
      return;
    }
    
    const primaryEmail = adminUser.email_addresses.find(e => e.id === adminUser.primary_email_address_id);
    console.log('👤 Usuario super admin encontrado:');
    console.log(`  ID: ${adminUser.id}`);
    console.log(`  Email: ${primaryEmail?.email_address}`);
    console.log(`  Rol actual: ${adminUser.public_metadata?.role || 'No asignado'}`);
    console.log(`  Todos los metadatos:`, adminUser.public_metadata);
    
    if (adminUser.public_metadata?.role !== 'SUPER_ADMIN') {
      console.log('🔧 Asignando rol SUPER_ADMIN...');
      
      await clerkUpdateUser(adminUser.id, {
        publicMetadata: {
          ...adminUser.public_metadata,
          role: 'SUPER_ADMIN',
          tenantId: 'tenant_001',
          tenantCode: 'DEMO001'
        }
      });
      
      console.log('✅ Rol SUPER_ADMIN asignado exitosamente');
      
      const updatedUser = await clerkGetUser(adminUser.id);
      console.log('🔍 Verificación:');
      console.log(`  Nuevo rol: ${updatedUser.public_metadata?.role}`);
      console.log(`  Tenant ID: ${updatedUser.public_metadata?.tenantId}`);
      console.log(`  Tenant Code: ${updatedUser.public_metadata?.tenantCode}`);
    } else {
      console.log('✅ El usuario ya tiene rol SUPER_ADMIN');
    }
    
  } catch (error) {
    console.error('❌ Error verificando/actualizando usuario:', error);
  }
}

checkAndAssignSuperAdminRole();
