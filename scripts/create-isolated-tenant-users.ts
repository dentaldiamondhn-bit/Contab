// Script para crear tenants con usuarios aislados por código único
// Ejecutar con: CLERK_SECRET_KEY=tu_secret_key npx ts-node scripts/create-isolated-tenant-users.ts

import { Clerk } from '@clerk/clerk-sdk-node';
import { db } from '@/lib/db';

interface TenantData {
  businessName: string;
  businessRTN: string;
  businessEmail: string;
  businessAddress: string;
  users: {
    email: string;
    firstName: string;
    lastName: string;
    role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
    password: string;
  }[];
}

interface IsolatedUserMetadata {
  role: string;
  tenantId: string;
  tenantCode: string;
  permissions: string[];
  isolation: {
    tenantScope: boolean;
    crossTenantAccess: boolean;
    dataVisibility: string;
  };
}

const clerk = new Clerk({
  secretKey: process.env.CLERK_SECRET_KEY,
});

// Ejemplo de tenants a crear - MODIFICAR SEGÚN NECESIDAD
const tenantsToCreate: TenantData[] = [
  {
    businessName: 'Dental Diamond HN',
    businessRTN: '08011999123456',
    businessEmail: 'contact@dental.hn',
    businessAddress: 'Tegucigalpa, Honduras',
    users: [
      {
        email: 'admin@dental.hn',
        firstName: 'Admin',
        lastName: 'Dental',
        role: 'ADMIN',
        password: 'TempDental123!'
      },
      {
        email: 'manager@dental.hn',
        firstName: 'Manager',
        lastName: 'Dental',
        role: 'MANAGER',
        password: 'TempDental123!'
      },
      {
        email: 'user@dental.hn',
        firstName: 'Usuario',
        lastName: 'Dental',
        role: 'USER',
        password: 'TempDental123!'
      }
    ]
  },
  {
    businessName: 'Contadora Profesional',
    businessRTN: '08011998567890',
    businessEmail: 'info@contadora.hn',
    businessAddress: 'San Pedro Sula, Honduras',
    users: [
      {
        email: 'admin@contadora.hn',
        firstName: 'Admin',
        lastName: 'Contadora',
        role: 'ADMIN',
        password: 'TempConta123!'
      },
      {
        email: 'contador@contadora.hn',
        firstName: 'Contador',
        lastName: 'Principal',
        role: 'MANAGER',
        password: 'TempConta123!'
      }
    ]
  }
];

// Generador de código único de tenant
async function generateTenantCode(businessName: string): Promise<string> {
  const prefix = businessName
    .replace(/[^a-zA-Z]/g, '')
    .substring(0, 3)
    .toUpperCase();

  let counter = 1;
  let code = `${prefix}${counter.toString().padStart(3, '0')}`;

  // Verificar si el código ya existe
  while (await db.tenant.findUnique({ where: { tenantCode: code } })) {
    counter++;
    code = `${prefix}${counter.toString().padStart(3, '0')}`;
  }

  return code;
}

// Obtener permisos según rol
function getPermissionsForRole(role: string): string[] {
  const permissions = {
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
      'inventory:edit',
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

  return permissions[role as keyof typeof permissions] || [];
}

// Crear metadata aislada para usuario
function createIsolatedMetadata(
  role: string,
  tenantId: string,
  tenantCode: string
): IsolatedUserMetadata {
  return {
    role,
    tenantId,
    tenantCode,
    permissions: getPermissionsForRole(role),
    isolation: {
      tenantScope: true,
      crossTenantAccess: false,
      dataVisibility: 'tenant_only'
    }
  };
}

// Crear tenant con usuarios aislados
async function createIsolatedTenant(tenantData: TenantData) {
  try {
    console.log(`\n=== Creando Tenant: ${tenantData.businessName} ===`);

    // 1. Generar código único
    const tenantCode = await generateTenantCode(tenantData.businessName);
    console.log(`Código generado: ${tenantCode}`);

    // 2. Crear tenant en base de datos
    const tenant = await db.tenant.create({
      data: {
        businessName: tenantData.businessName,
        businessRTN: tenantData.businessRTN,
        businessEmail: tenantData.businessEmail,
        businessAddress: tenantData.businessAddress,
        tenantCode: tenantCode,
        country: 'HN',
        timezone: 'America/Tegucigalpa',
        currency: 'HNL',
        isActive: true
      }
    });

    console.log(`Tenant creado con ID: ${tenant.id}`);

    // 3. Crear usuarios en Clerk con metadata aislada
    const createdUsers = [];
    for (const userData of tenantData.users) {
      try {
        const metadata = createIsolatedMetadata(userData.role, tenant.id, tenantCode);

        const clerkUser = await clerk.users.createUser({
          emailAddress: [userData.email],
          firstName: userData.firstName,
          lastName: userData.lastName,
          password: userData.password,
          publicMetadata: metadata
        });

        // Crear usuario en base de datos local
        const dbUser = await db.user.create({
          data: {
            authId: clerkUser.id,
            email: userData.email,
            firstName: userData.firstName,
            lastName: userData.lastName,
            role: userData.role,
            tenantId: tenant.id,
            isActive: true
          }
        });

        createdUsers.push({
          email: userData.email,
          role: userData.role,
          clerkId: clerkUser.id,
          dbId: dbUser.id
        });

        console.log(`  Usuario creado: ${userData.email} (${userData.role})`);
      } catch (error) {
        console.error(`  Error creando usuario ${userData.email}:`, error);
      }
    }

    return {
      success: true,
      tenant: {
        id: tenant.id,
        businessName: tenant.businessName,
        tenantCode: tenant.tenantCode
      },
      users: createdUsers
    };

  } catch (error) {
    console.error(`Error creando tenant ${tenantData.businessName}:`, error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Función principal
async function main() {
  console.log('=== Creación de Tenants con Usuarios Aislados ===\n');

  if (!process.env.CLERK_SECRET_KEY) {
    console.error('Error: CLERK_SECRET_KEY no está configurada');
    process.exit(1);
  }

  const results = [];

  for (const tenantData of tenantsToCreate) {
    const result = await createIsolatedTenant(tenantData);
    results.push(result);

    // Pequeña pausa para evitar rate limiting
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Resumen
  console.log('\n=== RESUMEN DE CREACIÓN ===');
  const successful = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`Tenants creados exitosamente: ${successful.length}`);
  console.log(`Tenants fallidos: ${failed.length}`);

  if (successful.length > 0) {
    console.log('\n=== TENANTS CREADOS ===');
    successful.forEach(result => {
      console.log(`${result.tenant.businessName} - Código: ${result.tenant.tenantCode}`);
      console.log(`  Usuarios: ${result.users.length}`);
      result.users.forEach(user => {
        console.log(`    - ${user.email} (${user.role})`);
      });
    });
  }

  if (failed.length > 0) {
    console.log('\n=== ERRORES ===');
    failed.forEach(result => {
      console.log(`Error: ${result.error}`);
    });
  }
}

// Verificar tenants existentes
async function checkExistingTenants() {
  try {
    const tenants = await db.tenant.findMany({
      select: {
        id: true,
        businessName: true,
        tenantCode: true,
        isActive: true,
        _count: {
          select: { users: true }
        }
      },
      orderBy: {
        tenantCode: 'asc'
      }
    });

    console.log('=== TENANTS EXISTENTES ===');
    tenants.forEach(tenant => {
      console.log(`${tenant.tenantCode} - ${tenant.businessName}`);
      console.log(`  ID: ${tenant.id}`);
      console.log(`  Usuarios: ${tenant._count.users}`);
      console.log(`  Activo: ${tenant.isActive ? 'Sí' : 'No'}`);
      console.log('---');
    });

    return tenants;
  } catch (error) {
    console.error('Error verificando tenants:', error);
    return [];
  }
}

// Ejecutar según argumentos
const command = process.argv[2];

if (command === 'check') {
  checkExistingTenants();
} else if (command === 'create') {
  main();
} else {
  console.log('Uso:');
  console.log('  npx ts-node scripts/create-isolated-tenant-users.ts check   - Verificar tenants existentes');
  console.log('  npx ts-node scripts/create-isolated-tenant-users.ts create  - Crear nuevos tenants');
  console.log('\nVariables de entorno requeridas:');
  console.log('  CLERK_SECRET_KEY=tu_secret_key');
  console.log('\nNota: Modifica el array tenantsToCreate en el script antes de ejecutar.');
}

export { main, checkExistingTenants, createIsolatedTenant };
