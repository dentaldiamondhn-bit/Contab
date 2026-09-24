import {
  transformToFlujoEfectivo,
  groupFlujoItems,
} from '@/lib/reports/cash-flow';
import type { FlujoItem } from '@/lib/reports/cash-flow';

export type QuarterKey = 'Q1' | 'Q2' | 'Q3' | 'Q4';

export interface TrialBalanceItem {
  accountId: string;
  code: string;
  name: string;
  type: string;
  debit: number;
  credit: number;
  balance: number;
  date: string;
  journalEntry?: any;
}

export interface CashFlowQuarterSections {
  operation: FlujoItem[];
  investing: FlujoItem[];
  financing: FlujoItem[];
}

export interface QuarterlyCashFlow {
  quarter: QuarterKey;
  startDate: string;
  endDate: string;
  sections: CashFlowQuarterSections;
  netChange: number;
  openingBalance: number;
  closingBalance: number;
}

export interface CashFlowComparatives {
  quarters: QuarterlyCashFlow[];
  totalNetChange: number;
  totalOperations: number;
  totalInvesting: number;
  totalFinancing: number;
  totalOpening: number;
  totalClosing: number;
  bestQuarter: QuarterKey | null;
  worstQuarter: QuarterKey | null;
  hasData: boolean;
}

const QUARTER_RANGES: Record<QuarterKey, [string, string]> = {
  Q1: ['01-01', '03-31'],
  Q2: ['04-01', '06-30'],
  Q3: ['07-01', '09-30'],
  Q4: ['10-01', '12-31'],
};

export const QUARTER_KEYS: QuarterKey[] = ['Q1', 'Q2', 'Q3', 'Q4'];

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

/** Normaliza cualquier fecha a clave YYYY-MM-DD para comparar rangos. */
export function toDateKey(value: any): string {
  if (!value) return '';
  const raw = String(value);
  const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const d = new Date(raw);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return '';
}

function itemDate(item: TrialBalanceItem): string {
  const je = item.journalEntry;
  return toDateKey(
    item.date ||
      (je && (je.date || (je.transaction && je.transaction.date)))
  );
}

/** Agrupa los movimientos del trimestre por cuenta, como la balanza por trimestre. */
function aggregateByAccount(items: TrialBalanceItem[]): any[] {
  const map = new Map<string, { account: any; debit: number; credit: number; balance: number }>();
  (items || []).forEach((item: any) => {
    const code = item.code || '';
    const key = code || item.accountId || 'sin-cuenta';
    const existing = map.get(key);
    if (existing) {
      existing.debit += item.debit || 0;
      existing.credit += item.credit || 0;
      existing.balance += item.balance ?? (item.debit || 0) - (item.credit || 0);
    } else {
      map.set(key, {
        account: { code, name: item.name || 'Sin nombre', type: item.type || '' },
        debit: item.debit || 0,
        credit: item.credit || 0,
        balance: item.balance ?? (item.debit || 0) - (item.credit || 0),
      });
    }
  });
  return Array.from(map.values()).sort((a, b) =>
    String(a.account.code || '').localeCompare(String(b.account.code || ''))
  );
}

export function splitTrialsIntoQuarters(
  trials: TrialBalanceItem[],
  fiscalYear: number
): Record<QuarterKey, TrialBalanceItem[]> {
  const out: Record<QuarterKey, TrialBalanceItem[]> = {
    Q1: [],
    Q2: [],
    Q3: [],
    Q4: [],
  };
  (trials || []).forEach((item) => {
    const dk = itemDate(item);
    if (!dk) return;
    QUARTER_KEYS.forEach((q) => {
      const [s, e] = QUARTER_RANGES[q];
      if (dk >= `${fiscalYear}-${s}` && dk <= `${fiscalYear}-${e}`) {
        out[q].push(item);
      }
    });
  });
  return out;
}

function operationInputs(q: QuarterlyCashFlow): { entradas: number; salidas: number } {
  const op = q.sections.operation || [];
  const entradas = op
    .filter((i) => i.code.startsWith('4'))
    .reduce((s, i) => s + i.amount, 0);
  const salidas = op
    .filter((i) => i.code.startsWith('5') || i.code.startsWith('6'))
    .reduce((s, i) => s + i.amount, 0);
  return { entradas, salidas };
}

function operationNet(q: QuarterlyCashFlow): number {
  const { entradas, salidas } = operationInputs(q);
  return round2(entradas - salidas);
}

function investingNet(q: QuarterlyCashFlow): number {
  return round2(-(q.sections.investing || []).reduce((s, i) => s + i.amount, 0));
}

function financingNet(q: QuarterlyCashFlow): number {
  return round2((q.sections.financing || []).reduce((s, i) => s + i.amount, 0));
}

export function buildCashFlowComparatives(
  trials: TrialBalanceItem[],
  fiscalYear: number
): CashFlowComparatives {
  const split = splitTrialsIntoQuarters(trials || [], fiscalYear);
  const quarters: QuarterlyCashFlow[] = [];
  let previousClosing: number | null = null;

  QUARTER_KEYS.forEach((q) => {
    const grouped = groupFlujoItems(
      transformToFlujoEfectivo(aggregateByAccount(split[q]))
    );
    const netChange = round2(grouped.netoTotal);
    const openingBalance =
      previousClosing === null ? round2(grouped.saldoInicial) : previousClosing;
    const closingBalance = round2(openingBalance + netChange);
    quarters.push({
      quarter: q,
      startDate: `${fiscalYear}-${QUARTER_RANGES[q][0]}`,
      endDate: `${fiscalYear}-${QUARTER_RANGES[q][1]}`,
      sections: {
        operation: grouped.operacion,
        investing: grouped.inversion,
        financing: grouped.financiacion,
      },
      netChange,
      openingBalance,
      closingBalance,
    });
    previousClosing = closingBalance;
  });

  const hasData = QUARTER_KEYS.some((q) => split[q].length > 0);

  let best: QuarterKey | null = null;
  let worst: QuarterKey | null = null;
  quarters.forEach((q) => {
    if (best === null || q.netChange > (quarters.find((x) => x.quarter === best)?.netChange ?? -Infinity)) {
      best = q.quarter;
    }
    if (worst === null || q.netChange < (quarters.find((x) => x.quarter === worst)?.netChange ?? Infinity)) {
      worst = q.quarter;
    }
  });

  return {
    quarters,
    totalNetChange: round2(quarters.reduce((s, q) => s + q.netChange, 0)),
    totalOperations: round2(quarters.reduce((s, q) => s + operationNet(q), 0)),
    totalInvesting: round2(quarters.reduce((s, q) => s + investingNet(q), 0)),
    totalFinancing: round2(quarters.reduce((s, q) => s + financingNet(q), 0)),
    totalOpening: quarters[0]?.openingBalance ?? 0,
    totalClosing: quarters[3]?.closingBalance ?? 0,
    bestQuarter: best,
    worstQuarter: worst,
    hasData,
  };
}

function currencyAmount(n: number): string {
  return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(n);
}

export function formatCashFlowComparativesForExcel(
  quarters: QuarterlyCashFlow[],
  fiscalYear: number
): { header: string[][]; sheetName: string } {
  const list: Array<[string, (q: QuarterlyCashFlow) => number]> = [
    ['Entradas de Operación', (q) => operationInputs(q).entradas],
    ['Salidas de Operación', (q) => operationInputs(q).salidas],
    ['Flujo Neto de Operación', (q) => operationNet(q)],
    ['Flujo Neto de Inversión', (q) => investingNet(q)],
    ['Flujo Neto de Financiamiento', (q) => financingNet(q)],
    ['Subtotal operación', (q) => operationNet(q)],
    ['Subtotal inversión', (q) => investingNet(q)],
    ['Subtotal financiamiento', (q) => financingNet(q)],
    ['Flujo neto del trimestre', (q) => q.netChange],
    ['Saldo inicial', (q) => q.openingBalance],
    ['Saldo final', (q) => q.closingBalance],
  ];

  const header: string[][] = [['Concepto', 'Q1', 'Q2', 'Q3', 'Q4', 'Total', 'Δ Q4−Q1']];
  list.forEach(([concept, getter]) => {
    const values = QUARTER_KEYS.map((q) => {
      const quarter = quarters.find((x) => x.quarter === q);
      return quarter ? getter(quarter) : 0;
    });
    const total = values.reduce((s, n) => s + n, 0);
    const delta = values[3] - values[0];
    header.push([
      concept,
      currencyAmount(values[0]),
      currencyAmount(values[1]),
      currencyAmount(values[2]),
      currencyAmount(values[3]),
      currencyAmount(total),
      currencyAmount(delta),
    ]);
  });

  return { header, sheetName: `Comparativo Q1-Q4 ${fiscalYear}` };
}

export function buildCashFlowComparativesFileName(
  fiscalYear: number,
  companyName: string
): string {
  const safe = String(companyName || 'empresa')
    .replace(/[\\/:*?"<>|]/g, '')
    .replace(/\s+/g, '_');
  return `FlujoCaja_ComparativoQ1Q4_${fiscalYear}_${safe}.xlsx`;
}

export async function exportCashFlowComparativesToExcel(
  quarters: QuarterlyCashFlow[],
  fiscalYear: number,
  companyName: string
): Promise<string> {
  const XLSX = await import('xlsx');
  const { header, sheetName } = formatCashFlowComparativesForExcel(quarters, fiscalYear);
  const ws = XLSX.utils.aoa_to_sheet(header);
  ws['!cols'] = [
    { wch: 32 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
    { wch: 18 },
  ];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, ws, sheetName);
  const fileName = buildCashFlowComparativesFileName(fiscalYear, companyName);
  const filePath = `${process.cwd()}/${fileName}`;
  XLSX.writeFile(workbook, filePath);
  return filePath;
}