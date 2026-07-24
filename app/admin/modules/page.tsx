"use client";

import { useRouter } from "next/navigation";
import { MODULES } from "@/lib/constants/modules";

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

const categoryColors: Record<string, { bg: string; border: string; text: string; icon: string }> = {
  main: { bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-800', icon: '📒' },
  accounting: { bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-800', icon: '📕' },
  sales: { bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-800', icon: '🧾' },
  operations: { bg: 'bg-orange-50', border: 'border-orange-200', text: 'text-orange-800', icon: '📦' },
  analysis: { bg: 'bg-cyan-50', border: 'border-cyan-200', text: 'text-cyan-800', icon: '📊' },
  security: { bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-800', icon: '🔒' },
  taxes: { bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-800', icon: '📑' },
  crm: { bg: 'bg-pink-50', border: 'border-pink-200', text: 'text-pink-800', icon: '👥' },
  support: { bg: 'bg-teal-50', border: 'border-teal-200', text: 'text-teal-800', icon: '🛠️' },
};

const moduleFeatures: Record<string, string[]> = {
  ACCOUNTING: [
    'Registro de transacciones contables',
    'Libro Diario y Libro Mayor',
    'Balance de comprobación',
    'Asientos contables automáticos',
    'Conciliación bancaria',
    'Cuentas por cobrar y pagar',
  ],
  FINANCIAL_STATEMENTS: [
    'Balance General',
    'Estado de Resultados',
    'Estado de Flujo de Efectivo',
    'Estado de Cambios en el Patrimonio',
    'Notas a los estados financieros',
    'Comparativos por período',
  ],
  LEGAL_BOOKS: [
    'Libro de Compras y Ventas',
    'Libro de Retenciones',
    'Libro de Comprobante de Compras',
    'Registro de facturas con CAI',
    'Cumplimiento normativa SAR',
    'Exportación para auditoría',
  ],
  BILLING: [
    'Facturación electrónica con CAI',
    'Notas de crédito y débito',
    'Control de secuencias FACT',
    'Gestión de clientes',
    'Cotizaciones y órdenes de venta',
    'Reportes de ventas',
  ],
  INVENTORY: [
    'Kardex de inventario',
    'Control de stock mínimo y máximo',
    'Entradas y salidas de mercancía',
    'Inventario por almacén',
    'Ajustes de inventario',
    'Reportes de rotación',
  ],
  PURCHASES: [
    'Órdenes de compra',
    'Registro de proveedores',
    'Control de gastos',
    'Compras a crédito',
    'Devoluciones a proveedores',
    'Comparativo de precios',
  ],
  FINANCIAL_CONTROL: [
    'Presupuestos por centro de costo',
    'Flujo de efectivo proyectado',
    'KPIs financieros',
    'Análisis de rentabilidad',
    'Control de devengados',
    'Alertas de presupuesto',
  ],
  REPORTS: [
    'Reportes financieros personalizados',
    'Dashboards interactivos',
    'Exportación a PDF y Excel',
    'Reportes por período',
    'Análisis de tendencias',
    'Reportes comparativos',
  ],
  SECURITY: [
    'Bitácora de auditoría',
    'Control de acceso por rol',
    'Logs de actividad de usuarios',
    'Políticas de contraseñas',
    'Bloqueo de intentos fallidos',
    'Sesiones concurrentes',
  ],
  TAX_REPORTING: [
    'Declaración de ISV (15%)',
    'Retenciones de ISR',
    'Reporte DET mensual',
    'Formulario 221',
    'Reportes para entidades fiscales',
    'Calendario fiscal automático',
  ],
  TAX_INTEGRATION: [
    'Integración con SAR/DGII',
    'Validación de CAI en tiempo real',
    'Reportes automáticos al fisco',
    'Actualización de tablas fiscales',
    'Logs de transmisión fiscal',
    'Monitoreo de estados',
  ],
  CONTACTS: [
    'Directorio de clientes',
    'Directorio de proveedores',
    'Historial de transacciones',
    'Notas y observaciones',
    'Categorización de contactos',
    'Búsqueda avanzada',
  ],
  SUPPORT: [
    'Soporte técnico incluido',
    'Actualizaciones del sistema',
    'Mantenimiento preventivo',
    'Monitoreo de sistema',
    'Respaldo automático',
    'Soporte prioritario',
  ],
};

export default function ModulesPage() {
  const router = useRouter();
  const modules = Object.values(MODULES);
  const categories = [...new Set(modules.map(m => m.category))];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Volver al Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Módulos del Sistema</h1>
          <p className="text-gray-600 mt-2">Características y funcionalidades de cada módulo disponible en Contab</p>
        </div>

        <div className="space-y-8">
          {categories.map((category) => {
            const catModules = modules.filter(m => m.category === category);
            const colors = categoryColors[category] || { bg: 'bg-gray-50', border: 'border-gray-200', text: 'text-gray-800', icon: '📋' };

            return (
              <div key={category}>
                <h2 className={`text-lg font-semibold ${colors.text} mb-4 flex items-center`}>
                  <span className="text-2xl mr-2">{colors.icon}</span>
                  {categoryLabels[category] || category}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {catModules.map((module) => {
                    const features = moduleFeatures[module.id] || [];
                    return (
                      <div
                        key={module.id}
                        className={`${colors.bg} border ${colors.border} rounded-xl p-6 hover:shadow-lg transition-shadow`}
                      >
                        <div className="flex items-center mb-4">
                          <span className="text-3xl mr-3">{colors.icon}</span>
                          <div>
                            <h3 className="font-semibold text-gray-900">{module.name}</h3>
                            <p className="text-xs text-gray-500 uppercase">{module.id}</p>
                          </div>
                        </div>

                        <p className="text-sm text-gray-600 mb-4">{module.description}</p>

                        <div className="border-t pt-4">
                          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Características</h4>
                          <ul className="space-y-2">
                            {features.map((feature, idx) => (
                              <li key={idx} className="flex items-start text-sm text-gray-700">
                                <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                                {feature}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
