"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  TrendingUp,
  TrendingDown,
  Minus,
  ArrowLeftRight,
  AlertTriangle,
} from "lucide-react";
import {
  transformToEstadoResultados,
  groupResultadoItems,
  computeCategoryMargins,
} from "@/lib/reports/income-statement";
import type { ResultadoItem, GroupedResultado } from "@/lib/reports/income-statement";

interface IncomeStatementComparativeProps {
  tenantId: string;
  /** Fecha inicio del período actual (YYYY-MM-DD) */
  startDate: string;
  /** Fecha fin del período actual (YYYY-MM-DD) */
  endDate: string;
  currency?: 'HNL' | 'USD';
  /** Cómo calcular el período anterior */
  mode: 'prev-month' | 'prev-year';
}

interface PnLRow {
  key: string;
  label: string;
  current: number;
  previous: number;
  strong?: boolean;
  signForComparison?: 'auto' | 'invert';
}

interface CategoryComparative {
  code: string;
  name: string;
  current: number;
  previous: number;
}

/** Desplaza una fecha (YYYY-MM-DD) por meses/años clampando al fin de mes. */
function shiftDate(dateStr: string, months = 0, years = 0): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const total = d.getMonth() + months + years * 12;
  const targetYear = Math.floor(total / 12);
  const targetMonth = ((total % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(d.getDate(), lastDay);
  return new Date(targetYear, targetMonth, day).toISOString().slice(0, 10);
}

function mergeCategories(current: ResultadoItem[], previous: ResultadoItem[], sales: number): CategoryComparative[] {
  const curMap = new Map(
    computeCategoryMargins(current, sales).map((c) => [c.code, c])
  );
  const prevList = computeCategoryMargins(previous, sales);
  const prevMap = new Map(prevList.map((c) => [c.code, c]));
  const codes = Array.from(new Set([...curMap.keys(), ...prevMap.keys()]));
  return codes.map((code) => ({
    code,
    name: curMap.get(code)?.name || prevMap.get(code)?.name || code,
    current: curMap.get(code)?.amount ?? 0,
    previous: prevMap.get(code)?.amount ?? 0,
  }));
}

export default function IncomeStatementComparative({
  tenantId,
  startDate,
  endDate,
  currency = 'HNL',
  mode,
}: IncomeStatementComparativeProps) {
  const [currentItems, setCurrentItems] = useState<ResultadoItem[]>([]);
  const [previousItems, setPreviousItems] = useState<ResultadoItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const previousRange = useMemo(
    () => ({
      start: mode === 'prev-year' ? shiftDate(startDate, 0, -1) : shiftDate(startDate, -1),
      end: mode === 'prev-year' ? shiftDate(endDate, 0, -1) : shiftDate(endDate, -1),
    }),
    [startDate, endDate, mode]
  );

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    setError(null);

    const fetchTrialBalance = async (start: string, end: string) => {
      const res = await fetch(
        `/api/accounting/trial-balance?tenantId=${tenantId}&startDate=${start}T00:00:00Z&endDate=${end}T23:59:59Z`,
        { cache: 'no-store' }
      );
      if (!res.ok) throw new Error('No se pudo obtener la balanza de comprobación');
      return res.json();
    };

    (async () => {
      try {
        const [cur, prev] = await Promise.all([
          fetchTrialBalance(startDate, endDate),
          fetchTrialBalance(previousRange.start, previousRange.end),
        ]);
        if (!mounted) return;
        setCurrentItems(transformToEstadoResultados(cur || []));
        setPreviousItems(transformToEstadoResultados(prev || []));
      } catch (err: any) {
        if (mounted) setError(err.message || 'Error al cargar el comparativo');
      } finally {
        if (mounted) setLoading(false);
      }
    })();

    return () => {
      mounted = false;
    };
  }, [tenantId, startDate, endDate, previousRange.start, previousRange.end, mode]);

  const current = useMemo<GroupedResultado>(() => groupResultadoItems(currentItems), [currentItems]);
  const previous = useMemo<GroupedResultado>(() => groupResultadoItems(previousItems), [previousItems]);

  const rows = useMemo<PnLRow[]>(() => {
    const base: PnLRow[] = [
      { key: 'ingresos', label: 'Total Ingresos', current: current.totalIngresos, previous: previous.totalIngresos },
      { key: 'costos', label: 'Costo de Ventas', current: current.totalCostos, previous: previous.totalCostos, signForComparison: 'invert' },
      { key: 'utils', label: 'Utilidad Bruta', current: current.utilidadBruta, previous: previous.utilidadBruta },
      { key: 'gastos', label: 'Gastos Operativos', current: current.totalGastos, previous: previous.totalGastos, signForComparison: 'invert' },
      { key: 'utilop', label: 'Utilidad de Operación', current: current.utilidadOperacion, previous: previous.utilidadOperacion },
      { key: 'isi', label: 'Impuesto Sobre la Renta (ISR)', current: current.isr, previous: previous.isr, signForComparison: 'invert' },
      { key: 'utilneta', label: 'Utilidad Neta', current: current.utilidadNeta, previous: previous.utilidadNeta, strong: true },
    ];
    return base;
  }, [current, previous]);

  const costCategories = useMemo<CategoryComparative[]>(
    () =>
      mergeCategories(
        currentItems.filter((i) => i.type === 'costo'),
        previousItems.filter((i) => i.type === 'costo'),
        current.totalIngresos
      ),
    [currentItems, previousItems, current.totalIngresos]
  );
  const expenseCategories = useMemo<CategoryComparative[]>(
    () =>
      mergeCategories(
        currentItems.filter((i) => i.type === 'gasto'),
        previousItems.filter((i) => i.type === 'gasto'),
        current.totalIngresos
      ),
    [currentItems, previousItems, current.totalIngresos]
  );

  const formatAmount = (n: number) =>
    new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
    }).format(n);

  const formatRange = (start: string, end: string) => {
    const fmt = (s: string) =>
      new Date(`${s}T00:00:00`).toLocaleDateString('es-HN', { year: 'numeric', month: 'short', day: 'numeric' });
    return `${fmt(start)} – ${fmt(end)}`;
  };

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Cargando comparativo de períodos...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 border-red-200">
        <CardContent className="flex items-center py-6 text-red-700">
          <AlertTriangle className="h-5 w-5 mr-2" />
          <span>{error}</span>
        </CardContent>
      </Card>
    );
  }

  const rowVariance = (row: PnLRow) => {
    const sign = row.signForComparison === 'invert' ? -1 : 1;
    return sign * (row.current - row.previous);
  };

  const showCategories = (items: CategoryComparative[], kind: 'costo' | 'gasto') => {
    const meaningful = items.filter((c) => c.current !== 0 || c.previous !== 0);
    if (meaningful.length === 0) return null;
    return (
      <tbody>
        {meaningful.map((cat) => {
          const varAbs = -(cat.current - cat.previous);
          const varPct = cat.previous !== 0 ? (varAbs / Math.abs(cat.previous)) * 100 : null;
          const trend = varAbs > 0 ? 'up' : varAbs < 0 ? 'down' : 'same';
          return (
            <tr key={`${kind}-${cat.code}`} className="border-t border-gray-100">
              <td className="py-1.5 px-4 pl-8 text-gray-600">
                <span className="text-xs text-gray-400 mr-2">{cat.code}</span>
                {cat.name}
              </td>
              <td className="py-1.5 px-4 text-right font-medium">{formatAmount(cat.current)}</td>
              <td className="py-1.5 px-4 text-right text-gray-600">{formatAmount(cat.previous)}</td>
              <td className="py-1.5 px-4 text-right">
                <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'}>
                  {varAbs > 0 ? '+' : ''}
                  {formatAmount(varAbs)}
                </span>
              </td>
              <td className="py-1.5 px-4 text-right">
                <Badge
                  variant={trend === 'same' ? 'outline' : 'default'}
                  className={trend === 'up' ? 'bg-green-100 text-green-800' : trend === 'down' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'}
                >
                  {varAbs > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : varAbs < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <Minus className="h-3 w-3 mr-1" />}
                  {varPct !== null ? `${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%` : 'N/A'}
                </Badge>
              </td>
            </tr>
          );
        })}
      </tbody>
    );
  };

  const costBody = showCategories(costCategories, 'costo');
  const expenseBody = showCategories(expenseCategories, 'gasto');

  return (
    <Card className="mb-6">
      <CardHeader className="border-b bg-indigo-50">
        <CardTitle className="text-xl text-indigo-900 flex items-center">
          <ArrowLeftRight className="h-5 w-5 mr-2" />
          Comparativo de Períodos
        </CardTitle>
        <p className="text-sm text-gray-600">
          {formatRange(startDate, endDate)} vs {formatRange(previousRange.start, previousRange.end)}
          {mode === 'prev-month' ? ' (mes anterior)' : ' (mismo mes, año anterior)'}
        </p>
      </CardHeader>
      <CardContent className="overflow-x-auto p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-100 text-gray-700">
              <th className="text-left py-2 px-4 font-semibold">Partida</th>
              <th className="text-right py-2 px-4 font-semibold">Período Actual</th>
              <th className="text-right py-2 px-4 font-semibold">Período Anterior</th>
              <th className="text-right py-2 px-4 font-semibold">Variación</th>
              <th className="text-right py-2 px-4 font-semibold">Variación %</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const varAbs = rowVariance(row);
              const varPct = row.previous !== 0 ? (varAbs / Math.abs(row.previous)) * 100 : null;
              const trend = varAbs > 0 ? 'up' : varAbs < 0 ? 'down' : 'same';
              return (
                <tr key={row.key} className={`border-t border-gray-100 ${row.strong ? 'bg-green-50 font-semibold' : ''}`}>
                  <td className={`py-2 px-4 ${row.strong ? 'font-bold text-gray-900' : 'text-gray-700'}`}>{row.label}</td>
                  <td className={`py-2 px-4 text-right ${row.strong ? 'font-bold' : 'font-medium'}`}>
                    {row.strong ? formatAmount(row.current) : formatAmount(row.current)}
                  </td>
                  <td className="py-2 px-4 text-right text-gray-600">{formatAmount(row.previous)}</td>
                  <td className="py-2 px-4 text-right">
                    <span className={trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-gray-400'}>
                      {varAbs > 0 ? '+' : ''}
                      {formatAmount(varAbs)}
                    </span>
                  </td>
                  <td className="py-2 px-4 text-right">
                    <Badge
                      variant={trend === 'same' ? 'outline' : 'default'}
                      className={trend === 'up' ? 'bg-green-100 text-green-800' : trend === 'down' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'}
                    >
                      {varAbs > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : varAbs < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <Minus className="h-3 w-3 mr-1" />}
                      {varPct !== null ? `${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%` : 'N/A'}
                    </Badge>
                  </td>
                </tr>
              );
            })}
          </tbody>
          {costBody && (
            <>
              <thead>
                <tr className="bg-red-50">
                  <th className="text-left py-2 px-4 font-bold text-red-900 col-span-5" colSpan={5}>
                    Detalle por Categoría — Costos
                  </th>
                </tr>
              </thead>
              {costBody}
            </>
          )}
          {expenseBody && (
            <>
              <thead>
                <tr className="bg-orange-50">
                  <th className="text-left py-2 px-4 font-bold text-orange-900 col-span-5" colSpan={5}>
                    Detalle por Categoría — Gastos Operativos
                  </th>
                </tr>
              </thead>
              {expenseBody}
            </>
          )}
        </table>
      </CardContent>
    </Card>
  );
}