import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setupSystemConfig() {
  try {
    console.log('Configurando sistema ContabHN...');

    // Configuración del CAI de ContabHN
    const caiConfigs = [
      {
        key: 'contabhn_cai',
        value: JSON.stringify({
          cai: 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
          rangeStart: 1,
          rangeEnd: 1000,
          currentNumber: 1,
          expiryDate: '2024-12-31T23:59:59.000Z',
          rtn: '05011991078006',
          businessName: 'CONTAB HN',
          businessAddress: 'Tegucigalpa, Honduras',
          establishmentCode: '001',
          pointOfSaleCode: '001',
          economicActivity: '631100', // Servicios de procesamiento de datos
          taxRate: 15
        }),
        description: 'Configuración del CAI para ContabHN'
      },
      {
        key: 'contabhn_invoice_settings',
        value: JSON.stringify({
          currency: 'HNL',
          language: 'es',
          dateFormat: 'DD/MM/YYYY',
          taxRate: 15,
          exemptTaxRate: 0,
          includeQR: true,
          includeBarcode: false,
          footerText: 'Gracias por su preferencia. Esta factura es un documento fiscal válido.'
        }),
        description: 'Configuración general de facturación para ContabHN'
      }
    ];

    // Insertar o actualizar configuraciones
    for (const config of caiConfigs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: { 
          value: config.value,
          description: config.description
        },
        create: config
      });
      console.log(`✅ Configuración ${config.key} establecida`);
    }

    // Crear CAI principal para el sistema
    const caiData = JSON.parse(caiConfigs[0].value);
    
    await prisma.cAI.upsert({
      where: { cai: caiData.cai },
      update: {
        rangeStart: BigInt(caiData.rangeStart),
        rangeEnd: BigInt(caiData.rangeEnd),
        currentNumber: BigInt(caiData.currentNumber),
        expiryDate: new Date(caiData.expiryDate),
        isActive: true
      },
      create: {
        cai: caiData.cai,
        rangeStart: BigInt(caiData.rangeStart),
        rangeEnd: BigInt(caiData.rangeEnd),
        currentNumber: BigInt(caiData.currentNumber),
        expiryDate: new Date(caiData.expiryDate),
        isActive: true
      }
    });

    console.log('✅ CAI principal creado/actualizado');
    console.log('🎉 Configuración del sistema completada');

  } catch (error) {
    console.error('❌ Error configurando el sistema:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

setupSystemConfig();
