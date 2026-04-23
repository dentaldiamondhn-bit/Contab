"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Tenant {
  id: string;
  businessName: string;
  tenantCode: string;
  businessEmail: string;
  subscriptionPlan: string;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  modules?: string;
  _count: {
    users: number;
  };
}

export default function TenantsListPage() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/admin/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      } else {
        setError("Error al cargar los tenants");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const toggleTenantStatus = async (tenantId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/toggle`, {
        method: "PATCH",
      });
      if (response.ok) {
        fetchTenants();
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Tenants</h1>
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
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Módulos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No hay tenants registrados
                    </td>
                  </tr>
                ) : (
                  tenants.map((tenant) => (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
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
                        <div className="text-sm text-gray-900">{tenant._count.users}</div>
                        <div className="text-xs text-gray-500">de {tenant.maxUsers}</div>
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
                      <td className="px-6 py-4">
                        {tenant.modules ? (
                          <div className="flex flex-wrap gap-1">
                            {tenant.modules.split(',').map((mod, idx) => (
                              <span key={idx} className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded">
                                {mod}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Sin módulos</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(tenant.createdAt).toLocaleDateString('es-HN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button
                          onClick={() => toggleTenantStatus(tenant.id, tenant.isActive)}
                          className={`px-3 py-1 rounded ${
                            tenant.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {tenant.isActive ? 'Suspender' : 'Activar'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
