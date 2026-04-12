import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedPatientBillingAccounts() {
  try {
    // Create revenue accounts
    const revenueAccounts = [
      {
        name: 'Ingresos por Consultas Médicas',
        code: '4101',
        type: 'REVENUE',
        description: 'Ingresos generados por consultas médicas'
      },
      {
        name: 'Ingresos por Procedimientos',
        code: '4102',
        type: 'REVENUE',
        description: 'Ingresos generados por procedimientos médicos'
      },
      {
        name: 'Ingresos por Servicios de Laboratorio',
        code: '4103',
        type: 'REVENUE',
        description: 'Ingresos generados por servicios de laboratorio'
      }
    ];

    // Create receivable accounts
    const receivableAccounts = [
      {
        name: 'Cuentas por Cobrar - Pacientes',
        code: '1201',
        type: 'ASSET',
        description: 'Cuentas por cobrar a pacientes por servicios médicos'
      },
      {
        name: 'Cuentas por Cobrar - Seguros',
        code: '1202',
        type: 'ASSET',
        description: 'Cuentas por cobrar a compañías de seguros'
      }
    ];

    // Seed revenue accounts
    for (const account of revenueAccounts) {
      const existing = await prisma.account.findFirst({
        where: { code: account.code }
      });

      if (!existing) {
        await prisma.account.create({
          data: account
        });
        console.log(`Created revenue account: ${account.name}`);
      }
    }

    // Seed receivable accounts
    for (const account of receivableAccounts) {
      const existing = await prisma.account.findFirst({
        where: { code: account.code }
      });

      if (!existing) {
        await prisma.account.create({
          data: account
        });
        console.log(`Created receivable account: ${account.name}`);
      }
    }

    console.log('Patient billing accounts seeded successfully');
  } catch (error) {
    console.error('Error seeding patient billing accounts:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedPatientBillingAccounts()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
