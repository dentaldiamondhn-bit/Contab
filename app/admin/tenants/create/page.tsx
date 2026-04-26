"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

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

export default function CreateTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loadedPlans, setLoadedPlans] = useState<any[]>([]);

  const [formData, setFormData] = useState<{
    businessName: string;
    businessEmail: string;
    businessRTN: string;
    phoneNumber: string;
    businessAddress: string;
    subscriptionPlans: { code: string; quantity: number }[]; // Array con código y cantidad
    maxUsers: number;
    monthlyCost: number;
    modules: string[];
    adminEmail: string;
    adminFirstName: string;
    adminLastName: string;
    adminPassword: string;
  }>({
    businessName: "",
    businessEmail: "",
    businessRTN: "",
    phoneNumber: "",
    businessAddress: "",
    subscriptionPlans: [], // Array de planes con cantidad
    maxUsers: 5,
    monthlyCost: 0,
    modules: [],
    // Admin user fields
    adminEmail: "",
    adminFirstName: "",
    adminLastName: "",
    adminPassword: "",
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
  }, []);

  // Debug: Log when loadedPlans changes
  useEffect(() => {
    console.log('useEffect - loadedPlans.length:', loadedPlans.length, 'loadedPlans:', loadedPlans);
  }, [loadedPlans]);

  const fetchPlans = async () => {
    try {
      console.log('Cargando planes desde /api/admin/plans-public...');
      const response = await fetch("/api/admin/plans-public");
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Planes recibidos:', data);
        const loadedPlans = data.plans || [];
        setPlans(loadedPlans);
        setLoadedPlans(loadedPlans);
        console.log('Planes establecidos:', loadedPlans.length);
        console.log('Estado actual de plans:', plans);
        console.log('Estado actual de loadedPlans:', loadedPlans);
        setFormData(prev => ({
          ...prev,
          subscriptionPlans: [{ code: loadedPlans[0].code, quantity: 1 }],
          maxUsers: 5,
          monthlyCost: loadedPlans[0].unitPrice
        }));
      } else {
        console.error('Error en respuesta de planes:', response.status);
        const errorData = await response.json();
        console.error('Error data:', errorData);
      }
    } catch (err) {
      console.error("Error cargando planes:", err);
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
      const totalMaxUsers = loadedPlans
        .filter(p => newPlans.some((np: { code: string; quantity: number }) => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find((np: { code: string; quantity: number }) => np.code === p.code);
          return Math.max(sum, p.maxUsers * (planWithQuantity?.quantity || 1));
        }, 5);
      
      // Calcular el costo total mensual
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
        monthlyCost: totalMonthlyCost
      };
    });
  };

  const handleQuantityChange = (planCode: string, newQuantity: number) => {
    if (newQuantity < 0) return;
    
    setFormData(prev => {
      let newPlans;
      
      if (newQuantity === 0) {
        // Si la cantidad es 0, eliminar el plan
        newPlans = prev.subscriptionPlans.filter(p => p.code !== planCode);
      } else {
        // Si el plan ya existe, actualizar cantidad, si no, agregarlo
        const existingPlan = prev.subscriptionPlans.find(p => p.code === planCode);
        if (existingPlan) {
          newPlans = prev.subscriptionPlans.map(p => 
            p.code === planCode ? { ...p, quantity: newQuantity } : p
          );
        } else {
          newPlans = [...prev.subscriptionPlans, { code: planCode, quantity: newQuantity }];
        }
      }
      
      // Calcular el maxUsers total basado en los planes seleccionados
      const totalMaxUsers = loadedPlans
        .filter(p => newPlans.some(np => np.code === p.code))
        .reduce((sum, p) => {
          const planWithQuantity = newPlans.find(np => np.code === p.code);
          return Math.max(sum, p.maxUsers * (planWithQuantity?.quantity || 1));
        }, 5);
      
      // Calcular el costo total mensual
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
        monthlyCost: totalMonthlyCost
      };
    });
  };

  const handleRemovePlan = (planCode: string) => {
    setFormData(prev => {
      const newPlans = prev.subscriptionPlans.filter(p => p.code !== planCode);
      
      // Recalcular costo mensual y usuarios
      const totalMonthlyCost = newPlans.reduce((sum, p) => {
        const plan = loadedPlans.find(lp => lp.code === p.code);
        return sum + (plan?.unitPrice || 0) * p.quantity;
      }, 0);
      
      const totalMaxUsers = newPlans.reduce((sum, p) => {
        const plan = loadedPlans.find(lp => lp.code === p.code);
        return sum + (plan?.maxUsers || 0) * p.quantity;
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
    console.log('handleSubmit llamado');
    e.preventDefault();
    console.log('Formulario enviado:', formData);
    setLoading(true);
    setError("");

    // Validar contraseña del admin
    if (formData.adminPassword && formData.adminPassword.length < 8) {
      setError("La contraseña del admin debe tener al menos 8 caracteres");
      setLoading(false);
      return;
    }

    try {
      console.log('Enviando solicitud a /api/admin/tenants...');
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
          subscriptionPlans: JSON.stringify(formData.subscriptionPlans), // Convertir array a JSON string
          maxUsers: formData.maxUsers,
          monthlyCost: formData.monthlyCost,
          modules: formData.modules.join(','),
          // Admin user data
          adminUser: {
            email: formData.adminEmail,
            firstName: formData.adminFirstName,
            lastName: formData.adminLastName,
            password: formData.adminPassword,
          }
        }),
      });

      console.log('Respuesta recibida:', response.status);
      const data = await response.json();
      console.log('Datos de respuesta:', data);

      if (response.ok) {
        setSuccess(true);
        // Redirigir inmediatamente después de mostrar el mensaje de éxito
        setTimeout(() => {
          router.push("/admin/tenants");
        }, 1500);
      } else {
        setError(data.error || "Error al crear el tenant");
      }
    } catch (err) {
      console.error('Error en handleSubmit:', err);
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleDeletePlan = (planId: string) => {
    if (confirm('¿Estás seguro de que quieres eliminar este plan? Esta acción no se puede deshacer.')) {
      // Eliminar el plan de loadedPlans
      setLoadedPlans(prev => prev.filter(plan => plan.id !== planId));
      
      // También eliminar del estado plans si está allí
      setPlans(prev => prev.filter(plan => plan.id !== planId));
      
      // Si el plan estaba en el formulario, eliminarlo también
      const planToDelete = loadedPlans.find(plan => plan.id === planId);
      if (planToDelete) {
        handleRemovePlan(planToDelete.code);
      }
      
      console.log(`🗑️ Plan eliminado: ${planId}`);
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
                <h3 className="text-2xl font-semibold text-gray-900 mb-2">¡Tenant Creado Exitosamente!</h3>
                <p className="text-gray-600 mb-4">El tenant ha sido creado correctamente y el usuario admin ha sido asignado.</p>
                <div className="flex items-center justify-center text-sm text-gray-500">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Redirigiendo a la lista de tenants...
                </div>
              </div>
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
                <div className="border-2 border-blue-500 p-4 bg-blue-50">
                  <h3 className="text-lg font-bold text-blue-800 mb-4">🔍 DEPURACIÓN - Planes de Suscripción</h3>
                  <p className="text-green-600 mb-2">✅ {loadedPlans.length} planes cargados</p>
                  
                  {loadedPlans.map((plan, index) => {
                    console.log(`🔍 MAP DEBUG - Plan ${index}:`, plan);
                    const planInForm = formData.subscriptionPlans.find(p => p.code === plan.code);
                    const quantity = planInForm?.quantity || 0;
                    
                    return (
                      <div key={plan.id} className="border-2 border-green-500 p-3 mb-2 bg-white">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-bold text-lg">{plan.name}</h4>
                            <p className="text-sm text-gray-600">{plan.description}</p>
                            <p className="text-sm font-semibold text-blue-600">L. {plan.unitPrice}/mes</p>
                            <p className="text-xs text-gray-500">Máximo {plan.maxUsers} usuarios</p>
                          </div>
                          <button 
                            type="button"
                            onClick={() => {
                              if (confirm('¿Estás seguro de que quieres eliminar este plan?')) {
                                setLoadedPlans(prev => prev.filter(p => p.id !== plan.id));
                                console.log(`🗑️ Plan eliminado: ${plan.id}`);
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
                  value={formData.maxUsers || 5}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Usuario Administrador</h3>
              <p className="text-sm text-gray-600 mb-4">Se creará automáticamente un usuario administrador para este tenant</p>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="adminEmail" className="block text-sm font-medium text-gray-700 mb-2">
                    Email del Admin *
                  </label>
                  <input
                    type="email"
                    id="adminEmail"
                    name="adminEmail"
                    required
                    value={formData.adminEmail}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="admin@empresa.com"
                  />
                </div>

                <div>
                  <label htmlFor="adminPassword" className="block text-sm font-medium text-gray-700 mb-2">
                    Contraseña Temporal *
                  </label>
                  <input
                    type="text"
                    id="adminPassword"
                    name="adminPassword"
                    required
                    value={formData.adminPassword}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Contraseña temporal"
                  />
                </div>

                <div>
                  <label htmlFor="adminFirstName" className="block text-sm font-medium text-gray-700 mb-2">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    id="adminFirstName"
                    name="adminFirstName"
                    required
                    value={formData.adminFirstName}
                    onChange={handleChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Juan"
                  />
                </div>

                <div>
                  <label htmlFor="adminLastName" className="block text-sm font-medium text-gray-700 mb-2">
                    Apellido *
                  </label>
                  <input
                    type="text"
                    id="adminLastName"
                    name="adminLastName"
                    required
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
