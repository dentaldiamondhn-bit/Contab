import {
  transformToLibroRetenciones,
  groupWithholdingBookItems,
} from '@/lib/reports/withholding-book';

export type AnnualTaxRow = {
  cuenta: string;
  nombre: string;
  monto: number;
  categoria: string;
};

export type AnnualTaxDecl = {
  concepto: string;
  base: number;
  amount: number;
  periodo: { year: number };
  detalle: AnnualTaxRow[];
  subtotales: Record<string, number>;
};

export type AnnualTaxSummary = {
  isv: AnnualTaxDecl;
  isr: AnnualTaxDecl;
  retenciones: AnnualTaxDecl;
};

export type AnnualTaxRowType = 'INGRESO' | 'COMPRA' | 'DEDUCCION' | 'RETENCION' | 'ISV' | 'OTRO';

const ISR_CORPORATE_RATE = 0.25;

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

function isTaxAccount(item: any): boolean {
  return accountType(item) === 'LIABILITY' && /ISV|impuesto|IVA/i.test(accountName(item));
}

function isRevenueItem(item: any): boolean {
  return accountType(item) === 'REVENUE' && Math.abs(accountBalance(item)) > 0;
}

function isExpenseItem(item: any): boolean {
  return accountType(item) === 'EXPENSE' && accountBalance(item) > 0;
}

function isDeductibleExpense(code: string, name: string): boolean {
  return /^[56]/.test(code.trim()) || /ISR|IMP\.? SOBRE LA RENTA|RENTA/i.test(name);
}

export function classifyAnnualTaxRowType(code: string, name: string = ''): AnnualTaxRowType {
  const c = String(code || '').toUpperCase();
  const n = String(name || '').toUpperCase();
  const startsWith = (p: string) => c.startsWith(p);
  if (/RETENC|RENTA|ISR|IMP\.? SOBRE LA RENTA/.test(c) || /RETENC|RENTA|ISR|IMP\.? SOBRE LA RENTA/.test(n)) return 'RETENCION';
  if (/ISV|IDIV|IVA/.test(c) || /ISV|IVA|IMP\.? SOBRE VENTAS/.test(n)) return 'ISV';
  if (startsWith('4') || startsWith('7') || startsWith('8')) return 'INGRESO';
  if (startsWith('5')) return 'COMPRA';
  if (startsWith('6')) return 'DEDUCCION';
  return 'OTRO';
}

function getISVEffectiveRates(raw: any[]) {
  const totalISV = raw.filter(isTaxAccount).reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);
  const baseVentas = raw.filter(isRevenueItem).reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);
  const baseCompras = raw.filter(isExpenseItem).reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);
  const revenueRate = totalISV > 0 && baseVentas > 0 ? totalISV / baseVentas : 0;
  const expenseRate = totalISV > 0 && baseCompras > 0 ? totalISV / baseCompras : 0;
  return { totalISV, baseVentas, baseCompras, revenueRate, expenseRate };
}

export function computeAnnualISV(data: any[]): {
  debitoFiscal: number;
  creditoFiscal: number;
  baseVentas: number;
  baseCompras: number;
  impuesto: number;
} {
  const raw = data || [];
  const { baseVentas, baseCompras, revenueRate, expenseRate } = getISVEffectiveRates(raw);
  const debitoFiscal = round2(baseVentas * revenueRate);
  const creditoFiscal = round2(baseCompras * expenseRate);
  return {
    debitoFiscal,
    creditoFiscal,
    baseVentas: round2(baseVentas),
    baseCompras: round2(baseCompras),
    impuesto: round2(debitoFiscal - creditoFiscal),
  };
}

export function computeAnnualISR(data: any[]): {
  ingresos: number;
  deducciones: number;
  base: number;
  impuesto: number;
} {
  const raw = data || [];
  const ingresos = raw.filter(isRevenueItem).reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);
  const deducciones = raw
    .filter((item) => isExpenseItem(item) && isDeductibleExpense(accountCode(item), accountName(item)))
    .reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);
  const base = round2(Math.max(0, ingresos - deducciones));
  return {
    ingresos: round2(ingresos),
    deducciones: round2(deducciones),
    base,
    impuesto: round2(base * ISR_CORPORATE_RATE),
  };
}

export function computeAnnualRetenciones(data: any[]): {
  retenciones: number;
  base: number;
  porTipo: Record<string, number>;
} {
  const raw = data || [];
  const items = transformToLibroRetenciones(raw);
  const grouped = groupWithholdingBookItems(items);
  const porTipo: Record<string, number> = {
    RETENCION: round2(grouped.totalRetenciones),
    IR: round2(grouped.totalIR),
    ISR: round2(grouped.totalISR),
    IGV: round2(grouped.totalIGV),
    OTRO: round2(grouped.totalOtros),
  };
  return {
    retenciones: round2(grouped.totalNeto),
    base: round2(grouped.totalBase),
    porTipo,
  };
}

function buildISVRows(raw: any[], calc: ReturnType<typeof computeAnnualISV>): AnnualTaxRow[] {
  const { revenueRate, expenseRate } = getISVEffectiveRates(raw);
  const rows: AnnualTaxRow[] = [];
  raw.forEach((item: any) => {
    if (!isRevenueItem(item) || revenueRate <= 0) return;
    rows.push({
      cuenta: accountCode(item),
      nombre: accountName(item),
      monto: round2(Math.abs(accountBalance(item)) * revenueRate),
      categoria: 'Debito fiscal',
    });
  });
  raw.forEach((item: any) => {
    if (!isExpenseItem(item) || expenseRate <= 0) return;
    rows.push({
      cuenta: accountCode(item),
      nombre: accountName(item),
      monto: round2(Math.abs(accountBalance(item)) * expenseRate),
      categoria: 'Credito fiscal',
    });
  });
  return rows.length > 0 ? rows : [
    { cuenta: '', nombre: 'Debito fiscal (ventas)', monto: calc.debitoFiscal, categoria: 'Debito fiscal' },
    { cuenta: '', nombre: 'Credito fiscal (compras)', monto: calc.creditoFiscal, categoria: 'Credito fiscal' },
  ];
}

function buildISRRows(raw: any[]): AnnualTaxRow[] {
  const rows: AnnualTaxRow[] = [];
  raw.forEach((item: any) => {
    if (!isRevenueItem(item)) return;
    rows.push({
      cuenta: accountCode(item),
      nombre: accountName(item),
      monto: round2(Math.abs(accountBalance(item))),
      categoria: classifyAnnualTaxRowType(accountCode(item), accountName(item)),
    });
  });
  raw.forEach((item: any) => {
    if (!isExpenseItem(item) || !isDeductibleExpense(accountCode(item), accountName(item))) return;
    rows.push({
      cuenta: accountCode(item),
      nombre: accountName(item),
      monto: round2(Math.abs(accountBalance(item))),
      categoria: classifyAnnualTaxRowType(accountCode(item), accountName(item)),
    });
  });
  return rows;
}

function buildRetencionesRows(raw: any[]): AnnualTaxRow[] {
  return transformToLibroRetenciones(raw).map((item) => ({
    cuenta: item.code,
    nombre: item.name,
    monto: round2(item.amount),
    categoria: item.type,
  }));
}

export function transformToAnnualTaxDeclarations(
  data: any[],
  options?: { year?: number }
): AnnualTaxSummary {
  const raw = data || [];
  const year = options?.year || new Date().getFullYear();

  const isvCalc = computeAnnualISV(raw);
  const isrCalc = computeAnnualISR(raw);
  const retCalc = computeAnnualRetenciones(raw);

  return {
    isv: {
      concepto: 'ISV (Impuesto Sobre Ventas)',
      base: isvCalc.baseVentas,
      amount: isvCalc.impuesto,
      periodo: { year },
      detalle: buildISVRows(raw, isvCalc),
      subtotales: {
        'Debito fiscal': isvCalc.debitoFiscal,
        'Credito fiscal': isvCalc.creditoFiscal,
        'Base ventas': isvCalc.baseVentas,
        'Base compras': isvCalc.baseCompras,
      },
    },
    isr: {
      concepto: 'ISR (Impuesto Sobre la Renta)',
      base: isrCalc.base,
      amount: isrCalc.impuesto,
      periodo: { year },
      detalle: buildISRRows(raw),
      subtotales: {
        'Ingresos gravados': isrCalc.ingresos,
        'Deducciones': isrCalc.deducciones,
        'Impuesto calculado (25%)': isrCalc.impuesto,
      },
    },
    retenciones: {
      concepto: 'Retenciones',
      base: retCalc.base,
      amount: retCalc.retenciones,
      periodo: { year },
      detalle: buildRetencionesRows(raw),
      subtotales: retCalc.porTipo,
    },
  };
}

export function formatAnnualTaxForExcel(summary: AnnualTaxSummary): Record<string, any[][]> {
  const header = ['CUENTA', 'DESCRIPCION', 'CATEGORIA', 'MONTO'];
  const buildSheet = (title: string, decl: AnnualTaxDecl, totalLabel: string): any[][] => {
    const rows: any[][] = [
      [`DECLARACION ANUAL ${title}`],
      [`Ejercicio fiscal ${decl.periodo.year}`],
      [],
      header,
    ];
    decl.detalle.forEach((row) => {
      rows.push([row.cuenta || '', row.nombre, row.categoria, round2(row.monto)]);
    });
    Object.entries(decl.subtotales || {}).forEach(([label, value]) => {
      rows.push(['', label, 'Subtotal', round2(value)]);
    });
    rows.push(['', '', totalLabel, round2(decl.amount)]);
    rows.push([]);
    return rows;
  };
  return {
    ISV: buildSheet('ISV', summary.isv, 'TOTAL ISV A PAGAR / SALDO A FAVOR'),
    ISR: buildSheet('ISR', summary.isr, 'TOTAL ISR'),
    Retenciones: buildSheet('RETENCIONES', summary.retenciones, 'TOTAL RETENCIONES'),
  };
}