export type LedgerItemType = 'ACTIVO' | 'PASIVO' | 'PATRIMONIO' | 'INGRESO' | 'GASTO';

export type LedgerItem = {
  code: string;
  name: string;
  type: LedgerItemType;
  debit: number;
  credit: number;
  balance: number;
  date?: string;
  journalEntry?: any;
};

export type JournalEntryRow = {
  date?: string;
  reference?: string;
  accountName?: string;
  code?: string;
  debit: number;
  credit: number;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
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

export function classifyLedgerType(code: string, name: string = ''): LedgerItemType {
  const c = String(code || '').trim();
  if (c.startsWith('1')) return 'ACTIVO';
  if (c.startsWith('2')) return 'PASIVO';
  if (c.startsWith('3')) return 'PATRIMONIO';
  if (c.startsWith('4') || c.startsWith('5')) return 'INGRESO';
  if (c.startsWith('6') || c.startsWith('7')) return 'GASTO';
  const n = String(name || '').toUpperCase();
  if (/ACTIVO/.test(n)) return 'ACTIVO';
  if (/PASIVO/.test(n)) return 'PASIVO';
  if (/PATRIMONIO|CAPITAL/.test(n)) return 'PATRIMONIO';
  if (/INGRESO|VENTA/.test(n)) return 'INGRESO';
  if (/GASTO/.test(n)) return 'GASTO';
  return 'PATRIMONIO';
}

export function transformToLibroMayor(data: any[]): LedgerItem[] {
  const raw = data || [];

  const items: LedgerItem[] = [];

  raw.forEach((item: any) => {
    if (Math.abs(accountBalance(item)) === 0) return;

    const code = accountCode(item);
    const name = accountName(item);

    items.push({
      code,
      name,
      type: classifyLedgerType(code, name),
      debit: round2(parseFloat(item.debit ?? 0) || 0),
      credit: round2(parseFloat(item.credit ?? 0) || 0),
      balance: round2(accountBalance(item)),
      date: item.date || '',
      journalEntry: item.journalEntry,
    });
  });

  return items.sort((a, b) => a.code.localeCompare(b.code));
}

export function transformToLibroDiario(data: any[]): JournalEntryRow[] {
  const raw = data || [];

  const rows: JournalEntryRow[] = [];

  const hasEntryLevel = raw.some((item: any) => {
    const je = item.journalEntry || item.JournalEntry || item.entries;
    return Array.isArray(je) ? je.length > 0 : je != null;
  });

  if (hasEntryLevel) {
    raw.forEach((item: any) => {
      const je = item.journalEntry || item.JournalEntry || item.entries || [];
      const entries = Array.isArray(je) ? je : [je];
      entries.forEach((entry: any) => {
        const amount = parseFloat(entry.amount ?? 0) || 0;
        if (amount === 0) return;
        const isDebit = entry.type === 'DEBIT' || amount > 0;
        rows.push({
          date: entry.transaction?.date || entry.date || item.date || '',
          reference:
            entry.transaction?.voucherNumber ||
            entry.reference ||
            item.reference ||
            String(entry.description || ''),
          accountName: accountName(item),
          code: accountCode(item),
          debit: isDebit ? round2(Math.abs(amount)) : 0,
          credit: isDebit ? 0 : round2(Math.abs(amount)),
        });
      });
    });
  } else {
    raw.forEach((item: any) => {
      const debit = parseFloat(item.debit ?? 0) || 0;
      const credit = parseFloat(item.credit ?? 0) || 0;
      if (debit === 0 && credit === 0) return;
      rows.push({
        date: item.date || undefined,
        reference: accountName(item),
        accountName: accountName(item),
        code: accountCode(item),
        debit: round2(debit),
        credit: round2(credit),
      });
    });
  }

  return rows;
}

export interface GroupedLedger {
  activos: LedgerItem[];
  pasivos: LedgerItem[];
  patrimonio: LedgerItem[];
  ingresos: LedgerItem[];
  gastos: LedgerItem[];
  totalDebitos: number;
  totalCreditos: number;
  totalBalance: number;
}

export interface LedgerTotals {
  totalDebitos: number;
  totalCreditos: number;
  totalBalance: number;
}

export function computeLedgerTotals(
  grouped: Pick<GroupedLedger, 'totalDebitos' | 'totalCreditos' | 'totalBalance'>
): LedgerTotals {
  return {
    totalDebitos: round2(grouped.totalDebitos),
    totalCreditos: round2(grouped.totalCreditos),
    totalBalance: round2(grouped.totalBalance),
  };
}

export function groupLedgerItems(items: LedgerItem[]): GroupedLedger {
  const activos = items.filter((i) => i.type === 'ACTIVO');
  const pasivos = items.filter((i) => i.type === 'PASIVO');
  const patrimonio = items.filter((i) => i.type === 'PATRIMONIO');
  const ingresos = items.filter((i) => i.type === 'INGRESO');
  const gastos = items.filter((i) => i.type === 'GASTO');

  const totalDebitos = items.reduce((sum, i) => sum + i.debit, 0);
  const totalCreditos = items.reduce((sum, i) => sum + i.credit, 0);
  const totalBalance = items.reduce((sum, i) => sum + i.balance, 0);

  const totals = computeLedgerTotals({ totalDebitos, totalCreditos, totalBalance });

  return {
    activos,
    pasivos,
    patrimonio,
    ingresos,
    gastos,
    totalDebitos: totals.totalDebitos,
    totalCreditos: totals.totalCreditos,
    totalBalance: totals.totalBalance,
  };
}

export function formatLibroMayorForExcel(items: LedgerItem[]): any[][] {
  const rows: any[][] = [['FECHA', 'CUENTA', 'CÓDIGO', 'TIPO', 'DÉBITO', 'CRÉDITO', 'BALANCE']];
  items.forEach((i) => {
    rows.push([i.date || '', i.name, i.code, i.type, round2(i.debit), round2(i.credit), round2(i.balance)]);
  });
  const totalDebitos = items.reduce((sum, i) => sum + i.debit, 0);
  const totalCreditos = items.reduce((sum, i) => sum + i.credit, 0);
  const totalBalance = items.reduce((sum, i) => sum + i.balance, 0);
  rows.push(['TOTAL', '', '', '', round2(totalDebitos), round2(totalCreditos), round2(totalBalance)]);
  return rows;
}

export function formatLibroDiarioForExcel(rows: JournalEntryRow[]): any[][] {
  const out: any[][] = [['FECHA', 'REFERENCIA', 'CUENTA', 'CÓDIGO', 'DÉBITO', 'CRÉDITO']];
  rows.forEach((r) => {
    out.push([
      r.date || '',
      r.reference || '',
      r.accountName || '',
      r.code || '',
      round2(r.debit),
      round2(r.credit),
    ]);
  });
  const totalDebitos = rows.reduce((sum, r) => sum + r.debit, 0);
  const totalCreditos = rows.reduce((sum, r) => sum + r.credit, 0);
  out.push(['TOTAL', '', '', '', round2(totalDebitos), round2(totalCreditos)]);
  return out;
}