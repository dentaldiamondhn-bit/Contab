import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';
import { sanitizeBusinessEmail, sanitizeBusinessRTN } from '@/lib/billing/issuer-sanitizer';

function tenantHint(request: NextRequest): string | null {
  return (
    request.headers.get('x-tenant-id') || new URL(request.url).searchParams.get('tenantId')
  );
}

function num(value: unknown): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const n = parseFloat(value);
    return Number.isFinite(n) ? n : 0;
  }
  return 0;
}

interface Emisor {
  businessName: string;
  businessRTN: string;
  businessEmail: string;
  businessAddress: string;
  phoneNumber: string;
  logoUrl: string | null;
}

// La tabla `cai` mezcla dos esquemas: el legacy en ingles (lo usa la emision de
// facturas) y el en espanol (`cai_number`, `rango_*`, `estado`, ...). Todos los
// campos son opcionales porque cada registro puede tener ambos o solo uno.
interface CaiRow {
  id: string;
  cai?: string | null;
  cai_number?: string | null;
  start_number?: number | string | null;
  end_number?: number | string | null;
  current_number?: number | string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  status?: string | null;
  rango_inicial?: number | string | null;
  rango_final?: number | string | null;
  current_correlative?: number | string | null;
  fecha_asignacion?: string | null;
  fecha_limite_emision?: string | null;
  estado?: string | null;
}

interface PrintSettings {
  footerText: string;
  showQR: boolean;
  showBarcode: boolean;
  currency: string;
  language: string;
}

interface TaxEntry {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
}

interface TaxConfig {
  defaultRate: number;
  applyTax: boolean;
  taxes: TaxEntry[];
}

interface InvoiceSettings {
  print: PrintSettings;
  tax: TaxConfig;
}

const DEFAULT_SETTINGS: InvoiceSettings = {
  print: {
    footerText: 'Gracias por su compra.',
    showQR: true,
    showBarcode: false,
    currency: 'HNL',
    language: 'es',
  },
  tax: {
    defaultRate: 15,
    applyTax: true,
    taxes: [
      { id: 'isv-15', name: 'ISV 15%', rate: 15, isDefault: true, isActive: true },
      { id: 'isv-18', name: 'ISV 18%', rate: 18, isDefault: false, isActive: true },
    ],
  },
};

function sanitizeTaxes(raw: unknown): TaxEntry[] {
  if (!Array.isArray(raw)) return DEFAULT_SETTINGS.tax.taxes;
  const out: TaxEntry[] = [];
  for (const t of raw) {
    if (!t || typeof t !== 'object') continue;
    const e = t as Partial<TaxEntry>;
    const rate = num(e.rate);
    if (!Number.isFinite(rate) || rate < 0 || rate > 100) continue;
    out.push({
      id: String(e.id || `tax-${rate}-${out.length}`),
      name: String(e.name || `Impuesto ${rate}%`).trim(),
      rate,
      isDefault: e.isDefault === true,
      isActive: e.isActive !== false,
    });
  }
  return out;
}

// GET /api/companies/[id]/billing/config?tenantId=
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId es requerido' }, { status: 400 });
    }
    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(companyId, tenantHint(request));

    const [tenantRes, companyRes, caisRes, settingsRes] = await Promise.all([
      supabase
        .from('Tenant')
        .select('id, businessname, businessrtn, businessemail, businessaddress, phonenumber, logourl')
        .eq('id', tenantId)
        .maybeSingle(),
      supabase
        .from('companies')
        .select('id, name, rtn, address, email, contact_phone, logo_url')
        .eq('tenant_id', tenantId)
        .limit(1)
        .maybeSingle(),
      supabase
        .from('cai')
        .select(
          'id, cai, cai_number, start_number, end_number, current_number, issue_date, expiration_date, status, rango_inicial, rango_final, current_correlative, fecha_limite_emision, estado',
        )
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false }),
      supabase
        .from('system_config')
        .select('id, value')
        .eq('tenant_id', tenantId)
        .eq('key', 'invoice_settings')
        .maybeSingle(),
    ]);

    const tenant = tenantRes.data as
      | {
          id: string;
          businessname?: string;
          businessrtn?: string;
          businessemail?: string;
          businessaddress?: string;
          phonenumber?: string;
          logourl?: string | null;
        }
      | undefined;
    const company = companyRes.data as
      | {
          id?: string;
          name?: string;
          rtn?: string;
          address?: string;
          email?: string;
          contact_phone?: string;
          logo_url?: string | null;
        }
      | undefined;

    const logoPath = tenant?.logourl || company?.logo_url || null;
    let logoUrl: string | null = null;
    if (logoPath) {
      try {
        const { data } = await supabase.storage
          .from('company-logos')
          .createSignedUrl(String(logoPath), 3600);
        logoUrl = data?.signedUrl || null;
      } catch {
        logoUrl = null;
      }
    }

    // Se sanean email/RTN: algunos tenants tienen sufijos `+CODE` y timestamps
    // que nunca deben aparecer en una factura.
    const emisor: Emisor = {
      businessName: tenant?.businessname || company?.name || '',
      businessRTN: sanitizeBusinessRTN(tenant?.businessrtn || company?.rtn || ''),
      businessEmail: sanitizeBusinessEmail(tenant?.businessemail || company?.email || ''),
      businessAddress: tenant?.businessaddress || company?.address || '',
      phoneNumber: tenant?.phonenumber || company?.contact_phone || '',
      logoUrl,
    };

    const firstNonEmpty = (...values: unknown[]): string => {
      for (const value of values) {
        if (value !== null && value !== undefined && String(value).trim() !== '') {
          return String(value).trim();
        }
      }
      return '';
    };

    const cais = ((caisRes.data || []) as CaiRow[]).map((c) => {
      const rangeStart = num(c.start_number) || num(c.rango_inicial);
      const rangeEnd = num(c.end_number) || num(c.rango_final);
      const currentNumber = num(c.current_number) || num(c.current_correlative) || rangeStart;
      const statusValue = firstNonEmpty(c.status, c.estado);
      return {
        id: c.id,
        cai: firstNonEmpty(c.cai, c.cai_number),
        rangeStart,
        rangeEnd,
        currentNumber,
        issueDate: firstNonEmpty(c.issue_date, c.fecha_asignacion) || null,
        expiryDate: firstNonEmpty(c.expiration_date, c.fecha_limite_emision) || null,
        isActive: statusValue ? statusValue === 'active' || statusValue === 'activo' : false,
      };
    });

    let settings = DEFAULT_SETTINGS;
    if (settingsRes.data?.value) {
      try {
        const parsed = JSON.parse(String(settingsRes.data.value));
        settings = {
          print: { ...DEFAULT_SETTINGS.print, ...(parsed?.print || {}) },
          tax: {
            defaultRate: num(parsed?.tax?.defaultRate) || DEFAULT_SETTINGS.tax.defaultRate,
            applyTax: parsed?.tax?.applyTax !== false,
            taxes: sanitizeTaxes(parsed?.tax?.taxes),
          },
        };
      } catch {
        settings = DEFAULT_SETTINGS;
      }
    }

    return NextResponse.json({
      success: true,
      data: { tenantId, emisor, logoPath, cais, settings },
    });
  } catch (error) {
    console.error('Error in billing config GET:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

// PUT /api/companies/[id]/billing/config
// Body: { emisor?, settings?, logoPath? }
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    if (!companyId) {
      return NextResponse.json({ success: false, error: 'companyId es requerido' }, { status: 400 });
    }
    const body = await request.json();
    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(companyId, tenantHint(request));

    const messages: string[] = [];

    // ---- 1. Datos del emisor (Tenant + companies) ----
    if (body.emisor && typeof body.emisor === 'object') {
      const e = body.emisor as Emisor;
      const tenantUpdate: Record<string, unknown> = {
        businessname: String(e.businessName || '').trim(),
        businessrtn: String(e.businessRTN || '').trim(),
        businessemail: String(e.businessEmail || '').trim(),
        businessaddress: String(e.businessAddress || '').trim(),
        phonenumber: String(e.phoneNumber || '').trim(),
      };
      if (body.logoPath) tenantUpdate.logourl = String(body.logoPath);

      const { error: tenantErr } = await supabase
        .from('Tenant')
        .update(tenantUpdate)
        .eq('id', tenantId);
      if (tenantErr && tenantErr.message && !/does not exist/.test(tenantErr.message)) {
        return NextResponse.json({ success: false, error: tenantErr.message }, { status: 500 });
      }
      if (!tenantErr) messages.push('Emisor guardado');

      const companyUpdate: Record<string, unknown> = {
        name: String(e.businessName || '').trim(),
        rtn: String(e.businessRTN || '').trim(),
        email: String(e.businessEmail || '').trim(),
        address: String(e.businessAddress || '').trim(),
        contact_phone: String(e.phoneNumber || '').trim(),
      };
      if (body.logoPath) companyUpdate.logo_url = String(body.logoPath);

      const { error: companyErr } = await supabase
        .from('companies')
        .update(companyUpdate)
        .eq('tenant_id', tenantId);
      if (companyErr && !/does not exist/.test(companyErr.message)) {
        console.warn('[billing/config] Error actualizando companies:', companyErr.message);
      }
    }

    // ---- 2. Ajustes de impresión + impuestos ISV ----
    if (body.settings && typeof body.settings === 'object') {
      const incoming = body.settings as InvoiceSettings;
      const taxes = sanitizeTaxes(incoming?.tax?.taxes);
      // Si hay un impuesto marcado como default, defaultRate lo refleja.
      const defaultEntry = taxes.find((t) => t.isDefault);
      const merged: InvoiceSettings = {
        print: { ...DEFAULT_SETTINGS.print, ...(incoming?.print || {}) },
        tax: {
          defaultRate: defaultEntry ? defaultEntry.rate : num(incoming?.tax?.defaultRate) || DEFAULT_SETTINGS.tax.defaultRate,
          applyTax: incoming?.tax?.applyTax !== false,
          taxes,
        },
      };
      const existing = await supabase
        .from('system_config')
        .select('id')
        .eq('tenant_id', tenantId)
        .eq('key', 'invoice_settings')
        .maybeSingle();

      const payload = {
        value: JSON.stringify(merged),
        updated_at: new Date().toISOString(),
      };
      if (existing.data?.id) {
        await supabase.from('system_config').update(payload).eq('id', existing.data.id);
      } else {
        await supabase.from('system_config').insert({
          key: 'invoice_settings',
          value: JSON.stringify(merged),
          description: 'Configuración de la factura (impresión e impuestos)',
          is_active: true,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      }
      messages.push('Ajustes guardados');
    }

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Error in billing config PUT:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}