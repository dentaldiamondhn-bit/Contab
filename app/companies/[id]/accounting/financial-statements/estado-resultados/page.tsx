'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
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
  Building2,
  Printer,
  TrendingUp,
  TrendingDown,
  Calculator,
  PieChart,
  Percent,
  ArrowRightLeft,
  Sparkles,
  Target,
  LineChart
} from 'lucide-react';
import {
  transformToEstadoResultados,
  groupResultadoItems,
  computeCategoryMargins,
  computeMarginSummary,
  computeProjections,
} from '@/lib/reports/income-statement';
import type { ResultadoItem, CompanyInfo } from '@/lib/reports/income-statement';
import IncomeStatementComparative from '@/components/financials/IncomeStatementComparative';

export default function EstadoResultadosPage() {
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
  const [resultadoData, setResultadoData] = useState<ResultadoItem[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [comparisonMode, setComparisonMode] = useState<'prev-month' | 'prev-year'>('prev-month');

  // Cargar datos de la empresa
  useEffect(() => {
    const fetchCompany = async () => {
      try {
        const response = await fetch(`/api/companies/${companyId}`);
        if (response.ok) {
          const data = await response.json();
          setCompanyInfo({
            name: data.business_name || data.businessname || data.name || data.businessName || '',
            rtn: (data.business_rtn || data.businessrtn || data.rtn || data.businessRTN || '').split("-")[0].trim(),
            address: data.business_address || data.businessaddress || data.address || data.businessAddress || ''
          });
        } else {
          try {
            const lr = await fetch(`/api/companies`);
            if (lr.ok) {
              const lj = await lr.json();
              const list: any[] = lj.companies || lj || [];
              const comp = list.find((c:any)=> c.tenant_id===companyId || c.id===companyId);
              if (comp) setCompanyInfo({ name: comp.business_name || comp.name || '', rtn: comp.business_rtn || comp.rtn || '', address: comp.business_address || comp.address || '' });
            }
          } catch {}
        }
      } catch (error) {
        console.error('Error loading company info:', error);
      }
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
      loadResultadoData();
    }
  }, [startDate, endDate]);

  const loadResultadoData = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/accounting/trial-balance?tenantId=${companyId}&startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`
      );
      
      if (response.ok) {
        const data = await response.json();
        const transformed = transformToEstadoResultados(data || []);
        setResultadoData(transformed);
      }
    } catch (error) {
      console.error('Error loading resultado data:', error);
    } finally {
      setLoading(false);
    }
  };

  // (implementado en lib/reports/income-statement.ts → transformToEstadoResultados)

  // Agrupar por categorías
  const groupedData = useMemo(() => groupResultadoItems(resultadoData), [resultadoData]);

  // Márgenes por categoría
  const categoryMargins = useMemo(
    () => ({
      costos: computeCategoryMargins(groupedData.costos, groupedData.totalIngresos),
      gastos: computeCategoryMargins(groupedData.gastos, groupedData.totalIngresos),
    }),
    [groupedData]
  );

  const marginSummary = useMemo(() => computeMarginSummary(groupedData), [groupedData]);

  const projections = useMemo(
    () => computeProjections(groupedData, startDate, endDate),
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

  // Calcular porcentajes sobre ventas
  const getPercentageOfSales = (amount: number) => {
    if (groupedData.totalIngresos === 0) return 0;
    return (amount / groupedData.totalIngresos) * 100;
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

  // Exportar a PDF/Print — solo estado, con formatos
  const handlePrint = () => {
    const el = document.getElementById("printable-resultados");
    if (!el) return window.print();
    const styles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style')).map(s=>s.outerHTML).join("\n");
    const w = window.open("", "_blank", "width=900,height=700");
    if (!w) return window.print();
    w.document.write(`<html><head><title>Estado de Resultados - ${companyInfo.name}</title>${styles}<style>body{padding:24px;color:#111;background:white} @media print{@page{margin:12mm} .print\\:hidden{display:none!important}}</style></head><body><div class="max-w-5xl mx-auto">${el.innerHTML}</div></body></html>`);
    w.document.close(); w.focus(); setTimeout(()=>{ w.print(); w.close(); }, 400);
  };

  const handleDownloadPDF = async () => {
    const el = document.getElementById("printable-resultados");
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
      const fileName = `Estado_Resultados_${companyInfo.name.replace(/\s+/g,"_")}_${new Date().toISOString().slice(0,10)}.pdf`;
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
                <TrendingUp className="h-6 w-6 text-green-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Estado de Resultados</h1>
                  <p className="text-gray-600">Período: Del {formatDate(startDate)} al {formatDate(endDate)}</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button variant="outline" size="sm" onClick={() => setShowComparison(!showComparison)}>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Comparar
              </Button>
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
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                <Label htmlFor="currency">Moneda</Label>
                <Select value={currency} onValueChange={(v: 'HNL' | 'USD') => setCurrency(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HNL">Lempiras (HNL)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {showComparison && (
                <div className="space-y-2">
                  <Label htmlFor="comparisonMode">Comparar con</Label>
                  <Select value={comparisonMode} onValueChange={(v: 'prev-month' | 'prev-year') => setComparisonMode(v)}>
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
              <div className="flex items-end">
                <Button onClick={loadResultadoData} className="w-full">
                  Generar Estado
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <div id="printable-resultados">
        {/* Encabezado del Reporte */}
        <Card className="mb-6 border-2">
          <CardContent className="p-8 text-center print:p-4">
            <div className="mb-4 print:mb-2">
              <Building2 className="h-12 w-12 mx-auto text-green-600 print:h-8 print:w-8" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 uppercase tracking-wide">
              {companyInfo.name}
            </h2>
            <p className="text-gray-600 mt-1">RTN: {companyInfo.rtn}</p>
            <p className="text-gray-500 text-sm">{companyInfo.address}</p>
            
            <div className="mt-6 border-t pt-4">
              <h1 className="text-3xl font-bold text-gray-900">ESTADO DE RESULTADOS</h1>
              <p className="text-lg text-gray-600 mt-2">
                Del {formatDate(startDate)} al {formatDate(endDate)}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                (Expresado en {currency === 'HNL' ? 'Lempiras' : 'Dólares'})
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Resumen Ejecutivo */}
        <Card className="mb-6 bg-gradient-to-r from-green-50 to-blue-50">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-600">Ventas Totales</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(groupedData.totalIngresos)}</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Utilidad Bruta</p>
                <p className={`text-xl font-bold ${groupedData.utilidadBruta >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(groupedData.utilidadBruta)}
                </p>
                <p className="text-xs text-gray-500">{getPercentageOfSales(groupedData.utilidadBruta).toFixed(1)}% margen</p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600">Utilidad de Operación</p>
                <p className={`text-xl font-bold ${groupedData.utilidadOperacion >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(groupedData.utilidadOperacion)}
                </p>
              </div>
              <div className="text-center bg-green-100 rounded-lg p-2">
                <p className="text-sm text-gray-600 font-semibold">UTILIDAD NETA</p>
                <p className={`text-2xl font-bold ${groupedData.utilidadNeta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(groupedData.utilidadNeta)}
                </p>
                <p className="text-xs text-gray-600">{getPercentageOfSales(groupedData.utilidadNeta).toFixed(1)}% de ventas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Comparativo de Períodos */}
        {showComparison && (
          <IncomeStatementComparative
            tenantId={companyId}
            startDate={startDate}
            endDate={endDate}
            currency={currency}
            mode={comparisonMode}
          />
        )}

        {/* INGRESOS OPERACIONALES */}
        <Card className="mb-4">
          <CardHeader className="bg-green-50 border-b">
            <CardTitle className="text-lg text-green-900 flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              INGRESOS OPERACIONALES
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4">
              {groupedData.ingresos.map((item, index) => (
                <div key={index} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">{item.name}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-400">{getPercentageOfSales(Math.abs(item.amount)).toFixed(1)}%</span>
                    <span className="font-medium text-green-600">+{formatCurrency(Math.abs(item.amount))}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="p-4 bg-green-100 border-t">
              <div className="flex justify-between font-bold text-green-900">
                <span>TOTAL INGRESOS</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">100.0%</span>
                  <span className="text-lg">{formatCurrency(groupedData.totalIngresos)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* COSTO DE VENTAS */}
        <Card className="mb-4">
          <CardHeader className="bg-red-50 border-b">
            <CardTitle className="text-lg text-red-900 flex items-center">
              <TrendingDown className="h-5 w-5 mr-2" />
              COSTO DE VENTAS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4">
              {groupedData.costos.map((item, index) => (
                <div key={index} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">{item.name}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-400">{getPercentageOfSales(Math.abs(item.amount)).toFixed(1)}%</span>
                    <span className="font-medium text-red-600">-{formatCurrency(Math.abs(item.amount))}</span>
                  </div>
                </div>
              ))}
              {groupedData.costos.length === 0 && (
                <p className="text-gray-400 italic text-center py-2">No hay costos registrados en este período</p>
              )}
            </div>
            <div className="p-4 bg-red-100 border-t">
              <div className="flex justify-between font-bold text-red-900">
                <span>TOTAL COSTOS</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">{getPercentageOfSales(groupedData.totalCostos).toFixed(1)}%</span>
                  <span className="text-lg">({formatCurrency(groupedData.totalCostos)})</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UTILIDAD BRUTA */}
        <Card className={`mb-6 ${groupedData.utilidadBruta >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">UTILIDAD BRUTA</h3>
                <p className="text-sm text-gray-600">Margen Inicial (Ingresos - Costos)</p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${groupedData.utilidadBruta >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {formatCurrency(groupedData.utilidadBruta)}
                </p>
                <p className="text-sm text-gray-600">
                  {getPercentageOfSales(groupedData.utilidadBruta).toFixed(1)}% margen bruto
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GASTOS OPERATIVOS */}
        <Card className="mb-4">
          <CardHeader className="bg-orange-50 border-b">
            <CardTitle className="text-lg text-orange-900 flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              GASTOS OPERATIVOS
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="p-4">
              {groupedData.gastos.map((item, index) => (
                <div key={index} className="flex justify-between py-1 text-sm">
                  <span className="text-gray-600 pl-4">{item.name}</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-xs text-gray-400">{getPercentageOfSales(Math.abs(item.amount)).toFixed(1)}%</span>
                    <span className="font-medium text-orange-600">-{formatCurrency(Math.abs(item.amount))}</span>
                  </div>
                </div>
              ))}
              {groupedData.gastos.length === 0 && (
                <p className="text-gray-400 italic text-center py-2">No hay gastos registrados en este período</p>
              )}
            </div>
            <div className="p-4 bg-orange-100 border-t">
              <div className="flex justify-between font-bold text-orange-900">
                <span>TOTAL GASTOS OPERATIVOS</span>
                <div className="flex items-center space-x-4">
                  <span className="text-sm">{getPercentageOfSales(groupedData.totalGastos).toFixed(1)}%</span>
                  <span className="text-lg">({formatCurrency(groupedData.totalGastos)})</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* UTILIDAD DE OPERACIÓN */}
        <Card className={`mb-6 ${groupedData.utilidadOperacion >= 0 ? 'bg-purple-50 border-purple-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">UTILIDAD DE OPERACIÓN</h3>
                <p className="text-sm text-gray-600">EBITDA / UAIL (Ganancia real del negocio)</p>
              </div>
              <div className="text-right">
                <p className={`text-3xl font-bold ${groupedData.utilidadOperacion >= 0 ? 'text-purple-700' : 'text-red-700'}`}>
                  {formatCurrency(groupedData.utilidadOperacion)}
                </p>
                <p className="text-sm text-gray-600">
                  {getPercentageOfSales(groupedData.utilidadOperacion).toFixed(1)}% de ventas
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* GASTOS/INGRESOS NO OPERACIONALES */}
        <Card className="mb-4">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg text-gray-700 flex items-center">
              <Percent className="h-5 w-5 mr-2" />
              GASTOS/INGRESOS NO OPERACIONALES
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-gray-400 italic text-center">
              Intereses bancarios, diferencias cambiarias, comisiones (No registrados en este período)
            </p>
          </CardContent>
        </Card>

        {/* UTILIDAD ANTES DE IMPUESTOS */}
        <Card className={`mb-6 ${groupedData.utilidadAntesImpuestos >= 0 ? 'bg-indigo-50 border-indigo-200' : 'bg-red-50 border-red-200'}`}>
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-xl font-bold text-gray-900">UTILIDAD ANTES DE IMPUESTOS</h3>
                <p className="text-sm text-gray-600">Base Imponible (ISR)</p>
              </div>
              <div className="text-right">
                <p className={`text-2xl font-bold ${groupedData.utilidadAntesImpuestos >= 0 ? 'text-indigo-700' : 'text-red-700'}`}>
                  {formatCurrency(groupedData.utilidadAntesImpuestos)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* IMPUESTO ISR 25% */}
        {groupedData.isr > 0 && (
          <Card className="mb-4 bg-red-50">
            <CardContent className="p-4">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold text-red-900">IMPUESTO Sobre la Renta (ISR)</h3>
                  <p className="text-sm text-red-600">25% de la utilidad (Honduras)</p>
                </div>
                <div className="text-right">
                  <p className="text-xl font-bold text-red-700">({formatCurrency(groupedData.isr)})</p>
                  <p className="text-xs text-red-600">Provisión tributaria</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* UTILIDAD NETA */}
        <Card className={`mb-8 border-2 ${groupedData.utilidadNeta >= 0 ? 'border-green-400 bg-green-50' : 'border-red-400 bg-red-50'}`}>
          <CardContent className="p-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-2xl font-bold text-gray-900">UTILIDAD NETA DEL EJERCICIO</h3>
                <p className="text-sm text-gray-600">Resultado Final (Para reinversión o distribución)</p>
              </div>
              <div className="text-right">
                <p className={`text-4xl font-bold ${groupedData.utilidadNeta >= 0 ? 'text-green-700' : 'text-red-700'}`}>
                  {formatCurrency(groupedData.utilidadNeta)}
                </p>
                <p className="text-sm text-gray-600 mt-1">
                  {getPercentageOfSales(groupedData.utilidadNeta).toFixed(1)}% de rentabilidad neta
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Análisis de Márgenes por Categoría */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Análisis de Márgenes por Categoría
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
              <div className="text-center border rounded-lg p-3">
                <p className="text-xs text-gray-500">Margen Bruto</p>
                <p className={`text-xl font-bold ${marginSummary.margenBruto >= 0 ? 'text-blue-700' : 'text-red-600'}`}>
                  {marginSummary.margenBruto.toFixed(1)}%
                </p>
              </div>
              <div className="text-center border rounded-lg p-3">
                <p className="text-xs text-gray-500">Margen Operativo</p>
                <p className={`text-xl font-bold ${marginSummary.margenOperativo >= 0 ? 'text-purple-700' : 'text-red-600'}`}>
                  {marginSummary.margenOperativo.toFixed(1)}%
                </p>
              </div>
              <div className="text-center border rounded-lg p-3">
                <p className="text-xs text-gray-500">Margen Neto</p>
                <p className={`text-xl font-bold ${marginSummary.margenNeto >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {marginSummary.margenNeto.toFixed(1)}%
                </p>
              </div>
              <div className="text-center border rounded-lg p-3">
                <p className="text-xs text-gray-500">Costo sobre Ventas</p>
                <p className="text-xl font-bold text-red-700">{marginSummary.costosSobreVentas.toFixed(1)}%</p>
              </div>
              <div className="text-center border rounded-lg p-3">
                <p className="text-xs text-gray-500">Gastos sobre Ventas</p>
                <p className="text-xl font-bold text-orange-700">{marginSummary.gastosSobreVentas.toFixed(1)}%</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="text-sm font-semibold text-red-800 mb-2">Costos por Categoría</h4>
                <div className="space-y-2">
                  {(categoryMargins.costos.length > 0 ? categoryMargins.costos : []).map((cat) => (
                    <div key={cat.code} className="flex items-center">
                      <div className="w-28 text-sm text-gray-600 truncate">
                        <span className="text-xs text-gray-400 mr-1">{cat.code}</span>
                        {cat.name}
                      </div>
                      <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-red-500 rounded-full"
                            style={{ width: `${Math.min(100, cat.percentOfSales)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-28 text-right text-sm font-medium">{cat.percentOfSales.toFixed(1)}%</div>
                    </div>
                  ))}
                  {categoryMargins.costos.length === 0 && (
                    <p className="text-gray-400 italic text-sm">No hay costos registrados</p>
                  )}
                </div>
              </div>
              <div>
                <h4 className="text-sm font-semibold text-orange-800 mb-2">Gastos por Categoría</h4>
                <div className="space-y-2">
                  {(categoryMargins.gastos.length > 0 ? categoryMargins.gastos : []).map((cat) => (
                    <div key={cat.code} className="flex items-center">
                      <div className="w-28 text-sm text-gray-600 truncate">
                        <span className="text-xs text-gray-400 mr-1">{cat.code}</span>
                        {cat.name}
                      </div>
                      <div className="flex-1 mx-2">
                        <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-orange-500 rounded-full"
                            style={{ width: `${Math.min(100, cat.percentOfSales)}%` }}
                          ></div>
                        </div>
                      </div>
                      <div className="w-28 text-right text-sm font-medium">{cat.percentOfSales.toFixed(1)}%</div>
                    </div>
                  ))}
                  {categoryMargins.gastos.length === 0 && (
                    <p className="text-gray-400 italic text-sm">No hay gastos registrados</p>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Proyecciones */}
        <Card className="mb-6">
          <CardHeader className="bg-cyan-50 border-b">
            <CardTitle className="text-lg text-cyan-900 flex items-center">
              <LineChart className="h-5 w-5 mr-2" />
              Proyecciones
            </CardTitle>
            <p className="text-sm text-gray-600">
              Estimación por run-rate del período actual ({projections.elapsedRatio >= 1 ? 'período completo' : `${(projections.elapsedRatio * 100).toFixed(0)}% del mes`})
            </p>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center border rounded-lg p-4 border-cyan-200">
                <Sparkles className="h-5 w-5 mx-auto text-cyan-600 mb-1" />
                <p className="text-sm text-gray-600">Proyección Mensual</p>
                <p className={`text-lg font-bold ${projections.monthly >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(projections.monthly)}
                </p>
              </div>
              <div className="text-center border rounded-lg p-4 border-cyan-200">
                <Sparkles className="h-5 w-5 mx-auto text-cyan-600 mb-1" />
                <p className="text-sm text-gray-600">Proyección Trimestral</p>
                <p className={`text-lg font-bold ${projections.quarterly >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(projections.quarterly)}
                </p>
              </div>
              <div className="text-center border rounded-lg p-4 border-cyan-200">
                <Sparkles className="h-5 w-5 mx-auto text-cyan-600 mb-1" />
                <p className="text-sm text-gray-600">Proyección Anual</p>
                <p className={`text-lg font-bold ${projections.annual >= 0 ? 'text-green-700' : 'text-red-600'}`}>
                  {formatCurrency(projections.annual)}
                </p>
              </div>
              <div className="text-center border rounded-lg p-4 border-cyan-200">
                <Target className="h-5 w-5 mx-auto text-cyan-600 mb-1" />
                <p className="text-sm text-gray-600">Punto de Equilibrio</p>
                <p className="text-lg font-bold text-cyan-700">
                  {projections.breakEven !== null ? formatCurrency(projections.breakEven) : 'N/A'}
                </p>
                <p className="text-xs text-gray-500 mt-1">Ventas mínimas para cubrir gastos</p>
              </div>
            </div>
            {groupedData.totalGastos > 0 && projections.breakEven !== null && (
              <div className="mt-4">
                <p className="text-sm text-gray-600 mb-1">Distancia de ventas actuales al punto de equilibrio:</p>
                <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${groupedData.totalIngresos >= projections.breakEven ? 'bg-green-500' : 'bg-amber-500'}`}
                    style={{ width: `${Math.min(100, (groupedData.totalIngresos / (projections.breakEven || 1)) * 100)}%` }}
                  ></div>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Ventas actuales: {formatCurrency(groupedData.totalIngresos)} | Punto de equilibrio: {formatCurrency(projections.breakEven)}
                </p>
              </div>
            )}
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
              Documento generado el {new Date().toLocaleDateString('es-HN')} | Estado de Resultados
            </p>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
