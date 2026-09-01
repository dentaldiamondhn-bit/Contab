'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart,
  Line,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Bar,
  BarChart
} from 'recharts';
import { Card } from '@tremor/react';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  AlertTriangle,
  Calendar,
  RefreshCw,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  Wallet,
  CreditCard,
  PiggyBank
} from 'lucide-react';
import { CashFlowProjection, DailyCashFlow } from '@/lib/services/cash-flow-projection-service';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
interface CashFlowProjectionChartProps {
  showControls?: boolean;
  compact?: boolean;
  days?: number;
}

export default function CashFlowProjectionChart({ 
  showControls = true, 
  compact = false,
  days = 30
}: CashFlowProjectionChartProps) {
  const [projection, setProjection] = useState<CashFlowProjection | null>(null);
  const [loading, setLoading] = useState(false);
  const [includeProbability, setIncludeProbability] = useState(true);
  const [selectedView, setSelectedView] = useState<'balance' | 'flows' | 'combined'>('balance');

  useEffect(() => {
    fetchProjectionData();
  }, [days, includeProbability]);

const fetchProjectionData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/cash-flow-projection?days=${days}&includeProbability=${includeProbability}`);
      const result = await response.json();
      
      if (result.success) {
        setProjection(result.data);
      } else {
        setProjection(null);
      }
    } catch (error) {
      console.error('Error fetching cash flow projection:', error);
      setProjection(null);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatDate = (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return dateObj.toLocaleDateString('es-HN', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  const getChartData = () => {
    if (!projection) return [];

    return projection.projections.map((day: DailyCashFlow) => ({
      date: formatDate(day.date),
      fullDate: day.date,
      openingBalance: day.openingBalance,
      closingBalance: day.closingBalance,
      inflows: day.inflows,
      outflows: day.outflows,
      netFlow: day.netFlow,
      cumulativeNetFlow: day.closingBalance - projection.currentBalance
    }));
  };

  const getHealthStatus = () => {
    if (!projection) return { status: 'unknown', color: 'text-slate-600', bg: 'bg-slate-100' };
    
    const { summary } = projection;
    
    if (summary.daysWithNegativeBalance > 0) {
      return { status: 'critical', color: 'text-red-600', bg: 'bg-red-100', icon: AlertTriangle };
    }
    
    if (summary.lowestBalance < 50000) {
      return { status: 'warning', color: 'text-amber-600', bg: 'bg-amber-100', icon: AlertTriangle };
    }
    
    if (summary.netChange > 0) {
      return { status: 'healthy', color: 'text-emerald-600', bg: 'bg-emerald-100', icon: TrendingUp };
    }
    
    return { status: 'neutral', color: 'text-slate-600', bg: 'bg-slate-100', icon: TrendingDown };
  };

  const chartData = getChartData();
  const healthStatus = getHealthStatus();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{data.date}</p>
          <div className="space-y-1 mt-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Saldo Inicial:</span>
              <span className="text-xs font-medium text-slate-700">
                {formatCurrency(data.openingBalance)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Entradas:</span>
              <span className="text-xs font-medium text-emerald-600">
                {formatCurrency(data.inflows)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Salidas:</span>
              <span className="text-xs font-medium text-rose-600">
                {formatCurrency(data.outflows)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Flujo Neto:</span>
              <span className={`text-xs font-medium ${data.netFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(data.netFlow)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Saldo Final:</span>
              <span className="text-xs font-medium text-cyan-600">
                {formatCurrency(data.closingBalance)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  const HealthIcon = healthStatus.icon as any;

  if (compact) {
    return (
      <Card className="bg-white border border-slate-200">
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Wallet className="w-4 h-4 text-cyan-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Proyección Flujo Caja
              </h3>
            </div>
            <button
              onClick={fetchProjectionData}
              disabled={loading}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <RefreshCw className={`w-3 h-3 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        
        <div className="px-4">
          {projection ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-cyan-50 rounded">
                  <p className="text-xs text-slate-600">Saldo Actual</p>
                  <p className="text-sm font-bold text-cyan-600">
                    {formatCurrency(projection.currentBalance)}
                  </p>
                </div>
                <div className="text-center p-2 bg-emerald-50 rounded">
                  <p className="text-xs text-slate-600">Saldo Final</p>
                  <p className="text-sm font-bold text-emerald-600">
                    {formatCurrency(projection.summary.endingBalance)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-amber-50 rounded">
                  <p className="text-xs text-slate-600">Flujo Neto</p>
                  <p className={`text-sm font-bold ${projection.summary.netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {formatCurrency(projection.summary.netChange)}
                  </p>
                </div>
                <div className="text-center p-2 bg-rose-50 rounded">
                  <p className="text-xs text-slate-600">Saldo Mínimo</p>
                  <p className="text-sm font-bold text-rose-600">
                    {formatCurrency(projection.summary.lowestBalance)}
                  </p>
                </div>
              </div>

              <div className={`p-2 ${healthStatus.bg} rounded`}>
                <div className="flex items-center space-x-1">
                  <HealthIcon className={`w-3 h-3 ${healthStatus.color}`} />
                  <p className={`text-xs font-medium ${healthStatus.color}`}>
                    {healthStatus.status === 'healthy' ? 'Saludable' : 
                     healthStatus.status === 'warning' ? 'Precaución' :
                     healthStatus.status === 'critical' ? 'Crítico' : 'Neutral'}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">Cargando proyección...</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200">
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Wallet className="w-5 h-5 text-cyan-600" />
            <h3 className="text-lg font-bold text-slate-900">
              Proyección de Flujo de Caja
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {showControls && (
              <div className="flex items-center space-x-2">
                <select
                  value={selectedView}
                  onChange={(e) => setSelectedView(e.target.value as any)}
                  className="text-xs border-slate-300 rounded px-2 py-1"
                >
                  <option value="balance">Saldo</option>
                  <option value="flows">Flujos</option>
                  <option value="combined">Combinado</option>
                </select>
                
                <label className="flex items-center space-x-1 text-xs">
                  <input
                    type="checkbox"
                    checked={includeProbability}
                    onChange={(e) => setIncludeProbability(e.target.checked)}
                    className="rounded"
                  />
                  <span>Probabilidad</span>
                </label>
              </div>
            )}
            
            <button
              onClick={fetchProjectionData}
              disabled={loading}
              className="p-2 hover:bg-slate-100 rounded"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="px-4">
        {projection ? (
          <div className="space-y-6">
            {/* Health Status & Key Metrics */}
            <div className="flex items-center justify-between">
              <div className={`flex items-center space-x-3 px-4 py-2 ${healthStatus.bg} rounded-lg`}>
                <HealthIcon className={`w-5 h-5 ${healthStatus.color}`} />
                <div>
                  <p className={`text-sm font-semibold ${healthStatus.color}`}>
                    Estado: {healthStatus.status === 'healthy' ? 'Saludable' : 
                           healthStatus.status === 'warning' ? 'Precaución' :
                           healthStatus.status === 'critical' ? 'Crítico' : 'Neutral'}
                  </p>
                  <p className="text-xs text-slate-600">
                    Período: {projection.period.days} días
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-6">
                <div className="text-center">
                  <p className="text-xs text-slate-500">Saldo Actual</p>
                  <p className="text-lg font-bold text-cyan-600">
                    {formatCurrency(projection.currentBalance)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Saldo Final</p>
                  <p className={`text-lg font-bold ${
                    projection.summary.endingBalance >= projection.currentBalance ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatCurrency(projection.summary.endingBalance)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-slate-500">Flujo Neto</p>
                  <p className={`text-lg font-bold ${
                    projection.summary.netChange >= 0 ? 'text-emerald-600' : 'text-rose-600'
                  }`}>
                    {formatCurrency(projection.summary.netChange)}
                  </p>
                </div>
              </div>
            </div>

            {/* Summary Statistics */}
            <div className="grid grid-cols-6 gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-500">Entradas Totales</p>
                <p className="text-sm font-bold text-emerald-600">
                  {formatCurrency(projection.summary.totalInflows)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Salidas Totales</p>
                <p className="text-sm font-bold text-rose-600">
                  {formatCurrency(projection.summary.totalOutflows)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Saldo Promedio</p>
                <p className="text-sm font-bold text-cyan-600">
                  {formatCurrency(projection.summary.averageDailyBalance)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Saldo Mínimo</p>
                <p className="text-sm font-bold text-amber-600">
                  {formatCurrency(projection.summary.lowestBalance)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Fecha Mínimo</p>
                <p className="text-sm font-bold text-slate-700">
                  {formatDate(projection.summary.lowestBalanceDate)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Días Negativos</p>
                <p className={`text-sm font-bold ${
                  projection.summary.daysWithNegativeBalance > 0 ? 'text-red-600' : 'text-emerald-600'
                }`}>
                  {projection.summary.daysWithNegativeBalance}
                </p>
              </div>
            </div>

            {/* Cash Flow Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                {selectedView === 'balance' ? (
                  <AreaChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorBalance" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(value) => `L. ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    <ReferenceLine 
                      y={0} 
                      stroke="#ef4444" 
                      strokeDasharray="3 3"
                      label={{ value: "Línea Cero", position: "left" }}
                    />
                    
                    <Area
                      type="monotone"
                      dataKey="closingBalance"
                      stroke="#6366f1"
                      strokeWidth={2}
                      fill="url(#colorBalance)"
                      name="Saldo Proyectado"
                    />
                  </AreaChart>
                ) : selectedView === 'flows' ? (
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(value) => `L. ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    <Bar
                      dataKey="inflows"
                      fill="#10b981"
                      fillOpacity={0.8}
                      name="Entradas"
                    />
                    <Bar
                      dataKey="outflows"
                      fill="#ef4444"
                      fillOpacity={0.8}
                      name="Salidas"
                    />
                  </BarChart>
                ) : (
                  <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                    />
                    <YAxis 
                      tick={{ fontSize: 10, fill: '#64748b' }}
                      tickFormatter={(value) => `L. ${(value / 1000).toFixed(0)}k`}
                    />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend />
                    
                    <ReferenceLine 
                      y={0} 
                      stroke="#ef4444" 
                      strokeDasharray="3 3"
                      label={{ value: "Línea Cero", position: "left" }}
                    />
                    
                    <Line
                      type="monotone"
                      dataKey="closingBalance"
                      stroke="#6366f1"
                      strokeWidth={2}
                      name="Saldo"
                    />
                    <Line
                      type="monotone"
                      dataKey="inflows"
                      stroke="#10b981"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      name="Entradas"
                    />
                    <Line
                      type="monotone"
                      dataKey="outflows"
                      stroke="#ef4444"
                      strokeWidth={1}
                      strokeDasharray="5 5"
                      name="Salidas"
                    />
                  </LineChart>
                )}
              </ResponsiveContainer>
            </div>

            {/* Warnings and Recommendations */}
            <div className="grid grid-cols-2 gap-4">
              {projection.warnings.length > 0 && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <h3 className="text-sm font-semibold text-amber-900">Alertas</h3>
                  </div>
                  <div className="space-y-1">
                    {projection.warnings.map((warning, index) => (
                      <p key={index} className="text-xs text-amber-700">{warning}</p>
                    ))}
                  </div>
                </div>
              )}

              {projection.recommendations.length > 0 && (
                <div className="p-4 bg-cyan-50 border border-cyan-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <Info className="w-4 h-4 text-cyan-600" />
                    <h3 className="text-sm font-semibold text-blue-900">Recomendaciones</h3>
                  </div>
                  <div className="space-y-1">
                    {projection.recommendations.map((rec, index) => (
                      <p key={index} className="text-xs text-cyan-700">{rec}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Generando proyección de flujo de caja...</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
