import { NextRequest, NextResponse } from 'next/server';

// Todos los planes disponibles del sistema
const availablePlans = [
  {
    id: 'plan-basic',
    code: 'BASICO',
    name: 'Plan Básico',
    description: 'Plan básico de contabilidad con facturación electrónica y reportes básicos',
    unitPrice: 500,
    subtotal: 500,
    taxRate: 15,
    taxAmount: 75,
    total: 575,
    maxUsers: 5,
    features: ['Contabilidad básica', 'Facturación electrónica', 'Reportes básicos']
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
    total: 1150,
    maxUsers: 20,
    features: ['Contabilidad completa', 'Facturación avanzada', 'Nómina', 'Inventario', 'Reportes avanzados']
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
    total: 2300,
    maxUsers: 50,
    features: ['Todos los módulos', 'Soporte 24/7', 'Personalización', 'API access']
  },
  {
    id: 'plan-starter',
    code: 'STARTER',
    name: 'Plan Starter',
    description: 'Plan inicial para pequeñas empresas con funcionalidades básicas',
    unitPrice: 200,
    subtotal: 200,
    taxRate: 15,
    taxAmount: 30,
    total: 230,
    maxUsers: 3,
    features: ['Contabilidad básica', 'Facturación limitada', 'Reportes simples']
  },
  {
    id: 'plan-growth',
    code: 'GROWTH',
    name: 'Plan Growth',
    description: 'Plan para empresas en crecimiento con funcionalidades intermedias',
    unitPrice: 750,
    subtotal: 750,
    taxRate: 15,
    taxAmount: 112.50,
    total: 862.50,
    maxUsers: 15,
    features: ['Contabilidad intermedia', 'Facturación completa', 'Inventario básico', 'Reportes avanzados']
  }
];

export async function GET(req: NextRequest) {
  try {
    console.log('🔄 GET /api/admin/plans - Enviando todos los planes disponibles');

    return NextResponse.json({
      success: true,
      plans: availablePlans,
      total: availablePlans.length
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/admin/plans:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
