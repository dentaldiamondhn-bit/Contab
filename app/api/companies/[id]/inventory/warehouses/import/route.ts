import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { resolveTenant } from '@/lib/services/budget-service';
import { isMigrationMissingError } from '@/lib/services/warehouse-service';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

const FIELD_ALIASES: Record<string, string[]> = {
  code: ['code', 'codigo', 'código', 'codigo_almacen', 'código_almacén'],
  name: ['name', 'nombre', 'almacen', 'almacén', 'warehouse', 'bodega', 'nombre_almacen', 'nombre_almacén'],
  location: ['location', 'ubicacion', 'ubicación', 'direccion', 'dirección', 'lugar'],
  description: ['description', 'descripcion', 'detalle', 'referencia'],
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

function decodeCsvBuffer(buffer: Buffer): string {
  if (buffer.length >= 2 && buffer[0] === 0xff && buffer[1] === 0xfe) {
    return buffer.toString('utf16le', 2);
  }
  let text = buffer.toString('utf8');
  if (text.includes('\uFFFD')) {
    text = buffer.toString('latin1');
  }
  return text;
}

function parseCsvToRecords(text: string): { records: Record<string, string>[]; error: string | null } {
  const result = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, '').trim(), {
    header: true,
    skipEmptyLines: true,
    delim: '',
    transformHeader: (h) => h.trim(),
  });
  if (!result.meta || !Array.isArray(result.meta.fields) || result.meta.fields.length === 0) {
    return { records: [], error: 'El archivo CSV no tiene encabezados o está vacío' };
  }
  const normalizedToCanonical = new Map<string, string>();
  for (const h of result.meta.fields) {
    const field = fieldOf(normalizeHeader(h));
    if (field && !normalizedToCanonical.has(field)) normalizedToCanonical.set(field, h);
  }
  const renamed = result.data.map((row: Record<string, string>) => {
    const obj: Record<string, string> = {};
    for (const [field, rawHeader] of normalizedToCanonical.entries()) {
      obj[field] = row[rawHeader] == null ? '' : String(row[rawHeader]);
    }
    return obj;
  });
  return { records: renamed, error: null };
}

function parseExcelToRecords(buffer: Buffer): { records: Record<string, string>[]; error: string | null } {
  const wb = XLSX.read(buffer, { type: 'buffer' });
  const ws = wb.Sheets[wb.SheetNames[0]];
  if (!ws) return { records: [], error: 'El archivo Excel no tiene hojas' };
  const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as any[][];
  if (jsonData.length < 2) return { records: [], error: 'El archivo Excel no tiene datos' };
  const headers = jsonData[0].map((h: any) => String(h ?? '').trim());
  const indexToField = new Map<number, string>();
  headers.forEach((h, idx) => {
    const field = fieldOf(normalizeHeader(h));
    if (field && !indexToField.get(idx)) indexToField.set(idx, field);
  });
  const records = jsonData.slice(1).map((row: any[]) => {
    const obj: Record<string, string> = {};
    for (const [idx, field] of indexToField.entries()) obj[field] = row[idx] == null ? '' : String(row[idx]);
    return obj;
  });
  return { records, error: null };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const tenantHint = request.headers.get('x-tenant-id') || (formData.get('tenantId') as string) || null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'Se requiere un archivo (CSV o Excel)' }, { status: 400 });
    }
    const fileName = (file.name || '').toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());
    const isExcel = fileName.endsWith('.xlsx') || fileName.endsWith('.xls');
    const isCsv = fileName.endsWith('.csv') || fileName.endsWith('.txt');
    if (!isExcel && !isCsv) {
      return NextResponse.json({ success: false, error: 'Formato no soportado. Use .csv, .xlsx o .xls' }, { status: 400 });
    }

    const parsed = isExcel ? parseExcelToRecords(buffer) : parseCsvToRecords(decodeCsvBuffer(buffer));
    if (parsed.error) return NextResponse.json({ success: false, error: parsed.error }, { status: 400 });

    const hasCode = parsed.records.some((r) => String(r.code || '').trim());
    const hasName = parsed.records.some((r) => String(r.name || '').trim());
    if (!hasCode || !hasName) {
      return NextResponse.json({
        success: false,
        error: 'El archivo debe incluir las columnas "Código" y "Nombre" (code, name)',
      }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const tenantId = await resolveTenant(companyId, tenantHint);
    const now = new Date().toISOString();

    // Cargar códigos existentes (scope tenant+company) para omitir duplicados
    const existingCodes = new Set<string>();
    {
      const { data: existing, error } = await supabase
        .from('warehouse')
        .select('code')
        .eq('tenant_id', tenantId)
        .or(`company_id.eq.${companyId},company_id.is.null`)
        .limit(10000);
      if (!error && existing) {
        for (const e of existing) existingCodes.add(String(e.code).trim().toUpperCase());
      }
    }

    const rowsToInsert: any[] = [];
    const errors: { row: number; message: string }[] = [];
    const warnings: { row: number; message: string }[] = [];
    const seenInFile = new Set<string>();
    let skippedDuplicates = 0;

    parsed.records.forEach((r, idx) => {
      const rowNum = idx + 2;
      const code = String(r.code || '').trim().toUpperCase();
      const name = String(r.name || '').trim();
      if (!code || !name) {
        errors.push({ row: rowNum, message: `Faltan código y/o nombre (code="${r.code}", name="${r.name}")` });
        return;
      }
      if (existingCodes.has(code) || seenInFile.has(code)) {
        skippedDuplicates++;
        return;
      }
      seenInFile.add(code);
      rowsToInsert.push({
        tenant_id: tenantId,
        company_id: companyId,
        code,
        name,
        location: String(r.location || '').trim(),
        description: String(r.description || '').trim(),
        is_active: true,
        created_at: now,
        updated_at: now,
      });
    });

    let created = 0;
    if (rowsToInsert.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < rowsToInsert.length; i += BATCH) {
        const batch = rowsToInsert.slice(i, i + BATCH);
        const { data, error } = await supabase.from('warehouse').insert(batch).select('id');
        if (error) {
          if (isMigrationMissingError(error)) {
            return NextResponse.json({ success: false, error: error.message }, { status: 500 });
          }
          const msg = String(error.message || error);
          if (msg.includes('duplicate') || msg.includes('23505')) {
            for (const row of batch) {
              const { data: single, error: oneErr } = await supabase
                .from('warehouse')
                .insert(row)
                .select('id')
                .single();
              if (!oneErr && single) created++;
              else if (oneErr && String(oneErr.message || oneErr).includes('23505')) skippedDuplicates++;
              else errors.push({ row: -1, message: `${row.name}: ${String(oneErr?.message || oneErr)}` });
            }
          } else {
            return NextResponse.json({ success: false, error: `Error al guardar almacenes: ${msg}` }, { status: 500 });
          }
        } else {
          created += Array.isArray(data) ? data.length : 1;
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
      warnings: warnings.slice(0, 20),
      hasMoreWarnings: warnings.length > 20,
      message: `${created} almacenes creados` +
        (skippedDuplicates ? `, ${skippedDuplicates} duplicados omitidos` : '') +
        (errors.length ? `, ${errors.length} con errores` : '') +
        (warnings.length ? `, ${warnings.length} avisos` : ''),
    });
  } catch (error) {
    console.error('inventory/warehouses/import error', error);
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}