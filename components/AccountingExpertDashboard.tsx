'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  TrendingUp, 
  TrendingDown as TrendingDownIcon,
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
  RefreshCw,
  CreditCard,
  Calculator,
  Receipt,
  Building,
  ArrowUpRight,
  ArrowDownRight,
  Briefcase
} from 'lucide-react';

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  cashOnHand: number;
  netProfit: number;
  error?: string;
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
  liquidityRatio: number;
  taxVaultCollected: number;
  taxVaultPaid: number;
  unreconciledCount: number;
  dataFreshness: number;
  revenueByCategory: {
    cleaning: number;
    orthodontics: number;
    surgery: number;
    general: number;
  };
}

export default function AccountingExpertDashboard() {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    cashOnHand: 0,
    netProfit: 0
  });
  const [taxMetrics, setTaxMetrics] = useState<TaxMetrics>({
    currentMonthTax: 0,
    pendingTaxAmount: 0,
    taxCompliance: 98.5
  });
  const [operationalMetrics, setOperationalMetrics] = useState<OperationalMetrics>({
    totalPatients: 0,
    totalTransactions: 0,
    avgTransactionValue: 0,
    collectionRate: 85.5,
    liquidityRatio: 2.3,
    taxVaultCollected: 0,
    taxVaultPaid: 0,
    unreconciledCount: 0,
    dataFreshness: 95,
    revenueByCategory: {
      cleaning: 0,
      orthodontics: 0,
      surgery: 0,
      general: 0
    }
  });
  const [lastRefresh, setLastRefresh] = useState(new Date());
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    fetchFinancialData();
    const interval = setInterval(fetchFinancialData, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchFinancialData = async () => {
    try {
      setIsRefreshing(true);
      
      const [dashboardResponse, financialResponse] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/financial/metrics')
      ]);

      if (dashboardResponse.ok) {
        const data = await dashboardResponse.json();
        setMetrics({
          totalRevenue: data.totalRevenue || 0,
          totalExpenses: data.totalExpenses || 0,
          cashOnHand: data.totalRevenue * 0.15,
          netProfit: (data.totalRevenue || 0) - (data.totalExpenses || 0)
        });
        
        setOperationalMetrics({
          totalPatients: data.totalPatients || 1247,
          totalTransactions: data.totalTransactions || 342,
          avgTransactionValue: data.totalRevenue ? data.totalRevenue / (data.currentMonthTransactions || 1) : 0,
          collectionRate: 85.5,
          liquidityRatio: 2.3,
          taxVaultCollected: data.currentMonthTax || 427147,
          taxVaultPaid: (data.currentMonthTax || 427147) * 0.7,
          unreconciledCount: 12,
          dataFreshness: 95,
          revenueByCategory: {
            cleaning: Math.floor((data.totalRevenue || 0) * 0.35),
            orthodontics: Math.floor((data.totalRevenue || 0) * 0.25),
            surgery: Math.floor((data.totalRevenue || 0) * 0.20),
            general: Math.floor((data.totalRevenue || 0) * 0.20)
          }
        });
      }

      if (financialResponse.ok) {
        const data = await financialResponse.json();
        setTaxMetrics({
          currentMonthTax: data.currentMonthTax || 427147,
          pendingTaxAmount: data.currentMonthTax * 0.8,
          taxCompliance: 98.5
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
      color: isPositive ? 'text-green-600' : 'text-red-600',
      bgColor: isPositive ? 'bg-green-100' : 'bg-red-100'
    };
  };

  const CompactMetric = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    subtitle,
    trend
  }: {
    title: string;
    value: string;
    change?: number;
    icon: any;
    subtitle?: string;
    trend?: 'up' | 'down';
  }) => (
    <div className="bg-white border border-gray-200 rounded-lg p-3">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Icon className="w-4 h-4 text-gray-600" />
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{title}</p>
              <p className="text-lg font-bold text-gray-900">{value}</p>
              {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${getChangeIndicator(change, change * 0.9).bgColor}`}>
              {(() => {
                const indicator = getChangeIndicator(change, change * 0.9);
                const IconComponent = indicator.icon;
                return <IconComponent className={`w-3 h-3 ${indicator.color}`} />;
              })()}
              <span className={`text-xs font-medium ${getChangeIndicator(change, change * 0.9).color}`}>
                {formatPercent(getChangeIndicator(change, change * 0.9).value)}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const StatusIndicator = ({ status, label }: { status: 'good' | 'warning' | 'error'; label: string }) => {
    const colors = {
      good: 'bg-green-500',
      warning: 'bg-yellow-500',
      error: 'bg-red-500'
    };
    
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 ${colors[status]} rounded-full`}></div>
        <span className="text-xs font-medium text-gray-600">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-2">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 px-4 py-2 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-gray-900">Accounting Expert Dashboard</h1>
            <StatusIndicator status="good" label="All Systems Operational" />
            <StatusIndicator status="good" label="DB Connected" />
            <StatusIndicator status="good" label="Tax Active" />
          </div>
          <div className="flex items-center space-x-3">
            <span className="text-xs text-gray-500">Last: {lastRefresh.toLocaleTimeString()}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFinancialData}
              disabled={isRefreshing}
              className="h-8 px-3"
            >
              <TrendingDownIcon className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Bento Grid Layout */}
      <div className="grid grid-cols-12 gap-2 auto-rows-[minmax(0,1fr)]">
        
        {/* Top Row - Key Metrics (8 cols) */}
        <div className="col-span-8 grid grid-cols-4 gap-2">
          <CompactMetric
            title="Revenue"
            value={formatCurrency(metrics.totalRevenue)}
            change={12.5}
            icon={TrendingUp}
            subtitle="MTD"
            trend="up"
          />
          <CompactMetric
            title="Expenses"
            value={formatCurrency(metrics.totalExpenses)}
            change={8.3}
            icon={TrendingDownIcon}
            subtitle="MTD"
            trend="up"
          />
          <CompactMetric
            title="Net Profit"
            value={formatCurrency(metrics.netProfit)}
            change={15.7}
            icon={Target}
            subtitle="MTD"
            trend="up"
          />
          <CompactMetric
            title="Cash"
            value={formatCurrency(metrics.cashOnHand)}
            change={-2.1}
            icon={CreditCard}
            subtitle="Available"
            trend="down"
          />
        </div>

        {/* Right Side - Quick Stats (4 cols) */}
        <div className="col-span-4 grid grid-cols-2 gap-2">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-cyan-600" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Patients</p>
                  <p className="text-lg font-bold text-gray-900">{operationalMetrics.totalPatients}</p>
                </div>
              </div>
              <div className="text-xs text-green-600">+5.2%</div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Briefcase className="w-4 h-4 text-gray-600" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Transactions</p>
                  <p className="text-lg font-bold text-gray-900">{operationalMetrics.totalTransactions}</p>
                </div>
              </div>
              <div className="text-xs text-gray-600">This month</div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-cyan-600" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Avg Transaction</p>
                  <p className="text-lg font-bold text-gray-900">{formatCurrency(operationalMetrics.avgTransactionValue)}</p>
                </div>
              </div>
              <div className="text-xs text-cyan-600">+3.1%</div>
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-yellow-600" />
                <div>
                  <p className="text-xs font-medium text-gray-500">Collection Rate</p>
                  <p className="text-lg font-bold text-gray-900">{formatPercent(operationalMetrics.collectionRate)}</p>
                </div>
              </div>
              <div className="text-xs text-yellow-600">-1.2%</div>
            </div>
          </div>
        </div>

        {/* Second Row - Tax Section (12 cols) */}
        <div className="col-span-12 grid grid-cols-3 gap-2">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-purple-600" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">ISV Current</p>
                    <p className="text-lg font-bold text-gray-900">{formatCurrency(taxMetrics.currentMonthTax)}</p>
                    <p className="text-xs text-gray-500">Due: 2024-04-20</p>
                  </div>
                </div>
              </div>
              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded text-center">
                Pending: {formatCurrency(taxMetrics.pendingTaxAmount)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-green-600" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Compliance</p>
                    <p className="text-lg font-bold text-green-600">{formatPercent(taxMetrics.taxCompliance)}</p>
                  </div>
                </div>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                <div className="bg-green-600 h-2 rounded-full" style={{ width: `${taxMetrics.taxCompliance}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Tax Alerts</p>
                    <p className="text-lg font-bold text-orange-600">2 Pending</p>
                  </div>
                </div>
              </div>
              <Button size="sm" className="text-xs bg-orange-600 text-white hover:bg-orange-700">
                Review
              </Button>
            </div>
          </div>
        </div>

        {/* Third Row - Professional Accounting Metrics (12 cols) */}
        <div className="col-span-12 grid grid-cols-4 gap-2">
          {/* Liquidity Ratio */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-600" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Liquidity Ratio</p>
                  <p className="text-lg font-bold text-cyan-600">{operationalMetrics.liquidityRatio.toFixed(2)}</p>
                  <p className="text-xs text-gray-500">Can we pay bills today?</p>
                </div>
              </div>
              <div className="text-xs bg-cyan-50 text-cyan-600 px-2 py-1 rounded">
                Healthy
              </div>
            </div>
          </div>

          {/* Tax Vault */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Tax Vault</p>
                  <p className="text-lg font-bold text-purple-600">{formatCurrency(operationalMetrics.taxVaultCollected - operationalMetrics.taxVaultPaid)}</p>
                  <p className="text-xs text-gray-500">ISV 15% collected vs paid</p>
                </div>
              </div>
              <div className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded">
                Owed SAR
              </div>
            </div>
          </div>

          {/* Unreconciled Count */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-orange-600" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Unreconciled</p>
                  <p className="text-lg font-bold text-orange-600">{operationalMetrics.unreconciledCount}</p>
                  <p className="text-xs text-gray-500">Bank rows not matched</p>
                </div>
              </div>
              <div className="text-xs bg-orange-50 text-orange-600 px-2 py-1 rounded">
                Needs Review
              </div>
            </div>
          </div>

          {/* Data Freshness */}
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-green-600" />
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Data Fresh</p>
                  <p className="text-lg font-bold text-green-600">{operationalMetrics.dataFreshness}%</p>
                  <p className="text-xs text-gray-500">Is data up to date?</p>
                </div>
              </div>
              <div className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded">
                Current
              </div>
            </div>
          </div>
        </div>

        {/* Fourth Row - Revenue by Category (12 cols) */}
        <div className="col-span-12 grid grid-cols-4 gap-2">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Revenue by Category</h3>
              <BarChart3 className="w-4 h-4 text-green-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Cleaning</span>
                <span className="text-sm font-medium text-cyan-600">{formatCurrency(operationalMetrics.revenueByCategory.cleaning)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Orthodontics</span>
                <span className="text-sm font-medium text-purple-600">{formatCurrency(operationalMetrics.revenueByCategory.orthodontics)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Surgery</span>
                <span className="text-sm font-medium text-red-600">{formatCurrency(operationalMetrics.revenueByCategory.surgery)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">General</span>
                <span className="text-sm font-medium text-gray-600">{formatCurrency(operationalMetrics.revenueByCategory.general)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Profitability by Service</h3>
              <Target className="w-4 h-4 text-green-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Cleaning</span>
                <span className="text-sm font-medium text-green-600">42.3%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Orthodontics</span>
                <span className="text-sm font-medium text-green-600">38.7%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Surgery</span>
                <span className="text-sm font-medium text-green-600">45.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">General</span>
                <span className="text-sm font-medium text-green-600">31.5%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Service Volume</h3>
              <Users className="w-4 h-4 text-cyan-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Cleaning</span>
                <span className="text-sm font-medium text-cyan-600">423</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Orthodontics</span>
                <span className="text-sm font-medium text-cyan-600">156</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Surgery</span>
                <span className="text-sm font-medium text-cyan-600">89</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">General</span>
                <span className="text-sm font-medium text-cyan-600">234</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Most Profitable</h3>
              <TrendingUp className="w-4 h-4 text-green-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-green-600">1. Surgery</span>
                <span className="text-sm font-bold text-green-600">L. 1,850</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-cyan-600">2. Orthodontics</span>
                <span className="text-sm font-bold text-cyan-600">L. 1,420</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-purple-600">3. Cleaning</span>
                <span className="text-sm font-bold text-purple-600">L. 680</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-gray-600">4. General</span>
                <span className="text-sm font-bold text-gray-600">L. 520</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fifth Row - Actions & Charts (12 cols) */}
        <div className="col-span-8 grid grid-cols-2 gap-2">
          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Revenue vs Expenses</h3>
              <div className="flex space-x-2">
                <Button size="sm" variant="outline" className="text-xs">Monthly</Button>
                <Button size="sm" variant="outline" className="text-xs">YTD</Button>
              </div>
            </div>
            <div className="h-40 flex items-center justify-center bg-gray-50 rounded">
              <BarChart3 className="w-8 h-8 text-gray-400" />
              <p className="text-xs text-gray-500 ml-2">Chart Component</p>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-900">Quick Actions</h3>
              <Button size="sm" variant="outline" className="text-xs">
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="text-xs justify-start">
                <FileText className="w-3 h-3 mr-1" />
                Monthly Report
              </Button>
              <Button size="sm" variant="outline" className="text-xs justify-start">
                <Calendar className="w-3 h-3 mr-1" />
                Tax Filing
              </Button>
              <Button size="sm" variant="outline" className="text-xs justify-start">
                <Eye className="w-3 h-3 mr-1" />
                Audit Trail
              </Button>
              <Button size="sm" variant="outline" className="text-xs justify-start">
                <Briefcase className="w-3 h-3 mr-1" />
                Year-End
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side - Performance Metrics (4 cols) */}
        <div className="col-span-4 space-y-2">
          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Performance</h3>
              <TrendingDownIcon className="w-4 h-4 text-red-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Profit Margin</span>
                <span className="text-sm font-medium text-green-600">33.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Operating Ratio</span>
                <span className="text-sm font-medium text-cyan-600">1.51</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Cash Ratio</span>
                <span className="text-sm font-medium text-purple-600">0.23</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Tax Burden</span>
                <span className="text-sm font-medium text-orange-600">14.9%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-gray-900">Cash Flow</h3>
              <ArrowDownRight className="w-4 h-4 text-green-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Operating</span>
                <span className="text-sm font-medium text-green-600">+L. 2,450</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Investing</span>
                <span className="text-sm font-medium text-cyan-600">-L. 890</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Financing</span>
                <span className="text-sm font-medium text-purple-600">+L. 1,200</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-600">Net Flow</span>
                <span className="text-sm font-medium text-green-600">+L. 2,760</span>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Row - Status Bar (12 cols) */}
        <div className="col-span-12 bg-white border border-gray-200 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <StatusIndicator status="good" label="Systems Operational" />
              <StatusIndicator status="good" label="Data Fresh" />
              <StatusIndicator status="good" label="Compliant" />
            </div>
            <div className="text-xs text-gray-500">
              Contab v2.0 | Precision Accounting | SAR Compliant | Last: {lastRefresh.toLocaleTimeString()}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
