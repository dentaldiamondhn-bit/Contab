import { clerkGetUserList, clerkUpdateUser } from '../lib/clerk-api';

async function restoreAdminTenant() {
  try {
    console.log('🔍 Buscando usuario super admin...');
    
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
    console.log(`  Tenant ID actual: ${adminUser.public_metadata?.tenantId || 'No asignado'}`);
    
    console.log('🔧 Restaurando tenantId a "tenant_001" (super admin general)...');
    
    await clerkUpdateUser(adminUser.id, {
      publicMetadata: {
        ...adminUser.public_metadata,
        tenantId: 'tenant_001',
        tenantCode: 'DEMO001'
      }
    });
    
    console.log('✅ TenantId restaurado exitosamente');
    
    const { clerkGetUser } = await import('../lib/clerk-api');
    const updatedUser = await clerkGetUser(adminUser.id);
    console.log('🔍 Verificación:');
    console.log(`  Tenant ID restaurado: ${updatedUser.public_metadata?.tenantId}`);
    console.log(`  Tenant Code restaurado: ${updatedUser.public_metadata?.tenantCode}`);
    
  } catch (error) {
    console.error('❌ Error al restaurar usuario:', error);
  }
}

restoreAdminTenant();
