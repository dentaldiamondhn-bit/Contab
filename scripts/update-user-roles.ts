import { createClerkClient } from '@clerk/clerk-sdk-node';

// Script para actualizar roles de usuarios existentes en Clerk
// Ejecutar con: npx ts-node scripts/update-user-roles.ts

interface UserUpdate {
  userId: string;
  role: 'SUPER_ADMIN' | 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  tenantId?: string;
}

const clerk = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Lista de usuarios a actualizar (modificar según necesidad)
const usersToUpdate: UserUpdate[] = [
  // Ejemplos - reemplaza con IDs reales de usuarios
  // { userId: 'user_123456789', role: 'SUPER_ADMIN' },
  // { userId: 'user_987654321', role: 'ADMIN', tenantId: 'tenant-123' },
  // { userId: 'user_456789123', role: 'MANAGER', tenantId: 'tenant-123' },
];

async function updateUserRole(update: UserUpdate) {
  try {
    const metadata: any = {
      role: update.role,
    };

    // Solo agregar tenantId si no es SUPER_ADMIN
    if (update.role !== 'SUPER_ADMIN' && update.tenantId) {
      metadata.tenantId = update.tenantId;
    } else if (update.role === 'SUPER_ADMIN') {
      metadata.tenantId = null;
    }

    await clerk.users.updateUser(update.userId, {
      publicMetadata: metadata,
    });

    console.log(`Usuario ${update.userId} actualizado a rol: ${update.role}`);
    return true;
  } catch (error) {
    console.error(`Error actualizando usuario ${update.userId}:`, error);
    return false;
  }
}

async function listAllUsers() {
  try {
    const users = await clerk.users.getUserList({
      limit: 100,
    });

    console.log('Usuarios actuales:');
    users.forEach(user => {
      const primaryEmail = user.emailAddresses?.find(
        (email: { id: string }) => email.id === user.primaryEmailAddressId
      );
      console.log(`ID: ${user.id}`);
      console.log(`Email: ${primaryEmail?.emailAddress || 'N/A'}`);
      console.log(`Rol actual: ${(user.publicMetadata as any)?.role || 'USER'}`);
      console.log(`Tenant: ${(user.publicMetadata as any)?.tenantId || 'N/A'}`);
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

  // Mostrar usuarios actuales
  console.log('1. Listando usuarios actuales...');
  await listAllUsers();

  if (usersToUpdate.length === 0) {
    console.log('\nNo hay usuarios para actualizar. Modifica el array usersToUpdate en el script.');
    return;
  }

  // Actualizar usuarios
  console.log('\n2. Actualizando usuarios...');
  let successCount = 0;
  let failCount = 0;

  for (const update of usersToUpdate) {
    const success = await updateUserRole(update);
    if (success) {
      successCount++;
    } else {
      failCount++;
    }
  }

  console.log(`\n=== Resumen ===`);
  console.log(`Actualizados exitosamente: ${successCount}`);
  console.log(`Fallidos: ${failCount}`);

  if (successCount > 0) {
    console.log('\n3. Verificando actualizaciones...');
    await listAllUsers();
  }
}

// Ejecutar script
if (require.main === module) {
  main().catch(console.error);
}

export { main, updateUserRole, listAllUsers };
