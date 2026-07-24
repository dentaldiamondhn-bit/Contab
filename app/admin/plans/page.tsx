"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import FooterPaginator from "@/components/admin/FooterPaginator";
import { MODULES } from "@/lib/constants/modules";

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  maxUsers: number;
  maxStorage: number;
  maxTransactions: number;
  features: string[];
  modules: string[]; // Array de módulos predefinidos
  isActive: boolean;
  tenantCount?: number;
}

interface TenantInfo {
  id: string;
  businessName: string;
  tenantCode: string;
  isActive: boolean;
}

export default function PlansPage() {
  const router = useRouter();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const modalRef = useRef<HTMLDivElement>(null);
  const [showTenantsModal, setShowTenantsModal] = useState(false);
  const [tenantsModalPlanName, setTenantsModalPlanName] = useState("");
  const [tenantsModalPlanCode, setTenantsModalPlanCode] = useState("");
  const [tenantsList, setTenantsList] = useState<TenantInfo[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(false);

  const availableModules = Object.values(MODULES);

  const moduleCategories = [...new Set(availableModules.map(m => m.category))];

  const categoryLabels: Record<string, string> = {
    main: 'Principal',
    accounting: 'Contabilidad',
    sales: 'Ventas',
    operations: 'Operaciones',
    analysis: 'Análisis',
    security: 'Seguridad',
    taxes: 'Impuestos',
    crm: 'CRM',
    support: 'Soporte',
  };

  useEffect(() => {
    fetchPlans();
    
    // Restaurar estado del modal del localStorage
    const savedModal = localStorage.getItem('planModalState');
    if (savedModal) {
      const { showModal: savedShowModal, editingPlan: savedEditingPlan, isCreating: savedIsCreating } = JSON.parse(savedModal);
      setShowModal(savedShowModal);
      setEditingPlan(savedEditingPlan);
      setIsCreating(savedIsCreating);
    }
  }, [pagination.currentPage, searchTerm, statusFilter]);

  // Guardar estado del modal en localStorage cuando cambie
  useEffect(() => {
    if (showModal || editingPlan) {
      localStorage.setItem('planModalState', JSON.stringify({ showModal, editingPlan, isCreating }));
    } else {
      localStorage.removeItem('planModalState');
    }
  }, [showModal, editingPlan, isCreating]);

  // Log cuando el modal debería mostrarse
  useEffect(() => {
    if (showModal && editingPlan) {
      console.log('Modal debería mostrarse:', { showModal, editingPlan, isCreating });
    }
  }, [showModal, editingPlan, isCreating]);

  const fetchPlans = async () => {
    try {
      console.log('🔄 fetchPlans - Cargando planes...');
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: searchTerm,
        status: statusFilter,
      });
      
      console.log('📡 Fetching:', `/api/admin/plans?${params}`);
      const response = await fetch(`/api/admin/plans?${params}`);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Plans data received:', data);
        setPlans(data.plans || []);
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination?.pages || 1,
          totalItems: data.pagination?.total || 0,
        }));
        console.log('✅ Plans set:', data.plans?.length || 0);
      } else {
        console.error('❌ Error response:', response.status);
        setError("Error al cargar los planes");
      }
    } catch (err) {
      console.error('❌ Fetch error:', err);
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (plan: Plan) => {
    // Asegurar que el plan tenga todos los campos necesarios
    const planWithDefaults = {
      ...plan,
      modules: plan.modules || [],
      price: plan.price || 0,
      maxUsers: plan.maxUsers || 0,
      maxStorage: plan.maxStorage || 0,
      maxTransactions: plan.maxTransactions || 0,
      features: plan.features || [],
      isActive: plan.isActive || false
    };
    setEditingPlan(planWithDefaults);
    setIsCreating(false);
    setShowModal(true);
  };

  const handleCreate = () => {
    setEditingPlan({
      id: Date.now().toString(),
      name: "",
      code: "",
      price: 0,
      maxUsers: 5,
      maxStorage: 100,
      maxTransactions: 10000,
      features: [],
      modules: [], // Array vacío de módulos
      isActive: true
    });
    setIsCreating(true);
    setShowModal(true);
  };

  const handleModuleToggle = (moduleId: string) => {
    if (!editingPlan) return;
    
    const newModules = editingPlan.modules.includes(moduleId)
      ? editingPlan.modules.filter(m => m !== moduleId)
      : [...editingPlan.modules, moduleId];
    
    setEditingPlan({
      ...editingPlan,
      modules: newModules
    });
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchPlans();
  };

  const generateCodeFromName = (name: string) => {
    return name
      .toUpperCase()
      .replace(/\s+/g, '_')
      .replace(/[^A-Z0-9_]/g, '');
  };

  const handleSave = async (updatedPlan: Plan) => {
    try {
      const response = await fetch("/api/admin/plans", {
        method: isCreating ? "POST" : "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updatedPlan),
      });

      if (response.ok) {
        await fetchPlans();
        setShowModal(false);
        setEditingPlan(null);
        setIsCreating(false);
      } else {
        const data = await response.json();
        setError(data.error || "Error al guardar el plan");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    }
  };

  const handleDelete = async (planId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este plan?')) {
      try {
        const response = await fetch(`/api/admin/plans?id=${planId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          await fetchPlans();
        } else {
          const data = await response.json();
          setError(data.error || "Error al eliminar el plan");
        }
      } catch (err) {
        setError("Error de conexión al servidor");
      }
    }
  };

  const handleToggleStatus = async (planId: string) => {
    const plan = plans.find(p => p.id === planId);
    if (plan) {
      try {
        const response = await fetch("/api/admin/plans", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ...plan,
            isActive: !plan.isActive
          }),
        });

        if (response.ok) {
          await fetchPlans();
        } else {
          const data = await response.json();
          setError(data.error || "Error al cambiar estado del plan");
        }
      } catch (err) {
        setError("Error de conexión al servidor");
      }
    }
  };

  const handleShowTenants = async (plan: Plan) => {
    setTenantsModalPlanName(plan.name);
    setTenantsModalPlanCode(plan.code);
    setShowTenantsModal(true);
    setLoadingTenants(true);
    setTenantsList([]);

    try {
      const res = await fetch(`/api/admin/plans?withTenants=true&planCode=${encodeURIComponent(plan.code)}`);
      if (res.ok) {
        const data = await res.json();
        setTenantsList(data.tenants || []);
      } else {
        setError("Error al cargar los tenants del plan");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    } finally {
      setLoadingTenants(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Planes de Suscripción</h1>
            <p className="text-gray-600 mt-2">Configura los planes disponibles para los tenants</p>
          </div>
          <button
            onClick={handleCreate}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Plan
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div key={plan.id} className={`bg-white rounded-lg shadow overflow-hidden ${!plan.isActive ? 'opacity-60' : ''}`}>
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="flex items-center space-x-2">
                    <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      plan.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {plan.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                    <span
                      className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 cursor-pointer hover:bg-blue-200 transition-colors"
                      onClick={() => handleShowTenants(plan)}
                      title="Ver tenants"
                    >
                      {plan.tenantCount ?? 0} {(plan.tenantCount ?? 0) === 1 ? 'tenant' : 'tenants'}
                    </span>
                  </div>
                </div>
                
                <div className="mb-4">
                  <p className="text-4xl font-bold text-blue-600">
                    L {plan.price?.toLocaleString() || '0'}
                    <span className="text-lg font-normal text-gray-500">/mes</span>
                  </p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {plan.maxUsers} usuarios
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {plan.maxStorage} GB almacenamiento
                  </div>
                  <div className="flex items-center text-sm text-gray-600">
                    <svg className="w-4 h-4 mr-2 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    {plan.maxTransactions?.toLocaleString() || '0'} transacciones
                  </div>
                </div>

                <div className="border-t pt-4 mb-6">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Características:</h4>
                  <ul className="space-y-2">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="text-sm text-gray-600 flex items-start">
                        <svg className="w-4 h-4 mr-2 text-green-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="flex space-x-2">
                  <button
                    onClick={() => handleEdit(plan)}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
                  >
                    Editar
                  </button>
                  <button
                    onClick={() => handleToggleStatus(plan.id)}
                    className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium ${
                      plan.isActive
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-green-100 text-green-700 hover:bg-green-200'
                    }`}
                  >
                    {plan.isActive ? 'Desactivar' : 'Activar'}
                  </button>
                  <button
                    onClick={() => handleDelete(plan.id)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-medium"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {showModal && editingPlan && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto relative">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">
                  {isCreating ? 'Crear Nuevo Plan' : `Editar Plan: ${editingPlan.name}`}
                </h2>
                
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleSave(editingPlan);
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Nombre del Plan *</label>
                    <input
                      type="text"
                      value={editingPlan.name}
                      onChange={(e) => {
                        const name = e.target.value;
                        const code = isCreating ? generateCodeFromName(name) : editingPlan.code;
                        setEditingPlan({...editingPlan, name, code});
                      }}
                      required
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: Premium"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Código del Plan *</label>
                    <input
                      type="text"
                      value={editingPlan.code}
                      onChange={(e) => setEditingPlan({...editingPlan, code: e.target.value.toUpperCase()})}
                      required
                      readOnly={isCreating}
                      className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                        isCreating 
                          ? 'bg-gray-100 border-gray-300 cursor-not-allowed' 
                          : 'border-gray-300'
                      }`}
                      placeholder="Ej: PREMIUM"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      {isCreating 
                        ? 'Código generado automáticamente basado en el nombre' 
                        : 'Código único para identificar el plan (mayúsculas)'}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Precio Mensual (L) *</label>
                    <input
                      type="number"
                      value={editingPlan.price || 0}
                      onChange={(e) => setEditingPlan({...editingPlan, price: parseInt(e.target.value) || 0})}
                      required
                      min="0"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Máx. Usuarios *</label>
                      <input
                        type="number"
                        value={editingPlan.maxUsers || 0}
                        onChange={(e) => setEditingPlan({...editingPlan, maxUsers: parseInt(e.target.value) || 0})}
                        required
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Almacenamiento (GB) *</label>
                      <input
                        type="number"
                        value={editingPlan.maxStorage || 0}
                        onChange={(e) => setEditingPlan({...editingPlan, maxStorage: parseInt(e.target.value) || 0})}
                        required
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Transacciones *</label>
                      <input
                        type="number"
                        value={editingPlan.maxTransactions || 0}
                        onChange={(e) => setEditingPlan({...editingPlan, maxTransactions: parseInt(e.target.value) || 0})}
                        required
                        min="1"
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Características (una por línea)</label>
                    <textarea
                      value={editingPlan.features.join('\n')}
                      onChange={(e) => setEditingPlan({...editingPlan, features: e.target.value.split('\n').filter(f => f.trim())})}
                      rows={6}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej:&#10;10 usuarios&#10;Soporte 24/7&#10;API access"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Módulos Incluidos</label>
                    <div className="space-y-3 max-h-60 overflow-y-auto border border-gray-200 rounded-lg p-3">
                      {moduleCategories.map((category) => (
                        <div key={category}>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">{categoryLabels[category] || category}</p>
                          <div className="space-y-1">
                            {availableModules.filter(m => m.category === category).map((module) => (
                              <label key={module.id} className="flex items-center space-x-2 cursor-pointer hover:bg-gray-50 p-1 rounded">
                                <input
                                  type="checkbox"
                                  checked={editingPlan.modules.includes(module.id)}
                                  onChange={() => handleModuleToggle(module.id)}
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                />
                                <div>
                                  <span className="text-sm font-medium">{module.name}</span>
                                  <p className="text-xs text-gray-500">{module.description}</p>
                                </div>
                              </label>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {editingPlan.modules.length > 0 && (
                      <p className="text-xs text-gray-600 mt-1">
                        {editingPlan.modules.length} módulo(s) seleccionado(s)
                      </p>
                    )}
                  </div>

                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isActive"
                      checked={editingPlan.isActive || false}
                      onChange={(e) => setEditingPlan({...editingPlan, isActive: e.target.checked})}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="isActive" className="ml-2 text-sm text-gray-700">Plan activo</label>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowModal(false);
                        setEditingPlan(null);
                        setIsCreating(false);
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      {isCreating ? 'Crear Plan' : 'Guardar Cambios'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Modal de Tenants por Plan */}
        {showTenantsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]">
            <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[80vh] overflow-y-auto relative">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-2xl font-bold text-gray-900">
                    Tenants en {tenantsModalPlanName}
                  </h2>
                  <button
                    onClick={() => setShowTenantsModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-2xl font-bold leading-none"
                  >
                    &times;
                  </button>
                </div>

                {loadingTenants ? (
                  <div className="flex items-center justify-center py-12">
                    <svg className="animate-spin h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                ) : tenantsList.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay tenants en este plan.</p>
                ) : (
                  <ul className="space-y-3">
                    {tenantsList.map((tenant) => (
                      <li
                        key={tenant.id}
                        className="flex items-center justify-between p-3 rounded-lg border border-gray-200 hover:bg-gray-50"
                      >
                        <div>
                          <p className="font-medium text-gray-900">{tenant.businessName}</p>
                          <p className="text-sm text-gray-500">{tenant.tenantCode}</p>
                        </div>
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded-full ${
                            tenant.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {tenant.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && plans.length > 0 && (
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
