"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
}

interface Tenant {
  id: string;
  businessName: string;
  tenantCode: string;
  businessEmail: string;
  subscriptionPlan: string;
  maxUsers: number;
  isActive: boolean;
  _count: {
    users: number;
  };
}

export default function SimpleAdminDashboard() {
  const { user, isLoaded } = useUser();
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);

  console.log('SimpleAdminDashboard - Component loaded');
  console.log('SimpleAdminDashboard - Rendered, user:', !!user, 'isLoaded:', isLoaded);

  useEffect(() => {
    console.log('SimpleAdminDashboard - useEffect triggered');
    console.log('SimpleAdminDashboard - Current URL:', window.location.href);

    // Fetch tenant statistics and tenants list
    fetchTenantStats();
    fetchTenants();
  }, []);

  const fetchTenantStats = async () => {
    try {
      const response = await fetch('/api/admin/stats');
      if (response.ok) {
        const data = await response.json();
        setTenantStats({
          totalTenants: data.stats.totalTenants,
          activeTenants: data.stats.activeTenants,
          suspendedTenants: data.stats.totalTenants - data.stats.activeTenants
        });
      }
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/admin/tenants');
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoadingTenants(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600">No hay usuario</p>
        </div>
      </div>
    );
  }

  const role = user.publicMetadata?.role || 
               user.unsafeMetadata?.role ||
               (user as any).privateMetadata?.role;

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Administrativo</h1>

        {/* Tenant Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Tenants</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">
                  {loadingStats ? '...' : tenantStats?.totalTenants || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tenants Activos</p>
                <p className="text-3xl font-bold text-green-600 mt-2">
                  {loadingStats ? '...' : tenantStats?.activeTenants || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Tenants Suspendidos</p>
                <p className="text-3xl font-bold text-red-600 mt-2">
                  {loadingStats ? '...' : tenantStats?.suspendedTenants || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Tenants Table */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Tenants y Usuarios</h2>
          {loadingTenants ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Empresa
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuarios
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Límite
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {tenants.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                        No hay tenants registrados
                      </td>
                    </tr>
                  ) : (
                    tenants.map((tenant) => (
                      <tr key={tenant.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">{tenant.businessName}</div>
                          <div className="text-sm text-gray-500">{tenant.businessEmail}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{tenant.tenantCode}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                            {tenant.subscriptionPlan}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{tenant._count.users}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{tenant.maxUsers}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            tenant.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {tenant.isActive ? 'Activo' : 'Suspendido'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">Información del Usuario:</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <span className="font-medium text-gray-600">Email:</span>
              <p className="text-gray-900">{user.primaryEmailAddress?.emailAddress}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Rol:</span>
              <p className="text-gray-900">{role}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">ID:</span>
              <p className="text-gray-900">{user.id}</p>
            </div>
            
            <div>
              <span className="font-medium text-gray-600">Estado:</span>
              <p className="text-green-600">✅ Usuario autenticado</p>
            </div>
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded">
            <h3 className="font-medium text-blue-900 mb-2">Panel de Administración</h3>
            <p className="text-blue-700">
              Bienvenido al panel de administración. Aquí podrás gestionar usuarios, tenants y configuración del sistema.
            </p>
          </div>
          
          <div className="mt-6 space-x-4">
            <button 
              onClick={() => window.location.href = '/admin/users'}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Gestionar Usuarios
            </button>
            
            <button 
              onClick={() => window.location.href = '/admin/tenants'}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
            >
              Gestionar Tenants
            </button>
            
            <button 
              onClick={() => window.location.href = '/dashboard'}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
            >
              Ir al Dashboard Normal
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
