"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { MODULES, getModuleLimits, type PlanModuleConfig } from "@/lib/constants/modules";

interface Plan {
  id: string;
  code: string;
  name: string;
  description: string;
  unitPrice: number;
  maxUsers: number;
  maxStorage: number;
  maxTransactions: number;
  features: string[];
  modules: PlanModuleConfig[];
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
  const [loadedPlans, setLoadedPlans] = useState<Plan[]>([]);

  const [formData, setFormData] = useState<{
    businessName: string;
    businessEmail: string;
    businessRTN: string;
    phoneNumber: string;
    businessAddress: string;
    subscriptionPlans: { code: string; quantity: number }[];
    maxUsers: number;
    maxStorage: number;
    monthlyCost: number;
    modules: PlanModuleConfig[];
  }>({
    businessName: "",
    businessEmail: "",
    businessRTN: "",
    phoneNumber: "",
    businessAddress: "",
    subscriptionPlans: [],
    maxUsers: 0,
    maxStorage: 0,
    monthlyCost: 0,
    modules: [] as PlanModuleConfig[],
  });

  const availableModules = Object.values(MODULES).filter(m => !m.hidden && !m.required);

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

  const computeModulesFromPlans = (selectedPlans: { code: string; quantity: number }[]): PlanModuleConfig[] => {
    const moduleMap = new Map<string, PlanModuleConfig>();
    selectedPlans.forEach(sp => {
      const plan = loadedPlans.find(lp => lp.code === sp.code);
      if (plan?.modules && Array.isArray(plan.modules)) {
        plan.modules.forEach((m: PlanModuleConfig) => {
          if (!moduleMap.has(m.id)) {
            moduleMap.set(m.id, { ...m });
          } else {
            const existing = moduleMap.get(m.id)!;
            const limitDefs = getModuleLimits(m.id);
            limitDefs.forEach(ld => {
              const val = (m as any)[ld.key] ?? ld.defaultValue;
              const existVal = (existing as any)[ld.key] ?? ld.defaultValue;
              (existing as any)[ld.key] = Math.max(val, existVal);
            });
          }
        });
      }
    });
    // Soporte siempre incluido
    if (!moduleMap.has('SUPPORT')) {
      moduleMap.set('SUPPORT', { id: 'SUPPORT' });
    }
    return Array.from(moduleMap.values());
  };

  useEffect(() => {
    fetchPlans();
    fetchTenant();
  }, [tenantId]);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans-public");
      if (response.ok) {
        const data = await response.json();
        setLoadedPlans(data.plans || []);
      }
    } catch (err) {
      console.error("Error cargando planes:", err);
    }
  };

  const fetchTenant = async () => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`);
      if (!response.ok) throw new Error("Error al cargar el tenant");
      const data = await response.json();

      const plans = data.subscriptionPlans
        ? (typeof data.subscriptionPlans === 'string' ? JSON.parse(data.subscriptionPlans) : data.subscriptionPlans)
        : data.subscriptionPlan
          ? (typeof data.subscriptionPlan === 'string' ? JSON.parse(data.subscriptionPlan) : data.subscriptionPlan)
          : [];

      // Parse modules: could be comma-separated string or array of objects
      let parsedModules: PlanModuleConfig[] = [];
      if (data.modules) {
        if (typeof data.modules === 'string') {
          parsedModules = data.modules.split(',').filter(Boolean).map((m: string) => ({ id: m.trim() }));
        } else if (Array.isArray(data.modules)) {
          parsedModules = data.modules.map((m: any) => {
            if (typeof m === 'string') return { id: m };
            if (m && typeof m === 'object' && m.id) return m;
            return null;
          }).filter(Boolean);
        }
      }

      setFormData({
        businessName: data.businessName || "",
        businessEmail: data.businessEmail || "",
        businessRTN: data.businessRTN || "",
        phoneNumber: data.phoneNumber || "",
        businessAddress: data.businessAddress || "",
        subscriptionPlans: plans,
        maxUsers: data.maxUsers || 0,
        maxStorage: data.maxStorage || 0,
        monthlyCost: data.monthlyCost || 0,
        modules: parsedModules,
      });
    } catch (err) {
      setError("Error al cargar el tenant");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handlePlanToggle = (planCode: string) => {
    setFormData(prev => {
      const currentPlans = Array.isArray(prev.subscriptionPlans) ? prev.subscriptionPlans : [];
      const existingIndex = currentPlans.findIndex((p: { code: string; quantity: number }) => p.code === planCode);
      let newPlans;

      if (existingIndex >= 0) {
        newPlans = currentPlans.filter((p: { code: string; quantity: number }) => p.code !== planCode);
      } else {
        newPlans = [...currentPlans, { code: planCode, quantity: 1 }];
      }

      const totalMaxUsers = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const pwq = newPlans.find(np => np.code === p.code);
          return sum + (p.maxUsers * (pwq?.quantity || 1));
        }, 0);

      const totalMaxStorage = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const pwq = newPlans.find(np => np.code === p.code);
          return sum + ((p.maxStorage || 0) * (pwq?.quantity || 1));
        }, 0);

      const totalMonthlyCost = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const pwq = newPlans.find(np => np.code === p.code);
          return sum + ((p.unitPrice || 0) * (pwq?.quantity || 1));
        }, 0);

      return {
        ...prev,
        subscriptionPlans: newPlans,
        maxUsers: totalMaxUsers,
        maxStorage: totalMaxStorage,
        monthlyCost: totalMonthlyCost,
        modules: computeModulesFromPlans(newPlans),
      };
    });
  };

  const handleQuantityChange = (planCode: string, newQuantity: number) => {
    if (newQuantity < 0) return;

    setFormData(prev => {
      const currentPlans = Array.isArray(prev.subscriptionPlans) ? prev.subscriptionPlans : [];
      let newPlans;

      if (newQuantity === 0) {
        newPlans = currentPlans.filter(p => p.code !== planCode);
      } else {
        newPlans = currentPlans.map(p =>
          p.code === planCode ? { ...p, quantity: newQuantity } : p
        );
      }

      const totalMaxUsers = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const pwq = newPlans.find(np => np.code === p.code);
          return sum + (p.maxUsers * (pwq?.quantity || 1));
        }, 0);

      const totalMaxStorage = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const pwq = newPlans.find(np => np.code === p.code);
          return sum + ((p.maxStorage || 0) * (pwq?.quantity || 1));
        }, 0);

      const totalMonthlyCost = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const pwq = newPlans.find(np => np.code === p.code);
          return sum + ((p.unitPrice || 0) * (pwq?.quantity || 1));
        }, 0);

      return {
        ...prev,
        subscriptionPlans: newPlans,
        maxUsers: totalMaxUsers,
        maxStorage: totalMaxStorage,
        monthlyCost: totalMonthlyCost,
        modules: computeModulesFromPlans(newPlans),
      };
    });
  };

  const handleRemovePlan = (planCode: string) => {
    setFormData(prev => {
      const currentPlans = Array.isArray(prev.subscriptionPlans) ? prev.subscriptionPlans : [];
      const newPlans = currentPlans.filter(p => p.code !== planCode);

      const totalMaxUsers = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const pwq = newPlans.find(np => np.code === p.code);
          return sum + (p.maxUsers * (pwq?.quantity || 1));
        }, 0);

      const totalMaxStorage = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const pwq = newPlans.find(np => np.code === p.code);
          return sum + ((p.maxStorage || 0) * (pwq?.quantity || 1));
        }, 0);

      const totalMonthlyCost = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const pwq = newPlans.find(np => np.code === p.code);
          return sum + ((p.unitPrice || 0) * (pwq?.quantity || 1));
        }, 0);

      return {
        ...prev,
        subscriptionPlans: newPlans,
        maxUsers: totalMaxUsers,
        maxStorage: totalMaxStorage,
        monthlyCost: totalMonthlyCost,
        modules: computeModulesFromPlans(newPlans),
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: formData.businessName,
          businessEmail: formData.businessEmail,
          businessRTN: formData.businessRTN,
          phoneNumber: formData.phoneNumber,
          businessAddress: formData.businessAddress,
          subscriptionPlans: JSON.stringify(formData.subscriptionPlans),
          maxUsers: formData.maxUsers,
          maxStorage: formData.maxStorage,
          monthlyCost: formData.monthlyCost,
          modules: formData.modules,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        setTimeout(() => router.push(`/admin/tenants/${tenantId}`), 2000);
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

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-800">Tenant actualizado exitosamente</p>
          </div>
        )}

        <div className="bg-white rounded-lg shadow p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Nombre de la Empresa *</label>
              <input type="text" name="businessName" required value={formData.businessName} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email de la Empresa *</label>
              <input type="email" name="businessEmail" required value={formData.businessEmail} onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">RTN</label>
                <input type="text" name="businessRTN" value={formData.businessRTN} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Teléfono</label>
                <input type="tel" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Dirección</label>
              <textarea name="businessAddress" value={formData.businessAddress} onChange={handleChange} rows={3}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" />
            </div>

            {/* Planes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Planes de Suscripción</label>
              <div className="bg-white border border-gray-300 rounded-lg p-4">
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {loadedPlans.filter(p => p.isActive).map((plan) => {
                    const isSelected = formData.subscriptionPlans.some((p: any) => p.code === plan.code);
                    const quantity = formData.subscriptionPlans.find((p: any) => p.code === plan.code)?.quantity || 0;

                    return (
                      <div key={plan.id} className={`border rounded-lg p-3 ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'}`}>
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="font-medium text-gray-900">{plan.name}</h3>
                            <p className="text-xs text-gray-500">L. {plan.unitPrice?.toLocaleString()}/mes | {plan.maxUsers} usuarios | {plan.maxStorage || 0} GB</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            {quantity === 0 ? (
                              <button type="button" onClick={() => handlePlanToggle(plan.code)}
                                className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-sm">
                                Agregar
                              </button>
                            ) : (
                              <div className="flex items-center space-x-2">
                                <button type="button" onClick={() => handleQuantityChange(plan.code, quantity - 1)}
                                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">-</button>
                                <span className="text-sm font-medium px-2">{quantity}</span>
                                <button type="button" onClick={() => handleQuantityChange(plan.code, quantity + 1)}
                                  className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 text-sm">+</button>
                                <button type="button" onClick={() => handlePlanToggle(plan.code)}
                                  className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm">Eliminar</button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {formData.subscriptionPlans.length > 0 && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800 font-medium">{formData.subscriptionPlans.length} plan(es) seleccionado(s)</p>
                    <p className="text-sm text-blue-900 font-semibold">Costo total mensual: L. {(formData.monthlyCost || 0).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Max Users + Max Storage */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Máximo de Usuarios</label>
                <input type="number" readOnly value={formData.maxUsers || 0}
                  className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">Definido por el plan</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Almacenamiento (GB)</label>
                <input type="number" readOnly value={formData.maxStorage || 0}
                  className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700 cursor-not-allowed" />
                <p className="text-xs text-gray-500 mt-1">Definido por el plan</p>
              </div>
            </div>

            {/* Módulos */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <label className="block text-sm font-medium text-gray-700">Módulos del Tenant</label>
                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">Se asignan automáticamente según el plan seleccionado</span>
              </div>
              {formData.modules.length === 0 ? (
                <p className="text-sm text-gray-500 italic">Seleccioná un plan para ver los módulos que incluye</p>
              ) : (
                <div className="space-y-4">
                  {moduleCategories.map((category) => {
                    const categoryModules = availableModules.filter(m => m.category === category && formData.modules.some(fm => fm.id === m.id));
                    if (categoryModules.length === 0) return null;
                    return (
                      <div key={category}>
                        <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">{categoryLabels[category] || category}</h4>
                        <div className="grid grid-cols-2 gap-3">
                          {categoryModules.map((module) => {
                            const moduleConfig = formData.modules.find(fm => fm.id === module.id);
                            const limitDefs = getModuleLimits(module.id);
                            return (
                              <div key={module.id} className="p-3 border border-green-300 bg-green-50 rounded-lg">
                                <div className="flex items-start">
                                  <div className="w-5 h-5 rounded border-2 mr-3 mt-0.5 flex-shrink-0 bg-green-600 border-green-600">
                                    <svg className="w-3 h-3 text-white mt-0.5 ml-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                    </svg>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-medium text-gray-900">{module.name}</p>
                                    <p className="text-xs text-gray-500">{module.description}</p>
                                    {limitDefs.length > 0 && moduleConfig && (
                                      <div className="mt-1 space-y-0.5">
                                        {limitDefs.map(ld => (
                                          <p key={ld.key} className="text-xs text-blue-700 font-medium">
                                            {ld.label}: {(moduleConfig as any)[ld.key] ?? ld.defaultValue} {ld.unit}
                                          </p>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {formData.modules.length > 0 && (
                <p className="text-xs text-gray-500 mt-3">{formData.modules.length} módulo(s) asignado(s) por el plan</p>
              )}
            </div>

            <div className="flex items-center justify-end space-x-4 pt-4 border-t">
              <button type="button" onClick={() => router.push("/admin/tenants")}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50">
                Cancelar
              </button>
              <button type="submit" disabled={saving}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {saving ? 'Guardando...' : 'Guardar Cambios'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
