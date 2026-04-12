import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mockKpis = {
      occupancyRate: 75,
      revenuePerUnit: 15000,
      cac: 3000,
      operatingMargin: 25,
      cashFlow: 50000,
      inventoryTurnover: 4,
      maintenanceCost: 5,
      replacementFund: 9000
    };

    return NextResponse.json(mockKpis);
  } catch (error) {
    console.error('Error fetching KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch KPIs' },
      { status: 500 }
    );
  }
}
