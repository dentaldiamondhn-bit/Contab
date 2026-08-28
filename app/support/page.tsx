"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  CheckCircle,
  Activity,
  Server,
  RefreshCw,
  Clock,
  AlertCircle,
  HeadphonesIcon,
  LifeBuoy,
  Ticket,
  Cpu,
  HardDrive,
  MemoryStick,
  Timer
} from "lucide-react";

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  activeUsers: number;
}

export default function SupportDashboardPage() {
  const { user, isLoaded } = useUser();
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [healthData, setHealthData] = useState<any>(null);
  const [loadingHealth, setLoadingHealth] = useState(true);
  const [lastHealthCheck, setLastHealthCheck] = useState<Date | null>(null);
  const [resources, setResources] = useState<any>(null);
  const [loadingResources, setLoadingResources] = useState(true);

  useEffect(() => {
    if (isLoaded && user) {
      loadStats();
      loadHealth();
      loadResources();
    }
  }, [isLoaded, user]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/admin/stats');
      if (!response.ok) {
        setTenantStats({ totalTenants: 0, activeTenants: 0, suspendedTenants: 0, totalUsers: 0, activeUsers: 0 });
        return;
      }
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        setTenantStats({ totalTenants: 0, activeTenants: 0, suspendedTenants: 0, totalUsers: 0, activeUsers: 0 });
        return;
      }
      const data = await response.json();
      setTenantStats(data.stats);
    } catch (error) {
      setTenantStats({ totalTenants: 0, activeTenants: 0, suspendedTenants: 0, totalUsers: 0, activeUsers: 0 });
    } finally {
      setLoadingStats(false);
    }
  };

  const loadHealth = async () => {
    try {
      setLoadingHealth(true);
      const response = await fetch('/api/support/health', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setHealthData(data);
        setLastHealthCheck(new Date());
      }
    } catch (error) {
      setHealthData({
        overall: 'down',
        services: [],
        timestamp: new Date().toISOString(),
      });
    } finally {
      setLoadingHealth(false);
    }
  };

  const loadResources = async () => {
    try {
      setLoadingResources(true);
      const response = await fetch('/api/support/resources', { cache: 'no-store' });
      if (response.ok) {
        const data = await response.json();
        setResources(data);
      }
    } catch (error) {
      console.warn('Resources fetch failed:', error);
    } finally {
      setLoadingResources(false);
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    if (days > 0) return `${days}d ${hours}h ${mins}m`;
    if (hours > 0) return `${hours}h ${mins}m`;
    return `${mins}m`;
  };

  const getUsageColor = (percent: number) => {
    if (percent < 50) return 'text-green-600';
    if (percent < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBarColor = (percent: number) => {
    if (percent < 50) return 'bg-green-500';
    if (percent < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-orange-50/30 min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <LifeBuoy className="h-6 w-6 text-orange-600" />
            Dashboard de Soporte
          </h1>
          <p className="text-gray-600 mt-1">Monitoreo del sistema y estado de servicios</p>
        </div>
        <Button
          variant="outline"
          onClick={() => { loadStats(); loadHealth(); loadResources(); }}
          disabled={loadingHealth || loadingStats || loadingResources}
          className="flex items-center gap-2 border-orange-200 hover:bg-orange-50 text-orange-700"
        >
          <RefreshCw className={`h-4 w-4 ${(loadingHealth || loadingStats) ? 'animate-spin' : ''}`} />
          Actualizar
        </Button>
      </div>

      {/* Quick Access */}
      <Card className="border-orange-200 shadow-sm">
        <CardHeader className="pb-3 bg-orange-50/50 border-b border-orange-100">
          <div className="flex items-center gap-2">
            <HeadphonesIcon className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Accesos Rápidos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <a
              href="/support/panel"
              className="flex items-center gap-3 p-4 rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors"
            >
              <Server className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium text-gray-900">Panel de Soporte</p>
                <p className="text-xs text-gray-500">Gestionar tenants y usuarios</p>
              </div>
            </a>
            <a
              href="/support/tickets"
              className="flex items-center gap-3 p-4 rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors"
            >
              <Ticket className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium text-gray-900">Tickets</p>
                <p className="text-xs text-gray-500">Administrar tickets de clientes</p>
              </div>
            </a>
            <a
              href="/support/reports"
              className="flex items-center gap-3 p-4 rounded-lg border border-orange-200 hover:bg-orange-50 transition-colors"
            >
              <Activity className="h-8 w-8 text-orange-500" />
              <div>
                <p className="font-medium text-gray-900">Reportes</p>
                <p className="text-xs text-gray-500">Estadísticas y métricas</p>
              </div>
            </a>
          </div>
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-orange-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 bg-orange-50/50">
            <CardTitle className="text-sm font-medium text-orange-700">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '...' : tenantStats?.totalTenants || 0}
              </div>
              <Building2 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 bg-green-50/50">
            <CardTitle className="text-sm font-medium text-green-700">Tenants Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">
                {loadingStats ? '...' : tenantStats?.activeTenants || 0}
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 bg-amber-50/50">
            <CardTitle className="text-sm font-medium text-amber-700">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '...' : tenantStats?.totalUsers || 0}
              </div>
              <Users className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 bg-blue-50/50">
            <CardTitle className="text-sm font-medium text-blue-700">Usuarios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-600">
                {loadingStats ? '...' : tenantStats?.activeUsers || 0}
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* System Health Sensors */}
      <Card className="border-blue-200 shadow-sm">
        <CardHeader className="pb-3 bg-blue-50/50 border-b border-blue-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-blue-600" />
              <CardTitle className="text-blue-900">Estado del Sistema</CardTitle>
              {healthData && (
                <span className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                  healthData.overall === 'operational' ? 'bg-green-100 text-green-800' :
                  healthData.overall === 'degraded' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-red-100 text-red-800'
                }`}>
                  {healthData.overall === 'operational' ? 'Operational' :
                   healthData.overall === 'degraded' ? 'Degraded' : 'Down'}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {lastHealthCheck && (
                <span className="text-xs text-blue-600/70 flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {lastHealthCheck.toLocaleTimeString('es-HN')}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-blue-600 hover:bg-blue-100"
                onClick={loadHealth}
                disabled={loadingHealth}
              >
                <RefreshCw className={`h-3 w-3 ${loadingHealth ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {loadingHealth && !healthData ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {healthData?.services?.map((service: any, idx: number) => (
                <div
                  key={idx}
                  className={`flex items-center gap-3 p-3 rounded-lg border ${
                    service.status === 'operational' ? 'bg-green-50/50 border-green-200' :
                    service.status === 'degraded' ? 'bg-yellow-50/50 border-yellow-200' :
                    'bg-red-50/50 border-red-200'
                  }`}
                >
                  <div className={`flex-shrink-0 w-2.5 h-2.5 rounded-full ${
                    service.status === 'operational' ? 'bg-green-500 animate-pulse' :
                    service.status === 'degraded' ? 'bg-yellow-500' :
                    'bg-red-500'
                  }`}></div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{service.name}</p>
                    <p className={`text-xs ${
                      service.status === 'operational' ? 'text-green-600' :
                      service.status === 'degraded' ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      {service.status === 'operational' ? 'Operational' :
                       service.status === 'degraded' ? 'Degraded' : 'Down'}
                      {service.latency > 0 && ` · ${service.latency}ms`}
                    </p>
                  </div>
                  {service.status === 'operational' ? (
                    <CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" />
                  ) : service.status === 'degraded' ? (
                    <AlertCircle className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                  )}
                </div>
              ))}
              {(!healthData?.services || healthData.services.length === 0) && (
                <div className="col-span-full text-center py-4 text-gray-500">
                  No hay datos de servicios disponibles
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* System Resources */}
      <Card className="border-purple-200 shadow-sm">
        <CardHeader className="pb-3 bg-purple-50/50 border-b border-purple-100">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Cpu className="h-5 w-5 text-purple-600" />
              <CardTitle className="text-purple-900">Recursos del Sistema</CardTitle>
              {resources && (
                <span className="text-xs text-purple-600/70 ml-2">
                  {resources.platform} · Node {resources.nodeVersion}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              {resources && (
                <span className="text-xs text-purple-600/70 flex items-center gap-1">
                  <Timer className="h-3 w-3" />
                  Uptime: {formatUptime(resources.uptime)}
                </span>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-purple-600 hover:bg-purple-100"
                onClick={loadResources}
                disabled={loadingResources}
              >
                <RefreshCw className={`h-3 w-3 ${loadingResources ? 'animate-spin' : ''}`} />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {loadingResources && !resources ? (
            <div className="flex items-center justify-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-600"></div>
            </div>
          ) : resources ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* CPU */}
              <div className="p-4 rounded-lg border border-purple-200 bg-purple-50/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Cpu className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">CPU</p>
                    <p className="text-xs text-gray-500">{resources.cpu.cores} cores · {resources.cpu.speed}MHz</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Uso</span>
                    <span className={`font-medium ${getUsageColor(resources.cpu.usagePercent)}`}>
                      {resources.cpu.usagePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getBarColor(resources.cpu.usagePercent)}`}
                      style={{ width: `${resources.cpu.usagePercent}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500 truncate">{resources.cpu.model}</p>
                </div>
              </div>

              {/* Memory */}
              <div className="p-4 rounded-lg border border-blue-200 bg-blue-50/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <MemoryStick className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Memoria RAM</p>
                    <p className="text-xs text-gray-500">{resources.memory.usedGB}GB / {resources.memory.totalGB}GB</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Uso</span>
                    <span className={`font-medium ${getUsageColor(resources.memory.usagePercent)}`}>
                      {resources.memory.usagePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getBarColor(resources.memory.usagePercent)}`}
                      style={{ width: `${resources.memory.usagePercent}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">Libre: {resources.memory.freeGB}GB</p>
                </div>
              </div>

              {/* Storage */}
              <div className="p-4 rounded-lg border border-amber-200 bg-amber-50/30">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-lg bg-amber-100 flex items-center justify-center">
                    <HardDrive className="h-5 w-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Almacenamiento</p>
                    <p className="text-xs text-gray-500">{resources.storage.usedMB}MB / {resources.storage.limitMB}MB</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Uso</span>
                    <span className={`font-medium ${getUsageColor(resources.storage.usagePercent)}`}>
                      {resources.storage.usagePercent}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${getBarColor(resources.storage.usagePercent)}`}
                      style={{ width: `${resources.storage.usagePercent}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-gray-500">Supabase Storage</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-4 text-gray-500">
              No hay datos de recursos disponibles
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
