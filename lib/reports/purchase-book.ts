export type PurchaseBookItemType = 'COMPRA' | 'GASTO' | 'IMPUESTO' | 'OTRO';

export type PurchaseBookItem = {
  code: string;
  name: string;
  type: PurchaseBookItemType;
  amount: number;
  tax: number;
  total: number;
  date: string;
  supplier?: string;
  transactionId?: string;
};

export function classifyPurchaseItemType(code: string, name: string = ''): PurchaseBookItemType {
  const startsWith = (p: string) => code.trim().startsWith(p);
  if (/ISV|impuesto|IVA/i.test(name)) return 'IMPUESTO';
  if (/ISV|IDIV|IVA/i.test(code)) return 'IMPUESTO';
  if (startsWith('5')) return 'COMPRA';
  if (startsWith('6')) return 'GASTO';
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

export function transformToLibroCompras(data: any[]): PurchaseBookItem[] {
  const raw = data || [];

  const totalISV = raw.filter(isTaxAccount).reduce((sum, item) => sum + Math.abs(accountBalance(item)), 0);

  const expenseItems = raw.filter(
    (item: any) => accountType(item) === 'EXPENSE' && accountBalance(item) > 0
  );
  const totalExpenseBase = expenseItems.reduce((sum, item) => sum + accountBalance(item), 0);

  const effectiveRate = totalISV > 0 && totalExpenseBase > 0 ? totalISV / totalExpenseBase : 0;

  const items: PurchaseBookItem[] = [];

  expenseItems.forEach((item: any) => {
    const total = round2(Math.abs(accountBalance(item)));
    const tax = round2(total * effectiveRate);
    const amount = round2(Math.max(0, total - tax));
    items.push({
      code: accountCode(item),
      name: accountName(item),
      type: classifyPurchaseItemType(accountCode(item), accountName(item)),
      amount,
      tax,
      total: round2(amount + tax),
      date: item.date || '',
      transactionId: item.id,
      supplier: item.supplier,
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

export interface GroupedPurchaseBook {
  compras: PurchaseBookItem[];
  gastos: PurchaseBookItem[];
  impuestos: PurchaseBookItem[];
  otros: PurchaseBookItem[];
  totalCompras: number;
  totalGastos: number;
  totalImpuestos: number;
  totalOtros: number;
  totalNeto: number;
  totalISV: number;
  total: number;
}

export function computePurchaseBookTotals(
  grouped: Pick<GroupedPurchaseBook, 'totalCompras' | 'totalGastos' | 'totalImpuestos' | 'totalOtros'>
): Pick<GroupedPurchaseBook, 'totalNeto' | 'totalISV' | 'total'> {
  const totalNeto = grouped.totalCompras + grouped.totalGastos;
  const totalISV = grouped.totalImpuestos;
  const total = totalNeto + totalISV + grouped.totalOtros;
  return { totalNeto, totalISV, total };
}

export function groupPurchaseBookItems(items: PurchaseBookItem[]): GroupedPurchaseBook {
  const compras = items.filter((i) => i.type === 'COMPRA');
  const gastos = items.filter((i) => i.type === 'GASTO');
  const impuestos = items.filter((i) => i.type === 'IMPUESTO');
  const otros = items.filter((i) => i.type === 'OTRO');

  const totalCompras = compras.reduce((sum, i) => sum + i.amount, 0);
  const totalGastos = gastos.reduce((sum, i) => sum + i.amount, 0);
  const totalImpuestos = impuestos.reduce((sum, i) => sum + i.amount, 0);
  const totalOtros = otros.reduce((sum, i) => sum + i.amount, 0);
  const totals = computePurchaseBookTotals({ totalCompras, totalGastos, totalImpuestos, totalOtros });

  return {
    compras,
    gastos,
    impuestos,
    otros,
    totalCompras,
    totalGastos,
    totalImpuestos,
    totalOtros,
    totalNeto: totals.totalNeto,
    totalISV: totals.totalISV,
    total: totals.total,
  };
}

export function formatPurchaseBookForExcel(items: PurchaseBookItem[]): any[][] {
  const rows: any[][] = [['PROVEEDOR', 'FECHA', 'CUENTA', 'TIPO', 'BASE', 'ISV', 'TOTAL']];
  items.forEach((i) => {
    rows.push([i.supplier || '', i.date || '', i.code, i.type, round2(i.amount), round2(i.tax), round2(i.total)]);
  });
  const grouped = groupPurchaseBookItems(items);
  const totals = computePurchaseBookTotals(grouped);
  rows.push(['TOTAL', '', '', '', round2(totals.totalNeto), round2(totals.totalISV), round2(totals.total)]);
  return rows;
}