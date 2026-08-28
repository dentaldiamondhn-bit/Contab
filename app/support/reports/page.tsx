'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  Calendar,
  Download,
  FileText,
  BarChart3,
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
    ticketsCreated: 0,
    ticketsResolved: 0,
    recentActivity: []
  });

  useEffect(() => {
    fetchReportData();
  }, [dateRange]);

  const safeFetch = async (url: string) => {
    try {
      const response = await fetch(url);
      if (!response.ok) return [];
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) return [];
      const data = await response.json();
      return data;
    } catch {
      return [];
    }
  };

  const fetchReportData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch tenants from support API
      const tenantsData = await safeFetch('/api/support/tenants-with-users');
      const tenants = tenantsData.tenants || [];

      // Fetch users from support API
      const usersData = await safeFetch('/api/support/users');
      const users = usersData.users || usersData || [];

      const activeTenants = tenants.filter((t: any) => t.isActive !== false).length;
      const activeUsers = Array.isArray(users) ? users.filter((u: any) => u.isactive !== false).length : 0;

      const recentActivity: ActivityItem[] = [
        ...tenants.slice(0, 5).map((t: any) => ({
          id: `tenant-${t.id}`,
          type: 'tenant' as const,
          description: `Tenant ${t.businessName || t.businessname} registrado`,
          timestamp: new Date(t.createdAt || t.createdat || Date.now()),
          tenantName: t.businessName || t.businessname
        })),
        ...(Array.isArray(users) ? users.slice(0, 5).map((u: any) => ({
          id: `user-${u.id}`,
          type: 'user' as const,
          description: `Usuario ${u.name || u.email} creado`,
          timestamp: new Date(u.createdAt || u.createdat || Date.now()),
          tenantName: u.tenant?.businessName || u.tenant?.businessname
        })) : [])
      ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime()).slice(0, 10);

      setReportData({
        totalTenants: tenants.length,
        activeTenants,
        totalUsers: Array.isArray(users) ? users.length : 0,
        activeUsers,
        ticketsCreated: 0,
        ticketsResolved: 0,
        recentActivity
      });

    } catch (error: any) {
      console.warn('Error fetching report data:', error.message);
      setError('');
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
      case 'ticket':
        return <Activity className="w-4 h-4 text-purple-500" />;
      default:
        return <FileText className="w-4 h-4 text-gray-500" />;
    }
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 mb-6">
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
