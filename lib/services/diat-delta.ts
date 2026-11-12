// Comparativo fiscal entre dos períodos DIAT (puro, sin I/O).
// Compara resúmenes: métricas con variación absoluta y porcentual.

export interface DiatResumenLike {
  totalFacturas: number;
  totalVentas: number;
  impuestoVentas: number;
  totalCompras: number;
  impuestoCompras: number;
  creditoFiscal: number;
  isvAPagar: number;
  operaciones: number;
}

export interface DiatDeltaMetric {
  key: string;
  label: string;
  from: number;
  to: number;
  varAbs: number;
  varPct: number | null;
}

export interface DiatDelta {
  from: string;
  to: string;
  metrics: DiatDeltaMetric[];
}

const METRICS: Array<{ key: keyof DiatResumenLike; label: string }> = [
  { key: 'operaciones', label: 'Operaciones' },
  { key: 'totalFacturas', label: 'Facturas' },
  { key: 'totalVentas', label: 'Total ventas' },
  { key: 'impuestoVentas', label: 'ISV ventas' },
  { key: 'totalCompras', label: 'Total compras' },
  { key: 'impuestoCompras', label: 'ISV compras' },
  { key: 'creditoFiscal', label: 'Crédito fiscal' },
  { key: 'isvAPagar', label: 'ISV a pagar' },
];

export function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function varPct(from: number, to: number): number | null {
  if (from === 0) return null;
  return round2(((to - from) / Math.abs(from)) * 100);
}

export function buildDiatDelta(
  from: string,
  to: string,
  fromResumen: DiatResumenLike,
  toResumen: DiatResumenLike,
): DiatDelta {
  const metrics = METRICS.map(({ key, label }) => {
    const f = round2(num(fromResumen?.[key]));
    const t = round2(num(toResumen?.[key]));
    return { key, label, from: f, to: t, varAbs: round2(t - f), varPct: varPct(f, t) };
  });
  return { from, to, metrics };
}
