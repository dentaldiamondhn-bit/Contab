import { PrismaClient } from '@prisma/client';
import { createCAI } from '../lib/services/cai-service';

const prisma = new PrismaClient();

async function seedCAI() {
  console.log('🔄 Iniciando seed de datos CAI...');

  try {
    // Clean existing CAI data
    await prisma.cAIAlert.deleteMany({});
    await prisma.cAI.deleteMany({});
    console.log('✅ Datos CAI existentes eliminados');

    // Create sample CAIs
    const sampleCAIs = [
      {
        caiCode: '0801-2024-12345678901234567890',
        establishmentCode: '0801',
        pointOfSaleCode: '01',
        documentType: 'FACT',
        rangeStart: 1,
        rangeEnd: 1000,
        issueDate: new Date('2024-01-01'),
        expirationDate: new Date('2024-12-31'),
        currentNumber: 850, // Near exhaustion
      },
      {
        caiCode: '0801-2024-09876543210987654321',
        establishmentCode: '0801',
        pointOfSaleCode: '02',
        documentType: 'FACT',
        rangeStart: 1,
        rangeEnd: 500,
        issueDate: new Date('2024-06-01'),
        expirationDate: new Date('2024-11-30'), // Soon to expire
        currentNumber: 200,
      },
      {
        caiCode: '0801-2024-55556666777788899900',
        establishmentCode: '0801',
        pointOfSaleCode: '03',
        documentType: 'NOTA_CREDITO',
        rangeStart: 1,
        rangeEnd: 200,
        issueDate: new Date('2024-03-01'),
        expirationDate: new Date('2025-02-28'),
        currentNumber: 50,
      },
      {
        caiCode: '0802-2024-11112222333344445555',
        establishmentCode: '0802',
        pointOfSaleCode: '01',
        documentType: 'FACT',
        rangeStart: 1,
        rangeEnd: 1500,
        issueDate: new Date('2024-01-15'),
        expirationDate: new Date('2025-01-14'),
        currentNumber: 100,
      },
      {
        caiCode: '0801-2023-99998888777766655544',
        establishmentCode: '0801',
        pointOfSaleCode: '01',
        documentType: 'FACT',
        rangeStart: 1,
        rangeEnd: 800,
        issueDate: new Date('2023-01-01'),
        expirationDate: new Date('2023-12-31'), // Expired
        currentNumber: 800,
      },
    ];

    for (const caiData of sampleCAIs) {
      await createCAI(caiData);
      console.log(`✅ CAI creado: ${caiData.caiCode}`);
    }

    console.log('🎉 Seed de CAI completado exitosamente');
    console.log(`📊 Total CAIs creados: ${sampleCAIs.length}`);
    
    // Show summary
    const totalCAIs = await prisma.cAI.count();
    const activeCAIs = await prisma.cAI.count({ where: { status: 'ACTIVE' } });
    const expiringCAIs = await prisma.cAI.count({ where: { status: 'EXPIRING' } });
    const expiredCAIs = await prisma.cAI.count({ where: { status: 'EXPIRED' } });
    const exhaustedCAIs = await prisma.cAI.count({ where: { status: 'EXHAUSTED' } });

    console.log('\n📈 Resumen de CAIs:');
    console.log(`   Total: ${totalCAIs}`);
    console.log(`   Activos: ${activeCAIs}`);
    console.log(`   Por vencer: ${expiringCAIs}`);
    console.log(`   Vencidos: ${expiredCAIs}`);
    console.log(`   Agotados: ${exhaustedCAIs}`);

    // Check for alerts
    const alerts = await prisma.cAIAlert.findMany({ where: { isRead: false } });
    if (alerts.length > 0) {
      console.log(`\n🚨 Alertas generadas: ${alerts.length}`);
      alerts.forEach((alert: any, index: number) => {
        console.log(`   ${index + 1}. ${alert.message}`);
      });
    }

  } catch (error) {
    console.error('❌ Error en seed de CAI:', error);
    throw error;
  }
}

// Run the seed
seedCAI()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
