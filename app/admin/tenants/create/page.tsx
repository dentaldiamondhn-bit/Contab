"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function CreateTenantPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    businessName: "",
    businessEmail: "",
    businessRTN: "",
    phoneNumber: "",
    businessAddress: "",
    subscriptionPlan: "BASIC",
    maxUsers: 5,
    modules: [] as string[],
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === "maxUsers" ? parseInt(value) : value
    }));
  };

  const handleModuleToggle = (moduleId: string) => {
    setFormData(prev => ({
      ...prev,
      modules: prev.modules.includes(moduleId)
        ? prev.modules.filter(m => m !== moduleId)
        : [...prev.modules, moduleId]
    }));
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
          ...formData,
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
        setError(data.error || "Error al crear el tenant");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

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
          <h1 className="text-3xl font-bold text-gray-900">Crear Nuevo Tenant</h1>
          <p className="text-gray-600 mt-2">Registra una nueva empresa en el sistema</p>
        </div>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-green-800">Tenant creado exitosamente. Redirigiendo...</p>
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="subscriptionPlan" className="block text-sm font-medium text-gray-700 mb-2">
                  Plan de Suscripción
                </label>
                <select
                  id="subscriptionPlan"
                  name="subscriptionPlan"
                  value={formData.subscriptionPlan}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="BASIC">Básico</option>
                  <option value="PROFESSIONAL">Profesional</option>
                  <option value="ENTERPRISE">Empresarial</option>
                </select>
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
              <label className="block text-sm font-medium text-gray-700 mb-4">Módulos Disponibles</label>
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
