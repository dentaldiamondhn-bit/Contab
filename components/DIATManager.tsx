'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  ArrowLeftRight,
  Building2,
  CheckCircle2,
  CloudUpload,
  Download,
  Eye,
  EyeOff,
  FileText,
  KeyRound,
  Landmark,
  Loader2,
  Pencil,
  Printer,
  RefreshCw,
  ShieldAlert,
  Wifi,
  XCircle,
} from 'lucide-react';
import { buildDiatDelta, DiatDelta } from '@/lib/services/diat-delta';

interface DiatDeclarante {
  companyId: string;
  rtn: string;
  razonSocial: string;
  domicilioFiscal: string;
  telefono: string;
  email: string;
  regimen: string;
}

interface DiatTotals {
  exentas: number;
  exentasCount: number;
  gravadas15: number;
  gravadas15Count: number;
  gravadas18: number;
  gravadas18Count: number;
  otras: number;
  otrasCount: number;
  impuesto: number;
  total: number;
}

interface DiatCaiGroup {
  cai: string;
  documents: number;
  total: number;
  impuesto: number;
  lastDate: string;
}

interface DiatVentaRecord {
  id: string;
  rtn: string;
  nombre: string;
  tipoDocumento: string;
  numeroDocumento: string;
  fecha: string;
  cai: string;
  exento: number;
  gravado: number;
  impuesto: number;
  total: number;
  anulada: boolean;
}

interface DiatCompraRecord {
  id: string;
  supplierId: string;
  supplierRtn: string;
  supplierName: string;
  invoiceNumber: string;
  invoiceDate: string;
  cai: string;
  exento: number;
  gravado: number;
  impuesto: number;
  total: number;
  purchaseType: string;
  status: string;
}

interface DiatSupplierGroup {
  supplierId: string;
  supplierRtn: string;
  supplierName: string;
  documents: number;
  exento: number;
  gravado: number;
  impuesto: number;
  total: number;
}

interface DiatResumen {
  totalFacturas: number;
  totalVentas: number;
  impuestoVentas: number;
  totalCompras: number;
  impuestoCompras: number;
  creditoFiscal: number;
  isvAPagar: number;
  operaciones: number;
}

interface DiatReport {
  companyId: string;
  period: string;
  declarante: DiatDeclarante;
  ventas: {
    totals: DiatTotals;
    byCai: DiatCaiGroup[];
    records: DiatVentaRecord[];
    source: 'libro_ventas' | 'ninguna';
  };
  compras: {
    totals: DiatTotals;
    bySupplier: DiatSupplierGroup[];
    records: DiatCompraRecord[];
    source: 'Purchase' | 'ninguna';
  };
  resumen: DiatResumen;
  generatedAt: string;
}

interface DIATManagerProps {
  companyId: string;
}

function fmt(amount: number): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount || 0);
}

type DiatSarStatus = {
  configured: boolean;
  endpoint: string;
  usuario: string;
  hasPassword: boolean;
};

type DiatUploadOutcome = {
  ok: boolean;
  status?: string;
  errorHint?: string;
  validationErrors?: { detalle: string }[];
  warnings?: { detalle: string }[];
  trackingCode?: string;
  message?: string;
  bodyPreview?: string;
  portalResponse?: unknown;
  error?: string;
};

type ClientValidation = {
  errors: string[];
  warnings: string[];
};

const csvCell = (v: any) => {
  const s = String(v ?? '');
  return /[",;\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export default function DIATManager({ companyId }: DIATManagerProps) {
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>('');
  const [report, setReport] = useState<DiatReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [comparePeriod, setComparePeriod] = useState<string>('');
  const [delta, setDelta] = useState<DiatDelta | null>(null);
  const [deltaLoading, setDeltaLoading] = useState(false);
  const [deltaError, setDeltaError] = useState<string | null>(null);

  const [sarStatus, setSarStatus] = useState<DiatSarStatus | null>(null);
  const [loadingSar, setLoadingSar] = useState(false);
  const [showSarForm, setShowSarForm] = useState(false);
  const [sarEndpoint, setSarEndpoint] = useState('');
  const [sarUsuario, setSarUsuario] = useState('');
  const [sarPassword, setSarPassword] = useState('');
  const [showSarPassword, setShowSarPassword] = useState(false);
  const [savingSar, setSavingSar] = useState(false);
  const [sarMessage, setSarMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionResult, setConnectionResult] = useState<{
    ok: boolean;
    errorHint?: string;
    bodyPreview?: string;
  } | null>(null);
  const [uploadingDiat, setUploadingDiat] = useState(false);
  const [uploadResult, setUploadResult] = useState<DiatUploadOutcome | null>(null);

  const loadPeriods = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/diat?companyId=${encodeURIComponent(companyId)}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error || 'No se pudo cargar la información');
        setLoading(false);
        return;
      }
      const periods: string[] = json.data?.availablePeriods || [];
      setAvailablePeriods(periods);
      if (!selectedPeriod && periods.length > 0) {
        setSelectedPeriod(periods[0]);
      } else if (periods.length === 0 && !selectedPeriod) {
        setSelectedPeriod('2026-09');
      }
      setLoading(false);
    } catch {
      setError('Error de red al obtener los períodos');
      setLoading(false);
    }
  }, [companyId]);

  const loadReport = useCallback(
    async (period: string) => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/diat?companyId=${encodeURIComponent(companyId)}&period=${encodeURIComponent(period)}`
        );
        const json = await res.json();
        if (!res.ok || !json.success) {
          setError(json.error || 'No se pudo generar el reporte');
          setLoading(false);
          return;
        }
        setReport(json.data?.report || null);
        setAvailablePeriods(json.data?.availablePeriods || availablePeriods);
        setLoading(false);
      } catch {
        setError('Error de red al generar el reporte');
        setLoading(false);
      }
    },
    [companyId, availablePeriods]
  );

  useEffect(() => {
    loadPeriods();
  }, [loadPeriods]);

  useEffect(() => {
    if (selectedPeriod) {
      loadReport(selectedPeriod);
    }
  }, [selectedPeriod]);

  const downloadCsv = () => {
    if (!report) return;
    const lines: string[] = [];
    lines.push('DIAT - Declaracion Informativa de Actividades');
    lines.push(`RTN: ${csvCell(report.declarante.rtn)}`);
    lines.push(`Razon Social: ${csvCell(report.declarante.razonSocial)}`);
    lines.push(`Domicilio: ${csvCell(report.declarante.domicilioFiscal)}`);
    lines.push(`Periodo: ${csvCell(report.period)}`);
    lines.push(`Generado: ${csvCell(report.generatedAt)}`);
    lines.push('');
    lines.push('RESUMEN');
    lines.push('Concepto,Monto');
    lines.push(`Total Ventas,${csvCell(report.resumen.totalVentas.toFixed(2))}`);
    lines.push(`ISV Debito Fiscal,${csvCell(report.resumen.impuestoVentas.toFixed(2))}`);
    lines.push(`Total Compras,${csvCell(report.resumen.totalCompras.toFixed(2))}`);
    lines.push(`Credito Fiscal,${csvCell(report.resumen.creditoFiscal.toFixed(2))}`);
    lines.push(`ISV a Pagar,${csvCell(report.resumen.isvAPagar.toFixed(2))}`);
    lines.push('');
    lines.push('VENTAS (Libro de Ventas)');
    lines.push('RTN,Nombre,TipoDoc,Numero,Fecha,CAI,Exento,Gravado,ISV,Total,Anulada');
    report.ventas.records.forEach((r) => {
      lines.push([r.rtn, r.nombre, r.tipoDocumento, r.numeroDocumento, r.fecha, r.cai, r.exento, r.gravado, r.impuesto, r.total, r.anulada ? 'SI' : 'NO'].map(csvCell).join(','));
    });
    lines.push('');
    lines.push('COMPRAS (Registro de Compras)');
    lines.push('Proveedor RTN,Proveedor,Factura,Fecha,CAI,Exento,Gravado,ISV,Total,Tipo,Estado');
    report.compras.records.forEach((r) => {
      lines.push([r.supplierRtn, r.supplierName, r.invoiceNumber, r.invoiceDate, r.cai, r.exento, r.gravado, r.impuesto, r.total, r.purchaseType, r.status].map(csvCell).join(','));
    });

    const blob = new Blob([lines.join('\r\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `DIAT_${companyId}_${report.period}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadDelta = async () => {
    if (!selectedPeriod || !comparePeriod || selectedPeriod === comparePeriod) {
      setDeltaError('Seleccione dos períodos diferentes para comparar.');
      return;
    }
    setDeltaLoading(true);
    setDeltaError(null);
    try {
      const res = await fetch(
        `/api/diat/variations?companyId=${encodeURIComponent(companyId)}&from=${encodeURIComponent(comparePeriod)}&to=${encodeURIComponent(selectedPeriod)}`
      );
      const json = await res.json();
      if (!res.ok || !json.success) {
        setDeltaError(json.error || 'No se pudo comparar');
        setDelta(null);
      } else {
        const v = json.data.variations;
        setDelta(buildDiatDelta(v.from, v.to, v.fromResumen, v.toResumen));
      }
    } catch {
      setDeltaError('Error de red al comparar');
      setDelta(null);
    }
    setDeltaLoading(false);
  };

  const printReport = () => {
    const content = document.getElementById('diat-content');
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      window.print();
      return;
    }
    printWindow.document.write(`
      <html>
        <head>
          <title>DIAT ${report?.period || ''}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            h1 { font-size: 18px; margin: 0 0 4px; }
            h2 { font-size: 15px; margin: 20px 0 8px; border-bottom: 2px solid #0e7490; padding-bottom: 4px; }
            .head-info { font-size: 12px; color: #444; margin-bottom: 16px; }
            table { width: 100%; border-collapse: collapse; font-size: 12px; margin-bottom: 12px; }
            th, td { border: 1px solid #ccc; padding: 4px 6px; text-align: right; }
            th { background: #f1f5f9; }
            td:first-child, th:first-child { text-align: left; }
            .total-row { font-weight: bold; background: #ecfeff; }
            .kpi-row { display: flex; gap: 16px; margin: 12px 0; }
            .kpi { border: 1px solid #ddd; padding: 8px 12px; flex: 1; }
            .kpi .lbl { font-size: 10px; text-transform: uppercase; color: #666; }
            .kpi .val { font-size: 16px; font-weight: bold; }
          </style>
        </head>
        <body>${content.innerHTML}</body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
  };

  const loadSarStatus = useCallback(async () => {
    if (!companyId) return;
    setLoadingSar(true);
    try {
      const res = await fetch('/api/accounting/diat-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: companyId, action: 'get-config' }),
      });
      const data = await res.json();
      if (data && data.configured) {
        setSarStatus({
          configured: true,
          endpoint: data.endpoint || '',
          usuario: data.usuario || '',
          hasPassword: !!data.hasPassword,
        });
      } else {
        setSarStatus({ configured: false, endpoint: '', usuario: '', hasPassword: false });
      }
    } catch {
      setSarStatus({ configured: false, endpoint: '', usuario: '', hasPassword: false });
    } finally {
      setLoadingSar(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadSarStatus();
  }, [loadSarStatus]);

  const openSarConfigForm = () => {
    setSarEndpoint(sarStatus?.endpoint || '');
    setSarUsuario(sarStatus?.usuario || '');
    setSarPassword('');
    setSarMessage(null);
    setConnectionResult(null);
    setShowSarForm(true);
  };

  const saveSarConfig = async () => {
    if (!companyId) return;
    if (!sarEndpoint.trim() || !sarUsuario.trim()) {
      setSarMessage({ ok: false, text: 'El endpoint y el usuario del portal SAR son obligatorios.' });
      return;
    }
    setSavingSar(true);
    try {
      const res = await fetch('/api/accounting/diat-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: companyId,
          action: 'save-config',
          endpoint: sarEndpoint.trim(),
          usuario: sarUsuario.trim(),
          password: sarPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        setSarMessage({ ok: false, text: data?.error || 'No se pudo guardar la configuración SAR.' });
        return;
      }
      setSarStatus({
        configured: true,
        endpoint: sarEndpoint.trim(),
        usuario: sarUsuario.trim(),
        hasPassword: true,
      });
      setSarMessage({ ok: true, text: 'Config guardada (clave cifrada AES-256-GCM).' });
      setShowSarForm(false);
    } catch {
      setSarMessage({ ok: false, text: 'Error de red al guardar la configuración SAR.' });
    } finally {
      setSavingSar(false);
    }
  };

  const testSarConnection = async () => {
    if (!companyId) return;
    setTestingConnection(true);
    setConnectionResult(null);
    try {
      const res = await fetch('/api/accounting/diat-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: companyId, action: 'test' }),
      });
      const data = await res.json();
      setConnectionResult({ ok: !!data?.ok, errorHint: data?.status, bodyPreview: data?.bodyPreview });
    } catch {
      setConnectionResult({ ok: false, errorHint: 'RED' });
    } finally {
      setTestingConnection(false);
    }
  };

  const validateReportOnClient = (r: DiatReport | null): ClientValidation => {
    const errors: string[] = [];
    const warnings: string[] = [];
    if (!r) {
      return { errors: ['No hay datos DIAT cargados para validar.'], warnings };
    }
    if (!r.declarante.rtn.trim()) errors.push('Falta el RTN del declarante.');
    if (!r.declarante.razonSocial.trim()) errors.push('Falta la razón social del declarante.');
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.period)) {
      errors.push('El período del DIAT no es válido (formato esperado YYYY-MM).');
    }
    if (r.resumen.operaciones === 0) {
      errors.push('No hay operaciones (ventas o compras) registradas para el período.');
    }
    r.ventas.records.forEach((venta, index) => {
      if (venta.total <= 0) return;
      if (!venta.nombre.trim()) errors.push(`Venta ${index + 1}: falta el nombre del cliente.`);
      if (!venta.fecha.trim()) {
        errors.push(`Venta ${index + 1} (${venta.nombre || 'sin nombre'}): falta la fecha del documento.`);
      }
      if (!venta.numeroDocumento.trim()) {
        errors.push(`Venta ${index + 1} (${venta.nombre || 'sin nombre'}): falta el número del documento.`);
      }
      if (!venta.tipoDocumento.trim()) {
        warnings.push(`Venta ${index + 1}: falta el tipo de documento (se enviará como FACT).`);
      }
    });
    r.compras.records.forEach((compra, index) => {
      if (compra.total <= 0) return;
      if (!compra.supplierName.trim()) errors.push(`Compra ${index + 1}: falta el nombre del proveedor.`);
      if (!compra.invoiceDate.trim()) {
        errors.push(`Compra ${index + 1} (${compra.supplierName || 'sin nombre'}): falta la fecha de la factura.`);
      }
      if (!compra.invoiceNumber.trim()) {
        errors.push(`Compra ${index + 1} (${compra.supplierName || 'sin nombre'}): falta el número de la factura.`);
      }
    });
    if (r.resumen.isvAPagar === 0) {
      warnings.push('El ISV a pagar del período es cero; verifique antes de enviar.');
    }
    return { errors, warnings };
  };

  const uploadDiatToPortal = async () => {
    if (!companyId || !report || uploadingDiat) return;
    setUploadingDiat(true);
    setUploadResult(null);
    try {
      const res = await fetch('/api/accounting/diat-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId: companyId, period: report.period }),
      });
      const data = await res.json();
      setUploadResult(data as DiatUploadOutcome);
    } catch {
      setUploadResult({
        ok: false,
        status: 'RED',
        errorHint: 'RED',
        error: 'No se pudo conectar con el portal SAR (problema de red o tiempo de espera agotado).',
      });
    } finally {
      setUploadingDiat(false);
    }
  };

  const sarErrorLabel = (status: string | undefined) => {
    switch (status) {
      case 'CREDENCIALES':
        return 'Credenciales inválidas';
      case 'RED':
        return 'Error de red, reinténtalo';
      case 'PORTAL':
        return 'Portal no disponible';
      case 'CONFIG':
        return 'Configuración incompleta';
      case 'INCOMPLETO':
        return 'Faltan datos requeridos para el envío';
      default:
        return 'No se pudo completar la operación.';
    }
  };

  const clientValidation = report ? validateReportOnClient(report) : { errors: [], warnings: [] };

  const isvAPagar = report?.resumen.isvAPagar ?? 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center space-x-2">
          <Landmark className="h-6 w-6 text-cyan-600" />
          <div>
            <h1 className="text-2xl font-bold">DIAT</h1>
            <p className="text-sm text-muted-foreground">
              Declaración Informativa de Actividades ({companyId})
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Período" />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.length === 0 && <SelectItem value="2026-09">2026-09</SelectItem>}
              {availablePeriods.map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadPeriods} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
          <Button variant="outline" size="sm" onClick={downloadCsv} disabled={!report}>
            <Download className="h-4 w-4 mr-2" />
            CSV
          </Button>
          <Button variant="outline" size="sm" onClick={printReport} disabled={!report}>
            <Printer className="h-4 w-4 mr-2" />
            Imprimir
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!report}
            onClick={() =>
              window.open(
                `/api/documents/pdf?type=diat&id=${encodeURIComponent(companyId)}&companyId=${encodeURIComponent(companyId)}&period=${encodeURIComponent(selectedPeriod)}`,
                '_blank',
              )
            }
          >
            <FileText className="h-4 w-4 mr-2" />
            PDF
          </Button>
          <Select value={comparePeriod} onValueChange={setComparePeriod}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="vs..." />
            </SelectTrigger>
            <SelectContent>
              {availablePeriods.filter((p) => p !== selectedPeriod).map((p) => (
                <SelectItem key={p} value={p}>
                  {p}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={loadDelta} disabled={!report || !comparePeriod || deltaLoading}>
            <ArrowLeftRight className="h-4 w-4 mr-2" />
            Comparar
          </Button>
        </div>
      </div>

      <Card className="border-cyan-200">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <div className="flex items-center space-x-2">
            <KeyRound className="h-5 w-5 text-cyan-600" />
            <CardTitle className="text-base">Conexión al portal SAR</CardTitle>
          </div>
          <Badge
            variant={sarStatus?.configured ? 'default' : 'outline'}
            className={
              sarStatus?.configured
                ? 'bg-emerald-600 text-xs max-w-[280px] overflow-hidden text-ellipsis whitespace-nowrap'
                : 'text-xs'
            }
          >
            {sarStatus?.configured ? `Conectado - ${sarStatus.endpoint}` : 'No configurada'}
          </Badge>
        </CardHeader>
        <CardContent className="pt-0 space-y-4">
          {loadingSar && <p className="text-sm text-slate-500">Cargando configuración SAR...</p>}

          {!loadingSar && sarStatus && !sarStatus.configured && (
            <Alert className="border-amber-200 bg-amber-50 text-amber-800">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-amber-900">Sin conexión al portal SAR configurada</AlertTitle>
              <AlertDescription>
                Configure el endpoint del portal SAR y sus credenciales para subir el DIAT (clave
                cifrada AES-256-GCM).
              </AlertDescription>
            </Alert>
          )}

          {!loadingSar && sarStatus?.configured && (
            <div className="space-y-1 text-sm text-slate-700">
              <div>
                <span className="font-medium">Endpoint:</span>{' '}
                <span className="font-mono break-all">{sarStatus.endpoint}</span>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Usuario:</span>
                <span>{sarStatus.usuario}</span>
                <Badge variant="secondary">Clave cifrada AES-256-GCM</Badge>
              </div>
              <div className="pt-2 flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={testSarConnection} disabled={testingConnection}>
                  {testingConnection ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Wifi className="h-4 w-4 mr-2" />
                  )}
                  Probar conexión
                </Button>
                <Button variant="outline" size="sm" onClick={openSarConfigForm}>
                  <Pencil className="h-4 w-4 mr-2" />
                  Editar
                </Button>
              </div>
            </div>
          )}

          {!loadingSar && sarStatus && !sarStatus.configured && (
            <Button onClick={openSarConfigForm}>
              <KeyRound className="h-4 w-4 mr-2" />
              Conectar al portal SAR
            </Button>
          )}

          {showSarForm && (
            <div className="border rounded-lg p-4 space-y-3 bg-slate-50">
              <div className="space-y-2">
                <Label htmlFor="diat-sar-endpoint">Endpoint del portal SAR</Label>
                <Input
                  id="diat-sar-endpoint"
                  type="text"
                  value={sarEndpoint}
                  onChange={(e) => setSarEndpoint(e.target.value)}
                  placeholder="https://api.sar.gob.hn/... (URL del portal o API)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diat-sar-usuario">Usuario</Label>
                <Input
                  id="diat-sar-usuario"
                  type="text"
                  value={sarUsuario}
                  onChange={(e) => setSarUsuario(e.target.value)}
                  placeholder="Usuario del portal SAR"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="diat-sar-password">Contraseña</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="diat-sar-password"
                    type={showSarPassword ? 'text' : 'password'}
                    value={sarPassword}
                    onChange={(e) => setSarPassword(e.target.value)}
                    placeholder={
                      sarStatus?.configured
                        ? '•••••••• (dejar vacío para mantener)'
                        : 'Contraseña del portal SAR'
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
                <Button onClick={saveSarConfig} disabled={savingSar}>
                  {savingSar ? (
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
              <div>
                <Badge variant="outline" className="text-[11px]">
                  Clave cifrada AES-256-GCM
                </Badge>
              </div>
              {sarMessage && (
                <Badge
                  variant={sarMessage.ok ? 'default' : 'destructive'}
                  className={sarMessage.ok ? 'bg-emerald-600' : ''}
                >
                  {sarMessage.text}
                </Badge>
              )}
            </div>
          )}

          {connectionResult && (
            <div>
              {connectionResult.ok ? (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className="bg-emerald-600">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Conexión exitosa con el portal SAR
                  </Badge>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive">
                    {sarErrorLabel(connectionResult.errorHint)}
                  </Badge>
                  <Button variant="outline" size="sm" onClick={testSarConnection} disabled={testingConnection}>
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

          <div className="border-t pt-3 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                onClick={uploadDiatToPortal}
                disabled={uploadingDiat || !report || clientValidation.errors.length > 0}
              >
                {uploadingDiat ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <CloudUpload className="h-4 w-4 mr-2" />
                )}
                {uploadingDiat ? 'Subiendo DIAT...' : 'Subir DIAT al portal SAR'}
              </Button>
              {sarStatus?.configured && (
                <Badge className="bg-emerald-600">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Conexión SAR configurada
                </Badge>
              )}
            </div>

            {!uploadingDiat && report && clientValidation.errors.length > 0 && (
              <Alert variant="destructive">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle>Faltan datos requeridos ({clientValidation.errors.length})</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc ml-5 space-y-0.5">
                    {clientValidation.errors.map((detalle, index) => (
                      <li key={index}>{detalle}</li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs">El DIAT no se envió al portal SAR.</p>
                </AlertDescription>
              </Alert>
            )}

            {!uploadingDiat &&
              report &&
              clientValidation.errors.length === 0 &&
              clientValidation.warnings.length > 0 && (
                <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                  <ShieldAlert className="h-4 w-4 text-amber-600" />
                  <AlertTitle className="text-amber-900">Advertencias de completitud</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc ml-5 space-y-0.5">
                      {clientValidation.warnings.map((detalle, index) => (
                        <li key={index}>{detalle}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">Puedes enviar igualmente.</p>
                  </AlertDescription>
                </Alert>
              )}

            {uploadResult &&
              !uploadResult.ok &&
              uploadResult.validationErrors &&
              uploadResult.validationErrors.length > 0 && (
                <Alert variant="destructive">
                  <ShieldAlert className="h-4 w-4" />
                  <AlertTitle>Faltan datos requeridos ({uploadResult.validationErrors.length})</AlertTitle>
                  <AlertDescription>
                    <ul className="list-disc ml-5 space-y-0.5">
                      {uploadResult.validationErrors.map((err, index) => (
                        <li key={index}>{err.detalle}</li>
                      ))}
                    </ul>
                    <p className="mt-2 text-xs">El DIAT no se envió al portal SAR.</p>
                  </AlertDescription>
                </Alert>
              )}

            {uploadResult &&
              !uploadResult.ok &&
              (!uploadResult.validationErrors || uploadResult.validationErrors.length === 0) && (
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="destructive">
                    <XCircle className="h-3 w-3 mr-1" />
                    {uploadResult.error || sarErrorLabel(uploadResult.status)}
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={uploadDiatToPortal}
                    disabled={uploadingDiat || clientValidation.errors.length > 0}
                  >
                    Reintentar
                  </Button>
                </div>
              )}

            {uploadResult?.ok && uploadResult.warnings && uploadResult.warnings.length > 0 && (
              <Alert className="border-amber-200 bg-amber-50 text-amber-800">
                <ShieldAlert className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-900">DIAT enviado al portal SAR con advertencias</AlertTitle>
                <AlertDescription>
                  <ul className="list-disc ml-5 space-y-0.5">
                    {uploadResult.warnings.map((w, index) => (
                      <li key={index}>{w.detalle}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {uploadResult?.ok && (!uploadResult.warnings || uploadResult.warnings.length === 0) && (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-800">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <AlertTitle className="text-emerald-900">DIAT enviado al portal SAR</AlertTitle>
                <AlertDescription>
                  <div className="flex flex-wrap items-center gap-2 mt-1">
                    <Badge className="bg-emerald-600">Enviado</Badge>
                    {uploadResult.trackingCode && (
                      <Badge variant="secondary">Código de seguimiento: {uploadResult.trackingCode}</Badge>
                    )}
                    {uploadResult.portalResponse && (
                      <Badge variant="secondary">Confirmación del portal detectada</Badge>
                    )}
                  </div>
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

      {deltaError && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{deltaError}</AlertDescription>
        </Alert>
      )}

      {delta && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              Comparativo {delta.from} vs {delta.to}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Métrica</TableHead>
                  <TableHead className="text-right">{delta.from}</TableHead>
                  <TableHead className="text-right">{delta.to}</TableHead>
                  <TableHead className="text-right">Variación</TableHead>
                  <TableHead className="text-right">Var. %</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {delta.metrics.map((m) => (
                  <TableRow key={m.key}>
                    <TableCell className="font-medium">{m.label}</TableCell>
                    <TableCell className="text-right">{fmt(m.from)}</TableCell>
                    <TableCell className="text-right">{fmt(m.to)}</TableCell>
                    <TableCell className={`text-right font-medium ${m.varAbs < 0 ? 'text-red-600' : m.varAbs > 0 ? 'text-green-600' : ''}`}>
                      {fmt(m.varAbs)}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {m.varPct === null ? 's/p' : `${m.varPct}%`}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {error && (
        <Alert variant="destructive">
          <ShieldAlert className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {loading && !report && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Generando reporte DIAT...</CardContent>
        </Card>
      )}

      {report && (
        <div id="diat-content" className="space-y-6">
          {/* Identificación del declarante */}
          <Card>
            <CardHeader className="bg-slate-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Building2 className="h-5 w-5 text-cyan-600" />
                Identificación del Declarante
              </CardTitle>
              <CardDescription>Período fiscal: {report.period}</CardDescription>
            </CardHeader>
            <CardContent className="pt-4 grid md:grid-cols-2 gap-x-8 gap-y-2 text-sm">
              <div><span className="text-muted-foreground">Razón Social:</span> <strong>{report.declarante.razonSocial}</strong></div>
              <div><span className="text-muted-foreground">RTN:</span> <strong>{report.declarante.rtn || '—'}</strong></div>
              <div><span className="text-muted-foreground">Domicilio Fiscal:</span> {report.declarante.domicilioFiscal || '—'}</div>
              <div><span className="text-muted-foreground">Teléfono:</span> {report.declarante.telefono || '—'}</div>
              <div><span className="text-muted-foreground">Correo:</span> {report.declarante.email || '—'}</div>
              <div><span className="text-muted-foreground">Régimen:</span> {report.declarante.regimen}</div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <Card className="bg-cyan-50">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Total Ventas</div>
                <div className="text-xl font-bold text-cyan-700">{fmt(report.resumen.totalVentas)}</div>
                <div className="text-xs text-muted-foreground">{report.resumen.totalFacturas} documentos</div>
              </CardContent>
            </Card>
            <Card className="bg-sky-50">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">ISV Débito (Ventas)</div>
                <div className="text-xl font-bold text-sky-700">{fmt(report.resumen.impuestoVentas)}</div>
              </CardContent>
            </Card>
            <Card className="bg-emerald-50">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Total Compras</div>
                <div className="text-xl font-bold text-emerald-700">{fmt(report.resumen.totalCompras)}</div>
                <div className="text-xs text-muted-foreground">{report.compras.records.filter((c) => c.status !== 'CANCELLED').length} facturas</div>
              </CardContent>
            </Card>
            <Card className="bg-green-50">
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">Crédito Fiscal</div>
                <div className="text-xl font-bold text-green-700">{fmt(report.resumen.creditoFiscal)}</div>
              </CardContent>
            </Card>
            <Card className={isvAPagar >= 0 ? 'bg-amber-50' : 'bg-red-50'}>
              <CardContent className="p-4">
                <div className="text-xs text-muted-foreground uppercase">ISV a Pagar</div>
                <div className={`text-xl font-bold ${isvAPagar >= 0 ? 'text-amber-700' : 'text-red-700'}`}>{fmt(isvAPagar)}</div>
              </CardContent>
            </Card>
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            {/* VENTAS */}
            <Card>
              <CardHeader className="bg-slate-50">
                <CardTitle className="text-lg">Ventas del Período</CardTitle>
                <CardDescription>
                  Libro de Ventas {report.ventas.source === 'ninguna' && <Badge variant="secondary">Sin registros</Badge>}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Exentas</TableCell><TableCell className="text-right">{fmt(report.ventas.totals.exentas)}</TableCell></TableRow>
                    <TableRow><TableCell>Gravadas 15%</TableCell><TableCell className="text-right">{fmt(report.ventas.totals.gravadas15)}</TableCell></TableRow>
                    <TableRow><TableCell>Gravadas 18%</TableCell><TableCell className="text-right">{fmt(report.ventas.totals.gravadas18)}</TableCell></TableRow>
                    <TableRow><TableCell>Otras</TableCell><TableCell className="text-right">{fmt(report.ventas.totals.otras)}</TableCell></TableRow>
                    <TableRow className="font-medium"><TableCell>ISV Débito Fiscal</TableCell><TableCell className="text-right text-cyan-700">{fmt(report.ventas.totals.impuesto)}</TableCell></TableRow>
                    <TableRow className="bg-cyan-50 font-bold"><TableCell>TOTAL VENTAS</TableCell><TableCell className="text-right text-cyan-700">{fmt(report.ventas.totals.total)}</TableCell></TableRow>
                  </TableBody>
                </Table>

                {report.ventas.byCai.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold">Agrupación por CAI</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>CAI</TableHead>
                          <TableHead className="text-right">Docs</TableHead>
                          <TableHead className="text-right">ISV</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.ventas.byCai.map((g) => (
                          <TableRow key={g.cai}>
                            <TableCell className="font-mono text-xs">{g.cai}</TableCell>
                            <TableCell className="text-right">{g.documents}</TableCell>
                            <TableCell className="text-right">{fmt(g.impuesto)}</TableCell>
                            <TableCell className="text-right">{fmt(g.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>

            {/* COMPRAS */}
            <Card>
              <CardHeader className="bg-slate-50">
                <CardTitle className="text-lg">Compras del Período</CardTitle>
                <CardDescription>
                  Registro de Compras {report.compras.source === 'ninguna' && <Badge variant="secondary">Sin registros</Badge>}
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Concepto</TableHead>
                      <TableHead className="text-right">Monto</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow><TableCell>Exentas</TableCell><TableCell className="text-right">{fmt(report.compras.totals.exentas)}</TableCell></TableRow>
                    <TableRow><TableCell>Gravadas 15%</TableCell><TableCell className="text-right">{fmt(report.compras.totals.gravadas15)}</TableCell></TableRow>
                    <TableRow><TableCell>Gravadas 18%</TableCell><TableCell className="text-right">{fmt(report.compras.totals.gravadas18)}</TableCell></TableRow>
                    <TableRow><TableCell>Otras</TableCell><TableCell className="text-right">{fmt(report.compras.totals.otras)}</TableCell></TableRow>
                    <TableRow className="font-medium"><TableCell>ISV Crédito Fiscal</TableCell><TableCell className="text-right text-emerald-700">{fmt(report.compras.totals.impuesto)}</TableCell></TableRow>
                    <TableRow className="bg-emerald-50 font-bold"><TableCell>TOTAL COMPRAS</TableCell><TableCell className="text-right text-emerald-700">{fmt(report.compras.totals.total)}</TableCell></TableRow>
                  </TableBody>
                </Table>

                {report.compras.bySupplier.length > 0 && (
                  <>
                    <h3 className="text-sm font-semibold">Total por Proveedor</h3>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Proveedor</TableHead>
                          <TableHead className="text-right">Docs</TableHead>
                          <TableHead className="text-right">Crédito</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {report.compras.bySupplier.map((g) => (
                          <TableRow key={g.supplierId || g.supplierName}>
                            <TableCell>
                              {g.supplierName}
                              {g.supplierRtn && <div className="text-xs text-muted-foreground font-mono">{g.supplierRtn}</div>}
                            </TableCell>
                            <TableCell className="text-right">{g.documents}</TableCell>
                            <TableCell className="text-right">{fmt(g.impuesto)}</TableCell>
                            <TableCell className="text-right">{fmt(g.total)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Liquidación */}
          <Card className={isvAPagar >= 0 ? 'border-amber-200 bg-amber-50' : 'border-emerald-200 bg-emerald-50'}>
            <CardContent className="p-6 flex flex-wrap justify-between items-center gap-4">
              <div>
                <h3 className="text-xl font-bold">
                  {isvAPagar >= 0 ? 'Impuesto Neto a Pagar' : 'Saldo a Favor (Crédito)'}
                </h3>
                <p className="text-sm text-slate-600">
                  Débito Fiscal {fmt(report.resumen.impuestoVentas)} − Crédito Fiscal {fmt(report.resumen.creditoFiscal)} · Período {report.period}
                </p>
              </div>
              <div className="text-3xl font-black">{fmt(Math.abs(isvAPagar))}</div>
            </CardContent>
          </Card>

          <Alert variant="default" className="border-cyan-200 bg-cyan-50">
            <FileText className="h-4 w-4 text-cyan-600" />
            <AlertDescription className="text-cyan-800 text-sm">
              Reporte informativo generado el {new Date(report.generatedAt).toLocaleString('es-HN')}. Fuentes: Libro de Ventas (libro_ventas) y Registro de Compras (Purchase).
            </AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  );
}