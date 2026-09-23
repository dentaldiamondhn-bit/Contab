export type FlujoActivityType = 'operacion' | 'inversion' | 'financiacion' | 'otro';

export interface FlujoItem {
  code: string;
  name: string;
  amount: number;
  type: FlujoActivityType;
  category: string;
}

/** Clasifica una cuenta según su código dentro de la actividad de flujo de efectivo. */
export function classifyFlujoActivity(code: string): FlujoActivityType {
  const startsWith = (p: string) => code.startsWith(p);
  if (startsWith('110')) return 'otro'; // Efectivo/bancos → conciliación (no es flujo)
  if (startsWith('4') || startsWith('5') || startsWith('6')) return 'operacion';
  if (startsWith('11')) return 'operacion'; // Ctas por cobrar
  if (startsWith('12')) return 'inversion'; // Propiedad, planta y equipo
  if (startsWith('21')) return 'operacion'; // Ctas por pagar
  if (startsWith('22')) return 'financiacion'; // Préstamos largo plazo
  if (startsWith('3')) return 'financiacion'; // Patrimonio
  return 'operacion';
}

function flujoCategoryFor(code: string, type: FlujoActivityType): string {
  if (type === 'inversion') {
    if (code.startsWith('12')) return 'Propiedad, Planta y Equipo';
    return 'Otros Activos';
  }
  if (type === 'financiacion') {
    if (code.startsWith('22')) return 'Préstamos a Largo Plazo';
    if (code.startsWith('3')) return 'Capital Social';
    return 'Préstamos';
  }
  if (code.startsWith('4')) return 'Cobros a Clientes';
  if (code.startsWith('5')) return 'Pagos a Proveedores';
  if (code.startsWith('6')) return 'Gastos Operativos';
  if (code.startsWith('11')) return 'Cuentas por Cobrar';
  if (code.startsWith('21')) return 'Cuentas por Pagar';
  return 'Operación';
}

/** Transforma el trial balance a items de flujo de efectivo (excluye efectivo 110x). */
export function transformToFlujoEfectivo(data: any[]): FlujoItem[] {
  return (data || [])
    .map((item: any) => {
      const account = item.account || {};
      const code = account.code || item.code || '';
      const name = account.name || item.name || 'Sin nombre';
      const balance = parseFloat(item.balance ?? item.amount ?? 0) || 0;
      const type = classifyFlujoActivity(code);
      return { code, name, amount: Math.abs(balance), type, category: flujoCategoryFor(code, type) };
    })
    .filter((i) => i.type !== 'otro' && i.amount !== 0)
    .sort((a, b) => a.code.localeCompare(b.code));
}

export interface FlujoEfectivoGrouped {
  operacion: FlujoItem[];
  inversion: FlujoItem[];
  financiacion: FlujoItem[];
  entradasOperacion: number;
  salidasOperacion: number;
  netoOperacion: number;
  entradasInversion: number;
  salidasInversion: number;
  netoInversion: number;
  entradasFinanciacion: number;
  salidasFinanciacion: number;
  netoFinanciacion: number;
  netoTotal: number;
  saldoInicial: number;
  saldoFinal: number;
  burnRate: number;
  mesesEfectivo: number;
}

/** Agrupa los items de flujo por actividad y calcula totales + burn rate + runway. */
export function groupFlujoItems(items: FlujoItem[]): FlujoEfectivoGrouped {
  const operacion = items.filter((i) => i.type === 'operacion');
  const inversion = items.filter((i) => i.type === 'inversion');
  const financiacion = items.filter((i) => i.type === 'financiacion');

  const entradasOperacion = operacion
    .filter((i) => i.code.startsWith('4'))
    .reduce((s, i) => s + i.amount, 0);
  const salidasOperacion = operacion
    .filter((i) => i.code.startsWith('5') || i.code.startsWith('6'))
    .reduce((s, i) => s + i.amount, 0);
  const netoOperacion = entradasOperacion - salidasOperacion;

  const salidasInversion = inversion.reduce((s, i) => s + i.amount, 0);
  const netoInversion = -salidasInversion;

  const entradasFinanciacion = financiacion.reduce((s, i) => s + i.amount, 0);
  const salidasFinanciacion = 0;
  const netoFinanciacion = entradasFinanciacion - salidasFinanciacion;

  const netoTotal = netoOperacion + netoInversion + netoFinanciacion;
  const saldoInicial = 5000; // Simulado (conciliación con caja 110x)
  const saldoFinal = saldoInicial + netoTotal;
  const burnRate = salidasOperacion;
  const mesesEfectivo = burnRate > 0 ? Math.floor(saldoFinal / burnRate) : 0;

  return {
    operacion,
    inversion,
    financiacion,
    entradasOperacion,
    salidasOperacion,
    netoOperacion,
    entradasInversion: 0,
    salidasInversion,
    netoInversion,
    entradasFinanciacion,
    salidasFinanciacion,
    netoFinanciacion,
    netoTotal,
    saldoInicial,
    saldoFinal,
    burnRate,
    mesesEfectivo
  };
}

export interface SourceUseItem {
  code: string;
  name: string;
  amount: number;
  category: string;
}

export interface SourcesUses {
  fuentes: SourceUseItem[];
  usos: SourceUseItem[];
  totalFuentes: number;
  totalUsos: number;
  neto: number;
}

/** Análisis de fuentes y usos de efectivo (fuente = entrada operación + financiación; uso = salida). */
export function computeSourcesUses(items: FlujoItem[]): SourcesUses {
  const fuentes: SourceUseItem[] = [];
  const usos: SourceUseItem[] = [];
  items.forEach((i) => {
    const isFuente =
      (i.code.startsWith('4') && i.amount > 0) ||
      ((i.code.startsWith('22') || i.code.startsWith('3')) && i.amount > 0);
    const entry: SourceUseItem = { code: i.code, name: i.name, amount: i.amount, category: i.category };
    if (isFuente) fuentes.push(entry);
    else usos.push(entry);
  });
  const totalFuentes = fuentes.reduce((s, i) => s + i.amount, 0);
  const totalUsos = usos.reduce((s, i) => s + i.amount, 0);
  return { fuentes, usos, totalFuentes, totalUsos, neto: totalFuentes - totalUsos };
}

export interface CashProjections {
  elapsedRatio: number;
  monthly: number;
  quarterly: number;
  annual: number;
  saldoProyectadoMensual: number;
  saldoProyectadoAnual: number;
  breakEven: number | null;
}

function daysInMonth(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
}

/** Proyección de caja por run-rate del flujo neto del período. */
export function computeCashProjections(
  grouped: FlujoEfectivoGrouped,
  startDate: string,
  endDate: string
): CashProjections {
  const s = new Date(`${startDate}T00:00:00`);
  const e = new Date(`${endDate}T00:00:00`);
  let elapsedRatio = 1;
  if (!isNaN(s.getTime()) && !isNaN(e.getTime()) && e >= s) {
    const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
    elapsedRatio = Math.min(1, days / daysInMonth(s));
  }
  const monthly = elapsedRatio > 0 ? grouped.netoTotal / elapsedRatio : grouped.netoTotal;
  const quarterly = monthly * 3;
  const annual = monthly * 12;

  let breakEven: number | null = null;
  if (grouped.entradasOperacion > 0) {
    const contribMargin =
      (grouped.entradasOperacion - grouped.salidasOperacion) / grouped.entradasOperacion;
    if (contribMargin > 0) {
      breakEven = (grouped.salidasOperacion + grouped.netoInversion + grouped.netoFinanciacion) / contribMargin;
    }
  }

  return {
    elapsedRatio,
    monthly,
    quarterly,
    annual,
    saldoProyectadoMensual: grouped.saldoFinal + monthly,
    saldoProyectadoAnual: grouped.saldoFinal + annual,
    breakEven
  };
}
