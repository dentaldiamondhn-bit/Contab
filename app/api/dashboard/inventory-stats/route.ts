import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    console.log('API: Loading inventory stats...');
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const period = searchParams.get('period') || 'month';

    console.log('API: Inventory Params:', { tenantId, period });

    if (!tenantId) {
      console.log('API: Missing tenantId');
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Datos de prueba realistas para el dashboard de inventario
    console.log('API: Returning inventory test data');
    const testStats = {
      totalProducts: 156,
      activeProducts: 142,
      lowStockProducts: 18,
      outOfStockProducts: 8,
      totalInventoryValue: 2850000, // L. 28,500.00
      totalStockValue: 1850000,     // L. 18,500.00
      categories: [
        {
          name: 'Electrónicos',
          productCount: 45,
          totalValue: 850000,    // L. 8,500.00
          stockLevel: 75
        },
        {
          name: 'Materiales de Construcción',
          productCount: 38,
          totalValue: 620000,    // L. 6,200.00
          stockLevel: 45
        },
        {
          name: 'Suministros de Oficina',
          productCount: 28,
          totalValue: 180000,    // L. 1,800.00
          stockLevel: 85
        },
        {
          name: 'Herramientas',
          productCount: 31,
          totalValue: 450000,    // L. 4,500.00
          stockLevel: 25
        },
        {
          name: 'Limpieza',
          productCount: 14,
          totalValue: 750000,    // L. 7,500.00
          stockLevel: 60
        }
      ],
      recentMovements: [
        {
          id: '1',
          productName: 'Laptop Dell Inspiron',
          type: 'IN',
          quantity: 5,
          unitCost: 1500000, // L. 15,000.00
          totalCost: 7500000, // L. 75,000.00
          date: new Date().toISOString(),
          reference: 'COMPRA-2024-001'
        },
        {
          id: '2',
          productName: 'Cemento Portland',
          type: 'OUT',
          quantity: 20,
          unitCost: 4500, // L. 45.00
          totalCost: 90000, // L. 900.00
          date: new Date(Date.now() - 86400000).toISOString(), // Ayer
          reference: 'VENTA-2024-045'
        },
        {
          id: '3',
          productName: 'Papel Bond A4',
          type: 'IN',
          quantity: 100,
          unitCost: 250, // L. 2.50
          totalCost: 25000, // L. 250.00
          date: new Date(Date.now() - 172800000).toISOString(), // Hace 2 días
          reference: 'COMPRA-2024-002'
        },
        {
          id: '4',
          productName: 'Taladro Inalámbrico',
          type: 'OUT',
          quantity: 3,
          unitCost: 85000, // L. 850.00
          totalCost: 255000, // L. 2,550.00
          date: new Date(Date.now() - 259200000).toISOString(), // Hace 3 días
          reference: 'VENTA-2024-043'
        }
      ],
      monthlyStats: {
        currentMonthValue: 2850000,
        previousMonthValue: 2450000,
        growth: 16.3
      }
    };
    
    console.log('API: Returning inventory test stats:', testStats);
    return NextResponse.json(testStats);
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory statistics' },
      { status: 500 }
    );
  }
}
