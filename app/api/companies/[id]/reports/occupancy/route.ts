import { NextRequest, NextResponse } from 'next/server';

// Reporte de Ocupación y Estacionalidad
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Mock data para reporte de ocupación
    const occupancyReport = {
      summary: {
        averageOccupancyRate: 78,
        peakOccupancyRate: 95,
        lowOccupancyRate: 45,
        totalHoursAvailable: 8000,
        totalHoursRented: 6240,
        retentionRate: 85, // 85% de arrendatarios recurrentes
        newTenants: 2,
        churnedTenants: 1
      },
      // Mapa de calor por horario (horas pico)
      heatmapByHour: [
        { hour: '2:00 PM - 3:00 PM', occupancy: 60, demand: 'media' },
        { hour: '3:00 PM - 4:00 PM', occupancy: 85, demand: 'alta' },
        { hour: '4:00 PM - 5:00 PM', occupancy: 95, demand: 'pico' },
        { hour: '5:00 PM - 6:00 PM', occupancy: 90, demand: 'alta' },
        { hour: '6:00 PM - 7:00 PM', occupancy: 75, demand: 'media' },
        { hour: '7:00 PM - 8:00 PM', occupancy: 65, demand: 'media' },
        { hour: '8:00 PM - 9:00 PM', occupancy: 50, demand: 'baja' },
        { hour: '9:00 PM - 10:00 PM', occupancy: 40, demand: 'baja' }
      ],
      // Análisis por día de la semana
      occupancyByDay: [
        { day: 'Lunes', occupancy: 80, totalHours: 160 },
        { day: 'Martes', occupancy: 85, totalHours: 170 },
        { day: 'Miércoles', occupancy: 90, totalHours: 180 },
        { day: 'Jueves', occupancy: 75, totalHours: 150 },
        { day: 'Viernes', occupancy: 65, totalHours: 130 },
        { day: 'Sábado', occupancy: 50, totalHours: 100 },
        { day: 'Domingo', occupancy: 20, totalHours: 40 }
      ],
      // Retención de arrendatarios
      tenantRetention: {
        totalTenants: 8,
        returningTenants: 6,
        returningPercentage: 75,
        newTenants: 2,
        churnedLastMonth: 1,
        averageTenure: 8.5, // meses promedio
        retentionByTenant: [
          { name: 'Dr. García', months: 12, status: 'recurrente', revenue: 1800000 },
          { name: 'Dra. Hernández', months: 10, status: 'recurrente', revenue: 1440000 },
          { name: 'Dr. López', months: 8, status: 'recurrente', revenue: 1920000 },
          { name: 'Dra. Martínez', months: 3, status: 'nuevo', revenue: 440000 },
          { name: 'Dr. Flores', months: 6, status: 'recurrente', revenue: 1080000 }
        ]
      },
      // Estacionalidad histórica
      seasonality: {
        months: [
          { month: 'Enero', occupancy: 75, yearOverYear: -5 },
          { month: 'Febrero', occupancy: 80, yearOverYear: +2 },
          { month: 'Marzo', occupancy: 85, yearOverYear: +5 },
          { month: 'Abril', occupancy: 78, yearOverYear: -3 },
          { month: 'Mayo', occupancy: 82, yearOverYear: +4 },
          { month: 'Junio', occupancy: 70, yearOverYear: -8 }
        ],
        trends: [
          'Marzo es el mes con mayor ocupación (85%)',
          'Junio muestra tendencia baja por vacaciones',
          'Los martes y miércoles son los días más demandados'
        ]
      },
      recommendations: [
        {
          type: 'pricing',
          title: 'Tarifa preferencial 8PM-10PM',
          description: 'Ofrecer 20% de descuento en horarios de baja demanda para aumentar ocupación',
          potentialImpact: '+15% ocupación en horarios nocturnos'
        },
        {
          type: 'operations',
          title: 'Promover horarios intermedios',
          description: 'Crear paquetes especiales para horarios 2PM-4PM y 7PM-8PM',
          potentialImpact: '+10% ingresos totales'
        }
      ]
    };

    return NextResponse.json(occupancyReport);
  } catch (error) {
    console.error('Error generating occupancy report:', error);
    return NextResponse.json(
      { error: 'Failed to generate occupancy report' },
      { status: 500 }
    );
  }
}
