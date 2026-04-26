"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  maxUsers?: number;
  features?: string[];
}

export default function EditTenantPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [availablePlans, setAvailablePlans] = useState<Plan[]>([]);

  const [formData, setFormData] = useState<{
    businessName: string;
    businessEmail: string;
    businessRTN: string;
    phoneNumber: string;
    businessAddress: string;
    subscriptionPlans: { code: string; quantity: number }[];
    maxUsers: number;
    monthlyCost: number;
    modules: string[];
  }>({
    businessName: "",
    businessEmail: "",
    businessRTN: "",
    phoneNumber: "",
    businessAddress: "",
    subscriptionPlans: [],
    maxUsers: 5,
    monthlyCost: 0,
    modules: [],
  });

  const availableModules = [
    { id: "accounting", name: "Contabilidad", description: "Gestión contable completa" },
    { id: "billing", name: "Facturación", description: "Facturas y pagos" },
    { id: "inventory", name: "Inventario", description: "Gestión de productos" },
    { id: "contacts", name: "Contactos", description: "Clientes y prospectos" },
    { id: "reports", name: "Reportes", description: "Reportes financieros" },
    { id: "tax", name: "Impuestos", description: "Gestión de impuestos" },
    { id: "multi_currency", name: "Multi-divisa", description: "Soporte para múltiples monedas" },
    { id: "api", name: "API Access", description: "Acceso a API" },
  ];

  useEffect(() => {
    fetchPlans();
    fetchAvailablePlans();
    fetchTenant();
  }, [tenantId]);

  const fetchAvailablePlans = async () => {
    try {
      console.log('Cargando planes disponibles desde /api/admin/plans...');
      const response = await fetch("/api/admin/plans");
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Planes disponibles recibidos:', data);
        setAvailablePlans(data.plans || []);
      } else {
        console.error('Error en respuesta de planes disponibles:', response.status);
        const errorData = await response.json();
        console.error('Error data:', errorData);
      }
    } catch (err) {
      console.error("Error cargando planes disponibles:", err);
    }
  };

  const fetchPlans = async () => {
    try {
      console.log('Cargando planes desde /api/admin/plans-public...');
      const response = await fetch("/api/admin/plans-public");
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Planes recibidos:', data);
        setPlans(data.plans || []);
      } else {
        console.error('Error en respuesta de planes:', response.status);
        const errorData = await response.json();
        console.error('Error data:', errorData);
      }
    } catch (err) {
      console.error("Error cargando planes:", err);
    }
  };

  const fetchTenant = async () => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`);
      if (!response.ok) {
        throw new Error("Error al cargar el tenant");
      }
      const data = await response.json();
      
      setFormData({
        businessName: data.businessName || "",
        businessEmail: data.businessEmail || "",
        businessRTN: data.businessRTN || "",
        phoneNumber: data.phoneNumber || "",
        businessAddress: data.businessAddress || "",
        subscriptionPlans: data.subscriptionPlans ? (typeof data.subscriptionPlans === 'string' ? JSON.parse(data.subscriptionPlans) : data.subscriptionPlans) : 
                   data.subscriptionPlan ? (typeof data.subscriptionPlan === 'string' ? JSON.parse(data.subscriptionPlan) : data.subscriptionPlan) : [],
        maxUsers: data.maxUsers || 5,
        monthlyCost: data.monthlyCost || 0,
        modules: data.modules ? (typeof data.modules === 'string' ? data.modules.split(',') : data.modules) : [],
      });
    } catch (err) {
      setError("Error al cargar el tenant");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "maxUsers" ? parseInt(value) : value
    }));
  };

  const handlePlanToggle = (planCode: string) => {
    setFormData(prev => {
      const currentPlans = Array.isArray(prev.subscriptionPlans) ? prev.subscriptionPlans : [];
      const existingPlanIndex = currentPlans.findIndex((p: { code: string; quantity: number }) => p.code === planCode);
      let newPlans;
      
      if (existingPlanIndex >= 0) {
        // Si el plan ya existe, removerlo completamente
        newPlans = currentPlans.filter((p: { code: string; quantity: number }) => p.code !== planCode);
      } else {
        // Si no existe, agregar con cantidad 1
        newPlans = [...currentPlans, { code: planCode, quantity: 1 }];
      }
      
      return {
        ...prev,
        subscriptionPlans: newPlans
      };
    });
  };

  const handleQuantityChange = (planCode: string, newQuantity: number) => {
    if (newQuantity < 1 || isNaN(newQuantity)) return;
    
    setFormData(prev => {
      // Asegurarse que subscriptionPlans sea un array
      const currentPlans = Array.isArray(prev.subscriptionPlans) ? prev.subscriptionPlans : [];
      
      if (newQuantity === 0) {
        // Si la cantidad es 0, remover el plan
        const newPlans = currentPlans.filter(p => p.code !== planCode);
        return {
          ...prev,
          subscriptionPlans: newPlans
        };
      } else {
        // Actualizar la cantidad
        const newPlans = currentPlans.map(p => 
          p.code === planCode ? { ...p, quantity: newQuantity } : p
        );
        return {
          ...prev,
          subscriptionPlans: newPlans
        };
      }
      
      // Calcular el costo total mensual
      const totalMonthlyCost = plans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find(np => np.code === p.code);
          return sum + (p.price * (planWithQuantity?.quantity || 1));
        }, 0);
      
      return {
        ...prev,
        subscriptionPlans: newPlans,
        maxUsers: totalMaxUsers,
        monthlyCost: totalMonthlyCost
      };
    });
  };

  const handleRemovePlan = (planCode: string) => {
    setFormData(prev => {
      // Asegurarse que subscriptionPlans sea un array
      const currentPlans = Array.isArray(prev.subscriptionPlans) ? prev.subscriptionPlans : [];
      const newPlans = currentPlans.filter(p => p.code !== planCode);
      
      // Calcular el maxUsers total basado en los planes seleccionados
      const totalMaxUsers = plans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find(np => np.code === p.code);
          return Math.max(sum, p.maxUsers * (planWithQuantity?.quantity || 1));
        }, 5);
      
      // Calcular el costo total mensual
      const totalMonthlyCost = plans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find(np => np.code === p.code);
          return sum + (p.price * (planWithQuantity?.quantity || 1));
        }, 0);
      
      return {
        ...prev,
        subscriptionPlans: newPlans,
        maxUsers: totalMaxUsers,
        monthlyCost: totalMonthlyCost
      };
    });
  };

  const handleModuleToggle = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter(m => m !== moduleId)
        : [...prev.modules, moduleId]
    }));
  };

  const handleSelectAllModules = () => {
    setFormData(prev => ({
      ...prev,
      modules: availableModules.map(m => m.id)
    }));
  };

  const handleDeselectAllModules = () => {
    setFormData(prev => ({
      ...prev,
      modules: []
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      // Calcular el costo total mensual basado en los planes seleccionados
      const calculateMonthlyCost = () => {
        const currentPlans = Array.isArray(formData.subscriptionPlans) ? formData.subscriptionPlans : [];
        return currentPlans.reduce((total, plan) => {
          const planData = plans.find(p => p.code === plan.code);
          if (planData) {
            return total + (planData.unitPrice * (plan.quantity || 1));
          }
          return total;
        }, 0);
      };

      const calculatedMonthlyCost = calculateMonthlyCost();
      
      console.log('📦 Datos a guardar:', {
        ...formData,
        subscriptionPlans: formData.subscriptionPlans,
        calculatedMonthlyCost
      });

      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          subscriptionPlans: JSON.stringify(formData.subscriptionPlans),
          monthlyCost: calculatedMonthlyCost,
          modules: formData.modules.join(',')
        }),
      });

      console.log('📡 Response status:', response.status);
      const data = await response.json();
      console.log('📦 Response data:', data);

      if (response.ok) {
        console.log('✅ Tenant actualizado exitosamente');
        setSuccess(true);
        setTimeout(() => {
          router.push(`/admin/tenants/${tenantId}`);
        }, 2000);
      } else {
        console.log('❌ Error al actualizar tenant:', data.error);
        setError(data.error || "Error al actualizar el tenant");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-gray-500">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/tenants")}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Editar Tenant</h1>
          <p className="text-gray-600 mt-2">Actualiza la información y planes de suscripción del tenant</p>
        </div>

        {/* Panel de información del tenant */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <p className="text-sm text-blue-600 font-medium">Empresa</p>
              <p className="text-lg font-semibold text-blue-900">{formData.businessName}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Planes Actuales</p>
              <p className="text-lg font-semibold text-blue-900">{formData.subscriptionPlans.length}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Usuarios Máximos</p>
              <p className="text-lg font-semibold text-blue-900">{formData.maxUsers}</p>
            </div>
            <div>
              <p className="text-sm text-blue-600 font-medium">Costo Mensual</p>
              <p className="text-lg font-semibold text-blue-900">L. {formData.monthlyCost.toLocaleString()}</p>
            </div>
          </div>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800">Tenant actualizado exitosamente. Redirigiendo...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-red-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                Nombre de la Empresa *
              </label>
              <input
                type="text"
                id="businessName"
                name="businessName"
                required
                value={formData.businessName}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: Mi Empresa S.A."
              />
            </div>

            <div>
              <label htmlFor="businessEmail" className="block text-sm font-medium text-gray-700 mb-2">
                Email de la Empresa *
              </label>
              <input
                type="email"
                id="businessEmail"
                name="businessEmail"
                required
                value={formData.businessEmail}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="empresa@ejemplo.com"
              />
            </div>

            <div>
              <label htmlFor="businessRTN" className="block text-sm font-medium text-gray-700 mb-2">
                RTN
              </label>
              <input
                type="text"
                id="businessRTN"
                name="businessRTN"
                value={formData.businessRTN}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 0801-1990-12345"
              />
            </div>

            <div>
              <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Teléfono
              </label>
              <input
                type="tel"
                id="phoneNumber"
                name="phoneNumber"
                value={formData.phoneNumber}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: +504 2200-0000"
              />
            </div>

            <div>
              <label htmlFor="businessAddress" className="block text-sm font-medium text-gray-700 mb-2">
                Dirección
              </label>
              <textarea
                id="businessAddress"
                name="businessAddress"
                value={formData.businessAddress}
                onChange={handleChange}
                rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Dirección completa de la empresa"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  📋 Planes de Suscripción
                </label>
                <div className="bg-white border border-gray-300 rounded-lg p-4">
                  <div className="mb-3">
                    <p className="text-xs text-gray-500 mb-2">Planes disponibles para agregar:</p>
                    <div className="space-y-2 max-h-48 overflow-y-auto">
                      {plans.length === 0 ? (
                        <p className="text-gray-500 text-center py-4">Cargando planes...</p>
                      ) : (
                        plans.map((plan) => {
                          const isSelected = formData.subscriptionPlans.some((p: any) => p.code === plan.code);
                          const quantity = formData.subscriptionPlans.find((p: any) => p.code === plan.code)?.quantity || 0;
                          
                          return (
                            <div key={plan.id} className={`border rounded-lg p-4 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                              <div className="flex items-center justify-between mb-3">
                                <div>
                                  <h3 className="font-medium text-gray-900">{plan.name}</h3>
                                  <p className="text-sm text-gray-600">{plan.description}</p>
                                  <div className="mt-2 space-y-1">
                                    <p className="text-xs text-gray-500">Precio: L. {plan.unitPrice?.toLocaleString() || '0'}/mes</p>
                                    <p className="text-xs text-gray-500">Usuarios: {plan.maxUsers || 'Ilimitado'}</p>
                                    {plan.features && (
                                      <p className="text-xs text-gray-500">
                                        Características: {plan.features.slice(0, 3).join(', ')}
                                        {plan.features.length > 3 && '...'}
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  {quantity === 0 ? (
                                    <button
                                      type="button"
                                      onClick={() => handlePlanToggle(plan.code)}
                                      className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm"
                                    >
                                      ➕ Agregar
                                    </button>
                                  ) : (
                                    <div className="flex items-center space-x-2">
                                      <button
                                        type="button"
                                        onClick={() => handleQuantityChange(plan.code, quantity - 1)}
                                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                                      >
                                        -
                                      </button>
                                      <span className="text-sm font-medium px-2">{quantity}</span>
                                      <button
                                        type="button"
                                        onClick={() => handleQuantityChange(plan.code, quantity + 1)}
                                        className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm"
                                      >
                                        +
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handlePlanToggle(plan.code)}
                                        className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                                      >
                                        Eliminar
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                  
                  {formData.subscriptionPlans.length > 0 && (
                    <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-800">
                            ✅ {formData.subscriptionPlans.length} plan(es) seleccionado(s)
                          </p>
                          <p className="text-xs text-green-600 mt-1">
                            Total usuarios: {formData.maxUsers} | Costo mensual: L. {formData.monthlyCost.toLocaleString()}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              subscriptionPlans: [],
                              maxUsers: 5,
                              monthlyCost: 0
                            }));
                          }}
                          className="text-xs px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200"
                        >
                          Limpiar planes
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label htmlFor="maxUsers" className="block text-sm font-medium text-gray-700 mb-2">
                  👥 Máximo de Usuarios
                </label>
                <input
                  type="number"
                  id="maxUsers"
                  name="maxUsers"
                  min="1"
                  max="100"
                  value={formData.maxUsers || 5}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Número máximo de usuarios"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Este valor se calcula automáticamente basado en los planes seleccionados
                </p>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">Módulos Disponibles</label>
                <div className="flex space-x-2">
                  <button
                    type="button"
                    onClick={handleSelectAllModules}
                    className="text-xs px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors"
                  >
                    Seleccionar todos
                  </button>
                  <button
                    type="button"
                    onClick={handleDeselectAllModules}
                    className="text-xs px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors"
                  >
                    Deseleccionar todos
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {availableModules.map((module) => (
                  <div
                    key={module.id}
                    onClick={() => handleModuleToggle(module.id)}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      formData.modules.includes(module.id)
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-300 hover:border-gray-400'
                    }`}
                  >
                    <div className="flex items-start">
                      <div className={`w-5 h-5 rounded border-2 mr-3 mt-0.5 flex-shrink-0 ${
                        formData.modules.includes(module.id)
                          ? 'bg-blue-600 border-blue-600'
                          : 'border-gray-300'
                      }`}>
                        {formData.modules.includes(module.id) && (
                          <svg className="w-3 h-3 text-white mt-0.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{module.name}</p>
                        <p className="text-xs text-gray-500">{module.description}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
              <button
                type="button"
                onClick={() => router.push("/admin/tenants")}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
