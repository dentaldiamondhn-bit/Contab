import { NextRequest, NextResponse } from 'next/server';
import { contextoDeEmpresa, respuestaDeErrorDeEmpresa } from '@/lib/tenant-resolver';
import { filtroEmpresaOCompany } from '@/lib/company-scope';
import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

export const runtime = 'nodejs';

const VALID_PRODUCT_TYPES = ['product', 'consumable', 'service'];
const VALID_VALUATION = ['weighted_average', 'fifo', 'average', 'standard'];

const FIELD_ALIASES: Record<string, string[]> = {
  code: ['code', 'codigo', 'código', 'sku', 'part_number'],
  name: ['name', 'nombre', 'producto', 'descripcion_corta', 'item'],
  description: ['description', 'descripcion', 'detalle'],
  unit: ['unit', 'unidad', 'uom'],
  unit_price: ['unit_price', 'unitprice', 'price', 'precio', 'precio_venta', 'precio_venta_unitario'],
  current_cost: ['current_cost', 'currentcost', 'cost', 'costo', 'costo_unitario', 'costo_promedio'],
  current_stock: ['current_stock', 'currentstock', 'stock', 'stock_inicial', 'stock_actual', 'existencia', 'cantidad'],
  min_stock: ['min_stock', 'minstock', 'stock_minimo', 'stock_min', 'minimo'],
  max_stock: ['max_stock', 'maxstock', 'stock_maximo', 'stock_max', 'maximo'],
  tax_rate: ['tax_rate', 'taxrate', 'tax', 'impuesto', 'isv', 'porcentaje_isv'],
  product_type: ['product_type', 'producttype', 'tipo', 'tipo_producto', 'tipo_de_producto'],
  valuation_method: ['valuation_method', 'valuationmethod', 'metodo_valuacion', 'metodo_de_valuacion', 'valuacion'],
  location: ['location', 'ubicacion', 'ubicación', 'bodega', 'estante'],
  is_service: ['is_service', 'isservice', 'servicio', 'es_servicio'],
  is_active: ['is_active', 'isactive', 'activo', 'estado'],
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

function parseNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return isNaN(v) ? fallback : v;
  const s = String(v ?? '')
    .replace(/^L\s*/i, '')
    .replace(/[$,\s]/g, '')
    .trim();
  if (s === '') return fallback;
  const n = parseFloat(s);
  return isNaN(n) ? fallback : n;
}

function parseBool(v: unknown): boolean {
  const s = String(v ?? '').trim().toLowerCase();
  if (['1', 'true', 'si', 's', 'yes', 'activo', 'v'].includes(s)) return true;
  if (['0', 'false', 'no', 'n', 'inactivo', 'f'].includes(s)) return false;
  return v === '' || v === null || v === undefined ? false : true;
}

function normalizeProductType(v: string): string {
  const s = String(v || '').trim().toLowerCase();
  if (['producto', 'product', 'productos'].includes(s)) return 'product';
  if (['consumible', 'consumable', 'insumo', 'suministro'].includes(s)) return 'consumable';
  if (['servicio', 'service', 'servicios'].includes(s)) return 'service';
  if (VALID_PRODUCT_TYPES.includes(s)) return s;
  return '';
}

function parseCsvToRecords(text: string): { canonicalColumns: string[]; records: Record<string, string>[]; error: string | null } {
  const result = Papa.parse<Record<string, string>>(text.replace(/^\uFEFF/, '').trim(), {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim(),
  });
  if (!result.meta || !Array.isArray(result.meta.fields) || result.meta.fields.length === 0) {
    return { canonicalColumns: [], records: [], error: 'El archivo CSV no tiene encabezados o está vacío' };
  }
  const canonicalColumns: string[] = [];
  const normalizedToCanonical = new Map<string, string>();
  for (const h of result.meta.fields) {
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
  if (!ws) return { canonicalColumns: [], records: [], error: 'El archivo Excel no tiene hojas' };
  const jsonData = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: true }) as any[][];
  if (jsonData.length < 2) return { canonicalColumns: [], records: [], error: 'El archivo Excel no tiene datos' };
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
    for (const [idx, field] of indexToField.entries()) obj[field] = row[idx] == null ? '' : String(row[idx]);
    return obj;
  });
  return { canonicalColumns, records, error: null };
}

export async function POST(req: NextRequest) {
  try {
    // Antes el tenant salia del archivo (`formData.get('tenantId')`) con un
    // fallback fijo a `'1'`: una importacion sin ese campo guardaba todos los
    // productos en "Empresa 1", y una importacion con el campo manipulado los
    // guardaba en la empresa que dijera el cliente, sin comprobar pertenencia.
    // `contextoDeEmpresa` resuelve y valida la empresa (403 si no es del tenant de
    // la sesion), y el `company_id` se escribe explicito en cada INSERT.
    const empresa = await contextoDeEmpresa(req);
    const tenantId = empresa.tenantId;
    if (!tenantId) {
      return NextResponse.json({ error: 'Falta el tenant de la empresa' }, { status: 400 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

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

    const parsed = isExcel ? parseExcelToRecords(buffer) : parseCsvToRecords(buffer.toString('utf8'));
    if (parsed.error) return NextResponse.json({ error: parsed.error }, { status: 400 });

    if (!parsed.canonicalColumns.includes('name')) {
      return NextResponse.json({
        error: 'El archivo debe incluir la columna "Nombre" (name)',
        detectedColumns: parsed.canonicalColumns,
      }, { status: 400 });
    }

    // Lectura GLOBAL de codigos a proposito, y solo de `code`: el comentario
    // original atribuia a un `product_code_key` global la necesidad de no repetir
    // codigo entre empresas, pero ese UNIQUE no aparece en ninguna migracion del
    // repo y no hay forma de verificarlo (PostgREST no expone indices y no hay
    // `exec_sql`). Se conserva el control por si existe, que es el lado
    // conservador: no filtrar por empresa arriesga un 23505 al importar, y lo que
    // sale de aqui son codigos, no nombres ni precios. PENDIENTE: confirmar el
    // indice y, si es global, moverlo a `(company_id, code)` como hizo la 035 con
    // `Account`.
    const existingCodes = new Set<string>();
    {
      const { data: existing, error } = await getSupabaseServer()
        .from('product')
        .select('code')
        .limit(10000);
      if (!error && existing) {
        for (const e of existing) existingCodes.add(String(e.code).trim().toLowerCase());
      }
    }

    const rowsToInsert: any[] = [];
    const errors: { row: number; message: string }[] = [];
    const seenInFile = new Set<string>();
    let skippedDuplicates = 0;

    // Auto-codigo inicial, correlativo POR EMPRESA. Era solo por tenant, asi que
    // test 1 y test 2 (mismo `TEST1DS`) se peleaban la misma serie `PROD-`.
    let autoCodeNumber = 1;
    {
      const { data: lastProduct } = await getSupabaseServer()
        .from('product')
        .select('code')
        .eq('tenant_id', tenantId)
        .match(filtroEmpresaOCompany(empresa))
        .ilike('code', 'PROD-%')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if ((lastProduct as any)?.code) {
        const match = String((lastProduct as any).code).match(/PROD-(\d+)/);
        if (match) autoCodeNumber = parseInt(match[1], 10) + 1;
      }
    }

    parsed.records.forEach((r, idx) => {
      const rowNum = idx + 2;
      const name = String(r.name || '').trim();
      if (!name) {
        errors.push({ row: rowNum, message: 'Falta el nombre del producto' });
        return;
      }

      let code = String(r.code || '').trim();
      const codeKey = code.trim().toLowerCase();
      if (!code || existingCodes.has(codeKey) || seenInFile.has(codeKey)) {
        while (existingCodes.has(`prod-${String(autoCodeNumber).padStart(3, '0')}`) || seenInFile.has(`prod-${String(autoCodeNumber).padStart(3, '0')}`)) {
          autoCodeNumber++;
        }
        code = `PROD-${String(autoCodeNumber).padStart(3, '0')}`;
        autoCodeNumber++;
      }
      seenInFile.add(code.trim().toLowerCase());

      const unitPrice = Math.round(parseNum(r.unit_price, 0));
      const currentCost = r.current_cost !== '' ? parseNum(r.current_cost, unitPrice) : unitPrice;
      const currentStock = Math.round(parseNum(r.current_stock, 0));
      const productType = normalizeProductType(r.product_type) || 'product';

      rowsToInsert.push({
        tenant_id: tenantId,
        ...(empresa.companyId ? { company_id: empresa.companyId } : {}),
        code,
        name,
        description: r.description || null,
        unit: r.unit || 'Unidad',
        unit_price: unitPrice,
        current_cost: currentCost,
        current_stock: currentStock,
        stock_quantity: currentStock,
        min_stock: parseNum(r.min_stock, 0),
        max_stock: Math.round(parseNum(r.max_stock, 0)),
        tax_rate: parseNum(r.tax_rate, 15),
        product_type: productType,
        valuation_method: VALID_VALUATION.includes(String(r.valuation_method || '').trim().toLowerCase())
          ? String(r.valuation_method || '').trim().toLowerCase()
          : 'weighted_average',
        location: r.location || null,
        is_service: parseBool(r.is_service),
        is_active: true,
        _currentStockForMovement: currentStock,
        _currentCostForMovement: currentCost,
      });
    });

    let created = 0;
    let createdIds: string[] = [];
    if (rowsToInsert.length > 0) {
      const BATCH = 100;
      for (let i = 0; i < rowsToInsert.length; i += BATCH) {
        const batch = rowsToInsert.slice(i, i + BATCH);
        const payload = batch.map((r: any) => {
          const { _currentStockForMovement, _currentCostForMovement, ...rest } = r;
          return rest;
        });
        const { data, error } = await getSupabaseServer().from('product').insert(payload).select('id, current_stock, current_cost');
        if (error) {
          const msg = String(error.message || error);
          if (msg.includes('duplicate') || msg.includes('23505')) {
            for (const row of batch) {
              const singlePayload = { ...row };
              delete singlePayload._currentStockForMovement;
              delete singlePayload._currentCostForMovement;
              const { data: single, error: oneErr } = await getSupabaseServer().from('product').insert(singlePayload).select('id, current_stock, current_cost').single();
              if (!oneErr && single) {
                created++;
                createdIds.push((single as any).id);
                if ((single as any).current_stock > 0) {
                  await createInitialMovement(tenantId, empresa.companyId, (single as any).id, (single as any).current_stock, (row as any)._currentCostForMovement);
                }
              } else if (oneErr && String(oneErr.message || oneErr).includes('23505')) {
                skippedDuplicates++;
              } else {
                errors.push({ row: -1, message: `${row.name}: ${String(oneErr?.message || oneErr)}` });
              }
            }
          } else {
            return NextResponse.json({ error: `Error al guardar productos: ${msg}` }, { status: 500 });
          }
        } else {
          const rows = Array.isArray(data) ? data : [data];
          created += rows.length;
          for (const r of rows as any[]) {
            createdIds.push(r.id);
            if (r.current_stock > 0) {
              const orig = batch.find((b: any) => b.current_stock === r.current_stock && b.current_cost === r.current_cost);
              await createInitialMovement(tenantId, empresa.companyId, r.id, r.current_stock, orig?._currentCostForMovement ?? r.current_cost);
            }
          }
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
      message: `${created} productos creados` +
        (skippedDuplicates ? `, ${skippedDuplicates} duplicados omitidos` : '') +
        (errors.length ? `, ${errors.length} con errores` : ''),
    });
  } catch (error: any) {
    const respuesta = respuestaDeErrorDeEmpresa(error);
    if (respuesta) return respuesta;
    console.error('inventory/products/import error', error);
    return NextResponse.json({ error: error?.message ?? 'Error interno' }, { status: 500 });
  }
}

async function createInitialMovement(
  tenantId: string,
  companyId: string | null,
  productId: string,
  quantity: number,
  unitCost: number,
) {
  try {
    await (getSupabaseServer() as any).from('inventory_movement').insert({
      tenant_id: tenantId,
      // Sin esto el movimiento de stock inicial queda solo con `tenant_id` y el
      // kardex de la empresa hermana lo cuenta igual que el propio.
      ...(companyId ? { company_id: companyId } : {}),
      product_id: productId,
      movement_type: 'IN',
      movement_reason: 'initial_stock',
      quantity,
      unit_cost: unitCost,
      total_cost: quantity * unitCost,
      stock_before: 0,
      stock_after: quantity,
      notes: 'Stock inicial importado',
      created_by: 'system',
    });
  } catch (e) {
    console.warn('No se pudo crear movimiento inicial', productId, e);
  }
}