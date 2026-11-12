"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, TrendingUp, Calendar, ArrowUpDown, BarChart3 } from "lucide-react";
import { isValidPeriod, getYoYPeriod, getAllYoYPeriods, isSameMonthDifferentYear } from "@/lib/services/period-variations";

interface YoYComparison {
  period: string;
  year: number;
  label: string;
  selected: boolean;
}

interface YearOverYearComparisonProps {
  initialPeriod?: string;
  initialYearsAgo?: number;
}

export default function YearOverYearComparison({ initialPeriod, initialYearsAgo }: YearOverYearComparisonProps = {}) {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id || '1';
  
  const [currentPeriod, setCurrentPeriod] = useState<string>(initialPeriod || new Date().toISOString().slice(0, 7));
  const [yearsAgo, setYearsAgo] = useState<number>(initialYearsAgo || 1);
  const [showYoY, setShowYoY] = useState<boolean>(false);
  const [comparisonPeriods, setComparisonPeriods] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fromReport, setFromReport] = useState<any>(null);
  const [toReport, setToReport] = useState<any>(null);

  // Generate comparison periods when currentPeriod changes
  useEffect(() => {
    if (isValidPeriod(currentPeriod)) {
      const periods = getAllYoYPeriods(currentPeriod, 5);
      setComparisonPeriods(periods);
    }
  }, [currentPeriod]);

  // Fetch YoY comparison when yearsAgo changes
  useEffect(() => {
    let mounted = true;

    async function loadYoYComparison() {
      setLoading(true);
      setError(null);

      try {
        // Si showYoY es true, comparar con el período specified años atrás
        if (showYoY) {
          const yoyPeriod = getYoYPeriod(currentPeriod, yearsAgo);
          
          const response = await fetch(
            `/api/accounting/period-variations?tenantId=${tenantId}&from=${currentPeriod}&to=${yoyPeriod}&yoy=true&yoyYears=${yearsAgo}`,
            {
              cache: "no-store",
            }
          );

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || "Error al cargar comparación año-año");
          }

          const data = await response.json();
          if (mounted) {
            setFromReport(data.data?.report?.from ? { ...data.data.report.from } : null);
            setToReport(data.data?.report?.to ? { ...data.data.report.to } : null);
          }
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setFromReport(null);
          setToReport(null);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadYoYComparison();

    return () => {
      mounted = false;
    };
  }, [currentPeriod, yearsAgo, showYoY, tenantId]);

  // Generate period labels
  const periodLabels = comparisonPeriods.map(p => {
    const year = getYearFromPeriod(p);
    const monthNames = [
      "Ene", "Feb", "Mar", "Abr", "May", "Jun",
      "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
    ];
    const month = getMonthFromPeriod(p);
    return { period: p, label: `${monthNames[month - 1]} ${year}`, year };
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h3 className="text-xl font-bold text-gray-900">
          {showYoY 
            ? `Comparación Año-a-Año: ${currentPeriod} vs ${getYoYPeriod(currentPeriod, yearsAgo)}`
            : `Comparador de Períodos Contables`}
        </h3>
        <p className="text-gray-600">
          Compara balances, débitos y créditos entre períodos contables
        </p>
      </div>

      {/* Selection Interface */}
      {showYoY ? (
        <Card>
          <CardHeader>
            <CardTitle>Configuración de Comparación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Período actual</p>
                <p className="font-medium text-gray-900">{getMonthName(getMonthFromPeriod(currentPeriod))} {getYearFromPeriod(currentPeriod)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Comparar con</p>
                <p className="font-medium text-gray-900">{yearsAgo} año(s) atrás</p>
              </div>
            </div>

            <div className="mt-4">
              <Button 
                variant="outline" 
                onClick={() => setShowYoY(false)}
                className="w-full mb-2">
                ← Volver a modo comparador normal
              </Button>
              <Button 
                variant="primary" 
                onClick={() => setShowYoY(true)}
                className="w-full">
                Mostrar comparación año-a-año
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : (
        // Modo comparador normal
        <Card>
          <CardHeader>
            <CardTitle>Seleccionar Períodos para Comparar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Período Desde */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">Período Desde</Label>
                <select
                  onChange={(e) => setCurrentPeriod(e.target.value)}
                  className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleccionar...</option>
                  {comparisonPeriods.map((period) => (
                    <option
                      key={period}
                      value={period}
                      selected={period === currentPeriod}
                    >
                      {getMonthName(getMonthFromPeriod(period))} {getYearFromPeriod(period)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Período Hasta */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">Período Hasta</Label>
                <select
                  onChange={(e) => setCurrentPeriod(e.target.value)}
                  className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="">Seleccionar...</option>
                  {comparisonPeriods.map((period) => (
                    <option
                      key={period}
                      value={period}
                      selected={period === currentPeriod}
                    >
                      {getMonthName(getMonthFromPeriod(period))} {getYearFromPeriod(period)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Años atrás */}
              <div>
                <Label className="block text-sm font-medium text-gray-700 mb-2">Años atrás</Label>
                <select
                  onChange={(e) => setYearsAgo(Number(e.target.value))}
                  className="w-full rounded border p-2 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="1">1 año</option>
                  <option value="2">2 años</option>
                  <option value="3">3 años</option>
                  <option value="4">4 años</option>
                  <option value="5">5 años</option>
                </select>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-gray-200">
              <Button
                variant="primary"
                onClick={() => setShowYoY(true)}
                className="w-full">
                📊 Ver Comparación Año-a-Año
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {fromReport && toReport && (
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Resultados de la Comparación</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-500">Período Actual</p>
                <p className="font-medium">{getMonthName(getMonthFromPeriod(currentPeriod))} {getYearFromPeriod(currentPeriod)}</p>
                <p className="text-xs text-gray-400">{formatNumber(fromReport.fromBalance || 0)} HNL</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Período Comparado</p>
                <p className="font-medium">
                  {yearsAgo} año${
                    yearsAgo > 1 ? "s atrás" : " atrás"
                  } - {getMonthName(getMonthFromPeriod(getYoYPeriod(currentPeriod, yearsAgo)))} {getYearFromPeriod(getYoYPeriod(currentPeriod, yearsAgo))}
                </p>
                <p className="text-xs text-gray-400">{formatNumber(toReport.toBalance || 0)} HNL</p>
              </div>
            </div>

            {/* Trend indicator */}
            {fromReport && toReport && fromReport.trend && toReport.trend !== undefined && (
              <div className="mt-4 p-3 rounded {fromReport.trend === 'up' ? 'bg-green-100 text-green-800' : fromReport.trend === 'down' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}">
                <p className="text-sm font-medium">
                  {fromReport.trend === 'up'
                    ? "↑ Tendencia Ascendente"
                    : fromReport.trend === 'down'
                      ? "↓ Tendencia Descendente"
                      : "→ Sin Cambio Significativo"}
                </p>
                <p className="text-xs mt-1">
                  Variación: {formatNumber(fromReport.varAbs || 0)} HNL {formatPct(fromReport.varPct || 0)}
                </p>
              </div>
            )}

            {/* Account variations summary */}
            {fromReport && fromReport.rows && fromReport.rows.length > 0 && (
              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm font-medium text-gray-700">Resumen por Cuenta</p>
                <div className="grid grid-cols-2 gap-2 mt-3">
                  {fromReport.rows.slice(0, 8).map((row: any) => (
                    <div key={row.accountId} className="p-2 rounded border">
                      <div className="text-xs text-gray-500">{row.code || row.accountId.substring(0, 6)}</div>
                      <div className="text-sm font-medium">{row.name || 'N/A'}</div>
                      <div className="text-xs text-gray-400">
                        {formatNumber(row.fromBalance)} → {formatNumber(row.toBalance)} ({formatPct(row.varPct)})
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Monthly trends summary when in YoY mode */}
      {showYoY && fromReport && fromReport.rows && fromReport.rows.length > 0 && (
        <div className="mt-8 p-4 rounded bg-blue-50">
          <p className="text-sm font-medium text-blue-800">
            {fromReport.counts.accounts} cuentas analizadas | {fromReport.counts.up} ↑ {fromReport.counts.down} ↓ {fromReport.counts.same} ↔
          </p>
        </div>
      )}
    </div>
  );
}

/* Helper functions */
function getMonthName(month: number): string {
  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];
  return months[month - 1] || "";
}

function formatNumber(n: number): string {
  return n.toLocaleString("es-HN");
}

function formatPct(n: number | null | undefined): string {
  if (n === null || n === undefined || isNaN(n)) return "N/A";
  return `${n.toFixed(2)}%`;
}