import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const mockCustomKpis = [
      {
        id: 'kpi-1',
        name: 'ROI Marketing',
        description: 'Retorno de inversión en marketing',
        unit: '%',
        value: 15.0,
        target: 20.0,
        category: 'custom',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'kpi-2',
        name: 'Ticket Promedio',
        description: 'Valor promedio por cliente',
        unit: 'HNL',
        value: 2500.0,
        target: 3000.0,
        category: 'custom',
        isActive: true,
        createdAt: new Date().toISOString()
      },
      {
        id: 'kpi-3',
        name: 'Satisfacción Cliente',
        description: 'Nivel de satisfacción del cliente',
        unit: '%',
        value: 85.0,
        target: 90.0,
        category: 'custom',
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ];

    return NextResponse.json(mockCustomKpis);
  } catch (error) {
    console.error('Error fetching custom KPIs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch custom KPIs' },
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
    const { name, description, unit, value, target, category = 'custom' } = body;

    if (!name || !unit || value === undefined || target === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: name, unit, value, target' },
        { status: 400 }
      );
    }

    const mockKPI = {
      id: `kpi-${Date.now()}`,
      name,
      description: description || null,
      value: Number(value),
      target: Number(target),
      unit,
      category,
      isActive: true,
      createdAt: new Date().toISOString()
    };

    return NextResponse.json({
      success: true,
      message: 'Custom KPI created successfully (mock)',
      data: mockKPI
    });
  } catch (error) {
    console.error('Error creating custom KPI:', error);
    return NextResponse.json(
      { error: 'Failed to create custom KPI' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // TEMPORARY: Return mock response until database connection is fixed
    console.log('Returning mock DELETE response for custom KPI due to database connection issues');
    
    const { searchParams } = new URL(request.url);
    const kpiId = searchParams.get('id');

    if (!kpiId) {
      return NextResponse.json(
        { error: 'KPI ID is required' },
        { status: 400 }
      );
    }

    // Simulate successful deletion
    return NextResponse.json({
      success: true,
      message: 'Custom KPI deleted successfully (mock)'
    });
  } catch (error) {
    console.error('Error deleting custom KPI:', error);
    return NextResponse.json(
      { error: 'Failed to delete custom KPI' },
      { status: 500 }
    );
  }
}
