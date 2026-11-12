"use client";

import { useTenant } from "@/lib/contexts/TenantContext";
import { useUser } from "@clerk/nextjs";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Eye,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Filter,
  Search,
  LayoutGrid,
  Users
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import InvoiceStats from "@/components/dashboard/InvoiceStats";
import InventoryStats from "@/components/dashboard/InventoryStats";
import DespachoDashboard from "@/components/accountant/DespachoDashboard";
import { useWorkspace } from "@/lib/contexts/WorkspaceContext";

export default function DashboardPage() {
  const { currentTenant, currentCompany } = useTenant();
  const { user, isLoaded } = useUser();
  const { empresas } = useWorkspace();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  // El contador llega aqui porque `/dashboard` es la landing comun, y esta pagina
  // leia el tenant activo: un dashboard de UNA empresa. El panel del despacho es
  // de las N empresas, asi que decide por `relationship` y no por el rol global de
  // Clerk (que se desincroniza de la membresia; ver AGENTS.md 1b). `empresas` viene
  // de `/api/workspace`, ya validada contra `user_company_access`.
  const esContador = empresas.some((e) => e.relationship === 'accountant');

  useEffect(() => {
    setMounted(true);
  }, []);

  // Helper: lee la cookie de impersonación en el momento de ejecución del effect,
  // evitando el cierre obsoleto que produce un redirect loop para SUPER_ADMIN.
  const readIsImpersonatingCookie = () =>
    typeof document !== 'undefined' && document.cookie.includes('impersonated_tenant_id=');

useEffect(() => {
      // Si estamos en modo impersonación (cookie seteada por TenantContext o manualmente),
      // no redirigir por rol de administrador — el usuario está viendo el dashboard como cliente.
      // Tampoco se redirige al contador: `/accountant/*` exige rol `ACCOUNTANT` en Clerk
      // y su layout no valida la membresía, así que un contador cuyo Clerk diga ADMIN
      // (p. ej. `gcalix12`) se quedaría en un bucle de redirects. Se sirve aquí el panel.
      if (!user || !isLoaded || !mounted || esContador || readIsImpersonatingCookie()) return;
      
      // Check multiple sources for role metadata (same as in auth-utils)
      const userRole = user.publicMetadata?.role ||
                      user.unsafeMetadata?.role ||
                      (user as any).privateMetadata?.role;
          
      if (userRole === 'SUPER_ADMIN' || userRole === 'SUPPORT') {
        router.replace('/admin/dashboard');
      } else if (userRole === 'ADMIN' || userRole === 'MANAGER' || userRole === 'TENANT_ADMIN') {
        router.replace('/tenant-admin/dashboard');
      }
    }, [user, isLoaded, mounted, router, currentCompany, esContador]);

    // Mostrar loading mientras se verifica el rol (incluye isLoaded para que Clerk termine de hidratar)
    console.log('[DashboardPage] render check:', { user: !!user, isLoaded, mounted, currentTenant: !!currentTenant, userRole: user?.publicMetadata?.role });
    if (!user || !isLoaded || !mounted) {
      console.log('[DashboardPage] → spinner: !user || !isLoaded || !mounted');
      return (
        <div className="flex items-center justify-center min-h-screen">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600"></div>
        </div>
      );
    }

  // El panel se sirve ANTES del bloque de `currentTenant` a propósito: el panel
  // abraza a las N empresas y no necesita que haya un tenant único seleccionado.
  // `currentTenant` es un solo tenant (de ahí el `tenant_id` legacy), y exigirlo
  // aquí dejaría al contador sin panel mientras no eligiera una empresa.
  if (esContador) {
    return <DespachoDashboard />;
  }

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Building2 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Selecciona una Empresa</h3>
          <p className="text-gray-500">Por favor selecciona una empresa para ver el dashboard</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Estadísticas de Facturación */}
      {currentTenant && (
        <InvoiceStats tenantId={currentTenant.id} companyId={currentCompany?.id} />
      )}

      {/* Estadísticas de Inventario */}
      {currentTenant && (
        <InventoryStats tenantId={currentTenant.id} companyId={currentCompany?.id} />
      )}

      
      {/* Sección de Enlaces Rápidos a Contabilidad */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/transactions">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-cyan-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Transacciones</h3>
                <p className="text-sm text-gray-600">Gestionar asientos contables</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/contacts">
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Contactos</h3>
                <p className="text-sm text-gray-600">Gestionar clientes y prospectos</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/reports">
              <CardContent className="p-6 text-center">
                <PieChart className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Reportes Financieros</h3>
                <p className="text-sm text-gray-600">Estado de resultados, balance</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/multi-currency">
              <CardContent className="p-6 text-center">
                <DollarSign className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Multi-Divisa</h3>
                <p className="text-sm text-gray-600">HNL/USD y tasas de cambio</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/import-export">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Importar/Exportar</h3>
                <p className="text-sm text-gray-600">Archivos Excel y CSV</p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
