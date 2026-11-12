import { NextRequest, NextResponse } from "next/server";
import { exportTrialBalanceToPDF, exportPolizasToPDF, exportTaxReportToPDF } from '@/lib/services/pdf-export';

/**
 * GET /api/pdf-export
 * 
 * Parámetros de consulta:
 * - type: 'trial-balance' | 'polizas' | 'tax-report'
 * - id: ID del recurso a exportar
 * - options: JSON string con opciones de exportación
 * 
 * Respuesta: { success, signedUrl, expiresAt } o { error }
 */
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get('type');
  const id = searchParams.get('id');
  const optionsStr = searchParams.get('options');

  if (!type) {
    return NextResponse.json({ error: 'Parameter "type" is required' }, { status: 400 });
  }

  try {
    let result;

    switch (type) {
      case 'trial-balance':
        if (!id) {
          return NextResponse.json({ error: 'Parameter "id" is required for trial-balance' }, { status: 400 });
        }
        // Obtener datos de la balanza - en producción vendría del DB
        const trialBalance = {
          period: {
            startDate: new Date(),
            endDate: new Date(),
          },
          accounts: [],
          totalOpeningBalance: 0,
          totalDebits: 0,
          totalCredits: 0,
          totalEndingBalance: 0,
          totalTrialDebits: 0,
          totalTrialCredits: 0,
          isBalanced: true,
          periodStartDate: new Date(),
          periodEndDate: new Date(),
        };
        result = await exportTrialBalanceToPDF(trialBalance, optionsStr ? JSON.parse(optionsStr) : undefined);
        break;

      case 'polizas':
        if (!id) {
          return NextResponse.json({ error: 'Parameter "id" is required for polizas' }, { status: 400 });
        }
        // En producción obtendríamos las pólizas del DB
        const polizas = [];
        result = await exportPolizasToPDF(polizas, optionsStr ? JSON.parse(optionsStr) : undefined);
        break;

      case 'tax-report':
        if (!id) {
          return NextResponse.json({ error: 'Parameter "id" is required for tax-report' }, { status: 400 });
        }
        // En producción obtendríamos el reporte de impuestos del DB
        const taxReport = {
          period: '2024-01',
          taxConfig: { rate: 0.15 },
          sales: {
            totalBase: 0,
            totalTax: 0,
            details: [],
          },
          purchases: {
            totalBase: 0,
            totalTax: 0,
            details: [],
          },
          summary: { totalTaxToPay: 0 },
        };
        result = await exportTaxReportToPDF(taxReport, optionsStr ? JSON.parse(optionsStr) : undefined);
        break;

      default:
        return NextResponse.json({ error: `Unknown PDF type: ${type}` }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to generate PDF' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signedUrl: result.signedUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

  } catch (error) {
    console.error('PDF export error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/pdf-export
 * 
 * Cuerpo JSON con los datos necesarios para generar el PDF.
 * Útil para tipos complejos donde los datos vienen en el body en lugar de query params.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, data, options } = body;

    if (!type || !data) {
      return NextResponse.json({ error: 'Parameters "type" and "data" are required' }, { status: 400 });
    }

    let result;

    switch (type) {
      case 'trial-balance':
        result = await exportTrialBalanceToPDF(data, options);
        break;
      case 'polizas':
        result = await exportPolizasToPDF(data, options);
        break;
      case 'tax-report':
        result = await exportTaxReportToPDF(data, options);
        break;
      default:
        return NextResponse.json({ error: `Unknown PDF type: ${type}` }, { status: 400 });
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error || 'Failed to generate PDF' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      signedUrl: result.signedUrl,
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    });

  } catch (error) {
    console.error('PDF export POST error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}