const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createPlanTable() {
  try {
    // Ejecutar SQL raw para crear la tabla
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Plan" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "name" TEXT NOT NULL,
        "code" TEXT NOT NULL UNIQUE,
        "price" INTEGER NOT NULL,
        "max_users" INTEGER NOT NULL,
        "max_storage" INTEGER NOT NULL,
        "max_transactions" INTEGER NOT NULL,
        "features" TEXT NOT NULL,
        "is_active" INTEGER NOT NULL DEFAULT 1,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `;

    console.log('Tabla Plan creada exitosamente');

    // Crear índices
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_plan_code" ON "Plan"("code")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_plan_is_active" ON "Plan"("is_active")`;

    console.log('Índices creados exitosamente');
  } catch (error) {
    console.error('Error creando tabla Plan:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createPlanTable();
