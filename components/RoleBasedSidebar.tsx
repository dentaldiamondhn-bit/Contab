'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '../app/contexts/SidebarContext';
import { useUser } from '@clerk/nextjs';
import { useTenant } from '@/lib/contexts/TenantContext';
import CustomSignOutButton from './auth/SignOutButton';

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
    name: 'Panel Admin',
    href: '/admin/dashboard',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>`,
    description: 'Panel de control del sistema'
  },
  {
    name: 'Gestión de Usuarios',
    href: '/admin/users',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1m0 0v-1a6 6 0 00-9 5v1m0 0V9a6 6 0 016 0v1m0 0V9a6 6 0 016 0v1m0 0a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Administrar usuarios del sistema'
  },
  {
    name: 'Gestión de Tenants',
    href: '/admin/tenants',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`,
    description: 'Administrar empresas/tenants'
  },
  {
    name: 'Sistema',
    href: '/admin/system',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Configuración del sistema',
    children: [
      {
        name: 'Configuración',
        href: '/admin/settings',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
        description: 'Configuración general'
      },
      {
        name: 'Logs y Auditoría',
        href: '/admin/audit',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
        description: 'Ver logs del sistema'
      }
    ]
  },
  {
    name: 'Reportes Globales',
    href: '/admin/reports',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
    description: 'Reportes de todo el sistema'
  },
  {
    name: 'Planes',
    href: '/admin/plans',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>`,
    description: 'Gestión de planes de suscripción'
  },
  {
    name: 'Todas las Facturas',
    href: '/admin/billing/invoices',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
    description: 'Ver todas las facturas del sistema',
    children: [
      {
        name: 'Todas las Facturas',
        href: '/admin/billing/invoices',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
        description: 'Listado completo de facturas'
      },
      {
        name: 'Generar Factura',
        href: '/admin/billing/generate-invoice',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>`,
        description: 'Crear nueva factura'
      }
    ]
  },
  {
    name: 'Gestión de Tickets',
    href: '/admin/tickets',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>`,
    description: 'Ver y responder tickets de soporte'
  },
  {
    name: 'Chat de Soporte',
    href: '/admin/chat',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg>`,
    description: 'Conversaciones en tiempo real'
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
    name: 'Facturación',
    href: '/billing',
    module: 'BILLING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
    description: 'Ver y gestionar facturas',
    children: [
      {
        name: 'Mis Facturas Emitidas',
        href: '/billing',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
        description: 'Facturas a clientes'
      },
      {
        name: 'Suscripción ',
        href: '/billing/subscriptions',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>`,
        description: 'Facturas del servicio'
      },
      {
        name: 'Facturas Recibidas',
        href: '/billing/expenses',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>`,
        description: 'Gastos y compras'
      }
    ]
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
    name: 'Usuarios',
    href: '/tenant-admin/users',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1m0 0v-1a6 6 0 00-9 5v1m0 0V9a6 6 0 016 0v1m0 0a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Ver usuarios de tu empresa',
    module: 'USERS'
  },
  {
    name: 'Facturación',
    href: '/billing',
    module: 'BILLING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
    description: 'Ver facturas y reportes',
    children: [
      {
        name: 'Mis Facturas Emitidas',
        href: '/billing',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
        description: 'Facturas a clientes'
      },
      {
        name: 'Suscripción ',
        href: '/billing/subscriptions',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>`,
        description: 'Facturas del servicio'
      },
      {
        name: 'Facturas Recibidas',
        href: '/billing/expenses',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>`,
        description: 'Gastos y compras'
      }
    ]
  },
  {
    name: 'Soporte Técnico',
    href: '/dashboard/support/new',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75 9.75 0 00-9.75-9.75z" /></svg>`,
    description: 'Enviar un ticket de ayuda'
  }
];

// Sidebar para SUPPORT
const supportNavigation: NavItem[] = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`,
    description: 'Ir al dashboard principal'
  },
  {
    name: 'Panel Soporte',
    href: '/support',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75 9.75 9.75 0 00-9.75-9.75z" /></svg>`,
    description: 'Panel de soporte técnico'
  },
  {
    name: 'Ver Usuarios',
    href: '/support/users',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>`,
    description: 'Ver información de usuarios (solo lectura)'
  },
  {
    name: 'Ver Tenants',
    href: '/support/tenants',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`,
    description: 'Ver información de empresas (solo lectura)'
  },
  {
    name: 'Logs del Sistema',
    href: '/support/audit',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
    description: 'Ver logs de auditoría del sistema'
  },
  {
    name: 'Reportes de Soporte',
    href: '/support/reports',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
    description: 'Reportes de soporte técnico'
  },
  {
    name: 'Tickets de Soporte',
    href: '/support/tickets',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" /></svg>`,
    description: 'Administrar tickets de clientes'
  }
];

// Sidebar para ACCOUNTANT
const accountantNavigation: NavItem[] = [
  {
    name: 'Resumen',
    href: '/accountant/dashboard',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`,
    description: 'Resumen contable del mes'
  },
  {
    name: 'Contabilidad',
    href: '/accounting',
    module: 'ACCOUNTING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m0 0l6 6m-6-6V4m0 6H3m6 0v6m0 0l6-6m-6-6h6m-6 0v6m0 0l6-6M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    description: 'Gestión contable',
    children: [
      {
        name: 'Libro Diario',
        href: '/accounting/books',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>`,
        description: 'Libro diario contable'
      },
      {
        name: 'Impuestos',
        href: '/accounting/taxes',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m0 0l6 6m-6-6V4m0 6H3m6 0v6m0 0l6-6m-6-6h6m-6 0v6m0 0l6-6M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        description: 'Gestión de impuestos'
      },
      {
        name: 'Catálogo de Cuentas',
        href: '/accounting/catalog',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>`,
        description: 'Catálogo de cuentas contables'
      }
    ]
  },
  {
    name: 'Facturación',
    href: '/billing',
    module: 'BILLING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>`,
    description: 'Facturas y pagos',
    children: [
      {
        name: 'Mis Facturas Emitidas',
        href: '/billing',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
        description: 'Facturas a clientes'
      },
      {
        name: 'Suscripción ',
        href: '/billing/subscriptions',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>`,
        description: 'Facturas del servicio'
      },
      {
        name: 'Facturas Recibidas',
        href: '/billing/expenses',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>`,
        description: 'Gastos y compras'
      }
    ]
  },
  {
    name: 'Reportes',
    href: '/reports',
    module: 'REPORTS',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
    description: 'Reportes financieros'
  },
  {
    name: 'Soporte',
    href: '/dashboard/support/new',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75 9.75 9.75 0 00-9.75-9.75z" /></svg>`,
    description: 'Enviar un ticket de ayuda'
  }
];

// Sidebar para usuarios normales (ADMIN, MANAGER, USER, VIEWER)
const userNavigation: NavItem[] = [
  {
    name: 'Resumen',
    href: '/dashboard',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>`,
    description: 'Resumen financiero general'
  },
  {
    name: 'Facturación',
    href: '/billing',
    module: 'BILLING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>`,
    description: 'Facturas y pagos',
    children: [
      {
        name: 'Mis Facturas Emitidas',
        href: '/billing',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
        description: 'Facturas a clientes'
      },
      {
        name: 'Suscripción ',
        href: '/billing/subscriptions',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" /></svg>`,
        description: 'Facturas del servicio'
      },
      {
        name: 'Facturas Recibidas',
        href: '/billing/expenses',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>`,
        description: 'Gastos y compras'
      }
    ]
  },
  {
    name: 'Inventario',
    href: '/inventory',
    module: 'INVENTORY',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`,
    description: 'Gestionar productos y existencias'
  },
  {
    name: 'Contactos',
    href: '/contacts',
    module: 'CONTACTS',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>`,
    description: 'Gestionar clientes y prospectos'
  },
  {
    name: 'Contabilidad',
    href: '/accounting',
    module: 'ACCOUNTING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m0 0l6 6m-6-6V4m0 6H3m6 0v6m0 0l6-6m-6-6h6m-6 0v6m0 0l6-6M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    description: 'Gestión contable',
    children: [
      {
        name: 'Libro Diario',
        href: '/accounting/books',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>`,
        description: 'Libro diario contable'
      },
      {
        name: 'Impuestos',
        href: '/accounting/taxes',
        icon: `<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m0 0l6 6m-6-6V4m0 6H3m6 0v6m0 0l6-6m-6-6h6m-6 0v6m0 0l6-6M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
        description: 'Gestión de impuestos'
      }
    ]
  },
  {
    name: 'Reportes',
    href: '/reports',
    module: 'REPORTS',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
    description: 'Reportes financieros'
  },
  {
    name: 'Soporte Técnico',
    href: '/dashboard/support/new',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75 9.75 9.75 0 00-9.75-9.75z" /></svg>`,
    description: 'Enviar un ticket de ayuda'
  }
];

export default function RoleBasedSidebar() {
  const { collapsed, toggleCollapsed } = useSidebar();
  const pathname = usePathname();
  const { user, isLoaded } = useUser();
  const { currentTenant } = useTenant();

  // Get navigation based on user role
  const getNavigationByRole = () => {
    if (!isLoaded || !user) return [];

    const role = user.publicMetadata?.role || 
                 user.unsafeMetadata?.role ||
                 (user as any).privateMetadata?.role;
    
    // Si es rol SUPER_ADMIN, mostrar navegación de SUPER_ADMIN
    if (role === 'SUPER_ADMIN') {
      return superAdminNavigation;
    }

    // Rol SUPPORT ve navegación de soporte (solo lectura)
    if (role === 'SUPPORT') {
      return supportNavigation;
    }

    switch (role) {
      case 'SUPER_ADMIN':
        return superAdminNavigation;
      case 'ADMIN':
        return adminNavigation;
      case 'MANAGER':
        return managerNavigation;
      case 'ACCOUNTANT':
        return accountantNavigation;
      case 'USER':
      case 'VIEWER':
      default:
        return userNavigation;
    }
  };

  // Get raw navigation and filter by modules
  const rawNavigation = getNavigationByRole();
  const activeModules = (currentTenant as any)?.activeModules || [];
  
  const role = user?.publicMetadata?.role || 
               user?.unsafeMetadata?.role ||
               (user as any)?.privateMetadata?.role;
  const isSuperAdminOrSupport = role === 'SUPER_ADMIN' || role === 'SUPPORT';

  const navigation = rawNavigation.filter(item => {
    // Super admins and support see everything
    if (isSuperAdminOrSupport) return true;
    
    // Filter based on active modules if specified
    return !item.module || activeModules.includes(item.module);
  });

  // isActive function to determine which menu item should be highlighted
  const isActive = (href: string) => {
    // Sort navigation by href length (longest first) to find most specific match
    const sortedNavigation = [...navigation].sort((a, b) => b.href.length - a.href.length);
    
    // Find the most specific match in navigation
    const activeItem = sortedNavigation.find(item => 
      pathname === item.href || pathname.startsWith(item.href + '/')
    );
    
    // Return true only if this href is the most specific match
    return activeItem?.href === href;
  };

  // Determine if user is support role for theming
  const userRole = user?.publicMetadata?.role || 
                   user?.unsafeMetadata?.role ||
                   (user as any)?.privateMetadata?.role;
  const isSupport = userRole === 'SUPPORT';

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
                }`}
                title={collapsed ? item.name : undefined}
              >
                <span
                  dangerouslySetInnerHTML={{ __html: item.icon }}
                  className={`flex-shrink-0 w-5 h-5 ${
                    active 
                      ? isSupport ? 'text-orange-700' : 'text-blue-700'
                      : 'text-gray-400 group-hover:text-gray-500'
                  }`}
                />
                {!collapsed && (
                  <div className="ml-3 flex-1">
                    <div className="flex items-center justify-between">
                      <span>{item.name}</span>
                      {item.badge && (
                        <span className={`px-2 py-1 text-xs font-medium ${isSupport ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'} rounded-full`}>
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

              {/* Render children if not collapsed */}
              {!collapsed && item.children && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children.map((child) => {
                    const childActive = isActive(child.href);
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                          childActive
                            ? isSupport 
                              ? 'bg-orange-50 text-orange-700'
                              : 'bg-blue-50 text-blue-700'
                            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                        }`}
                      >
                        <span
                          dangerouslySetInnerHTML={{ __html: child.icon }}
                          className={`flex-shrink-0 w-4 h-4 ${
                            childActive 
                              ? isSupport ? 'text-orange-700' : 'text-blue-700'
                              : 'text-gray-400 group-hover:text-gray-500'
                          }`}
                        />
                        <div className="ml-3 flex-1">
                          <span className="text-xs">{child.name}</span>
                          {!collapsed && child.description && (
                            <p className="text-xs text-gray-400 mt-0.5">{child.description}</p>
                          )}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </nav>
    
    {/* User Section */}
    <div className="border-t border-gray-200 p-4">
      <div className="flex items-center space-x-3 mb-3">
        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
          <span className="text-white text-sm font-medium">
            {user?.firstName?.charAt(0) || user?.primaryEmailAddress?.emailAddress?.charAt(0) || 'U'}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {user?.firstName || 'Usuario'}
          </p>
          <p className="text-xs text-gray-500 truncate">
            {user?.primaryEmailAddress?.emailAddress}
          </p>
        </div>
      </div>
      <CustomSignOutButton />
    </div>
  </div>
  );
}
