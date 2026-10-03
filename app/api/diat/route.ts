import { NextRequest, NextResponse } from 'next/server';
import { getAvailableDiatPeriods, getDiatReport, hasDiatData } from '@/lib/services/diat-generator';
import { exigirEmpresa } from '@/lib/purchase-db';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

export async function GET(request: NextRequest) {
  try {
    // Antes solo se comprobaba que `?companyId` VINIERA, no que fuera del usuario:
    // `?companyId=<la que sea>` sacaba el DIAT de otra empresa. Ahora manda el
    // contexto, y el parametro solo se acepta si coincide con el.
    const empresa = exigirEmpresa(await contextoDeEmpresa(request));
    const { searchParams } = new URL(request.url);
    const solicitado = searchParams.get('companyId');
    const period = searchParams.get('period');

    if (solicitado && solicitado !== empresa.companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId no coincide con la empresa activa' },
        { status: 403 }
      );
    }

    const companyId = empresa.companyId;

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
    const r = respuestaDeErrorDeEmpresa(error);
    if (r) return r;
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