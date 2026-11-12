const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addModulesColumn() {
  try {
    // Ejecutar SQL raw para agregar la columna modules
    await prisma.$executeRaw`
      ALTER TABLE "Plan" ADD COLUMN "modules" TEXT DEFAULT '[]'
    `;

    console.log('Columna modules agregada exitosamente a la tabla Plan');
  } catch (error) {
    console.error('Error agregando columna modules:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addModulesColumn();
