// Script para importación masiva de usuarios con metadata a Clerk
// Ejecutar con: CLERK_SECRET_KEY=tu_secret_key node scripts/clerk-bulk-import.js

const { Clerk } = require('@clerk/clerk-sdk-node');

const clerk = new Clerk({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Usuarios a importar - MODIFICAR ESTE ARRAY
const usersToImport = [
  {
    email: 'admin@tudominio.com',
    firstName: 'Super',
    lastName: 'Admin',
    role: 'SUPER_ADMIN',
    tenantId: null,
    password: 'TempPassword123!' // Contraseña temporal
  },
  {
    email: 'tenant-admin@tudominio.com',
    firstName: 'Tenant',
    lastName: 'Admin',
    role: 'ADMIN',
    tenantId: 'tenant-123', // Reemplazar con tenant ID real
    password: 'TempPassword123!'
  },
  {
    email: 'manager@tudominio.com',
    firstName: 'Manager',
    lastName: 'User',
    role: 'MANAGER',
    tenantId: 'tenant-123',
    password: 'TempPassword123!'
  },
  {
    email: 'usuario@tudominio.com',
    firstName: 'Usuario',
    lastName: 'Normal',
    role: 'USER',
    tenantId: 'tenant-123',
    password: 'TempPassword123!'
  },
  {
    email: 'viewer@tudominio.com',
    firstName: 'Viewer',
    lastName: 'User',
    role: 'VIEWER',
    tenantId: 'tenant-123',
    password: 'TempPassword123!'
  }
];

// Función para crear usuario con metadata
async function createUserWithRole(userData) {
  try {
    const publicMetadata = {
      role: userData.role,
      tenantId: userData.tenantId,
      permissions: getPermissionsForRole(userData.role)
    };

    const user = await clerk.users.createUser({
      emailAddress: [userData.email],
      firstName: userData.firstName,
      lastName: userData.lastName,
      password: userData.password,
      publicMetadata: publicMetadata
    });

    console.log(`Usuario creado exitosamente: ${userData.email} (ID: ${user.id})`);
    return { success: true, user };
  } catch (error) {
    console.error(`Error creando usuario ${userData.email}:`, error.errors || error.message);
    return { success: false, error: error.errors || error.message };
  }
}

// Función para obtener permisos según rol
function getPermissionsForRole(role) {
  const permissions = {
    'SUPER_ADMIN': [
      'system:admin',
      'users:manage',
      'tenants:manage',
      'audit:view',
      'reports:all'
    ],
    'ADMIN': [
      'tenant:admin',
      'users:tenant_manage',
      'inventory:manage',
      'accounting:manage',
      'reports:tenant'
    ],
    'MANAGER': [
      'inventory:view',
      'inventory:create',
      'accounting:view',
      'accounting:create',
      'reports:basic'
    ],
    'USER': [
      'inventory:view',
      'accounting:view',
      'reports:personal'
    ],
    'VIEWER': [
      'inventory:readonly',
      'accounting:readonly',
      'reports:view'
    ]
  };
  
  return permissions[role] || [];
}

// Función principal de importación
async function importUsers() {
  console.log('=== Importación Masiva de Usuarios a Clerk ===\n');
  
  if (!process.env.CLERK_SECRET_KEY) {
    console.error('Error: CLERK_SECRET_KEY no está configurada');
    process.exit(1);
  }

  console.log(`Se importarán ${usersToImport.length} usuarios...\n`);

  let successCount = 0;
  let failCount = 0;
  const results = [];

  for (const userData of usersToImport) {
    console.log(`Procesando: ${userData.email} (${userData.role})`);
    
    const result = await createUserWithRole(userData);
    results.push({
      email: userData.email,
      role: userData.role,
      ...result
    });

    if (result.success) {
      successCount++;
    } else {
      failCount++;
    }

    // Pequeña pausa para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  // Resumen
  console.log('\n=== RESUMEN DE IMPORTACIÓN ===');
  console.log(`Exitosos: ${successCount}`);
  console.log(`Fallidos: ${failCount}`);
  
  if (failCount > 0) {
    console.log('\n=== ERRORES ===');
    results.filter(r => !r.success).forEach(result => {
      console.log(`${result.email}: ${result.error}`);
    });
  }

  if (successCount > 0) {
    console.log('\n=== USUARIOS CREADOS ===');
    results.filter(r => r.success).forEach(result => {
      console.log(`${result.email} - ID: ${result.user.id}`);
    });
  }
}

// Función para verificar usuarios existentes
async function checkExistingUsers() {
  try {
    const { data: users } = await clerk.users.getUserList({
      limit: 100
    });

    console.log('=== USUARIOS EXISTENTES EN CLERK ===');
    users.forEach(user => {
      const metadata = user.publicMetadata || {};
      console.log(`Email: ${user.primaryEmailAddress?.emailAddress}`);
      console.log(`ID: ${user.id}`);
      console.log(`Rol: ${metadata.role || 'USER'}`);
      console.log(`Tenant: ${metadata.tenantId || 'N/A'}`);
      console.log('---');
    });

    return users;
  } catch (error) {
    console.error('Error verificando usuarios existentes:', error);
    return [];
  }
}

// Ejecutar según argumentos
const command = process.argv[2];

if (command === 'check') {
  checkExistingUsers();
} else if (command === 'import') {
  importUsers();
} else {
  console.log('Uso:');
  console.log('  node scripts/clerk-bulk-import.js check    - Verificar usuarios existentes');
  console.log('  node scripts/clerk-bulk-import.js import   - Importar nuevos usuarios');
  console.log('\nVariables de entorno requeridas:');
  console.log('  CLERK_SECRET_KEY=tu_secret_key');
}

module.exports = { importUsers, checkExistingUsers, createUserWithRole };
