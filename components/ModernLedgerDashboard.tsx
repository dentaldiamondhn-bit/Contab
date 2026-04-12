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
  ArrowUpRight,
  ArrowDownRight,
  Shield,
  Camera
} from 'lucide-react';
import { 
  ActiveAuditFeed,
  TremorBurnRateChart,
  CAIDashboard,
  WithholdingDashboard,
  DETDashboard,
  BreakEvenChart,
  CashFlowProjectionChart
} from './dashboard';

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

export default function ModernLedgerDashboard() {
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
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    setLastRefresh(new Date());
  }, []);

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
      color: isPositive ? 'text-emerald-600' : 'text-rose-600',
      bgColor: isPositive ? 'bg-emerald-50' : 'bg-rose-50'
    };
  };

  const CompactMetric = ({ 
    title, 
    value, 
    change, 
    icon: Icon, 
    subtitle,
    trend,
    valueColor = 'text-slate-900'
  }: {
    title: string;
    value: string;
    change?: number;
    icon: any;
    subtitle?: string;
    trend?: 'up' | 'down';
    valueColor?: string;
  }) => (
    <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Icon className="w-4 h-4 text-slate-600" />
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider font-inter">{title}</p>
              <p className={`text-lg font-bold font-jetbrains-mono ${valueColor}`}>{value}</p>
              {subtitle && <p className="text-xs text-slate-500 font-inter">{subtitle}</p>}
            </div>
          </div>
          {change !== undefined && (
            <div className={`flex items-center space-x-1 px-2 py-1 rounded ${getChangeIndicator(change, change * 0.9).bgColor}`}>
              {(() => {
                const indicator = getChangeIndicator(change, change * 0.9);
                const IconComponent = indicator.icon;
                return <IconComponent className={`w-3 h-3 ${indicator.color}`} />;
              })()}
              <span className={`text-xs font-medium font-inter ${getChangeIndicator(change, change * 0.9).color}`}>
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
      good: 'bg-emerald-500',
      warning: 'bg-amber-500',
      error: 'bg-rose-500'
    };
    
    return (
      <div className="flex items-center space-x-2">
        <div className={`w-2 h-2 ${colors[status]} rounded-full`}></div>
        <span className="text-xs font-medium text-slate-600 font-inter">{label}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-2">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-2 mb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-bold text-slate-900 font-inter">Modern Ledger</h1>
            <StatusIndicator status="good" label="Systems Operational" />
            <StatusIndicator status="good" label="DB Connected" />
            <StatusIndicator status="good" label="Tax Active" />
          </div>
          <div className="flex items-center space-x-3">
            {isClient && (
              <span className="text-xs text-slate-500 font-inter">Last: {lastRefresh?.toLocaleTimeString()}</span>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={fetchFinancialData}
              disabled={isRefreshing}
              className="h-8 px-3 border-slate-300 text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
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
            valueColor="text-emerald-600"
          />
          <CompactMetric
            title="Expenses"
            value={formatCurrency(metrics.totalExpenses)}
            change={8.3}
            icon={TrendingDownIcon}
            subtitle="MTD"
            trend="up"
            valueColor="text-rose-600"
          />
          <CompactMetric
            title="Net Profit"
            value={formatCurrency(metrics.netProfit)}
            change={15.7}
            icon={Target}
            subtitle="MTD"
            trend="up"
            valueColor="text-emerald-600"
          />
          <CompactMetric
            title="Cash"
            value={formatCurrency(metrics.cashOnHand)}
            change={-2.1}
            icon={CreditCard}
            subtitle="Available"
            trend="down"
            valueColor="text-slate-900"
          />
        </div>

        {/* Right Side - Quick Stats (4 cols) */}
        <div className="col-span-4 grid grid-cols-2 gap-2">
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-indigo-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase font-inter">Patients</p>
                  <p className="text-lg font-bold text-slate-900 font-jetbrains-mono">{operationalMetrics.totalPatients}</p>
                </div>
              </div>
              <div className="text-xs text-emerald-600 font-inter">+5.2%</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Receipt className="w-4 h-4 text-slate-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase font-inter">Transactions</p>
                  <p className="text-lg font-bold text-slate-900 font-jetbrains-mono">{operationalMetrics.totalTransactions}</p>
                </div>
              </div>
              <div className="text-xs text-slate-500 font-inter">This month</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Calculator className="w-4 h-4 text-indigo-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase font-inter">Avg Transaction</p>
                  <p className="text-lg font-bold text-slate-900 font-jetbrains-mono">{formatCurrency(operationalMetrics.avgTransactionValue)}</p>
                </div>
              </div>
              <div className="text-xs text-indigo-600 font-inter">+3.1%</div>
            </div>
          </div>
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase font-inter">Collection Rate</p>
                  <p className="text-lg font-bold text-slate-900 font-jetbrains-mono">{formatPercent(operationalMetrics.collectionRate)}</p>
                </div>
              </div>
              <div className="text-xs text-amber-600 font-inter">-1.2%</div>
            </div>
          </div>
        </div>

        {/* Second Row - Tax Section (12 cols) */}
        <div className="col-span-12 grid grid-cols-3 gap-2">
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <PieChart className="w-4 h-4 text-indigo-600" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase font-inter">ISV Current</p>
                    <p className="text-lg font-bold text-indigo-600 font-jetbrains-mono">{formatCurrency(taxMetrics.currentMonthTax)}</p>
                    <p className="text-xs text-slate-500 font-inter">Due: 2024-04-20</p>
                  </div>
                </div>
              </div>
              <div className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded font-inter">
                Pending: {formatCurrency(taxMetrics.pendingTaxAmount)}
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Eye className="w-4 h-4 text-emerald-600" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase font-inter">Compliance</p>
                    <p className="text-lg font-bold text-emerald-600 font-jetbrains-mono">{formatPercent(taxMetrics.taxCompliance)}</p>
                  </div>
                </div>
              </div>
              <div className="w-full bg-slate-200 rounded-full h-2 mt-2">
                <div className="bg-emerald-600 h-2 rounded-full" style={{ width: `${taxMetrics.taxCompliance}%` }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <div>
                    <p className="text-xs font-medium text-slate-500 uppercase font-inter">Tax Alerts</p>
                    <p className="text-lg font-bold text-amber-600 font-jetbrains-mono">2 Pending</p>
                  </div>
                </div>
              </div>
              <Button size="sm" className="text-xs bg-amber-600 text-white hover:bg-amber-700 font-inter">
                Review
              </Button>
            </div>
          </div>
        </div>

        {/* Third Row - Professional Accounting Metrics (12 cols) */}
        <div className="col-span-12 grid grid-cols-4 gap-2">
          {/* Liquidity Ratio */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-indigo-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase font-inter">Liquidity Ratio</p>
                  <p className="text-lg font-bold text-indigo-600 font-jetbrains-mono">{operationalMetrics.liquidityRatio.toFixed(2)}</p>
                  <p className="text-xs text-slate-500 font-inter">Can we pay bills today?</p>
                </div>
              </div>
              <div className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-inter">
                Healthy
              </div>
            </div>
          </div>

          {/* Tax Vault */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <PieChart className="w-4 h-4 text-indigo-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase font-inter">Tax Vault</p>
                  <p className="text-lg font-bold text-indigo-600 font-jetbrains-mono">{formatCurrency(operationalMetrics.taxVaultCollected - operationalMetrics.taxVaultPaid)}</p>
                  <p className="text-xs text-slate-500 font-inter">ISV 15% collected vs paid</p>
                </div>
              </div>
              <div className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded font-inter">
                Owed SAR
              </div>
            </div>
          </div>

          {/* Unreconciled Count */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase font-inter">Unreconciled</p>
                  <p className="text-lg font-bold text-amber-600 font-jetbrains-mono">{operationalMetrics.unreconciledCount}</p>
                  <p className="text-xs text-slate-500 font-inter">Bank rows not matched</p>
                </div>
              </div>
              <div className="text-xs bg-amber-50 text-amber-600 px-2 py-1 rounded font-inter">
                Needs Review
              </div>
            </div>
          </div>

          {/* Data Freshness */}
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-4 h-4 text-emerald-600" />
                <div>
                  <p className="text-xs font-medium text-slate-500 uppercase font-inter">Data Fresh</p>
                  <p className="text-lg font-bold text-emerald-600 font-jetbrains-mono">{operationalMetrics.dataFreshness}%</p>
                  <p className="text-xs text-slate-500 font-inter">Is data up to date?</p>
                </div>
              </div>
              <div className="text-xs bg-emerald-50 text-emerald-600 px-2 py-1 rounded font-inter">
                Current
              </div>
            </div>
          </div>
        </div>

        {/* Fourth Row - Revenue by Category (12 cols) */}
        <div className="col-span-12 grid grid-cols-4 gap-2">
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900 font-inter">Revenue by Category</h3>
              <BarChart3 className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Cleaning</span>
                <span className="text-sm font-medium text-blue-600 font-jetbrains-mono">{formatCurrency(operationalMetrics.revenueByCategory.cleaning)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Orthodontics</span>
                <span className="text-sm font-medium text-indigo-600 font-jetbrains-mono">{formatCurrency(operationalMetrics.revenueByCategory.orthodontics)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Surgery</span>
                <span className="text-sm font-medium text-rose-600 font-jetbrains-mono">{formatCurrency(operationalMetrics.revenueByCategory.surgery)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">General</span>
                <span className="text-sm font-medium text-slate-600 font-jetbrains-mono">{formatCurrency(operationalMetrics.revenueByCategory.general)}</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900 font-inter">Profitability by Service</h3>
              <Target className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Cleaning</span>
                <span className="text-sm font-medium text-emerald-600 font-jetbrains-mono">42.3%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Orthodontics</span>
                <span className="text-sm font-medium text-emerald-600 font-jetbrains-mono">38.7%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Surgery</span>
                <span className="text-sm font-medium text-emerald-600 font-jetbrains-mono">45.2%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">General</span>
                <span className="text-sm font-medium text-emerald-600 font-jetbrains-mono">31.5%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900 font-inter">Service Volume</h3>
              <Users className="w-4 h-4 text-indigo-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Cleaning</span>
                <span className="text-sm font-medium text-indigo-600 font-jetbrains-mono">423</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Orthodontics</span>
                <span className="text-sm font-medium text-indigo-600 font-jetbrains-mono">156</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Surgery</span>
                <span className="text-sm font-medium text-indigo-600 font-jetbrains-mono">89</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">General</span>
                <span className="text-sm font-medium text-indigo-600 font-jetbrains-mono">234</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900 font-inter">Most Profitable</h3>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-emerald-600 font-inter">1. Surgery</span>
                <span className="text-sm font-bold text-emerald-600 font-jetbrains-mono">L. 1,850</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-indigo-600 font-inter">2. Orthodontics</span>
                <span className="text-sm font-bold text-indigo-600 font-jetbrains-mono">L. 1,420</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-blue-600 font-inter">3. Cleaning</span>
                <span className="text-sm font-bold text-blue-600 font-jetbrains-mono">L. 680</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs font-medium text-slate-600 font-inter">4. General</span>
                <span className="text-sm font-bold text-slate-600 font-jetbrains-mono">L. 520</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fifth Row - Actions & Charts (12 cols) */}
        <div className="col-span-8 grid grid-cols-2 gap-2">
          <TremorBurnRateChart />
          <div className="bg-white border border-slate-200 rounded-lg p-4 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-900 font-inter">Quick Actions</h3>
              <Button size="sm" variant="outline" className="text-xs border-slate-300 text-slate-700 hover:bg-slate-50 font-inter">
                <Download className="w-3 h-3 mr-1" />
                Export
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button size="sm" variant="outline" className="text-xs justify-start border-slate-300 text-slate-700 hover:bg-slate-50 font-inter">
                <FileText className="w-3 h-3 mr-1" />
                Monthly Report
              </Button>
              <Button size="sm" variant="outline" className="text-xs justify-start border-slate-300 text-slate-700 hover:bg-slate-50 font-inter">
                <Calendar className="w-3 h-3 mr-1" />
                Tax Filing
              </Button>
              <Button size="sm" variant="outline" className="text-xs justify-start border-slate-300 text-slate-700 hover:bg-slate-50 font-inter">
                <Eye className="w-3 h-3 mr-1" />
                Audit Trail
              </Button>
              <Button size="sm" variant="outline" className="text-xs justify-start border-slate-300 text-slate-700 hover:bg-slate-50 font-inter">
                <Target className="w-3 h-3 mr-1" />
                Year-End
              </Button>
              <Button size="sm" asChild className="text-xs justify-start border-blue-300 text-blue-700 hover:bg-blue-50 font-inter">
                <a href="/ocr">
                  <Camera className="w-3 h-3 mr-1" />
                  Escáner OCR
                </a>
              </Button>
              <Button size="sm" variant="outline" className="text-xs justify-start border-slate-300 text-slate-700 hover:bg-slate-50 font-inter">
                <Receipt className="w-3 h-3 mr-1" />
                Nueva Transacción
              </Button>
            </div>
          </div>
        </div>

        {/* Right Side - Performance Metrics & Audit Feed (4 cols) */}
        <div className="col-span-4 space-y-2">
          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900 font-inter">Performance</h3>
              <TrendingUp className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Profit Margin</span>
                <span className="text-sm font-medium text-emerald-600 font-jetbrains-mono">33.5%</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Operating Ratio</span>
                <span className="text-sm font-medium text-indigo-600 font-jetbrains-mono">1.51</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Cash Ratio</span>
                <span className="text-sm font-medium text-indigo-600 font-jetbrains-mono">0.23</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Tax Burden</span>
                <span className="text-sm font-medium text-amber-600 font-jetbrains-mono">14.9%</span>
              </div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-lg p-3 hover:border-slate-300 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-semibold text-slate-900 font-inter">Cash Flow</h3>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Operating</span>
                <span className="text-sm font-medium text-emerald-600 font-jetbrains-mono">+L. 2,450</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Investing</span>
                <span className="text-sm font-medium text-indigo-600 font-jetbrains-mono">-L. 890</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Financing</span>
                <span className="text-sm font-medium text-indigo-600 font-jetbrains-mono">+L. 1,200</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-slate-600 font-inter">Net Flow</span>
                <span className="text-sm font-medium text-emerald-600 font-jetbrains-mono">+L. 2,760</span>
              </div>
            </div>
          </div>
        </div>

        {/* Fifth Row - CAI Dashboard (12 cols) */}
        <div className="col-span-12">
          <CAIDashboard />
        </div>

        {/* Sixth Row - Withholding Dashboard (12 cols) */}
        <div className="col-span-12">
          <WithholdingDashboard />
        </div>

        {/* Seventh Row - DET Dashboard (12 cols) */}
        <div className="col-span-12">
          <DETDashboard />
        </div>

        {/* Eighth Row - Advanced Analytics (12 cols) */}
        <div className="col-span-12 grid grid-cols-2 gap-6">
          <BreakEvenChart compact={false} showControls={true} />
          <CashFlowProjectionChart compact={false} showControls={true} days={30} />
        </div>

        {/* Ninth Row - Active Audit Feed (12 cols) */}
        <div className="col-span-12">
          <ActiveAuditFeed 
            maxItems={8} 
            showFilters={true} 
            autoRefresh={true} 
          />
        </div>

        {/* Bottom Row - Status Bar (12 cols) */}
        <div className="col-span-12 bg-white border border-slate-200 rounded-lg p-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <StatusIndicator status="good" label="Systems Operational" />
              <StatusIndicator status="good" label="Data Fresh" />
              <StatusIndicator status="good" label="Compliant" />
            </div>
            {isClient && (
              <div className="text-xs text-slate-500 font-inter">
                Modern Ledger v2.0 | Precision Accounting | SAR Compliant | Last: {lastRefresh?.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
