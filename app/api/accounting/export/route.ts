import { NextRequest, NextResponse } from "next/server";
import { exportTrialBalanceToPDF, exportToExcel } from "@/lib/services/pdf-export";
import { exportPolizasToPDF } from "@/lib/services/pdf-export";
import { generateTrialBalance } from "@/lib/reports/trial-balance";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

/**
 * GET /api/accounting/export/trial-balance?period=YYYY-MM&type=pdf|excel
 * Exporta balanza de comprobación a PDF o Excel
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
    const tenantId = searchParams.get("tenantId") || request.headers.get("x-tenant-id");
    const exportType = searchParams.get("type") || "pdf"; // pdf or excel

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    // Fechas del período
    const [year, month] = period.split('-').map(Number);
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    // Generar datos de la balanza
    const trialBalance = await generateTrialBalance(startDate, endDate);

    // Inicializar variable de datos para Excel
    let excelData: any = {};

    // Exportar según el tipo solicitado
    if (exportType === "excel") {
      // Datos para Excel
      excelData = {
        period,
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
        summary: {
          'ISV por Ventas': 0,
          'ISV por Compras': 0,
          'ISV a Pagar': 0
        }
      };
      
      const filename = `Balanza_Comprobacion_${period}.xlsx`;
      const mimeType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      
      return NextResponse.json({
        success: true,
        data: excelData,
        filename,
        message: 'Datos de Excel listos para descargar'
      });
    } else {
      // Exportar a PDF (original)
      const pdfBuffer = await exportTrialBalanceToPDF(trialBalance, {
        title: 'Balanza de Comprobación',
        period,
        companyName: 'Contab',
      });

      const filename = `Balanza_Comprobacion_${period}.pdf`;
      const mimeType = 'application/pdf';

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`
        }
      });
    }
  } catch (error) {
    console.error("Error exporting trial balance:", error);
    return NextResponse.json(
      { error: 'Error al generar el reporte' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/accounting/export/polizas
 * Exporta pólizas a PDF
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { polizas, options, type } = body;
    const tenantId = body.tenantId || request.headers.get("x-tenant-id");

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    if (!polizas || !Array.isArray(polizas)) {
      return NextResponse.json({ error: "Datos de pólizas inválidos" }, { status: 400 });
    }

    if (type === "excel") {
      // Datos para Excel
      const excelData = polizas.map((poliza: any) => ({
        'Número Póliza': poliza.voucherNumber,
        'Fecha': poliza.date,
        'Tipo': poliza.voucherType,
        'Descripción': poliza.description,
        'Total': poliza.totalAmount > 0 ? poliza.totalAmount : '0',
      }));
      
      const filename = `Reporte_Polizas_${new Date().toISOString().slice(0, 10)}.xlsx`;
      
      return NextResponse.json({
        success: true,
        data: excelData,
        filename,
        message: 'Datos de Pólizas en Excel listos para descargar'
      });
    } else {
      // Exportar a PDF (original)
      const pdfBuffer = await exportPolizasToPDF(polizas, {
        title: 'Reporte de Pólizas',
        ...options,
      });

      const filename = `Reporte_Polizas_${new Date().toISOString().slice(0, 10)}.pdf`;
      const mimeType = 'application/pdf';

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error("Error exporting polizas:", error);
    return NextResponse.json(
      { error: 'Error al generar el reporte' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/accounting/export/tax-report?period=YYYY-MM&type=pdf|excel
 * Exporta reporte de impuestos a PDF
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
    const tenantId = searchParams.get("tenantId") || request.headers.get("x-tenant-id");
    const exportType = searchParams.get("type") || "pdf"; // pdf or excel

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    // Obtener datos del impuesto desde Supabase
    const supa = getSupabaseServer();
    
    // Obtener configuración fiscal
    const { data: taxConfig, error: configError } = await supa
      .from('TaxConfig')
      .select('*')
      .maybeSingle();

    if (configError) {
      return NextResponse.json({ error: 'Configuración fiscal no encontrada' }, { status: 404 });
    }

    // Obtener ventas del período
    const { data: sales, error: salesError } = await supa
      .from('Transaction')
      .eq('tenantId', tenantId)
      .eq('voucherType', 'INGRESO')
      .gte('date', `${period}-01`)
      .lte('date', `${period}-31`);

    if (salesError) {
      return NextResponse.json({ error: 'Error al obtener ventas' }, { status: 400 });
    }

    // Obtener compras del período
    const { data: purchases, error: purchasesError } = await supa
      .from('Transaction')
      .eq('tenantId', tenantId)
      .eq('voucherType', 'EGRESO')
      .gte('date', `${period}-01`)
      .lte('date', `${period}-31`);

    if (purchasesError) {
      return NextResponse.json({ error: 'Error al obtener compras' }, { status: 400 });
    }

    // Calcular totales
    const totalBaseVentas = sales?.reduce((sum: number, tx: any) => sum + tx.totalAmount, 0) || 0;
    const totalTaxVentas = sales?.reduce((sum: number, tx: any) => {
      // ISV 15% sobre la base
      const base = tx.totalAmount / 1.15;
      return sum + (base * 0.15);
    }) || 0;

    const totalBaseCompras = purchases?.reduce((sum: number, tx: any) => sum + tx.totalAmount, 0) || 0;
    const totalTaxCompras = purchases?.reduce((sum: number, tx: any) => {
      const base = tx.totalAmount / 1.15;
      return sum + (base * 0.15);
    }) || 0;

    const totalTaxAPagar = totalTaxVentas - totalTaxCompras;

    const taxReport = {
      period,
      taxConfig: {
        rate: taxConfig?.rate ?? 0.15,
      },
      sales: {
        totalBase: totalBaseVentas,
        totalTax: totalTaxVentas,
        details: [], // Se podría enriquecer con más datos
      },
      purchases: {
        totalBase: totalBaseCompras,
        totalTax: totalTaxCompras,
        details: [],
      },
      summary: {
        totalTaxToPay: totalTaxAPagar,
      },
    };

    if (exportType === "excel") {
      excelData = {
        period,
        taxConfig: { rate: taxReport.taxConfig.rate },
        sales: {
          totalBase: taxReport.sales.totalBase,
          totalTax: taxReport.sales.totalTax,
          details: taxReport.sales.details.map((d: any) => ({
            'Código Cuenta': d.accountCode,
            'Descripción': d.accountName,
            'Base Imponible': d.totalBase,
            'ISV': d.totalTax,
            'Tasa': `${(d.effectiveRate * 100).toFixed(2)}%`
          }))
        },
        purchases: {
          totalBase: taxReport.purchases.totalBase,
          totalTax: taxReport.purchases.totalTax,
          details: taxReport.purchases.details.map((d: any) => ({
            'Código Cuenta': d.accountCode,
            'Descripción': d.accountName,
            'Base Imponible': d.totalBase,
            'ISV': d.totalTax,
            'Tasa': `${(d.effectiveRate * 100).toFixed(2)}%`
          }))
        },
        summary: {
          'ISV por Ventas': taxReport.sales.totalTax,
          'ISV por Compras': taxReport.purchases.totalTax,
          'ISV a Pagar': taxReport.summary.totalTaxToPay
        }
      };
      
      const filename = `Reporte_ISV_${period}.xlsx`;
      
      return NextResponse.json({
        success: true,
        data: excelData,
        filename,
        message: 'Datos de reporte fiscal en Excel listos para descargar'
      });
    } else {
      // Exportar a PDF (original)
      const pdfBuffer = await exportTaxReportToPDF(taxReport, {
        title: 'Reporte ISV - SAR',
        period,
        companyName: 'Contab',
      });

      const filename = `Reporte_ISV_${period}.pdf`;
      const mimeType = 'application/pdf';

      return new NextResponse(pdfBuffer, {
        headers: {
          'Content-Type': mimeType,
          'Content-Disposition': `attachment; filename="${filename}"`,
        },
      });
    }
  } catch (error) {
    console.error("Error exporting tax report:", error);
    return NextResponse.json(
      { error: 'Error al generar el reporte fiscal' },
      { status: 500 }
    );
  }
}

export { GET as trialBalance, POST };