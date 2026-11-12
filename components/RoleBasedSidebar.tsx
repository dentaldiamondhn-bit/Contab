'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSidebar } from '../app/contexts/SidebarContext';
import { useUser } from '@clerk/nextjs';
import { useTenant } from '@/lib/contexts/TenantContext';
import { useWorkspace } from '@/lib/contexts/WorkspaceContext';
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
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
    description: 'Resumen ejecutivo del sistema'
  },
  {
    name: 'Panel Admin',
    href: '/admin/panel',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>`,
    description: 'Gestión operativa diaria'
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
    name: 'Inventario',
    href: '/inventory',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`,
    description: 'Gestionar productos y existencias'
  },
  {
    name: 'Facturación',
    href: '/billing',
    module: 'BILLING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
    description: 'Ver y gestionar facturas'
  },
  {
    name: 'Módulos Disponibles',
    href: '/account/billing',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>`,
    description: 'Ver módulos de tu plan actual'
  },
  {
    name: 'Configuración',
    href: '/tenant-admin/settings',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Configuración de la empresa',
    module: 'SETTINGS'
  },
  {
    name: 'Recursos Humanos',
    href: '/hr',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Gestión de empleados y nómina'
  },
  {
    name: 'Control de Asistencia',
    href: '/hr/attendance/time-clock',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    description: 'Reloj de fichaje: entrada, salidas y horas extra'
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
    name: 'Inventario',
    href: '/inventory',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>`,
    description: 'Gestionar productos y existencias'
  },
  {
    name: 'Facturación',
    href: '/billing',
    module: 'BILLING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
    description: 'Ver facturas y reportes'
  },
  {
    name: 'Módulos Disponibles',
    href: '/account/billing',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>`,
    description: 'Ver módulos de tu plan actual'
  },
  {
    name: 'Soporte Técnico',
    href: '/dashboard/support/new',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 5.636l-3.536 3.536m0 5.656l3.536 3.536M9.172 9.172L5.636 5.636m3.536 9.192L5.636 18.364M12 2.25a9.75 9.75 0 109.75 9.75 9.75 9.75 0 00-9.75-9.75z" /></svg>`,
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

// Vista de las N empresas del contador. Va FUERA de `accountantNavigation` a
// proposito: no depende del rol global de Clerk sino del `relationship` de cada
// empresa (ver `esContador` mas abajo), asi que se inyecta aparte y le sirve a
// quien tenga Clerk ADMIN/MANAGER y aun asi ser contador de alguna empresa.
//
// El href es `/dashboard`, no `/accountant/*`: el layout de `/accountant` exige
// rol `ACCOUNTANT` en Clerk y echa a quien no lo tenga, con lo que un contador
// cuyo Clerk diga ADMIN/MANAGER se quedaria sin panel. `/dashboard` es la landing
// comun y no hace ese filtro de rol.
//
// Sin `module`: el filtro de `activeModules` oculta lo que el tenant no tiene
// contratado, y el panel es la vista principal del flujo, no un modulo opcional.
// El nombre tampoco lo toca el mapeo de `navigationWithTenant` mas abajo, asi que
// el href se queda estatico en vez de recibir el `[companyId]`: no es de una
// empresa.
const DESPACHO_NAV: NavItem = {
  name: 'Panel del Despacho',
  href: '/dashboard',
  icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h3m2.5 3.5H7a2 2 0 01-2-2V7a2 2 0 012-2h3.6a2 2 0 011.4.6L13.4 7H19a2 2 0 012 2v8.5a2 2 0 01-2 2h-4.5zM15 3.5H9a1.5 1.5 0 00-1.5 1.5v1A1.5 1.5 0 009 7.5h6A1.5 1.5 0 0016.5 6V5A1.5 1.5 0 0015 3.5z" /></svg>`,
  description: 'Estado tributario y operativo de todos tus clientes'
};

// Sidebar para ACCOUNTANT
const accountantNavigation: NavItem[] = [
  {
    name: 'Mi Empresa',
    href: '/companies/ANGELOH7',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`,
    description: 'Dashboard de la empresa'
  },
  {
    name: 'Contabilidad',
    href: '/accounting',
    module: 'ACCOUNTING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 14l6-6m0 0l6 6m-6-6V4m0 6H3m6 0v6m0 0l6-6m-6-6h6m-6 0v6m0 0l6-6M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    description: 'Gestión contable',
    children: [
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
    description: 'Facturas y pagos'
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
  },
  {
    name: 'Recursos Humanos',
    href: '/hr',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>`,
    description: 'Gestión de empleados y nómina'
  },
  {
    name: 'Control de Asistencia',
    href: '/hr/attendance/time-clock',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>`,
    description: 'Reloj de fichaje: entrada, salidas y horas extra'
  }
];

// Sidebar para usuarios normales (ADMIN, MANAGER, USER, VIEWER)
const userNavigation: NavItem[] = [
  {
    name: 'Mi Empresa',
    href: '/companies/ANGELOH7',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`,
    description: 'Dashboard de la empresa'
  },
  {
    name: 'Facturación',
    href: '/billing',
    module: 'BILLING',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>`,
    description: 'Facturas y pagos'
  },
  {
    name: 'Inventario',
    href: '/inventory',
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
    description: 'Gestión contable'
  },
  {
    name: 'Reportes',
    href: '/reports',
    module: 'REPORTS',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>`,
    description: 'Reportes financieros'
  },
  {
    name: 'Módulos Disponibles',
    href: '/account/billing',
    icon: `<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>`,
    description: 'Ver módulos de tu plan actual'
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
  // El `[id]` de las rutas `/companies/[id]/...` es `companies.id` (un UUID), NO
  // `currentTenant.id`, que es el codigo del tenant ("TEST1DS") y comparten todas
  // las empresas de un tenant. Con el codigo del tenant, `contextoDeEmpresa` no
  // resuelve ninguna empresa y esas paginas responden 400/403.
  //
  // Se usa `activeCompanyId` y no `empresa?.id`: `empresa` se vacia en
  // `limpiarEstado()` mientras carga la nueva, y durante esa transicion el enlace
  // caia al `|| tenantId`. `activeCompanyId` es la empresa comprometida con el
  // arbol de UI y sobrevive a la limpieza (`WorkspaceShell` la usa de `key`).
  const { activeCompanyId, empresas } = useWorkspace();

  // El panel del despacho se ofrece a quien es CONTADOR en alguna empresa, segun
  // el `relationship` de `user_company_access`. No se pregunta a Clerk por eso:
  // `user.publicMetadata.role` es un rol GLOBAL y se desincroniza de la
  // membresia (ver AGENTS.md 1b). Hay al menos dos casos reales: `gcalix12` es
  // `owner` de 2 empresas pero su Clerk dice MANAGER/ADMIN, y `azuna22` es
  // `accountant` de test 1 y test 2 pero `owner` de Empresa TEST185. Con el rol
  // global, el contador se queda sin su panel o el empresario lo ve de mas.
  // El `relationship` por empresa es la unica fuente fiable (y la misma que usa
  // `rolDeEmpresa()`); `empresas` viene de `/api/workspace`, ya validada.
  const esContador = empresas.some((e) => e.relationship === 'accountant');

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

  // El panel entra primero y fuera del filtro de `activeModules`: se decide por
  // `relationship` real, no por el rol global de Clerk. Se deduplica porque
  // `rawNavigation` podria venir de `accountantNavigation` y ahi no esta, pero
  // el `includes` evita depender de eso.
  const navigationConDespacho = esContador
    ? [DESPACHO_NAV, ...navigation.filter((i) => i.href !== DESPACHO_NAV.href)]
    : navigation;

  // Hacer rutas dinámicas por empresa
  const navigationWithTenant = navigationConDespacho.map(item => {
    // `companies.id` de la empresa activa. Sin ella los enlaces no se pueden
    // construir: es preferible dejarlos tal cual (href estatico del menu) que
    // apuntar a `/companies/TEST1DS/...`, que no resuelve a ninguna empresa.
    if (!activeCompanyId) return item;
    if (item.name === 'Módulos Disponibles') {
      return { ...item, href: `/companies/${activeCompanyId}/modules` };
    }
    if (item.name === 'Inventario') {
      return { ...item, href: `/companies/${activeCompanyId}/inventory/dashboard` };
    }
    if (item.name === 'Mi Empresa') {
      return { ...item, href: `/companies/${activeCompanyId}` };
    }
    if (item.name === 'Contabilidad') {
      return { ...item, href: `/companies/${activeCompanyId}/accounting` };
    }
    if (item.name === 'Reportes') {
      return { ...item, href: `/companies/${activeCompanyId}/business-reports` };
    }
    if (item.name === 'Facturación') {
      return { ...item, href: `/companies/${activeCompanyId}/billing/invoices` };
    }
    if (item.name === 'Soporte Técnico' || item.name === 'Soporte') {
      return { ...item, href: `/companies/${activeCompanyId}/other-features` };
    }
    if (item.name === 'Contactos') {
      return { ...item, href: `/companies/${activeCompanyId}/suppliers` };
    }
    return item;
  });

  // isActive function to determine which menu item should be highlighted
  const isActive = (href: string) => {
    // Sort navigation by href length (longest first) to find most specific match
    const sortedNavigation = [...navigationWithTenant].sort((a, b) => b.href.length - a.href.length);
    
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
        {navigationWithTenant.map((item) => {
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
