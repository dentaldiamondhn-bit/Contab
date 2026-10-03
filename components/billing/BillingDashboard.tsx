'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Receipt, DollarSign, FileText, Clock, AlertTriangle, CheckCircle, XCircle, TrendingUp, TrendingDown, Menu, ChevronLeft, Download, Package, CreditCard, History, BarChart3, Settings2 } from 'lucide-react';

interface DashboardData {
  companyId: string;
  generatedAt: string;
  months: number;
  tenantId: string;
  kpis: {
    totalInvoices: number;
    issuedInvoices: number;
    paidInvoices: number;
    pendingInvoices: number;
    overdueInvoices: number;
    cancelledInvoices: number;
    totalRevenue: number;
    paidRevenue: number;
    pendingRevenue: number;
    overdueRevenue: number;
    totalTax: number;
    totalSubtotal: number;
    avgInvoiceValue: number;
    monthlyGrowth: number;
  };
  monthly: Array<{ month: string; label: string; revenue: number; tax: number; count: number }>;
  byStatus: Array<{ status: string; count: number; value: number }>;
  topCustomers: Array<{ name: string; count: number; total: number }>;
  topProducts: Array<{ name: string; code: string; count: number; quantity: number; total: number }>;
  recentInvoices: Array<{ id: string; invoiceNumber: string; customerName: string; total: number; date: string; status: string }>;
}

interface BillingDashboardProps {
  companyId: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const STATUS_BADGE: Record<string, 'default' | 'destructive' | 'secondary' | 'outline'> = {
  Pagada: 'default',
  Activa: 'secondary',
  Pendiente: 'secondary',
  Vencida: 'destructive',
  Anulada: 'outline',
};

export default function BillingDashboard({ companyId }: BillingDashboardProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('6months');

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2,
    }).format(amount || 0);
  };

  const navigate = (path: string) => router.push(`/companies/${companyId}${path}`);

  const loadDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      const months = parseInt(selectedPeriod.replace('months', ''), 10);
      const res = await fetch(`/api/companies/${companyId}/billing/stats?months=${months}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success) setData(json.data);
      }
    } catch (error) {
      console.error('Error loading billing dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [companyId, selectedPeriod]);

  useEffect(() => {
    if (!companyId) return;
    loadDashboardData();
  }, [companyId, loadDashboardData]);

  const exportCSV = () => {
    if (!data) return;
    const rows: string[][] = [
      ['Dashboard de Facturación y Ventas'],
      [],
      ['Tendencia Mensual'],
      ['Mes', 'Ingresos', 'ISV', 'Facturas'],
      ...data.monthly.map((m) => [m.label, String(m.revenue), String(m.tax), String(m.count)]),
      [],
      ['Top Clientes'],
      ['Cliente', 'Facturas', 'Monto'],
      ...data.topCustomers.map((c) => [c.name, String(c.count), String(c.total)]),
      [],
      ['Top Productos'],
      ['Producto', 'Código', 'Veces vendido', 'Cantidad', 'Total'],
      ...data.topProducts.map((p) => [p.name, p.code, String(p.count), String(p.quantity), String(p.total)]),
      [],
      ['Distribución por Estado'],
      ['Estado', 'Facturas', 'Monto'],
      ...data.byStatus.map((s) => [s.status, String(s.count), String(s.value)]),
    ];
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `dashboard_facturacion_${new Date().toISOString().split('T')[0]}.csv`;
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
          <h2 className="text-2xl font-bold">Dashboard de Facturación y Ventas</h2>
          <p className="text-gray-500">Estadísticas de facturas, ingresos y cobros</p>
        </div>
        <div className="flex gap-2">
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
          <Button
            onClick={() => navigate('/billing/pos')}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Receipt className="w-4 h-4 mr-2" />
            Punto de Venta
          </Button>
          <Button variant="outline" onClick={() => navigate('/modules')}>
            <ChevronLeft className="w-4 h-4 mr-2" />
            Módulos
          </Button>
          <Button variant="outline" className="border-orange-300 text-orange-700 hover:bg-orange-50" onClick={() => navigate('/billing/settings')}>
            <Settings2 className="w-4 h-4 mr-2" />
            Configurar Factura
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
              <DropdownMenuItem onClick={() => navigate('/billing/dashboard')}>
                <BarChart3 className="w-4 h-4 mr-2" />
                Dashboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/billing/pos')}>
                <Receipt className="w-4 h-4 mr-2" />
                Punto de Venta
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate('/billing/settings')}>
                <Settings2 className="w-4 h-4 mr-2" />
                Configurar Factura
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
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigate('/billing/dashboard')}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Facturas Emitidas</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpis.issuedInvoices}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.totalInvoices} totales • {kpis.cancelledInvoices} anuladas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Período</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.totalRevenue)}</div>
            <p className="text-xs text-muted-foreground">
              {kpis.paidInvoices} pagadas • {formatCurrency(kpis.paidRevenue)} cobrado
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Por Cobrar</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{formatCurrency(kpis.pendingRevenue)}</div>
            <p className="text-xs text-muted-foreground">{kpis.pendingInvoices} facturas pendientes</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Promedio</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(kpis.avgInvoiceValue)}</div>
            <p className="text-xs text-muted-foreground">
              ISV cobrado: {formatCurrency(kpis.totalTax)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Secondary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4 text-center bg-green-50">
          <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
            <CheckCircle className="w-3 h-3" /> Pagadas
          </p>
          <p className="text-2xl font-bold text-green-700">{kpis.paidInvoices}</p>
        </div>
        <div className="rounded-lg border p-4 text-center bg-amber-50">
          <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
            <Clock className="w-3 h-3" /> Pendientes
          </p>
          <p className="text-2xl font-bold text-amber-700">{kpis.pendingInvoices}</p>
        </div>
        <div className="rounded-lg border p-4 text-center bg-red-50">
          <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Vencidas
          </p>
          <p className="text-2xl font-bold text-red-700">{kpis.overdueInvoices}</p>
        </div>
        <div className="rounded-lg border p-4 text-center bg-gray-50">
          <p className="text-xs text-muted-foreground uppercase flex items-center justify-center gap-1">
            <TrendingUp className="w-3 h-3" /> Crecimiento
          </p>
          <p className={`text-2xl font-bold ${kpis.monthlyGrowth >= 0 ? 'text-green-700' : 'text-red-700'}`}>
            {kpis.monthlyGrowth >= 0 ? '+' : ''}{kpis.monthlyGrowth.toFixed(1)}%
          </p>
        </div>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly revenue trend */}
        <Card>
          <CardHeader>
            <CardTitle>Tendencia de Ingresos</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="label" />
                <YAxis />
                <Tooltip formatter={(value) => formatCurrency(Number(value))} />
                <Bar dataKey="revenue" name="Ingresos" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución por Estado</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={data.byStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${String(name).slice(0, 12)}: ${((percent || 0) * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {data.byStatus.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatCurrency(Number(value !== undefined ? value : 0))} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Tax trend */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos vs ISV (mensual)</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={data.monthly}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
              <Bar dataKey="revenue" name="Ingresos" fill="#0088FE" />
              <Bar dataKey="tax" name="ISV" fill="#00C49F" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Top customers + top products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Top Clientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topCustomers.length === 0 && (
                <p className="text-sm text-gray-500">Sin ventas registradas.</p>
              )}
              {data.topCustomers.map((c, index) => (
                <div key={`${c.name}-${index}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-cyan-100 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{c.name}</div>
                      <div className="text-sm text-gray-500">{c.count} facturas</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(c.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Productos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.topProducts.length === 0 && (
                <p className="text-sm text-gray-500">Sin productos vendidos.</p>
              )}
              {data.topProducts.map((p, index) => (
                <div key={`${p.name}-${index}`} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center text-sm font-medium">
                      {index + 1}
                    </div>
                    <div>
                      <div className="font-medium">{p.name}</div>
                      <div className="text-sm text-gray-500 flex items-center gap-2">
                        <Package className="w-3 h-3" />
                        {p.code || 'sin código'} • {p.quantity.toLocaleString('es-HN')} und
                        {p.count > 1 && <span>• {p.count} ventas</span>}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{formatCurrency(p.total)}</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent invoices */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5 text-orange-600" />
            Facturas Recientes
          </CardTitle>
          <Button variant="outline" size="sm" onClick={() => navigate('/billing/dashboard')}>
            <History className="w-4 h-4 mr-2" />
            Ver todo
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {data.recentInvoices.length === 0 && (
              <p className="text-sm text-gray-500">Sin facturas en el período.</p>
            )}
            {data.recentInvoices.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between border-b pb-2 last:border-0">
                <div className="flex items-center gap-3">
                  <Badge variant={STATUS_BADGE[inv.status] || 'secondary'} className="w-20 justify-center">
                    {inv.status}
                  </Badge>
                  <div>
                    <div className="font-medium">{inv.invoiceNumber}</div>
                    <div className="text-sm text-gray-500">{inv.customerName}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-medium">{formatCurrency(inv.total)}</div>
                  <div className="text-sm text-gray-500">
                    {new Date(inv.date).toLocaleDateString('es-HN')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}