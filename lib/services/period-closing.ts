// Reglas puras del cierre mensual (sin I/O): secuencia de meses, períodos
// futuros y flags por período. Testeable con node:test sin mocks.

export type PeriodStatus = 'open' | 'closed' | 'locked';

export interface PeriodRef {
  year: number;
  month: number;
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function periodKey(year: number, month: number): string {
  return `${year}-${pad2(month)}`;
}

export function prevPeriod(year: number, month: number): PeriodRef {
  if (month === 1) return { year: year - 1, month: 12 };
  return { year, month: month - 1 };
}

export function isValidYearMonth(year: number, month: number): boolean {
  return (
    Number.isInteger(year) &&
    Number.isInteger(month) &&
    year >= 2000 &&
    year <= 2100 &&
    month >= 0 &&
    month <= 12
  );
}

export function isAnnualPeriod(month: number): boolean {
  return month === 0;
}

export function isFuturePeriod(year: number, month: number, today: Date = new Date()): boolean {
  if (isAnnualPeriod(month)) return year > today.getFullYear();
  return year > today.getFullYear() || (year === today.getFullYear() && month > today.getMonth() + 1);
}

function isClosedStatus(status: string): boolean {
  return status === 'closed' || status === 'locked';
}

// Regla de secuencia para cerrar (y, m): no futuro, no ya cerrado, y el mes
// previo con movimientos debe estar cerrado. Anual (month=0) exige 12 meses cerrados —
// validación adicional se hace en cerrarPeriodoContable.
export function assertCloseAllowed(opts: {
  status: string;
  prevStatus: string | null;
  prevTxCount: number;
  year: number;
  month: number;
  today?: Date;
}): void {
  const { status, prevStatus, prevTxCount, year, month } = opts;
  const today = opts.today || new Date();
  if (!isValidYearMonth(year, month)) {
    throw new Error('Año y mes inválidos');
  }
  if (isClosedStatus(status)) {
    throw new Error(`Período ya ${status}`);
  }
  if (isFuturePeriod(year, month, today)) {
    throw new Error(`No se puede cerrar un período futuro (${isAnnualPeriod(month) ? String(year) : periodKey(year, month)})`);
  }
  if (isAnnualPeriod(month)) return; // Anual valida 12 meses en la ruta, no el previo inmediato
  const prev = prevPeriod(year, month);
  if (prevTxCount > 0 && !isClosedStatus(prevStatus || 'open')) {
    throw new Error(
      `Cierre primero ${periodKey(prev.year, prev.month)}: tiene ${prevTxCount} transacciones y está abierto`,
    );
  }
}

// Flags por período para la UI (reemplaza los `true` hardcodeados).
export function evaluatePeriodFlags(opts: {
  status: string;
  prevStatus: string | null;
  prevTxCount: number;
  year: number;
  month: number;
  today?: Date;
}): { prev_month_closed: boolean; can_close: boolean } {
  const { status, prevStatus, prevTxCount, year, month } = opts;
  const today = opts.today || new Date();
  const prev_month_closed = prevTxCount === 0 || isClosedStatus(prevStatus || 'open');
  const can_close =
    status === 'open' && prev_month_closed && isValidYearMonth(year, month) && !isFuturePeriod(year, month, today);
  return { prev_month_closed, can_close };
}
