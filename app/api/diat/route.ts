import { NextRequest, NextResponse } from 'next/server';
import { getAvailableDiatPeriods, getDiatReport, hasDiatData } from '@/lib/services/diat-generator';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');
    const period = searchParams.get('period');

    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId es requerido' },
        { status: 400 }
      );
    }

    if (period && !/^\d{4}-(0[1-9]|1[0-2])$/.test(period)) {
      return NextResponse.json(
        { success: false, error: 'period debe tener el formato YYYY-MM (mes 01-12)' },
        { status: 400 }
      );
    }

    const availablePeriods = await getAvailableDiatPeriods(companyId);

    if (period && !(await hasDiatData(companyId))) {
      return NextResponse.json(
        { success: false, error: 'No hay datos para el período solicitado' },
        { status: 404 }
      );
    }

    const report = period ? await getDiatReport(companyId, period) : null;

    return NextResponse.json({
      success: true,
      data: {
        companyId,
        availablePeriods,
        report,
      },
    });
  } catch (error) {
    console.error('Error in DIAT API:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Error interno',
      },
      { status: 500 }
    );
  }
}