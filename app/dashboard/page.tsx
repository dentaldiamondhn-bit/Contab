"use client";

import { useTenant } from "@/lib/contexts/TenantContext";
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

export default function DashboardPage() {
  const { currentTenant } = useTenant();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 0
    }).format(amount);
  };

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
      {/* Header del Dashboard */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard Contable</h1>
        <p className="text-gray-600">
          Gestión contable para <span className="font-medium">{currentTenant.businessName}</span>
        </p>
        {currentTenant.businessRTN && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="text-xs">
              RTN: {currentTenant.businessRTN}
            </Badge>
            {currentTenant.industry && (
              <Badge variant="secondary" className="text-xs">
                {currentTenant.industry}
              </Badge>
            )}
            <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
              Dashboard Activo
            </Badge>
          </div>
        )}
      </div>

      {/* Estadísticas de Facturación */}
      {currentTenant && (
        <InvoiceStats tenantId={currentTenant.id} />
      )}

      {/* Estadísticas de Inventario */}
      {currentTenant && (
        <InventoryStats tenantId={currentTenant.id} />
      )}

      
      {/* Sección de Enlaces Rápidos a Contabilidad */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href="/transactions">
              <CardContent className="p-6 text-center">
                <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
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
