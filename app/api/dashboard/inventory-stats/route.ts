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

    // Para nuevos tenants, devolver datos vacíos
    console.log('API: Returning empty inventory data for new tenant');
    const emptyStats = {
      totalProducts: 0,
      activeProducts: 0,
      lowStockProducts: 0,
      outOfStockProducts: 0,
      totalInventoryValue: 0,
      totalStockValue: 0,
      categories: [],
      recentMovements: [],
      monthlyStats: {
        currentMonth: 0,
        previousMonth: 0,
        growth: 0
      }
    };
    
    console.log('API: Returning empty inventory stats:', emptyStats);
    return NextResponse.json(emptyStats);
  } catch (error) {
    console.error('Error fetching inventory stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch inventory statistics' },
      { status: 500 }
    );
  }
}
