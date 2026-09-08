import { clerkGetUserList, clerkUpdateUser } from '../lib/clerk-api';

interface UserUpdate {
  userId: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  tenantId?: string;
}

const usersToUpdate: UserUpdate[] = [
  // Ejemplos - reemplaza con IDs reales de usuarios
  // { userId: 'user_123456789', role: 'SUPER_ADMIN' },
  // { userId: 'user_987654321', role: 'ADMIN', tenantId: 'tenant-123' },
];

async function updateUserRole(update: UserUpdate) {
  try {
    const metadata: any = {
      role: update.role,
    };

    if (update.role !== 'SUPER_ADMIN' && update.tenantId) {
      metadata.tenantId = update.tenantId;
    } else if (update.role === 'SUPER_ADMIN') {
      metadata.tenantId = null;
    }

    await clerkUpdateUser(update.userId, { publicMetadata: metadata });

    console.log(`Usuario ${update.userId} actualizado a rol: ${update.role}`);
    return true;
  } catch (error) {
    console.error(`Error actualizando usuario ${update.userId}:`, error);
    return false;
  }
}

async function listAllUsers() {
  try {
    const users = await clerkGetUserList({ limit: 100 });

    console.log('Usuarios actuales:');
    users.forEach(user => {
      const primaryEmail = user.email_addresses.find(e => e.id === user.primary_email_address_id);
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${primaryEmail?.email_address || 'N/A'}`);
      console.log(`Rol actual: ${user.public_metadata?.role || 'USER'}`);
      console.log(`Tenant: ${user.public_metadata?.tenantId || 'N/A'}`);
      console.log('---');
    });

    return users;
  } catch (error) {
    console.error('Error listando usuarios:', error);
    return [];
  }
}

async function main() {
  console.log('=== Actualización de Roles de Usuarios en Clerk ===\n');

  console.log('1. Listando usuarios actuales...');
  await listAllUsers();

  if (usersToUpdate.length === 0) {
    console.log('\nNo hay usuarios para actualizar. Modifica el array usersToUpdate en el script.');
    return;
  }

  console.log('\n2. Actualizando usuarios...');
  let successCount = 0;
  let failCount = 0;

  for (const update of usersToUpdate) {
    const success = await updateUserRole(update);
    if (success) successCount++;
    else failCount++;
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Actualizados exitosamente: ${successCount}`);
  console.log(`Fallidos: ${failCount}`);

  if (successCount > 0) {
    console.log('\n3. Verificando actualizaciones...');
    await listAllUsers();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

export { main, updateUserRole, listAllUsers };
