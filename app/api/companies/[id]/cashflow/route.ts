import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mockCashFlow = [
      {
        month: '2026-01',
        income: 450000,
        expenses: 350000,
        netCashFlow: 100000,
        cumulativeCashFlow: 100000
      },
      {
        month: '2026-02',
        income: 480000,
        expenses: 360000,
        netCashFlow: 120000,
        cumulativeCashFlow: 220000
      },
      {
        month: '2026-03',
        income: 520000,
        expenses: 380000,
        netCashFlow: 140000,
        cumulativeCashFlow: 360000
      },
      {
        month: '2026-04',
        income: 500000,
        expenses: 370000,
        netCashFlow: 130000,
        cumulativeCashFlow: 490000
      }
    ];

    return NextResponse.json(mockCashFlow);
  } catch (error) {
    console.error('Error fetching cash flow:', error);
    return NextResponse.json(
      { error: 'Failed to fetch cash flow' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { month, income, expenses, periodMonth, periodYear } = body;

    if (!month || income === undefined || expenses === undefined || !periodMonth || !periodYear) {
      return NextResponse.json(
        { error: 'Missing required fields: month, income, expenses, periodMonth, periodYear' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cash flow data updated successfully (mock)'
    });
  } catch (error) {
    console.error('Error updating cash flow:', error);
    return NextResponse.json(
      { error: 'Failed to update cash flow' },
      { status: 500 }
    );
  }
}
