import { NextRequest, NextResponse } from 'next/server';

// Variable temporal para almacenar planes (simulación de base de datos)
let tempPlans = [
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
    features: ['Contabilidad básica', 'Facturación electrónica', 'Reportes básicos'],
    isActive: true
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
    features: ['Contabilidad completa', 'Facturación avanzada', 'Nómina', 'Inventario', 'Reportes avanzados'],
    isActive: true
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
    features: ['Todos los módulos', 'Soporte 24/7', 'Personalización', 'API access'],
    isActive: true
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
    features: ['Contabilidad básica', 'Facturación limitada', 'Reportes simples'],
    isActive: true
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
    features: ['Contabilidad intermedia', 'Facturación completa', 'Inventario básico', 'Reportes avanzados'],
    isActive: false
  }
];

export async function POST(req: NextRequest) {
  try {
    console.log('🔄 POST /api/admin/plans - Creando nuevo plan...');
    
    const newPlan = await req.json();
    console.log('📦 Datos del nuevo plan:', newPlan);
    
    // Agregar a la lista temporal
    const createdPlan = {
      ...newPlan,
      id: `plan-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    tempPlans.push(createdPlan);
    
    console.log('✅ Plan creado y agregado a la lista temporal:', createdPlan);

    return NextResponse.json({
      success: true,
      message: 'Plan creado exitosamente',
      plan: createdPlan
    });

  } catch (error: any) {
    console.error('❌ Error en POST /api/admin/plans:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  try {
    console.log('🔄 PATCH /api/admin/plans - Actualizando plan...');
    
    const updatedPlan = await req.json();
    console.log('📦 Datos del plan actualizado:', updatedPlan);
    
    // Actualizar en la lista temporal
    const index = tempPlans.findIndex(p => p.id === updatedPlan.id);
    if (index !== -1) {
      tempPlans[index] = { ...tempPlans[index], ...updatedPlan };
      console.log('✅ Plan actualizado en la lista temporal:', tempPlans[index]);
    } else {
      console.log('⚠️ Plan no encontrado en la lista temporal');
    }

    return NextResponse.json({
      success: true,
      message: 'Plan actualizado exitosamente',
      plan: updatedPlan
    });

  } catch (error: any) {
    console.error('❌ Error en PATCH /api/admin/plans:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    console.log('🔄 GET /api/admin/plans - Enviando planes temporales');

    return NextResponse.json({
      success: true,
      plans: tempPlans,
      total: tempPlans.length
    });

  } catch (error: any) {
    console.error('❌ Error en GET /api/admin/plans:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
