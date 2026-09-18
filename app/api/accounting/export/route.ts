import { NextRequest, NextResponse } from "next/server";
import { exportTrialBalanceToPDF, exportTaxReportToPDF, exportPolizasToPDF } from "@/lib/services/pdf-export";
import { generateTrialBalance } from "@/lib/reports/trial-balance";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";

/**
 * GET /api/accounting/export?module=trial-balance|tax-report&period=YYYY-MM&type=pdf|excel
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module") || "trial-balance";
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
    const tenantId = searchParams.get("tenantId") || request.headers.get("x-tenant-id");
    const exportType = searchParams.get("type") || "pdf";

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant ID requerido" }, { status: 400 });
    }

    const [year, month] = period.split('-').map(Number);

    if (module === "tax-report") {
      const supa = getSupabaseServer();
      const { data: taxConfig } = await supa.from('TaxConfig').select('*').maybeSingle();
      const { data: sales } = await supa.from('Transaction').eq('tenantId', tenantId).eq('voucherType', 'INGRESO').gte('date', `${period}-01`).lte('date', `${period}-31`);
      const { data: purchases } = await supa.from('Transaction').eq('tenantId', tenantId).eq('voucherType', 'EGRESO').gte('date', `${period}-01`).lte('date', `${period}-31`);

      const totalBaseVentas = sales?.reduce((sum: number, tx: any) => sum + tx.totalAmount, 0) || 0;
      const totalTaxVentas = sales?.reduce((sum: number, tx: any) => { const base = tx.totalAmount / 1.15; return sum + (base * 0.15); }, 0) || 0;
      const totalBaseCompras = purchases?.reduce((sum: number, tx: any) => sum + tx.totalAmount, 0) || 0;
      const totalTaxCompras = purchases?.reduce((sum: number, tx: any) => { const base = tx.totalAmount / 1.15; return sum + (base * 0.15); }, 0) || 0;

      const taxReport = {
        period,
        taxConfig: { rate: taxConfig?.rate ?? 0.15 },
        sales: { totalBase: totalBaseVentas, totalTax: totalTaxVentas, details: [] },
        purchases: { totalBase: totalBaseCompras, totalTax: totalTaxCompras, details: [] },
        summary: { totalTaxToPay: totalTaxVentas - totalTaxCompras },
      };

      if (exportType === "excel") {
        return NextResponse.json({ success: true, data: taxReport, filename: `Reporte_ISV_${period}.xlsx` });
      } else {
        const signedUrl = await exportTaxReportToPDF(tenantId, taxReport as any, { title: 'Reporte ISV - SAR', period, companyName: 'Contab' });
        return NextResponse.json({ success: true, signedUrl });
      }
    }

    // Default: trial-balance
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    const trialBalance = await generateTrialBalance(startDate, endDate);

    if (exportType === "excel") {
      return NextResponse.json({ success: true, data: { period }, filename: `Balanza_Comprobacion_${period}.xlsx` });
    } else {
      const signedUrl = await exportTrialBalanceToPDF(tenantId, trialBalance, { title: 'Balanza de Comprobación', period, companyName: 'Contab' });
      return NextResponse.json({ success: true, signedUrl });
    }
  } catch (error) {
    console.error("Error exporting:", error);
    return NextResponse.json({ error: 'Error al generar el reporte' }, { status: 500 });
  }
}

/**
 * POST /api/accounting/export - Exporta pólizas a PDF
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
      return NextResponse.json({ success: true, data: polizas, filename: `Reporte_Polizas_${new Date().toISOString().slice(0, 10)}.xlsx` });
    } else {
      const signedUrl = await exportPolizasToPDF(tenantId, polizas, { title: 'Reporte de Pólizas', ...options });
      return NextResponse.json({ success: true, signedUrl });
    }
  } catch (error) {
    console.error("Error exporting polizas:", error);
    return NextResponse.json({ error: 'Error al generar el reporte' }, { status: 500 });
  }
}

export { POST };