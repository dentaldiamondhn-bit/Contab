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
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  CloudUpload,
  FileText,
  FileSpreadsheet,
  Loader2,
  RefreshCcw,
  XCircle,
} from "lucide-react";
import SARSessionPanel from "@/components/accounting/SARSessionPanel";
import type { SARConnectionStatus } from "@/lib/services/sar-session";

const CURRENT_YEAR = new Date().getFullYear();

function fmt(n: number): string {
  return new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL" }).format(n);
}

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

type AnnualUploadOutcome = {
  ok: boolean;
  status?: number;
  contentType?: string;
  bodyPreview?: string;
  portalConfirmation?: boolean;
  errorHint?: string;
  attempts?: number;
  warnings?: { detalle: string }[];
  validationErrors?: { detalle: string }[];
  error?: string;
  summaryPreview?:
    | { periodo?: number; baseISR: number; isv: number; isr: number; retenciones: number }
    | null;
};

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

  const [sarSessionStatus, setSarSessionStatus] = useState<SARConnectionStatus | null>(null);
  const [uploadingAnnual, setUploadingAnnual] = useState(false);
  const [uploadResult, setUploadResult] = useState<AnnualUploadOutcome | null>(null);

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

  const uploadAnnualDeclarations = async () => {
    if (!companyId || !summary || uploadingAnnual) return;
    setUploadingAnnual(true);
    setUploadResult(null);
    try {
      const res = await fetch("/api/accounting/annual-tax-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tenantId: companyId,
          summary,
          company: {
            rtn: currentTenant?.businessRTN || "",
            nombre: currentTenant?.businessName || "",
          },
        }),
      });
      const data = await res.json();
      setUploadResult(data as AnnualUploadOutcome);
    } catch {
      setUploadResult({
        ok: false,
        errorHint: "RED",
        error: "No se pudo conectar con el portal SAR (problema de red o tiempo de espera agotado).",
      });
    } finally {
      setUploadingAnnual(false);
    }
  };

  const sarErrorLabel = (hint?: string) => {
    switch (hint) {
      case "CREDENCIALES":
        return "El portal SAR rechazó las credenciales (usuario o contraseña incorrectos).";
      case "RED":
        return "No se pudo conectar con el portal SAR (problema de red o tiempo de espera agotado).";
      case "PORTAL":
        return "El portal SAR respondió con un error interno.";
      case "CONFIG":
        return "Configura la conexión al portal SAR con endpoint, usuario y contraseña.";
      case "SESION_SIN_VERIFICAR":
        return "No hay una sesión verificada con el portal SAR — conecta primero.";
      default:
        return "No se pudo completar la operación.";
    }
  };

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

      <Card className="border-cyan-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center space-x-2">
            <CloudUpload className="h-5 w-5 text-cyan-600" />
            <CardTitle className="text-base">Subir declaraciones al portal SAR</CardTitle>
          </div>
          {sarSessionStatus === "CONECTADO" ? (
            <Badge className="bg-emerald-600">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Sesión SAR verificada
            </Badge>
          ) : sarSessionStatus === "SESION_VENCIDA" ? (
            <Badge variant="destructive">
              <XCircle className="h-3 w-3 mr-1" />
              Sesión vencida — Iniciar sesión
            </Badge>
          ) : (
            <Badge variant="outline">No conectado</Badge>
          )}
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          <SARSessionPanel companyId={companyId} onStatusChange={setSarSessionStatus} />

          <div className="border-t pt-3 space-y-3">
            <Button
              onClick={uploadAnnualDeclarations}
              disabled={uploadingAnnual || !summary || sarSessionStatus !== "CONECTADO"}
            >
              {uploadingAnnual ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CloudUpload className="h-4 w-4 mr-2" />
              )}
              {uploadingAnnual ? "Subiendo declaraciones..." : "Subir declaraciones al portal SAR"}
            </Button>

            {sarSessionStatus !== "CONECTADO" && (
              <p className="flex items-center gap-1.5 text-sm text-red-700">
                <AlertCircle className="h-4 w-4" />
                Sesión vencida — Iniciar sesión
              </p>
            )}

            {uploadResult &&
              !uploadResult.ok &&
              uploadResult.validationErrors &&
              uploadResult.validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Faltan datos requeridos ({uploadResult.validationErrors.length})</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc ml-5 space-y-0.5">
                      {uploadResult.validationErrors.map((err, index) => (
                        <li key={index}>{err.detalle}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">La declaración no se envió al portal SAR.</p>
                  </AlertDescription>
                </Alert>
              )}

            {uploadResult &&
              !uploadResult.ok &&
              (!uploadResult.validationErrors || uploadResult.validationErrors.length === 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {uploadResult.error || sarErrorLabel(uploadResult.errorHint)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={uploadAnnualDeclarations}
                    disabled={uploadingAnnual}
                  >
                    Reintentar
                  </Button>
                </div>
              )}

            {uploadResult?.ok && uploadResult.warnings && uploadResult.warnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle>Declaraciones enviadas al portal SAR con advertencias</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc ml-5 space-y-0.5">
                    {uploadResult.warnings.map((w, index) => (
                      <li key={index}>{w.detalle}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {uploadResult?.ok &&
              (!uploadResult.warnings || uploadResult.warnings.length === 0) && (
                <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  <AlertTitle>Declaraciones enviadas al portal SAR</AlertTitle>
                  <AlertDescription>
                    <div className="flex flex-wrap items-center gap-2 mt-1">
                      <Badge className="bg-emerald-600">Enviado</Badge>
                      {uploadResult.portalConfirmation && (
                        <Badge variant="secondary">Confirmación del portal detectada</Badge>
                      )}
                    </div>
                    {uploadResult.summaryPreview && (
                      <ul className="list-disc ml-5 mt-1 space-y-0.5 text-xs">
                        {uploadResult.summaryPreview.periodo !== undefined && (
                          <li>Periodo declarado: {uploadResult.summaryPreview.periodo}</li>
                        )}
                        <li>ISV: {fmt(uploadResult.summaryPreview.isv)}</li>
                        <li>ISR: {fmt(uploadResult.summaryPreview.isr)}</li>
                        <li>Retenciones: {fmt(uploadResult.summaryPreview.retenciones)}</li>
                      </ul>
                    )}
                    {uploadResult.bodyPreview && (
                      <p className="text-xs mt-1 break-words">
                        Respuesta del portal: {uploadResult.bodyPreview}
                      </p>
                    )}
                  </AlertDescription>
                </Alert>
              )}
          </div>
        </CardContent>
      </Card>

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