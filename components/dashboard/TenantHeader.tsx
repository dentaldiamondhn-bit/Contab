"use client";

import { CompanySwitcher } from "./CompanySwitcher";
import { Button } from "@/components/ui/button";
import { Bell, Settings, LogOut, User, ChevronDown, AlertCircle, XCircle, Shield, Eye } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/contexts/TenantContext";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { useState, useEffect } from "react";
import { useClerk } from "@clerk/nextjs";

interface TenantHeaderProps {
  tenants: Array<{
    id: string;
    businessName: string;
    businessRTN?: string;
    industry?: string;
    subscriptionType?: string;
    isActive?: boolean;
  }>;
}

export function TenantHeader({ tenants }: TenantHeaderProps) {
  const { currentTenant, tenants: contextTenants, isSuperAdmin, isImpersonating, exitImpersonation } = useTenant();
  const { user } = useUser();
  const { signOut } = useClerk();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);
  
  // Use tenants from context, fallback to props if needed
  const availableTenants = contextTenants.length > 0 ? contextTenants : tenants;

  // Obtener iniciales del nombre del usuario
  const getUserInitials = () => {
    if (!user) return "U";
    if (user.firstName && user.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user.firstName) {
      return user.firstName[0].toUpperCase();
    }
    return "U";
  };

  // Obtener nombre completo del usuario
  const getFullName = () => {
    if (!user) return "Usuario";
    if (user.firstName && user.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    if (user.firstName) {
      return user.firstName;
    }
    return "Usuario";
  };

  const executeLogout = async () => {
    try {
      // 1. Ejecutar el cierre de sesión de Clerk
      await signOut();

      // 2. Limpiar datos de persistencia local del tenant
      if (typeof window !== 'undefined') {
        localStorage.removeItem('selected_tenant');
        localStorage.removeItem('tenant_id');
        document.cookie = "impersonated_tenant_id=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;";
      }

      // 3. Redirigir manualmente para asegurar que el estado se limpie por completo
      window.location.href = '/auth/login';
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
      window.location.href = '/auth/login'; // Redirección forzada si falla el SDK
    }
  };

  return (
    <>
      {/* Banner de Estado para Super Admin */}
      {mounted && isSuperAdmin && (
        <div className={`w-full py-1.5 px-4 text-center text-[10px] font-black tracking-[0.2em] uppercase flex items-center justify-center gap-2 shadow-inner transition-colors duration-500 relative ${
          isImpersonating ? "bg-amber-500 text-white" : "bg-indigo-700 text-indigo-50"
        }`}>
          {isImpersonating ? (
            <>
              <Eye className="h-3 w-3" />
              <span>Modo Vista de Cliente: {currentTenant?.businessName || 'Empresa seleccionada'}</span>
              <button 
                onClick={exitImpersonation}
                className="absolute right-2 sm:right-4 bg-white/20 hover:bg-white/30 transition-colors px-2 py-0.5 rounded flex items-center gap-1 normal-case tracking-normal font-bold"
                title="Salir de vista de cliente"
              >
                <span className="hidden sm:inline">Cerrar Vista</span>
                <XCircle className="h-3 w-3" />
              </button>
            </>
          ) : (
            <>
              <Shield className="h-3 w-3" />
              <span>Panel de Control Global: Modo Sistema</span>
            </>
          )}
        </div>
      )}

      <header className="relative border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo y Company Switcher */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 bg-indigo-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">C</span>
              </div>
              <span className="font-semibold text-lg">Contab</span>
            </div>
            <CompanySwitcher tenants={availableTenants} />
          </div>

          {/* Info del Tenant Actual */}
          <div className="flex items-center gap-4">
            {currentTenant && (
              <div className="hidden md:flex items-center gap-3 px-3 py-2 bg-gray-50 rounded-lg">
                <div className="text-sm">
                  <div className="font-medium">{currentTenant.businessName}</div>
                  {currentTenant.businessRTN && (
                    <div className="text-xs text-muted-foreground">RTN: {currentTenant.businessRTN}</div>
                  )}
                </div>
                {(currentTenant as any).subscriptionType && (
                  <Badge variant="secondary" className="text-xs">
                    {(currentTenant as any).subscriptionType}
                  </Badge>
                )}
              </div>
            )}

            {/* Acciones del Usuario */}
            <div className="flex items-center gap-2">
              {mounted && isImpersonating && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={exitImpersonation}
                  className="hidden sm:flex items-center gap-2 border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800 font-bold rounded-full px-4 h-9 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300"
                >
                  <XCircle className="h-4 w-4" />
                  <span className="text-xs">Salir de Vista Cliente</span>
                </Button>
              )}

              <Button variant="ghost" size="sm">
                <Bell className="h-4 w-4" />
                <span className="sr-only">Notificaciones</span>
              </Button>
              
              {/* Menú Desplegable del Usuario */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 px-3 py-2 hover:bg-gray-100 rounded-lg"
                >
                  <div className="h-8 w-8 bg-indigo-600 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">{getUserInitials()}</span>
                  </div>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium">{mounted ? getFullName() : '...'}</div>
                    <div className="text-xs text-muted-foreground">{mounted ? ((user?.publicMetadata?.role as string) || 'Usuario') : '...'}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>

                {/* Menú Desplegable */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-4 w-72 bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.15)] border border-gray-100 py-2 z-50 transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                    {/* Encabezado del Menú */}
                    <div className="px-6 py-5 bg-gradient-to-br from-indigo-50/50 to-white border-b border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 bg-gradient-to-tr from-indigo-600 to-indigo-500 rounded-full flex items-center justify-center text-white text-lg font-bold shadow-lg shadow-indigo-200 ring-2 ring-white">
                          {getUserInitials()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <p className="text-base font-bold text-gray-900 truncate">{getFullName()}</p>
                          <p className="text-xs text-gray-500 truncate font-medium">{user?.primaryEmailAddress?.emailAddress}</p>
                        </div>
                      </div>
                      <div className="mt-4 flex items-center gap-2">
                        <Badge variant="secondary" className="text-[10px] font-bold bg-indigo-100/50 text-indigo-700 border-none px-2 py-0">
                          {(user?.publicMetadata?.subscription_plan as string)?.toUpperCase() || 'BASIC PLAN'}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] font-bold text-emerald-600 border-emerald-100 bg-emerald-50/30 px-2 py-0 uppercase">
                          {isImpersonating ? 'VISTA CLIENTE' : (isSuperAdmin ? 'SISTEMA' : ((user?.publicMetadata?.role as string) || 'USUARIO'))}
                        </Badge>
                      </div>
                    </div>

                    {/* Opciones del Menú */}
                    <div className="p-2 space-y-1">
                      <Link href="/account/profile" className="block group">
                        <div className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-indigo-50/50 hover:text-indigo-600 rounded-xl transition-all duration-200">
                          <User className="h-5 w-5 mr-3 text-gray-400 group-hover:text-indigo-500" />
                          Mi Perfil
                        </div>
                      </Link>
                      
                      <Link href="/account/profile" className="block group">
                        <div className="flex items-center px-4 py-3 text-sm font-medium text-gray-700 hover:bg-indigo-50/50 hover:text-indigo-600 rounded-xl transition-all duration-200">
                          <Settings className="h-5 w-5 mr-3 text-gray-400 group-hover:text-indigo-500" />
                          Configuración
                        </div>
                      </Link>

                      <div className="h-px bg-gray-100 my-2 mx-4" />

                      <button
                        type="button"
                        onClick={() => {
                          setShowLogoutModal(true);
                          setUserMenuOpen(false);
                        }}
                        className="flex items-center w-full px-4 py-3 text-sm font-bold text-red-600 hover:bg-red-50 rounded-xl transition-all duration-200 group"
                      >
                        <LogOut className="h-5 w-5 mr-3 text-red-400 group-hover:text-red-600" />
                        Cerrar Sesión
                      </button>
                    </div>
                  </div>
                )}

                {/* Cerrar menú al hacer clic fuera */}
                {userMenuOpen && (
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      </header>

      {/* Modal de Confirmación de Cierre de Sesión Estilizado */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden transform animate-in zoom-in-95 duration-200 relative z-[101]">
            <div className="p-8 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-50 mb-6">
                <AlertCircle className="h-10 w-10 text-red-600" />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                ¿Cerrar sesión?
              </h3>
              <p className="text-sm text-gray-500 mb-8">
                ¿Estás seguro de que deseas salir del sistema? Tendrás que volver a ingresar tus credenciales para acceder a tus empresas.
              </p>
              <div className="flex flex-col gap-3">
                <Button
                  variant="destructive"
                  type="button"
                  size="lg"
                  onClick={executeLogout}
                  className="w-full rounded-2xl h-12 font-bold shadow-lg shadow-red-200"
                >
                  Cerrar Sesión
                </Button>
                <Button
                  variant="ghost"
                  type="button"
                  size="lg"
                  onClick={() => setShowLogoutModal(false)}
                  className="w-full rounded-2xl h-12 font-medium text-gray-600 hover:bg-gray-50"
                >
                  Cancelar
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
