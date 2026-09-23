"use client";

import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { transformToAnnualTaxDeclarations, formatAnnualTaxForExcel } from "@/lib/reports/annual-tax";
import type { AnnualTaxDecl } from "@/lib/reports/annual-tax";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertCircle, Calendar, FileText, FileSpreadsheet, Loader2, RefreshCcw } from "lucide-react";

const CURRENT_YEAR = new Date().getFullYear();

function fmt(n: number): string {
  return new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(n);
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

function DeclarationCard({
  title,
  declaration,
  badge,
  badgeVariant = "default",
}: {
  title: string;
  declaration: AnnualTaxDecl;
  badge: string;
  badgeVariant?: BadgeVariant;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2">
          <CardTitle className="text-sm text-gray-500 flex items-center gap-2">
            <FileText className="w-4 h-4 text-cyan-600" />
            {title}
          </CardTitle>
          <Badge variant={badgeVariant} className="text-xs whitespace-nowrap">
            {badge}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-gray-900">{fmt(declaration.amount)}</div>
        <div className="text-xs text-gray-500 mt-1">
          Datos contables reales del ejercicio {declaration.periodo.year}
        </div>
        <div className="text-xs text-gray-500">Base gravable: {fmt(declaration.base)}</div>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left py-2 px-2 font-medium">Cuenta</th>
                <th className="text-left py-2 px-2 font-medium">Descripcion</th>
                <th className="text-left py-2 px-2 font-medium">Categoria</th>
                <th className="text-right py-2 px-2 font-medium">Monto</th>
              </tr>
            </thead>
            <tbody>
              {declaration.detalle.map((row, index) => (
                <tr key={`${row.cuenta}-${index}`} className="border-b hover:bg-gray-50">
                  <td className="py-2 px-2 font-mono text-[11px]">{row.cuenta || "-"}</td>
                  <td className="py-2 px-2 font-medium">{row.nombre}</td>
                  <td className="py-2 px-2">
                    <Badge variant="outline" className="text-[10px]">
                      {row.categoria}
                    </Badge>
                  </td>
                  <td className="py-2 px-2 text-right">{fmt(row.monto)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100 font-bold">
              {Object.entries(declaration.subtotales || {}).map(([label, value]) => (
                <tr key={label}>
                  <td colSpan={3} className="py-1 px-2 text-right">
                    {label}:
                  </td>
                  <td className="py-1 px-2 text-right">{fmt(value)}</td>
                </tr>
              ))}
              <tr>
                <td colSpan={3} className="py-1 px-2 text-right">
                  TOTAL {title.toUpperCase()}:
                </td>
                <td className="py-1 px-2 text-right">{fmt(declaration.amount)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AnnualTaxDeclarationsPage() {
  const { currentTenant } = useTenant();
  const [year, setYear] = useState(CURRENT_YEAR);
  const [summary, setSummary] = useState<Awaited<ReturnType<typeof transformToAnnualTaxDeclarations>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasTransactions, setHasTransactions] = useState(false);

  const companyId = currentTenant?.id;
  const companyName = currentTenant?.businessName || "empresa";

  const loadData = useCallback(async () => {
    if (!companyId) {
      setLoading(false);
      setSummary(null);
      setHasTransactions(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const startDate = `${year}-01-01`;
      const endDate = `${year}-12-31`;
      const res = await fetch(
        `/api/accounting/trial-balance?tenantId=${companyId}&startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`
      );
      if (!res.ok) throw new Error(`Error al consultar las transacciones contables (${res.status})`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data?.items || [];
      setSummary(transformToAnnualTaxDeclarations(rows, { year }));
      setHasTransactions(rows.length > 0);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar los datos contables");
      setSummary(null);
      setHasTransactions(false);
    } finally {
      setLoading(false);
    }
  }, [companyId, year]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExportExcel = useCallback(async () => {
    if (!summary) return;
    try {
      const XLSX = await import("xlsx");
      const sheets = formatAnnualTaxForExcel(summary);
      const workbook = XLSX.utils.book_new();
      Object.entries(sheets).forEach(([name, rows]) => {
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws["!cols"] = [{ wch: 14 }, { wch: 46 }, { wch: 24 }, { wch: 16 }];
        XLSX.utils.book_append_sheet(workbook, ws, name);
      });
      XLSX.writeFile(
        workbook,
        `Declaraciones_Anuales_${companyName.replace(/\s+/g, "_")}_${year}.xlsx`
      );
    } catch (e) {
      console.error("Error exporting annual declarations to Excel:", e);
      alert("No se pudo generar el archivo Excel");
    }
  }, [summary, companyName, year]);

  const isvBadge: BadgeVariant = summary && summary.isv.amount >= 0 ? "default" : "secondary";

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Calendar className="w-6 h-6 text-cyan-600" />
            Declaraciones Anuales
          </h1>
          <p className="text-sm text-gray-500">
            Declaraciones fiscales del ejercicio {year} desde las transacciones contables
          </p>
        </div>
        <div className="flex items-end gap-2">
          <div>
            <Label className="text-xs text-gray-500 mb-1 block">Año</Label>
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
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={!summary || loading}>
            <FileSpreadsheet className="w-4 h-4 mr-2" /> Exportar a Excel
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

      {!companyId && !loading ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Empresa no identificada</AlertTitle>
          <AlertDescription>Seleccione una empresa para consultar sus declaraciones anuales.</AlertDescription>
        </Alert>
      ) : loading ? (
        <div className="flex items-center justify-center py-16 text-gray-500">
          <Loader2 className="w-6 h-6 mr-2 animate-spin" /> Cargando datos del ejercicio {year}...
        </div>
      ) : !hasTransactions ? (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Sin transacciones en el ejercicio {year}</AlertTitle>
          <AlertDescription>
            Datos previos no disponibles. Registre transacciones contables para generar sus declaraciones anuales.
          </AlertDescription>
        </Alert>
      ) : summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <DeclarationCard
            title="ISV"
            declaration={summary.isv}
            badge={summary.isv.amount >= 0 ? "Impuesto a pagar" : "Saldo a favor"}
            badgeVariant={isvBadge}
          />
          <DeclarationCard
            title="ISR"
            declaration={summary.isr}
            badge="Tarifa ISR 25%"
            badgeVariant="default"
          />
          <DeclarationCard
            title="Retenciones"
            declaration={summary.retenciones}
            badge="Retenciones del ejercicio"
            badgeVariant="secondary"
          />
        </div>
      ) : null}
    </div>
  );
}