import { NextRequest, NextResponse } from 'next/server';

// Reporte de Mantenimiento y Activos
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Mock data para reporte de mantenimiento
    const maintenanceReport = {
      summary: {
        totalAssets: 15,
        assetsInGoodCondition: 12,
        assetsNeedingAttention: 2,
        assetsCritical: 1,
        monthlyMaintenanceCost: 45000,
        ytdMaintenanceCost: 285000,
        totalAssetValue: 2500000,
        totalDepreciation: 375000
      },
      // Activos/equipos por cubículo
      assets: [
        {
          id: 'asset-1',
          name: 'Unidad Dental Premium',
          cubicle: 'Cubículo 1',
          category: 'equipo_principal',
          purchaseDate: '2023-01-15',
          purchaseValue: 350000,
          currentValue: 297500,
          depreciation: 52500,
          status: 'bueno',
          hoursUsed: 2100,
          lastMaintenance: '2024-05-10',
          nextMaintenance: '2024-08-10',
          maintenanceStatus: 'verde',
          incidents: 1
        },
        {
          id: 'asset-2',
          name: 'Compresor de Aire',
          cubicle: 'General',
          category: 'infraestructura',
          purchaseDate: '2023-01-10',
          purchaseValue: 85000,
          currentValue: 72250,
          depreciation: 12750,
          status: 'bueno',
          hoursUsed: 4200,
          lastMaintenance: '2024-06-15',
          nextMaintenance: '2024-07-15',
          maintenanceStatus: 'amarillo',
          incidents: 0
        },
        {
          id: 'asset-3',
          name: 'Pieza de Mano NSK',
          cubicle: 'Cubículo 1',
          category: 'instrumental',
          purchaseDate: '2023-03-20',
          purchaseValue: 45000,
          currentValue: 38250,
          depreciation: 6750,
          status: 'atencion',
          hoursUsed: 1800,
          lastMaintenance: '2024-04-20',
          nextMaintenance: '2024-06-20',
          maintenanceStatus: 'amarillo',
          incidents: 3,
          notes: 'Ha fallado 3 veces este mes. Recomendación: revisión profunda'
        },
        {
          id: 'asset-4',
          name: 'Lámpara de Fotocurado',
          cubicle: 'Cubículo 3',
          category: 'equipo_secundario',
          purchaseDate: '2022-11-05',
          purchaseValue: 28000,
          currentValue: 21000,
          depreciation: 7000,
          status: 'critico',
          hoursUsed: 1500,
          lastMaintenance: '2024-02-15',
          nextMaintenance: '2024-05-15',
          maintenanceStatus: 'rojo',
          incidents: 5,
          notes: 'URGENTE: Falla constante. Requiere reemplazo inmediato'
        },
        {
          id: 'asset-5',
          name: 'Ejector de Vacío',
          cubicle: 'Cubículo 2',
          category: 'infraestructura',
          purchaseDate: '2023-02-10',
          purchaseValue: 32000,
          currentValue: 27200,
          depreciation: 4800,
          status: 'bueno',
          hoursUsed: 1600,
          lastMaintenance: '2024-06-01',
          nextMaintenance: '2024-09-01',
          maintenanceStatus: 'verde',
          incidents: 0
        }
      ],
      // Historial de incidencias
      incidents: {
        totalIncidents: 12,
        byMonth: [
          { month: 'Enero', count: 1 },
          { month: 'Febrero', count: 2 },
          { month: 'Marzo', count: 1 },
          { month: 'Abril', count: 3 },
          { month: 'Mayo', count: 2 },
          { month: 'Junio', count: 3 }
        ],
        byCategory: [
          { category: 'Equipo Principal', count: 4 },
          { category: 'Instrumental', count: 5 },
          { category: 'Infraestructura', count: 2 },
          { category: 'Equipo Secundario', count: 1 }
        ],
        recentIncidents: [
          {
            date: '2024-06-18',
            asset: 'Lámpara de Fotocurado',
            cubicle: 'Cubículo 3',
            issue: 'No enciende',
            cost: 2500,
            downtime: 4,
            status: 'pendiente'
          },
          {
            date: '2024-06-15',
            asset: 'Pieza de Mano NSK',
            cubicle: 'Cubículo 1',
            issue: 'Fuga de agua',
            cost: 800,
            downtime: 2,
            status: 'reparado'
          },
          {
            date: '2024-06-10',
            asset: 'Pieza de Mano NSK',
            cubicle: 'Cubículo 1',
            issue: 'Vibración excesiva',
            cost: 1200,
            downtime: 3,
            status: 'reparado'
          }
        ]
      },
      // Cronograma de mantenimiento preventivo
      preventiveSchedule: [
        {
          asset: 'Compresor de Aire',
          nextDate: '2024-07-15',
          daysRemaining: 5,
          type: 'Servicio trimestral',
          estimatedCost: 3500,
          status: 'pronto'
        },
        {
          asset: 'Unidad Dental Premium',
          nextDate: '2024-08-10',
          daysRemaining: 41,
          type: 'Mantenimiento semestral',
          estimatedCost: 8000,
          status: 'programado'
        },
        {
          asset: 'Lámpara de Fotocurado',
          nextDate: '2024-06-25',
          daysRemaining: -5,
          type: 'Revisión urgente',
          estimatedCost: 15000,
          status: 'vencido'
        }
      ],
      // Depreciación acumulada
      depreciation: {
        method: 'Línea recta',
        annualRate: 15,
        byYear: [
          { year: 2023, depreciation: 125000, accumulated: 125000 },
          { year: 2024, depreciation: 137500, accumulated: 262500 },
          { year: 2025, depreciation: 112500, accumulated: 375000 }
        ],
        projection: 'A este ritmo, se necesitará reinversión de $450,000 en 2026 para renovación de equipos críticos'
      },
      alerts: [
        {
          level: 'critical',
          message: 'Lámpara de Fotocurado en Cubículo 3 requiere reemplazo inmediato',
          action: 'Comprar nueva lámpara - Presupuesto: $28,000'
        },
        {
          level: 'warning',
          message: 'Pieza de Mano NSK tiene 3 fallas en el último mes',
          action: 'Programar revisión profunda - Presupuesto: $5,000'
        },
        {
          level: 'info',
          message: 'Compresor de Aire requiere servicio en 5 días',
          action: 'Contactar servicio técnico'
        }
      ]
    };

    return NextResponse.json(maintenanceReport);
  } catch (error) {
    console.error('Error generating maintenance report:', error);
    return NextResponse.json(
      { error: 'Failed to generate maintenance report' },
      { status: 500 }
    );
  }
}
