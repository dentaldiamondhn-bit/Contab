export type ResultadoItemType = 'ingreso' | 'costo' | 'gasto' | 'otro';

export interface ResultadoItem {
  code: string;
  name: string;
  amount: number;
  type: ResultadoItemType;
}

export interface CompanyInfo {
  name: string;
  rtn: string;
  address: string;
}

export function classifyResultadoType(code: string): ResultadoItemType {
  const firstDigit = code.charAt(0);
  if (firstDigit === '4') return 'ingreso';
  if (firstDigit === '5') return 'costo';
  if (firstDigit === '6') return 'gasto';
  return 'otro';
}

export function transformToEstadoResultados(data: any[]): ResultadoItem[] {
  return (data || [])
    .map((item: any) => {
      const account = item.account || {};
      const code = account.code || item.code || '';
      const name = account.name || item.name || 'Sin nombre';
      const balance = parseFloat(item.balance ?? 0) || 0;
      return {
        code,
        name,
        amount: balance,
        type: classifyResultadoType(code)
      };
    })
    .filter((i) => i.type === 'ingreso' || i.type === 'costo' || i.type === 'gasto')
    .sort((a, b) => a.code.localeCompare(b.code));
}

export interface GroupedResultado {
  ingresos: ResultadoItem[];
  costos: ResultadoItem[];
  gastos: ResultadoItem[];
  totalIngresos: number;
  totalCostos: number;
  totalGastos: number;
  utilidadBruta: number;
  utilidadOperacion: number;
  utilidadAntesImpuestos: number;
  isr: number;
  utilidadNeta: number;
}

export function groupResultadoItems(items: ResultadoItem[]): GroupedResultado {
  const ingresos = items.filter((i) => i.type === 'ingreso');
  const costos = items.filter((i) => i.type === 'costo');
  const gastos = items.filter((i) => i.type === 'gasto');

  const totalIngresos = ingresos.reduce((sum, i) => sum + Math.abs(i.amount), 0);
  const totalCostos = costos.reduce((sum, i) => sum + Math.abs(i.amount), 0);
  const totalGastos = gastos.reduce((sum, i) => sum + Math.abs(i.amount), 0);

  const utilidadBruta = totalIngresos - totalCostos;
  const utilidadOperacion = utilidadBruta - totalGastos;
  const utilidadAntesImpuestos = utilidadOperacion;
  const isr = utilidadAntesImpuestos > 0 ? utilidadAntesImpuestos * 0.25 : 0;
  const utilidadNeta = utilidadAntesImpuestos - isr;

  return {
    ingresos,
    costos,
    gastos,
    totalIngresos,
    totalCostos,
    totalGastos,
    utilidadBruta,
    utilidadOperacion,
    utilidadAntesImpuestos,
    isr,
    utilidadNeta
  };
}

export interface CategoryMargin {
  code: string;
  name: string;
  amount: number;
  percentOfSales: number;
}

export function computeCategoryMargins(items: ResultadoItem[], totalIngresos: number): CategoryMargin[] {
  const totals = new Map<string, number>();
  const names = new Map<string, string>();
  items.forEach((i) => {
    const cat = i.code.substring(0, 2) || i.code.charAt(0);
    totals.set(cat, (totals.get(cat) || 0) + Math.abs(i.amount));
    if (!names.has(cat)) names.set(cat, i.name);
  });
  return Array.from(totals.entries())
    .map(([code, amount]) => ({
      code,
      name: names.get(code) || code,
      amount,
      percentOfSales: totalIngresos > 0 ? (amount / totalIngresos) * 100 : 0
    }))
    .sort((a, b) => b.amount - a.amount);
}

export interface MarginSummary {
  margenBruto: number;
  margenOperativo: number;
  margenNeto: number;
  costosSobreVentas: number;
  gastosSobreVentas: number;
}

export function computeMarginSummary(grouped: GroupedResultado): MarginSummary {
  const sales = grouped.totalIngresos || 0;
  return {
    margenBruto: sales > 0 ? (grouped.utilidadBruta / sales) * 100 : 0,
    margenOperativo: sales > 0 ? (grouped.utilidadOperacion / sales) * 100 : 0,
    margenNeto: sales > 0 ? (grouped.utilidadNeta / sales) * 100 : 0,
    costosSobreVentas: sales > 0 ? (grouped.totalCostos / sales) * 100 : 0,
    gastosSobreVentas: sales > 0 ? (grouped.totalGastos / sales) * 100 : 0
  };
}

export interface Projections {
  elapsedRatio: number;
  monthly: number;
  quarterly: number;
  annual: number;
  breakEven: number | null;
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

export function computeProjections(grouped: GroupedResultado, startDate: string, endDate: string): Projections {
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) {
    return { elapsedRatio: 1, monthly: grouped.utilidadNeta, quarterly: grouped.utilidadNeta * 3, annual: grouped.utilidadNeta * 12, breakEven: null };
  }
  const daysElapsed = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  const monthDays = daysInMonth(s);
  const elapsedRatio = Math.min(1, daysElapsed / monthDays);

  const monthly = elapsedRatio > 0 ? grouped.utilidadNeta / elapsedRatio : grouped.utilidadNeta;
  const quarterly = monthly * 3;
  const annual = monthly * 12;

  let breakEven: number | null = null;
  if (grouped.totalIngresos > 0) {
    const contribMargin = (grouped.totalIngresos - grouped.totalCostos) / grouped.totalIngresos;
    if (contribMargin > 0) breakEven = grouped.totalGastos / contribMargin;
  }

  return { elapsedRatio, monthly, quarterly, annual, breakEven };
}