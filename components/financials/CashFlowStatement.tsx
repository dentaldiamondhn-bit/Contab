"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface CashFlowStatementProps {
  tenantId: string;
}

interface CashFlowItem {
  categoria: string;
  codigo_cuenta: string;
  nombre_cuenta: string;
  monto: number;
  empresa: string;
}

export default function CashFlowStatement({ tenantId }: CashFlowStatementProps) {
  const [cashFlowData, setCashFlowData] = useState<CashFlowItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    operacion: 0,
    inversion: 0,
    financiamiento: 0,
    cambioEfectivo: 0,
    efectivoInicial: 0,
    efectivoFinal: 0
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadCashFlowStatement();
  }, [tenantId]);

  const loadCashFlowStatement = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      // Para el flujo de efectivo, necesitamos analizar las transacciones
      // por tipo de cuenta y movimiento
      const { data: transactions, error } = await supabase
        .from('libro_diario')
        .select('*');

      if (error) throw error;

      // Clasificar transacciones por tipo de flujo
      const txs = transactions as any[];
      const operacionIngresos = txs?.filter((t: any) => 
        (t.codigo_cuenta?.startsWith('1') || t.codigo_cuenta?.startsWith('5')) && t.debe > 0
      )?.reduce((sum: number, t: any) => sum + t.debe, 0) || 0;

      const operacionEgresos = txs?.filter((t: any) => 
        (t.codigo_cuenta?.startsWith('1') || t.codigo_cuenta?.startsWith('6')) && t.haber > 0
      )?.reduce((sum: number, t: any) => sum + t.haber, 0) || 0;

      const inversionSalidas = txs?.filter((t: any) => 
        t.codigo_cuenta?.startsWith('2') && t.haber > 0
      )?.reduce((sum: number, t: any) => sum + t.haber, 0) || 0;

      const inversionEntradas = txs?.filter((t: any) => 
        t.codigo_cuenta?.startsWith('2') && t.debe > 0
      )?.reduce((sum: number, t: any) => sum + t.debe, 0) || 0;

      const financiamientoEntradas = txs?.filter((t: any) => 
        t.codigo_cuenta?.startsWith('3') && t.debe > 0
      )?.reduce((sum: number, t: any) => sum + t.debe, 0) || 0;

      const financiamientoSalidas = txs?.filter((t: any) => 
        t.codigo_cuenta?.startsWith('3') && t.haber > 0
      )?.reduce((sum: number, t: any) => sum + t.haber, 0) || 0;

      const flujoOperacion = operacionIngresos - operacionEgresos;
      const flujoInversion = inversionEntradas - inversionSalidas;
      const flujoFinanciamiento = financiamientoEntradas - financiamientoSalidas;
      const cambioEfectivo = flujoOperacion + flujoInversion + flujoFinanciamiento;

      setSummary({
        operacion: flujoOperacion,
        inversion: flujoInversion,
        financiamiento: flujoFinanciamiento,
        cambioEfectivo,
        efectivoInicial: 0, // Simplificado - debería venir del período anterior
        efectivoFinal: cambioEfectivo
      });

      // Crear datos estructurados para mostrar
      const structuredData: CashFlowItem[] = [
        {
          categoria: 'OPERACIÓN',
          codigo_cuenta: '1101',
          nombre_cuenta: 'Flujo de efectivo operativo',
          monto: flujoOperacion,
          empresa: txs?.[0]?.empresa || ''
        },
        {
          categoria: 'INVERSIÓN',
          codigo_cuenta: '1201',
          nombre_cuenta: 'Flujo de efectivo de inversión',
          monto: flujoInversion,
          empresa: txs?.[0]?.empresa || ''
        },
        {
          categoria: 'FINANCIAMIENTO',
          codigo_cuenta: '2101',
          nombre_cuenta: 'Flujo de efectivo de financiamiento',
          monto: flujoFinanciamiento,
          empresa: txs?.[0]?.empresa || ''
        }
      ];

      setCashFlowData(structuredData);
    } catch (error: any) {
      console.error("Error loading cash flow statement:", error);
      alert("Error al cargar el estado de flujo de efectivo");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Categoría', 'Código', 'Cuenta', 'Monto'];
    const rows = cashFlowData.map(item => [
      item.categoria,
      item.codigo_cuenta,
      item.nombre_cuenta,
      item.monto.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `flujo_efectivo_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando estado de flujo de efectivo...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Estado de Flujo de Efectivo</h2>
          <p className="text-gray-600">Período: {new Date().toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })}</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Resumen Ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Operativo</CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              summary.operacion >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              L. {summary.operacion.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Actividades principales
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo de Inversión</CardTitle>
            <ArrowDownRight className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              summary.inversion >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              L. {summary.inversion.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Compra/venta de activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Flujo Financiamiento</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              summary.financiamiento >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              L. {summary.financiamiento.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Préstamos y capital
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cambio Neto</CardTitle>
            <DollarSign className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              summary.cambioEfectivo >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              L. {summary.cambioEfectivo.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Variación total efectivo
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estado de Flujo de Efectivo Detallado */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Flujo de Efectivo Detallado</CardTitle>
          <CardDescription>
            Análisis de entradas y salidas de efectivo por tipo de actividad
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* FLUJO DE EFECTIVO DE ACTIVIDADES DE OPERACIÓN */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-blue-700">
                Flujo de Efectivo de Actividades de Operación
              </h3>
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>Entradas de efectivo operativo:</span>
                    </div>
                    <span className="font-medium text-green-600">
                      L. {Math.abs(summary.operacion).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span>Salidas de efectivo operativo:</span>
                    </div>
                    <span className="font-medium text-red-600">
                      L. {Math.abs(summary.operacion).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Flujo neto de operación:</span>
                      <span className={`${
                        summary.operacion >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {summary.operacion >= 0 ? '+' : '-'} L. {Math.abs(summary.operacion).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FLUJO DE EFECTIVO DE ACTIVIDADES DE INVERSIÓN */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-orange-700">
                Flujo de Efectivo de Actividades de Inversión
              </h3>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <ArrowUpRight className="h-4 w-4 text-green-600" />
                      <span>Venta de activos fijos:</span>
                    </div>
                    <span className="font-medium text-green-600">
                      L. {Math.max(0, summary.inversion).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <ArrowDownRight className="h-4 w-4 text-red-600" />
                      <span>Compra de activos fijos:</span>
                    </div>
                    <span className="font-medium text-red-600">
                      L. {Math.abs(Math.min(0, summary.inversion)).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Flujo neto de inversión:</span>
                      <span className={`${
                        summary.inversion >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {summary.inversion >= 0 ? '+' : '-'} L. {Math.abs(summary.inversion).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* FLUJO DE EFECTIVO DE ACTIVIDADES DE FINANCIAMIENTO */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-purple-700">
                Flujo de Efectivo de Actividades de Financiamiento
              </h3>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span>Préstamos recibidos:</span>
                    </div>
                    <span className="font-medium text-green-600">
                      L. {Math.max(0, summary.financiamiento).toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-2">
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span>Pago de préstamos:</span>
                    </div>
                    <span className="font-medium text-red-600">
                      L. {Math.abs(Math.min(0, summary.financiamiento)).toFixed(2)}
                    </span>
                  </div>
                  <div className="border-t pt-2 mt-2">
                    <div className="flex justify-between font-bold">
                      <span>Flujo neto de financiamiento:</span>
                      <span className={`${
                        summary.financiamiento >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {summary.financiamiento >= 0 ? '+' : '-'} L. {Math.abs(summary.financiamiento).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RESUMEN DEL FLUJO DE EFECTIVO */}
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Resumen del Flujo de Efectivo</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Flujo de operación:</span>
                  <span className={`font-medium ${
                    summary.operacion >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {summary.operacion >= 0 ? '+' : '-'} L. {Math.abs(summary.operacion).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Flujo de inversión:</span>
                  <span className={`font-medium ${
                    summary.inversion >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {summary.inversion >= 0 ? '+' : '-'} L. {Math.abs(summary.inversion).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Flujo de financiamiento:</span>
                  <span className={`font-medium ${
                    summary.financiamiento >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {summary.financiamiento >= 0 ? '+' : '-'} L. {Math.abs(summary.financiamiento).toFixed(2)}
                  </span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">Aumento neto del efectivo:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold text-lg ${
                        summary.cambioEfectivo >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {summary.cambioEfectivo >= 0 ? '+' : '-'} L. {Math.abs(summary.cambioEfectivo).toFixed(2)}
                      </span>
                      <Badge variant={
                        summary.cambioEfectivo >= 0 ? "default" : "destructive"
                      }>
                        {summary.cambioEfectivo >= 0 ? "Positivo" : "Negativo"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between">
                    <span>Efectivo al inicio del período:</span>
                    <span className="font-medium">L. {summary.efectivoInicial.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Efectivo al final del período:</span>
                    <span className={`${
                      summary.efectivoFinal >= 0 ? 'text-green-700' : 'text-red-700'
                    }`}>
                      L. {summary.efectivoFinal.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Indicadores de Liquidez */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Análisis de Liquidez</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Generación de efectivo operativo:</span>
                      <span className={`font-medium ${
                        summary.operacion > 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {summary.operacion > 0 ? 'Positiva' : 'Negativa'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Inversión neta:</span>
                      <span className={`font-medium ${
                        summary.inversion < 0 ? 'text-blue-600' : 'text-gray-600'
                      }`}>
                        {summary.inversion < 0 ? 'En expansión' : 'En desinversión'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Dependencia financiera:</span>
                      <span className={`font-medium ${
                        summary.financiamiento > 0 ? 'text-orange-600' : 'text-green-600'
                      }`}>
                        {summary.financiamiento > 0 ? 'Alta' : 'Baja'}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Recomendaciones</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 text-sm">
                    {summary.operacion < 0 && (
                      <p className="text-red-600">⚠️ Mejorar flujo operativo</p>
                    )}
                    {summary.cambioEfectivo < 0 && (
                      <p className="text-orange-600">📉 Salida neta de efectivo</p>
                    )}
                    {summary.operacion > 0 && summary.cambioEfectivo > 0 && (
                      <p className="text-green-600">✅ Excelente gestión de efectivo</p>
                    )}
                    {summary.financiamiento > summary.operacion && (
                      <p className="text-yellow-600">🏦 Alta dependencia financiera</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
