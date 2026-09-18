import { NextRequest, NextResponse } from 'next/server';
import { fetchAndCalculateRatios } from '@/lib/financial-ratios';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tenantId = searchParams.get('tenantId') || request.headers.get('x-tenant-id') || '1';
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7);

    if (!tenantId) {
      return NextResponse.json({ error: 'Tenant ID requerido' }, { status: 400 });
    }

    const ratios = await fetchAndCalculateRatios(tenantId, period);

    if (ratios.length === 0) {
      return NextResponse.json(
        { error: 'No hay datos suficientes para calcular razones financieras' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: ratios,
      period,
      tenantId,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching financial ratios:', error);
    return NextResponse.json(
      { error: 'Error al generar las razones financieras' },
      { status: 500 }
    );
  }
}