import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { TENANT_ID } from '@/lib/purchase-db';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

const VALID_TYPES = ['merchandise', 'services', 'creditors'];
const VALID_METHODS = ['cash', 'transfer', 'check', 'card'];

const SUPPLIER_FIELDS = [
  'rtn',
  'name',
  'commercial_name',
  'email',
  'phone',
  'mobile',
  'address',
  'city',
  'country',
  'supplier_type',
  'category',
  'payment_terms',
  'payment_method',
  'bank_name',
  'bank_account',
  'account_type',
  'is_active',
  'is_preferred',
];

const FIELD_ALIASES: Record<string, string[]> = {
  rtn: ['rtn', 'rtn_proveedor', 'identificacion', 'tax_id', 'rtnproveedor', 'no_rtn'],
  name: [
    'name',
    'nombre',
    'razon_social',
    'nombre_razon_social',
    'nombre_orazon_social',
    'proveedor',
    'nombre_proveedor',
    'nombre_del_proveedor',
  ],
  commercial_name: ['commercial_name', 'nombre_comercial', 'comercial'],
  email: ['email', 'correo', 'correo_electronico', 'e_mail'],
  phone: ['phone', 'telefono', 'tel', 'telefono_1'],
  mobile: ['mobile', 'celular', 'movil', 'telefono_celular'],
  address: ['address', 'direccion'],
  city: ['city', 'ciudad'],
  country: ['country', 'pais'],
  supplier_type: ['supplier_type', 'tipo', 'tipo_proveedor', 'tipo_de_proveedor'],
  category: ['category', 'categoria', 'clasificacion'],
  payment_terms: ['payment_terms', 'terminos_de_pago', 'terminos', 'dias_credito', 'plazo', 'plazo_de_pago', 'dias'],
  payment_method: ['payment_method', 'metodo_de_pago', 'forma_de_pago', 'metodo_pago', 'pago'],
  bank_name: ['bank_name', 'banco', 'nombre_banco'],
  bank_account: ['bank_account', 'cuenta_bancaria', 'cuenta', 'numero_cuenta', 'no_cuenta'],
  account_type: ['account_type', 'tipo_cuenta'],
  is_active: ['is_active', 'activo', 'estado'],
  is_preferred: ['is_preferred', 'preferido', 'proveedor_preferido'],
};

function normalizeHeader(h: string): string {
  return String(h || '')
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\s\-/.()]+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '');
}

function fieldOf(normalizedHeader: string): string | null {
  for (const [field, aliases] of Object.entries(FIELD_ALIASES)) {
    if (aliases.includes(normalizedHeader)) return field;
  }
  return null;
}

function cleanDigits(v: string): string {
  return String(v || '').replace(/\D/g, '');
}

function parseBool(v: unknown): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  if (['1', 'true', 'si', 's', 'yes', 'activo', 'v'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'inactivo', 'f'].includes(s)) return false;
  return v === '' || v === null || v === undefined ? false : true;
}

function normalizeSupplierType(v: string): string {
  const s = String(v || '').trim().toLowerCase();
  if (['mercaderia', 'merchandise', 'mercancía', 'inventario', 'productos'].includes(s)) return 'merchandise';
  if (['servicios', 'services', 'servicio'].includes(s)) return 'services';
  if (['acreedores', 'creditors', 'acreedor'].includes(s)) return 'creditors';
  if (VALID_TYPES.includes(s)) return s;
  return '';
}

function normalizePaymentMethod(v: string): string {
  const s = String(v || '').trim().toLowerCase();
  if (['efectivo', 'cash', 'contado'].includes(s)) return 'cash';
  if (['transferencia', 'transfer', 'transferencia_bancaria'].includes(s)) return 'transfer';
  if (['cheque', 'check', 'cheque_1'].includes(s)) return 'check';
  if (['tarjeta', 'card', 'tarjeta_credito', 'tarjeta_debito'].includes(s)) return 'card';
  if (VALID_METHODS.includes(s)) return s;
  return '';
}

function buildObjectRecord(records: any[], canonicalColumns: string[]): Record<string, string>[] {
  return records.map((r: any) => {
    const obj: Record<string, string> = {};
    for (const col of canonicalColumns) {
      const val = r[col];
      obj[col] = val == null ? '' : String(val);
    }
    return obj;
  });
}

function parseCsvToRecords(text: string): { canonicalColumns: string[]; records: Record<string, string>[]; error: string | null } {
  const result = Papa.parse<Record<string, string>>(text.trim(), { header: true, skipEmptyLines: true });
  if (result.errors && result.errors.some((e) => e.code === 'UndetectableDelimiter')) {
    return { canonicalColumns: [], records: [], error: 'No se pudo detectar el delimitador del CSV' };
  }
  if (!result.meta || !Array.isArray(result.meta.fields) || result.meta.fields.length === 0) {
    return { canonicalColumns: [], records: [], error: 'El archivo CSV no tiene encabezados o está vacío' };
  }
  const canonicalColumns: string[] = [];
  const rawHeaders = result.meta.fields;
  const normalizedToCanonical = new Map<string, string>();
  for (const h of rawHeaders) {
    const norm = normalizeHeader(h);
    const field = fieldOf(norm);
    if (field && !normalizedToCanonical.has(field)) {
      normalizedToCanonical.set(field, h);
      canonicalColumns.push(field);
    }
  }
  const renamed = result.data.map((row: Record<string, string>) => {
    const obj: Record<string, string> = {};
    for (const [field, rawHeader] of normalizedToCanonical.entries()) {
      obj[field] = row[rawHeader] == null ? '' : String(row[rawHeader]);
    }
    return obj;
  });
  return { canonicalColumns, records: renamed, error: null };
}

function parseExcelToRecords(buffer: Buffer): { canonicalColumns: string[]; records: Record<string, string>[]; error: string | null } {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) {
    return { canonicalColumns: [], records: [], error: 'El archivo Excel no tiene hojas' };
  }
  const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as any[][];
  if (jsonData.length < 2) {
    return { canonicalColumns: [], records: [], error: 'El archivo Excel no tiene datos' };
  }
  const headers = jsonData[0].map((h: any) => String(h ?? '').trim());
  const canonicalColumns: string[] = [];
  const indexToField = new Map<number, string>();
  headers.forEach((h, idx) => {
    const norm = normalizeHeader(h);
    const field = fieldOf(norm);
    if (field && !indexToField.get(idx)) {
      indexToField.set(idx, field);
      if (!canonicalColumns.includes(field)) canonicalColumns.push(field);
    }
  });
  const records = jsonData.slice(1).map((row: any[]) => {
    const obj: Record<string, string> = {};
    for (const [idx, field] of indexToField.entries()) {
      obj[field] = row[idx] == null ? '' : String(row[idx]);
    }
    return obj;
  });
  return { canonicalColumns, records, error: null };
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const companyId = (formData.get('companyId') as string) || null;

    if (!file) {
      return NextResponse.json({ error: 'Se requiere un archivo (CSV o Excel)' }, { status: 400 });
    }

    const fileName = (file.name || '').toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.txt');

    if (!isExcel && !isCsv) {
      return NextResponse.json({ error: 'Formato no soportado. Use .csv, .xlsx o .xls' }, { status: 400 });
    }

    const parsed = isExcel
      ? parseExcelToRecords(buffer)
      : parseCsvToRecords(buffer.toString('utf8'));

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }

    const required = ['rtn', 'name'].filter((f) => parsed.canonicalColumns.includes(f));
    if (required.length < 2) {
      return NextResponse.json({
        error: 'El archivo debe incluir al menos las columnas RTN y Nombre/Razón Social',
        detectedColumns: parsed.canonicalColumns,
      }, { status: 400 });
    }

    // Cargar RTN y email existentes para evitar duplicados (comparando normalizados)
    let existingRtns = new Set<string>();
    let existingEmails = new Set<string>();
    {
      let q = getSupabaseServer().from('Supplier').select('rtn, email').eq('tenant_id', TENANT_ID);
      if (companyId) q = q.eq('company_id', companyId);
      const { data: existing, error: existingErr } = await q.limit(5000);
      if (!existingErr && existing) {
        existingRtns = new Set(existing.map((e: any) => cleanDigits(e.rtn)));
        existingEmails = new Set(
          (existing as any[]).map((e: any) => String(e.email || '').trim().toLowerCase()).filter(Boolean),
        );
      }
    }

    const rowsToInsert: any[] = [];
    const errors: { row: number; message: string }[] = [];
    const seenInFile = new Set<string>();
    const seenEmailsInFile = new Set<string>();
    let skippedDuplicates = 0;

    parsed.records.forEach((r, idx) => {
      const rowNum = idx + 2;
      const rtnRaw = String(r.rtn || '').trim();
      const name = String(r.name || '').trim();
      const rtn = cleanDigits(rtnRaw);
      const email = String(r.email || '').trim().toLowerCase();

      if (!rtn || !name) {
        errors.push({ row: rowNum, message: 'Faltan datos obligatorios (RTN y/o Nombre)' });
        return;
      }
      if (existingRtns.has(rtn) || seenInFile.has(rtn)) {
        skippedDuplicates++;
        return;
      }
      if (email && (existingEmails.has(email) || seenEmailsInFile.has(email))) {
        skippedDuplicates++;
        return;
      }
      seenInFile.add(rtn);
      if (email) seenEmailsInFile.add(email);

      const supplierType = normalizeSupplierType(r.supplier_type) || 'merchandise';
      const paymentMethod = normalizePaymentMethod(r.payment_method) || 'transfer';
      const paymentTermsNum = parseInt(r.payment_terms, 10);

      rowsToInsert.push({
        tenant_id: TENANT_ID,
        company_id: companyId,
        rtn: rtnRaw,
        name,
        commercial_name: r.commercial_name || null,
        email: r.email || null,
        phone: r.phone || null,
        mobile: r.mobile || null,
        address: r.address || null,
        city: r.city || null,
        country: r.country || 'Honduras',
        supplier_type: supplierType,
        category: r.category || null,
        payment_terms: isNaN(paymentTermsNum) ? 30 : paymentTermsNum,
        payment_method: paymentMethod,
        bank_name: r.bank_name || null,
        bank_account: r.bank_account || null,
        account_type: r.account_type || 'checking',
        is_active: parseBool(r.is_active),
        is_preferred: parseBool(r.is_preferred),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    });

    let created = 0;
    if (rowsToInsert.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < rowsToInsert.length; i += BATCH) {
        const batch = rowsToInsert.slice(i, i + BATCH);
        const { error } = await getSupabaseServer().from('Supplier').insert(batch);
        if (error) {
          const msg = String(error.message || error);
          if (msg.includes('duplicate') || msg.includes('23505')) {
            // reintentar uno a uno para contar los que sí se insertan
            for (const row of batch) {
              const { error: oneErr } = await getSupabaseServer().from('Supplier').insert(row);
              if (!oneErr) created++;
              else errors.push({ row: -1, message: `${row.name}: ${String(oneErr.message || oneErr)}` });
            }
          } else {
            return NextResponse.json({ error: `Error al guardar proveedores: ${msg}` }, { status: 500 });
          }
        } else {
          created += batch.length;
        }
      }
    }

    return NextResponse.json({
      success: true,
      total: parsed.records.length,
      created,
      skipped: skippedDuplicates,
      failed: errors.length,
      errors: errors.slice(0, 20),
      hasMoreErrors: errors.length > 20,
      message: `${created} proveedores creados` +
        (skippedDuplicates ? `, ${skippedDuplicates} duplicados omitidos` : '') +
        (errors.length ? `, ${errors.length} con errores` : ''),
    });
  } catch (error: any) {
    console.error('suppliers/import error', error);
    return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
  }
}