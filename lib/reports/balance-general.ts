/**
 * Utilidades puras del Balance General (Estado de Situación Financiera).
 * Clasifica cuentas por sección, transforma la balanza de comprobación a
 * BalanceItem y calcula totales + ratios de liquidez. Sin dependencias de UI.
 */

export type BalanceSectionType =
  | 'activo-corriente'
  | 'activo-no-corriente'
  | 'pasivo-corriente'
  | 'pasivo-no-corriente'
  | 'patrimonio';

export interface BalanceItem {
  code: string;
  name: string;
  amount: number;
  type: BalanceSectionType;
  parentCode?: string;
}

/**
 * Clasifica una cuenta según el primer dígito de su código:
 * 1xxx = Activos (11/12/13 corrientes, 14+ no corrientes)
 * 2xxx = Pasivos (21/22/23 corrientes, 24+ no corrientes)
 * 3xxx = Patrimonio
 */
export function classifyAccountSection(code: string): BalanceSectionType {
  const firstDigit = code.charAt(0);

  if (firstDigit === '1') {
    return code.startsWith('11') || code.startsWith('12') || code.startsWith('13')
      ? 'activo-corriente'
      : 'activo-no-corriente';
  }

  if (firstDigit === '2') {
    return code.startsWith('21') || code.startsWith('22') || code.startsWith('23')
      ? 'pasivo-corriente'
      : 'pasivo-no-corriente';
  }

  return 'patrimonio';
}

/**
 * Transforma filas de la balanza de comprobación (respuesta de
 * /api/accounting/trial-balance) en BalanceItem[] con montos absolutos,
 * ordenados por código de cuenta.
 */
export function transformToBalanceGeneral(data: any[]): BalanceItem[] {
  return (data || [])
    .map((item: any) => {
      const account = item.account || {};
      const code = account.code || item.code || '';
      const name = account.name || item.name || 'Sin nombre';
      const balance = parseFloat(item.balance ?? 0) || 0;

      return {
        code,
        name,
        amount: Math.abs(balance),
        type: classifyAccountSection(code),
        parentCode: code.length > 2 ? code.substring(0, 2) : undefined,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));
}

export interface GroupedBalance {
  activosCorrientes: BalanceItem[];
  activosNoCorrientes: BalanceItem[];
  pasivosCorrientes: BalanceItem[];
  pasivosNoCorrientes: BalanceItem[];
  patrimonio: BalanceItem[];
  totalActivosCorrientes: number;
  totalActivosNoCorrientes: number;
  totalPasivosCorrientes: number;
  totalPasivosNoCorrientes: number;
  totalPatrimonio: number;
  totalActivos: number;
  totalPasivos: number;
  totalPatrimonioPasivos: number;
  isBalanced: boolean;
}

/** Agrupa las cuentas por sección y calcula los totales del balance. */
export function groupBalanceItems(items: BalanceItem[]): GroupedBalance {
  const activosCorrientes = items.filter((i) => i.type === 'activo-corriente');
  const activosNoCorrientes = items.filter((i) => i.type === 'activo-no-corriente');
  const pasivosCorrientes = items.filter((i) => i.type === 'pasivo-corriente');
  const pasivosNoCorrientes = items.filter((i) => i.type === 'pasivo-no-corriente');
  const patrimonio = items.filter((i) => i.type === 'patrimonio');

  const totalActivosCorrientes = activosCorrientes.reduce((sum, i) => sum + i.amount, 0);
  const totalActivosNoCorrientes = activosNoCorrientes.reduce((sum, i) => sum + i.amount, 0);
  const totalPasivosCorrientes = pasivosCorrientes.reduce((sum, i) => sum + i.amount, 0);
  const totalPasivosNoCorrientes = pasivosNoCorrientes.reduce((sum, i) => sum + i.amount, 0);
  const totalPatrimonio = patrimonio.reduce((sum, i) => sum + i.amount, 0);

  const totalActivos = totalActivosCorrientes + totalActivosNoCorrientes;
  const totalPasivos = totalPasivosCorrientes + totalPasivosNoCorrientes;
  const totalPatrimonioPasivos = totalPasivos + totalPatrimonio;

  return {
    activosCorrientes,
    activosNoCorrientes,
    pasivosCorrientes,
    pasivosNoCorrientes,
    patrimonio,
    totalActivosCorrientes,
    totalActivosNoCorrientes,
    totalPasivosCorrientes,
    totalPasivosNoCorrientes,
    totalPatrimonio,
    totalActivos,
    totalPasivos,
    totalPatrimonioPasivos,
    isBalanced: Math.abs(totalActivos - totalPatrimonioPasivos) < 0.01,
  };
}

export interface LiquidityRatios {
  /** Razón corriente = Activos corrientes / Pasivos corrientes */
  currentRatio: number | null;
  /** Prueba ácida = (Activos corriente - Inventario) / Pasivos corrientes */
  quickRatio: number | null;
  /** Razón de efectivo = Caja y bancos / Pasivos corrientes */
  cashRatio: number | null;
  /** Capital de trabajo = Activos corrientes - Pasivos corrientes */
  workingCapital: number;
  /** Inventario total (cuentas 13xx) usado en la prueba ácida */
  inventory: number;
}

/** Busca el inventario (13xx) y la caja/bancos (11xx) dentro de activos corrientes. */
export function computeLiquidityRatios(
  grouped: GroupedBalance,
  items: BalanceItem[]
): LiquidityRatios {
  const inventory = items
    .filter((i) => i.type === 'activo-corriente' && i.code.startsWith('13'))
    .reduce((sum, i) => sum + i.amount, 0);

  const cash = items
    .filter((i) => i.type === 'activo-corriente' && (i.code.startsWith('11') || /caja|bancos|efectivo/i.test(i.name)))
    .reduce((sum, i) => sum + i.amount, 0);

  const ac = grouped.totalActivosCorrientes;
  const pc = grouped.totalPasivosCorrientes;

  return {
    currentRatio: pc > 0 ? ac / pc : null,
    quickRatio: pc > 0 ? (ac - inventory) / pc : null,
    cashRatio: pc > 0 ? cash / pc : null,
    workingCapital: ac - pc,
    inventory,
  };
}