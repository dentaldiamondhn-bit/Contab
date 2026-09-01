"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Banknote,
  Users,
  FileText,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Plus,
  Download,
  ArrowRight,
  Clock,
  DollarSign,
  Receipt,
  ShoppingCart,
  CreditCard,
  CalendarDays,
  CircleAlert,
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from "recharts";
import { useTenant } from "@/lib/contexts/TenantContext";

const COLORS = ["#10b981", "#f59e0b", "#ef4444", "#6366f1", "#8b5cf6"];

const MAX_RETRIES = 3;
const RETRY_DELAY = 2000;

export default function TenantAdminDashboard() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id;

  const [kpis, setKpis] = useState({
    cashBalance: 0,
    accountsReceivable: 0,
    accountsPayable: 0,
    monthlySales: 0,
    prevMonthSales: 0,
    totalUsers: 0,
  });
  const [arAging, setArAging] = useState({ current: 0, d1_30: 0, d31_60: 0, d60plus: 0 });
  const [cashFlowMonths, setCashFlowMonths] = useState<any[]>([]);
  const [topClients, setTopClients] = useState<any[]>([]);
  const [taxAlerts, setTaxAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [clerkError, setClerkError] = useState(false);

  const fetchDashboard = useCallback(async (retries = 0) => {
    if (!tenantId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/tenant-admin/dashboard?tenantId=${tenantId}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data.kpis) setKpis(data.kpis);
      if (data.arAging) setArAging(data.arAging);
      if (data.cashFlowMonths) setCashFlowMonths(data.cashFlowMonths);
      if (data.topClients) setTopClients(data.topClients);
      if (data.taxAlerts) setTaxAlerts(data.taxAlerts);
    } catch (err) {
      if (retries < MAX_RETRIES) {
        await new Promise(r => setTimeout(r, RETRY_DELAY));
        return fetchDashboard(retries + 1);
      }
      console.error("Dashboard fetch failed after retries:", err);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  useEffect(() => {
    if (isLoaded && !user) {
      setClerkError(true);
      const timer = setTimeout(() => {
        window.location.reload();
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isLoaded, user]);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  if (clerkError) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Card className="max-w-md">
          <CardContent className="p-8 text-center">
            <AlertTriangle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-bold mb-2">Sesion expirada</h2>
            <p className="text-gray-600 mb-4">No se pudo conectar con el servidor de autenticacion.</p>
            <p className="text-sm text-gray-500 mb-4">Recargando automaticamente en 5 segundos...</p>
            <Button onClick={() => window.location.reload()}>Recargar ahora</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const fmt = (n: number) =>
    new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", maximumFractionDigits: 0 }).format(n);

  const pctChange = (current: number, prev: number) => {
    if (prev === 0) return current > 0 ? "+100%" : "0%";
    const pct = ((current - prev) / prev) * 100;
    return `${pct >= 0 ? "+" : ""}${pct.toFixed(1)}%`;
  };

  const agingData = [
    { name: "A tiempo", value: arAging.current },
    { name: "1-30 dias", value: arAging.d1_30 },
    { name: "31-60 dias", value: arAging.d31_60 },
    { name: "+60 dias", value: arAging.d60plus },
  ].filter((d) => d.value > 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-600" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {currentTenant?.businessName || "Dashboard"}
          </h1>
          <p className="text-sm text-gray-500">Resumen ejecutivo del negocio</p>
        </div>
        <div className="flex items-center gap-2">
          <CalendarDays className="w-4 h-4 text-gray-400" />
          <span className="text-sm text-gray-500">
            {new Date().toLocaleDateString("es-HN", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
          </span>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Flujo de Caja</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(kpis.cashBalance)}</p>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Banknote className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Cuentas por Cobrar</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(kpis.accountsReceivable)}</p>
              </div>
              <div className="p-2 bg-cyan-100 rounded-lg">
                <Receipt className="w-5 h-5 text-cyan-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Cuentas por Pagar</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(kpis.accountsPayable)}</p>
              </div>
              <div className="p-2 bg-red-100 rounded-lg">
                <CreditCard className="w-5 h-5 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Ventas del Mes</p>
                <p className="text-2xl font-bold text-gray-900">{fmt(kpis.monthlySales)}</p>
                <span className={`text-xs font-medium ${kpis.monthlySales >= kpis.prevMonthSales ? 'text-green-600' : 'text-red-600'}`}>
                  {kpis.monthlySales >= kpis.prevMonthSales ? <TrendingUp className="w-3 h-3 inline" /> : <TrendingDown className="w-3 h-3 inline" />}
                  {' '}{pctChange(kpis.monthlySales, kpis.prevMonthSales)} vs mes anterior
                </span>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <DollarSign className="w-5 h-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Cash Flow Chart */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Evolucion del Flujo de Efectivo</CardTitle>
          </CardHeader>
          <CardContent>
            {cashFlowMonths.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={cashFlowMonths} margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(value: number) => fmt(value)} />
                  <Legend />
                  <Bar dataKey="ingresos" name="Ingresos" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="egresos" name="Egresos" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-[280px] text-gray-400 text-sm">Sin datos disponibles</div>
            )}
          </CardContent>
        </Card>

        {/* AR Aging Pie */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Antiguedad de Saldos</CardTitle>
          </CardHeader>
          <CardContent>
            {agingData.length > 0 ? (
              <>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={agingData} cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3} dataKey="value">
                      {agingData.map((_, index) => (
                        <Cell key={index} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value: number) => fmt(value)} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex flex-wrap gap-2 mt-2">
                  {agingData.map((d, i) => (
                    <span key={i} className="flex items-center text-xs text-gray-600">
                      <span className="w-2 h-2 rounded-full mr-1" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      {d.name}: {fmt(d.value)}
                    </span>
                  ))}
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-[200px] text-gray-400 text-sm">Sin cuentas por cobrar</div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Tax Calendar */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Calendario Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent>
            {taxAlerts.length > 0 ? (
              <div className="space-y-3">
                {taxAlerts.map((alert, i) => (
                  <div key={i} className="flex items-start gap-3 p-2 rounded-lg bg-gray-50">
                    <CircleAlert className={`w-4 h-4 mt-0.5 shrink-0 ${
                      alert.status === 'urgent' ? 'text-red-500' : alert.status === 'warning' ? 'text-yellow-500' : 'text-cyan-500'
                    }`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">{alert.tax}</p>
                      <p className="text-xs text-gray-500">Vence: {new Date(alert.dueDate + 'T12:00:00').toLocaleDateString('es-HN')}</p>
                    </div>
                    <Badge variant={alert.status === 'urgent' ? 'destructive' : alert.status === 'warning' ? 'default' : 'secondary'} className="text-[10px]">
                      {alert.status === 'urgent' ? 'Urgente' : alert.status === 'warning' ? 'Proximo' : 'Info'}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Sin alertas fiscales</p>
            )}
          </CardContent>
        </Card>

        {/* Top Clients */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Top Clientes (Mes)</CardTitle>
          </CardHeader>
          <CardContent>
            {topClients.length > 0 ? (
              <div className="space-y-2">
                {topClients.map((client, i) => (
                  <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-gray-50">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                      <span className="text-sm text-gray-900 truncate">{client.name}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{fmt(client.total)}</p>
                      <p className="text-[10px] text-gray-400">{client.count} facturas</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">Sin ventas este mes</p>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Acciones Rapidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" onClick={() => router.push('/billing/generate-invoice')}>
                <div className="p-1.5 bg-cyan-100 rounded"><Plus className="w-4 h-4 text-cyan-600" /></div>
                <div className="text-left">
                  <p className="text-sm font-medium">Nueva Factura</p>
                  <p className="text-[10px] text-gray-400">Crear factura o cotizacion</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" onClick={() => router.push('/billing')}>
                <div className="p-1.5 bg-green-100 rounded"><CreditCard className="w-4 h-4 text-green-600" /></div>
                <div className="text-left">
                  <p className="text-sm font-medium">Registrar Pago</p>
                  <p className="text-[10px] text-gray-400">Cobro de cliente</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" onClick={() => router.push('/billing/expenses/new')}>
                <div className="p-1.5 bg-orange-100 rounded"><ShoppingCart className="w-4 h-4 text-orange-600" /></div>
                <div className="text-left">
                  <p className="text-sm font-medium">Cargar Gasto / Compra</p>
                  <p className="text-[10px] text-gray-400">Factura de proveedor</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />
              </Button>
              <Button variant="outline" className="w-full justify-start gap-3 h-auto py-3" onClick={() => router.push('/accounting/reports')}>
                <div className="p-1.5 bg-purple-100 rounded"><Download className="w-4 h-4 text-purple-600" /></div>
                <div className="text-left">
                  <p className="text-sm font-medium">Reporte P&G</p>
                  <p className="text-[10px] text-gray-400">Perdidas y ganancias</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-300 ml-auto" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
