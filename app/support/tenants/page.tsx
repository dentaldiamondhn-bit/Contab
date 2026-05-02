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

// Función para limpiar email en frontend
const cleanEmail = (email: string) => {
  if (!email) return '';
  return email.replace(/\+[^@]+@/, '@');
};

export default function SupportTenantsPage() {
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
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showViewModal, setShowViewModal] = useState(false);

  // Fetch tenants
  const fetchTenants = async (page = 1) => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/admin/tenants?page=${page}&limit=${pagination.itemsPerPage}&search=${searchTerm}&status=${statusFilter}&t=${Date.now()}`,
        { cache: 'no-store' }
      );
      
      if (!response.ok) {
        throw new Error("Error al cargar tenants");
      }

      const data = await response.json();
      console.log('API Response:', data);
      setTenants(data.tenants || []);
      setPagination({
        ...pagination,
        currentPage: page,
        totalPages: data.pagination?.pages || 1,
        totalItems: data.pagination?.total || 0,
      });
    } catch (err: any) {
      console.error('Error fetching tenants:', err);
      setError(err.message || 'Error al cargar tenants');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants(1);
  }, [searchTerm, statusFilter]);

  // Use tenants directly from API (already filtered and paginated by API)

  const handlePageChange = (page: number) => {
    setPagination({ ...pagination, currentPage: page });
  };

  const handleViewTenant = (tenant: Tenant) => {
    router.push(`/support/tenants/${tenant.id}`);
  };

  if (loading && tenants.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Ver Tenants</h1>
        <p className="text-gray-600">Vista de empresas del sistema (solo lectura)</p>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {/* Filters */}
      <div className="mb-6 flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <input
            type="text"
            placeholder="Buscar empresas..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPagination({ ...pagination, currentPage: 1 });
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>
        <div>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPagination({ ...pagination, currentPage: 1 });
            }}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          >
            <option value="all">Todos los estados</option>
            <option value="active">Activos</option>
            <option value="inactive">Inactivos</option>
          </select>
        </div>
      </div>

      {/* Tenants Table */}
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
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tenants.map((tenant) => (
              <tr key={tenant.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div>
                    <div className="text-sm font-medium text-gray-900">
                      {tenant.businessName}
                    </div>
                    <div className="text-sm text-gray-500">{cleanEmail(tenant.businessEmail)}</div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tenant.tenantCode}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className="px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800">
                    {tenant.subscriptionPlan}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {tenant.totalUsers} / {tenant.maxUsers}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      tenant.isActive
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {tenant.isActive ? "Activo" : "Inactivo"}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <button
                    onClick={() => handleViewTenant(tenant)}
                    className="text-orange-600 hover:text-orange-900"
                    title="Ver detalles"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {tenants.length === 0 && !loading && (
          <div className="text-center py-8">
            <p className="text-gray-500">No se encontraron empresas</p>
          </div>
        )}
      </div>

      {/* Footer Paginator */}
      <FooterPaginator
        currentPage={pagination.currentPage}
        totalPages={pagination.totalPages || 1}
        totalItems={pagination.totalItems || 0}
        itemsPerPage={pagination.itemsPerPage}
        onPageChange={handlePageChange}
      />
    </div>
  );
}
