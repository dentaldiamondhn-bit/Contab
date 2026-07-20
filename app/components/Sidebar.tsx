'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '../contexts/SidebarContext';
import { useUser } from '../../contexts/UserContext';

interface NavItem {
  name: string;
  href: string;
  icon: string; // SVG string
  description?: string;
  badge?: string;
}

const navigation: NavItem[] = [
    {
    name: 'Resumen del Tenant',
    href: '/tenant-admin/summary',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
    description: 'Estado completo del tenant',
    badge: 'NUEVO'
  },
  {
    name: 'Administración',
    href: '/admin',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1m0 0v-1a6 6 0 00-9 5v1m0 0V9a6 6 0 016 0v1m0 0V9a6 6 0 016 0v1m0 0a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Panel de administración',
    badge: 'ADMIN'
  },
  {
    name: 'Empresas',
    href: '/companies',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`,
    description: 'Administrar empresas'
  },
    {
    name: 'Contactos',
    href: '/contacts',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>`,
    description: 'Gestionar clientes y prospectos'
  },
  {
    name: 'Inventario',
    href: '/inventory',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`,
    description: 'Gestionar productos y existencias',
    badge: 'PRÓXIMO'
  },
  {
    name: 'Impuestos',
    href: '/accounting/taxes',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m0 0l6 6m-6-6V4m0 6H3m6 0v6m0 0l6-6m-6-6h6m-6 0v6m0 0l6-6M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    description: 'Gestionar impuestos y retenciones'
  },
  {
    name: 'Multi-Divisa',
    href: '/multi-currency',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    description: 'Transacciones HNL/USD',
    badge: 'NUEVO'
  },
  {
    name: 'Importar/Exportar',
    href: '/import-export',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>`,
    description: 'Importar y exportar archivos Excel'
  },
  {
    name: 'Reportes',
    href: '/reports',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
    description: 'Reportes financieros'
  },
  {
    name: 'Análisis Dental',
    href: '/companies/1/business-reports',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
    description: 'Reportes de negocio Dental Diamond',
    badge: 'NUEVO'
  }
];

export default function Sidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();
  const pathname = usePathname();
  const { user } = useUser();

  const isActive = (href: string) => {
    if (href === '/') {
      return pathname === '/';
    }
    return pathname.startsWith(href);
  };

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item => {
    // Admin routes only for SUPER_ADMIN and ADMIN
    if (item.href === '/admin') {
      return user && ['SUPER_ADMIN', 'ADMIN'].includes(user.role);
    }
    // All other routes for authenticated users
    return true;
  });

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-full sticky top-0 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Navigation - Sin header con logo */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {filteredNavigation.map((item) => {
          const active = isActive(item.href);
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                active
                  ? 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                  : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
              }`}
              title={collapsed ? item.name : undefined}
            >
              <span
                dangerouslySetInnerHTML={{ __html: item.icon }}
                className={`flex-shrink-0 w-5 h-5 ${
                  active ? 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'
                }`}
              />
              {!collapsed && (
                <div className="ml-3 flex-1">
                  <div className="flex items-center justify-between">
                    <span>{item.name}</span>
                    {item.badge && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </div>
                  {!collapsed && item.description && (
                    <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                  )}
                </div>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className={`p-4 border-t border-gray-200 ${
        collapsed ? 'hidden' : 'block'
      }`}>
        <div className="text-xs text-gray-500">
          <p>Sistema de Contabilidad Hondureño</p>
          <p>© 2024 Contab Pro</p>
        </div>
      </div>
    </div>
  );
}
