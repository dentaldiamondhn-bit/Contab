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
  ArrowRightLeft
} from 'lucide-react';

interface ResultadoItem {
  code: string;
  name: string;
  amount: number;
  type: 'ingreso' | 'costo' | 'gasto' | 'otro';
}

interface CompanyInfo {
  name: string;
  rtn: string;
  address: string;
}

export default function EstadoResultadosPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [currency, setCurrency] = useState<'HNL' | 'USD'>('HNL');
  const [companyInfo] = useState<CompanyInfo>({
    name: 'Clínica Dental Diamond',
    rtn: '08011999012345',
    address: 'Colonia Palmira, Tegucigalpa, Honduras'
  });
  const [resultadoData, setResultadoData] = useState<ResultadoItem[]>([]);
  const [showComparison, setShowComparison] = useState(false);
  const [previousPeriodData, setPreviousPeriodData] = useState<ResultadoItem[]>([]);

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
        `/api/accounting/trial-balance?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`
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

  // Transformar datos del trial balance a estructura de Estado de Resultados
  const transformToEstadoResultados = (data: any[]): ResultadoItem[] => {
    return data.map((item: any) => {
      const account = item.account || {};
      const code = account.code || item.code || '';
      const name = account.name || item.name || 'Sin nombre';
      const balance = parseFloat(item.balance || 0);
      
      // Clasificar por tipo según código
      let type: ResultadoItem['type'];
      const firstDigit = code.charAt(0);
      const secondDigit = code.charAt(1);
      
      if (firstDigit === '4') {
        // Ingresos (4xxx)
        type = 'ingreso';
      } else if (firstDigit === '5') {
        // Costos (5xxx)
        type = 'costo';
      } else if (firstDigit === '6') {
        // Gastos (6xxx)
        type = 'gasto';
      } else {
        type = 'otro';
      }
      
      return {
        code,
        name,
        amount: balance, // Usamos el balance directo (ya viene con signo de la API)
        type
      };
    }).filter(item => 
      item.type === 'ingreso' || 
      item.type === 'costo' || 
      item.type === 'gasto'
    ).sort((a, b) => a.code.localeCompare(b.code));
  };

  // Agrupar por categorías
  const groupedData = useMemo(() => {
    const ingresos = resultadoData.filter(i => i.type === 'ingreso');
    const costos = resultadoData.filter(i => i.type === 'costo');
    const gastos = resultadoData.filter(i => i.type === 'gasto');
    
    const totalIngresos = ingresos.reduce((sum, i) => sum + Math.abs(i.amount), 0);
    const totalCostos = costos.reduce((sum, i) => sum + Math.abs(i.amount), 0);
    const totalGastos = gastos.reduce((sum, i) => sum + Math.abs(i.amount), 0);
    
    // Cálculos jerárquicos
    const utilidadBruta = totalIngresos - totalCostos;
    const utilidadOperacion = utilidadBruta - totalGastos;
    const utilidadAntesImpuestos = utilidadOperacion; // Asumiendo no hay otros ingresos/gastos
    const isr = utilidadAntesImpuestos > 0 ? utilidadAntesImpuestos * 0.25 : 0;
    const utilidadNeta = utilidadAntesImpuestos - isr;
    
    return {
      ingresos,
      costos,
      gastos,
      totalIngresos,
      totalCostos,
      totalGastos,
      utilidadBruta,
      utilidadOperacion,
      utilidadAntesImpuestos,
      isr,
      utilidadNeta
    };
  }, [resultadoData]);

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

  // Exportar a PDF/Print
  const handlePrint = () => {
    window.print();
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
              <div className="flex items-end">
                <Button onClick={loadResultadoData} className="w-full">
                  Generar Estado
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Encabezado del Reporte */}
        <Card className="mb-6 border-2">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <Building2 className="h-12 w-12 mx-auto text-green-600" />
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

        {/* Gráfica de Gastos (Placeholder) */}
        <Card className="mb-6">
          <CardHeader className="bg-gray-50 border-b">
            <CardTitle className="text-lg flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Análisis de Gastos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {groupedData.gastos.length > 0 ? (
              <div className="space-y-2">
                {groupedData.gastos.slice(0, 5).map((gasto, index) => (
                  <div key={index} className="flex items-center">
                    <div className="w-32 text-sm text-gray-600 truncate">{gasto.name}</div>
                    <div className="flex-1 mx-2">
                      <div className="h-4 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-orange-500 rounded-full"
                          style={{ width: `${getPercentageOfSales(Math.abs(gasto.amount))}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-24 text-right text-sm font-medium">
                      {getPercentageOfSales(Math.abs(gasto.amount)).toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center">No hay datos suficientes para el análisis</p>
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
  );
}
