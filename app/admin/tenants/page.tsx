"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FooterPaginator from "@/components/admin/FooterPaginator";

interface Tenant {
  id: string;
  businessName: string;
  tenantCode: string;
  businessEmail: string;
  businessRTN: string;
  phoneNumber: string;
  businessAddress: string;
  subscriptionPlan: string;
  subscriptionPlans: any[];
  maxUsers: number;
  monthlyCost: number;
  isActive: boolean;
  createdAt: string;
  modules: string[];
  users: any[];
  userCounts: Record<string, number>;
  totalUsers: number;
  activeUsers: number;
}

interface TenantUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

export default function TenantsListPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [expandedTenantId, setExpandedTenantId] = useState<string | null>(null);
  const [tenantUsers, setTenantUsers] = useState<Record<string, TenantUser[]>>({});
  const [loadingUsers, setLoadingUsers] = useState<Record<string, boolean>>({});
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.actions-menu-container')) {
        setOpenMenuId(null);
      }
    };

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [openMenuId]);

  useEffect(() => {
    fetchTenants();
  }, [pagination.currentPage, searchTerm, statusFilter]);

  const fetchTenants = async () => {
    try {
      console.log('🔄 Frontend: Iniciando fetchTenants...');
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: searchTerm,
        status: statusFilter,
      });
      
      console.log('📡 Frontend: Haciendo fetch a:', `/api/admin/tenants?${params}`);
      const response = await fetch(`/api/admin/tenants?${params}`);
      
      console.log('📡 Frontend: Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Frontend: Datos recibidos:', data);
        setTenants(data.tenants || []);
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination?.pages || 1,
          totalItems: data.pagination?.total || 0,
        }));
      } else {
        console.error('❌ Frontend: Error response:', response.status);
        setError("Error al cargar los tenants");
      }
    } catch (err) {
      console.error('❌ Frontend: Fetch error:', err);
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchTenants();
  };

  const toggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/toggle`, {
        method: "PATCH",
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Tenant status changed:', data.message);
        fetchTenants();
        
        // Mostrar mensaje de éxito
        const message = data.message || `Tenant ${!currentStatus ? 'activado' : 'suspendido'} exitosamente`;
        alert(message);
      } else {
        const errorData = await response.json();
        console.error('Error response:', errorData);
        alert(errorData.error || 'Error al cambiar el estado del tenant');
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
      alert('Error de conexión al servidor');
    }
  };

  const handleDeleteTenant = async (tenantId: string) => {
    if (!confirm('¿Estás seguro de que deseas eliminar este tenant? Esta acción también eliminará todos los usuarios asociados.')) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        await fetchTenants(); // Recargar la lista
        // Forzar recarga de la página para asegurar actualización
        setTimeout(() => {
          window.location.reload();
        }, 500);
      } else {
        try {
          const data = await response.json();
          alert(data.error || 'Error al eliminar tenant');
        } catch (jsonErr) {
          const text = await response.text();
          alert(text || 'Error al eliminar tenant');
        }
      }
    } catch (err) {
      console.error("Error al eliminar tenant:", err);
      alert('Error de conexión al servidor');
    }
  };

  const toggleTenantUsers = async (tenantId: string) => {
    if (expandedTenantId === tenantId) {
      setExpandedTenantId(null);
      return;
    }

    setExpandedTenantId(tenantId);
    setLoadingUsers(prev => ({ ...prev, [tenantId]: true }));

    try {
      const response = await fetch(`/api/admin/users?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setTenantUsers(prev => ({ ...prev, [tenantId]: data.users || [] }));
      } else {
        console.error('Error fetching users for tenant:', tenantId);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoadingUsers(prev => ({ ...prev, [tenantId]: false }));
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'MANAGER':
        return 'bg-blue-100 text-blue-800';
      case 'USER':
        return 'bg-gray-100 text-gray-800';
      case 'VIEWER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4 lg:p-8">
      <div className="w-full mx-auto">
        <div className="mb-6 lg:mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gestión de Tenants</h1>
            <p className="text-gray-600 mt-2">Administra las empresas registradas en el sistema</p>
          </div>
          <button
            onClick={() => router.push("/admin/tenants/create")}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Tenant
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
<table className="w-full divide-y divide-gray-200 table-fixed">
                 <thead className="bg-gray-50">
                   <tr>
                     <th className="px-2 lg:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">
                       Empresa
                     </th>
                     <th className="px-2 lg:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">
                       Código
                     </th>
                     <th className="px-2 lg:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">
                       Contacto
                     </th>
                     <th className="px-2 lg:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">
                       Plan
                     </th>
                     <th className="px-2 lg:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">
                       Usuarios
                     </th>
                     <th className="px-2 lg:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">
                       Estado
                     </th>
                     <th className="px-2 lg:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">
                       Módulos
                     </th>
                     <th className="px-2 lg:px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-[11%]">
                       Creado
                     </th>
                     <th className="px-2 lg:px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-[12%]">
                       Acciones
                     </th>
                   </tr>
                 </thead>
<tbody className="bg-white divide-y divide-gray-200">
                 {tenants.length === 0 ? (
                   <tr>
                     <td colSpan={9} className="px-6 py-12 text-center text-gray-500">
                       No hay tenants registrados
                     </td>
                   </tr>
                 ) : (
                   tenants.map((tenant) => (
                     <React.Fragment key={tenant.id}>
                       <tr className="hover:bg-gray-50">
                         <td className="px-2 lg:px-3 py-4 w-[11%]">
                           <div className="text-lg font-semibold text-gray-900">{tenant.businessName}</div>
                           <div className="text-sm text-gray-500">{tenant.businessEmail}</div>
                           <div className="text-2xl font-bold text-blue-600">L. {(tenant.monthlyCost || 0).toLocaleString() || '0'}</div>
                         </td>
                         <td className="px-2 lg:px-3 py-4 whitespace-nowrap w-[11%]">
                           <span className="text-sm text-gray-900">{tenant.tenantCode}</span>
                         </td>
                         <td className="px-2 lg:px-3 py-4 w-[11%]">
                           <div className="space-y-1 text-sm">
                             <div className="flex items-center space-x-2">
                               <span className="text-gray-500">RTN:</span>
                               <span className="font-medium text-gray-900">{tenant.businessRTN || 'No especificado'}</span>
                             </div>
                             <div className="flex items-center space-x-2">
                               <span className="text-gray-500">Tel:</span>
                               <span className="font-medium text-gray-900">{tenant.phoneNumber || 'No especificado'}</span>
                             </div>
                             <div className="flex items-start space-x-2">
                               <span className="text-gray-500">Dir:</span>
                               <span className="font-medium text-gray-900 max-w-xs truncate">{tenant.businessAddress || 'No especificada'}</span>
                             </div>
                           </div>
                         </td>
                         <td className="px-2 lg:px-3 py-4 whitespace-nowrap w-[11%]">
                           <div className="space-y-1">
                             {Array.isArray(tenant.subscriptionPlans) && tenant.subscriptionPlans.length > 0 ? (
                               tenant.subscriptionPlans.map((plan: any, idx: number) => (
                                 <div key={idx} className="flex items-center space-x-2">
                                   <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-medium">
                                     {plan.code}
                                   </span>
                                   <span className="text-xs text-gray-600">x{plan.quantity}</span>
                                 </div>
                               ))
                             ) : (
                               <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                 Sin planes
                               </span>
                             )}
                           </div>
                         </td>
                         <td className="px-2 lg:px-3 py-4 whitespace-nowrap w-[11%]">
                           <div className="space-y-1">
                             <div className="text-sm font-medium text-gray-900">
                               {tenant.activeUsers} usuarios activos
                             </div>
                             <div className="text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded">
                               Límite: {tenant.maxUsers || 'No definido'}
                             </div>
                             <button
                               onClick={() => toggleTenantUsers(tenant.id)}
                               className="text-xs text-blue-600 hover:text-blue-800 underline mt-1"
                             >
                               {expandedTenantId === tenant.id ? 'Ocultar usuarios' : 'Ver usuarios'}
                             </button>
                           </div>
                         </td>
                         <td className="px-2 lg:px-3 py-4 whitespace-nowrap w-[11%]">
                           <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                             tenant.isActive
                               ? 'bg-green-100 text-green-800'
                               : 'bg-red-100 text-red-800'
                           }`}>
                             {tenant.isActive ? 'Activo' : 'Suspendido'}
                           </span>
                         </td>
<td className="px-2 lg:px-3 py-4 whitespace-nowrap w-[11%]">
                           {(() => {
                             let modules: string[] = [];
                             if (Array.isArray(tenant.modules)) {
                               modules = tenant.modules;
                             } else if (typeof tenant.modules === 'string') {
                               try {
                                 modules = JSON.parse(tenant.modules);
                               } catch {
                                 modules = [];
                               }
                             }
                             
                             return modules.length > 0 ? (
                               <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded font-medium">
                                 {modules.length} módulos
                               </span>
                             ) : (
                               <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                                 Sin módulos
                               </span>
                             );
                           })()}
                         </td>
                         <td className="px-2 lg:px-3 py-4 whitespace-nowrap text-sm text-gray-500 w-[11%]">
                           {new Date(tenant.createdAt).toLocaleDateString('es-HN')}
                         </td>
                         <td className="px-2 lg:px-3 py-4 whitespace-nowrap text-right text-sm font-medium relative actions-menu-container w-[12%]">
                          <div className="relative inline-block text-left">
                            <button
                              onClick={() => setOpenMenuId(openMenuId === tenant.id ? null : tenant.id)}
                              className="inline-flex justify-center w-10 h-10 items-center rounded-full bg-gray-100 text-gray-600 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                              aria-haspopup="true"
                              aria-expanded={openMenuId === tenant.id}
                            >
                              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z" />
                              </svg>
                            </button>

                            {openMenuId === tenant.id && (
                              <div className="absolute right-0 mt-2 w-48 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
                                <div className="py-1" role="menu">
                                  <button
                                    onClick={() => {
                                      router.push(`/admin/tenants/${tenant.id}`);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-purple-50 flex items-center"
                                    role="menuitem"
                                  >
                                    <span className="mr-2">👁️</span> Ver Detalles
                                  </button>
                                  <button
                                    onClick={() => {
                                      router.push(`/admin/tenants/${tenant.id}/edit`);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-blue-50 flex items-center"
                                    role="menuitem"
                                  >
                                    <span className="mr-2">✏️</span> Editar
                                  </button>
                                  <button
                                    onClick={() => {
                                      toggleTenantStatus(tenant.id, tenant.isActive);
                                      setOpenMenuId(null);
                                    }}
                                    className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                                      tenant.isActive
                                        ? 'text-yellow-700 hover:bg-yellow-50'
                                        : 'text-green-700 hover:bg-green-50'
                                    }`}
                                    role="menuitem"
                                  >
                                    <span className="mr-2">{tenant.isActive ? '⏸️' : '▶️'}</span>
                                    {tenant.isActive ? 'Suspender' : 'Activar'}
                                  </button>
                                  <div className="border-t border-gray-100 my-1"></div>
                                  <button
                                    onClick={() => {
                                      handleDeleteTenant(tenant.id);
                                      setOpenMenuId(null);
                                    }}
                                    className="w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50 flex items-center"
                                    role="menuitem"
                                  >
                                    <span className="mr-2">🗑️</span> Eliminar
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedTenantId === tenant.id && (
                        <tr className="bg-gray-50">
                          <td colSpan={9} className="px-6 py-4">
                            {loadingUsers[tenant.id] ? (
                              <div className="flex items-center justify-center py-4">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                <h4 className="font-semibold text-gray-900">Usuarios de {tenant.businessName}</h4>
                                {tenantUsers[tenant.id]?.length === 0 ? (
                                  <p className="text-gray-500 text-sm">No hay usuarios en este tenant</p>
                                ) : (
                                  <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                      <thead className="bg-gray-100">
                                        <tr>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Usuario</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Email</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Rol</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Estado</th>
                                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Creado</th>
                                        </tr>
                                      </thead>
                                      <tbody className="bg-white divide-y divide-gray-200">
                                        {tenantUsers[tenant.id]?.map((user) => (
                                          <tr key={user.id}>
                                            <td className="px-4 py-2 text-sm">
                                              {user.firstName && user.lastName 
                                                ? `${user.firstName} ${user.lastName}`
                                                : 'Sin nombre'
                                              }
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">{user.email}</td>
                                            <td className="px-4 py-2">
                                              <span className={`px-2 py-1 text-xs rounded ${getRoleColor(user.role)}`}>
                                                {user.role}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2">
                                              <span className={`px-2 py-1 text-xs rounded ${
                                                user.isActive 
                                                  ? 'bg-green-100 text-green-800' 
                                                  : 'bg-red-100 text-red-800'
                                              }`}>
                                                {user.isActive ? 'Activo' : 'Inactivo'}
                                              </span>
                                            </td>
                                            <td className="px-4 py-2 text-sm text-gray-600">
                                              {new Date(user.createdAt).toLocaleDateString('es-HN')}
                                            </td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && tenants.length > 0 && (
          <FooterPaginator
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
