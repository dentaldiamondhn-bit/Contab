"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { MODULES, getModuleLimits, type PlanModuleConfig } from "@/lib/constants/modules";

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  maxUsers: number;
  maxStorage: number;
  maxTransactions: number;
  features: string[];
  modules: PlanModuleConfig[];
  isActive: boolean;
}

export default function CreateTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [adminTempPassword, setAdminTempPassword] = useState<string | null>(null);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadedPlans, setLoadedPlans] = useState<any[]>([]);

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
    adminFirstName: string;
    adminLastName: string;
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
    adminFirstName: "",
    adminLastName: "",
  });

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

  const computeModulesFromPlans = (selectedPlans: { code: string; quantity: number }[]): PlanModuleConfig[] => {
    const moduleMap = new Map<string, PlanModuleConfig>();
    selectedPlans.forEach(sp => {
      const plan = loadedPlans.find(lp => lp.code === sp.code);
      if (plan?.modules && Array.isArray(plan.modules)) {
        plan.modules.forEach((m: PlanModuleConfig) => {
          if (!moduleMap.has(m.id)) {
            // Primera vez que vemos este módulo, copiar su config completa
            moduleMap.set(m.id, { ...m });
          } else {
            // Ya existe, fusionar límites (tomar el mayor)
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
  }, []);

  const fetchPlans = async () => {
    try {
      const response = await fetch("/api/admin/plans-public");
      if (response.ok) {
        const data = await response.json();
        const loadedPlans = data.plans || [];
        setPlans(loadedPlans);
        setLoadedPlans(loadedPlans);
      }
    } catch (err) {
      console.error("Error cargando planes:", err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === "maxUsers") return;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePlanToggle = (planCode: string) => {
    setFormData(prev => {
      const existingPlanIndex = prev.subscriptionPlans.findIndex((p: { code: string; quantity: number }) => p.code === planCode);
      let newPlans;
      
      if (existingPlanIndex >= 0) {
        newPlans = [...prev.subscriptionPlans];
        newPlans[existingPlanIndex].quantity += 1;
      } else {
        newPlans = [...prev.subscriptionPlans, { code: planCode, quantity: 1 }];
      }
      
      const totalMaxUsers = loadedPlans
        .filter(p => newPlans.some((np: { code: string; quantity: number }) => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find((np: { code: string; quantity: number }) => np.code === p.code);
          return sum + (p.maxUsers * (planWithQuantity?.quantity || 1));
        }, 0);
      
      const totalMaxStorage = loadedPlans
        .filter(p => newPlans.some((np: { code: string; quantity: number }) => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find((np: { code: string; quantity: number }) => np.code === p.code);
          return sum + ((p.maxStorage || 0) * (planWithQuantity?.quantity || 1));
        }, 0);
      
      const totalMonthlyCost = loadedPlans
        .filter(p => newPlans.some((np: { code: string; quantity: number }) => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find((np: { code: string; quantity: number }) => np.code === p.code);
          return sum + ((p.unitPrice || 0) * (planWithQuantity?.quantity || 1));
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
      let newPlans;
      
      if (newQuantity === 0) {
        newPlans = prev.subscriptionPlans.filter(p => p.code !== planCode);
      } else {
        const existingPlan = prev.subscriptionPlans.find(p => p.code === planCode);
        if (existingPlan) {
          newPlans = prev.subscriptionPlans.map(p => 
            p.code === planCode ? { ...p, quantity: newQuantity } : p
          );
        } else {
          newPlans = [...prev.subscriptionPlans, { code: planCode, quantity: newQuantity }];
        }
      }
      
      const totalMaxUsers = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find(np => np.code === p.code);
          return sum + (p.maxUsers * (planWithQuantity?.quantity || 1));
        }, 0);
      
      const totalMaxStorage = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find(np => np.code === p.code);
          return sum + ((p.maxStorage || 0) * (planWithQuantity?.quantity || 1));
        }, 0);
      
      const totalMonthlyCost = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find(np => np.code === p.code);
          return sum + ((p.unitPrice || 0) * (planWithQuantity?.quantity || 1));
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
      const newPlans = prev.subscriptionPlans.filter(p => p.code !== planCode);
      
      const totalMonthlyCost = newPlans.reduce((sum, p) => {
        const plan = loadedPlans.find(lp => lp.code === p.code);
        return sum + (plan?.unitPrice || 0) * p.quantity;
      }, 0);
      
      const totalMaxUsers = newPlans.reduce((sum, p) => {
        const plan = loadedPlans.find(lp => lp.code === p.code);
        return sum + (plan?.maxUsers || 0) * p.quantity;
      }, 0);
      
      const totalMaxStorage = newPlans.reduce((sum, p) => {
        const plan = loadedPlans.find(lp => lp.code === p.code);
        return sum + (plan?.maxStorage || 0) * p.quantity;
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
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/admin/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          businessName: formData.businessName,
          businessEmail: formData.businessEmail,
          businessRTN: formData.businessRTN,
          phoneNumber: formData.phoneNumber,
          businessAddress: formData.businessAddress,
          subscriptionPlans: formData.subscriptionPlans,
          maxUsers: formData.maxUsers,
          maxStorage: formData.maxStorage,
          monthlyCost: formData.monthlyCost,
          modules: formData.modules,
          adminUser: {
            email: formData.businessEmail,
            firstName: formData.adminFirstName,
            lastName: formData.adminLastName,
          }
        }),
      });

      const data = await response.json().catch(() => null);

      if (response.ok) {
        if (data?.adminError) {
          setError(`Tenant creado, pero error al crear admin: ${data.adminError}`);
        } else {
          setAdminTempPassword(data?.admin?.tempPassword || null);
          setSuccess(true);
        }
      } else {
        const errorMsg = data?.error || data?.message || `Error ${response.status}: No se pudo crear el tenant`;
        setError(errorMsg);
      }
    } catch (err: any) {
      console.error("Error en handleSubmit:", err);
      setError(err?.message || "Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este plan? Esta acción no se puede deshacer.')) {
      setLoadedPlans(prev => prev.filter(plan => plan.id !== planId));
      setPlans(prev => prev.filter(plan => plan.id !== planId));
      
      const planToDelete = loadedPlans.find(plan => plan.id === planId);
      if (planToDelete) {
        handleRemovePlan(planToDelete.code);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/tenants")}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Tenant</h1>
          <p className="text-gray-600 mt-2">Registra una nueva empresa en el sistema</p>
        </div>

        {success && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100 mb-4">
                  <svg className="h-10 w-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Tenant Creado</h3>
                <p className="text-gray-600 mb-4">El tenant y el usuario admin fueron creados correctamente.</p>
                {adminTempPassword && (
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-4 text-left">
                    <p className="text-sm font-medium text-yellow-800 mb-2">Password temporal del admin:</p>
                    <code className="block bg-white border border-yellow-300 rounded px-3 py-2 text-sm font-mono text-gray-900 select-all">{adminTempPassword}</code>
                    <p className="text-xs text-yellow-700 mt-2">El admin debe cambiar esta contraseña al iniciar sesión.</p>
                  </div>
                )}
                <button
                  onClick={() => router.push("/admin/tenants")}
                  className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  Ver lista de tenants
                </button>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl p-8 max-w-md mx-4">
              <div className="text-center">
                <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 mb-4">
                  <svg className="h-10 w-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">Error al Crear Tenant</h3>
                <p className="text-gray-600 mb-6">{error}</p>
                <button
                  onClick={() => setError("")}
                  className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                >
                  Cerrar
                </button>
              </div>
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
                placeholder="Ej: contacto@miempresa.com"
              />
            </div>

            <div>
              <label htmlFor="businessRTN" className="block text-sm font-medium text-gray-700 mb-2">
                RTN *
              </label>
              <input
                type="text"
                id="businessRTN"
                name="businessRTN"
                required
                value={formData.businessRTN}
                onChange={handleChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Ej: 12345678901234"
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
                placeholder="Ej: +504 1234-5678"
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
                placeholder="Ej: Calle Principal #123, Ciudad, País"
              />
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Planes de Suscripción
                </label>
                <div className="border rounded-lg p-4 bg-gray-50">
                  <p className="text-sm text-gray-600 mb-4">{loadedPlans.length} plan(es) disponible(s)</p>
                  
                  {loadedPlans.map((plan, index) => {
                    const planInForm = formData.subscriptionPlans.find(p => p.code === plan.code);
                    const quantity = planInForm?.quantity || 0;
                    
                    return (
                      <div key={plan.id} className="border rounded-lg p-3 mb-2 bg-white">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-gray-900">{plan.name}</h4>
                            <p className="text-sm text-gray-600">{plan.description}</p>
                            <p className="text-sm font-semibold text-blue-600">L. {plan.unitPrice}/mes</p>
                            <p className="text-xs text-gray-500">Máximo {plan.maxUsers} usuarios</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              if (confirm('¿Estás seguro de que quieres eliminar este plan?')) {
                                setLoadedPlans(prev => prev.filter(p => p.id !== plan.id));
                              }
                            }}
                            className="ml-2 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-sm"
                            title="Eliminar plan"
                          >
                            🗑️
                          </button>
                        </div>
                        
                        {/* Controles de cantidad */}
                        <div className="mt-3 flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(plan.code, Math.max(0, quantity - 1))}
                              className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 disabled:opacity-50"
                              disabled={quantity === 0}
                            >
                              -
                            </button>
                            <span className="px-3 py-1 bg-gray-100 rounded min-w-[50px] text-center font-medium">
                              {quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(plan.code, quantity + 1)}
                              className="px-2 py-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-semibold text-green-600">
                              Subtotal: L. {(plan.unitPrice * quantity).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        
                        <button 
                          type="button"
                          onClick={() => quantity === 0 ? handlePlanToggle(plan.code) : handleRemovePlan(plan.code)}
                          className={`mt-2 px-4 py-2 rounded w-full ${
                            quantity === 0 
                              ? 'bg-blue-600 text-white hover:bg-blue-700' 
                              : 'bg-orange-600 text-white hover:bg-orange-700'
                          }`}
                        >
                          {quantity === 0 ? 'Agregar Plan' : 'Quitar Plan'}
                        </button>
                      </div>
                    );
                  })}
                </div>
                {formData.subscriptionPlans.length > 0 && (
                  <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                    <p className="text-xs text-blue-800 font-medium">
                      {formData.subscriptionPlans.length} plan(es) seleccionado(s)
                    </p>
                    <p className="text-sm text-blue-900 font-semibold">
                      Costo total mensual: L {(formData.monthlyCost || 0).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="maxUsers" className="block text-sm font-medium text-gray-700 mb-2">
                    Máximo de Usuarios
                  </label>
                  <input
                    type="number"
                    id="maxUsers"
                    name="maxUsers"
                    readOnly
                    value={formData.maxUsers || 0}
                    className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Definido por el plan</p>
                </div>
                <div>
                  <label htmlFor="maxStorage" className="block text-sm font-medium text-gray-700 mb-2">
                    Almacenamiento (GB)
                  </label>
                  <input
                    type="number"
                    id="maxStorage"
                    name="maxStorage"
                    readOnly
                    value={formData.maxStorage || 0}
                    className="w-full px-4 py-2 border border-gray-200 bg-gray-50 rounded-lg text-gray-700 cursor-not-allowed"
                  />
                  <p className="text-xs text-gray-500 mt-1">Definido por el plan</p>
                </div>
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Usuario Administrador</h3>
              <p className="text-sm text-gray-600 mb-4">Se enviará una invitación al email de la empresa (<strong>{formData.businessEmail || '...'}</strong>) para que el admin cree su cuenta</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adminFirstName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="adminFirstName"
                    name="adminFirstName"
                    value={formData.adminFirstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Juan"
                  />
                </div>

                <div>
                  <label htmlFor="adminLastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido
                  </label>
                  <input
                    type="text"
                    id="adminLastName"
                    name="adminLastName"
                    value={formData.adminLastName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Pérez"
                  />
                </div>
              </div>
            </div>

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
                              <div
                                key={module.id}
                                className="p-3 border border-green-300 bg-green-50 rounded-lg"
                              >
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
              <button
                type="button"
                onClick={() => router.push("/admin/tenants")}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Creando..." : "Crear Tenant"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
