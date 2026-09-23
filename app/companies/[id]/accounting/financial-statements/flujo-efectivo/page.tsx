'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  ArrowLeft, 
  Download, 
  Calendar, 
  Printer,
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  ArrowLeftRight,
  Scale,
  LineChart
} from 'lucide-react';
import {
  transformToFlujoEfectivo,
  groupFlujoItems,
  computeSourcesUses,
  computeCashProjections,
} from '@/lib/reports/cash-flow';
import type {
  FlujoItem,
  FlujoEfectivoGrouped,
  SourcesUses,
  CashProjections,
} from '@/lib/reports/cash-flow';
import CashFlowComparative from '@/components/financials/CashFlowComparative';

interface CompanyInfo {
  name: string;
  rtn: string;
  address: string;
}

export default function FlujoEfectivoPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState<'HNL' | 'USD'>('HNL');
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    name: '',
    rtn: '',
    address: ''
  });
  const [flujoData, setFlujoData] = useState<FlujoItem[]>([]);
  const [method, setMethod] = useState<'directo' | 'indirecto'>('directo');
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'prev-month' | 'prev-year'>('prev-month');

  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}`);
        if (res.ok) {
          const data = await res.json();
          setCompanyInfo({
            name: data.business_name || data.businessname || data.name || '',
            rtn: (data.business_rtn || data.businessrtn || data.rtn || '').split("-")[0].trim(),
            address: data.business_address || data.businessaddress || data.address || ''
          });
        } else {
          const lr = await fetch(`/api/companies`);
          if (lr.ok) {
            const lj = await lr.json();
            const list: any[] = lj.companies || lj || [];
            const comp = list.find((c:any)=> c.tenant_id===companyId || c.id===companyId);
            if (comp) setCompanyInfo({ name: comp.business_name || comp.name || '', rtn: (comp.business_rtn || comp.rtn || '').split("-")[0].trim(), address: comp.business_address || comp.address || '' });
          }
        }
      } catch {}
    };
    fetchCompany();
  }, [companyId]);

  // Cargar fechas iniciales
  useEffect(() => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setEndDate(today.toISOString().split('T')[0]);
    setStartDate(firstDayOfMonth.toISOString().split('T')[0]);
  }, []);

  // Cargar datos cuando cambian las fechas
  useEffect(() => {
    if (startDate && endDate) {
      loadFlujoData();
    }
  }, [startDate, endDate]);

  const loadFlujoData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/trial-balance?tenantId=${companyId}&startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`
      );
      
      if (response.ok) {
        const data = await response.json();
        const transformed = transformToFlujoEfectivo(data || []);
        setFlujoData(transformed);
      }
    } catch (error) {
      console.error('Error loading flujo data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Agrupar por secciones (implementado en lib/reports/cash-flow.ts → groupFlujoItems)
  const groupedData = useMemo((): FlujoEfectivoGrouped => groupFlujoItems(flujoData), [flujoData]);

  // Análisis de fuentes y usos de efectivo (lib/reports/cash-flow.ts → computeSourcesUses)
  const sourcesUses = useMemo((): SourcesUses => computeSourcesUses(flujoData), [flujoData]);

  // Proyección de caja por run-rate (lib/reports/cash-flow.ts → computeCashProjections)
  const projections = useMemo(
    (): CashProjections => computeCashProjections(groupedData, startDate, endDate),
    [groupedData, startDate, endDate]
  );

  // Formatear moneda
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  // Formatear fecha para mostrar
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handlePrint = () => {
    const el = document.getElementById("printable-flujo");
    if (!el) return window.print();
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(s=>s.outerHTML).join("\n");
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return window.print();
    w.document.write(`<html><head><title>Flujo de Efectivo - ${companyInfo.name}</title>${styles}<style>body{padding:24px;background:white} @media print{@page{margin:12mm} .print\\:hidden{display:none!important}}</style></head><body><div class="max-w-5xl mx-auto">${el.innerHTML}</div></body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>{ w.print(); w.close(); }, 400);
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById("printable-flujo");
    if (!el) return handlePrint();
    try {
      const { default: jsPDF } = await import("jspdf");
      const html2canvas = (await import("html2canvas")).default;
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, backgroundColor: "#ffffff" });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const imgWidth = pageWidth - 20;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      let heightLeft = imgHeight;
      let position = 10;
      pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
      heightLeft -= pdf.internal.pageSize.getHeight();
      while (heightLeft > 0) {
        position = heightLeft - imgHeight + 10;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
        heightLeft -= pdf.internal.pageSize.getHeight();
      }
      const fileName = `Flujo_Efectivo_${companyInfo.name.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`;
      pdf.save(fileName);
    } catch (e) { handlePrint(); }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm print:hidden">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/companies/${companyId}/accounting/financial-statements`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center space-x-3">
                <Wallet className="h-6 w-6 text-orange-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Estado de Flujo de Efectivo</h1>
                  <p className="text-gray-600">Período: Del {formatDate(startDate)} al {formatDate(endDate)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={handlePrint}>
                <Printer className="h-4 w-4 mr-2" />
                Imprimir
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownloadPDF}>
                <Download className="h-4 w-4 mr-2" />
                Descargar PDF
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filtros */}
        <Card className="mb-6 print:hidden">
          <CardContent className="py-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label htmlFor="startDate" className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Del
                </Label>
                <Input
                  id="startDate"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endDate" className="flex items-center">
                  <Calendar className="h-4 w-4 mr-2" />
                  Al
                </Label>
                <Input
                  id="endDate"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="method">Método</Label>
                <Select value={method} onValueChange={(v: 'directo' | 'indirecto') => setMethod(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="directo">Método Directo</SelectItem>
                    <SelectItem value="indirecto">Método Indirecto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button onClick={loadFlujoData} className="w-full">
                  Generar Flujo
                </Button>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-gray-100 pt-4">
              <Button
                variant={showComparison ? 'default' : 'outline'}
                size="sm"
                onClick={() => setShowComparison(!showComparison)}
              >
                <ArrowLeftRight className="h-4 w-4 mr-2" />
                Comparar
              </Button>
              {showComparison && (
                <div className="space-y-2 min-w-[220px]">
                  <Label htmlFor="comparisonMode" className="flex items-center">
                    <ArrowLeftRight className="h-4 w-4 mr-2" />
                    Comparar con
                  </Label>
                  <Select
                    value={comparisonMode}
                    onValueChange={(v: 'prev-month' | 'prev-year') => setComparisonMode(v)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="prev-month">Mes anterior</SelectItem>
                      <SelectItem value="prev-year">Mismo mes, año anterior</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <div id="printable-flujo">
        {/* Encabezado del Reporte */}
        <Card className="mb-6 border-2">
          <CardContent className="p-8 text-center print:p-4">
            <div className="mb-4 print:mb-2">
              <Wallet className="h-12 w-12 mx-auto text-orange-600 print:h-8 print:w-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
              {companyInfo.name}
            </h2>
            <p className="text-gray-600 mt-1">RTN: {companyInfo.rtn}</p>
            <p className="text-gray-500 text-sm">{companyInfo.address}</p>
            
            <div className="mt-6 border-t pt-4">
              <h1 className="text-3xl font-bold text-gray-900">ESTADO DE FLUJO DE EFECTIVO</h1>
              <p className="text-lg text-gray-600 mt-2">
                Del {formatDate(startDate)} al {formatDate(endDate)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                (Expresado en {currency === 'HNL' ? 'Lempiras' : 'Dólares'})
              </p>
              <p className="text-sm text-gray-500">
                Método: {method === 'directo' ? 'Directo' : 'Indirecto'}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Alerta de Burn Rate */}
        {groupedData.mesesEfectivo > 0 && groupedData.mesesEfectivo <= 3 && (
          <Card className="mb-6 bg-yellow-50 border-yellow-200">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-semibold text-yellow-800">
                    Alerta de Burn Rate
                  </p>
                  <p className="text-sm text-yellow-700">
                    A este ritmo de gasto, el efectivo se agotará en {groupedData.mesesEfectivo} meses.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* ACTIVIDADES DE OPERACIÓN */}
        <Card className="mb-4">
          <CardHeader className="bg-cyan-50 border-b">
            <CardTitle className="text-lg text-blue-900 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              1. ACTIVIDADES DE OPERACIÓN
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4">
              {groupedData.entradasOperacion > 0 && (
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">Cobros a Clientes</span>
                  <span className="font-medium text-green-600">+{formatCurrency(groupedData.entradasOperacion)}</span>
                </div>
              )}
              {groupedData.salidasOperacion > 0 && (
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">Pagos a Proveedores y Empleados</span>
                  <span className="font-medium text-red-600">({formatCurrency(groupedData.salidasOperacion)})</span>
                </div>
              )}
            </div>
            <div className="p-4 bg-cyan-100 border-t">
              <div className="flex justify-between font-bold text-blue-900">
                <span>Efectivo Neto de Operación</span>
                <div className="flex items-center space-x-2">
                  {groupedData.netoOperacion >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={groupedData.netoOperacion >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {formatCurrency(groupedData.netoOperacion)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ACTIVIDADES DE INVERSIÓN */}
        <Card className="mb-4">
          <CardHeader className="bg-purple-50 border-b">
            <CardTitle className="text-lg text-purple-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              2. ACTIVIDADES DE INVERSIÓN
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4">
              {groupedData.salidasInversion > 0 && (
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">Compra de Equipo y Mobiliario</span>
                  <span className="font-medium text-red-600">({formatCurrency(groupedData.salidasInversion)})</span>
                </div>
              )}
              {groupedData.salidasInversion === 0 && (
                <p className="text-gray-400 italic text-center py-2">No hay actividades de inversión en este período</p>
              )}
            </div>
            <div className="p-4 bg-purple-100 border-t">
              <div className="flex justify-between font-bold text-purple-900">
                <span>Efectivo Neto de Inversión</span>
                <div className="flex items-center space-x-2">
                  {groupedData.netoInversion >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={groupedData.netoInversion >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {formatCurrency(groupedData.netoInversion)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ACTIVIDADES DE FINANCIACIÓN */}
        <Card className="mb-4">
          <CardHeader className="bg-green-50 border-b">
            <CardTitle className="text-lg text-green-900 flex items-center">
              <TrendingDown className="h-5 w-5 mr-2" />
              3. ACTIVIDADES DE FINANCIACIÓN
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4">
              {groupedData.entradasFinanciacion > 0 && (
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">Préstamos Bancarios Recibidos</span>
                  <span className="font-medium text-green-600">+{formatCurrency(groupedData.entradasFinanciacion)}</span>
                </div>
              )}
              {groupedData.entradasFinanciacion === 0 && (
                <p className="text-gray-400 italic text-center py-2">No hay actividades de financiación en este período</p>
              )}
            </div>
            <div className="p-4 bg-green-100 border-t">
              <div className="flex justify-between font-bold text-green-900">
                <span>Efectivo Neto de Financiación</span>
                <div className="flex items-center space-x-2">
                  {groupedData.netoFinanciacion >= 0 ? (
                    <ArrowUpRight className="h-4 w-4 text-green-600" />
                  ) : (
                    <ArrowDownRight className="h-4 w-4 text-red-600" />
                  )}
                  <span className={groupedData.netoFinanciacion >= 0 ? 'text-green-700' : 'text-red-700'}>
                    {formatCurrency(groupedData.netoFinanciacion)}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* CONCILIACIÓN DE SALDOS */}
        <Card className="mb-6 border-2 border-gray-800">
          <CardHeader className="bg-gray-100 border-b">
            <CardTitle className="text-lg text-gray-900">CONCILIACIÓN DE SALDOS</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Saldo al inicio del período</span>
                <span className="font-medium">{formatCurrency(groupedData.saldoInicial)}</span>
              </div>
              <div className="flex justify-between font-semibold">
                <span>Aumento/Disminución neta</span>
                <span className={groupedData.netoTotal >= 0 ? 'text-green-600' : 'text-red-600'}>
                  {groupedData.netoTotal >= 0 ? '+' : ''}{formatCurrency(groupedData.netoTotal)}
                </span>
              </div>
              <div className="flex justify-between text-lg font-bold text-gray-900 pt-2 border-t">
                <span>SALDO FINAL EN BANCOS</span>
                <span>{formatCurrency(groupedData.saldoFinal)}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Ejecutivo */}
        <Card className="mb-6 bg-gradient-to-r from-orange-50 to-blue-50">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Saldo Inicial</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(groupedData.saldoInicial)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Flujo Neto</p>
                <p className={`text-xl font-bold ${groupedData.netoTotal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(groupedData.netoTotal)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Saldo Final</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(groupedData.saldoFinal)}</p>
              </div>
              <div className="text-center bg-orange-100 rounded-lg p-2">
                <p className="text-sm text-gray-600 font-semibold">Burn Rate</p>
                <p className="text-2xl font-bold text-orange-700">{groupedData.mesesEfectivo}</p>
                <p className="text-xs text-gray-600">meses de efectivo</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparativo de Períodos */}
        {showComparison && (
          <CashFlowComparative
            tenantId={companyId}
            startDate={startDate}
            endDate={endDate}
            currency={currency === 'USD' ? 'USD' : 'HNL'}
            mode={comparisonMode}
          />
        )}

        {/* Análisis de Fuentes y Usos */}
        <Card className="mb-6">
          <CardHeader className="bg-emerald-50 border-b">
            <CardTitle className="text-lg text-emerald-900 flex items-center">
              <Scale className="h-5 w-5 mr-2" />
              Análisis de Fuentes y Usos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-gray-100">
              <div className="p-4">
                <h4 className="text-sm font-semibold text-green-700 mb-2 flex items-center">
                  <ArrowUpRight className="h-4 w-4 mr-1" />
                  Fuentes de Efectivo
                </h4>
                {sourcesUses.fuentes.map((item) => (
                  <div key={`${item.code}-${item.name}`} className="flex justify-between py-1 text-sm border-b border-gray-50">
                    <span className="text-gray-600">
                      <span className="text-xs text-gray-400 mr-1">{item.code}</span>
                      {item.name}
                    </span>
                    <span className="font-medium text-green-600">+{formatCurrency(item.amount)}</span>
                  </div>
                ))}
                {sourcesUses.fuentes.length === 0 && (
                  <p className="text-gray-400 italic text-sm py-2">No hay fuentes de efectivo en este período</p>
                )}
                <div className="flex justify-between font-bold text-green-800 mt-2 pt-2 border-t border-emerald-100">
                  <span>Total Fuentes</span>
                  <span>{formatCurrency(sourcesUses.totalFuentes)}</span>
                </div>
              </div>
              <div className="p-4">
                <h4 className="text-sm font-semibold text-red-700 mb-2 flex items-center">
                  <ArrowDownRight className="h-4 w-4 mr-1" />
                  Usos de Efectivo
                </h4>
                {sourcesUses.usos.map((item) => (
                  <div key={`${item.code}-${item.name}`} className="flex justify-between py-1 text-sm border-b border-gray-50">
                    <span className="text-gray-600">
                      <span className="text-xs text-gray-400 mr-1">{item.code}</span>
                      {item.name}
                    </span>
                    <span className="font-medium text-red-600">({formatCurrency(item.amount)})</span>
                  </div>
                ))}
                {sourcesUses.usos.length === 0 && (
                  <p className="text-gray-400 italic text-sm py-2">No hay usos de efectivo en este período</p>
                )}
                <div className="flex justify-between font-bold text-red-800 mt-2 pt-2 border-t border-red-100">
                  <span>Total Usos</span>
                  <span>({formatCurrency(sourcesUses.totalUsos)})</span>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-100 border-t">
              <div className="flex justify-between font-bold text-gray-900">
                <span>Neto (Fuentes − Usos)</span>
                <span className={sourcesUses.neto >= 0 ? 'text-green-700' : 'text-red-700'}>
                  {sourcesUses.neto >= 0 ? '+' : ''}{formatCurrency(sourcesUses.neto)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proyección de Caja */}
        <Card className="mb-6">
          <CardHeader className="bg-cyan-50 border-b">
            <CardTitle className="text-lg text-cyan-900 flex items-center">
              <LineChart className="h-5 w-5 mr-2" />
              Proyección de Caja
            </CardTitle>
            <p className="text-sm text-gray-600">
              Estimación por run-rate del período actual ({projections.elapsedRatio >= 1 ? 'período completo' : `${(projections.elapsedRatio * 100).toFixed(0)}% del mes`})
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center border rounded-lg p-4 border-cyan-200">
                <p className="text-sm text-gray-600">Run-rate Mensual</p>
                <p className={`text-lg font-bold ${projections.monthly >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(projections.monthly)}
                </p>
              </div>
              <div className="text-center border rounded-lg p-4 border-cyan-200">
                <p className="text-sm text-gray-600">Run-rate Trimestral</p>
                <p className={`text-lg font-bold ${projections.quarterly >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(projections.quarterly)}
                </p>
              </div>
              <div className="text-center border rounded-lg p-4 border-cyan-200">
                <p className="text-sm text-gray-600">Run-rate Anual</p>
                <p className={`text-lg font-bold ${projections.annual >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(projections.annual)}
                </p>
              </div>
              <div className="text-center border rounded-lg p-4 border-cyan-200">
                <p className="text-sm text-gray-600">Saldo Proyectado (12 meses)</p>
                <p className={`text-lg font-bold ${projections.saldoProyectadoAnual >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(projections.saldoProyectadoAnual)}
                </p>
              </div>
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-500 border-t border-gray-100 pt-3">
              <p>
                Saldo proyectado a 1 mes:{' '}
                <span className="font-medium text-gray-700">{formatCurrency(projections.saldoProyectadoMensual)}</span>
              </p>
              <p>
                Punto de equilibrio:{' '}
                <span className="font-medium text-gray-700">
                  {projections.breakEven !== null ? formatCurrency(projections.breakEven) : 'N/A'}
                </span>
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Firmas */}
        <Card className="mt-8 print:mt-12">
          <CardHeader className="border-b">
            <CardTitle className="text-lg">Firmas de Responsabilidad</CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-8">
              <div className="text-center">
                <div className="border-b border-gray-400 pb-2 mb-2 h-12"></div>
                <p className="font-semibold text-sm">Contador General</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 pb-2 mb-2 h-12"></div>
                <p className="font-semibold text-sm">Representante Legal</p>
              </div>
              <div className="text-center">
                <div className="border-b border-gray-400 pb-2 mb-2 h-12"></div>
                <p className="font-semibold text-sm">Auditor Externo</p>
              </div>
            </div>
            <p className="text-center text-xs text-gray-400 mt-8">
              Documento generado el {new Date().toLocaleDateString('es-HN')} | Estado de Flujo de Efectivo
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
