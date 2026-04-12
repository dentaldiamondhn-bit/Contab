import { NextResponse } from 'next/server';

export async function GET() {
  try {
    // Simulate financial metrics data
    const financialMetrics = {
      totalRevenue: 2847650, // L. 28,476.50
      totalExpenses: 1894320, // L. 18,943.20
      cashOnHand: 427147,   // L. 4,271.47
      netProfit: 953330,    // L. 9,533.30
      currentMonthTax: 427147, // L. 4,271.47
      totalPatients: 1247,
      totalTransactions: 342,
      currentMonthTransactions: 89,
      avgTransactionValue: 8318,
      collectionRate: 85.5
    };

    return NextResponse.json(financialMetrics);
  } catch (error) {
    console.error('Error fetching financial metrics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch financial metrics' },
      { status: 500 }
    );
  }
}
