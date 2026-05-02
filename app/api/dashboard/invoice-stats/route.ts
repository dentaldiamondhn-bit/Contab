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

    // Para nuevos tenants, devolver datos vacíos
    console.log('API: Returning empty data for new tenant');
    const emptyStats = {
      totalInvoices: 0,
      paidInvoices: 0,
      pendingInvoices: 0,
      overdueInvoices: 0,
      totalRevenue: 0,
      pendingRevenue: 0,
      paidRevenue: 0,
      paymentMethods: {
        cash: 0,
        card: 0,
        transfer: 0,
        other: 0
      },
      monthlyStats: {
        currentMonth: 0,
        previousMonth: 0,
        growth: 0
      }
    };

    console.log('API: Returning empty stats:', emptyStats);
    return NextResponse.json(emptyStats);
  } catch (error) {
    console.error('Error fetching invoice stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch invoice statistics' },
      { status: 500 }
    );
  }
}
