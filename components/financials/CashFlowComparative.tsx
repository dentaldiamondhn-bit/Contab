"use client";

import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeftRight,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Clock,
  TrendingUp,
  Loader2,
} from "lucide-react";
import {
  transformToFlujoEfectivo,
  groupFlujoItems,
  computeSourcesUses,
  computeCashProjections,
} from "@/lib/reports/cash-flow";
import type {
  FlujoItem,
  FlujoEfectivoGrouped,
  SourcesUses,
  CashProjections,
} from "@/lib/reports/cash-flow";

interface CashFlowComparativeProps {
  tenantId: string;
  startDate: string;
  endDate: string;
  currency?: "HNL" | "USD";
  mode?: "prev-month" | "prev-year";
}

/** Desplaza una fecha (YYYY-MM-DD) en meses o años, clampando al fin de mes. */
function shiftDate(dateStr: string, months = 0, years = 0): string {
  const d = new Date(`${dateStr}T00:00:00`);
  const total = d.getMonth() + months + years * 12;
  const targetYear = Math.floor(total / 12);
  const targetMonth = ((total % 12) + 12) % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const day = Math.min(d.getDate(), lastDay);
  const out = new Date(targetYear, targetMonth, day);
  return `${out.getFullYear()}-${String(out.getMonth() + 1).padStart(2, "0")}-${String(out.getDate()).padStart(2, "0")}`;
}

function daysInMonth(date: Date): number {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
}

function computeElapsedRatio(start: string, end: string): number {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  if (isNaN(s.getTime()) || isNaN(e.getTime()) || e < s) return 1;
  const days = Math.round((e.getTime() - s.getTime()) / 86400000) + 1;
  return Math.min(1, days / daysInMonth(s));
}

interface FlowRow {
  key: string;
  label: string;
  current: number;
  previous: number;
  strong?: boolean;
}

function formatAmount(n: number, currency: string): string {
  return new Intl.NumberFormat("es-HN", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(n || 0));
}

const fmtRange = (start: string, end: string) => {
  const f = (d: string) =>
    new Date(`${d}T00:00:00`).toLocaleDateString("es-HN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  return `${f(start)} – ${f(end)}`;
};

function ActivityComparative({
  title,
  rows,
  currency,
}: {
  title: string;
  rows: FlowRow[];
  currency: string;
}) {
  return (
    <div className="rounded-lg border bg-gray-50/50 overflow-hidden">
      <div className="px-4 py-2 bg-gray-100 border-b text-sm font-semibold text-gray-800">{title}</div>
      <div className="divide-y divide-gray-100 bg-white">
        {rows.map((row) => {
          const varAbs = row.current - row.previous;
          const varPct =
            row.previous !== 0 ? (varAbs / Math.abs(row.previous)) * 100 : null;
          const trend = varAbs > 0 ? "up" : varAbs < 0 ? "down" : "same";
          return (
            <div key={row.key} className="flex items-center justify-between px-4 py-2">
              <span
                className={`text-sm ${row.strong ? "font-bold text-gray-900" : "text-gray-600"}`}
              >
                {row.label}
              </span>
              <div className="flex items-center gap-3 text-right">
                <span
                  className={`text-sm tabular-nums ${row.strong ? "font-bold text-gray-900" : "text-gray-700"}`}
                >
                  {formatAmount(row.current, currency)}
                </span>
                <span className="text-xs tabular-nums text-gray-400 w-20">
                  {formatAmount(row.previous, currency)}
                </span>
                <Badge
                  variant="outline"
                  className={`w-16 justify-end ${
                    trend === "up"
                      ? "bg-green-50 text-green-700"
                      : trend === "down"
                      ? "bg-red-50 text-red-700"
                      : "bg-gray-50 text-gray-500"
                  }`}
                >
                  {trend === "up" ? (
                    <ArrowUpRight className="h-3 w-3 mr-1" />
                  ) : trend === "down" ? (
                    <ArrowDownRight className="h-3 w-3 mr-1" />
                  ) : (
                    <Minus className="h-3 w-3 mr-1" />
                  )}
                  {varPct !== null ? `${varAbs >= 0 ? "+" : ""}${varPct.toFixed(1)}%` : "—"}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CashFlowComparative({
  tenantId,
  startDate,
  endDate,
  currency = "HNL",
  mode = "prev-month",
}: CashFlowComparativeProps) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [current, setCurrent] = useState<FlujoEfectivoGrouped | null>(null);
  const [previous, setPrevious] = useState<FlujoEfectivoGrouped | null>(null);

  const previousRange = useMemo(() => {
    if (mode === "prev-year") {
      return {
        start: shiftDate(startDate, 0, -1),
        end: shiftDate(endDate, 0, -1),
      };
    }
    return { start: shiftDate(startDate, -1), end: shiftDate(endDate, -1) };
  }, [mode, startDate, endDate]);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError(null);
    const fetchGrouped = async (start: string, end: string): Promise<FlujoEfectivoGrouped> => {
      const res = await fetch(
        `/api/accounting/trial-balance?tenantId=${encodeURIComponent(tenantId)}&startDate=${start}T00:00:00Z&endDate=${end}T23:59:59Z`
      );
      if (!res.ok) throw new Error("No se pudo obtener la balanza de comprobación");
      const data = await res.json();
      return groupFlujoItems(transformToFlujoEfectivo(data || []));
    };
    (async () => {
      try {
        const [cur, prev] = await Promise.all([
          fetchGrouped(startDate, endDate),
          fetchGrouped(previousRange.start, previousRange.end),
        ]);
        if (!alive) return;
        setCurrent(cur);
        setPrevious(prev);
      } catch (err: any) {
        if (alive) setError(err?.message || "Error al cargar el comparativo");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [tenantId, startDate, endDate, previousRange.start, previousRange.end]);

  const sourcesUses: SourcesUses | null = useMemo(
    () => (current ? computeSourcesUses(current.operacion.concat(current.inversion, current.financiacion)) : null),
    [current]
  );

  const projections: CashProjections | null = useMemo(
    () => (current ? computeCashProjections(current, startDate, endDate) : null),
    [current, startDate, endDate]
  );

  if (loading) {
    return (
      <Card className="mb-6">
        <CardContent className="flex items-center justify-center py-10">
          <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
          <span className="text-gray-600">Cargando comparativo de flujo de efectivo...</span>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="mb-6 border-red-200">
        <CardContent className="flex items-center py-6 text-red-700">
          <span>{error}</span>
        </CardContent>
      </Card>
    );
  }

  if (!current) return null;

  const rows: FlowRow[] = [
    {
      key: "entradas-op",
      label: "Entradas de Operación",
      current: current.entradasOperacion,
      previous: previous?.entradasOperacion ?? 0,
    },
    {
      key: "salidas-op",
      label: "Salidas de Operación",
      current: current.salidasOperacion,
      previous: previous?.salidasOperacion ?? 0,
    },
    {
      key: "neto-op",
      label: "Flujo Neto de Operación",
      current: current.netoOperacion,
      previous: previous?.netoOperacion ?? 0,
      strong: true,
    },
    {
      key: "neto-inv",
      label: "Flujo de Inversión",
      current: current.netoInversion,
      previous: previous?.netoInversion ?? 0,
    },
    {
      key: "neto-fin",
      label: "Flujo de Financiamiento",
      current: current.netoFinanciacion,
      previous: previous?.netoFinanciacion ?? 0,
    },
    {
      key: "neto-total",
      label: "Flujo Neto del Período",
      current: current.netoTotal,
      previous: previous?.netoTotal ?? 0,
      strong: true,
    },
    {
      key: "saldo-final",
      label: "Saldo Final de Efectivo",
      current: current.saldoFinal,
      previous: previous?.saldoFinal ?? 0,
      strong: true,
    },
  ];

  const burnRow: FlowRow = {
    key: "burn",
    label: "Tasa de Consumo (salidas operación)",
    current: current.salidasOperacion,
    previous: previous?.salidasOperacion ?? 0,
  };
  const runwayRow: FlowRow = {
    key: "runway",
    label: "Meses de Efectivo (runway)",
    current: current.mesesEfectivo,
    previous: previous?.mesesEfectivo ?? 0,
    strong: true,
  };

  return (
    <Card className="mb-6">
      <CardHeader className="border-b bg-blue-50">
        <CardTitle className="text-xl text-blue-900 flex items-center">
          <ArrowLeftRight className="h-5 w-5 mr-2" />
          Comparativo de Flujo de Efectivo
        </CardTitle>
        <p className="text-sm text-gray-600">
          {fmtRange(startDate, endDate)} vs {fmtRange(previousRange.start, previousRange.end)}
          {mode === "prev-month" ? " (mes anterior)" : " (mismo mes, año anterior)"}
        </p>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <ActivityComparative
            title="Operación"
            currency={currency}
            rows={rows.filter((r) => r.key.startsWith("entradas") || r.key.startsWith("salidas") || r.key === "neto-op")}
          />
          <ActivityComparative
            title="Inversión y Financiamiento"
            currency={currency}
            rows={rows.filter((r) => r.key === "neto-inv" || r.key === "neto-fin")}
          />
          <ActivityComparative
            title="Resumen"
            currency={currency}
            rows={rows.filter((r) => r.key === "neto-total" || r.key === "saldo-final")}
          />
        </div>

        {/* Fuentes y usos */}
        {sourcesUses && (
          <div className="rounded-lg border bg-white overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 border-b text-sm font-semibold text-gray-800 flex items-center justify-between">
              <span>Fuentes y Usos de Efectivo</span>
              <Badge className={sourcesUses.neto >= 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                Neto: {formatAmount(sourcesUses.neto, currency)}
              </Badge>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">
              <div>
                <p className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1" /> Fuentes — {formatAmount(sourcesUses.totalFuentes, currency)}
                </p>
                <div className="divide-y divide-gray-100">
                  {sourcesUses.fuentes.map((f) => (
                    <div key={f.code} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-gray-700 truncate">
                        {f.code} · {f.name}
                      </span>
                      <span className="tabular-nums text-green-700 ml-2">{formatAmount(f.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-red-700 mb-2 flex items-center">
                  <TrendingUp className="h-4 w-4 mr-1 rotate-180" /> Usos — {formatAmount(sourcesUses.totalUsos, currency)}
                </p>
                <div className="divide-y divide-gray-100">
                  {sourcesUses.usos.map((u) => (
                    <div key={u.code} className="flex items-center justify-between py-1.5 text-sm">
                      <span className="text-gray-700 truncate">
                        {u.code} · {u.name}
                      </span>
                      <span className="tabular-nums text-red-700 ml-2">{formatAmount(u.amount, currency)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Runway / proyección */}
        {(burnRow.current !== 0 || burnRow.previous !== 0) && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 border-t bg-blue-50/50 rounded-lg">
            <div className="text-center border rounded-lg p-3 bg-white">
              <p className="text-sm text-gray-600">Tasa de Consumo (Actual)</p>
              <p className="text-lg font-bold text-blue-900">
                {formatAmount(burnRow.current, currency)}/mes
              </p>
            </div>
            <div className="text-center border rounded-lg p-3 bg-white">
              <p className="text-sm text-gray-600">Tasa de Consumo (Anterior)</p>
              <p className="text-lg font-bold text-gray-700">
                {formatAmount(burnRow.previous, currency)}/mes
              </p>
            </div>
            <div className="text-center border rounded-lg p-3 bg-white">
              <p className="text-sm text-gray-600">Months of Runway (Actual)</p>
              <p className="text-lg font-bold text-blue-900">{runwayRow.current} meses</p>
            </div>
            <div className="text-center border rounded-lg p-3 bg-white">
              <p className="text-sm text-gray-600">Months of Runway (Anterior)</p>
              <p className="text-lg font-bold text-gray-700">{runwayRow.previous} meses</p>
            </div>
          </div>
        )}

        {projections && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border rounded-lg p-4 bg-white">
              <p className="text-sm font-semibold text-gray-700 mb-2 flex items-center">
                <Clock className="h-4 w-4 mr-1" /> Run-rate de Caja
              </p>
              <div className="flex items-center justify-between text-sm">
                <span>Mensual: {formatAmount(projections.monthly, currency)}</span>
                <span>Trimestral: {formatAmount(projections.quarterly, currency)}</span>
                <span>Anual: {formatAmount(projections.annual, currency)}</span>
              </div>
              <p className="mt-2 text-xs text-gray-500">
                Runway restante:{" "}
                {projections.runwayRemaining !== null
                  ? `${projections.runwayRemaining.toFixed(1)} meses`
                  : "—"}
              </p>
            </div>
            <div className="border rounded-lg p-4 bg-gray-50">
              <p className="text-sm font-semibold text-gray-700 mb-2">Saldo Proyectado</p>
              <div className="flex items-center justify-between text-sm">
                <span>Mensual: {formatAmount(projections.saldoProyectadoMensual, currency)}</span>
                <span>Anual: {formatAmount(projections.saldoProyectadoAnual, currency)}</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}