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
  Target
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface IncomeStatementProps {
  tenantId: string;
}

interface IncomeItem {
  categoria: string;
  codigo_cuenta: string;
  nombre_cuenta: string;
  monto: number;
  empresa: string;
}

export default function IncomeStatement({ tenantId }: IncomeStatementProps) {
  const [incomeData, setIncomeData] = useState<IncomeItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    totalIngresos: 0,
    totalGastos: 0,
    utilidadBruta: 0,
    utilidadNeta: 0,
    margenUtilidad: 0
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadIncomeStatement();
  }, [tenantId]);

  const loadIncomeStatement = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await supabase.rpc('set_tenant', { tenant_id: tenantId });

      // Cargar datos del estado de resultados
      const { data, error } = await supabase
        .from('estado_resultados')
        .select('*');

      if (error) throw error;

      setIncomeData(data || []);

      // Calcular resúmenes
      const totalIngresos = data
        ?.filter(item => item.categoria === 'INGRESOS')
        ?.reduce((sum, item) => sum + item.monto, 0) || 0;

      const totalGastos = data
        ?.filter(item => item.categoria === 'GASTOS')
        ?.reduce((sum, item) => sum + item.monto, 0) || 0;

      const utilidadNeta = totalIngresos - totalGastos;
      const margenUtilidad = totalIngresos > 0 ? (utilidadNeta / totalIngresos) * 100 : 0;

      setSummary({
        totalIngresos,
        totalGastos,
        utilidadBruta: totalIngresos, // Simplificado
        utilidadNeta,
        margenUtilidad
      });
    } catch (error: any) {
      console.error("Error loading income statement:", error);
      alert("Error al cargar el estado de resultados");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Categoría', 'Código', 'Cuenta', 'Monto'];
    const rows = incomeData.map(item => [
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
    link.setAttribute('download', `estado_resultados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedData = incomeData.reduce((acc, item) => {
    if (!acc[item.categoria]) {
      acc[item.categoria] = [];
    }
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, IncomeItem[]>);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando estado de resultados...</p>
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
          <h2 className="text-2xl font-bold">Estado de Resultados</h2>
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
            <CardTitle className="text-sm font-medium">Total Ingresos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              L. {summary.totalIngresos.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Ventas y otros ingresos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Gastos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              L. {summary.totalGastos.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Costos y gastos operativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              summary.utilidadNeta >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              L. {summary.utilidadNeta.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Ingresos - Gastos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margen Utilidad</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              summary.margenUtilidad >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {summary.margenUtilidad.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">
              Utilidad / Ingresos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estado de Resultados Detallado */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de Resultados Detallado</CardTitle>
          <CardDescription>
            Desglose completo de ingresos y gastos del período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* INGRESOS */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-700">INGRESOS</h3>
              <div className="bg-green-50 rounded-lg p-4">
                {groupedData['INGRESOS']?.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-green-100 last:border-0">
                    <div>
                      <span className="font-medium">{item.codigo_cuenta}</span>
                      <span className="ml-2 text-gray-600">{item.nombre_cuenta}</span>
                    </div>
                    <span className="font-medium text-green-700">
                      L. {item.monto.toFixed(2)}
                    </span>
                  </div>
                )) || (
                  <p className="text-gray-500 italic">No hay ingresos registrados</p>
                )}
                <div className="flex justify-between pt-2 mt-2 border-t border-green-200 font-bold">
                  <span>TOTAL INGRESOS:</span>
                  <span className="text-green-700">L. {summary.totalIngresos.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* GASTOS */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-700">GASTOS</h3>
              <div className="bg-red-50 rounded-lg p-4">
                {groupedData['GASTOS']?.map((item, index) => (
                  <div key={index} className="flex justify-between py-2 border-b border-red-100 last:border-0">
                    <div>
                      <span className="font-medium">{item.codigo_cuenta}</span>
                      <span className="ml-2 text-gray-600">{item.nombre_cuenta}</span>
                    </div>
                    <span className="font-medium text-red-700">
                      L. {item.monto.toFixed(2)}
                    </span>
                  </div>
                )) || (
                  <p className="text-gray-500 italic">No hay gastos registrados</p>
                )}
                <div className="flex justify-between pt-2 mt-2 border-t border-red-200 font-bold">
                  <span>TOTAL GASTOS:</span>
                  <span className="text-red-700">L. {summary.totalGastos.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* RESUMEN DE UTILIDAD */}
            <div className="bg-gray-100 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">RESUMEN DE UTILIDAD</h3>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Total Ingresos:</span>
                  <span className="font-medium">L. {summary.totalIngresos.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Menos: Total Gastos:</span>
                  <span className="font-medium text-red-600">- L. {summary.totalGastos.toFixed(2)}</span>
                </div>
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">UTILIDAD NETA:</span>
                    <div className="flex items-center space-x-2">
                      <span className={`font-bold text-lg ${
                        summary.utilidadNeta >= 0 ? 'text-green-700' : 'text-red-700'
                      }`}>
                        L. {summary.utilidadNeta.toFixed(2)}
                      </span>
                      <Badge variant={
                        summary.utilidadNeta >= 0 ? "default" : "destructive"
                      }>
                        {summary.utilidadNeta >= 0 ? "Utilidad" : "Pérdida"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="flex justify-between pt-2">
                  <span>Margen de Utilidad:</span>
                  <span className={`font-medium ${
                    summary.margenUtilidad >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {summary.margenUtilidad.toFixed(2)}%
                  </span>
                </div>
              </div>
            </div>

            {/* Indicadores Adicionales */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm">Análisis de Rentabilidad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Rentabilidad sobre Ingresos:</span>
                      <span className={`font-medium ${
                        summary.margenUtilidad >= 0 ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {summary.margenUtilidad.toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Eficiencia Operativa:</span>
                      <span className={`font-medium ${
                        summary.totalIngresos > 0 
                          ? (summary.totalIngresos - summary.totalGastos) / summary.totalIngresos > 0.5 
                            ? 'text-green-600' 
                            : 'text-yellow-600'
                          : 'text-red-600'
                      }`}>
                        {summary.totalIngresos > 0 
                          ? ((summary.totalIngresos - summary.totalGastos) / summary.totalIngresos * 100).toFixed(1)
                          : '0.0'
                        }%
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
                    {summary.utilidadNeta < 0 && (
                      <p className="text-red-600">⚠️ Considerar reducir gastos o aumentar ingresos</p>
                    )}
                    {summary.margenUtilidad < 10 && summary.utilidadNeta > 0 && (
                      <p className="text-yellow-600">📊 Margen bajo, buscar optimización</p>
                    )}
                    {summary.margenUtilidad >= 20 && (
                      <p className="text-green-600">✅ Excelente margen de utilidad</p>
                    )}
                    {summary.totalIngresos === 0 && (
                      <p className="text-gray-600">📋 Registrar ingresos para análisis</p>
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
