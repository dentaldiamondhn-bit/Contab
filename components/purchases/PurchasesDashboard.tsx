'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, TrendingDown, DollarSign, ShoppingCart, Calendar, Filter, Download, Menu, ChevronLeft, FileText, CreditCard, BarChart3, Plus } from 'lucide-react';

interface DashboardData {
  totalPurchases: number;
  totalAmount: number;
  pendingCount: number;
  completedCount: number;
  thisMonthTotal: number;
  averagePurchase: number;
}

interface MonthlyData {
  month: string;
  count: number;
  total: number;
  average: number;
}

interface CategoryData {
  category: string;
  count: number;
  total: number;
  percentage: number;
}

interface SupplierData {
  name: string;
  count: number;
  total: number;
}

interface PurchasesDashboardProps {
  companyId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function PurchasesDashboard({ companyId }: PurchasesDashboardProps) {
  const router = useRouter();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [categoryData, setCategoryData] = useState<CategoryData[]>([]);
  const [supplierData, setSupplierData] = useState<SupplierData[]>([]);
  const [suppliersCount, setSuppliersCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [exportLoading, setExportLoading] = useState(false);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(amount);
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load summary data
      const summaryRes = await fetch(`/api/purchases/reports?companyId=${companyId}&type=summary`);
      if (summaryRes.ok) {
        const summary = await summaryRes.json();
        setDashboardData(summary);
      }

      // Load monthly data
      const monthlyRes = await fetch(`/api/purchases/reports?companyId=${companyId}&type=monthly`);
      if (monthlyRes.ok) {
        const monthly = await monthlyRes.json();
        setMonthlyData(monthly.slice(-parseInt(selectedPeriod.replace('months', ''))));
      }

      // Load category data
      const categoryRes = await fetch(`/api/purchases/reports?companyId=${companyId}&type=category`);
      if (categoryRes.ok) {
        const categories = await categoryRes.json();
        const total = categories.reduce((sum: number, cat: CategoryData) => sum + cat.total, 0);
        const categoriesWithPercentage = categories.map((cat: CategoryData) => ({
          ...cat,
          percentage: total > 0 ? (cat.total / total) * 100 : 0
        }));
        setCategoryData(categoriesWithPercentage);
      }

      // Load supplier data
      const supplierRes = await fetch(`/api/purchases/reports?companyId=${companyId}&type=supplier`);
      if (supplierRes.ok) {
        const suppliers = await supplierRes.json();
        setSupplierData(suppliers);
      }

      // Load suppliers count for conteo
      const supCountRes = await fetch(`/api/suppliers?companyId=${companyId}`);
      if (supCountRes.ok) {
        const supList = await supCountRes.json();
        const arr = Array.isArray(supList) ? supList : supList.suppliers || [];
        setSuppliersCount(arr.length);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (format: 'excel' | 'pdf') => {
    try {
      setExportLoading(true);
      
      // Calculate date range based on selected period
      const endDate = new Date();
      const startDate = new Date();
      const months = parseInt(selectedPeriod.replace('months', ''));
      startDate.setMonth(startDate.getMonth() - months);
      
      const url = `/api/purchases/export?companyId=${companyId}&format=${format}&startDate=${startDate.toISOString().split('T')[0]}&endDate=${endDate.toISOString().split('T')[0]}`;
      
      const response = await fetch(url);
      
      if (response.ok) {
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `reporte_compras_${format === 'excel' ? 'xlsx' : 'csv'}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadUrl);
        document.body.removeChild(a);
      } else {
        alert('Error al generar el reporte');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      alert('Error al exportar el reporte');
    } finally {
      setExportLoading(false);
    }
  };

  useEffect(() => {
    if (companyId) {
      loadDashboardData();
    }
  }, [companyId, selectedPeriod]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando dashboard...</div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">No hay datos disponibles</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Compras</h2>
          <p className="text-gray-500">Reportes y estadísticas de compras</p>
        </div>
        
        {/* Single Dropdown Menu - Same level as title */}
        <div className="flex gap-2">
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="12months">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
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
                <FileText className="w-4 h-4 mr-2" />
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
              <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases`)}>
                <Plus className="w-4 h-4 mr-2" />
                Nueva Compra
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('excel')}>
                <Download className="w-4 h-4 mr-2" />
                Exportar a Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('pdf')}>
                <Download className="w-4 h-4 mr-2" />
                Exportar a PDF (CSV)
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => router.push(`/companies/${companyId}/purchases`)}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Compras</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardData.totalPurchases}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.completedCount} completadas • clic para ver
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Monto Total</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.totalAmount)}</div>
            <p className="text-xs text-muted-foreground">
              Promedio: {formatCurrency(dashboardData.averagePurchase)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Este Mes</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(dashboardData.thisMonthTotal)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardData.pendingCount} pendientes
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estado</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              <Badge variant="default">{dashboardData.completedCount} Completadas</Badge>
              <Badge variant="secondary">{dashboardData.pendingCount} Pendientes</Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conteo por Proveedor — para ANGELOH7 */}
      <Card className="border-cyan-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5 text-cyan-600" />
            Conteo por Proveedor — Base de Datos
          </CardTitle>
          <p className="text-sm text-muted-foreground">Total {suppliersCount} proveedores para {companyId}</p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="rounded-lg border p-4 text-center bg-slate-50 cursor-pointer hover:shadow-md hover:bg-slate-100 transition-all" onClick={() => router.push(`/companies/${companyId}/suppliers?from=dashboard`)}>
              <p className="text-xs text-muted-foreground uppercase">Total</p>
              <p className="text-2xl font-bold">{suppliersCount}</p>
              <p className="text-xs text-muted-foreground">proveedores • ver</p>
            </div>
            <div className="rounded-lg border p-4 text-center bg-cyan-50 cursor-pointer hover:shadow-md hover:bg-cyan-100 transition-all" onClick={(e)=>{e.stopPropagation(); router.push(`/companies/${companyId}/purchases`);}}>
              <p className="text-xs text-muted-foreground uppercase">Compras</p>
              <p className="text-2xl font-bold text-cyan-700">{dashboardData.totalPurchases}</p>
              <p className="text-xs text-muted-foreground">transacciones • ver</p>
            </div>
            <div className="rounded-lg border p-4 text-center bg-green-50">
              <p className="text-xs text-muted-foreground uppercase">Pendientes</p>
              <p className="text-2xl font-bold text-green-700">{dashboardData.pendingCount}</p>
              <p className="text-xs text-muted-foreground">por pagar</p>
            </div>
            <div className="rounded-lg border p-4 text-center bg-purple-50">
              <p className="text-xs text-muted-foreground uppercase">Promedio</p>
              <p className="text-2xl font-bold text-purple-700">{formatCurrency(dashboardData.averagePurchase)}</p>
              <p className="text-xs text-muted-foreground">por compra</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia Mensual</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="total" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={categoryData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ category, percentage }) => `${category}: ${percentage.toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="total"
                >
                  {categoryData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Top Suppliers */}
      <Card>
        <CardHeader>
          <CardTitle>Top Proveedores</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {supplierData.map((supplier, index) => (
              <div key={supplier.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-sm font-medium">
                    {index + 1}
                  </div>
                  <div>
                    <div className="font-medium">{supplier.name}</div>
                    <div className="text-sm text-gray-500">{supplier.count} compras</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(supplier.total)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
