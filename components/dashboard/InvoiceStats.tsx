"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText,
  DollarSign,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Banknote,
  Smartphone,
  AlertCircle,
  CheckCircle,
  Clock
} from "lucide-react";

interface InvoiceStats {
  totalInvoices: number;
  paidInvoices: number;
  pendingInvoices: number;
  overdueInvoices: number;
  totalRevenue: number;
  pendingRevenue: number;
  paidRevenue: number;
  paymentMethods: {
    cash: number;
    card: number;
    transfer: number;
    other: number;
  };
  monthlyStats: {
    currentMonth: number;
    previousMonth: number;
    growth: number;
  };
}

interface InvoiceStatsProps {
  tenantId: string;
}

export default function InvoiceStats({ tenantId }: InvoiceStatsProps) {
  const [stats, setStats] = useState<InvoiceStats>({
    totalInvoices: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    overdueInvoices: 0,
    totalRevenue: 0,
    pendingRevenue: 0,
    paidRevenue: 0,
    paymentMethods: {
      cash: 0,
      card: 0,
      transfer: 0,
      other: 0
    },
    monthlyStats: {
      currentMonth: 0,
      previousMonth: 0,
      growth: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadInvoiceStats();
  }, [tenantId, period]);

  const loadInvoiceStats = async () => {
    setLoading(true);
    try {
      console.log('Client: Loading stats for tenant:', tenantId, 'period:', period);
      
      const response = await fetch(
        `/api/dashboard/invoice-stats?tenantId=${tenantId}&period=${period}`
      );
      
      console.log('Client: Response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Client: API Error:', errorText);
        throw new Error(`Failed to fetch invoice stats: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Client: Received data:', data);
      setStats(data);
    } catch (error) {
      console.error("Error loading invoice stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount / 100);
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return <Banknote className="h-4 w-4" />;
      case 'card': return <CreditCard className="h-4 w-4" />;
      case 'transfer': return <Banknote className="h-4 w-4" />;
      default: return <Smartphone className="h-4 w-4" />;
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Efectivo';
      case 'card': return 'Tarjeta';
      case 'transfer': return 'Transferencia';
      default: return 'Otros';
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Estadísticas de Facturación</h2>
          <p className="text-gray-600">Resumen completo de facturas y métodos de pago</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            onClick={() => setPeriod('month')}
            size="sm"
          >
            Mes
          </Button>
          <Button
            variant={period === 'quarter' ? 'default' : 'outline'}
            onClick={() => setPeriod('quarter')}
            size="sm"
          >
            Trimestre
          </Button>
          <Button
            variant={period === 'year' ? 'default' : 'outline'}
            onClick={() => setPeriod('year')}
            size="sm"
          >
            Año
          </Button>
        </div>
      </div>

      {/* Tarjetas principales de facturas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalInvoices}
            </div>
            <p className="text-xs text-gray-600">
              Facturas emitidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Pagadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.paidInvoices}
            </div>
            <p className="text-xs text-gray-600">
              {stats.totalInvoices > 0 ? Math.round((stats.paidInvoices / stats.totalInvoices) * 100) : 0}% del total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {stats.pendingInvoices}
            </div>
            <p className="text-xs text-gray-600">
              Por cobrar
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidas</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stats.overdueInvoices}
            </div>
            <p className="text-xs text-gray-600">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas financieras */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalRevenue)}
            </div>
            <p className="text-xs text-gray-600">
              Ventas del período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatCurrency(stats.pendingRevenue)}
            </div>
            <p className="text-xs text-gray-600">
              Saldo pendiente total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Mensual</CardTitle>
            {stats.monthlyStats.growth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats.monthlyStats.growth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.monthlyStats.growth >= 0 ? '+' : ''}{stats.monthlyStats.growth.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">
              vs. mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Ventas por método de pago */}
      <Card>
        <CardHeader>
          <CardTitle>Ventas por Método de Pago</CardTitle>
          <CardDescription>
            Distribución de ingresos según forma de pago
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(stats.paymentMethods).map(([method, amount]) => {
              const percentage = stats.paidRevenue > 0 ? (amount / stats.paidRevenue) * 100 : 0;
              return (
                <div key={method} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="p-2 bg-white rounded-lg">
                      {getPaymentMethodIcon(method)}
                    </div>
                    <div>
                      <div className="font-medium">{getPaymentMethodName(method)}</div>
                      <div className="text-sm text-gray-600">{percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-blue-600">
                      {formatCurrency(amount)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Visualización de barras */}
          <div className="mt-6 space-y-2">
            {Object.entries(stats.paymentMethods).map(([method, amount]) => {
              const percentage = stats.paidRevenue > 0 ? (amount / stats.paidRevenue) * 100 : 0;
              return (
                <div key={method} className="flex items-center space-x-3">
                  <div className="w-24 text-sm font-medium flex items-center space-x-2">
                    {getPaymentMethodIcon(method)}
                    <span>{getPaymentMethodName(method)}</span>
                  </div>
                  <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                    <div 
                      className="bg-blue-600 h-6 rounded-full flex items-center justify-end pr-2"
                      style={{ width: `${Math.max(percentage, 5)}%` }}
                    >
                      <span className="text-xs text-white font-medium">
                        {percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                  <div className="w-24 text-right text-sm font-bold text-blue-600">
                    {formatCurrency(amount)}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
