import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    console.log('API: Loading invoice stats...');
    
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId');
    const period = searchParams.get('period') || 'month';

    console.log('API: Params:', { tenantId, period });

    if (!tenantId) {
      console.log('API: Missing tenantId');
      return NextResponse.json({ error: 'tenantId is required' }, { status: 400 });
    }

    // Datos de prueba realistas para el dashboard
    console.log('API: Returning test data');
    const testStats = {
      totalInvoices: 25,
      paidInvoices: 18,
      pendingInvoices: 6,
      overdueInvoices: 1,
      totalRevenue: 1250000, // L. 12,500.00
      pendingRevenue: 250000,  // L. 2,500.00
      paidRevenue: 1000000,   // L. 10,000.00
      paymentMethods: {
        cash: 400000,    // L. 4,000.00
        card: 350000,    // L. 3,500.00
        transfer: 200000, // L. 2,000.00
        other: 50000     // L. 500.00
      },
      monthlyStats: {
        currentMonth: 1250000,
        previousMonth: 1000000,
        growth: 25.0
      }
    };
    
    console.log('API: Returning test stats:', testStats);
    return NextResponse.json(testStats);
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice statistics' },
      { status: 500 }
    );
  }
}
