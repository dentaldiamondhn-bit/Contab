"use client";

import { CompanySwitcher } from "./CompanySwitcher";
import { Button } from "@/components/ui/button";
import { Bell, Settings, LogOut, User, ChevronDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useTenant } from "@/lib/contexts/TenantContext";
import { useUser } from "@/contexts/UserContext";
import Link from "next/link";
import { useState } from "react";

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
  const { currentTenant } = useTenant();
  const { user } = useUser();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Obtener iniciales del nombre del usuario
  const getUserInitials = () => {
    if (!user) return "U";
    if (user.first_name && user.last_name) {
      return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
    }
    if (user.first_name) {
      return user.first_name[0].toUpperCase();
    }
    return "U";
  };

  // Obtener nombre completo del usuario
  const getFullName = () => {
    if (!user) return "Usuario";
    if (user.first_name && user.last_name) {
      return `${user.first_name} ${user.last_name}`;
    }
    if (user.first_name) {
      return user.first_name;
    }
    return "Usuario";
  };

  const handleLogout = () => {
    // Aquí iría la lógica de logout
    console.log('Cerrando sesión...');
    window.location.href = '/login';
  };

  return (
    <header className="border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
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
            <CompanySwitcher tenants={tenants} />
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
                    <div className="text-sm font-medium">{getFullName()}</div>
                    <div className="text-xs text-muted-foreground">{user?.role || 'Usuario'}</div>
                  </div>
                  <ChevronDown className="h-4 w-4 text-gray-500" />
                </Button>

                {/* Menú Desplegable */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                    {/* Encabezado del Menú */}
                    <div className="px-4 py-3 border-b border-gray-200">
                      <p className="text-sm font-medium text-gray-900">{getFullName()}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                      <div className="mt-1">
                        <Badge variant="secondary" className="text-xs">
                          {user?.subscription_plan || 'Basic'}
                        </Badge>
                      </div>
                    </div>

                    {/* Opciones del Menú */}
                    <div className="py-1">
                      <Link href="/account/profile">
                        <div className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          <User className="h-4 w-4 mr-3 text-gray-400" />
                          Perfil
                        </div>
                      </Link>
                      
                      <Link href="/account/profile">
                        <div className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          <Settings className="h-4 w-4 mr-3 text-gray-400" />
                          Ajustes de Cuenta
                        </div>
                      </Link>

                      <div className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                        <Bell className="h-4 w-4 mr-3 text-gray-400" />
                        Notificaciones
                      </div>

                      <div className="border-t border-gray-200 mt-1 pt-1">
                        <div className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 cursor-pointer">
                          <Settings className="h-4 w-4 mr-3 text-gray-400" />
                          Configuración
                        </div>
                      </div>

                      <div className="border-t border-gray-200 mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <LogOut className="h-4 w-4 mr-3" />
                          Cerrar Sesión
                        </button>
                      </div>
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
  );
}
