'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  DollarSign,
  Calendar,
  Download,
  FileText,
  BarChart3,
  PieChart,
  Activity,
  ArrowLeft,
  Filter,
  RefreshCw
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReportData {
  totalTenants: number;
  activeTenants: number;
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  invoicesGenerated: number;
  ticketsCreated: number;
  ticketsResolved: number;
  recentActivity: ActivityItem[];
}

interface ActivityItem {
  id: string;
  type: 'tenant' | 'user' | 'invoice' | 'ticket';
  description: string;
  timestamp: Date;
  tenantName?: string;
}

export default function SupportReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const [reportData, setReportData] = useState<ReportData>({
    totalTenants: 0,
    activeTenants: 0,
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    invoicesGenerated: 0,
    ticketsCreated: 0,
    ticketsResolved: 0,
    recentActivity: []
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch tenants
      const tenantsResponse = await fetch('/api/admin/tenants');
      const tenantsData = await tenantsResponse.json();
      
      // Fetch users
      const usersResponse = await fetch('/api/admin/users');
      const usersData = await usersResponse.json();

      // Fetch invoices
      const invoicesResponse = await fetch('/api/admin/billing/invoices');
      const invoicesData = await invoicesResponse.json();

      // Calculate metrics
      const tenants = tenantsData.tenants || [];
      const users = usersData.users || [];
      const invoices = invoicesData.invoices || [];

      const activeTenants = tenants.filter((t: any) => t.isActive).length;
      const activeUsers = users.filter((u: any) => u.isactive).length;
      
      const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      
      // Calculate monthly revenue (current month)
      const now = new Date();
      const currentMonthInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt || inv.invoiceDate);
        return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      });
      const monthlyRevenue = currentMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      // Generate recent activity
      const recentActivity: ActivityItem[] = [
        ...tenants.slice(0, 5).map((t: any) => ({
          id: `tenant-${t.id}`,
          type: 'tenant' as const,
          description: `Tenant ${t.businessname} registrado`,
          timestamp: new Date(t.createdat || Date.now()),
          tenantName: t.businessname
        })),
        ...users.slice(0, 5).map((u: any) => ({
          id: `user-${u.id}`,
          type: 'user' as const,
          description: `Usuario ${u.name || u.email} creado`,
          timestamp: new Date(u.createdat || Date.now()),
          tenantName: u.tenant?.businessname
        })),
        ...invoices.slice(0, 5).map((i: any) => ({
          id: `invoice-${i.id}`,
          type: 'invoice' as const,
          description: `Factura ${i.invoiceNumber} generada`,
          timestamp: new Date(i.createdAt || i.invoiceDate || Date.now()),
          tenantName: i.customerName
        }))
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

      setReportData({
        totalTenants: tenants.length,
        activeTenants,
        totalUsers: users.length,
        activeUsers,
        totalRevenue,
        monthlyRevenue,
        invoicesGenerated: invoices.length,
        ticketsCreated: 0, // Would need tickets API
        ticketsResolved: 0, // Would need tickets API
        recentActivity
      });

    } catch (error: any) {
      console.error('Error fetching report data:', error);
      setError('Error al cargar los datos del reporte');
    } finally {
      setLoading(false);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'tenant':
        return <Building2 className="w-4 h-4 text-blue-500" />;
      case 'user':
        return <Users className="w-4 h-4 text-green-500" />;
      case 'invoice':
        return <DollarSign className="w-4 h-4 text-orange-500" />;
      case 'ticket':
        return <Activity className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount);
  };

  const exportReport = () => {
    const reportContent = `
REPORTE DE SOPORTE - CONTABHN
Fecha: ${new Date().toLocaleDateString('es-HN')}

RESUMEN GENERAL
===============
Total Tenants: ${reportData.totalTenants}
Tenants Activos: ${reportData.activeTenants}
Total Usuarios: ${reportData.totalUsers}
Usuarios Activos: ${reportData.activeUsers}

FACTURACIÓN
===========
Ingresos Totales: ${formatCurrency(reportData.totalRevenue)}
Ingresos del Mes: ${formatCurrency(reportData.monthlyRevenue)}
Facturas Generadas: ${reportData.invoicesGenerated}

TICKETS
=======
Tickets Creados: ${reportData.ticketsCreated}
Tickets Resueltos: ${reportData.ticketsResolved}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-soporte-${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/support/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al Dashboard
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reportes de Soporte</h1>
              <p className="text-gray-600 mt-1">Estadísticas y métricas del sistema</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={fetchReportData}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Cargando...' : 'Actualizar'}
              </Button>
              <Button
                onClick={exportReport}
                className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700"
              >
                <Download className="w-4 h-4" />
                Exportar Reporte
              </Button>
            </div>
          </div>
        </div>

        {/* Date Range Filter */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Filter className="w-5 h-5 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Período:</span>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              >
                <option value="7">Últimos 7 días</option>
                <option value="30">Últimos 30 días</option>
                <option value="90">Últimos 90 días</option>
                <option value="365">Último año</option>
              </select>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.totalTenants}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {reportData.activeTenants} activos
                  </p>
                </div>
                <Building2 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Usuarios</p>
                  <p className="text-2xl font-bold text-gray-900">{reportData.totalUsers}</p>
                  <p className="text-xs text-green-600 mt-1">
                    {reportData.activeUsers} activos
                  </p>
                </div>
                <Users className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos del Mes</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(reportData.monthlyRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {reportData.invoicesGenerated} facturas
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos Totales</p>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(reportData.totalRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Histórico
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts & Activity Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Activity Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Crecimiento de Tenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Gráfico de crecimiento</p>
                  <p className="text-sm text-gray-400">
                    {reportData.totalTenants} tenants registrados
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Revenue Chart Placeholder */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Distribución de Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
                <div className="text-center">
                  <PieChart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500">Gráfico de ingresos</p>
                  <p className="text-sm text-gray-400">
                    {formatCurrency(reportData.monthlyRevenue)} este mes
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Actividad Reciente
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Cargando actividad...</p>
              </div>
            ) : reportData.recentActivity.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No hay actividad reciente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reportData.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg"
                  >
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      {activity.tenantName && (
                        <p className="text-xs text-orange-600">
                          Tenant: {activity.tenantName}
                        </p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="text-xs text-gray-500">
                        {activity.timestamp.toLocaleDateString('es-HN')}
                      </p>
                      <p className="text-xs text-gray-400">
                        {activity.timestamp.toLocaleTimeString('es-HN', { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
