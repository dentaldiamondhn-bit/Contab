'use client';

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FileText, Download, Printer, RefreshCw, Building2, Landmark, ShieldAlert, ArrowLeftRight } from 'lucide-react';
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