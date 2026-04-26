"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import FooterPaginator from "@/components/admin/FooterPaginator";

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
  subscriptionPlans: any[];
  maxUsers: number;
  monthlyCost: number;
  isActive: boolean;
  modules: string[];
  userCounts: Record<string, number>;
  totalUsers: number;
  activeUsers: number;
  users?: any[];
}

export default function SimpleAdminDashboard() {
  const { user, isLoaded } = useUser();
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [users, setUsers] = useState<any[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [tenantPagination, setTenantPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 5,
  });
  const [userPagination, setUserPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 5,
  });

  console.log('SimpleAdminDashboard - Component loaded');
  console.log('SimpleAdminDashboard - Rendered, user:', !!user, 'isLoaded:', isLoaded);

  useEffect(() => {
    console.log('SimpleAdminDashboard - useEffect triggered');
    console.log('SimpleAdminDashboard - Current URL:', window.location.href);

    // Fetch tenant statistics and tenants list
    fetchTenantStats();
    fetchTenants();
    fetchUsers();
  }, [tenantPagination.currentPage, userPagination.currentPage]);

  const fetchTenantStats = async () => {
    try {
      console.log('Fetching tenant stats...');
      const response = await fetch('/api/admin/stats');
      console.log('Stats response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Stats data:', data);
        setTenantStats({
          totalTenants: data.stats.totalTenants,
          activeTenants: data.stats.activeTenants,
          suspendedTenants: data.stats.totalTenants - data.stats.activeTenants
        });
      } else {
        console.error('Stats response not ok:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching tenant stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchTenants = async () => {
    try {
      console.log('Fetching tenants...');
      const params = new URLSearchParams({
        page: tenantPagination.currentPage.toString(),
        limit: tenantPagination.itemsPerPage.toString(),
      });
      
      const response = await fetch(`/api/admin/tenants?${params}`);
      console.log('Tenants response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Tenants data:', data);
        setTenants(data.tenants || []);
        setTenantPagination(prev => ({
          ...prev,
          totalPages: data.pagination?.pages || 1,
          totalItems: data.pagination?.total || 0,
        }));
      } else {
        console.error('Tenants response not ok:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
    } finally {
      setLoadingTenants(false);
    }
  };

  const fetchUsers = async () => {
    try {
      console.log('Fetching users...');
      const params = new URLSearchParams({
        page: userPagination.currentPage.toString(),
        limit: userPagination.itemsPerPage.toString(),
      });
      
      const response = await fetch(`/api/admin/users?${params}`);
      console.log('Users response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('Users data:', data);
        setUsers(data.users || []);
        setUserPagination(prev => ({
          ...prev,
          totalPages: data.pagination?.pages || 1,
          totalItems: data.pagination?.total || 0,
        }));
      } else {
        console.error('Users response not ok:', response.statusText);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleTenantPageChange = (page: number) => {
    setTenantPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleUserPageChange = (page: number) => {
    setUserPagination(prev => ({ ...prev, currentPage: page }));
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

  const role = user?.publicMetadata?.role || 
               user?.unsafeMetadata?.role ||
               (user as any)?.privateMetadata?.role ||
               'USER';

  console.log('Dashboard user info:', {
    userId: user?.id,
    email: user?.primaryEmailAddress?.emailAddress,
    role: role,
    isLoaded: isLoaded
  });

  console.log('Dashboard render state:', {
    loadingStats,
    loadingTenants,
    loadingUsers,
    tenantStats,
    tenants: tenants.length,
    users: users.length
  });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">Dashboard Administrativo</h1>

        {/* Warning Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-6 mb-8">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-green-800">
                Sistema Restaurado
              </h3>
              <div className="mt-2 text-sm text-green-700">
                <p>¡El cliente Prisma ha sido regenerado exitosamente! El dashboard ahora debería mostrar los datos reales.</p>
              </div>
            </div>
          </div>
        </div>

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
                            {Array.isArray(tenant.subscriptionPlans) && tenant.subscriptionPlans.length > 0 
                              ? tenant.subscriptionPlans.map((p: any) => p.code).join(', ')
                              : 'BASIC'
                            }
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="text-sm text-gray-900">{tenant.totalUsers || 0}</span>
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
          
          {/* Tenants Pagination */}
          {!loadingTenants && tenants.length > 0 && (
            <FooterPaginator
              currentPage={tenantPagination.currentPage}
              totalPages={tenantPagination.totalPages}
              totalItems={tenantPagination.totalItems}
              itemsPerPage={tenantPagination.itemsPerPage}
              onPageChange={handleTenantPageChange}
            />
          )}
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Usuarios</h2>
          {loadingUsers ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Usuario
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Email
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Rol
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Tenant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-4 text-center text-gray-500">
                        No hay usuarios registrados
                      </td>
                    </tr>
                  ) : (
                    users.map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900">
                            {user.firstName} {user.lastName}
                          </div>
                          <div className="text-sm text-gray-500">{user.username}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'SUPER_ADMIN' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'SUPPORT' ? 'bg-yellow-100 text-yellow-800' :
                            user.role === 'ADMIN' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900">{user.tenantName || 'N/A'}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
          
          {/* Users Pagination */}
          {!loadingUsers && users.length > 0 && (
            <FooterPaginator
              currentPage={userPagination.currentPage}
              totalPages={userPagination.totalPages}
              totalItems={userPagination.totalItems}
              itemsPerPage={userPagination.itemsPerPage}
              onPageChange={handleUserPageChange}
            />
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
