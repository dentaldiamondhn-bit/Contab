import { NextRequest, NextResponse } from 'next/server';

// Planes públicos disponibles
const publicPlans = [
  {
    id: 'plan-basic',
    code: 'BASICO',
    name: 'Plan Básico',
    description: 'Plan básico de contabilidad con facturación electrónica y reportes básicos',
    unitPrice: 500,
    subtotal: 500,
    taxRate: 15,
    taxAmount: 75,
    total: 575
  },
  {
    id: 'plan-premium',
    code: 'PREMIUM',
    name: 'Plan Premium',
    description: 'Plan premium con contabilidad completa, nómina, inventario y reportes avanzados',
    unitPrice: 1000,
    subtotal: 1000,
    taxRate: 15,
    taxAmount: 150,
    total: 1150
  },
  {
    id: 'plan-enterprise',
    code: 'ENTERPRISE',
    name: 'Plan Enterprise',
    description: 'Plan enterprise con todos los módulos, soporte prioritario y personalización',
    unitPrice: 2000,
    subtotal: 2000,
    taxRate: 15,
    taxAmount: 300,
    total: 2300
  }
];

export async function GET(req: NextRequest) {
  try {
    console.log('🔄 GET /api/admin/plans-public - Enviando planes públicos');

    return NextResponse.json({
      success: true,
      plans: publicPlans,
      total: publicPlans.length
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/admin/plans-public:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
