'use client';

import { useState, useEffect, use } from 'react';
import { useParams, useRouter, usePathname } from 'next/navigation';
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
  Target,
  AlertCircle,
  AlertTriangle,
  Plus
} from 'lucide-react';

interface FinancialControlProps {
  params: Promise<{
    id: string;
  }>;
}

interface KPIData {
  occupancyRate: number;
  revenuePerUnit: number;
  cac: number;
  operatingMargin: number;
  cashFlow: number;
  inventoryTurnover: number;
  maintenanceCost: number;
  replacementFund: number;
}

interface FixedCosts {
  rent: number;
  salaries: number;
  insurance: number;
  internet: number;
  permits: number;
  utilities: number;
  maintenance: number;
}

interface VariableCosts {
  electricity: number;
  water: number;
  cleaning: number;
  materials: number;
  preventive: number;
}

interface CashFlowData {
  month: string;
  income: number;
  expenses: number;
  netCashFlow: number;
  cumulativeCashFlow: number;
}


export default function FinancialControlPage({ params }: FinancialControlProps) {
  const { id: companyId } = use(params);
  const router = useRouter();
  const pathname = usePathname();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  const [customKPIs, setCustomKPIs] = useState<any[]>([]);
  const [showAddKPI, setShowAddKPI] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Functions to handle custom KPIs with real APIs
  const addCustomKPI = async (newKPI: any) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/custom-kpis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newKPI),
      });

      if (response.ok) {
        const result = await response.json();
        const newKPIs = [...customKPIs, result.data];
        setCustomKPIs(newKPIs);
        // Save to localStorage
        const storageKey = `customKPIs_${companyId}`;
        const userKPIs = newKPIs.filter(kpi => !['kpi-1', 'kpi-2', 'kpi-3'].includes(kpi.id));
        localStorage.setItem(storageKey, JSON.stringify(userKPIs));
        setShowAddKPI(false);
      } else {
        console.error('Failed to save custom KPI');
      }
    } catch (error) {
      console.error('Error saving custom KPI:', error);
    }
  };

  const deleteCustomKPI = async (id: string) => {
    try {
      const response = await fetch(`/api/companies/${companyId}/custom-kpis?id=${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        const newKPIs = customKPIs.filter(kpi => kpi.id !== id);
        setCustomKPIs(newKPIs);
        // Update localStorage
        const storageKey = `customKPIs_${companyId}`;
        const userKPIs = newKPIs.filter(kpi => !['kpi-1', 'kpi-2', 'kpi-3'].includes(kpi.id));
        localStorage.setItem(storageKey, JSON.stringify(userKPIs));
      } else {
        console.error('Failed to delete custom KPI');
      }
    } catch (error) {
      console.error('Error deleting custom KPI:', error);
    }
  };

  // State for real data
  const [kpis, setKPIs] = useState<any>(null);
  const [fixedCosts, setFixedCosts] = useState<FixedCosts | null>(null);
  const [variableCosts, setVariableCosts] = useState<VariableCosts | null>(null);
  const [cashFlowData, setCashFlowData] = useState<any[]>([]);

  // Load financial data from APIs
  useEffect(() => {
    const loadFinancialData = async () => {
      try {
        setLoading(true);
        
        // Load KPIs
        const kpisResponse = await fetch(`/api/companies/${companyId}/kpis`);
        if (kpisResponse.ok) {
          const kpisData = await kpisResponse.json();
          setKPIs(kpisData);
        }

        // Load Costs
        const costsResponse = await fetch(`/api/companies/${companyId}/costs`);
        if (costsResponse.ok) {
          const costsData = await costsResponse.json();
          setFixedCosts(costsData.fixed);
          setVariableCosts(costsData.variable);
        }

        // Load Cash Flow
        const cashFlowResponse = await fetch(`/api/companies/${companyId}/cashflow`);
        if (cashFlowResponse.ok) {
          const cashFlowData = await cashFlowResponse.json();
          setCashFlowData(cashFlowData);
        }

        // Load Custom KPIs from API and merge with localStorage
        const customKPIsResponse = await fetch(`/api/companies/${companyId}/custom-kpis`);
        if (customKPIsResponse.ok) {
          const apiKPIs = await customKPIsResponse.json();
          // Load user-added KPIs from localStorage
          const storageKey = `customKPIs_${companyId}`;
          const savedKPIs = localStorage.getItem(storageKey);
          const userKPIs = savedKPIs ? JSON.parse(savedKPIs) : [];
          // Combine API KPIs (defaults) with user-added KPIs
          setCustomKPIs([...apiKPIs, ...userKPIs]);
        }

      } catch (error) {
        console.error('Error loading financial data:', error);
        setError('Error al cargar los datos financieros. Por favor, intente nuevamente.');
      } finally {
        setLoading(false);
      }
    };

    loadFinancialData();
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
          <div className="text-gray-600">Cargando datos financieros...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center py-12">
          <div className="text-red-600 mb-4">{error}</div>
          <Button onClick={() => window.location.reload()}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  const calculateBreakeEvenPoint = () => {
    if (!fixedCosts || !variableCosts) return 0;
    const totalFixedCosts = Object.values(fixedCosts).reduce((sum: number, cost: number) => sum + cost, 0);
    const totalVariableCosts = Object.values(variableCosts).reduce((sum: number, cost: number) => sum + cost, 0);
    return totalFixedCosts + totalVariableCosts;
  };

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

  // Dynamic menu based on current page
  const getMenuItems = () => {
    const currentPage = pathname.split('/').pop() || '';
    
    if (currentPage === 'financial-control') {
      return [
        { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
        { icon: Building2, label: 'Proveedores', href: `/companies/${companyId}/suppliers` },
        { icon: CreditCard, label: 'Ctas. por Pagar', href: `/companies/${companyId}/accounts-payable` },
        { icon: ShoppingCart, label: 'Compras', href: `/companies/${companyId}/purchases` },
        { icon: BarChart3, label: 'Dashboard de Compras', href: `/companies/${companyId}/purchases/dashboard` },
        { icon: FileText, label: 'Reportes', href: `/companies/${companyId}/reports` },
        { icon: Target, label: 'Configuración', href: `/companies/${companyId}/settings` }
      ];
    }
    
    if (currentPage === 'purchases') {
      return [
        { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
        { icon: Building2, label: 'Proveedores', href: `/companies/${companyId}/suppliers` },
        { icon: CreditCard, label: 'Ctas. por Pagar', href: `/companies/${companyId}/accounts-payable` },
        { icon: BarChart3, label: 'Dashboard de Compras', href: `/companies/${companyId}/purchases/dashboard` },
        { icon: PiggyBank, label: 'Control Financiero', href: `/companies/${companyId}/financial-control` },
        { icon: Plus, label: 'Nueva Compra', href: `/companies/${companyId}/purchases/new` }
      ];
    }
    
    if (currentPage === 'suppliers') {
      return [
        { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
        { icon: ShoppingCart, label: 'Compras', href: `/companies/${companyId}/purchases` },
        { icon: CreditCard, label: 'Ctas. por Pagar', href: `/companies/${companyId}/accounts-payable` },
        { icon: BarChart3, label: 'Dashboard de Compras', href: `/companies/${companyId}/purchases/dashboard` },
        { icon: PiggyBank, label: 'Control Financiero', href: `/companies/${companyId}/financial-control` },
        { icon: Plus, label: 'Nuevo Proveedor', href: `/companies/${companyId}/suppliers/new` }
      ];
    }
    
    if (currentPage === 'accounts-payable') {
      return [
        { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
        { icon: Building2, label: 'Proveedores', href: `/companies/${companyId}/suppliers` },
        { icon: ShoppingCart, label: 'Compras', href: `/companies/${companyId}/purchases` },
        { icon: BarChart3, label: 'Dashboard de Compras', href: `/companies/${companyId}/purchases/dashboard` },
        { icon: PiggyBank, label: 'Control Financiero', href: `/companies/${companyId}/financial-control` },
        { icon: Plus, label: 'Nueva Compra', href: `/companies/${companyId}/purchases/new` }
      ];
    }
    
    if (currentPage === 'dashboard') {
      return [
        { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
        { icon: Building2, label: 'Proveedores', href: `/companies/${companyId}/suppliers` },
        { icon: CreditCard, label: 'Ctas. por Pagar', href: `/companies/${companyId}/accounts-payable` },
        { icon: ShoppingCart, label: 'Compras', href: `/companies/${companyId}/purchases` },
        { icon: PiggyBank, label: 'Control Financiero', href: `/companies/${companyId}/financial-control` },
        { icon: FileText, label: 'Exportar Datos', href: `/companies/${companyId}/purchases/export` }
      ];
    }
    
    // Default menu
    return [
      { icon: ChevronLeft, label: 'Menú Principal', href: `/companies/${companyId}/modules` },
      { icon: Building2, label: 'Proveedores', href: `/companies/${companyId}/suppliers` },
      { icon: CreditCard, label: 'Ctas. por Pagar', href: `/companies/${companyId}/accounts-payable` },
      { icon: ShoppingCart, label: 'Compras', href: `/companies/${companyId}/purchases` },
      { icon: BarChart3, label: 'Dashboard de Compras', href: `/companies/${companyId}/purchases/dashboard` },
      { icon: PiggyBank, label: 'Control Financiero', href: `/companies/${companyId}/financial-control` }
    ];
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
            {getMenuItems().map((item, index) => {
              const IconComponent = item.icon;
              return (
                <DropdownMenuItem key={index} onClick={() => router.push(item.href)}>
                  <IconComponent className="w-4 h-4 mr-2" />
                  {item.label}
                </DropdownMenuItem>
              );
            })}
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
                  <span className={getOccupancyColor(kpis?.occupancyRate || 0)}>
                    {kpis?.occupancyRate || 0}%
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
                  {formatCurrency(kpis?.revenuePerUnit || 0)}
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
                  <span className={getMarginColor(kpis?.operatingMargin || 0)}>
                    {kpis?.operatingMargin || 0}%
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
                  <span className={getCashFlowColor(kpis?.cashFlow || 0)}>
                    {formatCurrency(kpis?.cashFlow || 0)}
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
              <AlertCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Costos Fijos:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts?.rent || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Costos Variables:</span>
                  <span className="font-medium">{formatCurrency(variableCosts?.electricity || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Total Mensual:</span>
                  <span className="font-medium">{formatCurrency(calculateBreakeEvenPoint())}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Punto Equilibrio:</span>
                  <span className="font-medium text-green-600">
                    {Math.round(calculateBreakeEvenPoint() / (kpis?.revenuePerUnit || 1))} días
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* KPIs Tab */}
        <TabsContent value="kpis" className="space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold">Indicadores Clave de Rendimiento</h2>
            <Button onClick={() => setShowAddKPI(true)} className="flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Agregar KPI
            </Button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Indicadores Clave</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Tasa de Ocupación</span>
                  <Badge variant={kpis?.occupancyRate >= 70 ? 'default' : 'secondary'}>
                    {kpis?.occupancyRate || 0}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${kpis?.occupancyRate || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Rentabilidad</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Margen Operativo</span>
                  <Badge variant={kpis?.operatingMargin >= 25 ? 'default' : 'secondary'}>
                    {kpis?.operatingMargin || 0}%
                  </Badge>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full"
                    style={{ width: `${Math.min(kpis?.operatingMargin || 0, 100)}%` }}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Eficiencia del Espacio</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Ingreso por Cubículo</span>
                  <span className="font-medium">{formatCurrency(kpis?.revenuePerUnit || 0)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Costos por Cubículo</span>
                  <span className="font-medium">{formatCurrency((kpis?.revenuePerUnit || 0) * 0.65)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Utilización</span>
                  <span className="font-medium">{kpis?.occupancyRate || 0}%</span>
                </div>
              </CardContent>
            </Card>

            {/* Custom KPIs */}
            {customKPIs.map((kpi) => (
              <Card key={kpi.id}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-lg font-bold">{kpi.name}</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deleteCustomKPI(kpi.id)}
                    className="h-8 w-8 p-0"
                  >
                    ×
                  </Button>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Valor Actual</span>
                    <Badge variant={kpi.value >= kpi.target ? 'default' : 'secondary'}>
                      {kpi.value} {kpi.unit}
                    </Badge>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-gray-600">Objetivo</span>
                    <span className="font-medium">{kpi.target} {kpi.unit}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`${kpi.value >= kpi.target ? 'bg-green-500' : 'bg-yellow-500'} h-2 rounded-full`}
                      style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500">
                    {Math.round((kpi.value / kpi.target) * 100)}% del objetivo
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Add KPI Modal */}
          {showAddKPI && (
            <Card className="border-2 border-dashed">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Agregar Nuevo KPI</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Nombre del KPI</label>
                    <input 
                      type="text" 
                      id="kpi-name"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Ej: ROI Marketing"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Unidad</label>
                    <select 
                      id="kpi-unit"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="%">Porcentaje (%)</option>
                      <option value="HNL">Lempiras (HNL)</option>
                      <option value="USD">Dólares (USD)</option>
                      <option value="días">Días</option>
                      <option value="horas">Horas</option>
                      <option value="unidades">Unidades</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Valor Actual</label>
                    <input 
                      type="number" 
                      id="kpi-value"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Objetivo</label>
                    <input 
                      type="number" 
                      id="kpi-target"
                      className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0"
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowAddKPI(false)}
                  >
                    Cancelar
                  </Button>
                  <Button 
                    onClick={() => {
                      const name = (document.getElementById('kpi-name') as HTMLInputElement).value;
                      const unit = (document.getElementById('kpi-unit') as HTMLSelectElement).value;
                      const value = parseFloat((document.getElementById('kpi-value') as HTMLInputElement).value) || 0;
                      const target = parseFloat((document.getElementById('kpi-target') as HTMLInputElement).value) || 0;
                      
                      if (name && value >= 0 && target > 0) {
                        addCustomKPI({ name, unit, value, target });
                      }
                    }}
                  >
                    Agregar KPI
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Costs Tab */}
        <TabsContent value="costs" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Costos Fijos Mensuales</CardTitle>
                <AlertCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Renta del local:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts?.rent || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Salarios:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts?.salaries || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Seguros:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts?.insurance || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Internet:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts?.internet || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Permisos:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts?.permits || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Servicios:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts?.utilities || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Mantenimiento:</span>
                  <span className="font-medium">{formatCurrency(fixedCosts?.maintenance || 0)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total Fijos:</span>
                    <span className="text-blue-600">{formatCurrency(
                      fixedCosts ? Object.values(fixedCosts).reduce((sum, cost) => sum + cost, 0) : 0
                    )}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-bold">Costos Variables</CardTitle>
                <AlertTriangle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Electricidad:</span>
                  <span className="font-medium">{formatCurrency(variableCosts?.electricity || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Agua:</span>
                  <span className="font-medium">{formatCurrency(variableCosts?.water || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Limpieza:</span>
                  <span className="font-medium">{formatCurrency(variableCosts?.cleaning || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Materiales:</span>
                  <span className="font-medium">{formatCurrency(variableCosts?.materials || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Preventivo:</span>
                  <span className="font-medium">{formatCurrency(variableCosts?.preventive || 0)}</span>
                </div>
                <div className="border-t pt-4">
                  <div className="flex justify-between font-bold">
                    <span>Total Variables:</span>
                    <span className="text-blue-600">{formatCurrency(
                      variableCosts ? Object.values(variableCosts).reduce((sum, cost) => sum + cost, 0) : 0
                    )}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Fondo de Reposición</CardTitle>
              <PiggyBank className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Porcentaje de ahorro mensual:</p>
                <p className="text-sm text-gray-500">
                  Ahorrado mensual: {formatCurrency((kpis?.revenuePerUnit || 0) * 0.02)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Monto total ahorrado:</p>
                <p className="text-sm text-gray-500">
                  Total estimado en 5 años: {formatCurrency((kpis?.revenuePerUnit || 0) * 12 * 5 * 0.02)}
                </p>
              </div>
              <div className="space-y-2">
                <p className="text-sm text-gray-600">Valor actual del fondo:</p>
                <p className="text-sm text-gray-500">
                  Acumulado: {formatCurrency(kpis?.replacementFund || 0)}
                </p>
              </div>
            </CardContent>
          </Card>
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
                {cashFlowData.map((item, index) => (
                  <div key={item.month} className="flex justify-between items-center pb-2 border-b last:border-b-0">
                    <div>
                      <div className="font-medium">{item.month}</div>
                      <div className="text-sm text-gray-500">
                        Ingresos: {formatCurrency(item.income)} | Egresos: {formatCurrency(item.expenses)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`text-sm font-medium ${item.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(item.netCashFlow)}
                      </div>
                      <div className={`text-xs text-gray-500 ${item.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        Flujo acumulado: {formatCurrency(item.cumulativeCashFlow)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-bold">Resumen de Flujo</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-600">Ingresos totales:</span>
                  <span className="font-medium text-green-600">
                    {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.income, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Egresos totales:</span>
                  <span className="font-medium text-red-600">
                    {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.expenses, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flujo neto:</span>
                  <span className={`font-medium ${cashFlowData.reduce((sum, item) => sum + item.netCashFlow, 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(cashFlowData.reduce((sum, item) => sum + item.netCashFlow, 0))}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Flujo acumulado:</span>
                  <span className={`font-medium ${cashFlowData[cashFlowData.length - 1]?.cumulativeCashFlow >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(cashFlowData[cashFlowData.length - 1]?.cumulativeCashFlow || 0)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Units Performance Tab */}
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
