"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/app/contexts/SidebarContext";
import { useUser } from "@clerk/nextjs";
import { useTenant } from "@/lib/contexts/TenantContext";
import { useWorkspace } from "@/lib/contexts/WorkspaceContext";
import { cn } from "@/lib/utils";
import { LogOut, LayoutDashboard, Building2, Boxes, FileText, ShoppingCart, Users, FileSpreadsheet, Shield, Settings, CreditCard, BarChart3, ClipboardList, Calendar, ShieldCheck, HelpCircle, ChevronDown, Calculator, Receipt, Users as UsersIcon, Package, FileText as FileTextIcon, Shield as ShieldIcon, RefreshCw, RotateCcw, Calendar as CalendarIcon, Shield as ShieldIcon2, Settings as SettingsIcon, BookOpen, TrendingUp, Scale, BookOpen as BookOpenIcon } from "lucide-react";
import { useState, useMemo } from "react";

interface NavItem {
  name: string;
  href: string;
  icon: React.ReactNode;
  description?: string;
  badge?: string;
  module?: string;
  children?: NavItem[];
}

function getIcon(iconName: string): React.ReactNode {
  const icons: Record<string, React.ReactNode> = {
    LayoutDashboard,
    Building2,
    Boxes,
    FileText,
    ShoppingCart,
    Users,
    FileSpreadsheet,
    Shield,
    Settings,
    CreditCard,
    BarChart3,
    ClipboardList,
    Calendar,
    ShieldCheck,
    HelpCircle,
  };
  return icons[iconName] || LayoutDashboard;
}

// ─── Navigation Configs ─────────────────────────────────────────────

const globalNavigation: NavItem[] = [
  { name: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-5 h-5" />, description: "Panel principal" },
  { name: "Empresas", href: "/companies", icon: <Building2 className="w-5 h-5" />, description: "Gestionar empresas" },
];

const adminNavigation: NavItem[] = [
  { name: "Panel Admin", href: "/admin/panel", icon: <LayoutDashboard className="w-5 h-5" />, description: "Panel de administración" },
  { name: "Usuarios", href: "/admin/users", icon: <Users className="w-5 h-5" />, description: "Gestionar usuarios" },
  { name: "Empresas", href: "/admin/tenants", icon: <Building2 className="w-5 h-5" />, description: "Administrar empresas" },
  { name: "Sistema", href: "/admin/settings", icon: <Settings className="w-5 h-5" />, description: "Configuración del sistema" },
  { name: "Reportes", href: "/admin/reports", icon: <FileSpreadsheet className="w-5 h-5" />, description: "Reportes globales" },
];

const companyNavigation: NavItem[] = [
  {
    name: "Dashboard",
    href: "",
    icon: <LayoutDashboard className="w-5 h-5" />,
    description: "Resumen de la empresa",
  },
  {
    name: "Contabilidad",
    href: "",
    icon: <Calculator className="w-5 h-5" />,
    description: "Libros, asientos, catálogo",
    module: "ACCOUNTING",
    children: [
      { name: "Registro Contable", href: "/accounting/books", icon: <BookOpen className="w-4 h-4" />, description: "Partidas, libros y pólizas" },
      { name: "Estados Financieros", href: "/accounting/financial-statements", icon: <FileText className="w-4 h-4" />, description: "Balance, resultados, flujo" },
      { name: "Libros Legales", href: "/accounting/books", icon: <Scale className="w-4 h-4" />, description: "Compras, ventas, retenciones" },
      { name: "Balance de Apertura", href: "/accounting/opening-balances", icon: <Calculator className="w-4 h-4" />, description: "Saldos iniciales por cuenta" },
      { name: "Recurrentes", href: "/accounting/recurring-entries", icon: <RefreshCw className="w-4 h-4" />, description: "Asientos periódicos automáticos" },
      { name: "Reversiones", href: "/accounting/reversals", icon: <RotateCcw className="w-4 h-4" />, description: "Revertir pólizas registradas" },
      { name: "Cierre Mensual", href: "/accounting/closing", icon: <Calendar className="w-4 h-4" />, description: "Cerrar y abrir períodos" },
    ],
  },
  {
    name: "Facturación",
    href: "",
    icon: <Receipt className="w-5 h-5" />,
    description: "Facturas, clientes, CAI",
    module: "BILLING",
    children: [
      { name: "Facturas", href: "/billing/invoices", icon: <Receipt className="w-4 h-4" />, description: "Ver y gestionar facturas" },
      { name: "Clientes", href: "/billing/customers", icon: <Users className="w-4 h-4" />, description: "Gestionar clientes" },
      { name: "CAI", href: "/billing/cai", icon: <ShieldCheck className="w-4 h-4" />, description: "Autorizaciones CAI" },
      { name: "Configuración", href: "/billing/settings", icon: <Settings className="w-4 h-4" />, description: "Configurar facturación" },
    ],
  },
  {
    name: "Inventario",
    href: "",
    icon: <Boxes className="w-5 h-5" />,
    description: "Productos, stock, kardex",
    module: "INVENTORY",
    children: [
      { name: "Dashboard", href: "/inventory/dashboard", icon: <BarChart3 className="w-4 h-4" />, description: "Resumen de inventario" },
      { name: "Productos", href: "/inventory/products", icon: <Boxes className="w-4 h-4" />, description: "Gestionar productos" },
      { name: "Kardex", href: "/inventory/kardex", icon: <FileText className="w-4 h-4" />, description: "Kardex de productos" },
      { name: "Traslados", href: "/inventory/transfers", icon: <ShoppingCart className="w-4 h-4" />, description: "Traslados entre bodegas" },
      { name: "Bodegas", href: "/inventory/warehouses", icon: <Building2 className="w-4 h-4" />, description: "Gestionar bodegas" },
    ],
  },
  {
    name: "Compras",
    href: "",
    icon: <ShoppingCart className="w-5 h-5" />,
    description: "Órdenes, proveedores, egresos",
    module: "PURCHASES",
    children: [
      { name: "Órdenes de Compra", href: "/purchase-orders", icon: <ClipboardList className="w-4 h-4" />, description: "Gestionar órdenes" },
      { name: "Proveedores", href: "/suppliers", icon: <Users className="w-4 h-4" />, description: "Gestionar proveedores" },
      { name: "Reportes", href: "/purchases/reports", icon: <FileText className="w-4 h-4" />, description: "Reportes de compras" },
    ],
  },
  {
    name: "Recursos Humanos",
    href: "",
    icon: <Users className="w-5 h-5" />,
    description: "Empleados, nómina, asistencia",
    module: "HR",
    children: [
      { name: "Empleados", href: "/hr/employees", icon: <Users className="w-4 h-4" />, description: "Gestionar empleados" },
      { name: "Asistencia", href: "/hr/attendance", icon: <Calendar className="w-4 h-4" />, description: "Control de asistencia" },
      { name: "Nómina", href: "/hr/payroll", icon: <CreditCard className="w-4 h-4" />, description: "Gestión de nómina" },
      { name: "Vacaciones", href: "/hr/vacations", icon: <Calendar className="w-4 h-4" />, description: "Gestión de vacaciones" },
      { name: "Departamentos", href: "/hr/departments", icon: <Building2 className="w-4 h-4" />, description: "Estructura organizacional" },
    ],
  },
  {
    name: "Reportes",
    href: "",
    icon: <FileSpreadsheet className="w-5 h-5" />,
    description: "Estados financieros, libros",
    module: "REPORTS",
    children: [
      { name: "Libro Diario", href: "/reports/journal", icon: <FileText className="w-4 h-4" />, description: "Libro diario contable" },
      { name: "Libro Mayor", href: "/reports/ledger", icon: <FileSpreadsheet className="w-4 h-4" />, description: "Libro mayor" },
      { name: "Balance General", href: "/reports/balance-general", icon: <Scale className="w-4 h-4" />, description: "Balance general" },
      { name: "Estado Resultados", href: "/reports/estado-resultados", icon: <TrendingUp className="w-4 h-4" />, description: "Estado de resultados" },
      { name: "Flujo Efectivo", href: "/reports/cash-flow", icon: <FileSpreadsheet className="w-4 h-4" />, description: "Flujo de efectivo" },
    ],
  },
  {
    name: "Seguridad",
    href: "",
    icon: <Shield className="w-5 h-5" />,
    description: "Permisos, auditoría, CAI",
    module: "SECURITY",
    children: [
      { name: "Auditoría", href: "/security/auditoria", icon: <FileText className="w-4 h-4" />, description: "Logs de auditoría" },
      { name: "CAI", href: "/security/cai", icon: <Shield className="w-4 h-4" />, description: "Autorizaciones CAI" },
      { name: "Usuarios Restringidos", href: "/security/usuarios-restringidos", icon: <Users className="w-4 h-4" />, description: "Usuarios con restricciones" },
    ],
  },
  {
    name: "Módulos",
    href: "/modules",
    icon: <Settings className="w-5 h-5" />,
    description: "Configurar plan y módulos",
    module: "MODULES",
  },
];


export function UnifiedSidebar({ isCollapsed = false, onToggleCollapse }: { isCollapsed?: boolean; onToggleCollapse?: () => void }) {
  const pathname = usePathname() || "/";
  const { user, isLoaded } = useUser();
  const { currentTenant } = useTenant();
  const { activeCompanyId, empresas } = useWorkspace();

  // Determine user role
  const role = user?.publicMetadata?.role || user?.unsafeMetadata?.role || (user as any)?.privateMetadata?.role;
  const isSuperAdmin = role === "SUPER_ADMIN";
  const isSupport = role === "SUPPORT";

  // Check if user is accountant for any company
  const esContador = empresas?.some((e: any) => e.relationship === "accountant") ?? false;

  // Get navigation based on context
  const getNavigation = useMemo(() => {
    if (!isLoaded || !user) return [];

    // Global routes (no company context)
    if (!pathname.startsWith("/companies/") && !pathname.startsWith("/admin") && !pathname.startsWith("/dashboard")) {
      return globalNavigation;
    }

    // Admin routes
    if (pathname.startsWith("/admin")) {
      return adminNavigation;
    }

    // Company routes - use company navigation
    if (pathname.startsWith("/companies/")) {
      return companyNavigation;
    }

    // Dashboard and others
    return companyNavigation;
  }, [pathname, user, isLoaded]);

  const navigation = useMemo(() => {
    const nav = getNavigation;
    // Filter by active modules if in company context
    if (pathname.startsWith("/companies/")) {
      const activeModules = (currentTenant as any)?.activeModules || [];
      return nav.filter(item => !item.module || activeModules.includes(item.module));
    }
    return nav;
  }, [getNavigation, pathname, currentTenant]);

  if (!isLoaded) {
    return (
      <aside className="w-64 shrink-0 border-r border-gray-200 bg-white flex flex-col h-full">
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </aside>
    );
  }

  const isActive = (href: string) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname === href || pathname.startsWith(href + "/");
  };

  return (
    <aside className={`bg-white border-r border-gray-200 transition-all duration-300 flex flex-col h-full sticky top-0 ${isCollapsed ? "w-16" : "w-64"}`}>
      {/* Logo/Brand */}
      {!isCollapsed && (
        <div className="p-4 border-b border-gray-200">
          <Link href="/dashboard" className="flex items-center gap-2">
            <div className="bg-blue-600 rounded-lg p-2">
              <Building2 className="h-6 w-6 text-white" />
            </div>
            <span className="font-semibold text-lg text-gray-900">Contab</span>
          </Link>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const hasChildren = item.children && item.children.length > 0;

          if (isCollapsed && hasChildren) {
            return (
              <Link
                key={item.name}
                href={item.href}
                title={item.name}
                className={`flex items-center justify-center px-3 py-2 rounded-lg transition-colors ${
                  isActive(item.href) ? "bg-blue-50 text-blue-700" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"
                }`}
              >
                <span className="w-5 h-5">{item.icon}</span>
              </Link>
            );
          }

          return (
            <div key={item.name}>
              <Link
                href={hasChildren ? "#" : item.href}
                onClick={(e) => hasChildren && e.preventDefault()}
                className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                  isActive(item.href)
                    ? "bg-blue-50 text-blue-700 border-l-4 border-blue-700"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span className="flex-shrink-0 w-5 h-5 text-gray-400 group-hover:text-gray-500">{item.icon}</span>
                {!isCollapsed && (
                  <div className="ml-3 flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{item.name}</span>
                      {hasChildren && (
                        <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
                      )}
                      {item.badge && (
                        <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">{item.badge}</span>
                      )}
                    </div>
                    {!isCollapsed && item.description && (
                      <p className="text-xs text-gray-500 mt-0.5">{item.description}</p>
                    )}
                  </div>
                )}
              </Link>
              {!isCollapsed && hasChildren && (
                <div className="ml-8 mt-1 space-y-1">
                  {item.children!.map((child) => (
                    <Link
                      key={child.name}
                      href={child.href}
                      className={`group flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        pathname === child.href || pathname.startsWith(child.href + "/")
                          ? "bg-blue-50 text-blue-700"
                          : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                      }`}
                    >
                      <span className="flex-shrink-0 w-4 h-4 text-gray-400">{child.icon}</span>
                      <div className="ml-3 flex-1">
                        <span className="text-xs">{child.name}</span>
                        {!isCollapsed && child.description && (
                          <p className="text-xs text-gray-400 mt-0.5">{child.description}</p>
                        )}
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Section */}
      {!isCollapsed && (
        <div className="border-t border-gray-200 p-4">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">
                {user?.firstName?.charAt(0) || user?.primaryEmailAddress?.emailAddress?.charAt(0) || "U"}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.firstName || "Usuario"}
              </p>
              <p className="text-xs text-gray-500 truncate">
                {user?.primaryEmailAddress?.emailAddress}
              </p>
            </div>
          </div>
          <form action="/api/auth/signout" method="POST">
            <button type="submit" className="w-full flex items-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg transition-colors">
              <LogOut className="h-4 w-4" />
              Cerrar Sesión
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}

export default UnifiedSidebar;