export type SalesBookItemType = 'VENTA' | 'INGRESO' | 'IMPUESTO' | 'OTRO';

export type SalesBookItem = {
  code: string;
  name: string;
  type: SalesBookItemType;
  amount: number;
  tax: number;
  total: number;
  date: string;
  customer?: string;
  transactionId?: string;
};

export function classifySalesItemType(code: string, name: string = ''): SalesBookItemType {
  const startsWith = (p: string) => code.trim().startsWith(p);
  if (/ISV|impuesto|IVA/i.test(name)) return 'IMPUESTO';
  if (/ISV|IDIV|IVA/i.test(code)) return 'IMPUESTO';
  if (startsWith('4')) return 'VENTA';
  if (startsWith('7') || startsWith('8')) return 'INGRESO';
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

function isTaxAccount(item: any): boolean {
  return accountType(item) === 'LIABILITY' && /ISV|impuesto|IVA/i.test(accountName(item));
}

export function transformToLibroVentas(data: any[]): SalesBookItem[] {
  const raw = data || [];

  const totalISV = raw.filter(isTaxAccount).reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);

  const revenueItems = raw.filter(
    (item: any) => accountType(item) === 'REVENUE' && Math.abs(accountBalance(item)) > 0
  );
  const totalRevenueBase = revenueItems.reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);

  const effectiveRate = totalISV > 0 && totalRevenueBase > 0 ? totalISV / totalRevenueBase : 0;

  const items: SalesBookItem[] = [];

  revenueItems.forEach((item: any) => {
    const total = round2(Math.abs(accountBalance(item)));
    const tax = round2(total * effectiveRate);
    const amount = round2(Math.max(0, total - tax));
    items.push({
      code: accountCode(item),
      name: accountName(item),
      type: classifySalesItemType(accountCode(item), accountName(item)),
      amount,
      tax,
      total: round2(amount + tax),
      date: item.date || '',
      transactionId: item.id,
      customer: item.customer,
    });
  });

  raw.forEach((item: any) => {
    if (isTaxAccount(item) && Math.abs(accountBalance(item)) > 0) {
      items.push({
        code: accountCode(item),
        name: accountName(item),
        type: 'IMPUESTO',
        amount: round2(Math.abs(accountBalance(item))),
        tax: 0,
        total: round2(Math.abs(accountBalance(item))),
        date: item.date || '',
        transactionId: item.id,
      });
    }
  });

  return items.sort((a, b) => a.code.localeCompare(b.code));
}

export interface GroupedSalesBook {
  ventas: SalesBookItem[];
  ingresos: SalesBookItem[];
  impuestos: SalesBookItem[];
  otros: SalesBookItem[];
  totalVentas: number;
  totalIngresos: number;
  totalImpuestos: number;
  totalOtros: number;
  totalNeto: number;
  totalISV: number;
  total: number;
}

export function computeSalesBookTotals(
  grouped: Pick<GroupedSalesBook, 'totalVentas' | 'totalIngresos' | 'totalImpuestos' | 'totalOtros'>
): Pick<GroupedSalesBook, 'totalNeto' | 'totalISV' | 'total'> {
  const totalNeto = grouped.totalVentas + grouped.totalIngresos;
  const totalISV = grouped.totalImpuestos;
  const total = totalNeto + totalISV + grouped.totalOtros;
  return { totalNeto, totalISV, total };
}

export function groupSalesBookItems(items: SalesBookItem[]): GroupedSalesBook {
  const ventas = items.filter((i) => i.type === 'VENTA');
  const ingresos = items.filter((i) => i.type === 'INGRESO');
  const impuestos = items.filter((i) => i.type === 'IMPUESTO');
  const otros = items.filter((i) => i.type === 'OTRO');

  const totalVentas = ventas.reduce((sum, i) => sum + i.amount, 0);
  const totalIngresos = ingresos.reduce((sum, i) => sum + i.amount, 0);
  const totalImpuestos = impuestos.reduce((sum, i) => sum + i.amount, 0);
  const totalOtros = otros.reduce((sum, i) => sum + i.amount, 0);
  const totals = computeSalesBookTotals({ totalVentas, totalIngresos, totalImpuestos, totalOtros });

  return {
    ventas,
    ingresos,
    impuestos,
    otros,
    totalVentas,
    totalIngresos,
    totalImpuestos,
    totalOtros,
    totalNeto: totals.totalNeto,
    totalISV: totals.totalISV,
    total: totals.total,
  };
}

export function formatSalesBookForExcel(items: SalesBookItem[]): any[][] {
  const rows: any[][] = [['CLIENTE', 'FECHA', 'CUENTA', 'TIPO', 'BASE', 'ISV', 'TOTAL']];
  items.forEach((i) => {
    rows.push([i.customer || '', i.date || '', i.code, i.type, round2(i.amount), round2(i.tax), round2(i.total)]);
  });
  const grouped = groupSalesBookItems(items);
  const totals = computeSalesBookTotals(grouped);
  rows.push(['TOTAL', '', '', '', round2(totals.totalNeto), round2(totals.totalISV), round2(totals.total)]);
  return rows;
}