import { NextRequest, NextResponse } from 'next/server';
import { fetchAndCalculateRatios } from '@/lib/financial-ratios';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    // Contexto validado: antes se tomaba ?companyId/?tenantId del cliente sin
    // comprobar pertenencia (y el helper trabaja por tenant). El companyId de
    // la ruta lo resuelve `contextoDeEmpresa`.
    const empresa = await contextoDeEmpresa(request);
    if (!empresa.tenantId) {
      return NextResponse.json({ error: 'La empresa no tiene tenant asociado' }, { status: 400 });
    }
    const period = searchParams.get('period') || new Date().toISOString().slice(0, 7);

    const ratios = await fetchAndCalculateRatios(empresa.tenantId, period);

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
      tenantId: empresa.tenantId,
      companyId: empresa.companyId,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('Error fetching financial ratios:', error);
    return NextResponse.json(
      { error: 'Error al generar las razones financieras' },
      { status: 500 }
    );
  }
}