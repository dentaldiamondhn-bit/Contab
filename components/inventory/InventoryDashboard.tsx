'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Package, DollarSign, AlertTriangle, Boxes, Warehouse as WarehouseIcon, Truck, Menu, ChevronLeft, History, BarChart3, Download, Plus, ArrowLeftRight } from 'lucide-react';

interface DashboardData {
  companyId: string;
  generatedAt: string;
  months: number;
  kpis: {
    totalProducts: number;
    activeProducts: number;
    lowStock: number;
    outOfStock: number;
    totalUnits: number;
    totalValue: number;
    warehouseCount: number;
    pendingTransfers: number;
    inTransitTransfers: number;
    lowStockAlerts: number;
    expiringAlerts: number;
  };
  monthly: Array<{ month: string; label: string; value: number; units: number; inflow: number; outflow: number }>;
  categories: Array<{ name: string; value: number; productCount: number }>;
  topProducts: Array<{ id: string; code: string; name: string; category: string; unit_cost: number; stock: number; value: number; location: string | null; low_stock: boolean }>;
  stockByWarehouse: Array<{ warehouse_id: string; warehouse_code: string; warehouse_name: string; productCount: number; units: number; value: number }>;
  recentMovements: Array<{ id: string; product_code: string; product_name: string; movement_type: string; movement_reason: string; quantity: number; total_cost: number; created_at: string; location: string | null }>;
}

interface Warehouse {
  id: string;
  code: string;
  name: string;
}

interface InventoryDashboardProps {
  companyId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const REASON_LABELS: Record<string, string> = {
  purchase: 'Compra',
  sale: 'Venta',
  return: 'Devolución',
  adjustment: 'Ajuste',
  damage: 'Merma/Daño',
  initial_stock: 'Stock inicial',
  transfer_out: 'Salida por traslado',
  transfer_in: 'Entrada por traslado',
  transfer_return: 'Devolución de traslado',
};

export default function InventoryDashboard({ companyId }: InventoryDashboardProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [warehouses, setWarehouses] = useState<Warehouse[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');
  const [selectedWarehouse, setSelectedWarehouse] = useState('all');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const navigate = (path: string) => router.push(`/companies/${companyId}${path}`);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const months = parseInt(selectedPeriod.replace('months', ''), 10);
      const warehouseQuery = selectedWarehouse && selectedWarehouse !== 'all'
        ? `&warehouseId=${encodeURIComponent(selectedWarehouse)}`
        : '';
      const res = await fetch(`/api/companies/${companyId}/inventory/stats?months=${months}${warehouseQuery}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setData(json.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedPeriod, selectedWarehouse]);

  useEffect(() => {
    if (!companyId) return;
    loadDashboardData();
  }, [companyId, loadDashboardData]);

  useEffect(() => {
    if (!companyId) return;
    const fetchWarehouses = async () => {
      try {
        const res = await fetch(`/api/companies/${companyId}/inventory/warehouses?activeOnly=true`);
        if (res.ok) {
          const json = await res.json();
          const list = json.success && json.data ? json.data.warehouses || json.data : [];
          setWarehouses(Array.isArray(list) ? list : []);
        }
      } catch (error) {
        console.error('Error loading warehouses:', error);
      }
    };
    fetchWarehouses();
  }, [companyId]);

  const exportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Top Productos por Valor'],
      ['Código', 'Nombre', 'Categoría', 'Stock', 'Costo Unitario', 'Valor Total'],
      ...data.topProducts.map((p) => [p.code, p.name, p.category, String(p.stock), String(p.unit_cost), String(p.value)]),
      [],
      ['Stock por Almacén'],
      ['Almacén', 'Código', 'Productos', 'Unidades', 'Valor'],
      ...data.stockByWarehouse.map((w) => [w.warehouse_name, w.warehouse_code, String(w.productCount), String(w.units), String(w.value)]),
      [],
      ['Tendencia Mensual'],
      ['Mes', 'Valor', 'Unidades', 'Entradas', 'Salidas'],
      ...data.monthly.map((m) => [m.label, String(m.value), String(m.units), String(m.inflow), String(m.outflow)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_inventario_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg">Cargando dashboard...</div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-500">No hay datos disponibles</div>
      </div>
    );
  }

  const kpis = data.kpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Dashboard de Inventario</h2>
          <p className="text-gray-500">Estadísticas de existencias, valor y movimientos</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Almacén" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los almacenes</SelectItem>
              {warehouses.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="3months">Últimos 3 meses</SelectItem>
              <SelectItem value="6months">Últimos 6 meses</SelectItem>
              <SelectItem value="12months">Últimos 12 meses</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => navigate('/modules')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Módulos
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-10 px-3">
                <Menu className="w-4 h-4 mr-2" />
                Menú
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="w-64" forceMount>
              <DropdownMenuItem onClick={() => navigate('/modules')}>
                <ChevronLeft className="w-4 h-4 mr-2" />
                Menú Principal
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/inventory')}>
                <Package className="w-4 h-4 mr-2" />
                Inventario
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/inventory/kardex')}>
                <History className="w-4 h-4 mr-2" />
                Kardex
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/inventory')}>
                <Plus className="w-4 h-4 mr-2" />
                Nuevo Producto
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/inventory')}>
                <ArrowLeftRight className="w-4 h-4 mr-2" />
                Traslados
              </DropdownMenuItem>
              <DropdownMenuItem onClick={exportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Exportar CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/inventory')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Productos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.activeProducts}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.totalProducts} totales • clic para ver
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor del Inventario</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalValue)}</div>
            <p className="text-xs text-muted-foreground">{kpis.totalUnits.toLocaleString('es-HN')} unidades</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{kpis.lowStock}</div>
            <p className="text-xs text-muted-foreground">requieren reposición</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <Boxes className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpis.outOfStock}</div>
            <p className="text-xs text-muted-foreground">agotados</p>
          </CardContent>
        </Card>
      </div>

      {/* Warehouse / transfers section */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 text-center bg-slate-50">
          <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
            <WarehouseIcon className="w-3 h-3" /> Almacenes
          </p>
          <p className="text-2xl font-bold">{kpis.warehouseCount}</p>
        </div>
        <div className="rounded-lg border p-4 text-center bg-cyan-50">
          <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
            <Truck className="w-3 h-3" /> Traslados Pend.
          </p>
          <p className="text-2xl font-bold text-cyan-700">{kpis.pendingTransfers}</p>
          <p className="text-xs text-muted-foreground">{kpis.inTransitTransfers} en tránsito</p>
        </div>
        <div className="rounded-lg border p-4 text-center bg-amber-50">
          <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Alertas Stock
          </p>
          <p className="text-2xl font-bold text-amber-700">{kpis.lowStockAlerts}</p>
        </div>
        <div className="rounded-lg border p-4 text-center bg-red-50">
          <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Por Vencer
          </p>
          <p className="text-2xl font-bold text-red-700">{kpis.expiringAlerts}</p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly value trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia del Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="value" name="Valor" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Category distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Valor por Categoría</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.categories}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${String(name).slice(0, 12)}: ${((percent || 0) * 100).toFixed(1)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {data.categories.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* IN vs OUT flows */}
      <Card>
        <CardHeader>
          <CardTitle>Entradas vs Salidas (mensual)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="inflow" name="Entradas" fill="#00C49F" />
              <Bar dataKey="outflow" name="Salidas" fill="#FF8042" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Stock by warehouse + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Stock por Almacén</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.stockByWarehouse.length === 0 && (
                <p className="text-sm text-gray-500">Sin movimientos por almacén.</p>
              )}
              {data.stockByWarehouse.map((w) => (
                <div key={w.warehouse_id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center">
                      <WarehouseIcon className="w-4 h-4 text-teal-600" />
                    </div>
                    <div>
                      <div className="font-medium">{w.warehouse_name}</div>
                      <div className="text-sm text-gray-500">
                        {w.productCount} productos • {w.units.toLocaleString('es-HN')} unidades
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(w.value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Productos por Valor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topProducts.length === 0 && (
                <p className="text-sm text-gray-500">Sin productos con stock.</p>
              )}
              {data.topProducts.map((p, index) => (
                <div key={p.id} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        {p.code} • {p.stock.toLocaleString('es-HN')} und
                        {p.location && <span>• {p.location}</span>}
                        {p.low_stock && <Badge variant="secondary" className="text-amber-700 bg-amber-100">bajo</Badge>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(p.value)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent movements */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <History className="h-5 w-5 text-cyan-600" />
            Movimientos Recientes
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/inventory/kardex')}>
            <BarChart3 className="w-4 h-4 mr-2" />
            Ver Kardex
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentMovements.length === 0 && (
              <p className="text-sm text-gray-500">Sin movimientos registrados.</p>
            )}
            {data.recentMovements.map((m) => (
              <div key={m.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <Badge variant={m.movement_type === 'OUT' ? 'destructive' : 'default'} className="w-14 justify-center">
                    {m.movement_type}
                  </Badge>
                  <div>
                    <div className="font-medium">{m.product_name}</div>
                    <div className="text-sm text-gray-500">
                      {REASON_LABELS[m.movement_reason] || m.movement_reason || m.movement_type}
                      {m.location && <> • {m.location}</>}
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">
                    {m.movement_type === 'OUT' ? '-' : '+'}{m.quantity.toLocaleString('es-HN')}
                  </div>
                  <div className="text-sm text-gray-500">{formatCurrency(m.total_cost)}</div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}