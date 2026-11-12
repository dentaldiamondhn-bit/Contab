// Lógica pura de control presupuestario (sin I/O): prorrateo, varianza,
// % de ejecución y alertas. Testeable con node:test sin mocks.
// Convención de signos (igual que trial-balance):
//   - gasto:   real = débitos - créditos  (positivo = gastado)
//   - ingreso: real = créditos - débitos  (positivo = percibido)

export type BudgetCategory = 'ingreso' | 'gasto';
export type LineStatus = 'ok' | 'advertencia' | 'critico' | 'sin-datos';
export type AlertLevel = 'advertencia' | 'critico';

export interface BudgetLineInput {
  id?: string;
  account_code: string;
  account_name?: string | null;
  category: BudgetCategory;
  period?: string | null;
  amount: number | string;
}

export interface LineComparison {
  lineId?: string;
  accountCode: string;
  accountName: string;
  category: BudgetCategory;
  budgeted: number;
  actual: number;
  variance: number;
  executionPct: number | null;
  status: LineStatus;
}

export interface CategoryTotals {
  category: BudgetCategory;
  budgeted: number;
  actual: number;
  variance: number;
  executionPct: number | null;
}

export interface BudgetAlert {
  level: AlertLevel;
  category: BudgetCategory;
  accountCode: string;
  accountName: string;
  executionPct: number | null;
  message: string;
}

// Umbrales de control presupuestario
export const GASTO_WARN_PCT = 90;
export const GASTO_CRIT_PCT = 100;
export const INGRESO_WARN_PCT = 80;
export const INGRESO_CRIT_PCT = 50;

const PERIOD_RE = /^\d{4}-(0[1-9]|1[0-2])$/;

export function isValidPeriod(period: string): boolean {
  return PERIOD_RE.test(period);
}

export function periodRange(period: string): { start: string; end: string } {
  const [y, m] = period.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const pad = (n: number) => String(n).padStart(2, '0');
  return {
    start: `${y}-${pad(m)}-01`,
    end: `${y}-${pad(m)}-${pad(lastDay)}`,
  };
}

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// Presupuesto aplicable a una línea para el período P:
// - línea mensual del período => su monto
// - línea anual (period NULL) => monto / 12
// - línea de otro mes => 0
export function lineBudgetForPeriod(line: BudgetLineInput, period: string): number {
  const amount = num(line.amount);
  if (line.period) return line.period === period ? amount : 0;
  return amount / 12;
}

// Real contable según categoría a partir de débitos/créditos del mayor.
export function actualForCategory(debit: number, credit: number, category: BudgetCategory): number {
  return category === 'gasto' ? debit - credit : credit - debit;
}

function executionPct(budgeted: number, actual: number): number | null {
  if (budgeted > 0) return (actual / budgeted) * 100;
  return null;
}

function lineStatus(category: BudgetCategory, budgeted: number, actual: number): LineStatus {
  if (budgeted === 0 && actual === 0) return 'sin-datos';
  const pct = executionPct(budgeted, actual);
  if (pct === null) {
    // Sin presupuesto pero con movimiento real.
    return category === 'gasto' ? 'critico' : 'advertencia';
  }
  if (category === 'gasto') {
    if (pct >= GASTO_CRIT_PCT) return 'critico';
    if (pct >= GASTO_WARN_PCT) return 'advertencia';
    return 'ok';
  }
  if (pct >= INGRESO_WARN_PCT) return 'ok';
  if (pct >= INGRESO_CRIT_PCT) return 'advertencia';
  return 'critico';
}

export function computeLineComparison(
  line: BudgetLineInput,
  period: string,
  debit: number,
  credit: number,
): LineComparison {
  const budgeted = round2(lineBudgetForPeriod(line, period));
  const actual = round2(actualForCategory(num(debit), num(credit), line.category));
  // Gasto: varianza = presupuestado - real (positivo = ahorro).
  // Ingreso: varianza = real - presupuestado (positivo = sobre la meta).
  const variance =
    line.category === 'gasto' ? round2(budgeted - actual) : round2(actual - budgeted);
  const pct = executionPct(budgeted, actual);
  return {
    lineId: line.id,
    accountCode: line.account_code,
    accountName: String(line.account_name || line.account_code),
    category: line.category,
    budgeted,
    actual,
    variance,
    executionPct: pct === null ? null : round2(pct),
    status: lineStatus(line.category, budgeted, actual),
  };
}

export function computeTotals(lines: LineComparison[]): {
  gasto: CategoryTotals;
  ingreso: CategoryTotals;
} {
  const sum = (cat: BudgetCategory): CategoryTotals => {
    const ls = lines.filter((l) => l.category === cat);
    const budgeted = round2(ls.reduce((s, l) => s + l.budgeted, 0));
    const actual = round2(ls.reduce((s, l) => s + l.actual, 0));
    const variance =
      cat === 'gasto' ? round2(budgeted - actual) : round2(actual - budgeted);
    const pct = executionPct(budgeted, actual);
    return {
      category: cat,
      budgeted,
      actual,
      variance,
      executionPct: pct === null ? null : round2(pct),
    };
  };
  return { gasto: sum('gasto'), ingreso: sum('ingreso') };
}

export function buildAlerts(lines: LineComparison[]): BudgetAlert[] {
  const alerts: BudgetAlert[] = [];
  for (const l of lines) {
    if (l.status === 'ok' || l.status === 'sin-datos') continue;
    const pctLabel = l.executionPct === null ? 's/p' : `${l.executionPct}%`;
    if (l.category === 'gasto') {
      alerts.push({
        level: l.status === 'critico' ? 'critico' : 'advertencia',
        category: l.category,
        accountCode: l.accountCode,
        accountName: l.accountName,
        executionPct: l.executionPct,
        message:
          l.status === 'critico'
            ? `Gasto excedido en ${l.accountCode} (${l.accountName}): ejecución ${pctLabel}`
            : `Gasto cerca del límite en ${l.accountCode} (${l.accountName}): ejecución ${pctLabel}`,
      });
    } else {
      alerts.push({
        level: l.status === 'critico' ? 'critico' : 'advertencia',
        category: l.category,
        accountCode: l.accountCode,
        accountName: l.accountName,
        executionPct: l.executionPct,
        message:
          l.status === 'critico'
            ? `Ingreso muy por debajo de la meta en ${l.accountCode} (${l.accountName}): ejecución ${pctLabel}`
            : `Ingreso por debajo de la meta en ${l.accountCode} (${l.accountName}): ejecución ${pctLabel}`,
      });
    }
  }
  // Críticos primero, luego por % de ejecución descendente en gastos.
  return alerts.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'critico' ? -1 : 1;
    return num(b.executionPct) - num(a.executionPct);
  });
}
