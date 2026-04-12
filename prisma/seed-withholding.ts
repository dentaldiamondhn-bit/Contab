import { PrismaClient } from '@prisma/client';
import { createWithholding } from '../lib/services/withholding-service';

const prisma = new PrismaClient();

async function seedWithholding() {
  console.log('🔄 Iniciando seed de datos de Retenciones...');

  try {
    // Clean existing withholding data
    await prisma.withholding.deleteMany({});
    console.log('✅ Datos de retenciones existentes eliminados');

    // Create sample withholdings
    const sampleWithholdings = [
      {
        invoiceNumber: 'F001-2024-0001',
        invoiceDate: new Date('2024-01-15'),
        providerName: 'Dr. Juan Pérez García',
        providerRTN: '0801-1990-12345',
        providerAddress: 'Colonia Palmira, Tegucigalpa, Honduras',
        amount: 5000000, // L 50,000.00 in cents
        type: 'PROFESSIONAL_SERVICES_1%',
        description: 'Servicios profesionales de consultoría médica - Enero 2024',
        period: '2024-01',
      },
      {
        invoiceNumber: 'F001-2024-0002',
        invoiceDate: new Date('2024-01-20'),
        providerName: 'Abogada María Rodríguez López',
        providerRTN: '0802-1985-67890',
        providerAddress: 'Boulevard Morazán, San Pedro Sula, Honduras',
        amount: 3500000, // L 35,000.00 in cents
        type: 'PROFESSIONAL_SERVICES_12_5%',
        description: 'Servicios legales corporativos - Enero 2024',
        period: '2024-01',
      },
      {
        invoiceNumber: 'F001-2024-0003',
        invoiceDate: new Date('2024-02-10'),
        providerName: 'Ing. Carlos Hernández Martínez',
        providerRTN: '0801-1988-54321',
        providerAddress: 'Avenida La Paz, Tegucigalpa, Honduras',
        amount: 7500000, // L 75,000.00 in cents
        type: 'PROFESSIONAL_SERVICES_1%',
        description: 'Servicios de ingeniería civil - Febrero 2024',
        period: '2024-02',
      },
      {
        invoiceNumber: 'F001-2024-0004',
        invoiceDate: new Date('2024-02-15'),
        providerName: 'Arquitecta Diseño y Construcción S.A. de C.V.',
        providerRTN: '0801-2000-98765',
        providerAddress: 'Colonia El Prado, San Pedro Sula, Honduras',
        amount: 12000000, // L 120,000.00 in cents
        type: 'PROFESSIONAL_SERVICES_12_5%',
        description: 'Diseño arquitectónico y supervisión de obra - Febrero 2024',
        period: '2024-02',
      },
      {
        invoiceNumber: 'F001-2024-0005',
        invoiceDate: new Date('2024-03-05'),
        providerName: 'Consultoría Empresarial Expertos S.A.',
        providerRTN: '0801-2010-24680',
        providerAddress: 'Edificio Centro Financiero, Tegucigalpa, Honduras',
        amount: 2500000, // L 25,000.00 in cents
        type: 'PROFESSIONAL_SERVICES_1%',
        description: 'Consultoría financiera y empresarial - Marzo 2024',
        period: '2024-03',
      },
      {
        invoiceNumber: 'F001-2024-0006',
        invoiceDate: new Date('2024-03-12'),
        providerName: 'Dr. Ana María Castro Sánchez',
        providerRTN: '0802-1995-13579',
        providerAddress: 'Colonia Los Laureles, Tegucigalpa, Honduras',
        amount: 4500000, // L 45,000.00 in cents
        type: 'PROFESSIONAL_SERVICES_12_5%',
        description: 'Servicios odontológicos especializados - Marzo 2024',
        period: '2024-03',
      },
      {
        invoiceNumber: 'F001-2024-0007',
        invoiceDate: new Date('2024-04-08'),
        providerName: 'Tecnología y Sistemas Integrados S.A.',
        providerRTN: '0801-2015-78901',
        providerAddress: 'Zona Industrial, San Pedro Sula, Honduras',
        amount: 8000000, // L 80,000.00 in cents
        type: 'PROFESSIONAL_SERVICES_1%',
        description: 'Implementación de sistemas ERP - Abril 2024',
        period: '2024-04',
      },
      {
        invoiceNumber: 'F001-2024-0008',
        invoiceDate: new Date('2024-04-20'),
        providerName: 'Estudio Jurídico Legal & Asociados',
        providerRTN: '0801-2005-11223',
        providerAddress: 'Centro Comercial, Tegucigalpa, Honduras',
        amount: 6000000, // L 60,000.00 in cents
        type: 'PROFESSIONAL_SERVICES_12_5%',
        description: 'Asesoría legal corporativa - Abril 2024',
        period: '2024-04',
      },
      {
        invoiceNumber: 'F001-2024-0009',
        invoiceDate: new Date('2024-05-10'),
        providerName: 'Marketing Digital Pro S.A.',
        providerRTN: '0801-2018-33445',
        providerAddress: 'Colonia Humuya, Tegucigalpa, Honduras',
        amount: 3000000, // L 30,000.00 in cents
        type: 'PROFESSIONAL_SERVICES_1%',
        description: 'Campaña de marketing digital - Mayo 2024',
        period: '2024-05',
      },
      {
        invoiceNumber: 'F001-2024-0010',
        invoiceDate: new Date('2024-05-25'),
        providerName: 'Contabilidad y Auditoría Profesional',
        providerRTN: '0802-1992-55678',
        providerAddress: 'Edificio Plaza Central, San Pedro Sula, Honduras',
        amount: 4000000, // L 40,000.00 in cents
        type: 'PROFESSIONAL_SERVICES_12_5%',
        description: 'Auditoría financiera anual - Mayo 2024',
        period: '2024-05',
      },
    ];

    for (const withholdingData of sampleWithholdings) {
      const enhancedData = {
        ...withholdingData,
        type: withholdingData.type as any,
        withholdingRate: withholdingData.type === 'PROFESSIONAL_SERVICES_1%' ? 0.01 : 0.125,
      };
      await createWithholding(enhancedData);
      console.log(`✅ Retención creada: ${withholdingData.invoiceNumber} - ${withholdingData.providerName}`);
    }

    console.log('🎉 Seed de retenciones completado exitosamente');
    console.log(`📊 Total retenciones creadas: ${sampleWithholdings.length}`);
    
    // Show summary
    const totalWithholdings = await prisma.withholding.count();
    const pendingWithholdings = await prisma.withholding.count({ where: { status: 'PENDING' } });
    const paidWithholdings = await prisma.withholding.count({ where: { status: 'PAID' } });
    const totalAmount = await prisma.withholding.aggregate({
      _sum: { amount: true },
    });
    const totalWithheld = await prisma.withholding.aggregate({
      _sum: { withholdingAmount: true },
    });

    console.log('\n📈 Resumen de Retenciones:');
    console.log(`   Total: ${totalWithholdings}`);
    console.log(`   Pendientes: ${pendingWithholdings}`);
    console.log(`   Pagadas: ${paidWithholdings}`);
    console.log(`   Monto total: L ${Number(totalAmount._sum.amount || 0) / 100).toFixed(2)}`);
    console.log(`   Total retenido: L ${Number(totalWithheld._sum.withholdingAmount || 0) / 100).toFixed(2)}`);

    // Show breakdown by type
    const type1Percent = await prisma.withholding.findMany({ where: { type: 'PROFESSIONAL_SERVICES_1%' } });
    const type12_5Percent = await prisma.withholding.findMany({ where: { type: 'PROFESSIONAL_SERVICES_12_5%' } });
    
    console.log('\n📊 Retenciones por tipo:');
    console.log(`   1%: ${type1Percent.length} retenciones`);
    console.log(`   12.5%: ${type12_5Percent.length} retenciones`);

  } catch (error) {
    console.error('❌ Error en seed de retenciones:', error);
    throw error;
  }
}

// Run the seed
seedWithholding()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
