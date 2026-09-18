// Datos server-side para los PDFs (Supabase). Separado del render
// (pdf-documents.ts) para poder mockear datos sin mockear el motor PDF.

import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';
import type { CompanyHeader } from '@/components/reports/ProfessionalDoc';
import type { InvoicePdfData } from '@/components/reports/InvoicePDF';

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v === null || v === undefined ? '' : String(v);
}

export async function fetchCompanyHeader(
  companyId: string,
  tenantHint?: string | null,
): Promise<CompanyHeader> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);
  const byTenant = await supabase
    .from('companies')
    .select('*')
    .eq('tenant_id', tenantId)
    .limit(1)
    .maybeSingle();
  let row: Record<string, unknown> | null = (byTenant.data as Record<string, unknown> | null) || null;
  if (!row) {
    const byId = await supabase
      .from('companies')
      .select('*')
      .eq('id', companyId)
      .limit(1)
      .maybeSingle();
    row = (byId.data as Record<string, unknown> | null) || null;
  }
  if (!row) {
    return { name: companyId, rtn: '', address: '', phone: '', email: '' };
  }
  const pick = (...keys: string[]) => {
    for (const k of keys) {
      const v = row?.[k];
      if (v !== null && v !== undefined && String(v) !== '') return String(v);
    }
    return '';
  };
  return {
    name: pick('name', 'business_name', 'nombre') || companyId,
    rtn: pick('rtn', 'business_rtn'),
    address: pick('address', 'direccion_fiscal', 'business_address'),
    phone: pick('phone', 'telefono_fiscal'),
    email: pick('email', 'email_fiscal'),
  };
}

export async function fetchInvoiceData(
  companyId: string,
  invoiceId: string,
  tenantHint?: string | null,
): Promise<InvoicePdfData | null> {
  const supabase = getSupabaseServer();
  const tenantId = await resolveTenant(companyId, tenantHint);

  let inv: Record<string, unknown> | null = null;
  const byCamel = await supabase
    .from('Invoice')
    .select('*')
    .eq('id', invoiceId)
    .eq('tenantId', tenantId)
    .maybeSingle();
  if (!byCamel.error && byCamel.data) {
    inv = byCamel.data as Record<string, unknown>;
  } else {
    const bySnake = await supabase
      .from('Invoice')
      .select('*')
      .eq('id', invoiceId)
      .eq('tenant_id', tenantId)
      .maybeSingle();
    if (!bySnake.error && bySnake.data) inv = bySnake.data as Record<string, unknown>;
  }
  if (!inv) return null;

  const { data: items } = await supabase
    .from('InvoiceItem')
    .select('*')
    .eq('invoiceId', invoiceId)
    .order('createdAt', { ascending: true });

  const company = await fetchCompanyHeader(companyId, tenantId);
  const pick = (k: string) => str(inv?.[k]);
  return {
    company: {
      name: pick('issuerName') || company.name,
      rtn: pick('issuerRTN') || company.rtn,
      address: pick('issuerAddress') || company.address,
      phone: company.phone,
      email: company.email,
    },
    invoice: {
      invoiceNumber: pick('invoiceNumber') || invoiceId,
      invoiceType: pick('invoiceType') || 'FACTURA',
      status: pick('status') || '—',
      customerName: pick('customerName') || 'Consumidor final',
      customerRTN: pick('customerRTN'),
      customerEmail: pick('customerEmail'),
      customerAddress: pick('customerAddress'),
      issueDate: pick('issueDate').slice(0, 10),
      dueDate: pick('dueDate').slice(0, 10),
      cai: pick('cai'),
      subtotal: num(inv?.subtotal),
      tax: num(inv?.tax),
      total: num(inv?.total),
      taxRate: num((inv?.taxRate as number) ?? 15),
      notes: pick('notes'),
    },
    items: ((items || []) as Array<Record<string, unknown>>).map((it) => ({
      description: str(it.description) || 'Ítem',
      quantity: num(it.quantity),
      unitPrice: num(it.unitPrice),
      total: num(it.total),
      taxRate: num(it.taxRate),
    })),
  };
}
