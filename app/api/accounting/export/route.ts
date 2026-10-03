import { NextRequest, NextResponse } from "next/server";
import { exportTrialBalanceToPDF, exportTaxReportToPDF, exportPolizasToPDF } from "@/lib/services/pdf-export";
import { generateTrialBalance } from "@/lib/reports/trial-balance";
import { getSupabaseServer } from "@/lib/supabase/server-lazy";
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

/**
 * GET /api/accounting/export?module=trial-balance|tax-report&period=YYYY-MM&type=pdf|excel
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const module = searchParams.get("module") || "trial-balance";
    const period = searchParams.get("period") || new Date().toISOString().slice(0, 7);
    const exportType = searchParams.get("type") || "pdf";

    // Contexto validado (antes `?tenantId` del cliente no se comprobaba).
    const empresa = await contextoDeEmpresa(request);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "La empresa no tiene tenant asociado" }, { status: 400 });
    }
    const scope = filtroEmpresaOCompany(empresa);

    const [year, month] = period.split('-').map(Number);

    if (module === "tax-report") {
      const supa = getSupabaseServer();
      const { data: taxConfig } = await supa.from('TaxConfig').select('*').maybeSingle();
      const { data: sales } = await supa.from('Transaction').select('*').match(scope).eq('voucherType', 'INGRESO').gte('date', `${period}-01`).lte('date', `${period}-31`);
      const { data: purchases } = await supa.from('Transaction').select('*').match(scope).eq('voucherType', 'EGRESO').gte('date', `${period}-01`).lte('date', `${period}-31`);

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
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
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

    const empresa = await contextoDeEmpresa(request, {
      companyIdDeRuta: body?.companyId || undefined,
    });
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: "La empresa no tiene tenant asociado" }, { status: 400 });
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
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error("Error exporting polizas:", error);
    return NextResponse.json({ error: 'Error al generar el reporte' }, { status: 500 });
  }
}

export { POST };