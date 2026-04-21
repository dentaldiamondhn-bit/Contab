"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Download,
  TrendingUp,
  TrendingDown,
  DollarSign
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface BalanceSheetProps {
  tenantId: string;
}

interface BalanceItem {
  categoria: string;
  codigo_cuenta: string;
  nombre_cuenta: string;
  saldo: number;
  empresa: string;
}

export default function BalanceSheet({ tenantId }: BalanceSheetProps) {
  const [balanceData, setBalanceData] = useState<BalanceItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState({
    activosCorrientes: 0,
    activosNoCorrientes: 0,
    totalActivos: 0,
    pasivosCorrientes: 0,
    patrimonio: 0,
    totalPasivosPatrimonio: 0
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadBalanceSheet();
  }, [tenantId]);

  const loadBalanceSheet = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      // Cargar datos del balance general
      const { data, error } = await supabase
        .from('balance_general')
        .select('*');

      if (error) throw error;

      setBalanceData(data || []);

      // Calcular resúmenes
      const dataItems = data as any[];
      const activosCorrientes = dataItems
        ?.filter(item => item.categoria === 'ACTIVO CORRIENTE')
        ?.reduce((sum, item) => sum + item.saldo, 0) || 0;

      const activosNoCorrientes = dataItems
        ?.filter(item => item.categoria === 'ACTIVO NO CORRIENTE')
        ?.reduce((sum, item) => sum + item.saldo, 0) || 0;

      const pasivosCorrientes = dataItems
        ?.filter(item => item.categoria === 'PASIVO CORRIENTE')
        ?.reduce((sum, item) => sum + item.saldo, 0) || 0;

      const patrimonio = dataItems
        ?.filter(item => item.categoria === 'PATRIMONIO')
        ?.reduce((sum, item) => sum + item.saldo, 0) || 0;

      const totalActivos = activosCorrientes + activosNoCorrientes;
      const totalPasivosPatrimonio = pasivosCorrientes + patrimonio;

      setSummary({
        activosCorrientes,
        activosNoCorrientes,
        totalActivos,
        pasivosCorrientes,
        patrimonio,
        totalPasivosPatrimonio
      });
    } catch (error: any) {
      console.error("Error loading balance sheet:", error);
      alert("Error al cargar el balance general");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Categoría', 'Código', 'Cuenta', 'Saldo'];
    const rows = balanceData.map(item => [
      item.categoria,
      item.codigo_cuenta,
      item.nombre_cuenta,
      item.saldo.toFixed(2)
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `balance_general_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const groupedData = balanceData.reduce((acc, item) => {
    if (!acc[item.categoria]) {
      acc[item.categoria] = [];
    }
    acc[item.categoria].push(item);
    return acc;
  }, {} as Record<string, BalanceItem[]>);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando balance general...</p>
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
          <h2 className="text-2xl font-bold">Balance General</h2>
          <p className="text-gray-600">Estado financiero al {new Date().toLocaleDateString('es-HN')}</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-4 w-4 mr-2" />
          Exportar CSV
        </Button>
      </div>

      {/* Resumen Ejecutivo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Activos</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              L. {summary.totalActivos.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Corrientes: L. {summary.activosCorrientes.toFixed(2)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Pasivos</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              L. {summary.pasivosCorrientes.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Corrientes y no corrientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Patrimonio</CardTitle>
            <DollarSign className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              L. {summary.patrimonio.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Capital y utilidades
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Balance General Detallado */}
      <Card>
        <CardHeader>
          <CardTitle>Balance General Detallado</CardTitle>
          <CardDescription>
            Desglose completo de activos, pasivos y patrimonio
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* ACTIVOS */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-green-700">ACTIVOS</h3>
              
              {/* Activos Corrientes */}
              <div className="mb-4">
                <h4 className="font-medium text-green-600 mb-2">Activos Corrientes</h4>
                <div className="bg-green-50 rounded-lg p-4">
                  {groupedData['ACTIVO CORRIENTE']?.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-green-100 last:border-0">
                      <div>
                        <span className="font-medium">{item.codigo_cuenta}</span>
                        <span className="ml-2 text-gray-600">{item.nombre_cuenta}</span>
                      </div>
                      <span className="font-medium text-green-700">
                        L. {item.saldo.toFixed(2)}
                      </span>
                    </div>
                  )) || (
                    <p className="text-gray-500 italic">No hay activos corrientes registrados</p>
                  )}
                  <div className="flex justify-between pt-2 mt-2 border-t border-green-200 font-bold">
                    <span>Total Activos Corrientes:</span>
                    <span className="text-green-700">L. {summary.activosCorrientes.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Activos No Corrientes */}
              <div>
                <h4 className="font-medium text-green-600 mb-2">Activos No Corrientes</h4>
                <div className="bg-green-50 rounded-lg p-4">
                  {groupedData['ACTIVO NO CORRIENTE']?.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-green-100 last:border-0">
                      <div>
                        <span className="font-medium">{item.codigo_cuenta}</span>
                        <span className="ml-2 text-gray-600">{item.nombre_cuenta}</span>
                      </div>
                      <span className="font-medium text-green-700">
                        L. {item.saldo.toFixed(2)}
                      </span>
                    </div>
                  )) || (
                    <p className="text-gray-500 italic">No hay activos no corrientes registrados</p>
                  )}
                  <div className="flex justify-between pt-2 mt-2 border-t border-green-200 font-bold">
                    <span>Total Activos No Corrientes:</span>
                    <span className="text-green-700">L. {summary.activosNoCorrientes.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Total Activos */}
              <div className="bg-green-100 rounded-lg p-4 mt-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>TOTAL ACTIVOS:</span>
                  <span className="text-green-800">L. {summary.totalActivos.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* PASIVOS Y PATRIMONIO */}
            <div>
              <h3 className="text-lg font-semibold mb-4 text-red-700">PASIVOS Y PATRIMONIO</h3>
              
              {/* Pasivos Corrientes */}
              <div className="mb-4">
                <h4 className="font-medium text-red-600 mb-2">Pasivos Corrientes</h4>
                <div className="bg-red-50 rounded-lg p-4">
                  {groupedData['PASIVO CORRIENTE']?.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-red-100 last:border-0">
                      <div>
                        <span className="font-medium">{item.codigo_cuenta}</span>
                        <span className="ml-2 text-gray-600">{item.nombre_cuenta}</span>
                      </div>
                      <span className="font-medium text-red-700">
                        L. {item.saldo.toFixed(2)}
                      </span>
                    </div>
                  )) || (
                    <p className="text-gray-500 italic">No hay pasivos corrientes registrados</p>
                  )}
                  <div className="flex justify-between pt-2 mt-2 border-t border-red-200 font-bold">
                    <span>Total Pasivos Corrientes:</span>
                    <span className="text-red-700">L. {summary.pasivosCorrientes.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Patrimonio */}
              <div className="mb-4">
                <h4 className="font-medium text-blue-600 mb-2">Patrimonio</h4>
                <div className="bg-blue-50 rounded-lg p-4">
                  {groupedData['PATRIMONIO']?.map((item, index) => (
                    <div key={index} className="flex justify-between py-2 border-b border-blue-100 last:border-0">
                      <div>
                        <span className="font-medium">{item.codigo_cuenta}</span>
                        <span className="ml-2 text-gray-600">{item.nombre_cuenta}</span>
                      </div>
                      <span className="font-medium text-blue-700">
                        L. {item.saldo.toFixed(2)}
                      </span>
                    </div>
                  )) || (
                    <p className="text-gray-500 italic">No hay patrimonio registrado</p>
                  )}
                  <div className="flex justify-between pt-2 mt-2 border-t border-blue-200 font-bold">
                    <span>Total Patrimonio:</span>
                    <span className="text-blue-700">L. {summary.patrimonio.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              {/* Total Pasivos y Patrimonio */}
              <div className="bg-red-100 rounded-lg p-4">
                <div className="flex justify-between font-bold text-lg">
                  <span>TOTAL PASIVOS Y PATRIMONIO:</span>
                  <span className="text-red-800">L. {summary.totalPasivosPatrimonio.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {/* Validación del Balance */}
            <div className={`rounded-lg p-4 ${
              Math.abs(summary.totalActivos - summary.totalPasivosPatrimonio) < 0.01
                ? 'bg-green-100 border-green-300'
                : 'bg-red-100 border-red-300'
            } border`}>
              <div className="flex justify-between items-center">
                <span className="font-bold">Diferencia:</span>
                <div className="flex items-center space-x-2">
                  <span className={`font-bold ${
                    Math.abs(summary.totalActivos - summary.totalPasivosPatrimonio) < 0.01
                      ? 'text-green-700'
                      : 'text-red-700'
                  }`}>
                    L. {Math.abs(summary.totalActivos - summary.totalPasivosPatrimonio).toFixed(2)}
                  </span>
                  <Badge variant={
                    Math.abs(summary.totalActivos - summary.totalPasivosPatrimonio) < 0.01
                      ? "default"
                      : "destructive"
                  }>
                    {Math.abs(summary.totalActivos - summary.totalPasivosPatrimonio) < 0.01
                      ? "Balance Cuadrado"
                      : "Balance Desbalanceado"
                    }
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
