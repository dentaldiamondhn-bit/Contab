import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const mockCosts = {
      fixed: {
        rent: 80000,
        salaries: 60000,
        insurance: 15000,
        internet: 2000,
        permits: 5000,
        utilities: 8000,
        maintenance: 10000
      },
      variable: {
        electricity: 12000,
        water: 3000,
        cleaning: 8000,
        materials: 25000,
        preventive: 5000
      }
    };

    return NextResponse.json(mockCosts);
  } catch (error) {
    console.error('Error fetching costs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch costs' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const body = await request.json();
    const { fixed, variable, periodMonth, periodYear } = body;

    if (!fixed || !variable || !periodMonth || !periodYear) {
      return NextResponse.json(
        { error: 'Missing required fields: fixed, variable, periodMonth, periodYear' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Costs updated successfully (mock)'
    });
  } catch (error) {
    console.error('Error updating costs:', error);
    return NextResponse.json(
      { error: 'Failed to update costs' },
      { status: 500 }
    );
  }
}
