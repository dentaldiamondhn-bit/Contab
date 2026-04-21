import { NextRequest, NextResponse } from 'next/server';

// Reporte de Marketing y Conversión
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Mock data para reporte de marketing
    const marketingReport = {
      summary: {
        totalLeads: 45,
        convertedLeads: 8,
        conversionRate: 17.8,
        totalMarketingSpend: 125000, // HNL
        customerAcquisitionCost: 15625, // CAC
        lifetimeValue: 180000, // LTV
        ltvToCacRatio: 11.5,
        roi: 1340 // ROI de 1340%
      },
      // Origen de arrendatarios
      leadSources: [
        {
          source: 'Sitio Web Dental Diamond',
          leads: 18,
          conversions: 4,
          conversionRate: 22.2,
          cost: 45000,
          revenue: 720000,
          roi: 1500
        },
        {
          source: 'Instagram / Redes Sociales',
          leads: 15,
          conversions: 2,
          conversionRate: 13.3,
          cost: 35000,
          revenue: 360000,
          roi: 929
        },
        {
          source: 'Recomendación de Odontólogos',
          leads: 8,
          conversions: 2,
          conversionRate: 25.0,
          cost: 15000,
          revenue: 360000,
          roi: 2300
        },
        {
          source: 'Visitas Presenciales',
          leads: 4,
          conversions: 0,
          conversionRate: 0,
          cost: 30000,
          revenue: 0,
          roi: -100
        }
      ],
      // Embudo de conversión
      conversionFunnel: {
        stages: [
          { stage: 'Impresiones / Visitas', count: 2500, percentage: 100 },
          { stage: 'Interacciones', count: 450, percentage: 18 },
          { stage: 'Consultas / Leads', count: 45, percentage: 1.8 },
          { stage: 'Visitas al Local', count: 20, percentage: 0.8 },
          { stage: 'Contratos Firmados', count: 8, percentage: 0.32 }
        ],
        averageDaysToConvert: 12
      },
      // Métricas por mes
      monthlyMetrics: [
        {
          month: 'Enero',
          leads: 8,
          conversions: 2,
          spend: 25000,
          cac: 12500,
          topSource: 'Sitio Web'
        },
        {
          month: 'Febrero',
          leads: 6,
          conversions: 1,
          spend: 20000,
          cac: 20000,
          topSource: 'Instagram'
        },
        {
          month: 'Marzo',
          leads: 10,
          conversions: 2,
          spend: 28000,
          cac: 14000,
          topSource: 'Recomendaciones'
        },
        {
          month: 'Abril',
          leads: 9,
          conversions: 1,
          spend: 22000,
          cac: 22000,
          topSource: 'Sitio Web'
        },
        {
          month: 'Mayo',
          leads: 7,
          conversions: 1,
          spend: 18000,
          cac: 18000,
          topSource: 'Instagram'
        },
        {
          month: 'Junio',
          leads: 5,
          conversions: 1,
          spend: 12000,
          cac: 12000,
          topSource: 'Sitio Web'
        }
      ],
      // Análisis de competencia y mercado
      marketInsights: {
        averageCubiclePriceInMarket: 18000, // por mes
        ourAveragePrice: 15000,
        priceCompetitiveness: 'Competitivo (-16% vs mercado)',
        occupancyVsMarket: 78, // mercado 70%
        uniqueSellingPoints: [
          'Horario extendido 2PM-10PM',
          'Equipamiento dental premium',
          'Ubicación céntrica en Tegucigalpa',
          'Facturación digital y contabilidad incluida'
        ]
      },
      // Campañas recientes
      campaigns: [
        {
          name: 'Lanzamiento - Cubículo 5',
          channel: 'Instagram Ads',
          duration: '30 días',
          spend: 15000,
          leads: 12,
          conversions: 1,
          costPerLead: 1250,
          status: 'finalizada',
          roi: 500
        },
        {
          name: 'Promoción Horario Nocturno',
          channel: 'Google Ads + Web',
          duration: '15 días',
          spend: 8000,
          leads: 6,
          conversions: 1,
          costPerLead: 1333,
          status: 'activa',
          roi: 'pendiente'
        },
        {
          name: 'Programa de Referidos',
          channel: 'Recomendación',
          duration: 'Continua',
          spend: 5000,
          leads: 8,
          conversions: 2,
          costPerLead: 625,
          status: 'activa',
          roi: 2300
        }
      ],
      recommendations: [
        {
          priority: 'high',
          title: 'Optimizar Visitas Presenciales',
          description: 'Están generando leads pero 0% conversión. Revisar calidad de las visitas y proceso de seguimiento',
          potentialImpact: 'Reducir CAC en 25%'
        },
        {
          priority: 'medium',
          title: 'Aumentar inversión en Recomendaciones',
          description: 'Tiene el mejor ROI (2300%). Expandir el programa de referidos',
          potentialImpact: '+2 contratos/mes'
        },
        {
          priority: 'medium',
          title: 'Mejorar landing page horario nocturno',
          description: 'Crear página específica para promover tarifa preferencial 8PM-10PM',
          potentialImpact: '+15% leads en horario nocturno'
        }
      ]
    };

    return NextResponse.json(marketingReport);
  } catch (error) {
    console.error('Error generating marketing report:', error);
    return NextResponse.json(
      { error: 'Failed to generate marketing report' },
      { status: 500 }
    );
  }
}
