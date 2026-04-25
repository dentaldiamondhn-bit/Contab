"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  maxUsers: number;
  maxStorage: number;
  maxTransactions: number;
  features: string[];
  isActive: boolean;
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
    fetchTenant();
  }, [tenantId]);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans");
      if (response.ok) {
        const data = await response.json();
        setPlans(data.plans || []);
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
        subscriptionPlans: data.subscriptionPlans ? JSON.parse(data.subscriptionPlans) : [],
        maxUsers: data.maxUsers || 5,
        monthlyCost: data.monthlyCost || 0,
        modules: data.modules ? data.modules.split(',') : [],
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
      const existingPlanIndex = prev.subscriptionPlans.findIndex((p: { code: string; quantity: number }) => p.code === planCode);
      let newPlans;
      
      if (existingPlanIndex >= 0) {
        // Si el plan ya existe, incrementar la cantidad
        newPlans = [...prev.subscriptionPlans];
        newPlans[existingPlanIndex].quantity += 1;
      } else {
        // Si no existe, agregar con cantidad 1
        newPlans = [...prev.subscriptionPlans, { code: planCode, quantity: 1 }];
      }
      
      // Calcular el maxUsers total basado en los planes seleccionados
      const totalMaxUsers = plans
        .filter(p => newPlans.some((np: { code: string; quantity: number }) => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find((np: { code: string; quantity: number }) => np.code === p.code);
          return Math.max(sum, p.maxUsers * (planWithQuantity?.quantity || 1));
        }, 5);
      
      // Calcular el costo total mensual
      const totalMonthlyCost = plans
        .filter(p => newPlans.some((np: { code: string; quantity: number }) => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find((np: { code: string; quantity: number }) => np.code === p.code);
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

  const handleQuantityChange = (planCode: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setFormData(prev => {
      const newPlans = prev.subscriptionPlans.map(p => 
        p.code === planCode ? { ...p, quantity: newQuantity } : p
      );
      
      // Calcular el maxUsers total basado en los planes seleccionados
      const totalMaxUsers = plans
        .filter(p => newPlans.some((np: { code: string; quantity: number }) => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find((np: { code: string; quantity: number }) => np.code === p.code);
          return Math.max(sum, p.maxUsers * (planWithQuantity?.quantity || 1));
        }, 5);
      
      // Calcular el costo total mensual
      const totalMonthlyCost = plans
        .filter(p => newPlans.some((np: { code: string; quantity: number }) => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find((np: { code: string; quantity: number }) => np.code === p.code);
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
      const newPlans = prev.subscriptionPlans.filter(p => p.code !== planCode);
      
      // Calcular el maxUsers total basado en los planes seleccionados
      const totalMaxUsers = plans
        .filter(p => newPlans.some((np: { code: string; quantity: number }) => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find((np: { code: string; quantity: number }) => np.code === p.code);
          return Math.max(sum, p.maxUsers * (planWithQuantity?.quantity || 1));
        }, 5);
      
      // Calcular el costo total mensual
      const totalMonthlyCost = plans
        .filter(p => newPlans.some((np: { code: string; quantity: number }) => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find((np: { code: string; quantity: number }) => np.code === p.code);
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
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          subscriptionPlans: JSON.stringify(formData.subscriptionPlans),
          modules: formData.modules.join(',')
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => {
          router.push("/admin/tenants");
        }, 2000);
      } else {
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
      <div className="max-w-2xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/tenants")}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Editar Tenant</h1>
          <p className="text-gray-600 mt-2">Actualiza la información del tenant</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="subscriptionPlan" className="block text-sm font-medium text-gray-700 mb-2">
                  Plan de Suscripción
                </label>
                <div className="space-y-2 max-h-60 overflow-y-auto border border-gray-300 rounded-lg p-3">
                  {plans.length === 0 ? (
                    <p className="text-gray-500">Cargando planes...</p>
                  ) : (
                    plans.map((plan) => {
                      const planInForm = formData.subscriptionPlans.find(p => p.code === plan.code);
                      const quantity = planInForm?.quantity || 0;
                      
                      return (
                        <div key={plan.id} className="border-b border-gray-100 pb-2 last:border-b-0">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => handlePlanToggle(plan.code)}
                                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-sm"
                              >
                                Agregar
                              </button>
                              <span className="text-sm font-medium">
                                {plan.name}
                              </span>
                            </div>
                            <div className="flex items-center space-x-2">
                              <span className="text-sm text-gray-600">
                                L {plan.price.toLocaleString()}/mes
                              </span>
                              {quantity > 0 && (
                                <span className="text-sm font-semibold text-blue-600">
                                  x{quantity}
                                </span>
                              )}
                            </div>
                          </div>
                          {quantity > 0 && (
                            <div className="mt-2 flex items-center space-x-2">
                              <label className="text-xs text-gray-600">Cantidad:</label>
                              <input
                                type="number"
                                min="1"
                                value={quantity}
                                onChange={(e) => handleQuantityChange(plan.code, parseInt(e.target.value))}
                                className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                              />
                              <button
                                type="button"
                                onClick={() => handleRemovePlan(plan.code)}
                                className="text-xs text-red-600 hover:text-red-800"
                              >
                                Eliminar
                              </button>
                              <span className="text-xs text-gray-500">
                                Subtotal: L {(plan.price * quantity).toLocaleString()}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
                {formData.subscriptionPlans.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium">
                      {formData.subscriptionPlans.length} plan(es) seleccionado(s)
                    </p>
                    <p className="text-sm text-blue-900 font-semibold">
                      Costo total mensual: L {formData.monthlyCost.toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label htmlFor="maxUsers" className="block text-sm font-medium text-gray-700 mb-2">
                  Máximo de Usuarios
                </label>
                <input
                  type="number"
                  id="maxUsers"
                  name="maxUsers"
                  min="1"
                  max="100"
                  value={formData.maxUsers}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
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
