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
  transformToBalanceGeneral,
  groupBalanceItems,
} from "@/lib/reports/balance-general";
import type { BalanceItem } from "@/lib/reports/balance-general";

interface BalanceSheetComparativeProps {
  tenantId: string;
  /** Fecha inicio del período actual (YYYY-MM-DD) */
  startDate: string;
  /** Fecha fin del período actual (YYYY-MM-DD) */
  endDate: string;
  currency?: 'HNL' | 'USD';
  /** Cómo calcular el período anterior */
  mode: 'prev-month' | 'prev-year';
}

interface ComparativeRow {
  code: string;
  name: string;
  current: number;
  previous: number;
}

interface ComparativeSection {
  title: string;
  rows: ComparativeRow[];
  total: ComparativeRow;
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

/** Une dos períodos por código de cuenta para comparación fila a fila. */
function mergeByCode(current: BalanceItem[], previous: BalanceItem[]): ComparativeRow[] {
  const prevMap = new Map(previous.map((p) => [p.code, p]));
  const codes = Array.from(new Set([...current.map((c) => c.code), ...previous.map((p) => p.code)]));
  return codes.map((code) => {
    const c = current.find((i) => i.code === code);
    const p = prevMap.get(code);
    return {
      code,
      name: c?.name || p?.name || code,
      current: c?.amount ?? 0,
      previous: p?.amount ?? 0,
    };
  });
}

export default function BalanceSheetComparative({
  tenantId,
  startDate,
  endDate,
  currency = 'HNL',
  mode,
}: BalanceSheetComparativeProps) {
  const [currentItems, setCurrentItems] = useState<BalanceItem[]>([]);
  const [previousItems, setPreviousItems] = useState<BalanceItem[]>([]);
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
        setCurrentItems(transformToBalanceGeneral(cur || []));
        setPreviousItems(transformToBalanceGeneral(prev || []));
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

  const sections = useMemo<ComparativeSection[]>(() => {
    const cur = groupBalanceItems(currentItems);
    const prev = groupBalanceItems(previousItems);

    const buildSection = (
      title: string,
      current: BalanceItem[],
      previous: BalanceItem[],
      totalCurrent: number,
      totalPrevious: number
    ): ComparativeSection => ({
      title,
      rows: mergeByCode(current, previous),
      total: { code: 'TOTAL', name: `Total ${title}`, current: totalCurrent, previous: totalPrevious },
    });

    return [
      buildSection('Activos Corrientes', cur.activosCorrientes, prev.activosCorrientes, cur.totalActivosCorrientes, prev.totalActivosCorrientes),
      buildSection('Activos No Corrientes', cur.activosNoCorrientes, prev.activosNoCorrientes, cur.totalActivosNoCorrientes, prev.totalActivosNoCorrientes),
      { title: 'TOTAL ACTIVOS', rows: [], total: { code: 'TOTAL', name: 'TOTAL ACTIVOS', current: cur.totalActivos, previous: prev.totalActivos } },
      buildSection('Pasivos Corrientes', cur.pasivosCorrientes, prev.pasivosCorrientes, cur.totalPasivosCorrientes, prev.totalPasivosCorrientes),
      buildSection('Pasivos No Corrientes', cur.pasivosNoCorrientes, prev.pasivosNoCorrientes, cur.totalPasivosNoCorrientes, prev.totalPasivosNoCorrientes),
      { title: 'TOTAL PASIVOS', rows: [], total: { code: 'TOTAL', name: 'TOTAL PASIVOS', current: cur.totalPasivos, previous: prev.totalPasivos } },
      buildSection('Patrimonio', cur.patrimonio, prev.patrimonio, cur.totalPatrimonio, prev.totalPatrimonio),
      { title: 'TOTAL PASIVO + PATRIMONIO', rows: [], total: { code: 'TOTAL', name: 'TOTAL PASIVO + PATRIMONIO', current: cur.totalPatrimonioPasivos, previous: prev.totalPatrimonioPasivos } },
    ];
  }, [currentItems, previousItems]);

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

  const variance = (row: ComparativeRow) => row.current - row.previous;
  const variancePct = (row: ComparativeRow) =>
    row.previous !== 0 ? ((row.current - row.previous) / Math.abs(row.previous)) * 100 : null;

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
              <th className="text-left py-2 px-4 font-semibold">Cuenta</th>
              <th className="text-right py-2 px-4 font-semibold">Período Actual</th>
              <th className="text-right py-2 px-4 font-semibold">Período Anterior</th>
              <th className="text-right py-2 px-4 font-semibold">Variación</th>
              <th className="text-right py-2 px-4 font-semibold">Variación %</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((section, idx) => (
              <ComparativeSectionRows
                key={idx}
                section={section}
                formatAmount={formatAmount}
                variance={variance}
                variancePct={variancePct}
              />
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

function ComparativeSectionRows({
  section,
  formatAmount,
  variance,
  variancePct,
}: {
  section: ComparativeSection;
  formatAmount: (n: number) => string;
  variance: (row: ComparativeRow) => number;
  variancePct: (row: ComparativeRow) => number | null;
}) {
  return (
    <>
      <tr className="bg-gray-50">
        <td className="py-2 px-4 font-bold text-gray-800 col-span-5" colSpan={5}>
          {section.title}
        </td>
      </tr>
      {section.rows.map((row) => {
        const varAbs = variance(row);
        const varPct = variancePct(row);
        const trend = varAbs > 0 ? 'up' : varAbs < 0 ? 'down' : 'same';
        return (
          <tr key={row.code} className="border-t border-gray-100">
            <td className="py-1.5 px-4 pl-8 text-gray-600">
              <span className="text-xs text-gray-400 mr-2">{row.code}</span>
              {row.name}
            </td>
            <td className="py-1.5 px-4 text-right font-medium">{formatAmount(row.current)}</td>
            <td className="py-1.5 px-4 text-right text-gray-600">{formatAmount(row.previous)}</td>
            <td className="py-1.5 px-4 text-right">
              <span
                className={
                  trend === 'up'
                    ? 'text-green-600'
                    : trend === 'down'
                      ? 'text-red-600'
                      : 'text-gray-400'
                }
              >
                {varAbs > 0 ? '+' : ''}
                {formatAmount(varAbs)}
              </span>
            </td>
            <td className="py-1.5 px-4 text-right">
              <Badge
                variant={trend === 'same' ? 'outline' : 'default'}
                className={
                  trend === 'up'
                    ? 'bg-green-100 text-green-800'
                    : trend === 'down'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-gray-100 text-gray-500'
                }
              >
                {varAbs > 0 ? <TrendingUp className="h-3 w-3 mr-1" /> : varAbs < 0 ? <TrendingDown className="h-3 w-3 mr-1" /> : <Minus className="h-3 w-3 mr-1" />}
                {varPct !== null ? `${varPct >= 0 ? '+' : ''}${varPct.toFixed(1)}%` : 'N/A'}
              </Badge>
            </td>
          </tr>
        );
      })}
      <tr className="border-t-2 border-gray-300 font-bold">
        <td className="py-2 px-4">{section.total.name}</td>
        <td className="py-2 px-4 text-right">{formatAmount(section.total.current)}</td>
        <td className="py-2 px-4 text-right">{formatAmount(section.total.previous)}</td>
        <td className="py-2 px-4 text-right">
          {formatAmount(section.total.current - section.total.previous)}
        </td>
        <td className="py-2 px-4 text-right">
          {variancePct(section.total) !== null
            ? `${variancePct(section.total)! >= 0 ? '+' : ''}${variancePct(section.total)!.toFixed(1)}%`
            : 'N/A'}
        </td>
      </tr>
    </>
  );
}