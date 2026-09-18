import { NextRequest, NextResponse } from 'next/server';
import {
  isValidPdfType,
  pdfFileResponse,
  pdfFilename,
  renderPdfDocument,
} from '@/lib/services/pdf-documents';
import { fetchCompanyHeader, fetchInvoiceData } from '@/lib/services/pdf-data';
import { buildPdfDocument } from '@/lib/services/pdf-document-builder';
import { getBudgetComparison, isValidPeriod, resolveTenant } from '@/lib/services/budget-service';
import { getTransfer } from '@/lib/services/warehouse-service';
import { getDiatReport, hasDiatData } from '@/lib/services/diat-generator';
import { getVariationsReport } from '@/lib/services/period-variations';
import { getAllAuditLogs, getUserAuditLogs } from '@/lib/services/audit-service';
import { buildAuditPdfElement } from '@/lib/services/pdf-documents';

// GET /api/documents/pdf?type=invoice|transfer|budget|diat|variations&id=...&companyId=...[&period=YYYY-MM][&to=YYYY-MM][&tenantId=]
// Devuelve el PDF profesional del documento (attachment).
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') || '';
    const id = searchParams.get('id') || '';
    const companyId = searchParams.get('companyId') || '';
    const period = searchParams.get('period') || '';
    const tenantHint =
      request.headers.get('x-tenant-id') || searchParams.get('tenantId');

    if (!isValidPdfType(type)) {
      return NextResponse.json(
        { success: false, error: 'type debe ser invoice, transfer, budget, diat o variations' },
        { status: 400 },
      );
    }
    if (!companyId) {
      return NextResponse.json(
        { success: false, error: 'companyId es requerido' },
        { status: 400 },
      );
    }
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'id es requerido' },
        { status: 400 },
      );
    }

    if (type === 'invoice') {
      const data = await fetchInvoiceData(companyId, id, tenantHint);
      if (!data) {
        return NextResponse.json(
          { success: false, error: 'Factura no encontrada' },
          { status: 404 },
        );
      }
      const buffer = await renderPdfDocument(buildPdfDocument('invoice', data));
      return pdfFileResponse(buffer, pdfFilename('invoice', [data.invoice.invoiceNumber]));
    }

    if (type === 'transfer') {
      const transfer = await getTransfer(companyId, id, tenantHint);
      if (!transfer) {
        return NextResponse.json(
          { success: false, error: 'Traslado no encontrado' },
          { status: 404 },
        );
      }
      const company = await fetchCompanyHeader(companyId, tenantHint);
      const buffer = await renderPdfDocument(buildPdfDocument('transfer', { company, transfer }));
      return pdfFileResponse(buffer, pdfFilename('transfer', [transfer.transfer_number]));
    }

    // budget, diat y variations requieren período YYYY-MM.
    if (!period) {
      return NextResponse.json(
        { success: false, error: 'period es requerido (formato YYYY-MM)' },
        { status: 400 },
      );
    }
    if (!isValidPeriod(period)) {
      return NextResponse.json(
        { success: false, error: 'period debe tener el formato YYYY-MM (mes 01-12)' },
        { status: 400 },
      );
    }

    if (type === 'variations') {
      const to = searchParams.get('to') || '';
      if (!to) {
        return NextResponse.json(
          { success: false, error: 'to es requerido (formato YYYY-MM)' },
          { status: 400 },
        );
      }
      if (!isValidPeriod(to)) {
        return NextResponse.json(
          { success: false, error: 'to debe tener el formato YYYY-MM (mes 01-12)' },
          { status: 400 },
        );
      }
      if (period === to) {
        return NextResponse.json(
          { success: false, error: 'period y to deben ser diferentes' },
          { status: 400 },
        );
      }
      const tenant = await resolveTenant(companyId, tenantHint);
      const variations = await getVariationsReport(tenant, period, to);
      const company = await fetchCompanyHeader(companyId, tenantHint);
      const buffer = await renderPdfDocument(
        buildPdfDocument('variations', {
          company,
          report: {
            from: variations.from,
            to: variations.to,
            rows: variations.rows.map((r) => ({
              accountCode: r.code,
              accountName: r.name,
              fromBalance: r.fromBalance,
              toBalance: r.toBalance,
              varianceAbs: r.varAbs,
              variancePct: r.varPct,
              trend: r.trend,
            })),
            totals: {
              fromBalance: variations.totals.fromBalance,
              toBalance: variations.totals.toBalance,
              varianceAbs: variations.totals.varAbs,
              variancePct: variations.totals.varPct,
            },
            counts: variations.counts,
          },
        }),
      );
      return pdfFileResponse(buffer, pdfFilename('variations', [period, to]));
    }

    if (type === 'audit') {
      if (!companyId) {
        return NextResponse.json(
          { success: false, error: 'companyId es requerido' },
          { status: 400 },
        );
      }
      const tenant = await resolveTenant(companyId, tenantHint);
      const { data: logs, error } = await supabaseService
        .from('account_audit_log')
        .select('*, Account(code, name)', { count: 'exact' })
        .eq('tenant_id', tenant.id)
        .order('performed_at', { ascending: false });

      if (error) {
        return NextResponse.json({ success: false, error: error.message }, { status: 500 });
      }

      const enrichedLogs = (logs || []).map((log: any) => ({
        performed_at: log.performed_at,
        account_code: log.account_code || (log.Account?.code || ''),
        account_name: log.Account?.name || '',
        action: log.action,
        performed_by: log.performed_by || 'system',
      }));

      const company = await fetchCompanyHeader(companyId, tenantHint);
      const element = buildAuditPdfElement(enrichedLogs);
      const buffer = await renderPdfDocument(buildPdfDocument('audit', element));
      return pdfFileResponse(buffer, pdfFilename('audit', [company.name || companyId, `${enrichedLogs.length} logs`]));
    }

    if (type === 'budget') {
      const comparison = await getBudgetComparison(companyId, id, period, tenantHint);
      if (!comparison) {
        return NextResponse.json(
          { success: false, error: 'Presupuesto no encontrado' },
          { status: 404 },
        );
      }
      const company = await fetchCompanyHeader(companyId, tenantHint);
      const buffer = await renderPdfDocument(
        buildPdfDocument('budget', { company, comparison }),
      );
      return pdfFileResponse(
        buffer,
        pdfFilename('budget', [comparison.budget.name, period]),
      );
    }

    // type === 'diat' (id se ignora; el reporte es por empresa+período).
    if (!(await hasDiatData(companyId))) {
      return NextResponse.json(
        { success: false, error: 'No hay datos para el período solicitado' },
        { status: 404 },
      );
    }
    const report = await getDiatReport(companyId, period);
    const buffer = await renderPdfDocument(
      buildPdfDocument('diat', {
        company: {
          name: report.declarante.razonSocial,
          rtn: report.declarante.rtn,
          address: report.declarante.domicilioFiscal,
          phone: report.declarante.telefono,
          email: report.declarante.email,
        },
        report,
      }),
    );
    return pdfFileResponse(buffer, pdfFilename('diat', [companyId, period]));
  } catch (error) {
    console.error('Error generating PDF:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    if (/pertenece|formato/i.test(message)) {
      return NextResponse.json({ success: false, error: message }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
