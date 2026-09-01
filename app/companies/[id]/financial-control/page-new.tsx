'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  ChevronLeft, 
  Menu, 
  FileText, 
  ShoppingCart, 
  BarChart3, 
  Building2,
  CreditCard,
  PiggyBank,
  Activity,
  Target
} from 'lucide-react';

interface FinancialControlProps {
  companyId: string;
}

export default function FinancialControlPage({ companyId }: FinancialControlProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Mock data
  const kpis = {
    occupancyRate: 85,
    revenuePerUnit: 45000,
    cac: 120000,
    operatingMargin: 35,
    cashFlow: 250000,
    inventoryTurnover: 12,
    maintenanceCost: 15000,
    replacementFund: 50000
  };

  const fixedCosts = {
    rent: 80000,
    salaries: 60000,
    insurance: 15000,
    internet: 2000,
    permits: 5000,
    utilities: 8000,
    maintenance: 10000
  };

  const variableCosts = {
    electricity: 12000,
    water: 3000,
    cleaning: 8000,
    materials: 25000,
    preventive: 5000
  };

  // Load financial data
  useEffect(() => {
    setLoading(false);
  }, [companyId]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-gray-600">Cargando...</div>
        </div>
      </div>
    );
  }

  const getOccupancyColor = (rate: number) => {
    if (rate >= 80) return 'text-green-600';
    if (rate >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-green-600';
    if (margin >= 25) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getCashFlowColor = (flow: number) => {
    if (flow > 0) return 'text-green-600';
    return 'text-red-600';
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Control Financiero</h1>
          <p className="text-gray-500">Gestión financiera y análisis de rendimiento</p>
        </div>
        
        {/* Single Dropdown Menu */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 px-3">
              <Menu className="w-4 h-4 mr-2" />
              Menú
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" className="w-64" forceMount>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/modules`)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Menú Principal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/suppliers`)}>
              <Building2 className="w-4 h-4 mr-2" />
              Proveedores
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/accounts-payable`)}>
              <CreditCard className="w-4 h-4 mr-2" />
              Ctas. por Pagar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases`)}>
              <ShoppingCart className="w-4 h-4 mr-2" />
              Compras
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases/dashboard`)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard de Compras
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/financial-control`)}>
              <PiggyBank className="w-4 h-4 mr-2" />
              Control Financiero
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen</TabsTrigger>
          <TabsTrigger value="kpis">KPIs</TabsTrigger>
          <TabsTrigger value="costs">Costos</TabsTrigger>
          <TabsTrigger value="cashflow">Flujo de Caja</TabsTrigger>
          <TabsTrigger value="units">Unidades</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Tasa de Ocupación</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getOccupancyColor(kpis.occupancyRate)}>
                    {kpis.occupancyRate}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">Objetivo: 70%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Ingreso por Cubículo</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(kpis.revenuePerUnit)}
                </div>
                <p className="text-xs text-gray-500">Promedio mensual</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Margen Operativo</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getMarginColor(kpis.operatingMargin)}>
                    {kpis.operatingMargin}%
                  </span>
                </div>
                <p className="text-xs text-gray-500">Objetivo: 25-40%</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Flujo de Caja</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  <span className={getCashFlowColor(kpis.cashFlow)}>
                    {formatCurrency(kpis.cashFlow)}
                  </span>
                </div>
                <p className="text-xs text-gray-500">Este mes</p>
              </CardContent>
            </Card>
          </div>

          {/* Breake Even Point */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Punto de Equilibrio</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Costos Fijos:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts.rent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costos Variables:</span>
                  <span className="font-medium">{formatCurrency(variableCosts.electricity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Mensual:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts.rent + variableCosts.electricity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Punto Equilibrio:</span>
                  <span className="font-medium text-green-600">
                    {Math.round((fixedCosts.rent + variableCosts.electricity) / kpis.revenuePerUnit)} días
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Indicadores Clave</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tasa de Ocupación</span>
                  <Badge variant={kpis.occupancyRate >= 70 ? 'default' : 'secondary'}>
                    {kpis.occupancyRate}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${kpis.occupancyRate}%` }}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Costos Fijos Mensuales</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Renta del local:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts.rent)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Salarios:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts.salaries)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seguros:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts.insurance)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Internet:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts.internet)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Permisos:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts.permits)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Servicios:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts.utilities)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mantenimiento:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts.maintenance)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total Fijos:</span>
                    <span className="text-cyan-600">{formatCurrency(
                      Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0)
                    )}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Costos Variables</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Electricidad:</span>
                  <span className="font-medium">{formatCurrency(variableCosts.electricity)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Agua:</span>
                  <span className="font-medium">{formatCurrency(variableCosts.water)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Limpieza:</span>
                  <span className="font-medium">{formatCurrency(variableCosts.cleaning)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Materiales:</span>
                  <span className="font-medium">{formatCurrency(variableCosts.materials)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preventivo:</span>
                  <span className="font-medium">{formatCurrency(variableCosts.preventive)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total Variables:</span>
                    <span className="text-cyan-600">{formatCurrency(
                      Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0)
                    )}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Cash Flow Tab */}
        <TabsContent value="cashflow" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Flujo de Caja</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Flujo neto mensual:</span>
                  <span className={`font-medium ${kpis.cashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(kpis.cashFlow)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Margen operativo:</span>
                  <span className={`font-medium ${kpis.operatingMargin >= 25 ? 'text-green-600' : 'text-red-600'}`}>
                    {kpis.operatingMargin}%
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Fondo de reposición:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(kpis.replacementFund)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Units Tab */}
        <TabsContent value="units" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Rendimiento por Unidad</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <div className="font-medium">Consultorio 1</div>
                      <div className="text-sm text-gray-500">ID: unit-1</div>
                    </div>
                    <div className="text-right">
                      <Badge variant="default">95% ocupación</Badge>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Ingresos:</span>
                      <div className="font-medium text-green-600">{formatCurrency(55000)}</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Costos:</span>
                      <div className="font-medium text-red-600">{formatCurrency(35000)}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-600">Utilización:</span>
                      <div className="font-medium">85%</div>
                    </div>
                    <div>
                      <span className="text-gray-600">Beneficio:</span>
                      <div className="font-medium text-green-600">{formatCurrency(20000)}</div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
