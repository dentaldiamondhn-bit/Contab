"use client";

import { useEffect, useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  FileText, 
  DollarSign,
  TrendingUp,
  Settings,
  Calendar,
  AlertCircle,
  CheckCircle,
  Activity,
  Database,
  Shield,
  CreditCard,
  Package,
  BarChart3,
  Clock,
  Zap,
  Globe,
  Mail,
  Phone,
  MapPin,
  FileCheck,
  Cpu,
  HardDrive,
  Wifi,
  Lock,
  Key,
  Image,
  RefreshCw,
  Download,
  Upload,
  Eye,
  Edit,
  Trash2,
  Plus,
  ChevronRight,
  Info,
  Warning,
  XCircle,
  CheckSquare
} from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";

interface TenantSummary {
  basicInfo: {
    name: string;
    id: string;
    plan: string;
    status: string;
    createdAt: string;
    lastActivity: string;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
    recent: number;
  };
  billing: {
    totalInvoices: number;
    monthlyRevenue: number;
    pendingInvoices: number;
    paidInvoices: number;
    overdueInvoices: number;
  };
  system: {
    databaseStatus: string;
    apiStatus: string;
    lastBackup: string;
    storageUsed: string;
    performance: string;
  };
  modules: {
    active: string[];
    inactive: string[];
    total: number;
  };
  configuration: {
    caiConfigured: boolean;
    fiscalInfoComplete: boolean;
    logoUploaded: boolean;
    taxConfigured: boolean;
  };
  recentActivity: {
    invoices: number;
    users: number;
    logins: number;
    errors: number;
  };
}

export default function TenantSummaryPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { currentTenant } = useTenant();
  const [summary, setSummary] = useState<TenantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isLoaded || !user) {
      router.push("/auth/login");
      return;
    }

    const userRole = user.publicMetadata?.role;
    if (!["ADMIN", "MANAGER", "SUPER_ADMIN"].includes(userRole as string)) {
      router.push("/dashboard");
      return;
    }

    loadTenantSummary();
  }, [user, isLoaded, router]);

  const loadTenantSummary = async () => {
    try {
      setLoading(true);
      
      const tenantId = currentTenant?.id || "DENTALWD";
      console.log('🔍 Cargando resumen para tenant:', tenantId);
      
      const response = await fetch(`/api/tenant/summary?tenantId=${tenantId}`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Error ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.summary) {
        console.log('✅ Resumen cargado exitosamente');
        setSummary(data.summary);
      } else {
        console.error('❌ Error en respuesta de API:', data);
        throw new Error(data.error || 'Error desconocido');
      }
    } catch (error) {
      console.error("Error loading tenant summary:", error);
      
      if (!currentTenant) {
        router.push("/dashboard");
        return;
      }

      // Show error state instead of mock data
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadTenantSummary();
    setRefreshing(false);
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "healthy":
      case "operational":
      case "excellent":
        return "bg-green-100 text-green-800";
      case "warning":
      case "moderate":
        return "bg-yellow-100 text-yellow-800";
      case "inactive":
      case "error":
      case "critical":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "active":
      case "healthy":
      case "operational":
      case "excellent":
        return <CheckCircle className="w-4 h-4" />;
      case "warning":
      case "moderate":
        return <AlertCircle className="w-4 h-4" />;
      case "inactive":
      case "error":
      case "critical":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Info className="w-4 h-4" />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Cargando resumen del tenant...</p>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-500" />
          <p>No se pudo cargar la información del tenant</p>
          <Button onClick={loadTenantSummary} className="mt-4">
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Resumen del Tenant</h1>
              <p className="text-gray-600 mt-2">Vista general completa del estado del sistema</p>
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                onClick={handleRefresh}
                disabled={refreshing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                Actualizar
              </Button>
              <Button onClick={() => router.push("/tenant-admin/dashboard")}>
                <ChevronRight className="w-4 h-4 mr-2" />
                Dashboard
              </Button>
            </div>
          </div>
        </div>

        {/* Basic Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Información Básica
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Nombre</label>
                <p className="text-lg font-semibold">{summary.basicInfo.name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">ID</label>
                <p className="text-lg font-semibold">{summary.basicInfo.id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Plan</label>
                <Badge className="bg-blue-100 text-blue-800">{summary.basicInfo.plan}</Badge>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Estado</label>
                <div className="flex items-center gap-2">
                  {getStatusIcon(summary.basicInfo.status)}
                  <Badge className={getStatusColor(summary.basicInfo.status)}>
                    {summary.basicInfo.status}
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
          {/* Users Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Usuarios
                </div>
                <Badge variant="secondary">{summary.users.total}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Activos</span>
                  <span className="font-semibold text-green-600">{summary.users.active}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inactivos</span>
                  <span className="font-semibold text-gray-600">{summary.users.inactive}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Recientes</span>
                  <span className="font-semibold text-blue-600">{summary.users.recent}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Billing Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <DollarSign className="w-5 h-5" />
                  Facturación
                </div>
                <Badge variant="secondary">{summary.billing.totalInvoices}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Ingreso Mensual</span>
                  <span className="font-semibold text-green-600">
                    ${summary.billing.monthlyRevenue.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Pendientes</span>
                  <span className="font-semibold text-yellow-600">{summary.billing.pendingInvoices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Vencidas</span>
                  <span className="font-semibold text-red-600">{summary.billing.overdueInvoices}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Base de Datos</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(summary.system.databaseStatus)}
                    <span className="text-xs font-medium">{summary.system.databaseStatus}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">API</span>
                  <div className="flex items-center gap-1">
                    {getStatusIcon(summary.system.apiStatus)}
                    <span className="text-xs font-medium">{summary.system.apiStatus}</span>
                  </div>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Almacenamiento</span>
                  <span className="text-xs font-medium">{summary.system.storageUsed}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Activity Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5" />
                Actividad Reciente
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Facturas</span>
                  <span className="font-semibold">{summary.recentActivity.invoices}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Inicios Sesión</span>
                  <span className="font-semibold">{summary.recentActivity.logins}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Errores</span>
                  <span className="font-semibold text-red-600">{summary.recentActivity.errors}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Estado de Configuración
            </CardTitle>
            <CardDescription>
              Revisa y configura las opciones importantes del sistema
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <FileCheck className="w-4 h-4" />
                    <span className="text-sm font-medium">Configuración CAI</span>
                  </div>
                  {summary.configuration.caiConfigured ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <Button 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => window.location.href = '/tenant-admin/settings'}
                >
                  {summary.configuration.caiConfigured ? 'Editar' : 'Configurar'}
                </Button>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    <span className="text-sm font-medium">Info Fiscal</span>
                  </div>
                  {summary.configuration.fiscalInfoComplete ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <Button 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => window.location.href = '/tenant-admin/settings'}
                >
                  {summary.configuration.fiscalInfoComplete ? 'Editar' : 'Configurar'}
                </Button>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Image className="w-4 h-4" />
                    <span className="text-sm font-medium">Logo</span>
                  </div>
                  {summary.configuration.logoUploaded ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <Button 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => window.location.href = '/tenant-admin/settings'}
                >
                  {summary.configuration.logoUploaded ? 'Cambiar' : 'Subir'}
                </Button>
              </div>
              <div className="p-3 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <CreditCard className="w-4 h-4" />
                    <span className="text-sm font-medium">Configuración Impuestos</span>
                  </div>
                  {summary.configuration.taxConfigured ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-500" />
                  )}
                </div>
                <Button 
                  size="sm" 
                  className="w-full mt-2"
                  onClick={() => window.location.href = '/tenant-admin/settings'}
                >
                  {summary.configuration.taxConfigured ? 'Editar' : 'Configurar'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Modules Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Módulos
            </CardTitle>
            <CardDescription>
              Estado de los módulos disponibles para el tenant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                  Activos ({summary.modules.active.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {summary.modules.active.map((module) => (
                    <Badge key={module} className="bg-green-100 text-green-800">
                      {module}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-medium mb-3 flex items-center gap-2">
                  <XCircle className="w-4 h-4 text-gray-500" />
                  Inactivos ({summary.modules.inactive.length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {summary.modules.inactive.map((module) => (
                    <Badge key={module} variant="secondary">
                      {module}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Acciones Rápidas
            </CardTitle>
            <CardDescription>
              Acciones comunes para gestionar el tenant
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => router.push("/tenant-admin/users")}
              >
                <Users className="w-6 h-6" />
                <span>Gestionar Usuarios</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => router.push("/billing")}
              >
                <FileText className="w-6 h-6" />
                <span>Ver Facturas</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => router.push("/tenant-admin/settings")}
              >
                <Settings className="w-6 h-6" />
                <span>Configuración</span>
              </Button>
              <Button 
                variant="outline" 
                className="h-auto p-4 flex flex-col items-center gap-2"
                onClick={() => router.push("/reports")}
              >
                <BarChart3 className="w-6 h-6" />
                <span>Reportes</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
