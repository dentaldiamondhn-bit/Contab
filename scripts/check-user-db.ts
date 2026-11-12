import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkUser() {
  try {
    const email = 'sucachi.123@gmail.com';
    
    console.log('🔍 Buscando usuario en la base de datos...');
    console.log('Email:', email);
    
    // Buscar usuario en la base de datos
    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        tenant: true
      }
    });

    if (user) {
      console.log('✅ Usuario encontrado:');
      console.log('ID:', user.id);
      console.log('Email:', user.email);
      console.log('Role:', user.role);
      console.log('Tenant ID:', user.tenantId);
      console.log('Tenant Info:', user.tenant);
      console.log('Is Active:', user.isActive);
      console.log('Created At:', user.createdAt);
    } else {
      console.log('❌ Usuario no encontrado en la base de datos');
      console.log('📝 Necesita crear el usuario en la base de datos primero');
    }
    
  } catch (error) {
    console.error('❌ Error al verificar usuario:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
