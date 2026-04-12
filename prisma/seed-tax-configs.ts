import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function seedTaxConfigs() {
  try {
    // Find or create the ISV payable account (liability account)
    let isvPayableAccount = await prisma.account.findFirst({
      where: {
        code: '2101', // Typical liability account code for taxes payable
        type: 'LIABILITY'
      }
    });

    if (!isvPayableAccount) {
      // Create the ISV payable account if it doesn't exist
      isvPayableAccount = await prisma.account.create({
        data: {
          name: 'ISV por Pagar',
          code: '2101',
          type: 'LIABILITY',
          description: 'Impuesto Sobre Ventas por pagar'
        }
      });
      console.log('Created ISV payable account:', isvPayableAccount);
    }

    // Create tax configurations
    const taxConfigs = [
      {
        name: 'ISV Estándar 15%',
        rate: 0.15,
        accountId: isvPayableAccount.id,
        isActive: true
      },
      {
        name: 'ISV Especial 18%',
        rate: 0.18,
        accountId: isvPayableAccount.id,
        isActive: true
      },
      {
        name: 'Exento de ISV',
        rate: 0.00,
        accountId: isvPayableAccount.id,
        isActive: true
      }
    ];

    for (const config of taxConfigs) {
      const existing = await prisma.taxConfig.findFirst({
        where: { name: config.name }
      });

      if (!existing) {
        await prisma.taxConfig.create({
          data: config
        });
        console.log('Created tax config:', config.name);
      }
    }

    console.log('Tax configurations seeded successfully');
  } catch (error) {
    console.error('Error seeding tax configs:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  seedTaxConfigs()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
}
