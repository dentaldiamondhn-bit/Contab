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
  Wallet,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

interface FlujoItem {
  code: string;
  name: string;
  amount: number;
  type: 'operacion' | 'inversion' | 'financiacion';
  category: string;
}

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
  const [companyInfo] = useState<CompanyInfo>({
    name: 'Clínica Dental Diamond',
    rtn: '08011999012345',
    address: 'Colonia Palmira, Tegucigalpa, Honduras'
  });
  const [flujoData, setFlujoData] = useState<FlujoItem[]>([]);
  const [method, setMethod] = useState<'directo' | 'indirecto'>('directo');

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
        `/api/accounting/trial-balance?startDate=${startDate}T00:00:00Z&endDate=${endDate}T23:59:59Z`
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

  // Transformar datos del trial balance a estructura de Flujo de Efectivo
  const transformToFlujoEfectivo = (data: any[]): FlujoItem[] => {
    return data.map((item: any) => {
      const account = item.account || {};
      const code = account.code || item.code || '';
      const name = account.name || item.name || 'Sin nombre';
      const balance = parseFloat(item.balance || 0);
      
      // Clasificar por tipo según código para flujo de efectivo
      let type: FlujoItem['type'];
      let category: string;
      
      // Detectar si es una cuenta de caja/bancos (1101, 1102, etc.)
      const isCashAccount = code.startsWith('110');
      
      if (isCashAccount) {
        // Cuentas de efectivo - no se incluyen en el flujo, solo para conciliación
        return null;
      } else if (code.startsWith('4')) {
        // Ingresos (4xxx) - Operación
        type = 'operacion';
        category = 'Cobros a Clientes';
      } else if (code.startsWith('5')) {
        // Costos (5xxx) - Operación
        type = 'operacion';
        category = 'Pagos a Proveedores';
      } else if (code.startsWith('6')) {
        // Gastos (6xxx) - Operación
        type = 'operacion';
        category = 'Gastos Operativos';
      } else if (code.startsWith('11') && !code.startsWith('110')) {
        // Otros activos corrientes (11xx excepto 110x) - Operación
        type = 'operacion';
        category = 'Cuentas por Cobrar';
      } else if (code.startsWith('12')) {
        // Activos no corrientes (12xx) - Inversión
        type = 'inversion';
        category = 'Propiedad, Planta y Equipo';
      } else if (code.startsWith('21')) {
        // Pasivos corrientes (21xx) - Operación
        type = 'operacion';
        category = 'Cuentas por Pagar';
      } else if (code.startsWith('22')) {
        // Pasivos no corrientes (22xx) - Financiación
        type = 'financiacion';
        category = 'Préstamos a Largo Plazo';
      } else if (code.startsWith('3')) {
        // Patrimonio (3xxx) - Financiación
        type = 'financiacion';
        category = 'Capital Social';
      } else {
        // Por defecto, operación
        type = 'operacion';
        category = 'Otros';
      }
      
      return {
        code,
        name,
        amount: Math.abs(balance),
        type,
        category
      };
    }).filter(item => item !== null) as FlujoItem[];
  };

  // Agrupar por secciones
  const groupedData = useMemo(() => {
    const operacion = flujoData.filter(i => i.type === 'operacion');
    const inversion = flujoData.filter(i => i.type === 'inversion');
    const financiacion = flujoData.filter(i => i.type === 'financiacion');
    
    // Para método directo, necesitamos identificar entradas vs salidas
    // Simplificación: ingresos son entradas, costos/gastos son salidas
    const entradasOperacion = operacion.filter(i => i.code.startsWith('4')).reduce((sum, i) => sum + i.amount, 0);
    const salidasOperacion = operacion.filter(i => i.code.startsWith('5') || i.code.startsWith('6')).reduce((sum, i) => sum + i.amount, 0);
    const netoOperacion = entradasOperacion - salidasOperacion;
    
    const entradasInversion = 0; // Venta de activos (no hay datos)
    const salidasInversion = inversion.reduce((sum, i) => sum + i.amount, 0);
    const netoInversion = entradasInversion - salidasInversion;
    
    const entradasFinanciacion = financiacion.filter(i => i.code.startsWith('22') || i.code.startsWith('3')).reduce((sum, i) => sum + i.amount, 0);
    const salidasFinanciacion = 0; // Pagos de capital (no hay datos)
    const netoFinanciacion = entradasFinanciacion - salidasFinanciacion;
    
    const netoTotal = netoOperacion + netoInversion + netoFinanciacion;
    
    // Simular saldo inicial y final
    const saldoInicial = 5000; // Valor simulado
    const saldoFinal = saldoInicial + netoTotal;
    
    // Burn rate (gastos mensuales)
    const burnRate = salidasOperacion;
    const mesesEfectivo = burnRate > 0 ? Math.floor(saldoFinal / burnRate) : 0;
    
    return {
      operacion,
      inversion,
      financiacion,
      entradasOperacion,
      salidasOperacion,
      netoOperacion,
      entradasInversion,
      salidasInversion,
      netoInversion,
      entradasFinanciacion,
      salidasFinanciacion,
      netoFinanciacion,
      netoTotal,
      saldoInicial,
      saldoFinal,
      burnRate,
      mesesEfectivo
    };
  }, [flujoData]);

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
          </CardContent>
        </Card>

        {/* Encabezado del Reporte */}
        <Card className="mb-6 border-2">
          <CardContent className="p-8 text-center">
            <div className="mb-4">
              <Wallet className="h-12 w-12 mx-auto text-orange-600" />
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
          <CardHeader className="bg-blue-50 border-b">
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
            <div className="p-4 bg-blue-100 border-t">
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
  );
}
