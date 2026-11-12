import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkTenantsDB() {
  try {
    console.log('🔍 Verificando conexión a la base de datos...');
    
    // Verificar conexión
    await prisma.$connect();
    console.log('✅ Conexión a la base de datos exitosa');
    
    // Contar tenants
    const tenantCount = await prisma.tenant.count();
    console.log(`📊 Total de tenants en la base de datos: ${tenantCount}`);
    
    if (tenantCount > 0) {
      // Obtener todos los tenants
      const tenants = await prisma.tenant.findMany({
        select: {
          id: true,
          businessName: true,
          tenantCode: true,
          businessEmail: true,
          businessRTN: true,
          subscriptionPlans: true,
          modules: true,
          monthlyCost: true,
          maxUsers: true,
          isActive: true,
          createdAt: true,
          updatedAt: true
        }
      });
      
      console.log('\n📋 Detalles de los tenants:');
      tenants.forEach((tenant, index) => {
        console.log(`\n${index + 1}. ${tenant.businessName} (${tenant.tenantCode})`);
        console.log(`   ID: ${tenant.id}`);
        console.log(`   Email: ${tenant.businessEmail}`);
        console.log(`   RTN: ${tenant.businessRTN}`);
        console.log(`   Planes: ${tenant.subscriptionPlans}`);
        console.log(`   Módulos: ${tenant.modules || 'N/A'}`);
        console.log(`   Costo mensual: L. ${tenant.monthlyCost}`);
        console.log(`   Max usuarios: ${tenant.maxUsers}`);
        console.log(`   Activo: ${tenant.isActive ? 'Sí' : 'No'}`);
        console.log(`   Creado: ${tenant.createdAt}`);
        console.log(`   Actualizado: ${tenant.updatedAt}`);
      });
    } else {
      console.log('\n⚠️ No hay tenants en la base de datos');
      console.log('💡 Sugerencia: Ejecuta el seed para crear datos de ejemplo');
    }
    
    // Verificar si el tenant específico existe
    const specificTenant = await prisma.tenant.findFirst({
      where: {
        OR: [
          { tenantCode: 'DD001' },
          { businessEmail: 'dental@contab.com' },
          { businessRTN: '05011991078006' }
        ]
      }
    });
    
    if (specificTenant) {
      console.log('\n✅ Tenant específico encontrado:');
      console.log(`   Nombre: ${specificTenant.businessName}`);
      console.log(`   Código: ${specificTenant.tenantCode}`);
      console.log(`   Planes: ${specificTenant.subscriptionPlans}`);
      console.log(`   Módulos: ${specificTenant.modules}`);
    } else {
      console.log('\n❌ Tenant específico no encontrado (Dental Diamond)');
    }
    
  } catch (error) {
    console.error('❌ Error al verificar la base de datos:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n🔌 Conexión cerrada');
  }
}

checkTenantsDB();
