import { getSupabaseServer } from '@/lib/supabase/server-lazy';
import { TENANT_ID } from '@/lib/purchase-db';

export interface DiatDeclarante {
  companyId: string;
  rtn: string;
  razonSocial: string;
  domicilioFiscal: string;
  telefono: string;
  email: string;
  regimen: string;
}

export interface DiatByRate {
  exentas: number;
  exentasCount: number;
  gravadas15: number;
  gravadas15Count: number;
  gravadas18: number;
  gravadas18Count: number;
  otras: number;
  otrasCount: number;
  impuesto: number;
  total: number;
}

export interface DiatCaiGroup {
  cai: string;
  documents: number;
  total: number;
  impuesto: number;
  lastDate: string;
}

export interface DiatVentaRecord {
  id: string;
  rtn: string;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fecha: string;
  cai: string;
  exento: number;
  gravado: number;
  impuesto: number;
  total: number;
  anulada: boolean;
}

export interface DiatCompraRecord {
  id: string;
  supplierId: string;
  supplierRtn: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  cai: string;
  exento: number;
  gravado: number;
  impuesto: number;
  total: number;
  purchaseType: string;
  status: string;
}

export interface DiatSupplierGroup {
  supplierId: string;
  supplierRtn: string;
  supplierName: string;
  documents: number;
  exento: number;
  gravado: number;
  impuesto: number;
  total: number;
}

export interface DiatResumen {
  totalFacturas: number;
  totalVentas: number;
  impuestoVentas: number;
  totalCompras: number;
  impuestoCompras: number;
  creditoFiscal: number;
  isvAPagar: number;
  operaciones: number;
}

export interface DiatReport {
  companyId: string;
  period: string;
  declarante: DiatDeclarante;
  ventas: {
    totals: DiatByRate;
    byCai: DiatCaiGroup[];
    records: DiatVentaRecord[];
    source: 'libro_ventas' | 'ninguna';
  };
  compras: {
    totals: DiatByRate;
    bySupplier: DiatSupplierGroup[];
    records: DiatCompraRecord[];
    source: 'Purchase' | 'ninguna';
  };
  resumen: DiatResumen;
  generatedAt: string;
}

const pad = (n: number) => String(n).padStart(2, '0');

function periodRange(period: string): { start: string; end: string } {
  const [y, m] = period.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return {
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${pad(lastDay)}`,
  };
}

function emptyTotals(): DiatByRate {
  return {
    exentas: 0,
    exentasCount: 0,
    gravadas15: 0,
    gravadas15Count: 0,
    gravadas18: 0,
    gravadas18Count: 0,
    otras: 0,
    otrasCount: 0,
    impuesto: 0,
    total: 0,
  };
}

function num(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function rateBucket(rate: number): { amount: 'exentas' | 'gravadas15' | 'gravadas18' | 'otras'; count: 'exentasCount' | 'gravadas15Count' | 'gravadas18Count' | 'otrasCount' } {
  if (rate === 0) return { amount: 'exentas', count: 'exentasCount' };
  if (rate === 15) return { amount: 'gravadas15', count: 'gravadas15Count' };
  if (rate === 18) return { amount: 'gravadas18', count: 'gravadas18Count' };
  return { amount: 'otras', count: 'otrasCount' };
}

async function resolveCompany(companyId: string): Promise<DiatDeclarante | null> {
  const supabase = getSupabaseServer();

  const byTenant = await supabase
    .from('companies')
    .select('*')
    .eq('tenant_id', companyId)
    .limit(1)
    .maybeSingle();

  if (byTenant.data) return companyToDeclarante(companyId, byTenant.data);

  const byId = await supabase
    .from('companies')
    .select('*')
    .eq('id', companyId)
    .limit(1)
    .maybeSingle();

  if (byId.data) return companyToDeclarante(companyId, byId.data);

  return null;
}

function companyToDeclarante(companyId: string, c: any): DiatDeclarante {
  return {
    companyId,
    rtn: String(c.rtn || c.business_rtn || ''),
    razonSocial: String(c.name || c.business_name || 'Empresa sin nombre'),
    domicilioFiscal: String(c.address || c.direccion_fiscal || c.business_address || ''),
    telefono: String(c.phone || c.telefono_fiscal || ''),
    email: String(c.email || c.email_fiscal || ''),
    regimen: String(c.regimen_tributario || 'Régimen General'),
  };
}

function groupByCai(records: DiatVentaRecord[]): DiatCaiGroup[] {
  const map = new Map<string, DiatCaiGroup>();
  for (const r of records) {
    if (r.anulada) continue;
    const key = r.cai || 'S/CAI';
    let group = map.get(key);
    if (!group) {
      group = { cai: key, documents: 0, total: 0, impuesto: 0, lastDate: '' };
      map.set(key, group);
    }
    group.documents += 1;
    group.total += r.total;
    group.impuesto += r.impuesto;
    if (r.fecha > group.lastDate) group.lastDate = r.fecha;
  }
  return Array.from(map.values()).sort((a, b) => b.total - a.total);
}

async function fetchVentas(companyId: string, period: string): Promise<{ records: DiatVentaRecord[]; totals: DiatByRate; byCai: DiatCaiGroup[] }> {
  const supabase = getSupabaseServer();
  const { start, end } = periodRange(period);
  const empty = { records: [] as DiatVentaRecord[], totals: emptyTotals(), byCai: [] as DiatCaiGroup[] };

  const scoped = await supabase
    .from('libro_ventas')
    .select('*')
    .eq('tenant_id', companyId)
    .gte('invoice_date', start)
    .lte('invoice_date', end);

  let data: any[] | null = null;
  if (!scoped.error) {
    data = scoped.data || [];
  } else {
    const global = await supabase
      .from('libro_ventas')
      .select('*')
      .gte('invoice_date', start)
      .lte('invoice_date', end);
    if (!global.error) {
      data = global.data || [];
    }
  }

  if (!data) return empty;

  const totals = emptyTotals();
  const records: DiatVentaRecord[] = data.map((row: any) => {
    const raw = String(row.status || row.estado || '').toUpperCase();
    const anulada = ['CANCELLED', 'CANCELADA', 'ANULADA', 'ANULADO'].includes(raw);

    const rate = num(row.tax_rate ?? row.tasa_isv);
    const total = num(row.total) ?? num(row.monto_total);
    const exento = num(row.exento) || num(row.monto_exento) || (rate === 0 && !anulada ? total : 0);
    const impuesto = rate === 0 ? 0 : num(row.impuesto) || num(row.isv) || num(row.tax) || num(row.monto_isv);
    const gravado = Math.max(0, total - exento - impuesto);
    const bucket = rateBucket(rate);

    if (!anulada) {
      totals[bucket.amount] += exento;
      totals[bucket.count] += 1;
      totals.impuesto += impuesto;
      totals.total += total;
    }

    return {
      id: String(row.id || ''),
      rtn: String(row.rtn || row.customer_rtn || row.cliente_rtn || ''),
      nombre: String(row.nombre || row.customer_name || row.cliente_nombre || 'Consumidor final'),
      tipoDocumento: String(row.tipo_documento || row.tipo_doc || 'FACT'),
      numeroDocumento: String(row.numero_documento || row.num_documento || row.invoice_number || row.numero || ''),
      fecha: String(row.invoice_date || row.fecha_documento || ''),
      cai: String(row.cai || ''),
      exento,
      gravado,
      impuesto,
      total,
      anulada,
    } as DiatVentaRecord;
  });

  return {
    records,
    totals,
    byCai: groupByCai(records),
  };
}

async function fetchCompras(companyId: string, period: string): Promise<{ records: DiatCompraRecord[]; totals: DiatByRate; bySupplier: DiatSupplierGroup[] }> {
  const supabase = getSupabaseServer();
  const { start, end } = periodRange(period);
  const empty = { records: [] as DiatCompraRecord[], totals: emptyTotals(), bySupplier: [] as DiatSupplierGroup[] };

  const { data, error } = await supabase
    .from('Purchase')
    .select('id, invoice_number, cai, invoice_date, subtotal, tax_rate, tax_amount, total, purchase_type, status, company_id, tenant_id, supplier_id, Supplier:supplier_id(id, name, rtn)')
    .eq('tenant_id', TENANT_ID)
    .eq('company_id', companyId)
    .gte('invoice_date', start)
    .lte('invoice_date', end);

  if (error) return empty;

  const totals = emptyTotals();
  const records: DiatCompraRecord[] = (data || []).map((row: any) => {
    const supplier = Array.isArray(row.Supplier) ? row.Supplier[0] : row.Supplier;
    const rate = num(row.tax_rate);
    const status = String(row.status || '').toUpperCase();
    const cancelada = status === 'CANCELLED';
    const subtotal = num(row.subtotal);
    const exento = rate === 0 ? subtotal : 0;
    const gravado = rate !== 0 ? subtotal : 0;
    const impuesto = num(row.tax_amount);
    const bucket = rateBucket(rate);

    if (!cancelada) {
      totals[bucket.amount] += exento + gravado;
      totals[bucket.count] += 1;
      totals.impuesto += impuesto;
      totals.total += num(row.total);
    }

    return {
      id: String(row.id || ''),
      supplierId: String(supplier?.id || row.supplier_id || ''),
      supplierRtn: String(supplier?.rtn || ''),
      supplierName: String(supplier?.name || 'Proveedor desconocido'),
      invoiceNumber: String(row.invoice_number || ''),
      invoiceDate: String(row.invoice_date || ''),
      cai: String(row.cai || ''),
      exento,
      gravado,
      impuesto,
      total: num(row.total),
      purchaseType: String(row.purchase_type || ''),
      status,
    } as DiatCompraRecord;
  });

  const byMap = new Map<string, DiatSupplierGroup>();
  for (const r of records) {
    if (r.status === 'CANCELLED') continue;
    let g = byMap.get(r.supplierId);
    if (!g) {
      g = { supplierId: r.supplierId, supplierRtn: r.supplierRtn, supplierName: r.supplierName, documents: 0, exento: 0, gravado: 0, impuesto: 0, total: 0 };
      byMap.set(r.supplierId, g);
    }
    g.documents += 1;
    g.exento += r.exento;
    g.gravado += r.gravado;
    g.impuesto += r.impuesto;
    g.total += r.total;
  }

  return {
    records,
    totals,
    bySupplier: Array.from(byMap.values()).sort((a, b) => b.total - a.total),
  };
}

async function addPeriod(set: Set<string>, period: string | null | undefined) {
  if (period && /^\d{4}-\d{2}/.test(period)) set.add(period.slice(0, 7));
}

async function collectDiatPeriods(companyId: string): Promise<string[]> {
  const supabase = getSupabaseServer();
  const months = new Set<string>();

  const purchases = await supabase
    .from('Purchase')
    .select('invoice_date')
    .eq('tenant_id', TENANT_ID)
    .eq('company_id', companyId);
  (purchases.data || []).forEach((p) => addPeriod(months, (p as any).invoice_date));

  const ventas = await supabase.from('libro_ventas').select('invoice_date');
  (ventas.data || []).forEach((v) => addPeriod(months, (v as any).invoice_date));

  const compras = await supabase.from('libro_compras').select('invoice_date');
  (compras.data || []).forEach((c) => addPeriod(months, (c as any).invoice_date));

  return Array.from(months).sort().reverse();
}

export async function hasDiatData(companyId: string): Promise<boolean> {
  const months = await collectDiatPeriods(companyId);
  return months.length > 0;
}

export async function getAvailableDiatPeriods(companyId: string): Promise<string[]> {
  const months = await collectDiatPeriods(companyId);

  if (months.length === 0) {
    const now = new Date();
    months.push(`${now.getFullYear()}-${pad(now.getMonth() + 1)}`);
  }

  return months;
}

export async function getDiatReport(companyId: string, period: string): Promise<DiatReport> {
  const [declaranteRow, ventasData, comprasData] = await Promise.all([
    resolveCompany(companyId),
    fetchVentas(companyId, period),
    fetchCompras(companyId, period),
  ]);

  const declarante: DiatDeclarante = declaranteRow || {
    companyId,
    rtn: '',
    razonSocial: `Empresa ${companyId}`,
    domicilioFiscal: '',
    telefono: '',
    email: '',
    regimen: 'Régimen General',
  };

  const resumen: DiatResumen = {
    totalFacturas:
      ventasData.totals.exentasCount +
      ventasData.totals.gravadas15Count +
      ventasData.totals.gravadas18Count +
      ventasData.totals.otrasCount,
    totalVentas: ventasData.totals.total,
    impuestoVentas: ventasData.totals.impuesto,
    totalCompras: comprasData.totals.total,
    impuestoCompras: comprasData.totals.impuesto,
    creditoFiscal: comprasData.totals.impuesto,
    isvAPagar: ventasData.totals.impuesto - comprasData.totals.impuesto,
    operaciones: ventasData.records.length + comprasData.records.length,
  };

  return {
    companyId,
    period,
    declarante,
    ventas: {
      totals: ventasData.totals,
      byCai: ventasData.byCai,
      records: ventasData.records,
      source: ventasData.records.length > 0 ? 'libro_ventas' : 'ninguna',
    },
    compras: {
      totals: comprasData.totals,
      bySupplier: comprasData.bySupplier,
      records: comprasData.records,
      source: comprasData.records.length > 0 ? 'Purchase' : 'ninguna',
    },
    resumen,
    generatedAt: new Date().toISOString(),
  };
}

const csvCell = (v: any) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export function diatToCsv(report: DiatReport): string {
  const lines: string[] = [];

  lines.push('DIAT - Declaracion Informativa de Actividades');
  lines.push(`RTN: ${csvCell(report.declarante.rtn)}`);
  lines.push(`Razon Social: ${csvCell(report.declarante.razonSocial)}`);
  lines.push(`Domicilio: ${csvCell(report.declarante.domicilioFiscal)}`);
  lines.push(`Periodo: ${csvCell(report.period)}`);
  lines.push(`Generado: ${csvCell(report.generatedAt)}`);
  lines.push('');

  lines.push('RESUMEN');
  lines.push('Concepto,Monto');
  lines.push(`Total Ventas,${csvCell(report.resumen.totalVentas.toFixed(2))}`);
  lines.push(`ISV Debito Fiscal,${csvCell(report.resumen.impuestoVentas.toFixed(2))}`);
  lines.push(`Total Compras,${csvCell(report.resumen.totalCompras.toFixed(2))}`);
  lines.push(`Credito Fiscal,${csvCell(report.resumen.creditoFiscal.toFixed(2))}`);
  lines.push(`ISV a Pagar,${csvCell(report.resumen.isvAPagar.toFixed(2))}`);
  lines.push('');

  lines.push('VENTAS (Libro de Ventas)');
  lines.push('RTN,Nombre,TipoDoc,Numero,Fecha,CAI,Exento,Gravado,ISV,Total,Anulada');
  report.ventas.records.forEach((r) => {
    lines.push(
      [r.rtn, r.nombre, r.tipoDocumento, r.numeroDocumento, r.fecha, r.cai, r.exento, r.gravado, r.impuesto, r.total, r.anulada ? 'SI' : 'NO']
        .map(csvCell)
        .join(',')
    );
  });
  lines.push('');

  lines.push('COMPRAS (Registro de Compras)');
  lines.push('Proveedor RTN,Proveedor,Factura,Fecha,CAI,Exento,Gravado,ISV,Total,Tipo,Estado');
  report.compras.records.forEach((r) => {
    lines.push(
      [r.supplierRtn, r.supplierName, r.invoiceNumber, r.invoiceDate, r.cai, r.exento, r.gravado, r.impuesto, r.total, r.purchaseType, r.status]
        .map(csvCell)
        .join(',')
    );
  });

  return lines.join('\r\n');
}