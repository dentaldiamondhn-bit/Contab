"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useRef } from "react";
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
  ArrowLeft
} from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";

interface TenantStats {
  totalUsers: number;
  activeUsers: number;
  totalInvoices: number;
  monthlyRevenue: number;
  activeModules: string[];
}

export default function TenantAdminDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const { currentTenant } = useTenant();
  const [stats, setStats] = useState<TenantStats>({
    totalUsers: 0,
    activeUsers: 0,
    totalInvoices: 0,
    monthlyRevenue: 0,
    activeModules: []
  });
  const [loading, setLoading] = useState(true);
  const hasCheckedRef = useRef(false);
  const statsLoadedRef = useRef(false);

  // Verificar rol y redirigir si no es admin de tenant
  useEffect(() => {
    if (user) {
      const userRole = user.publicMetadata?.role;
      
      if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole as string)) {
        router.replace('/dashboard');
      }
    }
  }, [user, router]);

  // Check localStorage once on mount only
  useEffect(() => {
    if (hasCheckedRef.current) return;
    hasCheckedRef.current = true;
    
    const companyData = localStorage.getItem('companyData');
    const businessName = localStorage.getItem('businessName');
    const savedTenant = localStorage.getItem('selected_tenant');
    
    if (!savedTenant && companyData && businessName) {
      const parsedCompany = JSON.parse(companyData);
      const reconstructedTenant = {
        id: 'temp-' + Date.now(),
        businessName: businessName,
        tenantCode: parsedCompany.rtn || 'TEMP',
        businessEmail: parsedCompany.email || '',
        businessRTN: parsedCompany.rtn || '',
        phoneNumber: parsedCompany.contactPhone || parsedCompany.companyPhone || '',
        businessAddress: parsedCompany.address || '',
        industry: parsedCompany.industry || '',
        maxUsers: 5,
      };
      localStorage.setItem('selected_tenant', JSON.stringify(reconstructedTenant));
      window.location.reload();
    }
  }, []); // Empty dependency array - run once only

  // Load stats when tenant becomes available
  useEffect(() => {
    if (!currentTenant || statsLoadedRef.current) return;
    
    statsLoadedRef.current = true;
    
    const mockStats: TenantStats = {
      totalUsers: currentTenant.maxUsers || 5,
      activeUsers: Math.floor(Math.random() * (currentTenant.maxUsers || 5)) + 1,
      totalInvoices: Math.floor(Math.random() * 50) + 10,
      monthlyRevenue: 500,
      activeModules: []
    };
    setStats(mockStats);
    setLoading(false);
  }, [currentTenant]); // Only depends on currentTenant

  // Mostrar loading mientras se verifica el rol
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Usuario no encontrado...</p>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  // Si no hay tenant seleccionado, mostrar mensaje informativo
  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen p-6">
        <Card className="max-w-md w-full text-center">
          <CardContent className="p-8">
            <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              No hay empresa seleccionada
            </h2>
            <p className="text-gray-600 mb-6">
              Debes seleccionar una empresa para ver el panel de administración.
            </p>
            <Button 
              onClick={() => router.push('/dashboard')}
              className="w-full"
            >
              Ir al Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Estadísticas Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Totales</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalUsers}</div>
            <p className="text-xs text-gray-600">
              {stats.activeUsers} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas</CardTitle>
            <FileText className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.totalInvoices}</div>
            <p className="text-xs text-gray-600">
              Este mes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Mensuales</CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.monthlyRevenue)}
            </div>
            <p className="text-xs text-gray-600">
              Suscripción
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Módulos Activos</CardTitle>
            <Settings className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.activeModules.length}</div>
            <p className="text-xs text-gray-600">
              Habilitados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gestión Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Users className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Gestionar Usuarios</h3>
            <p className="text-sm text-gray-600">Administrar usuarios y permisos</p>
            <Button className="mt-4 w-full" onClick={() => router.push('/tenant-admin/users')}>
              Ver Usuarios
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Facturación</h3>
            <p className="text-sm text-gray-600">Ver y gestionar facturas</p>
            <Button className="mt-4 w-full" onClick={() => router.push('/billing')}>
              Ver Facturas
            </Button>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardContent className="p-6 text-center">
            <Settings className="h-12 w-12 text-orange-600 mx-auto mb-4" />
            <h3 className="font-semibold text-lg mb-2">Configuración</h3>
            <p className="text-sm text-gray-600">Ajustes de la empresa</p>
            <Button className="mt-4 w-full" onClick={() => router.push('/tenant-admin/settings')}>
              Configurar
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Módulos Activos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Módulos Activos
          </CardTitle>
          <CardDescription>
            Servicios habilitados para tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.activeModules.length > 0 ? (
              stats.activeModules.map((module, index) => (
                <div key={index} className="flex items-center gap-2 p-3 bg-green-50 rounded-lg">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium text-green-800">
                    {module.charAt(0).toUpperCase() + module.slice(1)}
                  </span>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8">
                <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900">Sin módulos activos</h3>
                <p className="text-gray-500">Contacta al administrador para activar módulos</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
