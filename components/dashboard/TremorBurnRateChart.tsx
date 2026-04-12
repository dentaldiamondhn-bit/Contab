'use client';

import { useState, useEffect } from 'react';
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
  AlertTriangle
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';

interface BurnRateData {
  day: string;
  date: string;
  cumulativeRevenue: number;
  cumulativeExpenses: number;
  dailyRevenue: number;
  dailyExpenses: number;
  netCashFlow: number;
}

interface BurnRateMetrics {
  currentBurnRate: number;
  runwayDays: number;
  monthlyAverage: number;
  breakEvenPoint?: {
    date: string;
    amount: number;
  };
  daysToBreakEven?: number;
}

export default function TremorBurnRateChart() {
  const [data, setData] = useState<BurnRateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState('current-month');
  const [showDaily, setShowDaily] = useState(false);
  const [metrics, setMetrics] = useState<BurnRateMetrics | null>(null);
  const [showControls, setShowControls] = useState(true);

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
        setMetrics(result.metrics);
      }
    } catch (error) {
      console.error('Error fetching burn rate data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(amount);
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{`Day: ${label}`}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} className="text-sm" style={{ color: entry.color }}>
              {`${entry.name}: ${formatCurrency(entry.value)}`}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <Card className="bg-white border border-slate-200">
      <div className="pb-3">
        <Flex justifyContent="between" alignItems="center">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <Title className="text-lg font-bold text-slate-900">
              Burn Rate Analysis
            </Title>
          </div>
          <div className="flex items-center space-x-2">
            {showControls && (
              <div className="flex items-center space-x-2">
                <Select
                  value={selectedPeriod}
                  onValueChange={setSelectedPeriod}
                  className="text-xs"
                >
                  <option value="current-month">Current Month</option>
                  <option value="last-month">Last Month</option>
                  <option value="current-quarter">Current Quarter</option>
                  <option value="last-quarter">Last Quarter</option>
                </Select>
                
                <TremorButton
                  size="sm"
                  variant={showDaily ? "primary" : "secondary"}
                  onClick={() => setShowDaily(!showDaily)}
                >
                  {showDaily ? "Cumulative" : "Daily"}
                </TremorButton>
              </div>
            )}
            
            <TremorButton
              size="sm"
              variant="secondary"
              onClick={fetchBurnRateData}
              disabled={loading}
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
            </TremorButton>
          </div>
        </Flex>
      </div>

      {/* Metrics Summary */}
      {metrics && (
        <div className="mb-4 p-3 bg-slate-50 border border-slate-200 rounded-lg">
          <div className="grid grid-cols-4 gap-4">
            <div>
              <Text className="text-xs text-slate-600">Current Burn Rate</Text>
              <Bold className="text-sm font-semibold text-red-600">
                {formatCurrency(metrics.currentBurnRate)}
              </Bold>
            </div>
            <div>
              <Text className="text-xs text-slate-600">Runway</Text>
              <Bold className="text-sm font-semibold text-orange-600">
                {metrics.runwayDays} days
              </Bold>
            </div>
            <div>
              <Text className="text-xs text-slate-600">Monthly Average</Text>
              <Bold className="text-sm font-semibold text-slate-600">
                {formatCurrency(metrics.monthlyAverage)}
              </Bold>
            </div>
            <div>
              <Text className="text-xs text-slate-600">Trend</Text>
              <Bold className="text-sm font-semibold text-green-600 flex items-center">
                <TrendingUp className="w-3 h-3 mr-1" />
                Improving
              </Bold>
            </div>
          </div>
        </div>
      )}

      {/* Break-Even Indicator */}
      {metrics?.breakEvenPoint && (
        <div className="mb-4 p-3 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Activity className="w-4 h-4 text-indigo-600" />
              <div>
                <Text className="text-sm font-semibold text-indigo-900">
                  Break-Even Point Reached
                </Text>
                <Text className="text-xs text-slate-600">
                  {metrics.breakEvenPoint.date} - {formatCurrency(metrics.breakEvenPoint.amount)}
                </Text>
              </div>
            </div>
            <Badge color="indigo" size="sm">
              {metrics.daysToBreakEven} days
            </Badge>
          </div>
        </div>
      )}

      <div className="h-80">
        {loading ? (
          <Flex justifyContent="center" alignItems="center" className="h-full">
            <RefreshCw className="w-6 h-6 text-slate-400 animate-spin" />
            <Text className="ml-2 text-sm text-slate-500">Loading chart...</Text>
          </Flex>
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
              />
              <Tooltip content={<CustomTooltip />} />
              {showDaily ? (
                <>
                  <Area
                    type="monotone"
                    dataKey="dailyRevenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    fill="url(#colorRevenue)"
                    name="Daily Revenue"
                  />
                  <Area
                    type="monotone"
                    dataKey="dailyExpenses"
                    stroke="#ef4444"
                    strokeWidth={2}
                    fill="url(#colorExpenses)"
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
          <Flex justifyContent="center" alignItems="center" className="h-full">
            <AlertTriangle className="w-6 h-6 text-slate-400" />
            <Text className="ml-2 text-sm text-slate-500">No data available</Text>
          </Flex>
        )}
      </div>
    </Card>
  );
}
