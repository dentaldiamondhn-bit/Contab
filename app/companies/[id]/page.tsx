'use client';

import { useParams } from 'next/navigation';
import { Card, CardContent, Link as LinkCard } from '@/components/ui/card';
import { 
  Building2, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  PieChart,
  BarChart3,
  Users,
  Package,
  ShoppingCart,
  Receipt,
  Calculator,
  Shield,
  Briefcase,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import InvoiceStats from '@/components/dashboard/InvoiceStats';
import InventoryStats from '@/components/dashboard/InventoryStats';
import PurchasesStats from '@/components/dashboard/PurchasesStats';

export default function TenantDashboard() {
  const params = useParams();
  const companyId = params.id as string;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">

      {/* Estadísticas de Facturación */}
      <InvoiceStats tenantId={companyId} />

      {/* Estadísticas de Inventario */}
      <InventoryStats tenantId={companyId} />

      {/* Estadísticas de Compras */}
      <PurchasesStats tenantId={companyId} />

      {/* Accesos Rápidos */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Accesos Rápidos</h2>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href={`/companies/${companyId}/inventory`}>
              <CardContent className="p-6 text-center">
                <Package className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Inventario</h3>
                <p className="text-sm text-gray-600">Gestionar productos y existencias</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href={`/companies/${companyId}/purchases`}>
              <CardContent className="p-6 text-center">
                <ShoppingCart className="h-12 w-12 text-green-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Compras</h3>
                <p className="text-sm text-gray-600">Registrar y gestionar compras</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href={`/companies/${companyId}/suppliers`}>
              <CardContent className="p-6 text-center">
                <Users className="h-12 w-12 text-purple-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Proveedores</h3>
                <p className="text-sm text-gray-600">Administrar proveedores</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href={`/companies/${companyId}/accounting`}>
              <CardContent className="p-6 text-center">
                <Calculator className="h-12 w-12 text-indigo-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Contabilidad</h3>
                <p className="text-sm text-gray-600">Libros y asientos contables</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href={`/companies/${companyId}/billing/pos`}>
              <CardContent className="p-6 text-center">
                <Receipt className="h-12 w-12 text-orange-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Facturación</h3>
                <p className="text-sm text-gray-600">Punto de venta y facturación</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href={`/companies/${companyId}/business-reports`}>
              <CardContent className="p-6 text-center">
                <PieChart className="h-12 w-12 text-teal-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Reportes</h3>
                <p className="text-sm text-gray-600">Informes y reportes del negocio</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href={`/companies/${companyId}/security`}>
              <CardContent className="p-6 text-center">
                <Shield className="h-12 w-12 text-red-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Seguridad</h3>
                <p className="text-sm text-gray-600">CAI, retenciones y más</p>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-lg transition-shadow cursor-pointer">
            <Link href={`/companies/${companyId}/modules`}>
              <CardContent className="p-6 text-center">
                <Briefcase className="h-12 w-12 text-gray-600 mx-auto mb-4" />
                <h3 className="font-semibold text-lg mb-2">Módulos</h3>
                <p className="text-sm text-gray-600">Gestionar módulos del plan</p>
              </CardContent>
            </Link>
          </Card>
        </div>
      </div>
    </div>
  );
}
