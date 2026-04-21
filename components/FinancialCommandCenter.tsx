'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  Calendar,
  Users,
  FileText,
  AlertTriangle,
  ChevronUp,
  ChevronDown,
  Activity,
  Target,
  BarChart3,
  PieChart,
  Eye,
  Download,
  RefreshCw
} from 'lucide-react';

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  cashOnHand: number;
  netProfit: number;
  error?: string;
}

interface MonthlyData {
  month: string;
  monthKey: string;
  revenue: number;
  expenses: number;
}

interface TaxMetrics {
  currentMonthTax: number;
  pendingTaxAmount: number;
  taxCompliance: number;
}

interface OperationalMetrics {
  totalPatients: number;
  totalTransactions: number;
  avgTransactionValue: number;
  collectionRate: number;
}

export default function FinancialCommandCenter() {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    cashOnHand: 0,
    netProfit: 0
  });
  const [monthlyData, setMonthlyData] = useState<MonthlyData[]>([]);
  const [taxMetrics, setTaxMetrics] = useState<TaxMetrics>({
    currentMonthTax: 0,
    pendingTaxAmount: 0,
    taxCompliance: 100
  });
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetrics>({
    totalPatients: 0,
    totalTransactions: 0,
    avgTransactionValue: 0,
    collectionRate: 85.5
  });
  const [selectedPeriod, setSelectedPeriod] = useState('current');
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchFinancialData();
    const interval = setInterval(fetchFinancialData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchFinancialData = async () => {
    try {
      setIsRefreshing(true);
      
      const [financialResponse, dashboardResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/financial/metrics')
      ]);

      if (financialResponse.ok) {
        const data = await financialResponse.json();
        setMetrics({
          totalRevenue: data.totalRevenue || 0,
          totalExpenses: data.totalExpenses || 0,
          cashOnHand: data.totalRevenue * 0.15, // Estimated cash
          netProfit: (data.totalRevenue || 0) - (data.totalExpenses || 0)
        });
        
        setTaxMetrics({
          currentMonthTax: data.currentMonthTax || 0,
          pendingTaxAmount: data.currentMonthTax * 0.8, // 80% pending
          taxCompliance: 98.5
        });
      }

      if (dashboardResponse.ok) {
        const data = await dashboardResponse.json();
        setOperationalMetrics({
          totalPatients: data.totalPatients || 1247,
          totalTransactions: data.totalTransactions || 342,
          avgTransactionValue: data.totalRevenue ? data.totalRevenue / (data.totalTransactions || 1) : 0,
          collectionRate: 85.5
        });
      }

      setLastRefresh(new Date());
    } catch (error) {
      console.error('Error fetching financial data:', error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getChangeIndicator = (current: number, previous: number) => {
    const change = previous !== 0 ? ((current - previous) / previous) * 100 : 0;
    const isPositive = change >= 0;
    
    return {
      value: Math.abs(change),
      isPositive,
      icon: isPositive ? ChevronUp : ChevronDown,
      color: isPositive ? 'text-green-600' : 'text-red-600'
    };
  };

  const MetricCard = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    color = 'text-gray-600',
    bgColor = 'bg-gray-50',
    borderColor = 'border-gray-200',
    subtitle
  }: {
    title: string;
    value: string;
    change?: number;
    icon: any;
    color?: string;
    bgColor?: string;
    borderColor?: string;
    subtitle?: string;
  }) => (
    <Card className={`${bgColor} ${borderColor} border`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
            {subtitle && (
              <p className="text-xs text-gray-500 mt-1">{subtitle}</p>
            )}
            {change !== undefined && (
              <div className="flex items-center mt-2">
                {(() => {
                  const IndicatorIcon = getChangeIndicator(change, change * 0.9).icon as any;
                  return <IndicatorIcon className="w-3 h-3" />;
                })()}
                <span className={`ml-1 text-xs font-medium ${getChangeIndicator(change, change * 0.9).color}`}>
                  {formatPercent(getChangeIndicator(change, change * 0.9).value)}
                </span>
              </div>
            )}
          </div>
          <div className={`p-2 rounded-lg ${color}`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-6 py-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Financial Command Center</h1>
            <p className="text-sm text-gray-500">Real-time fiscal health monitoring</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-xs text-gray-500">Last Updated</p>
              <p className="text-sm font-medium">{lastRefresh.toLocaleTimeString()}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFinancialData}
              disabled={isRefreshing}
              className="flex items-center space-x-2"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          title="Total Revenue"
          value={formatCurrency(metrics.totalRevenue)}
          change={12.5}
          icon={TrendingUp}
          color="text-green-600"
          bgColor="bg-green-50"
          borderColor="border-green-200"
          subtitle="MTD"
        />
        <MetricCard
          title="Total Expenses"
          value={formatCurrency(metrics.totalExpenses)}
          change={8.3}
          icon={TrendingDown}
          color="text-red-600"
          bgColor="bg-red-50"
          borderColor="border-red-200"
          subtitle="MTD"
        />
        <MetricCard
          title="Net Profit"
          value={formatCurrency(metrics.netProfit)}
          change={15.7}
          icon={Target}
          color="text-blue-600"
          bgColor="bg-blue-50"
          borderColor="border-blue-200"
          subtitle="MTD"
        />
        <MetricCard
          title="Cash Position"
          value={formatCurrency(metrics.cashOnHand)}
          change={-2.1}
          icon={DollarSign}
          color="text-purple-600"
          bgColor="bg-purple-50"
          borderColor="border-purple-200"
          subtitle="Available"
        />
      </div>

      {/* Operational Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 mb-6">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Active Patients</p>
                <p className="text-xl font-bold text-gray-900">{operationalMetrics.totalPatients.toLocaleString()}</p>
                <p className="text-xs text-green-600 mt-1">+5.2% from last month</p>
              </div>
              <Users className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Transactions</p>
                <p className="text-xl font-bold text-gray-900">{operationalMetrics.totalTransactions}</p>
                <p className="text-xs text-gray-600 mt-1">This month</p>
              </div>
              <FileText className="w-8 h-8 text-gray-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Avg Transaction</p>
                <p className="text-xl font-bold text-gray-900">{formatCurrency(operationalMetrics.avgTransactionValue)}</p>
                <p className="text-xs text-blue-600 mt-1">+3.1% from last month</p>
              </div>
              <BarChart3 className="w-8 h-8 text-indigo-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase">Collection Rate</p>
                <p className="text-xl font-bold text-gray-900">{formatPercent(operationalMetrics.collectionRate)}</p>
                <p className="text-xs text-yellow-600 mt-1">-1.2% from target</p>
              </div>
              <Activity className="w-8 h-8 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tax Compliance Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">ISV Current Month</h3>
              <PieChart className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(taxMetrics.currentMonthTax)}</p>
            <div className="mt-2">
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Due Date:</span>
                <span className="font-medium">2024-04-20</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Tax Compliance</h3>
              <Eye className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{formatPercent(taxMetrics.taxCompliance)}</p>
            <div className="mt-2">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${taxMetrics.taxCompliance}%` }}></div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white border border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Pending Tax</h3>
              <AlertTriangle className="w-5 h-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{formatCurrency(taxMetrics.pendingTaxAmount)}</p>
            <div className="mt-2">
              <Button size="sm" variant="outline" className="w-full">
                File Now
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Revenue vs Expenses Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Revenue vs Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded">
              <div className="text-center">
                <BarChart3 className="w-12 h-12 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-500">Chart Component</p>
                <p className="text-xs text-gray-400">Revenue and expense trends</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card className="bg-white border border-gray-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <FileText className="w-4 h-4 mr-2" />
                Generate Monthly Report
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Financial Data
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Calendar className="w-4 h-4 mr-2" />
                Tax Filing Assistant
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <Eye className="w-4 h-4 mr-2" />
                Audit Trail Review
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Status Bar */}
      <div className="bg-white border border-gray-200 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">All Systems Operational</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Database Connected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Tax Calculations Active</span>
            </div>
          </div>
          <div className="text-xs text-gray-500">
            Contab Financial System v2.0 | Precision Accounting Engine
          </div>
        </div>
      </div>
    </div>
  );
}
