export type WithholdingBookItemType = 'RETENCION' | 'IR' | 'ISR' | 'IGV' | 'OTRO';

export type WithholdingBookItem = {
  code: string;
  name: string;
  type: WithholdingBookItemType;
  rate: number;
  amount: number;
  total: number;
  date: string;
  provider?: string;
  transactionId?: string;
};

export function classifyWithholdingItemType(code: string, name: string = ''): WithholdingBookItemType {
  const c = String(code || '').toUpperCase();
  const n = String(name || '').toUpperCase();
  if (/12[.,]?5\s*%/.test(n) || /\bIR\b/.test(c) || /\bIR\b/.test(n)) return 'IR';
  if (/ISR/.test(c) || /ISR/.test(n) || /RENTA/.test(n) || /1\s*%/.test(n)) return 'ISR';
  if (/IGV/.test(c) || /IGV/.test(n) || /ISV/.test(c) || /ISV/.test(n)) return 'IGV';
  if (/RETENC/.test(c) || /RETENC/.test(n)) return 'RETENCION';
  return 'OTRO';
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function accountType(item: any): string {
  const account = item.account || {};
  return account.type || item.type || '';
}

function accountCode(item: any): string {
  const account = item.account || {};
  return account.code || item.code || '';
}

function accountName(item: any): string {
  const account = item.account || {};
  return account.name || item.name || 'Sin nombre';
}

function accountBalance(item: any): number {
  return parseFloat(item.balance ?? 0) || 0;
}

function isWithholdingAccount(item: any): boolean {
  const name = accountName(item);
  const code = accountCode(item);
  return (
    /RETENC|RENTA|ISR|IGV|ISV|IMP\.? SOBRE VENTAS/.test(name) ||
    /RETENC|RENTA|ISR|IGV|ISV/.test(code)
  );
}

function deriveRate(name: string): number {
  const m = String(name || '').match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (m) return Math.round(parseFloat(m[1].replace(',', '.')) * 100) / 100;
  if (/ISR|RENTA|IMP\.? SOBRE LA RENTA|1\s*%/.test(name)) return 1;
  if (/\bIR\b|12[.,]?5/.test(name)) return 12.5;
  if (/ISV|IGV|IMP\.? SOBRE VENTAS/.test(name)) return 15;
  return 0;
}

export function transformToLibroRetenciones(data: any[]): WithholdingBookItem[] {
  const raw = data || [];

  const items: WithholdingBookItem[] = [];

  raw.forEach((item: any) => {
    if (accountType(item) !== 'LIABILITY') return;
    if (Math.abs(accountBalance(item)) === 0) return;
    if (!isWithholdingAccount(item)) return;

    const code = accountCode(item);
    const name = accountName(item);
    const amount = round2(Math.abs(accountBalance(item)));
    const rate = deriveRate(name);
    const total = rate > 0 ? round2(amount / (rate / 100)) : amount;

    items.push({
      code,
      name,
      type: classifyWithholdingItemType(code, name),
      rate,
      amount,
      total,
      date: item.date || '',
      transactionId: item.id,
      provider: item.supplier || item.customer || item.provider,
    });
  });

  return items.sort((a, b) => a.code.localeCompare(b.code));
}

export interface GroupedWithholdingBook {
  retenciones: WithholdingBookItem[];
  ir: WithholdingBookItem[];
  isr: WithholdingBookItem[];
  igv: WithholdingBookItem[];
  otros: WithholdingBookItem[];
  totalRetenciones: number;
  totalIR: number;
  totalISR: number;
  totalIGV: number;
  totalOtros: number;
  totalBase: number;
  totalNeto: number;
  total: number;
}

export function computeWithholdingBookTotals(
  grouped: Pick<
    GroupedWithholdingBook,
    'totalRetenciones' | 'totalIR' | 'totalISR' | 'totalIGV' | 'totalOtros' | 'totalBase'
  >
): {
  totalRetenciones: number;
  totalBase: number;
  totalNeto: number;
  total: number;
  retencionesPorTipo: Record<string, number>;
} {
  const totalNeto = round2(
    grouped.totalRetenciones + grouped.totalIR + grouped.totalISR + grouped.totalIGV + grouped.totalOtros
  );
  const retencionesPorTipo: Record<string, number> = {
    RETENCION: round2(grouped.totalRetenciones),
    IR: round2(grouped.totalIR),
    ISR: round2(grouped.totalISR),
    IGV: round2(grouped.totalIGV),
    OTRO: round2(grouped.totalOtros),
  };
  return {
    totalRetenciones: totalNeto,
    totalBase: round2(grouped.totalBase),
    totalNeto,
    total: totalNeto,
    retencionesPorTipo,
  };
}

export function groupWithholdingBookItems(items: WithholdingBookItem[]): GroupedWithholdingBook {
  const retenciones = items.filter((i) => i.type === 'RETENCION');
  const ir = items.filter((i) => i.type === 'IR');
  const isr = items.filter((i) => i.type === 'ISR');
  const igv = items.filter((i) => i.type === 'IGV');
  const otros = items.filter((i) => i.type === 'OTRO');

  const totalRetenciones = retenciones.reduce((sum, i) => sum + i.amount, 0);
  const totalIR = ir.reduce((sum, i) => sum + i.amount, 0);
  const totalISR = isr.reduce((sum, i) => sum + i.amount, 0);
  const totalIGV = igv.reduce((sum, i) => sum + i.amount, 0);
  const totalOtros = otros.reduce((sum, i) => sum + i.amount, 0);
  const totalBase = items.reduce((sum, i) => sum + i.total, 0);

  const totals = computeWithholdingBookTotals({
    totalRetenciones,
    totalIR,
    totalISR,
    totalIGV,
    totalOtros,
    totalBase,
  });

  return {
    retenciones,
    ir,
    isr,
    igv,
    otros,
    totalRetenciones,
    totalIR,
    totalISR,
    totalIGV,
    totalOtros,
    totalBase: totals.totalBase,
    totalNeto: totals.totalNeto,
    total: totals.total,
  };
}

export function formatWithholdingBookForExcel(items: WithholdingBookItem[]): any[][] {
  const rows: any[][] = [['PROVEEDOR/CLIENTE', 'FECHA', 'CUENTA', 'TIPO', 'TASA', 'BASE', 'RETENCION']];
  items.forEach((i) => {
    rows.push([i.provider || '', i.date || '', i.code, i.type, i.rate, round2(i.total), round2(i.amount)]);
  });
  const totalBase = items.reduce((sum, i) => sum + i.total, 0);
  const totalRetenciones = items.reduce((sum, i) => sum + i.amount, 0);
  rows.push(['TOTAL', '', '', '', '', round2(totalBase), round2(totalRetenciones)]);
  return rows;
}