"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import Link from "next/link";

interface DashboardData {
  tenants: {
    total: number;
    active: number;
    suspended: number;
    trial: number;
    growth: Array<{ month: string; count: number }>;
  };
  users: {
    total: number;
    active: number;
    inactive: number;
  };
  revenue: {
    mrr: number;
    totalThisMonth: number;
    lastMonth: number;
    growthPercent: number;
    trend: Array<{ month: string; revenue: number; count: number }>;
  };
  invoices: {
    total: number;
    subscription: number;
    customer: number;
    expense: number;
    paid: number;
    pending: number;
    overdue: number;
    cancelled: number;
  };
  transactions: {
    totalThisMonth: number;
    volume: number;
  };
  storage: {
    totalAllocatedGB: number;
    tenantCount: number;
    breakdown: Array<{ id: string; name: string; code: string; storageGB: number }>;
  };
  support: {
    open: number;
    inProgress: number;
    resolved: number;
    total: number;
    critical: number;
  };
  system: {
    dbLatencyMs: number;
    dbStatus: string;
    uptime: number;
    healthConfig: Array<{ key: string; value: string }>;
  };
  recentActivity: Array<{
    id: string;
    action: string;
    table: string;
    timestamp: string;
  }>;
}

function MiniBarChart({ data, maxVal }: { data: number[]; maxVal: number }) {
  const max = maxVal || Math.max(...data, 1);
  return (
    <div className="flex items-end gap-0.5 h-12">
      {data.map((val, i) => (
        <div
          key={i}
          className="flex-1 bg-cyan-400 rounded-t"
          style={{ height: `${(val / max) * 100}%`, minHeight: val > 0 ? '2px' : '0' }}
        />
      ))}
    </div>
  );
}

function StatusDot({ status }: { status: string }) {
  const colors: Record<string, string> = {
    healthy: "bg-green-500",
    degraded: "bg-yellow-500",
    critical: "bg-red-500",
    online: "bg-green-500",
    offline: "bg-red-500",
  };
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${colors[status] || "bg-gray-400"}`} />
  );
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("es-HN", { style: "currency", currency: "HNL", minimumFractionDigits: 0 }).format(amount);
}

function formatNumber(n: number) {
  return new Intl.NumberFormat("es-HN").format(n);
}

function getActionLabel(action: string) {
  const labels: Record<string, string> = {
    CREATE: "Creó",
    UPDATE: "Actualizó",
    DELETE: "Eliminó",
  };
  return labels[action] || action;
}

function getTableLabel(table: string) {
  const labels: Record<string, string> = {
    Account: "Cuenta",
    Transaction: "Transacción",
    JournalEntry: "Asiento contable",
    TaxConfig: "Config. impuestos",
    BookClosing: "Cierre de libro",
  };
  return labels[table] || table;
}

export default function AdminDashboardPage() {
  const { user, isLoaded } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchComprehensiveStats();
  }, []);

  const fetchComprehensiveStats = async () => {
    try {
      const response = await fetch("/api/admin/comprehensive-stats");
      if (response.ok) {
        const json = await response.json();
        setData(json.data);
      } else {
        setError("Error cargando datos");
      }
    } catch (err) {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-500">Cargando dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "No se pudieron cargar los datos"}</p>
          <button onClick={fetchComprehensiveStats} className="bg-cyan-600 text-white px-4 py-2 rounded-lg hover:bg-cyan-700">
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">Centro de comando operativo e infraestructura</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <StatusDot status={data.system.dbStatus} />
              <span>DB: {data.system.dbLatencyMs}ms</span>
            </div>
            <button onClick={fetchComprehensiveStats} className="bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-lg text-sm hover:bg-gray-50">
              Actualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-l-blue-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Empresas</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(data.tenants.total)}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-green-600">{data.tenants.active} activas</span>
              {data.tenants.suspended > 0 && <span className="text-xs text-red-600">{data.tenants.suspended} susp.</span>}
            </div>
            <MiniBarChart data={data.tenants.growth.map(g => g.count)} maxVal={Math.max(...data.tenants.growth.map(g => g.count), 1)} />
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-l-green-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Usuarios</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(data.users.total)}</p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-green-600">{data.users.active} activos</span>
              {data.users.inactive > 0 && <span className="text-xs text-gray-400">{data.users.inactive} inactivos</span>}
            </div>
            <div className="mt-2 h-1.5 bg-gray-200 rounded-full overflow-hidden">
              <div className="bg-green-500 h-full rounded-full" style={{ width: `${data.users.total > 0 ? (data.users.active / data.users.total) * 100 : 0}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-l-purple-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Ingresos Mensuales</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatCurrency(data.revenue.mrr)}</p>
            <div className="flex items-center gap-2 mt-1">
              {data.revenue.growthPercent >= 0 ? (
                <span className="text-xs text-green-600">+{data.revenue.growthPercent}% vs mes anterior</span>
              ) : (
                <span className="text-xs text-red-600">{data.revenue.growthPercent}% vs mes anterior</span>
              )}
            </div>
            <MiniBarChart data={data.revenue.trend.map(t => t.revenue)} maxVal={Math.max(...data.revenue.trend.map(t => t.revenue), 1)} />
          </div>

          <div className="bg-white rounded-lg shadow p-4 border-l-4 border-l-orange-500">
            <p className="text-xs font-medium text-gray-500 uppercase">Transacciones</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{formatNumber(data.transactions.totalThisMonth)}</p>
            <div className="mt-1">
              <span className="text-xs text-gray-500">Volumen: {formatCurrency(data.transactions.volume)}</span>
            </div>
            <div className="mt-2 text-xs text-gray-400">Este mes</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Almacenamiento</span>
              <span className="text-xs font-mono text-gray-400">{data.storage.totalAllocatedGB} GB</span>
            </div>
            <div className="mt-1 h-1 bg-gray-200 rounded-full overflow-hidden">
              <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${Math.min((data.storage.totalAllocatedGB / 1000) * 100, 100)}%` }}></div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Facturas</span>
              <span className="text-xs font-mono text-gray-400">{data.invoices.total}</span>
            </div>
            <div className="flex gap-2 mt-1">
              <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">{data.invoices.paid} pagadas</span>
              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-1 rounded">{data.invoices.pending} pend.</span>
              {data.invoices.overdue > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded">{data.invoices.overdue} venc.</span>}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Tickets Soporte</span>
              <span className="text-xs font-mono text-gray-400">{data.support.total}</span>
            </div>
            <div className="flex gap-2 mt-1">
              {data.support.critical > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded font-bold">{data.support.critical} críticos</span>}
              <span className="text-[10px] bg-orange-100 text-orange-700 px-1 rounded">{data.support.open} abiertos</span>
              <span className="text-[10px] bg-cyan-100 text-cyan-700 px-1 rounded">{data.support.inProgress} en proc.</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500">Salud DB</span>
              <div className="flex items-center gap-1">
                <StatusDot status={data.system.dbStatus} />
                <span className="text-xs font-mono text-gray-400">{data.system.dbLatencyMs}ms</span>
              </div>
            </div>
            <div className="mt-1 text-[10px] text-gray-400">
              {data.system.dbStatus === 'healthy' ? 'Operational' : data.system.dbStatus === 'degraded' ? 'Degraded' : 'Crítico'}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
          {data.support.critical > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Tickets Críticos</h4>
                  <p className="text-xs text-red-600">{data.support.critical} ticket(s) de alta prioridad activos</p>
                </div>
              </div>
            </div>
          )}

          {data.invoices.overdue > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-orange-800">Facturas Vencidas</h4>
                  <p className="text-xs text-orange-600">{data.invoices.overdue} factura(s) con pago vencido</p>
                </div>
              </div>
            </div>
          )}

          {data.tenants.suspended > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 16.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">Empresas Suspendidas</h4>
                  <p className="text-xs text-yellow-600">{data.tenants.suspended} empresa(s) con acceso suspendido</p>
                </div>
              </div>
            </div>
          )}

          {data.system.dbStatus !== 'healthy' && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-red-800">Base de Datos Degradada</h4>
                  <p className="text-xs text-red-600">Latencia: {data.system.dbLatencyMs}ms - Rendimiento afectado</p>
                </div>
              </div>
            </div>
          )}

          {data.support.critical === 0 && data.invoices.overdue === 0 && data.tenants.suspended === 0 && data.system.dbStatus === 'healthy' && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 col-span-full">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="text-sm font-medium text-green-800">Todo Operativo</h4>
                  <p className="text-xs text-green-600">No hay alertas activas en el sistema</p>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Crecimiento de Empresas</h2>
              <p className="text-xs text-gray-500">Últimos 6 meses</p>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {data.tenants.growth.map((g, i) => {
                  const maxCount = Math.max(...data.tenants.growth.map(x => x.count), 1);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12 text-right">{g.month}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className="bg-cyan-500 h-full rounded-full transition-all" style={{ width: `${(g.count / maxCount) * 100}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-8 text-right">{g.count}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 text-center">
                <span className="text-xs text-gray-500">Total registrado: </span>
                <span className="text-xs font-bold text-gray-900">{data.tenants.total}</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Ingresos por Facturación</h2>
              <p className="text-xs text-gray-500">Tendencia mensual</p>
            </div>
            <div className="p-4">
              <div className="space-y-2">
                {data.revenue.trend.map((t, i) => {
                  const maxRev = Math.max(...data.revenue.trend.map(x => x.revenue), 1);
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <span className="text-xs text-gray-500 w-12 text-right">{t.month}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className="bg-green-500 h-full rounded-full transition-all" style={{ width: `${(t.revenue / maxRev) * 100}%` }}></div>
                      </div>
                      <span className="text-xs font-medium text-gray-700 w-16 text-right">{formatCurrency(t.revenue)}</span>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2 text-center">
                <div>
                  <p className="text-xs text-gray-500">Este mes</p>
                  <p className="text-sm font-bold text-green-600">{formatCurrency(data.revenue.totalThisMonth)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Mes anterior</p>
                  <p className="text-sm font-bold text-gray-700">{formatCurrency(data.revenue.lastMonth)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Actividad Reciente</h2>
              <p className="text-xs text-gray-500">Últimas acciones del sistema</p>
            </div>
            <div className="p-4">
              {data.recentActivity.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">Sin actividad reciente</p>
              ) : (
                <div className="space-y-3">
                  {data.recentActivity.slice(0, 8).map((activity) => (
                    <div key={activity.id} className="flex items-start gap-2">
                      <div className={`w-1.5 h-1.5 rounded-full mt-1.5 flex-shrink-0 ${
                        activity.action === 'CREATE' ? 'bg-green-500' :
                        activity.action === 'UPDATE' ? 'bg-cyan-500' : 'bg-red-500'
                      }`}></div>
                      <div className="min-w-0">
                        <p className="text-xs text-gray-700 truncate">
                          <span className="font-medium">{getActionLabel(activity.action)}</span>
                          {" "}
                          <span className="text-gray-500">{getTableLabel(activity.table)}</span>
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {new Date(activity.timestamp).toLocaleDateString("es-HN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <Link href="/admin/audit" className="block mt-3 text-center text-xs text-cyan-600 hover:text-cyan-800">
                Ver todo →
              </Link>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Estado de Integraciones</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status="online" />
                  <span className="text-xs text-gray-700">Clerk (Autenticación)</span>
                </div>
                <span className="text-[10px] text-green-600 font-medium">Conectado</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status="online" />
                  <span className="text-xs text-gray-700">Supabase (Base de Datos)</span>
                </div>
                <span className="text-[10px] text-green-600 font-medium">Conectado</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status="online" />
                  <span className="text-xs text-gray-700">SAT (Facturación Electrónica)</span>
                </div>
                <span className="text-[10px] text-green-600 font-medium">Activo</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status="online" />
                  <span className="text-xs text-gray-700">SAR (Comprobantes Fiscales)</span>
                </div>
                <span className="text-[10px] text-green-600 font-medium">Activo</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <StatusDot status="online" />
                  <span className="text-xs text-gray-700">Vercel (Despliegue)</span>
                </div>
                <span className="text-[10px] text-green-600 font-medium">Operativo</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Métricas de Negocio SaaS</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">MRR (Ingreso Recurrente Mensual)</span>
                <span className="text-sm font-bold text-green-600">{formatCurrency(data.revenue.mrr)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">ARR (Ingreso Anual Proyectado)</span>
                <span className="text-sm font-bold text-gray-900">{formatCurrency(data.revenue.mrr * 12)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Facturas procesadas este mes</span>
                <span className="text-sm font-bold text-gray-900">{data.invoices.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Ingresos por suscripciones</span>
                <span className="text-sm font-bold text-cyan-600">{data.invoices.subscription} facturas</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Costo mensual infraestructura</span>
                <span className="text-sm font-bold text-orange-600">{formatCurrency(data.storage.tenantCount * 50)}</span>
              </div>
              <div className="pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Tickets soporte abiertos</span>
                  <span className={`text-sm font-bold ${data.support.open > 5 ? 'text-red-600' : 'text-gray-900'}`}>{data.support.open}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow">
            <div className="p-4 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">Consumo de Recursos</h2>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Almacenamiento BD</span>
                  <span className="text-xs font-mono text-gray-700">{data.storage.totalAllocatedGB} / 1000 GB</span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${Math.min((data.storage.totalAllocatedGB / 1000) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-gray-500">Latencia DB</span>
                  <span className={`text-xs font-mono ${data.system.dbLatencyMs < 200 ? 'text-green-600' : data.system.dbLatencyMs < 500 ? 'text-yellow-600' : 'text-red-600'}`}>
                    {data.system.dbLatencyMs}ms
                  </span>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${data.system.dbLatencyMs < 200 ? 'bg-green-500' : data.system.dbLatencyMs < 500 ? 'bg-yellow-500' : 'bg-red-500'}`} style={{ width: `${Math.min((data.system.dbLatencyMs / 2000) * 100, 100)}%` }}></div>
                </div>
              </div>
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Transacciones/mes</span>
                  <span className="text-xs font-bold text-gray-900">{formatNumber(data.transactions.totalThisMonth)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Volumen transaccional</span>
                  <span className="text-xs font-bold text-gray-900">{formatCurrency(data.transactions.volume)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500">Comprobantes emitidos</span>
                  <span className="text-xs font-bold text-gray-900">{data.invoices.total}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Link href="/admin/panel" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-cyan-600 rounded-lg flex items-center justify-center group-hover:bg-cyan-700 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Panel Operativo</p>
                <p className="text-xs text-gray-500">Gestión CRUD</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/reports" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-600 rounded-lg flex items-center justify-center group-hover:bg-purple-700 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Reportes Globales</p>
                <p className="text-xs text-gray-500">Estadísticas</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/audit" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-600 rounded-lg flex items-center justify-center group-hover:bg-orange-700 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Auditoría</p>
                <p className="text-xs text-gray-500">Logs del sistema</p>
              </div>
            </div>
          </Link>

          <Link href="/admin/billing/invoices" className="bg-white rounded-lg shadow p-4 hover:shadow-md transition-shadow group">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-600 rounded-lg flex items-center justify-center group-hover:bg-red-700 transition-colors">
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">Facturación</p>
                <p className="text-xs text-gray-500">Todas las facturas</p>
              </div>
            </div>
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 bg-cyan-600 rounded-full flex items-center justify-center">
                <span className="text-white font-medium">{user?.firstName?.charAt(0) || "A"}</span>
              </div>
              <div>
                <p className="text-sm font-medium text-gray-900">{user?.firstName} {user?.lastName}</p>
                <p className="text-xs text-gray-500">{user?.primaryEmailAddress?.emailAddress} • SUPER_ADMIN</p>
              </div>
            </div>
            <div className="text-xs text-gray-400">Último acceso: {new Date().toLocaleDateString("es-HN")}</div>
          </div>
        </div>

      </div>
    </div>
  );
}
