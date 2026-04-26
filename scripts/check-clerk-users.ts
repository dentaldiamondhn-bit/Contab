// Script para verificar usuarios en Clerk
const { Clerk } = require('@clerk/clerk-sdk-node');

const clerk = new Clerk({
  secretKey: 'sk_test_UwGrJ3a12Pz71qmNBHchT02OWV6yc8HLV0Gb9Qg44L'
});

async function checkAllUsers() {
  try {
    console.log('🔍 Obteniendo todos los usuarios de Clerk...');
    
    const allUsers = await clerk.users.getUserList();
    console.log(`📊 Total de usuarios en Clerk: ${allUsers.length}`);
    
    allUsers.forEach((user, index) => {
      const metadata = user.publicMetadata || {};
      console.log(`\n👤 Usuario ${index + 1}:`);
      console.log(`  ID: ${user.id}`);
      console.log(`  Email: ${user.emailAddresses[0]?.emailAddress}`);
      console.log(`  Nombre: ${user.firstName} ${user.lastName}`);
      console.log(`  Tenant ID: ${metadata.tenantId || 'No asignado'}`);
      console.log(`  Tenant Code: ${metadata.tenantCode || 'No asignado'}`);
      console.log(`  Role: ${metadata.role || 'No asignado'}`);
      console.log(`  Created: ${user.createdAt}`);
    });
    
  } catch (error) {
    console.error('❌ Error al obtener usuarios:', error);
  }
}

checkAllUsers();
