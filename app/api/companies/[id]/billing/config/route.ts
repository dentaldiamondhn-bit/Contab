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

// Columnas reales de `cai` (verificadas contra Supabase):
//   id, tenant_id, company_id, cai_number, start_number, end_number,
//   current_number, issue_date, expiration_date, status, created_at, updated_at
// El esquema en espanol (cai, rango_inicial, fecha_limite_emision, estado) no
// existe en la tabla; las consultas que lo incluian devolvian error.
interface CaiRow {
  id: string;
  cai_number?: string | null;
  start_number?: number | string | null;
  end_number?: number | string | null;
  current_number?: number | string | null;
  issue_date?: string | null;
  expiration_date?: string | null;
  status?: string | null;
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
      // La tabla real es `tenants` (snake_case) y el tenant puede venir como id
      // UUID o como `tenant_code` legacy (TEST1DS, TST20HM...).
      supabase
        .from('tenants')
        .select('id, business_name, business_rtn, business_email, phone_number')
        .or(`id.eq.${tenantId},tenant_code.eq.${tenantId}`)
        .limit(1)
        .maybeSingle(),
      // `companies` no existe; la tabla es `Company`.
      supabase.from('Company').select('id, name, tenantId').eq('id', companyId).maybeSingle(),
      supabase
        .from('cai')
        .select(
          'id, cai_number, start_number, end_number, current_number, issue_date, expiration_date, status',
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
          business_name?: string;
          business_rtn?: string;
          business_email?: string;
          phone_number?: string;
        }
      | undefined;
    const company = companyRes.data as
      | {
          id?: string;
          name?: string;
        }
      | undefined;

    // El logo se sirve por /api/billing/logo-get (Storage `company-logos`); no
    // hay columna de logo en `tenants` ni en `Company`.
    const logoPath: string | null = null;
    const logoUrl: string | null = null;

    // Se sanean email/RTN: algunos tenants tienen sufijos `+CODE` y timestamps
    // que nunca deben aparecer en una factura.
    const emisor: Emisor = {
      businessName: tenant?.business_name || company?.name || '',
      businessRTN: sanitizeBusinessRTN(tenant?.business_rtn || ''),
      businessEmail: sanitizeBusinessEmail(tenant?.business_email || ''),
      businessAddress: '',
      phoneNumber: tenant?.phone_number || '',
      logoUrl,
    };

    const cais = ((caisRes.data || []) as CaiRow[]).map((c) => {
      const rangeStart = num(c.start_number);
      return {
        id: c.id,
        cai: String(c.cai_number ?? ''),
        rangeStart,
        rangeEnd: num(c.end_number),
        currentNumber: num(c.current_number) || rangeStart,
        issueDate: c.issue_date ? String(c.issue_date).slice(0, 10) : null,
        expiryDate: c.expiration_date ? String(c.expiration_date).slice(0, 10) : null,
        isActive: String(c.status || '').toLowerCase() === 'active',
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

    // ---- 1. Datos del emisor (tenants + Company) ----
    if (body.emisor && typeof body.emisor === 'object') {
      const e = body.emisor as Emisor;
      const tenantUpdate: Record<string, unknown> = {
        business_name: String(e.businessName || '').trim(),
        business_rtn: String(e.businessRTN || '').trim(),
        business_email: String(e.businessEmail || '').trim(),
        phone_number: String(e.phoneNumber || '').trim(),
      };

      // La tabla real es `tenants`; `Tenant` no existe. Puede venir por id UUID
      // o por tenant_code legacy.
      const { data: tenantUpdated, error: tenantErr } = await supabase
        .from('tenants')
        .update(tenantUpdate)
        .or(`id.eq.${tenantId},tenant_code.eq.${tenantId}`)
        .select('id');

      if (tenantErr) {
        console.warn('[billing/config] Error actualizando tenants:', tenantErr.message);
      } else if ((tenantUpdated || []).length > 0) {
        messages.push('Emisor guardado');
      }

      // La tabla real es `Company`; solo tiene name/description/isActive.
      const { error: companyErr } = await supabase
        .from('Company')
        .update({ name: String(e.businessName || '').trim() })
        .eq('id', companyId);
      if (companyErr) {
        console.warn('[billing/config] Error actualizando Company:', companyErr.message);
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
      let settingsError: { message: string } | null = null;
      if (existing.data?.id) {
        const res = await supabase.from('system_config').update(payload).eq('id', existing.data.id);
        settingsError = res.error;
      } else {
        const res = await supabase.from('system_config').insert({
          key: 'invoice_settings',
          value: JSON.stringify(merged),
          description: 'Configuraci\u00f3n de la factura (impresi\u00f3n e impuestos)',
          is_active: true,
          tenant_id: tenantId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
        settingsError = res.error;
      }

      if (settingsError) {
        // `system_config` no existe en el esquema real. Se avisa en vez de
        // afirmar que se guardo algo que no se persistio.
        console.warn('[billing/config] No se pudieron guardar los ajustes:', settingsError.message);
        messages.push('No se pudieron guardar los ajustes de impresion/impuestos');
      } else {
        messages.push('Ajustes guardados');
      }
    }

    return NextResponse.json({ success: true, messages });
  } catch (error) {
    console.error('Error in billing config PUT:', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}