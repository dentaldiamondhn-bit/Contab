import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { filtroEmpresaOCompany } from '@/lib/company-scope';
import { createTransfer, isMigrationMissingError } from '@/lib/services/warehouse-service';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

const FIELD_ALIASES: Record<string, string[]> = {
  transfer_number: ['transfer_number', 'transfernumber', 'traslado', 'numero_traslado', 'n_traslado', 'grupo'],
  origin: ['origin', 'origen', 'source', 'warehouse_origin', 'almacen_origen', 'almacén_origen', 'bodega_origen'],
  destination: ['destination', 'destino', 'target', 'warehouse_destination', 'almacen_destino', 'almacén_destino', 'bodega_destino'],
  date: ['date', 'fecha', 'transfer_date', 'fecha_traslado'],
  product_code: ['product_code', 'productcode', 'producto', 'product', 'codigo_producto', 'código_producto', 'code', 'codigo', 'código', 'sku'],
  quantity: ['quantity', 'cantidad', 'qty', 'unidades', 'units'],
  carrier: ['carrier', 'transportista', 'transporte'],
  guide_number: ['guide_number', 'guidenumber', 'guia', 'guía', 'numero_guia', 'n_guia'],
  notes: ['notes', 'notas', 'observaciones', 'comment', 'comentario'],
};

const REQUIRED_COLUMNS = ['origin', 'destination', 'product_code', 'quantity'] as const;

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

function parseNum(v: unknown): number {
  if (typeof v === 'number') return isNaN(v) ? 0 : v;
  const s = String(v ?? '')
    .replace(/^L\s*/i, '')
    .replace(/[$,\s]/g, '')
    .trim();
  if (s === '') return 0;
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
}

// Excel guarda fechas como número serial (1 = 1899-12-30). Un valor puramente
// numérico en la columna de fecha se convierte; con `raw: true` llega como string.
function parseDate(v: unknown): string {
  if (v == null || String(v).trim() === '') return new Date().toISOString().slice(0, 10);
  const s = String(v).trim();
  if (/^\d+(\.\d+)?$/.test(s)) {
    const serial = parseFloat(s);
    if (serial >= 1 && serial <= 2958465) {
      const ms = Date.UTC(1899, 11, 30) + Math.round(serial) * 86400000;
      return new Date(ms).toISOString().slice(0, 10);
    }
  }
  const iso = s.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return '';
}

interface ResolvedRow {
  rowNum: number;
  groupKey: string;
  originRef: string;
  originId: string;
  destRef: string;
  destId: string;
  date: string;
  productRef: string;
  quantity: number;
  carrier: string;
  guide: string;
  notes: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: companyId } = await params;
    const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: companyId });
    if (!empresa.tenantId || !empresa.companyId) {
      return NextResponse.json({ success: false, error: 'Company no encontrada' }, { status: 400 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
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

    const present = new Set(parsed.records.length > 0 ? Object.keys(parsed.records[0]) : []);
    // Si el archivo trae columnas pero ninguna mapea, `records` viene vacío de
    // keys; en ese caso revisar las columnas canónicas detectadas da 0 igual.
    const missingCols = REQUIRED_COLUMNS.filter((c) => !present.has(c));
    if (missingCols.length > 0 || parsed.records.length === 0) {
      return NextResponse.json({
        success: false,
        error:
          parsed.records.length === 0 && missingCols.length === 0
            ? 'El archivo no tiene filas de datos'
            : `El archivo debe incluir las columnas: ${missingCols.join(', ')}`,
        detectedColumns: [...present],
      }, { status: 400 });
    }

    const supabase = getSupabaseServer();
    const tenantId = empresa.tenantId;

    // Almacenes de la empresa: se resuelven por código (ALM-###) o por nombre.
    const warehouses: Array<{ id: string; code: string; name: string; is_active: boolean }> = [];
    {
      const { data, error } = await supabase
        .from('warehouse')
        .select('id, code, name, is_active')
        .eq('tenant_id', tenantId)
        .match(filtroEmpresaOCompany(empresa))
        .limit(1000);
      if (error) throw error;
      for (const w of (data || []) as Array<{ id: string; code: string; name: string; is_active: boolean }>) {
        warehouses.push(w);
      }
    }
    const whByCode = new Map(
      warehouses.filter((w) => w.code).map((w) => [String(w.code).trim().toUpperCase(), w]),
    );
    const whByName = new Map(
      warehouses.filter((w) => w.name).map((w) => [String(w.name).trim().toLowerCase(), w]),
    );

    // Productos de la empresa: se resuelven por código.
    const products: Array<{ id: string; code: string }> = [];
    {
      const { data, error } = await supabase
        .from('product')
        .select('id, code')
        .eq('tenant_id', tenantId)
        .match(filtroEmpresaOCompany(empresa))
        .limit(100000);
      if (error) throw error;
      for (const p of (data || []) as Array<{ id: string; code: string }>) {
        products.push(p);
      }
    }
    const prodByCode = new Map(
      products.filter((p) => p.code).map((p) => [String(p.code).trim().toUpperCase(), p]),
    );

    const resolveWarehouse = (ref: string) => {
      const key = String(ref || '').trim();
      if (!key) return null;
      return whByCode.get(key.toUpperCase()) || whByName.get(key.toLowerCase()) || null;
    };

    const errors: { row: number; message: string }[] = [];
    const rows: ResolvedRow[] = [];

    parsed.records.forEach((r, idx) => {
      const rowNum = idx + 2;
      const originRef = String(r.origin || '').trim();
      const destRef = String(r.destination || '').trim();
      const productRef = String(r.product_code || '').trim();
      const quantity = Math.round(parseNum(r.quantity));

      if (!originRef || !destRef || !productRef || !quantity) {
        errors.push({
          row: rowNum,
          message: `Faltan datos obligatorios (origin="${originRef}", destination="${destRef}", product_code="${productRef}", quantity="${r.quantity}")`,
        });
        return;
      }
      const origin = resolveWarehouse(originRef);
      if (!origin) {
        errors.push({ row: rowNum, message: `Almacén origen no encontrado: ${originRef}` });
        return;
      }
      if (!origin.is_active) {
        errors.push({ row: rowNum, message: `Almacén origen inactivo: ${originRef}` });
        return;
      }
      const dest = resolveWarehouse(destRef);
      if (!dest) {
        errors.push({ row: rowNum, message: `Almacén destino no encontrado: ${destRef}` });
        return;
      }
      if (!dest.is_active) {
        errors.push({ row: rowNum, message: `Almacén destino inactivo: ${destRef}` });
        return;
      }
      if (origin.id === dest.id) {
        errors.push({ row: rowNum, message: 'Origen y destino deben ser almacenes distintos' });
        return;
      }
      const prod = prodByCode.get(productRef.toUpperCase());
      if (!prod) {
        errors.push({ row: rowNum, message: `Producto no encontrado: ${productRef}` });
        return;
      }
      if (quantity <= 0) {
        errors.push({ row: rowNum, message: `Cantidad inválida: ${r.quantity}` });
        return;
      }
      const date = parseDate(r.date);
      if (!date) {
        errors.push({ row: rowNum, message: `Fecha inválida: ${r.date}` });
        return;
      }
      const groupKey =
        String(r.transfer_number || '').trim() ||
        // Sin número: cada fila es su propio traslado.
        `__fila_${rowNum}`;
      rows.push({
        rowNum,
        groupKey,
        originRef,
        originId: origin.id,
        destRef,
        destId: dest.id,
        date,
        productRef,
        quantity,
        carrier: String(r.carrier || '').trim(),
        guide: String(r.guide_number || '').trim(),
        notes: String(r.notes || '').trim(),
      });
    });

    // Agrupa por transfer_number: varias filas = un traslado con varios ítems.
    const groups = new Map<string, ResolvedRow[]>();
    for (const row of rows) {
      const list = groups.get(row.groupKey);
      if (list) list.push(row);
      else groups.set(row.groupKey, [row]);
    }

    let created = 0;
    for (const group of groups.values()) {
      const first = group[0];
      const source = resolveWarehouse(first.originRef)!;
      const dest = resolveWarehouse(first.destRef)!;
      // Mismo grupo con origen/destino/fecha distintos entre filas: error.
      // Se comparan los ALMACENES RESUELTOS, no el texto de la celda: la misma
      // bodega puede venir como "ALM-001" en una fila y como "Bodega Uno" en
      // otra, y el texto crudo marcaria un falso mismatch.
      const mismatch = group.find(
        (g) =>
          g.originId !== first.originId ||
          g.destId !== first.destId ||
          g.date !== first.date,
      );
      if (mismatch) {
        errors.push({
          row: mismatch.rowNum,
          message: `Traslado "${first.groupKey}": las filas del mismo grupo deben tener el mismo origen, destino y fecha`,
        });
        continue;
      }
      // Ítems del mismo producto en un grupo se fusionan (createTransfer
      // rechazaría stock insuficiente contando cada línea por separado contra
      // el mismo saldo disponible).
      const itemsByProduct = new Map<string, number>();
      for (const g of group) {
        const prod = prodByCode.get(g.productRef.toUpperCase())!;
        itemsByProduct.set(prod.id, (itemsByProduct.get(prod.id) || 0) + g.quantity);
      }
      try {
        await createTransfer(
          empresa.companyId!,
          {
            source_warehouse_id: source.id,
            destination_warehouse_id: dest.id,
            transfer_date: first.date,
            carrier: first.carrier,
            guide_number: first.guide,
            notes: first.notes,
            items: [...itemsByProduct.entries()].map(([product_id, quantity]) => ({ product_id, quantity })),
          },
          tenantId,
        );
        created++;
      } catch (e) {
        if (isMigrationMissingError(e)) throw e;
        errors.push({
          row: first.rowNum,
          message: `Traslado "${first.groupKey === `__fila_${first.rowNum}` ? first.productRef : first.groupKey}": ${e instanceof Error ? e.message : String(e)}`,
        });
      }
    }

    const totalGroups = groups.size;
    return NextResponse.json({
      success: true,
      total: parsed.records.length,
      created,
      failed: totalGroups - created,
      errors: errors.slice(0, 20),
      hasMoreErrors: errors.length > 20,
      message:
        `${created} traslados creados` +
        (totalGroups - created > 0 ? `, ${totalGroups - created} con errores` : '') +
        (errors.length > totalGroups - created ? `, ${errors.length - (totalGroups - created)} filas omitidas` : ''),
    });
  } catch (error) {
    console.error('inventory/transfers/import error', error);
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    const message = error instanceof Error ? error.message : 'Error interno';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
