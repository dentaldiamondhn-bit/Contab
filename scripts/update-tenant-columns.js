const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function updateTenantColumns() {
  try {
    // Renombrar columna subscriptionPlan a subscriptionPlans
    await prisma.$executeRaw`
      ALTER TABLE "Tenant" RENAME COLUMN "subscription_plan" TO "subscription_plans"
    `;

    console.log('Columna subscription_plan renombrada a subscription_plans');

    // Agregar columna monthlyCost si no existe
    await prisma.$executeRaw`
      ALTER TABLE "Tenant" ADD COLUMN "monthly_cost" INTEGER DEFAULT 1000
    `;

    console.log('Columna monthly_cost agregada exitosamente');

  } catch (error) {
    console.error('Error actualizando columnas de tenants:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateTenantColumns();
