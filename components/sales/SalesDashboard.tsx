"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  FileText,
  AlertCircle,
  Calendar,
  ArrowUpRight
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
interface SalesDashboardProps {
  tenantId: string;
}

interface DashboardStats {
  totalInvoices: number;
  totalRevenue: number;
  pendingReceivables: number;
  overdueReceivables: number;
  avgInvoiceValue: number;
  monthlyGrowth: number;
  topCustomers: Array<{
    name: string;
    totalPurchased: number;
    invoiceCount: number;
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    customerName: string;
    totalAmount: number;
    date: string;
    status: string;
  }>;
}

export default function SalesDashboard({ tenantId }: SalesDashboardProps) {
  const [stats, setStats] = useState<DashboardStats>({
    totalInvoices: 0,
    totalRevenue: 0,
    pendingReceivables: 0,
    overdueReceivables: 0,
    avgInvoiceValue: 0,
    monthlyGrowth: 0,
    topCustomers: [],
    recentInvoices: []
  });
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadDashboardData();
  }, [tenantId, period]);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      // Calcular fechas del período
      const now = new Date();
      let startDate: Date;
      
      switch (period) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Cargar estadísticas de facturas
      const { data: invoices, error: invoicesError } = await supabase
        .from('Invoice')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', now.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (invoicesError) throw invoicesError;

      // Cargar cuentas por cobrar
      const { data: receivables, error: receivablesError } = await supabase
        .from('AccountReceivable')
        .select('*')
        .neq('status', 'PAID');

      if (receivablesError) throw receivablesError;

      // Calcular estadísticas
      const invoiceData = (invoices || []) as any[];
      const totalInvoices = invoiceData.length;
      const totalRevenue = invoiceData.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const avgInvoiceValue = totalInvoices > 0 ? totalRevenue / totalInvoices : 0;
      
      const today = new Date();
      const receivableData = (receivables || []) as any[];
      const pendingReceivables = receivableData.reduce((sum, rec) => sum + rec.balanceAmount, 0);
      const overdueReceivables = receivableData.filter(rec => new Date(rec.dueDate) < today)
        .reduce((sum, rec) => sum + rec.balanceAmount, 0);

      // Calcular crecimiento mensual (comparar con período anterior)
      const previousPeriod = new Date(startDate);
      previousPeriod.setMonth(previousPeriod.getMonth() - 1);
      const previousPeriodEnd = new Date(startDate);
      previousPeriodEnd.setDate(previousPeriodEnd.getDate() - 1);

      const { data: previousInvoices } = await supabase
        .from('Invoice')
        .select('totalAmount')
        .gte('date', previousPeriod.toISOString().split('T')[0])
        .lte('date', previousPeriodEnd.toISOString().split('T')[0]);

      const prevInvoices = (previousInvoices || []) as any[];
      const previousRevenue = prevInvoices.reduce((sum, inv) => sum + inv.totalAmount, 0);
      const monthlyGrowth = previousRevenue > 0 ? ((totalRevenue - previousRevenue) / previousRevenue) * 100 : 0;

      // Top clientes
      const customerStats = receivableData.reduce((acc: Record<string, any>, rec: any) => {
        if (!acc[rec.customerId]) {
          acc[rec.customerId] = { totalPurchased: 0, invoiceCount: 0 };
        }
        acc[rec.customerId].totalPurchased += rec.amount;
        acc[rec.customerId].invoiceCount += 1;
        return acc;
      }, {} as Record<string, { totalPurchased: number; invoiceCount: number }>);

      // Obtener nombres de clientes
      const customerIds = Object.keys(customerStats);
      const { data: customers } = await supabase
        .from('Customer')
        .select('id, name')
        .in('id', customerIds);

      const customerList = (customers || []) as any[];
      const topCustomers = Object.entries(customerStats)
        .map(([customerId, stats]: [string, any]) => ({
          name: customerList.find((c: any) => c.id === customerId)?.name || 'Unknown',
          totalPurchased: stats.totalPurchased,
          invoiceCount: stats.invoiceCount
        }))
        .sort((a, b) => b.totalPurchased - a.totalPurchased)
        .slice(0, 5);

      // Facturas recientes
      const recentInvoices = invoiceData.slice(0, 10).map((inv: any) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        customerName: 'Customer Name', // Debería cargar el nombre del cliente
        totalAmount: inv.totalAmount,
        date: inv.date,
        status: inv.status
      })) || [];

      setStats({
        totalInvoices,
        totalRevenue,
        pendingReceivables,
        overdueReceivables,
        avgInvoiceValue,
        monthlyGrowth,
        topCustomers,
        recentInvoices
      });
    } catch (error: any) {
      console.error("Error loading dashboard data:", error);
      alert("Error al cargar el dashboard de ventas");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p>Cargando dashboard de ventas...</p>
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
          <h2 className="text-2xl font-bold">Dashboard de Ventas</h2>
          <p className="text-gray-600">Resumen completo de ventas y cobros</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            onClick={() => setPeriod('month')}
          >
            Mes
          </Button>
          <Button
            variant={period === 'quarter' ? 'default' : 'outline'}
            onClick={() => setPeriod('quarter')}
          >
            Trimestre
          </Button>
          <Button
            variant={period === 'year' ? 'default' : 'outline'}
            onClick={() => setPeriod('year')}
          >
            Año
          </Button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Facturas</CardTitle>
            <FileText className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              {stats.totalInvoices}
            </div>
            <p className="text-xs text-gray-600">
              Facturas emitidas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              L. {(stats.totalRevenue / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Ventas del período
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
            <Users className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              L. {(stats.pendingReceivables / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Saldo pendiente total
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencido</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              L. {(stats.overdueReceivables / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Monto vencido
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Secundarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Factura</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              L. {(stats.avgInvoiceValue / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Valor promedio
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Mensual</CardTitle>
            <ArrowUpRight className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.monthlyGrowth >= 0 ? '+' : ''}{stats.monthlyGrowth.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">
              vs. mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tasa de Cobro</CardTitle>
            <Calendar className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {stats.pendingReceivables > 0 
                ? (((stats.totalRevenue - stats.pendingReceivables) / stats.totalRevenue) * 100).toFixed(1)
                : '100.0'
              }%
            </div>
            <p className="text-xs text-gray-600">
              Cobrado del total
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Clientes */}
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
            <CardDescription>
              Clientes con mayor volumen de compra
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.topCustomers.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay datos de clientes
                </p>
              ) : (
                stats.topCustomers.map((customer, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{customer.name}</div>
                      <div className="text-sm text-gray-600">
                        {customer.invoiceCount} facturas
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-cyan-600">
                        L. {(customer.totalPurchased / 100).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">
                        Total comprado
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Facturas Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Facturas Recientes</CardTitle>
            <CardDescription>
              Últimas facturas emitidas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentInvoices.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay facturas recientes
                </p>
              ) : (
                stats.recentInvoices.map((invoice) => (
                  <div key={invoice.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{invoice.invoiceNumber}</span>
                        <Badge variant={
                          invoice.status === 'PAID' ? 'default' : 
                          invoice.status === 'OVERDUE' ? 'destructive' : 'secondary'
                        }>
                          {invoice.status === 'PAID' ? 'Pagada' : 
                           invoice.status === 'OVERDUE' ? 'Vencida' : 'Pendiente'}
                        </Badge>
                      </div>
                      <div className="text-sm text-gray-600">
                        {invoice.customerName}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(invoice.date).toLocaleDateString('es-HN')}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-cyan-600">
                        L. {(invoice.totalAmount / 100).toFixed(2)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
