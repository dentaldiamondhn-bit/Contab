'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '../app/contexts/SidebarContext';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useEffect, useState } from 'react';
import CustomSignOutButton from './auth/SignOutButton';
import { useAuthSession } from '@/hooks/use-auth-session';

interface NavItem {
  name: string;
  href: string;
  icon: string; // SVG string
  description?: string;
  badge?: string;
  module?: string;
  children?: NavItem[];
}

// Sidebar para SUPER_ADMIN
const superAdminNavigation: NavItem[] = [
  {
    name: 'Panel Super-Admin',
    href: '/admin/dashboard',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`,
    description: 'Panel de control del sistema'
  },
  {
    name: 'Gestión Global de Usuarios',
    href: '/admin/users',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1m0 0v-1a6 6 0 00-9 5v1m0 0V9a6 6 0 016 0v1m0 0a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Administrar usuarios del sistema'
  },
  {
    name: 'Gestión Global de Tenants',
    href: '/admin/tenants',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`,
    description: 'Administrar empresas/tenants'
  },
  {
    name: 'Gestión de Planes',
    href: '/admin/plans',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>`,
    description: 'Administrar planes de suscripción'
  },
    {
      name: 'Reportes',
      href: '/admin/reports',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6m0 0l-3-3m3 3l3-3m3 6v-6m0 0l-3-3m3 3l3-3M3 12l3-3 3 3M3 5l3 3 3-3" /></svg>`,
      description: 'Reportes y estadísticas del sistema'
    },
    {
      name: 'Chat de Soporte',
      href: '/admin/chat',
      icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" /></svg>`,
      description: 'Comunicación con tenants y usuarios'
    },
  {
    name: 'Sistema Global',
    href: '/admin/system',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Configuración del sistema',
    children: [
      {
        name: 'Configuración Global',
        href: '/admin/settings',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
        description: 'Configuración general'
      },
      {
        name: 'Logs y Auditoría Global',
        href: '/admin/audit',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
        description: 'Ver logs del sistema'
      }
    ]
  }
];

// Sidebar para ADMIN
const adminNavigation: NavItem[] = [
  {
    name: 'Panel Admin',
    href: '/tenant-admin/dashboard',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`,
    description: 'Panel de administración de tu empresa',
    module: 'ADMIN_PANEL'
  },
  {
    name: 'Usuarios',
    href: '/tenant-admin/users',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1m0 0v-1a6 6 0 00-9 5v1m0 0V9a6 6 0 016 0v1m0 0a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Gestionar usuarios de tu empresa',
    module: 'USERS'
  },
  {
    name: 'Configuración',
    href: '/tenant-admin/settings',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Configuración de la empresa',
    module: 'SETTINGS'
  }
];

// Sidebar para MANAGER
const managerNavigation: NavItem[] = [
  {
    name: 'Panel Gerencia',
    href: '/tenant-admin/dashboard',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`,
    description: 'Panel de gerencia de tu empresa',
    module: 'ADMIN_PANEL'
  },
  {
    name: 'Módulos del Sistema',
    href: '/accounting/books',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>`,
    description: 'Ver herramientas de libros contables',
    module: 'ACCOUNTING'
  }
];

// Sidebar para SUPPORT
const supportNavigation: NavItem[] = [
  {
    name: 'Dashboard Principal',
    href: '/support/dashboard',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`,
    description: 'Ir al dashboard de operaciones'
  },
  {
    name: 'Panel Soporte',
    href: '/support',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75 9.75 9.75 0 00-9.75-9.75z" /></svg>`,
    description: 'Panel de soporte técnico'
  },
  {
    name: 'Ver Usuarios Globales',
    href: '/support/users',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`,
    description: 'Ver información de usuarios (Auditoría)'
  },
  {
    name: 'Ver Tenants',
    href: '/support/tenants',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`,
    description: 'Ver empresas asociadas al sistema'
  }
];

// Sidebar para usuarios normales (USER, VIEWER)
const userNavigation: NavItem[] = [
  {
    name: 'Resumen Financiero',
    href: '/dashboard',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`,
    description: 'Resumen financiero general'
  },
  {
    name: 'Contabilidad',
    href: '/accounting/books',
    module: 'ACCOUNTING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m0 0l6 6m-6-6V4m0 6H3m6 0v6m0 0l6-6m-6-6h6m-6 0v6m0 0l6-6M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    description: 'Libros Contables y Balances'
  }
];

export default function RoleBasedSidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();
  const pathname = usePathname() || '';
  const { user, isLoaded, role, isSuperAdmin, isSupport, isStaff } = useAuthSession();
  const { currentTenant } = useTenant();
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof document !== 'undefined') {
      setIsImpersonating(document.cookie.includes('impersonated_tenant_id='));
    }
  }, [currentTenant, pathname]);

  // Cargar navegación dinámica incluyendo el nuevo mapeo para SUPPORT
  const getNavigationByRole = () => {
    if (!isLoaded) return []; // Only wait for Clerk to be loaded, not necessarily for the user object to be populated

    const activeImpersonation = mounted && isImpersonating;

    // 1. Rutas de administración de infraestructura
    if (isSuperAdmin && pathname.startsWith('/admin')) {
       return superAdminNavigation;
    }

    // 2. Rutas del panel específico de soporte técnico
    if (isSupport && pathname.startsWith('/support')) {
      return supportNavigation;
    }

    // 3. Modos de visualización cruzada (Impersonación de empresas)
    if (activeImpersonation) {
      return adminNavigation;
    }

    // 4. Mapeo estructural por roles estándar
    switch (role) {
      case 'SUPER_ADMIN':
        return superAdminNavigation;
      case 'SUPPORT':
        return supportNavigation;
      case 'MANAGER':
        return managerNavigation;
      case 'ADMIN':
        return adminNavigation;
      case 'USER':
      case 'VIEWER':
      default:
        return userNavigation;
    }
  };

  const rawNavigation = getNavigationByRole();
  const activeModules = (currentTenant as any)?.activeModules || [];

  const navigation = rawNavigation.filter(item => {
    if (isStaff) return true;
    return !item.module || activeModules.includes(item.module);
  });

  const isActive = (href: string) => {
    const sortedNavigation = [...navigation].sort((a, b) => b.href.length - a.href.length);
    const activeItem = sortedNavigation.find(item => 
      pathname === item.href || pathname.startsWith(item.href + '/')
    );
    return activeItem?.href === href;
  };

  if (!isLoaded) {
    return (
      <div className="bg-white border-r border-gray-200 w-64 flex flex-col h-full">
        <div className="flex items-center justify-center h-full">
          <div className={`animate-spin rounded-full h-8 w-8 border-b-2 ${isSupport ? 'border-orange-600' : 'border-blue-600'}`}></div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-full sticky top-0 ${
      collapsed ? 'w-16' : 'w-64'
    }`}>
      {/* Logo Section */}
      <div className={`px-4 py-4 border-b border-gray-200 flex items-center transition-all ${collapsed ? 'flex-col space-y-4' : 'justify-between'}`}>
        <Link href="/" className="flex items-center space-x-3">
          <div className={`flex-shrink-0 w-10 h-10 ${isSupport ? 'bg-orange-600' : 'bg-blue-600'} rounded-lg flex items-center justify-center`}>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
          </div>
          {!collapsed && (
            <div>
              <h1 className="text-xl font-bold text-gray-900">Contab</h1>
              <p className="text-xs text-gray-500">Sistema Contable</p>
            </div>
          )}
        </Link>

        <button
          onClick={toggleCollapsed}
          className="p-1.5 rounded-lg bg-gray-50 hover:bg-gray-100 border border-gray-200 text-gray-500 transition-colors shadow-sm"
        >
          <svg className={`w-5 h-5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const active = isActive(item.href);
          return (
            <div key={item.name}>
              <Link
                href={item.href}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                  active
                    ? isSupport
                      ? 'bg-orange-50 text-orange-700 border-l-4 border-orange-600'
                      : 'bg-blue-50 text-blue-700 border-l-4 border-blue-700'
                    : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
                } ${collapsed ? 'justify-center px-0 mx-auto w-10' : ''}`}
                title={collapsed ? `${item.name}${item.description ? ` — ${item.description}` : ''}` : undefined}
              >
                <span
                  dangerouslySetInnerHTML={{ __html: item.icon }}
                  className={`flex-shrink-0 w-5 h-5 ${active ? isSupport ? 'text-orange-700' : 'text-blue-700' : 'text-gray-400 group-hover:text-gray-500'}`}
                />
                {!collapsed && (
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span>{item.name}</span>
                    </div>
                    {item.description && <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>}
                  </div>
                )}
              </Link>
            </div>
          );
        })}
      </nav>
    
      {/* User Section */}
      <div className="border-t border-gray-200 p-4">
        <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'} mb-3`}>
          <div className={`w-8 h-8 ${isSupport ? 'bg-orange-500' : 'bg-blue-500'} rounded-full flex items-center justify-center`}>
            <span className="text-white text-sm font-medium">
              {user?.firstName?.charAt(0) || user?.primaryEmailAddress?.emailAddress?.charAt(0) || 'U'}
            </span>
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{user?.firstName || 'Usuario'}</p>
              <span className={`inline-block ${isSupport ? 'bg-orange-100 text-orange-800' : 'bg-slate-100 text-slate-700'} font-mono text-[10px] uppercase px-1.5 py-0.5 rounded mt-0.5 tracking-wider`}>
                {role}
              </span>
            </div>
          )}
        </div>
        <CustomSignOutButton />
      </div>
    </div>
  );
}