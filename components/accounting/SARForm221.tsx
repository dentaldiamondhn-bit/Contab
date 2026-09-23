"use client";

import React from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { FileText, Calculator, Download, AlertCircle, Database, ShieldCheck, RefreshCw, ExternalLink, AlertTriangle, Eye, EyeOff, KeyRound, CloudUpload, Loader2, CheckCircle2, XCircle, Wifi, Pencil } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transformToDET, validateAgainstSARRanges, formatDETForSAR, validateCompleteness, getSARRangesSummary, getDETFileName } from "@/lib/reports/det-sar";
import type { DETRecord, SARValidation, DETCompletenessResult } from "@/lib/reports/det-sar";

interface SARForm221Props {
  ingresos: any[];
  egresos: any[];
  period: string;
}

export default function SARForm221({ ingresos, egresos, period }: SARForm221Props) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(amount);
  };

  const params = useParams();
  const companyId = params && typeof params.id === 'string' ? params.id : undefined;

  const { startDate, endDate } = React.useMemo(() => {
    const parts = period.split('-');
    const year = parseInt(parts[0], 10);
    if (parts[1]) {
      const month = parseInt(parts[1], 10);
      const last = new Date(year, month, 0).getDate();
      return {
        startDate: `${year}-${String(month).padStart(2, '0')}-01`,
        endDate: `${year}-${String(month).padStart(2, '0')}-${String(last).padStart(2, '0')}`,
      };
    }
    return { startDate: `${year}-01-01`, endDate: `${year}-12-31` };
  }, [period]);

  const formatDETDate = (value: string) => {
    if (!value) return value;
    const parts = value.split('-');
    if (parts.length !== 3) return value;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  const [dataSource, setDataSource] = React.useState<'auto' | 'manual'>('manual');
  const [loadingAuto, setLoadingAuto] = React.useState(false);
  const [autoRecords, setAutoRecords] = React.useState<DETRecord[]>([]);
  const [autoTotals, setAutoTotals] = React.useState<{
    debitoFiscal: number;
    creditoFiscal: number;
    ventaBase: number;
    compraBase: number;
  } | null>(null);
  const [sarValidation, setSarValidation] = React.useState<SARValidation | null>(null);
  const [loadingValidation, setLoadingValidation] = React.useState(false);
  const [completeness, setCompleteness] = React.useState<DETCompletenessResult | null>(null);
  const [sarRangesSummary, setSarRangesSummary] = React.useState<{
    caiCount: number;
    totalDocumentos: number;
    rangoActual: string;
  } | null>(null);
  const [generatedContent, setGeneratedContent] = React.useState<string | null>(null);
  const [generatedFileName, setGeneratedFileName] = React.useState<string | null>(null);
  const [generatedCai, setGeneratedCai] = React.useState<string | undefined>(undefined);
  const [generatedCorrelativo, setGeneratedCorrelativo] = React.useState<string | undefined>(undefined);

  const [sarConfig, setSarConfig] = React.useState<{
    configured: boolean;
    endpoint: string;
    usuario: string;
    hasPassword: boolean;
  } | null>(null);
  const [loadingSarConfig, setLoadingSarConfig] = React.useState(false);
  const [showSarForm, setShowSarForm] = React.useState(false);
  const [sarEndpoint, setSarEndpoint] = React.useState('');
  const [sarUsuario, setSarUsuario] = React.useState('');
  const [sarPassword, setSarPassword] = React.useState('');
  const [showSarPassword, setShowSarPassword] = React.useState(false);
  const [savingSarConfig, setSavingSarConfig] = React.useState(false);
  const [sarConfigMessage, setSarConfigMessage] = React.useState<{ ok: boolean; text: string } | null>(null);
  const [testingConnection, setTestingConnection] = React.useState(false);
  const [connectionResult, setConnectionResult] = React.useState<{
    ok: boolean;
    errorHint?: string;
    bodyPreview?: string;
  } | null>(null);
  const [uploadingDet, setUploadingDet] = React.useState(false);
  const [uploadResult, setUploadResult] = React.useState<{
    ok: boolean;
    errorHint?: string;
    bodyPreview?: string;
    portalConfirmation?: boolean;
  } | null>(null);

  // Lógica de agrupación para Formulario 221 SAR
  const summary = React.useMemo(() => {
    const data = {
      ventas: {
        exentas: 0, // Casilla 401
        exportaciones: 0, // Casilla 402
        gravadas15: 0, // Casilla 403
        gravadas18: 0, // Casilla 404
        servicios15: 0, // Casilla 405
        debitoFiscal: 0,
      },
      compras: {
        exentas: 0, // Casilla 501
        importacionesExentas: 0, // Casilla 502
        gravadas15: 0, // Casilla 503
        gravadas18: 0, // Casilla 504
        importaciones15: 0, // Casilla 505
        creditoFiscal: 0,
      }
    };

    // Procesar Ingresos
    ingresos.forEach(ing => {
      const monto = ing.total_amount || 0;
      // Simplificación: Asumimos 15% si no se especifica.
      // En producción, esto debe venir de los JournalEntries vinculados a cuentas de ISV.
      const neto = monto / 1.15;
      const isv = monto - neto;

      data.ventas.gravadas15 += neto;
      data.ventas.debitoFiscal += isv;
    });

    // Procesar Egresos
    egresos.forEach(egr => {
      const monto = egr.total_amount || 0;
      const neto = monto / 1.15;
      const isv = monto - neto;

      data.compras.gravadas15 += neto;
      data.compras.creditoFiscal += isv;
    });

    return data;
  }, [ingresos, egresos]);

  const effectiveSummary = React.useMemo(() => {
    if (!autoTotals) return summary;
    return {
      ...summary,
      ventas: { ...summary.ventas, gravadas15: autoTotals.ventaBase, debitoFiscal: autoTotals.debitoFiscal },
      compras: { ...summary.compras, gravadas15: autoTotals.compraBase, creditoFiscal: autoTotals.creditoFiscal },
    };
  }, [summary, autoTotals]);

  const impuestoAPagar = effectiveSummary.ventas.debitoFiscal - effectiveSummary.compras.creditoFiscal;

  const loadAutoDet = async () => {
    if (!companyId) {
      setDataSource('manual');
      alert("No se pudo identificar la empresa para generar el DET.");
      return;
    }
    setLoadingAuto(true);
    try {
      const response = await fetch(
        `/api/accounting/trial-balance?tenantId=${companyId}&startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`
      );
      if (!response.ok) throw new Error("Error al obtener el balance de comprobación");
      const data = await response.json();
      const records = transformToDET(data || [], { fecha: formatDETDate(endDate) });
      setAutoRecords(records);
      setAutoTotals({
        debitoFiscal: records.filter(r => r.tipoOperacion === 'VENTA').reduce((s, r) => s + r.impuesto, 0),
        creditoFiscal: records.filter(r => r.tipoOperacion === 'COMPRA').reduce((s, r) => s + r.impuesto, 0),
        ventaBase: records.filter(r => r.tipoOperacion === 'VENTA').reduce((s, r) => s + r.montoGravado, 0),
        compraBase: records.filter(r => r.tipoOperacion === 'COMPRA').reduce((s, r) => s + r.montoGravado, 0),
      });
      setCompleteness(null);
      setGeneratedContent(null);
      setGeneratedFileName(null);
      setSarValidation(null);
      setSarRangesSummary(null);
    } catch (error) {
      console.error("Error generando DET automático:", error);
      alert("Error al generar el DET desde transacciones contables. Revise la conexión con los datos contables.");
    } finally {
      setLoadingAuto(false);
    }
  };

  const handleDataSource = (source: 'auto' | 'manual') => {
    setDataSource(source);
    if (source === 'auto') {
      loadAutoDet();
    }
  };

  const loadRanges = async () => {
    if (!companyId) return [];
    try {
      const res = await fetch(`/api/companies/${companyId}/cai`);
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      return list.map((a: any) => ({
        cai: a.codigo || a.cai || a.id || 'CAI',
        inicio: Number(a.rangoInicial ?? a.rangeStart ?? a.start_number ?? 0),
        fin: Number(a.rangoFinal ?? a.rangeEnd ?? a.end_number ?? 0),
        correlativoActual: Number(a.currentNumber ?? a.correlativoActual ?? a.current_number ?? 0),
      }));
    } catch (error) {
      console.error("Error cargando rangos SAR:", error);
      return [];
    }
  };

  const loadCompany = async () => {
    if (!companyId) return { rtn: '', name: '' };
    try {
      const res = await fetch(`/api/companies/${companyId}`);
      if (!res.ok) return { rtn: '', name: '' };
      const data = await res.json();
      return {
        rtn: data?.businessrtn || data?.businessRTN || data?.rtn || '',
        name: data?.businessname || data?.businessName || data?.name || data?._company?.name || '',
      };
    } catch (error) {
      console.error("Error cargando datos de la empresa:", error);
      return { rtn: '', name: '' };
    }
  };

  const runSARValidation = async () => {
    setLoadingValidation(true);
    try {
      const ranges = await loadRanges();
      setSarRangesSummary(getSARRangesSummary(ranges));
      const result = validateAgainstSARRanges(autoRecords, ranges);
      setSarValidation(result);
    } finally {
      setLoadingValidation(false);
    }
  };

  const handleGenerateDET = async () => {
    if (!autoRecords.length) {
      setCompleteness(null);
      setGeneratedContent(null);
      setGeneratedFileName(null);
      return;
    }

    const [ranges, company] = await Promise.all([loadRanges(), loadCompany()]);
    const cai = ranges[0];
    setSarRangesSummary(getSARRangesSummary(ranges));

    const completenessResult = validateCompleteness(autoRecords, {
      rtn: company.rtn,
      nombre: company.name,
    });
    setCompleteness(completenessResult);

    if (completenessResult.errors.length > 0) {
      setGeneratedContent(null);
      setGeneratedFileName(null);
      return;
    }

    const validation = validateAgainstSARRanges(autoRecords, ranges);
    setSarValidation(validation);

    const content = formatDETForSAR(autoRecords);
    const fileName = getDETFileName(autoRecords, company.name || 'empresa', cai);
    setGeneratedCai(cai?.cai);
    setGeneratedCorrelativo(cai ? String(cai.correlativoActual || 0) : undefined);
    setGeneratedContent(content);
    setGeneratedFileName(fileName);
  };

  const handleDownloadDET = () => {
    if (!generatedContent || !generatedFileName) {
      alert("Primero genere el DET para poder descargarlo.");
      return;
    }
    const blob = new Blob([generatedContent], { type: 'text/plain;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = generatedFileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const openSARPortal = () => {
    window.open('https://portal.sar.gob.hn', '_blank', 'noopener,noreferrer');
  };

  React.useEffect(() => {
    if (!companyId) return;
    let cancelled = false;
    setLoadingSarConfig(true);
    (async () => {
      try {
        const res = await fetch(`/api/accounting/sar-config?tenantId=${encodeURIComponent(companyId)}`);
        const data = await res.json();
        if (cancelled) return;
        if (data && data.configured) {
          setSarConfig({
            configured: true,
            endpoint: data.endpoint || '',
            usuario: data.usuario || '',
            hasPassword: !!data.hasPassword,
          });
        } else {
          setSarConfig({ configured: false, endpoint: '', usuario: '', hasPassword: false });
        }
      } catch {
        if (!cancelled) setSarConfig({ configured: false, endpoint: '', usuario: '', hasPassword: false });
      } finally {
        if (!cancelled) setLoadingSarConfig(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [companyId]);

  const openSarConfigForm = () => {
    setSarEndpoint(sarConfig?.endpoint || '');
    setSarUsuario(sarConfig?.usuario || '');
    setSarPassword('');
    setSarConfigMessage(null);
    setShowSarForm(true);
  };

  const saveSarConfig = async () => {
    if (!companyId) return;
    if (!sarEndpoint.trim() || !sarUsuario.trim()) {
      setSarConfigMessage({ ok: false, text: 'El endpoint y el usuario del portal SAR son obligatorios.' });
      return;
    }
    setSavingSarConfig(true);
    try {
      const res = await fetch('/api/accounting/sar-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: companyId,
          endpoint: sarEndpoint.trim(),
          usuario: sarUsuario.trim(),
          password: sarPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setSarConfigMessage({ ok: false, text: data?.error || 'No se pudo guardar la configuración SAR.' });
        return;
      }
      setSarConfig({
        configured: true,
        endpoint: sarEndpoint.trim(),
        usuario: sarUsuario.trim(),
        hasPassword: true,
      });
      setSarConfigMessage({ ok: true, text: 'Config guardada (clave cifrada AES-256-GCM).' });
      setShowSarForm(false);
    } catch {
      setSarConfigMessage({ ok: false, text: 'Error de red al guardar la configuración SAR.' });
    } finally {
      setSavingSarConfig(false);
    }
  };

  const testSARConnection = async () => {
    if (!companyId) return;
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/accounting/det-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: companyId, detText: '' }),
      });
      const data = await res.json();
      setConnectionResult({ ok: !!data?.ok, errorHint: data?.errorHint, bodyPreview: data?.bodyPreview });
    } catch {
      setConnectionResult({ ok: false, errorHint: 'RED' });
    } finally {
      setTestingConnection(false);
    }
  };

  const uploadDETToSAR = async () => {
    if (!companyId || !generatedContent) return;
    if (uploadingDet) return;
    setUploadingDet(true);
    setUploadResult(null);
    try {
      const res = await fetch('/api/accounting/det-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: companyId,
          detText: generatedContent,
          periodo: period,
          cai: generatedCai,
          correlativo: generatedCorrelativo,
        }),
      });
      const data = await res.json();
      setUploadResult({
        ok: !!data?.ok,
        errorHint: data?.errorHint,
        bodyPreview: data?.bodyPreview,
        portalConfirmation: !!data?.portalConfirmation,
      });
    } catch {
      setUploadResult({ ok: false, errorHint: 'RED' });
    } finally {
      setUploadingDet(false);
    }
  };

  const sarErrorLabel = (hint?: string) => {
    switch (hint) {
      case 'CREDENCIALES':
        return 'El portal SAR rechazó las credenciales (usuario o contraseña incorrectos).';
      case 'RED':
        return 'No se pudo conectar con el portal SAR (problema de red o tiempo de espera agotado).';
      case 'PORTAL':
        return 'El portal SAR respondió con un error interno.';
      case 'CONFIG':
        return 'Configura primero la carga SAR con endpoint, usuario y contraseña.';
      default:
        return 'No se pudo completar la operación.';
    }
  };

  const ventasCompradas = autoRecords.filter(r => r.tipoOperacion === 'VENTA');
  const comprasRegistradas = autoRecords.filter(r => r.tipoOperacion === 'COMPRA');

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div className="flex items-center space-x-2">
          <Calculator className="h-6 w-6 text-cyan-600" />
          <h2 className="text-xl font-bold">Resumen Formulario 221 (ISV)</h2>
        </div>
        {generatedFileName ? (
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" onClick={handleDownloadDET}>
              <Download className="h-4 w-4 mr-2" />
              Descargar DET (.txt)
            </Button>
            <Button onClick={openSARPortal}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Abrir portal SAR
            </Button>
          </div>
        ) : (
          <Button onClick={handleGenerateDET} disabled={loadingAuto}>
            <FileText className="h-4 w-4 mr-2" />
            Generar DET
          </Button>
        )}
      </div>

      {/* Generación automática del DET */}
      <Card className="border-cyan-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center space-x-2">
            <Database className="h-5 w-5 text-cyan-600" />
            <CardTitle className="text-base">Detalle de Exportación Tributaria (DET)</CardTitle>
          </div>
          <div className="flex items-center gap-1 border rounded-md p-1">
            <Button
              size="sm"
              variant={dataSource === 'auto' ? 'default' : 'ghost'}
              onClick={() => handleDataSource('auto')}
              disabled={loadingAuto}
            >
              <Database className="w-4 h-4 mr-1" />
              {loadingAuto ? "Generando..." : "Automático (transacciones)"}
            </Button>
            <Button
              size="sm"
              variant={dataSource === 'manual' ? 'default' : 'ghost'}
              onClick={() => handleDataSource('manual')}
            >
              Manual
            </Button>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <p className="text-sm text-slate-600">
            El DET se genera desde las transacciones contables del período ({startDate} a {endDate}): débito fiscal
            (ventas) y crédito fiscal (compras) se llenan automáticamente.
          </p>

          {dataSource === 'auto' && (
            <div className="mt-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm font-medium text-slate-600">Registros DET generados</div>
                    <div className="text-2xl font-bold">{autoRecords.length}</div>
                    <div className="text-xs text-slate-500">{ventasCompradas.length} ventas · {comprasRegistradas.length} compras</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm font-medium text-slate-600">Débito Fiscal (Ventas)</div>
                    <div className="text-2xl font-bold text-cyan-700">{formatCurrency(autoTotals?.debitoFiscal || 0)}</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-4">
                    <div className="text-sm font-medium text-slate-600">Crédito Fiscal (Compras)</div>
                    <div className="text-2xl font-bold text-emerald-700">{formatCurrency(autoTotals?.creditoFiscal || 0)}</div>
                  </CardContent>
                </Card>
              </div>

              {sarRangesSummary && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <Card className="border-cyan-100">
                    <CardContent className="pt-4">
                      <div className="text-sm font-medium text-slate-600">CAIs configurados</div>
                      <div className="text-xl font-bold">{sarRangesSummary.caiCount}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-cyan-100">
                    <CardContent className="pt-4">
                      <div className="text-sm font-medium text-slate-600">Documentos autorizados</div>
                      <div className="text-xl font-bold">{sarRangesSummary.totalDocumentos}</div>
                    </CardContent>
                  </Card>
                  <Card className="border-cyan-100">
                    <CardContent className="pt-4">
                      <div className="text-sm font-medium text-slate-600">Rango actual</div>
                      <div className="text-sm font-bold break-words">{sarRangesSummary.rangoActual}</div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {autoRecords.length > 0 && (
                <>
                  <div className="border rounded-lg overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="text-xs">Operación</TableHead>
                          <TableHead className="text-xs">Documento</TableHead>
                          <TableHead className="text-xs">Nombre</TableHead>
                          <TableHead className="text-xs">Fecha</TableHead>
                          <TableHead className="text-xs text-right">Gravado</TableHead>
                          <TableHead className="text-xs text-right">ISV</TableHead>
                          <TableHead className="text-xs text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {autoRecords.slice(0, 15).map((record, index) => (
                          <TableRow key={`${record.numeroDocumento}-${index}`}>
                            <TableCell>
                              <Badge variant={record.tipoOperacion === 'VENTA' ? 'default' : 'secondary'}>
                                {record.tipoOperacion}
                              </Badge>
                            </TableCell>
                            <TableCell className="font-mono text-xs">{record.numeroDocumento}</TableCell>
                            <TableCell className="text-xs">{record.nombre}</TableCell>
                            <TableCell className="text-xs">{record.fecha}</TableCell>
                            <TableCell className="text-xs text-right">{formatCurrency(record.montoGravado)}</TableCell>
                            <TableCell className="text-xs text-right">{formatCurrency(record.impuesto)}</TableCell>
                            <TableCell className="text-xs text-right">{formatCurrency(record.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  {autoRecords.length > 15 && (
                    <p className="text-xs text-slate-500">Mostrando 15 de {autoRecords.length} registros generados.</p>
                  )}
                </>
              )}

              {autoRecords.length === 0 && !loadingAuto && (
                <p className="text-sm text-slate-500">
                  No se encontraron ventas ni compras con ISV (cuentas REVENUE/EXPENSE y LIABILITY ISV) en el período.
                </p>
              )}

              <div className="flex flex-wrap items-center gap-2">
                <Button variant="outline" size="sm" onClick={runSARValidation} disabled={loadingValidation}>
                  {loadingValidation ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-4 w-4 mr-2" />
                  )}
                  Validar contra rangos SAR
                </Button>
                <Button variant="outline" size="sm" onClick={handleDownloadDET} disabled={!generatedFileName}>
                  <Download className="h-4 w-4 mr-2" />
                  Descargar DET (.txt)
                </Button>
              </div>

              {completeness && completeness.errors.length > 0 && (
                <Card className="border-red-300 bg-red-50">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-5 w-5 text-red-600" />
                      <span className="font-bold text-red-800">
                        Faltan datos requeridos ({completeness.errors.length})
                      </span>
                    </div>
                    <p className="text-sm text-red-700">
                      No se generó el archivo DET. Corrija la siguiente información antes de continuar:
                    </p>
                    <ul className="space-y-1">
                      {completeness.errors.map((error, i) => (
                        <li key={i} className="text-sm text-red-700">• {error.detalle}</li>
                      ))}
                    </ul>
                    {completeness.missing.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {completeness.missing.map((label, i) => (
                          <Badge key={i} variant="outline" className="text-red-700 border-red-300">
                            {label}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {completeness && completeness.warnings.length > 0 && (
                <Card className="border-amber-200 bg-amber-50">
                  <CardContent className="pt-4 space-y-1">
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="h-5 w-5 text-amber-600" />
                      <span className="font-bold text-amber-800">
                        Advertencias de completitud (no bloquean la generación):
                      </span>
                    </div>
                    {completeness.warnings.map((warning, i) => (
                      <p key={i} className="text-sm text-amber-700">• {warning.detalle}</p>
                    ))}
                  </CardContent>
                </Card>
              )}

              {generatedFileName && (
                <Card className="border-emerald-200 bg-emerald-50">
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className="h-5 w-5 text-emerald-600" />
                      <span className="font-bold text-emerald-800">Archivo listo para el portal SAR</span>
                    </div>
                    <p className="text-sm text-emerald-800">
                      El archivo <span className="font-mono">{generatedFileName}</span> está listo para adjuntar al portal SAR.
                    </p>
                    <div className="pt-1">
                      <p className="text-sm font-semibold text-emerald-800 mb-1">Siguientes pasos</p>
                      <ol className="list-decimal ml-5 space-y-0.5 text-sm text-emerald-800">
                        <li>Abrir el portal SAR</li>
                        <li>Ingresar con usuario y contraseña</li>
                        <li>Ir al Formulario 221 (ISV)</li>
                        <li>Adjuntar el archivo DET descargado</li>
                        <li>Enviar la declaración</li>
                      </ol>
                    </div>
                  </CardContent>
                </Card>
              )}

              {sarValidation && (
                <Card className={sarValidation.ok ? "border-emerald-200 bg-emerald-50" : "border-red-200 bg-red-50"}>
                  <CardContent className="pt-4 space-y-2">
                    <div className="flex items-center space-x-2">
                      <ShieldCheck className={`h-5 w-5 ${sarValidation.ok ? "text-emerald-600" : "text-red-600"}`} />
                      <span className={`font-bold ${sarValidation.ok ? "text-emerald-800" : "text-red-800"}`}>
                        {sarValidation.ok ? "Validación SAR aprobada (sin errores)" : "Validación SAR con errores"}
                      </span>
                    </div>

                    {sarValidation.errors.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-red-800">Errores (bloquean la generación del DET):</p>
                        {sarValidation.errors.map((error, i) => (
                          <p key={i} className="text-sm text-red-700">• {error}</p>
                        ))}
                      </div>
                    )}

                    {sarValidation.warnings.length > 0 && (
                      <div className="space-y-1">
                        <p className="text-sm font-semibold text-amber-800">Advertencias (no bloquean, revise):</p>
                        {sarValidation.warnings.map((warning, i) => (
                          <p key={i} className="text-sm text-amber-700">• {warning}</p>
                        ))}
                      </div>
                    )}

                    {sarValidation.rangosUsados.length > 0 && (
                      <div className="pt-1">
                        <p className="text-sm font-semibold text-slate-700 mb-1">Rangos CAI usados:</p>
                        <div className="flex flex-wrap gap-2">
                          {sarValidation.rangosUsados.map((r) => (
                            <Badge key={r.cai} variant="outline">
                              {r.cai} · {r.inicio}-{r.fin} · correlativo {r.correlativoActual}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          )}

          {dataSource === 'manual' && (
            <p className="mt-3 text-sm text-slate-500">
              Modo manual: el formulario usa los ingresos/egresos capturados con la tasa simplificada de 15%. Active el
              modo automático para generar el DET desde las transacciones contables.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Carga SAR automática */}
      <Card className="border-slate-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center space-x-2">
            <CloudUpload className="h-5 w-5 text-indigo-600" />
            <CardTitle className="text-base">Carga SAR</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            {sarConfig?.configured && (
              <Button variant="outline" size="sm" onClick={openSarConfigForm}>
                <Pencil className="h-4 w-4 mr-1" />
                Editar config
              </Button>
            )}
            <Badge variant={sarConfig?.configured ? 'default' : 'outline'}>
              {sarConfig?.configured ? 'Configurada' : 'No configurada'}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {loadingSarConfig && (
            <p className="text-sm text-slate-500">Cargando configuración SAR...</p>
          )}

          {!loadingSarConfig && sarConfig && !sarConfig.configured && (
            <div className="border border-amber-200 bg-amber-50 rounded-lg p-4">
              <div className="flex items-center space-x-2">
                <AlertCircle className="h-5 w-5 text-amber-600" />
                <span className="font-bold text-amber-800">Carga SAR no configurada</span>
              </div>
              <p className="text-sm text-amber-800 mt-1">
                Configure el endpoint del portal SAR y sus credenciales para poder subir el DET automáticamente
                (clave cifrada AES-256-GCM).
              </p>
            </div>
          )}

          {!loadingSarConfig && sarConfig?.configured && (
            <div className="space-y-1 text-sm text-slate-700">
              <div>
                <span className="font-medium">Endpoint:</span>{' '}
                <span className="font-mono break-all">{sarConfig.endpoint}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Usuario:</span>
                <span>{sarConfig.usuario}</span>
                <Badge variant="secondary">Clave cifrada</Badge>
              </div>
              <div className="pt-2 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={testSARConnection} disabled={testingConnection}>
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wifi className="h-4 w-4 mr-2" />
                  )}
                  Probar conexión
                </Button>
                <Button variant="outline" size="sm" onClick={openSarConfigForm}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar config
                </Button>
              </div>
            </div>
          )}

          {!loadingSarConfig && sarConfig && !sarConfig.configured && (
            <Button onClick={openSarConfigForm}>
              <KeyRound className="h-4 w-4 mr-2" />
              Configurar carga SAR
            </Button>
          )}

          {showSarForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
              <div className="space-y-2">
                <Label htmlFor="sar-endpoint">Endpoint del portal SAR</Label>
                <Input
                  id="sar-endpoint"
                  type="text"
                  value={sarEndpoint}
                  onChange={(e) => setSarEndpoint(e.target.value)}
                  placeholder="https://api.sar.gob.hn/... (URL del portal o API)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sar-usuario">Usuario</Label>
                <Input
                  id="sar-usuario"
                  type="text"
                  value={sarUsuario}
                  onChange={(e) => setSarUsuario(e.target.value)}
                  placeholder="Usuario del portal SAR"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="sar-password">Contraseña</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="sar-password"
                    type={showSarPassword ? 'text' : 'password'}
                    value={sarPassword}
                    onChange={(e) => setSarPassword(e.target.value)}
                    placeholder={
                      sarConfig?.configured ? '•••••••• (dejar vacío para mantener)' : 'Contraseña del portal SAR'
                    }
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={() => setShowSarPassword((value) => !value)}
                    aria-label={showSarPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showSarPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button onClick={saveSarConfig} disabled={savingSarConfig}>
                  {savingSarConfig ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <KeyRound className="h-4 w-4 mr-2" />
                  )}
                  Guardar (cifrado)
                </Button>
                <Button variant="ghost" onClick={() => setShowSarForm(false)}>
                  Cancelar
                </Button>
              </div>
              {sarConfigMessage && (
                <div className="flex items-center gap-2">
                  <Badge
                    variant={sarConfigMessage.ok ? 'default' : 'destructive'}
                    className={sarConfigMessage.ok ? 'bg-emerald-600' : ''}
                  >
                    {sarConfigMessage.ok ? (
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                    ) : (
                      <XCircle className="h-3 w-3 mr-1" />
                    )}
                    {sarConfigMessage.text}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {connectionResult && (
            <div>
              {connectionResult.ok ? (
                <Badge className="bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conexión exitosa con el portal SAR
                </Badge>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {sarErrorLabel(connectionResult.errorHint)}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={testSARConnection} disabled={testingConnection}>
                    Reintentar
                  </Button>
                </div>
              )}
              {connectionResult.bodyPreview && (
                <p className="text-xs text-slate-500 mt-1 break-words">
                  Respuesta del portal: {connectionResult.bodyPreview}
                </p>
              )}
            </div>
          )}

          {generatedFileName && (
            <div className="border-t pt-3">
              <Button onClick={uploadDETToSAR} disabled={uploadingDet}>
                {uploadingDet ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4 mr-2" />
                )}
                {uploadingDet ? 'Subiendo DET...' : 'Subir DET al portal SAR'}
              </Button>
              {uploadResult && (
                <div className="mt-3 space-y-2">
                  {uploadResult.ok ? (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-emerald-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          DET enviado al portal SAR
                        </Badge>
                        {uploadResult.portalConfirmation && (
                          <Badge variant="secondary">Confirmación del portal detectada</Badge>
                        )}
                      </div>
                      {uploadResult.bodyPreview && (
                        <p className="text-xs text-slate-600 break-words">
                          Respuesta del portal: {uploadResult.bodyPreview}
                        </p>
                      )}
                      <Card className="border-emerald-200 bg-emerald-50">
                        <CardContent className="pt-4">
                          <p className="text-sm font-semibold text-emerald-800 mb-1">Pasos completados</p>
                          <ol className="list-decimal ml-5 space-y-0.5 text-sm text-emerald-800">
                            <li>Configuración de carga SAR guardada (clave cifrada AES-256-GCM)</li>
                            <li>DET generado y validado contra rangos SAR</li>
                            <li>DET enviado al portal SAR ({sarConfig?.endpoint})</li>
                            {uploadResult.portalConfirmation && <li>Confirmación recibida del portal</li>}
                          </ol>
                        </CardContent>
                      </Card>
                    </>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="destructive">
                        <XCircle className="h-3 w-3 mr-1" />
                        {sarErrorLabel(uploadResult.errorHint)}
                      </Badge>
                      <Button variant="outline" size="sm" onClick={uploadDETToSAR} disabled={uploadingDet}>
                        Reintentar
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-6">
        {/* SECCIÓN VENTAS */}
        <Card>
          <CardHeader className="bg-slate-50">
            <CardTitle className="text-lg">Débito Fiscal (Ventas)</CardTitle>
            <CardDescription>Agrupación según casillas del SAR</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">401 - Ventas Exentas</TableCell>
                  <TableCell className="text-right">{formatCurrency(effectiveSummary.ventas.exentas)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">402 - Exportaciones</TableCell>
                  <TableCell className="text-right">{formatCurrency(effectiveSummary.ventas.exportaciones)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">403 - Ventas Gravadas 15%</TableCell>
                  <TableCell className="text-right">{formatCurrency(effectiveSummary.ventas.gravadas15)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">404 - Ventas Gravadas 18%</TableCell>
                  <TableCell className="text-right">{formatCurrency(effectiveSummary.ventas.gravadas18)}</TableCell>
                </TableRow>
                <TableRow className="bg-cyan-50 font-bold">
                  <TableCell>TOTAL DÉBITO FISCAL</TableCell>
                  <TableCell className="text-right text-cyan-700">{formatCurrency(effectiveSummary.ventas.debitoFiscal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* SECCIÓN COMPRAS */}
        <Card>
          <CardHeader className="bg-slate-50">
            <CardTitle className="text-lg">Crédito Fiscal (Compras)</CardTitle>
            <CardDescription>Agrupación según casillas del SAR</CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <Table>
              <TableBody>
                <TableRow>
                  <TableCell className="font-medium">501 - Compras Exentas</TableCell>
                  <TableCell className="text-right">{formatCurrency(effectiveSummary.compras.exentas)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">503 - Compras Gravadas 15%</TableCell>
                  <TableCell className="text-right">{formatCurrency(effectiveSummary.compras.gravadas15)}</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell className="font-medium">504 - Compras Gravadas 18%</TableCell>
                  <TableCell className="text-right">{formatCurrency(effectiveSummary.compras.gravadas18)}</TableCell>
                </TableRow>
                <TableRow className="bg-emerald-50 font-bold">
                  <TableCell>TOTAL CRÉDITO FISCAL</TableCell>
                  <TableCell className="text-right text-emerald-700">{formatCurrency(effectiveSummary.compras.creditoFiscal)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      {/* RESULTADO LIQUIDACIÓN */}
      <Card className={impuestoAPagar >= 0 ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}>
        <CardContent className="p-6">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">
                {impuestoAPagar >= 0 ? "Impuesto Neto a Pagar" : "Saldo a Favor (Crédito)"}
              </h3>
              <p className="text-sm text-slate-600">Periodo Fiscal: {period}</p>
            </div>
            <div className="text-3xl font-black">
              {formatCurrency(Math.abs(impuestoAPagar))}
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="p-4 border rounded-lg bg-cyan-50 border-cyan-200 flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-cyan-600 mt-0.5" />
        <div className="text-sm text-cyan-800">
          <p className="font-bold">Nota para el Contador:</p>
          <p>Este resumen es preliminar. Asegúrese de que todas las facturas tengan el RTN correctamente validado y que el CAI esté vigente antes de presentar su declaración definitiva en el portal del SAR.</p>
        </div>
      </div>
    </div>
  );
}