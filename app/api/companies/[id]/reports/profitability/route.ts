import { NextRequest, NextResponse } from 'next/server';

// Reporte de Rentabilidad por Cubículo
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Mock data para reporte de rentabilidad por cubículo
    const profitabilityReport = {
      summary: {
        totalCubicles: 10,
        activeCubicles: 8,
        totalRevenue: 1250000, // HNL
        totalCosts: 875000,
        netMargin: 375000,
        marginPercentage: 30
      },
      cubicles: [
        {
          id: 'cub-1',
          name: 'Cubículo 1 - Dental Pro',
          tenant: 'Dr. García',
          equipmentLevel: 'premium',
          grossIncome: 150000,
          operatingCosts: {
            electricity: 8500,
            maintenance: 12000,
            supplies: 8000,
            depreciation: 15000
          },
          totalCosts: 43500,
          netMargin: 106500,
          marginPercentage: 71,
          occupancyHours: 720, // de 800 disponibles (90%)
          occupancyRate: 90,
          hourlyRate: 208
        },
        {
          id: 'cub-2',
          name: 'Cubículo 2 - Estándar',
          tenant: 'Dra. Hernández',
          equipmentLevel: 'standard',
          grossIncome: 120000,
          operatingCosts: {
            electricity: 7200,
            maintenance: 9000,
            supplies: 6500,
            depreciation: 12000
          },
          totalCosts: 34700,
          netMargin: 85200,
          marginPercentage: 71,
          occupancyHours: 640,
          occupancyRate: 80,
          hourlyRate: 188
        },
        {
          id: 'cub-3',
          name: 'Cubículo 3 - Premium',
          tenant: 'Dr. López',
          equipmentLevel: 'premium',
          grossIncome: 160000,
          operatingCosts: {
            electricity: 9500,
            maintenance: 14000,
            supplies: 9000,
            depreciation: 18000
          },
          totalCosts: 50500,
          netMargin: 109500,
          marginPercentage: 68,
          occupancyHours: 760,
          occupancyRate: 95,
          hourlyRate: 211
        },
        {
          id: 'cub-4',
          name: 'Cubículo 4 - Estándar',
          tenant: 'Dra. Martínez',
          equipmentLevel: 'standard',
          grossIncome: 110000,
          operatingCosts: {
            electricity: 6800,
            maintenance: 8500,
            supplies: 6000,
            depreciation: 11000
          },
          totalCosts: 32300,
          netMargin: 77700,
          marginPercentage: 71,
          occupancyHours: 560,
          occupancyRate: 70,
          hourlyRate: 196
        },
        {
          id: 'cub-5',
          name: 'Cubículo 5 - Vacante',
          tenant: null,
          equipmentLevel: 'standard',
          grossIncome: 0,
          operatingCosts: {
            electricity: 6000,
            maintenance: 5000,
            supplies: 0,
            depreciation: 11000
          },
          totalCosts: 22000,
          netMargin: -22000,
          marginPercentage: -100,
          occupancyHours: 0,
          occupancyRate: 0,
          hourlyRate: 0
        }
      ],
      vacantHoursAnalysis: {
        totalVacantHours: 440,
        costPerVacantHour: 137.5,
        potentialLostRevenue: 60500,
        recommendations: [
          'Cubículo 5 lleva 15 días vacante. Considerar oferta de lanzamiento',
          'Promover horarios 8PM-10PM con tarifa preferencial del 20%',
          'Optimizar uso de Cubículo 4 que tiene 30% de disponibilidad'
        ]
      }
    };

    return NextResponse.json(profitabilityReport);
  } catch (error) {
    console.error('Error generating profitability report:', error);
    return NextResponse.json(
      { error: 'Failed to generate profitability report' },
      { status: 500 }
    );
  }
}
