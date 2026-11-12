'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart,
  Line,
  Area,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  BarChart
} from 'recharts';
import { Button } from '@/components/ui/button';
import { CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
import {
  Card,
  Title,
  Text,
  Bold,
  Flex,
  Select,
  Button as TremorButton,
  Badge
} from '@tremor/react';
import {
  TrendingUp, 
  Target,
  Calendar,
  RefreshCw,
  Download,
  Activity,
  AlertTriangle,
  TrendingDown
} from 'lucide-react';

interface BurnRateData {
  day: string;
  date: string;
  cumulativeRevenue: number;
  cumulativeExpenses: number;
  dailyRevenue: number;
  dailyExpenses: number;
  netCashFlow: number;
}

interface BurnRateChartProps {
  data?: BurnRateData[];
  period?: string;
  showControls?: boolean;
}

export default function BurnRateChart({ 
  data: initialData = [], 
  period = 'current-month',
  showControls = true 
}: BurnRateChartProps) {
  const [data, setData] = useState<BurnRateData[]>(initialData);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState(period);
  const [showDaily, setShowDaily] = useState(false);

  useEffect(() => {
    fetchBurnRateData();
  }, [selectedPeriod]);

const fetchBurnRateData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/burn-rate?period=${selectedPeriod}`);
      const result = await response.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        setData([]);
      }
    } catch (error) {
      console.error('Error fetching burn rate data:', error);
      setData([]);
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

  const findBreakEvenPoint = () => {
    for (let i = 0; i < data.length; i++) {
      if (data[i].cumulativeRevenue >= data[i].cumulativeExpenses) {
        return {
          day: data[i].day,
          date: data[i].date,
          amount: data[i].cumulativeRevenue
        };
      }
    }
    return null;
  };

  const getCurrentMetrics = () => {
    if (data.length === 0) return null;
    
    const latest = data[data.length - 1];
    const breakEven = findBreakEvenPoint();
    
    return {
      totalRevenue: latest.cumulativeRevenue,
      totalExpenses: latest.cumulativeExpenses,
      netCashFlow: latest.netCashFlow,
      breakEvenPoint: breakEven,
      daysToBreakEven: breakEven ? (data as any).indexOf(breakEven) + 1 : null,
      burnRate: latest.cumulativeExpenses / data.length,
      runway: latest.cumulativeRevenue / (latest.cumulativeExpenses / data.length)
    };
  };

  const metrics = getCurrentMetrics();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{data.date}</p>
          <div className="space-y-1 mt-2">
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Revenue:</span>
              <span className="text-xs font-medium text-emerald-600">
                {formatCurrency(data.cumulativeRevenue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Expenses:</span>
              <span className="text-xs font-medium text-rose-600">
                {formatCurrency(data.cumulativeExpenses)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-xs text-slate-600">Net Flow:</span>
              <span className={`text-xs font-medium ${data.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
                {formatCurrency(data.netCashFlow)}
              </span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white border border-slate-200">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-cyan-600" />
            <CardTitle className="text-lg font-bold text-slate-900 font-inter">
              Burn Rate Analysis
            </CardTitle>
          </div>
          <div className="flex items-center space-x-2">
            {showControls && (
              <div className="flex items-center space-x-2">
                <select
                  value={selectedPeriod}
                  onChange={(e) => setSelectedPeriod(e.target.value)}
                  className="text-xs border-slate-300 rounded px-2 py-1 font-inter"
                >
                  <option value="current-month">Current Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="current-quarter">Current Quarter</option>
                  <option value="last-quarter">Last Quarter</option>
                </select>
                
                <Button
                  size="sm"
                  variant={showDaily ? "default" : "outline"}
                  onClick={() => setShowDaily(!showDaily)}
                  className="text-xs"
                >
                  {showDaily ? "Cumulative" : "Daily"}
                </Button>
              </div>
            )}
            
            <Button
              variant="outline"
              size="sm"
              onClick={fetchBurnRateData}
              disabled={loading}
              className="h-8 px-3 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {/* Key Metrics */}
        {metrics && (
          <div className="grid grid-cols-6 gap-4 mb-6">
            <div className="text-center">
              <p className="text-xs text-slate-500 font-inter">Total Revenue</p>
              <p className="text-lg font-bold text-emerald-600 font-jetbrains-mono">
                {formatCurrency(metrics.totalRevenue)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 font-inter">Total Expenses</p>
              <p className="text-lg font-bold text-rose-600 font-jetbrains-mono">
                {formatCurrency(metrics.totalExpenses)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 font-inter">Net Cash Flow</p>
              <p className={`text-lg font-bold font-jetbrains-mono ${
                metrics.netCashFlow >= 0 ? 'text-emerald-600' : 'text-rose-600'
              }`}>
                {formatCurrency(metrics.netCashFlow)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 font-inter">Daily Burn Rate</p>
              <p className="text-lg font-bold text-amber-600 font-jetbrains-mono">
                {formatCurrency(metrics.burnRate)}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 font-inter">Runway</p>
              <p className="text-lg font-bold text-cyan-600 font-jetbrains-mono">
                {Math.floor(metrics.runway)} days
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-slate-500 font-inter">Break-Even</p>
              {metrics.breakEvenPoint ? (
                <div>
                  <p className="text-lg font-bold text-cyan-600 font-jetbrains-mono">
                    Day {metrics.daysToBreakEven}
                  </p>
                  <p className="text-xs text-slate-500">{metrics.breakEvenPoint.date}</p>
                </div>
              ) : (
                <p className="text-lg font-bold text-amber-600 font-jetbrains-mono">
                  Not reached
                </p>
              )}
            </div>
          </div>
        )}

        {/* Break-Even Indicator */}
        {metrics?.breakEvenPoint && (
          <div className="mb-4 p-3 bg-cyan-50 border border-cyan-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-600" />
                <div>
                  <p className="text-sm font-semibold text-cyan-900 font-inter">
                    Break-Even Point Reached
                  </p>
                  <p className="text-xs text-slate-600 font-inter">
                    {metrics.breakEvenPoint.date} - {formatCurrency(metrics.breakEvenPoint.amount)}
                  </p>
                </div>
              </div>
              <div className="text-xs bg-cyan-100 text-cyan-700 px-2 py-1 rounded font-inter">
                {metrics.daysToBreakEven} days
              </div>
            </div>
          </div>
        )}

        {/* Chart */}
        <div className="h-80">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
              <span className="ml-2 text-sm text-slate-500 font-inter">Loading chart...</span>
            </div>
          ) : data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.1}/>
                  </linearGradient>
                  <linearGradient id="colorExpenses" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="day" 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  tickLine={{ stroke: '#e2e8f0' }}
                  tickFormatter={(value) => `L. ${(value / 1000).toFixed(0)}k`}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                {showDaily ? (
                  <>
                    <Bar
                      dataKey="dailyRevenue"
                      fill="#10b981"
                      fillOpacity={0.6}
                      name="Daily Revenue"
                    />
                    <Bar
                      dataKey="dailyExpenses"
                      fill="#ef4444"
                      fillOpacity={0.6}
                      name="Daily Expenses"
                    />
                  </>
                ) : (
                  <>
                    <Area
                      type="monotone"
                      dataKey="cumulativeRevenue"
                      stroke="#10b981"
                      strokeWidth={2}
                      fill="url(#colorRevenue)"
                      name="Cumulative Revenue"
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativeExpenses"
                      stroke="#ef4444"
                      strokeWidth={2}
                      fill="url(#colorExpenses)"
                      name="Cumulative Expenses"
                    />
                  </>
                )}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <AlertTriangle className="w-6 h-6 text-slate-400" />
              <span className="ml-2 text-sm text-slate-500 font-inter">No data available</span>
            </div>
          )}
        </div>

        {/* Export Options */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-slate-200">
          <div className="text-xs text-slate-500 font-inter">
            {data.length} days analyzed • {selectedPeriod}
          </div>
          <div className="flex space-x-2">
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 font-inter"
            >
              <Download className="w-3 h-3 mr-1" />
              Export CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 font-inter"
            >
              <Calendar className="w-3 h-3 mr-1" />
              Schedule Report
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
