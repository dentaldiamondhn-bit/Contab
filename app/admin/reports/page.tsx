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
  RefreshCw,
  Search,
  CreditCard,
  AlertCircle,
  CheckCircle
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface ReportData {
  totalTenants: number;
  activeTenants: number;
  inactiveTenants: number;
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  invoicesGenerated: number;
  paidInvoices: number;
  pendingInvoices: number;
  totalPlans: number;
  plansByType: Record<string, number>;
  recentActivity: ActivityItem[];
  topTenants: TopTenant[];
}

interface ActivityItem {
  id: string;
  type: 'tenant' | 'user' | 'invoice' | 'plan' | 'payment';
  description: string;
  timestamp: Date;
  tenantName?: string;
  amount?: number;
}

interface TopTenant {
  id: string;
  name: string;
  revenue: number;
  invoices: number;
  users: number;
}

export default function AdminReportsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const [reportData, setReportData] = useState<ReportData>({
    totalTenants: 0,
    activeTenants: 0,
    inactiveTenants: 0,
    totalUsers: 0,
    activeUsers: 0,
    inactiveUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    yearlyRevenue: 0,
    invoicesGenerated: 0,
    paidInvoices: 0,
    pendingInvoices: 0,
    totalPlans: 0,
    plansByType: {},
    recentActivity: [],
    topTenants: []
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

      // Fetch plans
      const plansResponse = await fetch('/api/admin/plans');
      const plansData = await plansResponse.json();

      // Fetch invoices
      const invoicesResponse = await fetch('/api/admin/billing/invoices');
      const invoicesData = await invoicesResponse.json();

      // Calculate metrics
      const tenants = tenantsData.tenants || [];
      const users = usersData.users || [];
      const plans = plansData.plans || [];
      const invoices = invoicesData.invoices || [];

      const activeTenants = tenants.filter((t: any) => t.isActive !== false).length;
      const inactiveTenants = tenants.length - activeTenants;
      
      const activeUsers = users.filter((u: any) => u.isactive !== false).length;
      const inactiveUsers = users.length - activeUsers;
      
      const totalRevenue = invoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);
      
      // Calculate monthly revenue
      const now = new Date();
      const currentMonthInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt || inv.invoiceDate);
        return invDate.getMonth() === now.getMonth() && invDate.getFullYear() === now.getFullYear();
      });
      const monthlyRevenue = currentMonthInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      // Calculate yearly revenue
      const currentYearInvoices = invoices.filter((inv: any) => {
        const invDate = new Date(inv.createdAt || inv.invoiceDate);
        return invDate.getFullYear() === now.getFullYear();
      });
      const yearlyRevenue = currentYearInvoices.reduce((sum: number, inv: any) => sum + (inv.total || 0), 0);

      // Calculate invoices by status
      const paidInvoices = invoices.filter((inv: any) => inv.status === 'PAID' || inv.isPaid).length;
      const pendingInvoices = invoices.filter((inv: any) => inv.status === 'PENDING' || !inv.isPaid).length;

      // Calculate plans by type
      const plansByType: Record<string, number> = {};
      plans.forEach((plan: any) => {
        const type = plan.code || plan.name || 'Unknown';
        plansByType[type] = (plansByType[type] || 0) + 1;
      });

      // Get top tenants by revenue
      const tenantRevenue: Record<string, { id: string; name: string; revenue: number; invoices: number; users: number }> = {};
      
      tenants.forEach((t: any) => {
        tenantRevenue[t.id] = {
          id: t.id,
          name: t.businessname || t.tenant_code,
          revenue: 0,
          invoices: 0,
          users: users.filter((u: any) => u.tenantId === t.id).length
        };
      });

      invoices.forEach((inv: any) => {
        const tenantId = inv.tenantId;
        if (tenantRevenue[tenantId]) {
          tenantRevenue[tenantId].revenue += inv.total || 0;
          tenantRevenue[tenantId].invoices += 1;
        }
      });

      const topTenants = Object.values(tenantRevenue)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 5);

      // Generate recent activity
      const recentActivity: ActivityItem[] = [
        ...tenants.slice(0, 3).map((t: any) => ({
          id: `tenant-${t.id}`,
          type: 'tenant' as const,
          description: `Nuevo tenant registrado: ${t.businessname}`,
          timestamp: new Date(t.createdat || Date.now()),
          tenantName: t.businessname
        })),
        ...invoices.slice(0, 3).map((i: any) => ({
          id: `invoice-${i.id}`,
          type: 'payment' as const,
          description: `Factura ${i.invoiceNumber} generada`,
          timestamp: new Date(i.createdAt || i.invoiceDate || Date.now()),
          tenantName: i.customerName,
          amount: i.total
        })),
        ...users.slice(0, 3).map((u: any) => ({
          id: `user-${u.id}`,
          type: 'user' as const,
          description: `Usuario registrado: ${u.name || u.email}`,
          timestamp: new Date(u.createdat || Date.now()),
          tenantName: u.tenant?.businessname
        })),
        ...plans.slice(0, 3).map((p: any) => ({
          id: `plan-${p.id}`,
          type: 'plan' as const,
          description: `Plan ${p.name} configurado`,
          timestamp: new Date(p.createdAt || Date.now())
        }))
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

      setReportData({
        totalTenants: tenants.length,
        activeTenants,
        inactiveTenants,
        totalUsers: users.length,
        activeUsers,
        inactiveUsers,
        totalRevenue,
        monthlyRevenue,
        yearlyRevenue,
        invoicesGenerated: invoices.length,
        paidInvoices,
        pendingInvoices,
        totalPlans: plans.length,
        plansByType,
        recentActivity,
        topTenants
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
        return <FileText className="w-4 h-4 text-orange-500" />;
      case 'payment':
        return <DollarSign className="w-4 h-4 text-purple-500" />;
      case 'plan':
        return <CheckCircle className="w-4 h-4 text-teal-500" />;
      default:
        return <Activity className="w-4 h-4 text-gray-500" />;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-HN').format(num);
  };

  const exportReport = () => {
    const reportContent = `
REPORTE ADMINISTRATIVO - CONTABHN
Generado: ${new Date().toLocaleString('es-HN')}
Período: Últimos ${dateRange} días

RESUMEN GENERAL
===============
Tenants:
  - Total: ${reportData.totalTenants}
  - Activos: ${reportData.activeTenants}
  - Inactivos: ${reportData.inactiveTenants}

Usuarios:
  - Total: ${reportData.totalUsers}
  - Activos: ${reportData.activeUsers}
  - Inactivos: ${reportData.inactiveUsers}

FACTURACIÓN
===========
Ingresos:
  - Total histórico: ${formatCurrency(reportData.totalRevenue)}
  - Este mes: ${formatCurrency(reportData.monthlyRevenue)}
  - Este año: ${formatCurrency(reportData.yearlyRevenue)}

Facturas:
  - Total generadas: ${reportData.invoicesGenerated}
  - Pagadas: ${reportData.paidInvoices}
  - Pendientes: ${reportData.pendingInvoices}

PLANES
======
Total planes: ${reportData.totalPlans}
${Object.entries(reportData.plansByType).map(([type, count]) => `  - ${type}: ${count}`).join('\n')}

TOP TENANTS POR INGRESOS
========================
${reportData.topTenants.map((t, i) => `${i + 1}. ${t.name}: ${formatCurrency(t.revenue)} (${t.invoices} facturas)`).join('\n')}
`;

    const blob = new Blob([reportContent], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte-admin-${new Date().toISOString().split('T')[0]}.txt`;
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
              onClick={() => router.push('/admin/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al Dashboard
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reportes Administrativos</h1>
              <p className="text-gray-600 mt-1">Panel completo de estadísticas y métricas del sistema</p>
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
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
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
                className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              <AlertCircle className="w-5 h-5 text-red-500" />
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
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(reportData.totalTenants)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-green-600">{reportData.activeTenants} activos</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-red-500">{reportData.inactiveTenants} inactivos</span>
                  </div>
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
                  <p className="text-2xl font-bold text-gray-900">{formatNumber(reportData.totalUsers)}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-green-600">{reportData.activeUsers} activos</span>
                    <span className="text-xs text-gray-400">|</span>
                    <span className="text-xs text-red-500">{reportData.inactiveUsers} inactivos</span>
                  </div>
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
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(reportData.monthlyRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {reportData.invoicesGenerated} facturas generadas
                  </p>
                </div>
                <CreditCard className="w-8 h-8 text-blue-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Ingresos del Año</p>
                  <p className="text-2xl font-bold text-purple-600">
                    {formatCurrency(reportData.yearlyRevenue)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Histórico: {formatCurrency(reportData.totalRevenue)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Second Row Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Facturas Pagadas</p>
                  <p className="text-2xl font-bold text-green-600">{reportData.paidInvoices}</p>
                  <p className="text-xs text-green-500 mt-1">
                    {((reportData.paidInvoices / (reportData.invoicesGenerated || 1)) * 100).toFixed(1)}% del total
                  </p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Facturas Pendientes</p>
                  <p className="text-2xl font-bold text-orange-600">{reportData.pendingInvoices}</p>
                  <p className="text-xs text-orange-500 mt-1">
                    Requieren seguimiento
                  </p>
                </div>
                <AlertCircle className="w-8 h-8 text-orange-400" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Planes Activos</p>
                  <p className="text-2xl font-bold text-teal-600">{reportData.totalPlans}</p>
                  <p className="text-xs text-teal-500 mt-1">
                    {Object.keys(reportData.plansByType).length} tipos diferentes
                  </p>
                </div>
                <BarChart3 className="w-8 h-8 text-teal-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Top Tenants */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Top Tenants por Ingresos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {reportData.topTenants.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Building2 className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay datos de ingresos</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reportData.topTenants.map((tenant, index) => (
                    <div key={tenant.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-700 rounded-full flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{tenant.name}</p>
                        <p className="text-xs text-gray-500">
                          {tenant.invoices} facturas • {tenant.users} usuarios
                        </p>
                      </div>
                      <span className="font-bold text-blue-600">
                        {formatCurrency(tenant.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Plans Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="w-5 h-5" />
                Distribución de Planes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {Object.keys(reportData.plansByType).length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <PieChart className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay datos de planes</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {Object.entries(reportData.plansByType).map(([type, count]) => (
                    <div key={type} className="flex items-center gap-3">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-gray-700">{type}</span>
                          <span className="text-sm text-gray-500">{count}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${(count / reportData.totalPlans) * 100}%` }}
                          />
                        </div>
                      </div>
                      <span className="text-sm font-medium text-gray-600 w-12 text-right">
                        {((count / (reportData.totalPlans || 1)) * 100).toFixed(0)}%
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" />
              Actividad Reciente del Sistema
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Cargando actividad...</p>
              </div>
            ) : reportData.recentActivity.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No hay actividad reciente</p>
              </div>
            ) : (
              <div className="space-y-3">
                {reportData.recentActivity.map((activity) => (
                  <div
                    key={activity.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex-shrink-0">
                      {getActivityIcon(activity.type)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {activity.description}
                      </p>
                      {activity.tenantName && (
                        <p className="text-xs text-blue-600">
                          Tenant: {activity.tenantName}
                        </p>
                      )}
                      {activity.amount && (
                        <p className="text-xs text-green-600">
                          Monto: {formatCurrency(activity.amount)}
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
