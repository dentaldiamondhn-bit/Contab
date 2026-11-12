"use client";

import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import {
  formatCashFlowComparativesForExcel,
  QUARTER_KEYS,
} from "@/lib/reports/cash-flow-comparatives";
import type { CashFlowComparatives, QuarterlyCashFlow } from "@/lib/reports/cash-flow-comparatives";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertCircle,
  BarChart3,
  Calendar,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  TrendingDown,
  TrendingUp,
  Download,
} from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();

function fmt(n: number): string {
  return new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(n);
}

function isStrongRow(concept: string): boolean {
  return /^(Subtotal|Flujo neto|Saldo)/.test(concept);
}

export default function CashFlowComparativesPage() {
  const { currentTenant } = useTenant();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [data, setData] = useState<CashFlowComparatives | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  const companyId = currentTenant?.id;
  const companyName = currentTenant?.businessName || "empresa";

  const loadData = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }
    setLoading(true);
    setError(null);
    setExportError(null);
    try {
      const res = await fetch(
        `/api/accounting/cash-flow-comparatives?tenantId=${encodeURIComponent(companyId)}&fiscalYear=${year}`
      );
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        if (json?.errorHint === "FALTAN_PARAMETROS") {
          throw new Error("Faltan parámetros para generar el comparativo (empresa o año fiscal).");
        }
        throw new Error(`Error al consultar el comparativo (${res.status})`);
      }
      const json = await res.json();
      setData(json as CashFlowComparatives);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar el comparativo trimestral");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [companyId, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const matrix = data
    ? formatCashFlowComparativesForExcel(data.quarters || [], year)
    : null;

  const bestQuarter: QuarterlyCashFlow | null =
    data && data.bestQuarter
      ? data.quarters.find((q) => q.quarter === data.bestQuarter) || null
      : null;
  const worstQuarter: QuarterlyCashFlow | null =
    data && data.worstQuarter
      ? data.quarters.find((q) => q.quarter === data.worstQuarter) || null
      : null;

  const handleExportExcel = async () => {
    if (!companyId || !data || exporting) return;
    setExporting(true);
    setExportError(null);
    try {
      const res = await fetch("/api/accounting/cash-flow-comparatives", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId: companyId, fiscalYear: year, companyName }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setExportError(
          json?.errorHint === "FALTAN_PARAMETROS"
            ? "Faltan parámetros para exportar el comparativo."
            : "No se pudo generar el archivo Excel del comparativo."
        );
        return;
      }
      const contentType = res.headers.get("Content-Type") || "";
      if (contentType.includes("spreadsheetml.sheet")) {
        const blob = await res.blob();
        const disposition = res.headers.get("Content-Disposition") || "";
        const match = disposition.match(/filename="?([^";]+)"?/);
        const fileName =
          match?.[1] || `FlujoCaja_ComparativoQ1Q4_${year}_${companyName.replace(/\s+/g, "_")}.xlsx`;
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
      } else {
        const json = await res.json().catch(() => null);
        if (json?.warning === "SIN_MOVIMIENTOS") {
          setExportError("Sin movimientos para el año fiscal seleccionado: no hay archivo Excel para exportar.");
        } else {
          setExportError("No se pudo generar el archivo Excel del comparativo.");
        }
      }
    } catch {
      setExportError("No se pudo generar el archivo Excel del comparativo.");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-cyan-600" />
            Comparativos Trimestrales de Flujo de Caja
          </h1>
          <p className="text-sm text-gray-500">
            Segmentación Q1–Q4 del ejercicio {year} desde los movimientos reales del trial-balance
            · {currentTenant?.businessName || "Empresa"}
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Año fiscal</Label>
            <Input
              type="number"
              min={2000}
              max={CURRENT_YEAR + 5}
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value) || CURRENT_YEAR)}
              className="w-28"
            />
          </div>
          <Button variant="outline" size="sm" onClick={loadData} disabled={loading}>
            <RefreshCcw className="w-4 h-4 mr-2" /> Cargar
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportExcel}
            disabled={!data || exporting || loading}
            title="Descargar el comparativo trimestral en Excel"
          >
            {exporting ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <FileSpreadsheet className="w-4 h-4 mr-2" />
            )}
            Exportar a Excel (.xlsx)
          </Button>
        </div>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {exportError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Exportación no disponible</AlertTitle>
          <AlertDescription>{exportError}</AlertDescription>
        </Alert>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Generando comparativo…
        </div>
      ) : !companyId ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Empresa no identificada</AlertTitle>
          <AlertDescription>
            Seleccione una empresa para consultar su comparativo trimestral de flujo de caja.
          </AlertDescription>
        </Alert>
      ) : !data ? null : !data.hasData ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sin movimientos para el año fiscal seleccionado</AlertTitle>
          <AlertDescription>
            No hay transacciones contables en el ejercicio {year}. Registre movimientos para generar
            el comparativo trimestral.
          </AlertDescription>
        </Alert>
      ) : (
        <>
          {data.warning === "TRIMESTRES_SIN_DATOS" && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertTitle>Trimestres sin datos</AlertTitle>
              <AlertDescription>
                Algunos trimestres del ejercicio {year} no tienen movimientos contables; se muestran
                en cero y no bloquean el comparativo.
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-wrap items-center gap-3">
            {bestQuarter && (
              <Badge className="bg-emerald-600 hover:bg-emerald-600 text-base px-4 py-2">
                <TrendingUp className="w-4 h-4 mr-2" />
                Mejor trimestre: {bestQuarter.quarter} — {fmt(bestQuarter.netChange)}
              </Badge>
            )}
            {worstQuarter && (
              <Badge variant="destructive" className="text-base px-4 py-2">
                <TrendingDown className="w-4 h-4 mr-2" />
                Peor trimestre: {worstQuarter.quarter} — {fmt(worstQuarter.netChange)}
              </Badge>
            )}
          </div>

          <Card>
            <CardHeader className="border-b bg-gray-50">
              <CardTitle className="text-base flex items-center gap-2">
                <Calendar className="w-5 h-5 text-cyan-600" />
                Matriz comparativa Q1 ⇄ Q4 — ejercicio {year}
              </CardTitle>
              <div className="text-xs text-gray-500">
                {QUARTER_KEYS.map((q) => {
                  const quarter = data.quarters.find((x) => x.quarter === q);
                  return (
                    <span key={q} className="mr-4">
                      {q}: {quarter ? `${quarter.startDate} al ${quarter.endDate}` : ""}
                    </span>
                  );
                })}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {matrix ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-gray-50">
                        {matrix.header[0].map((cell, i) => (
                          <th
                            key={i}
                            className={`py-3 px-3 font-semibold ${
                              i === 0 ? "text-left" : "text-right"
                            }`}
                          >
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {matrix.header.slice(1).map((row, ri) => {
                        const strong = isStrongRow(String(row[0]));
                        return (
                          <tr
                            key={ri}
                            className={`border-b hover:bg-gray-50 ${
                              strong ? "bg-gray-50 font-bold" : ""
                            }`}
                          >
                            {row.map((cell, ci) => (
                              <td
                                key={ci}
                                className={`py-2.5 px-3 tabular-nums ${
                                  ci === 0 ? "text-left" : "text-right"
                                }`}
                              >
                                {cell}
                              </td>
                            ))}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Flujo neto anual</CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-2xl font-bold ${
                    data.totals.totalNetChange >= 0 ? "text-green-600" : "text-red-600"
                  }`}
                >
                  {fmt(data.totals.totalNetChange)}
                </div>
                <div className="text-xs text-gray-500">Σ Q1 + Q2 + Q3 + Q4</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Saldo inicial → final</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{fmt(data.totals.totalOpening)}</div>
                <div className="text-xs text-gray-500">→ {fmt(data.totals.totalClosing)} (cierre del ejercicio)</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-gray-600">Totales por actividad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Operación</span>
                  <span className="tabular-nums">{fmt(data.totals.totalOperations)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Inversión</span>
                  <span className="tabular-nums">{fmt(data.totals.totalInvesting)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Financiamiento</span>
                  <span className="tabular-nums">{fmt(data.totals.totalFinancing)}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Download className="w-4 h-4" />
            Use el botón "Exportar a Excel (.xlsx)" para descargar el comparativo trimestral completo.
          </div>
        </>
      )}
    </div>
  );
}