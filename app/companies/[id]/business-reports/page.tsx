'use client';

import { useState, useEffect, use } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  DollarSign, 
  Users, 
  Wrench, 
  Megaphone,
  ChevronLeft,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface BusinessReportsPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function BusinessReportsPage({ params }: BusinessReportsPageProps) {
  const { id: companyId } = use(params);
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);
  
  // Report data states
  const [profitabilityData, setProfitabilityData] = useState<any>(null);
  const [occupancyData, setOccupancyData] = useState<any>(null);
  const [maintenanceData, setMaintenanceData] = useState<any>(null);
  const [marketingData, setMarketingData] = useState<any>(null);

  useEffect(() => {
    const loadReports = async () => {
      try {
        setLoading(true);
        
        // Load all reports in parallel
        const [profitRes, occupancyRes, maintenanceRes, marketingRes] = await Promise.all([
          fetch(`/api/companies/${companyId}/reports/profitability`),
          fetch(`/api/companies/${companyId}/reports/occupancy`),
          fetch(`/api/companies/${companyId}/reports/maintenance`),
          fetch(`/api/companies/${companyId}/reports/marketing`)
        ]);

        if (profitRes.ok) setProfitabilityData(await profitRes.json());
        if (occupancyRes.ok) setOccupancyData(await occupancyRes.json());
        if (maintenanceRes.ok) setMaintenanceData(await maintenanceRes.json());
        if (marketingRes.ok) setMarketingData(await marketingRes.json());
        
      } catch (error) {
        console.error('Error loading reports:', error);
      } finally {
        setLoading(false);
      }
    };

    loadReports();
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando reportes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-blue-600" />
            Reportes y Análisis de Negocio
          </h1>
          <p className="text-gray-600">Análisis estratégico para Dental Diamond</p>
        </div>
        <div className="flex items-center gap-4">
          <Building2 className="h-8 w-8 text-gray-400" />
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/companies/${companyId}/modules`)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
        </div>
      </div>

      {/* Dashboard Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {/* Ingresos Totales */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ingresos Totales</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(profitabilityData?.summary?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-green-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +5% vs mes anterior
            </p>
          </CardContent>
        </Card>

        {/* Ocupación Promedio */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Ocupación Promedio</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {occupancyData?.summary?.averageOccupancyRate || 0}%
            </div>
            <p className="text-xs text-blue-600 flex items-center mt-1">
              <TrendingUp className="h-3 w-3 mr-1" />
              +10% horas rentadas
            </p>
          </CardContent>
        </Card>

        {/* ROI Marketing */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">ROI Marketing</CardTitle>
            <Megaphone className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {marketingData?.summary?.roi || 0}%
            </div>
            <p className="text-xs text-purple-600 flex items-center mt-1">
              <Target className="h-3 w-3 mr-1" />
              CAC: {formatCurrency(marketingData?.summary?.customerAcquisitionCost || 0)}
            </p>
          </CardContent>
        </Card>

        {/* Alertas de Mantenimiento */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Alertas Activas</CardTitle>
            <Wrench className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {maintenanceData?.alerts?.length || 0}
            </div>
            <p className="text-xs text-orange-600 flex items-center mt-1">
              <AlertTriangle className="h-3 w-3 mr-1" />
              {maintenanceData?.alerts?.filter((a: any) => a.level === 'critical').length || 0} críticas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Reports Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Resumen Ejecutivo</TabsTrigger>
          <TabsTrigger value="profitability">Rentabilidad</TabsTrigger>
          <TabsTrigger value="occupancy">Ocupación</TabsTrigger>
          <TabsTrigger value="maintenance">Mantenimiento</TabsTrigger>
          <TabsTrigger value="marketing">Marketing</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Punto de Equilibrio */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  Punto de Equilibrio
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                  <div>
                    <p className="text-sm text-gray-600">Alcanzado el día</p>
                    <p className="text-2xl font-bold text-green-700">18 del mes</p>
                  </div>
                  <CheckCircle className="h-12 w-12 text-green-600" />
                </div>
                <p className="text-sm text-gray-600 mt-4">
                  Margen neto actual: <span className="font-bold text-green-600">{profitabilityData?.summary?.marginPercentage || 0}%</span>
                </p>
              </CardContent>
            </Card>

            {/* Horas Totales Rentadas */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5 text-blue-600" />
                  Horas Rentadas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {occupancyData?.summary?.totalHoursRented || 0} hrs
                </div>
                <p className="text-sm text-gray-600 mt-2">
                  de {occupancyData?.summary?.totalHoursAvailable || 0} hrs disponibles
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-3">
                  <div 
                    className="bg-blue-600 h-2 rounded-full" 
                    style={{ width: `${occupancyData?.summary?.averageOccupancyRate || 0}%` }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recomendaciones Estratégicas */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recomendaciones Estratégicas</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {profitabilityData?.vacantHoursAnalysis?.recommendations?.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-3 p-3 bg-yellow-50 rounded-lg">
                    <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
                {marketingData?.recommendations?.map((rec: any, idx: number) => (
                  <div key={`m-${idx}`} className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg">
                    <Megaphone className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div>
                      <p className="font-medium text-sm">{rec.title}</p>
                      <p className="text-sm text-gray-600">{rec.description}</p>
                      <p className="text-xs text-green-600 mt-1">Impacto: {rec.potentialImpact}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Detailed Reports Tabs */}
        <TabsContent value="profitability" className="space-y-6">
          {/* Rentabilidad por Cubículo */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-600" />
                Rentabilidad por Cubículo
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Cubículo</th>
                      <th className="px-4 py-2 text-left">Arrendatario</th>
                      <th className="px-4 py-2 text-right">Ingresos</th>
                      <th className="px-4 py-2 text-right">Costos</th>
                      <th className="px-4 py-2 text-right">Margen Neto</th>
                      <th className="px-4 py-2 text-center">Ocupación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {profitabilityData?.cubicles?.map((cubicle: any) => (
                      <tr key={cubicle.id} className="border-b">
                        <td className="px-4 py-3 font-medium">{cubicle.name}</td>
                        <td className="px-4 py-3">{cubicle.tenant || 'Vacante'}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(cubicle.grossIncome)}</td>
                        <td className="px-4 py-3 text-right">{formatCurrency(cubicle.totalCosts)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={cubicle.netMargin >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(cubicle.netMargin)} ({cubicle.marginPercentage}%)
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div 
                                className={`h-2 rounded-full ${cubicle.occupancyRate >= 80 ? 'bg-green-500' : cubicle.occupancyRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${cubicle.occupancyRate}%` }}
                              />
                            </div>
                            <span className="text-xs">{cubicle.occupancyRate}%</span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Análisis de Silla Vacía */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-orange-600" />
                Análisis de "Silla Vacía"
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Horas Vacantes</p>
                  <p className="text-2xl font-bold text-red-600">{profitabilityData?.vacantHoursAnalysis?.totalVacantHours || 0} hrs</p>
                </div>
                <div className="p-4 bg-orange-50 rounded-lg">
                  <p className="text-sm text-gray-600">Costo por Hora Vacante</p>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(profitabilityData?.vacantHoursAnalysis?.costPerVacantHour || 0)}
                  </p>
                </div>
                <div className="p-4 bg-red-50 rounded-lg">
                  <p className="text-sm text-gray-600">Ingreso Potencial Perdido</p>
                  <p className="text-2xl font-bold text-red-600">
                    {formatCurrency(profitabilityData?.vacantHoursAnalysis?.potentialLostRevenue || 0)}
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Recomendaciones:</h4>
                {profitabilityData?.vacantHoursAnalysis?.recommendations?.map((rec: string, idx: number) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-yellow-50 rounded">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="occupancy" className="space-y-6">
          {/* Mapa de Calor de Horarios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Clock className="h-5 w-5 text-blue-600" />
                Mapa de Calor - Ocupación por Horario
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 md:grid-cols-8 gap-2">
                {occupancyData?.heatmapByHour?.map((slot: any, idx: number) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg text-center ${
                      slot.demand === 'pico' ? 'bg-red-100 border-red-300' :
                      slot.demand === 'alta' ? 'bg-orange-100 border-orange-300' :
                      slot.demand === 'media' ? 'bg-yellow-100 border-yellow-300' :
                      'bg-green-100 border-green-300'
                    } border`}
                  >
                    <p className="text-xs text-gray-600">{slot.hour}</p>
                    <p className="text-lg font-bold">{slot.occupancy}%</p>
                    <Badge className={`text-xs ${
                      slot.demand === 'pico' ? 'bg-red-500' :
                      slot.demand === 'alta' ? 'bg-orange-500' :
                      slot.demand === 'media' ? 'bg-yellow-500' :
                      'bg-green-500'
                    }`}>{slot.demand}</Badge>
                  </div>
                ))}
              </div>
              <p className="text-sm text-gray-600 mt-4">
                💡 <strong>Insight:</strong> Horarios 8PM-10PM tienen baja ocupación. 
                Considerar oferta con 20% de descuento para aumentar demanda.
              </p>
            </CardContent>
          </Card>

          {/* Retención de Arrendatarios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Retención de Arrendatarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Tasa de Retención</p>
                  <p className="text-2xl font-bold text-blue-600">{occupancyData?.summary?.retentionRate || 0}%</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Antigüedad Promedio</p>
                  <p className="text-2xl font-bold text-green-600">{occupancyData?.tenantRetention?.averageTenure || 0} meses</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg">
                  <p className="text-sm text-gray-600">Arrendatarios Recurrentes</p>
                  <p className="text-2xl font-bold text-purple-600">{occupancyData?.tenantRetention?.returningTenants || 0}</p>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Arrendatario</th>
                      <th className="px-4 py-2 text-center">Meses</th>
                      <th className="px-4 py-2 text-center">Estado</th>
                      <th className="px-4 py-2 text-right">Ingresos Generados</th>
                    </tr>
                  </thead>
                  <tbody>
                    {occupancyData?.tenantRetention?.retentionByTenant?.map((tenant: any, idx: number) => (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-2 font-medium">{tenant.name}</td>
                        <td className="px-4 py-2 text-center">{tenant.months}</td>
                        <td className="px-4 py-2 text-center">
                          <Badge className={tenant.status === 'recurrente' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}>
                            {tenant.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 text-right">{formatCurrency(tenant.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="maintenance" className="space-y-6">
          {/* Alertas de Mantenimiento */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-l-4 border-l-red-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <span className="font-medium text-red-600">Críticas</span>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {maintenanceData?.alerts?.filter((a: any) => a.level === 'critical').length || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-yellow-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <span className="font-medium text-yellow-600">Advertencias</span>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {maintenanceData?.alerts?.filter((a: any) => a.level === 'warning').length || 0}
                </p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500">
              <CardContent className="p-4">
                <div className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600" />
                  <span className="font-medium text-blue-600">Info</span>
                </div>
                <p className="text-2xl font-bold mt-2">
                  {maintenanceData?.alerts?.filter((a: any) => a.level === 'info').length || 0}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Activos */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5 text-orange-600" />
                Estado de Activos y Equipos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Equipo</th>
                      <th className="px-4 py-2 text-left">Cubículo</th>
                      <th className="px-4 py-2 text-center">Estado</th>
                      <th className="px-4 py-2 text-center">Fallas</th>
                      <th className="px-4 py-2 text-right">Valor Actual</th>
                      <th className="px-4 py-2 text-center">Próx. Mant.</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenanceData?.assets?.map((asset: any) => (
                      <tr key={asset.id} className="border-b">
                        <td className="px-4 py-3 font-medium">{asset.name}</td>
                        <td className="px-4 py-3">{asset.cubicle}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={
                            asset.status === 'bueno' ? 'bg-green-100 text-green-800' :
                            asset.status === 'atencion' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }>
                            {asset.status}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {asset.incidents > 0 ? (
                            <span className="text-red-600 font-bold">{asset.incidents}</span>
                          ) : (
                            <span className="text-green-600">0</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(asset.currentValue)}</td>
                        <td className="px-4 py-3 text-center">
                          <Badge className={
                            asset.maintenanceStatus === 'verde' ? 'bg-green-500' :
                            asset.maintenanceStatus === 'amarillo' ? 'bg-yellow-500' :
                            'bg-red-500 text-white'
                          }>
                            {asset.maintenanceStatus}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="marketing" className="space-y-6">
          {/* ROI Marketing */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">ROI Marketing</p>
                <p className="text-2xl font-bold text-purple-600">{marketingData?.summary?.roi || 0}%</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">CAC (Costo Adquisición)</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(marketingData?.summary?.customerAcquisitionCost || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">LTV (Valor de Vida)</p>
                <p className="text-2xl font-bold">
                  {formatCurrency(marketingData?.summary?.lifetimeValue || 0)}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-sm text-gray-600">Ratio LTV/CAC</p>
                <p className="text-2xl font-bold text-green-600">
                  {marketingData?.summary?.ltvToCacRatio || 0}x
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Origen de Arrendatarios */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Megaphone className="h-5 w-5 text-purple-600" />
                Origen de Arrendatarios
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left">Canal</th>
                      <th className="px-4 py-2 text-center">Leads</th>
                      <th className="px-4 py-2 text-center">Conversiones</th>
                      <th className="px-4 py-2 text-center">Tasa Conv.</th>
                      <th className="px-4 py-2 text-right">Inversión</th>
                      <th className="px-4 py-2 text-right">ROI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {marketingData?.leadSources?.map((source: any, idx: number) => (
                      <tr key={idx} className="border-b">
                        <td className="px-4 py-3 font-medium">{source.source}</td>
                        <td className="px-4 py-3 text-center">{source.leads}</td>
                        <td className="px-4 py-3 text-center">{source.conversions}</td>
                        <td className="px-4 py-3 text-center">
                          <span className={source.conversionRate >= 20 ? 'text-green-600 font-bold' : 'text-gray-600'}>
                            {source.conversionRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">{formatCurrency(source.cost)}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={source.roi > 0 ? 'text-green-600 font-bold' : 'text-red-600'}>
                            {source.roi}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm">
                  <strong>💡 Insight:</strong> Las recomendaciones tienen el mejor ROI ({marketingData?.leadSources?.find((s: any) => s.source.includes('Recomendación'))?.roi || 2300}%). 
                  Considerar expandir el programa de referidos.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
