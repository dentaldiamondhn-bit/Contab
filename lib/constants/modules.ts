/**
 * Módulos disponibles para tenants en Contab
 */
export const MODULES = {
  // Contabilidad
  ACCOUNTING: {
    id: 'ACCOUNTING',
    name: 'Contabilidad Central',
    description: 'Libros contables, asientos y transacciones',
    category: 'main',
  },
  
  // Estados Financieros
  FINANCIAL_STATEMENTS: {
    id: 'FINANCIAL_STATEMENTS',
    name: 'Estados Financieros',
    description: 'Balance General, Estado de Resultados, Flujo de Efectivo',
    category: 'accounting',
  },

  // Libros Legales
  LEGAL_BOOKS: {
    id: 'LEGAL_BOOKS',
    name: 'Libros Legales',
    description: 'Libros legales y registros fiscales obligatorios',
    category: 'accounting',
  },

  // Facturación
  BILLING: {
    id: 'BILLING',
    name: 'Facturación y Ventas',
    description: 'Facturación, ventas y gestión de clientes',
    category: 'sales',
  },

  // Inventarios
  INVENTORY: {
    id: 'INVENTORY',
    name: 'Inventarios',
    description: 'Gestión de inventario y kardex',
    category: 'operations',
  },

  // Compras y Proveedores
  PURCHASES: {
    id: 'PURCHASES',
    name: 'Compras y Proveedores',
    description: 'Órdenes de compra, proveedores y gastos',
    category: 'operations',
  },

  // Control Financiero
  FINANCIAL_CONTROL: {
    id: 'FINANCIAL_CONTROL',
    name: 'Control Financiero',
    description: 'Presupuestos, flujos de efectivo y KPIs financieros',
    category: 'analysis',
  },

  // Reportes
  REPORTS: {
    id: 'REPORTS',
    name: 'Reportes y Análisis',
    description: 'Reportes personalizados y análisis de datos',
    category: 'analysis',
  },

  // Seguridad y Control
  SECURITY: {
    id: 'SECURITY',
    name: 'Seguridad y Control',
    description: 'Auditoría, control de acceso y bitácoras',
    category: 'security',
  },

  // Impuestos
  TAX_REPORTING: {
    id: 'TAX_REPORTING',
    name: 'Generación de Reportes para Entidades Fiscales',
    description: 'Reportes SAR, ISV, retenciones y declaraciones fiscales',
    category: 'taxes',
  },

  // Integración con Impuestos
  TAX_INTEGRATION: {
    id: 'TAX_INTEGRATION',
    name: 'Integración con Impuestos',
    description: 'Integración automática con sistemas fiscales',
    category: 'taxes',
  },

  // Contactos
  CONTACTS: {
    id: 'CONTACTS',
    name: 'Contactos',
    description: 'Gestión de clientes y proveedores',
    category: 'crm',
  },

  // Soporte
  SUPPORT: {
    id: 'SUPPORT',
    name: 'Soporte Técnico y Actualizaciones',
    description: 'Soporte, actualizaciones y mantenimiento del sistema',
    category: 'support',
  },
} as const;

export type ModuleId = keyof typeof MODULES;

export const MODULE_NAMES: Record<string, string> = Object.fromEntries(
  Object.entries(MODULES).map(([key, module]) => [key, module.name])
);

export function getModuleById(id: string) {
  return MODULES[id as ModuleId] || null;
}

export function getAllModuleIds(): string[] {
  return Object.keys(MODULES);
}

export function getModuleIdsByCategory(category: string): string[] {
  return Object.entries(MODULES)
    .filter(([_, m]) => m.category === category)
    .map(([id]) => id);
}