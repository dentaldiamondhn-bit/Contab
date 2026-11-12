import { clerkGetUserList } from '../lib/clerk-api';

async function checkAllUsers() {
  try {
    console.log('🔍 Obteniendo todos los usuarios de Clerk...');
    
    const allUsers = await clerkGetUserList({ limit: 100 });
    console.log(`📊 Total de usuarios en Clerk: ${allUsers.length}`);
    
    allUsers.forEach((user, index) => {
      const metadata = user.public_metadata || {};
      const primaryEmail = user.email_addresses.find(e => e.id === user.primary_email_address_id);
      console.log(`\n👤 Usuario ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${primaryEmail?.email_address}`);
      console.log(`  Nombre: ${user.first_name} ${user.last_name}`);
      console.log(`  Tenant ID: ${metadata.tenantId || 'No asignado'}`);
      console.log(`  Tenant Code: ${metadata.tenantCode || 'No asignado'}`);
      console.log(`  Role: ${metadata.role || 'No asignado'}`);
      console.log(`  Created: ${new Date(user.created_at).toISOString()}`);
    });
    
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
  }
}

checkAllUsers();
