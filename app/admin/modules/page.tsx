"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MODULES, getModuleLimits, type PlanModuleConfig } from "@/lib/constants/modules";

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

interface ModuleStructure {
  features: string[];
  pages: { label: string; path: string }[];
  apis: { label: string; path: string }[];
}

const moduleStructure: Record<string, ModuleStructure> = {
  ACCOUNTING: {
    features: [
      'Registro de transacciones contables',
      'Libro Diario y Libro Mayor',
      'Balance de comprobación',
      'Asientos contables automáticos',
      'Conciliación bancaria',
      'Cuentas por cobrar y pagar',
    ],
    pages: [
      { label: 'Contabilidad', path: '/accounting' },
      { label: 'Cuentas Contables', path: '/accounting/accounts' },
      { label: 'Libros Contables', path: '/accounting/books' },
      { label: 'Libro Integrado', path: '/accounting/integrated-books' },
      { label: 'Libro Diario', path: '/accounting/journal' },
      { label: 'Reportes', path: '/accounting/reports' },
      { label: 'Impuestos', path: '/accounting/taxes' },
      { label: 'Asiento de Diario', path: '/companies/[id]/accounting/journal' },
      { label: 'Cuentas', path: '/companies/[id]/accounting/accounts' },
      { label: 'Libros', path: '/companies/[id]/accounting/books' },
      { label: 'Simple', path: '/companies/[id]/accounting/simple' },
      { label: 'Formulario de Comprobante', path: '/companies/[id]/accounting/voucher-form' },
      { label: 'Reportes Contables', path: '/companies/[id]/accounting/reports' },
    ],
    apis: [
      { label: 'Cuentas', path: '/api/accounting/accounts' },
      { label: 'Transacciones', path: '/api/accounting/transactions' },
      { label: 'Balance de Comprobación', path: '/api/accounting/trial-balance' },
      { label: 'Libro Mayor', path: '/api/accounting/general-ledger/[accountId]' },
      { label: 'Ingresos', path: '/api/accounting/ingresos' },
      { label: 'Egresos', path: '/api/accounting/egresos' },
      { label: 'Número de Comprobante', path: '/api/accounting/voucher-number' },
    ],
  },
  FINANCIAL_STATEMENTS: {
    features: [
      'Balance General',
      'Estado de Resultados',
      'Estado de Flujo de Efectivo',
      'Estado de Cambios en el Patrimonio',
      'Notas a los estados financieros',
      'Comparativos por período',
    ],
    pages: [
      { label: 'Estados Financieros', path: '/companies/[id]/accounting/financial-statements' },
      { label: 'Balance General', path: '/companies/[id]/accounting/financial-statements/balance-general' },
      { label: 'Balance de Comprobación', path: '/companies/[id]/accounting/financial-statements/balance-comprobacion' },
      { label: 'Estado de Resultados', path: '/companies/[id]/accounting/financial-statements/estado-resultados' },
      { label: 'Flujo de Efectivo', path: '/companies/[id]/accounting/financial-statements/flujo-efectivo' },
    ],
    apis: [
      { label: 'Cuentas', path: '/api/accounting/accounts' },
      { label: 'Balance de Comprobación', path: '/api/accounting/trial-balance' },
    ],
  },
  LEGAL_BOOKS: {
    features: [
      'Libro de Compras y Ventas',
      'Libro de Retenciones',
      'Libro de Comprobante de Compras',
      'Registro de facturas con CAI',
      'Cumplimiento normativa SAR',
      'Exportación para auditoría',
    ],
    pages: [
      { label: 'Libros Contables', path: '/accounting/books' },
      { label: 'Libro Integrado', path: '/accounting/integrated-books' },
      { label: 'Libros', path: '/companies/[id]/accounting/books' },
    ],
    apis: [
      { label: 'Libro Integrado', path: '/api/setup/integrated-books' },
    ],
  },
  BILLING: {
    features: [
      'Facturación electrónica con CAI',
      'Notas de crédito y débito',
      'Control de secuencias FACT',
      'Gestión de clientes',
      'Cotizaciones y órdenes de venta',
      'Reportes de ventas',
    ],
    pages: [
      { label: 'Facturación', path: '/billing' },
      { label: 'Factura', path: '/billing/[id]' },
      { label: 'Gastos', path: '/billing/expenses' },
      { label: 'Nuevo Gasto', path: '/billing/expenses/new' },
      { label: 'Generar Factura', path: '/billing/generate-invoice' },
      { label: 'Suscripciones', path: '/billing/subscriptions' },
      { label: 'POS', path: '/companies/[id]/billing/pos' },
    ],
    apis: [
      { label: 'Facturas', path: '/api/billing/invoices' },
      { label: 'CAI', path: '/api/billing/cai' },
      { label: 'CAI Actual', path: '/api/billing/cai/current' },
      { label: 'Clientes', path: '/api/billing/customers' },
      { label: 'Productos', path: '/api/billing/products' },
      { label: 'Enlaces de Pago', path: '/api/billing/payment-links' },
      { label: 'Recibos de Pago', path: '/api/billing/payment-receipts' },
      { label: 'Info Fiscal', path: '/api/billing/fiscal-info' },
      { label: 'Logo', path: '/api/billing/logo' },
      { label: 'Cuentas Bancarias', path: '/api/billing/bank-accounts' },
    ],
  },
  INVENTORY: {
    features: [
      'Kardex de inventario',
      'Control de stock mínimo y máximo',
      'Entradas y salidas de mercancía',
      'Inventario por almacén',
      'Ajustes de inventario',
      'Reportes de rotación',
    ],
    pages: [
      { label: 'Inventario', path: '/inventory' },
      { label: 'Inventario (Empresa)', path: '/companies/[id]/inventory' },
      { label: 'Kardex', path: '/companies/[id]/inventory/kardex' },
    ],
    apis: [
      { label: 'Productos', path: '/api/inventory/products' },
      { label: 'Movimientos', path: '/api/inventory/movements' },
      { label: 'Alertas', path: '/api/inventory/alerts' },
      { label: 'Ajustes', path: '/api/inventory/adjustments' },
      { label: 'Almacenes', path: '/api/inventory/warehouses' },
      { label: 'Contabilidad', path: '/api/inventory/accounting' },
      { label: 'Stats Dashboard', path: '/api/dashboard/inventory-stats' },
    ],
  },
  PURCHASES: {
    features: [
      'Órdenes de compra',
      'Registro de proveedores',
      'Control de gastos',
      'Compras a crédito',
      'Devoluciones a proveedores',
      'Comparativo de precios',
    ],
    pages: [
      { label: 'Compras', path: '/companies/[id]/purchases' },
      { label: 'Dashboard Compras', path: '/companies/[id]/purchases/dashboard' },
      { label: 'Órdenes de Compra', path: '/companies/[id]/purchase-orders' },
      { label: 'Proveedores', path: '/companies/[id]/suppliers' },
      { label: 'Cuentas por Pagar', path: '/companies/[id]/accounts-payable' },
      { label: 'Libro de Compras', path: '/companies/[id]/reports/purchase-book' },
    ],
    apis: [
      { label: 'Compras', path: '/api/purchases' },
      { label: 'Compra', path: '/api/purchases/[id]' },
      { label: 'Pagos', path: '/api/purchases/payments' },
      { label: 'Reportes', path: '/api/purchases/reports' },
      { label: 'Exportar', path: '/api/purchases/export' },
      { label: 'Órdenes de Compra', path: '/api/purchase-orders' },
      { label: 'Proveedores', path: '/api/suppliers' },
      { label: 'Pagos a Proveedores', path: '/api/supplier-payments' },
      { label: 'Cuentas por Pagar', path: '/api/accounts-payable' },
      { label: 'Libro de Compras', path: '/api/purchase-book' },
    ],
  },
  FINANCIAL_CONTROL: {
    features: [
      'Presupuestos por centro de costo',
      'Flujo de efectivo proyectado',
      'KPIs financieros',
      'Análisis de rentabilidad',
      'Control de devengados',
      'Alertas de presupuesto',
    ],
    pages: [
      { label: 'Control Financiero', path: '/companies/[id]/financial-control' },
      { label: 'Reportes de Negocio', path: '/companies/[id]/business-reports' },
    ],
    apis: [
      { label: 'Métricas Financieras', path: '/api/financial/metrics' },
      { label: 'KPIs', path: '/api/companies/[id]/kpis' },
      { label: 'KPIs Personalizados', path: '/api/companies/[id]/custom-kpis' },
      { label: 'Cash Flow', path: '/api/companies/[id]/cashflow' },
      { label: 'Costos', path: '/api/companies/[id]/costs' },
      { label: 'Break Even', path: '/api/break-even' },
      { label: 'Burn Rate', path: '/api/burn-rate' },
      { label: 'Flujo de Efectivo Proyectado', path: '/api/cash-flow-projection' },
      { label: 'Conciliación Bancaria', path: '/api/reconcile-bank' },
      { label: 'Cuentas Bancarias', path: '/api/bank-accounts' },
    ],
  },
  REPORTS: {
    features: [
      'Reportes financieros personalizados',
      'Dashboards interactivos',
      'Exportación a PDF y Excel',
      'Reportes por período',
      'Análisis de tendencias',
      'Reportes comparativos',
    ],
    pages: [
      { label: 'Reportes', path: '/reports' },
      { label: 'Reportes Contables', path: '/accounting/reports' },
      { label: 'Reportes de Negocio', path: '/companies/[id]/business-reports' },
    ],
    apis: [
      { label: 'P&L', path: '/api/reports/pnl' },
      { label: 'Mantenimiento', path: '/api/companies/[id]/reports/maintenance' },
      { label: 'Marketing', path: '/api/companies/[id]/reports/marketing' },
      { label: 'Ocupación', path: '/api/companies/[id]/reports/occupancy' },
      { label: 'Rentabilidad', path: '/api/companies/[id]/reports/profitability' },
    ],
  },
  SECURITY: {
    features: [
      'Bitácora de auditoría',
      'Control de acceso por rol',
      'Logs de actividad de usuarios',
      'Políticas de contraseñas',
      'Bloqueo de intentos fallidos',
      'Sesiones concurrentes',
    ],
    pages: [
      { label: 'Seguridad', path: '/companies/[id]/security' },
      { label: 'Auditoría', path: '/companies/[id]/security/auditoria' },
      { label: 'CAI', path: '/companies/[id]/security/cai' },
      { label: 'Cierre', path: '/companies/[id]/security/cierre' },
      { label: 'Control', path: '/companies/[id]/security/control' },
      { label: 'Digital', path: '/companies/[id]/security/digital' },
      { label: 'Legal', path: '/companies/[id]/security/legal' },
      { label: 'Matriz', path: '/companies/[id]/security/matrix' },
      { label: 'Panel de Control', path: '/companies/[id]/security/panel-control' },
      { label: 'Físico', path: '/companies/[id]/security/physical' },
      { label: 'Protocolos', path: '/companies/[id]/security/protocols' },
      { label: 'Reporte', path: '/companies/[id]/security/reporte' },
      { label: 'Respaldo', path: '/companies/[id]/security/respaldo' },
      { label: 'Retenciones', path: '/companies/[id]/security/retenciones' },
      { label: 'SAR', path: '/companies/[id]/security/sar' },
      { label: 'Usuarios Restringidos', path: '/companies/[id]/security/usuarios-restringidos' },
    ],
    apis: [
      { label: 'Bitácora de Auditoría', path: '/api/audit-logs' },
      { label: 'Sync Roles', path: '/api/sync-roles' },
      { label: 'Sincronizar Roles', path: '/api/sync-roles-manual' },
    ],
  },
  TAX_REPORTING: {
    features: [
      'Declaración de ISV (15%)',
      'Retenciones de ISR',
      'Reporte DET mensual',
      'Formulario 221',
      'Reportes para entidades fiscales',
      'Calendario fiscal automático',
    ],
    pages: [
      { label: 'Reportes Tributarios', path: '/tax-reporting' },
      { label: 'ISV', path: '/isv' },
      { label: 'DET', path: '/det' },
      { label: 'Retenciones', path: '/withholding' },
      { label: 'Helper de Impuestos', path: '/tax-helper' },
    ],
    apis: [
      { label: 'Reportes Tributarios', path: '/api/tax-reporting' },
      { label: 'ISV Calcular', path: '/api/isv/calculate' },
      { label: 'ISV Resumen', path: '/api/isv/summary' },
      { label: 'ISV Transacción', path: '/api/isv/transaction' },
      { label: 'DET', path: '/api/det' },
      { label: 'Retenciones', path: '/api/withholding' },
      { label: 'Estadísticas Retenciones', path: '/api/withholding-statistics' },
      { label: 'Configuración fiscal', path: '/api/tax-config' },
      { label: 'Helper Estimar', path: '/api/tax-helper/estimate' },
      { label: 'Helper Procesar', path: '/api/tax-helper/process' },
    ],
  },
  TAX_INTEGRATION: {
    features: [
      'Integración con SAR/DGII',
      'Validación de CAI en tiempo real',
      'Reportes automáticos al fisco',
      'Actualización de tablas fiscales',
      'Logs de transmisión fiscal',
      'Monitoreo de estados',
    ],
    pages: [
      { label: 'Integración Fiscal', path: '/companies/[id]/tax-integration' },
      { label: 'Tax Helper Demo', path: '/tax-helper-demo' },
    ],
    apis: [
      { label: 'Integración Fiscal', path: '/api/tax-integration' },
      { label: 'Transacción Helper', path: '/api/tax-helper/create-transaction' },
    ],
  },
  CONTACTS: {
    features: [
      'Directorio de clientes',
      'Directorio de proveedores',
      'Historial de transacciones',
      'Notas y observaciones',
      'Categorización de contactos',
      'Búsqueda avanzada',
    ],
    pages: [
      { label: 'Contactos', path: '/contacts' },
      { label: 'Proveedores', path: '/companies/[id]/suppliers' },
    ],
    apis: [
      { label: 'Clientes', path: '/api/billing/customers' },
      { label: 'Proveedores', path: '/api/suppliers' },
    ],
  },
  SUPPORT: {
    features: [
      'Soporte técnico incluido',
      'Actualizaciones del sistema',
      'Mantenimiento preventivo',
      'Monitoreo de sistema',
      'Respaldo automático',
      'Soporte prioritario',
    ],
    pages: [
      { label: 'Soporte', path: '/support' },
      { label: 'Dashboard Soporte', path: '/support/dashboard' },
      { label: 'Auditoría', path: '/support/audit' },
      { label: 'Reportes', path: '/support/reports' },
      { label: 'Tenants', path: '/support/tenants' },
      { label: 'Usuarios', path: '/support/users' },
    ],
    apis: [
      { label: 'Tickets', path: '/api/support/tickets' },
      { label: 'Reset Password', path: '/api/support/reset-password' },
      { label: 'Tenants', path: '/api/support/tenants' },
      { label: 'Usuarios', path: '/api/support/users' },
    ],
  },
};

type TabType = 'features' | 'pages' | 'apis' | 'limits';

export default function ModulesPage() {
  const router = useRouter();
  const [expandedModule, setExpandedModule] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>('features');
  const modules = Object.values(MODULES);
  const categories = [...new Set(modules.map(m => m.category))];

  const toggleExpand = (moduleId: string) => {
    if (expandedModule === moduleId) {
      setExpandedModule(null);
    } else {
      setExpandedModule(moduleId);
      setActiveTab('features');
    }
  };

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
          <p className="text-gray-600 mt-2">Estructura completa de cada módulo: páginas, API, funciones y límites</p>
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

                <div className="space-y-3">
                  {catModules.map((module) => {
                    const structure = moduleStructure[module.id] || { features: [], pages: [], apis: [] };
                    const isExpanded = expandedModule === module.id;
                    const limitDefs = getModuleLimits(module.id);
                    const hasLimits = limitDefs.length > 0;

                    return (
                      <div
                        key={module.id}
                        className={`${colors.bg} border ${colors.border} rounded-xl overflow-hidden transition-shadow ${isExpanded ? 'shadow-lg' : 'hover:shadow-md'}`}
                      >
                        {/* Header - clickable */}
                        <button
                          onClick={() => toggleExpand(module.id)}
                          className="w-full px-6 py-4 flex items-center justify-between text-left"
                        >
                          <div className="flex items-center flex-1">
                            <span className="text-2xl mr-3">{colors.icon}</span>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-gray-900">{module.name}</h3>
                                {module.required && (
                                  <span className="px-2 py-0.5 text-xs font-semibold bg-blue-100 text-blue-700 rounded-full">
                                    Siempre activo
                                  </span>
                                )}
                                {hasLimits && (
                                  <span className="px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-700 rounded-full">
                                    Con límites
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-600 mt-0.5">{module.description}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3 ml-4">
                            <div className="flex gap-2 text-xs text-gray-500">
                              <span className="bg-white px-2 py-1 rounded border">{structure.pages.length} páginas</span>
                              <span className="bg-white px-2 py-1 rounded border">{structure.apis.length} APIs</span>
                            </div>
                            <svg
                              className={`w-5 h-5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </button>

                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="border-t px-6 py-4 bg-white">
                            {/* Tabs */}
                            <div className="flex gap-1 border-b mb-4">
                              {(['features', 'pages', 'apis', 'limits'] as TabType[]).map((tab) => {
                                if (tab === 'limits' && !hasLimits) return null;
                                const tabLabels: Record<TabType, string> = {
                                  features: `Funciones (${structure.features.length})`,
                                  pages: `Páginas (${structure.pages.length})`,
                                  apis: `APIs (${structure.apis.length})`,
                                  limits: `Límites (${limitDefs.length})`,
                                };
                                return (
                                  <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                      activeTab === tab
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                  >
                                    {tabLabels[tab]}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Tab content */}
                            {activeTab === 'features' && (
                              <ul className="space-y-2">
                                {structure.features.map((feature, idx) => (
                                  <li key={idx} className="flex items-start text-sm text-gray-700">
                                    <svg className="w-4 h-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                    </svg>
                                    {feature}
                                  </li>
                                ))}
                              </ul>
                            )}

                            {activeTab === 'pages' && (
                              <div className="space-y-1">
                                {structure.pages.map((page, idx) => (
                                  <div key={idx} className="flex items-center text-sm py-1.5 px-3 rounded hover:bg-gray-50">
                                    <svg className="w-4 h-4 text-blue-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <span className="font-medium text-gray-800 mr-2">{page.label}</span>
                                    <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">{page.path}</code>
                                  </div>
                                ))}
                              </div>
                            )}

                            {activeTab === 'apis' && (
                              <div className="space-y-1">
                                {structure.apis.map((api, idx) => (
                                  <div key={idx} className="flex items-center text-sm py-1.5 px-3 rounded hover:bg-gray-50">
                                    <svg className="w-4 h-4 text-purple-500 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2" />
                                    </svg>
                                    <span className="font-medium text-gray-800 mr-2">{api.label}</span>
                                    <code className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded font-mono">{api.path}</code>
                                  </div>
                                ))}
                              </div>
                            )}

                            {activeTab === 'limits' && hasLimits && (
                              <div className="space-y-3">
                                {limitDefs.map((lim) => (
                                  <div key={lim.key} className="flex items-center justify-between py-2 px-3 bg-gray-50 rounded-lg">
                                    <div>
                                      <span className="text-sm font-medium text-gray-800">{lim.label}</span>
                                      <span className="text-xs text-gray-500 ml-2">({lim.unit})</span>
                                    </div>
                                    <span className="text-sm font-semibold text-blue-600">{lim.defaultValue} {lim.unit}</span>
                                  </div>
                                ))}
                                <p className="text-xs text-gray-500 mt-2">
                                  Estos valores son los predeterminados. Se pueden personalizar al asignar un plan a un tenant.
                                </p>
                              </div>
                            )}
                          </div>
                        )}
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
