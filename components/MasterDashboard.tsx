"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useTenant } from '@/lib/contexts/TenantContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen, 
  Calculator, 
  FileText, 
  TrendingUp, 
  Calendar, 
  Download, 
  Upload,
  Shield,
  AlertCircle,
  CheckCircle2,
  DollarSign,
  Users,
  Receipt,
  BarChart
} from 'lucide-react';

interface DashboardStats {
  totalAccounts: number;
  totalTransactions: number;
  currentMonthTransactions: number;
  currentMonthTax: number;
  openMonths: number;
  closedMonths: number;
  totalRevenue: number;
  totalExpenses: number;
  pendingTaxAmount: number;
}

interface QuickAction {
  title: string;
  description: string;
  icon: React.ReactNode;
  href: string;
  color: string;
  module?: string;
}

const TRIAL_TRANSACTION_LIMIT = 50;

export default function MasterDashboard() {
  const { currentTenant } = useTenant();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState('');

  useEffect(() => {
    const now = new Date();
    setCurrentPeriod(now.toISOString().slice(0, 7)); // YYYY-MM format
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch('/api/dashboard/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (cents: number) => {
    return `L. ${(cents / 100).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}`;
  };

  const quickActions: QuickAction[] = [
    {
      title: 'New Transaction',
      description: 'Create journal entries with automated tax calculation',
      icon: <Receipt className="w-5 h-5" />,
      href: '/tax-helper',
      color: 'bg-cyan-500',
      module: 'ACCOUNTING',
    },
    {
      title: 'Trial Balance',
      description: 'Generate Balanza de Comprobación',
      icon: <Calculator className="w-5 h-5" />,
      href: '/trial-balance',
      color: 'bg-green-500',
      module: 'ACCOUNTING',
    },
    {
      title: 'Tax Report',
      description: 'Monthly SAR declaration (ISV)',
      icon: <FileText className="w-5 h-5" />,
      href: '/tax-reporting',
      color: 'bg-purple-500',
      module: 'REPORTS',
    },
    {
      title: 'Month Closing',
      description: 'Close books for current period',
      icon: <Calendar className="w-5 h-5" />,
      href: '/book-closing',
      color: 'bg-orange-500',
      module: 'ACCOUNTING',
    },
    {
      title: 'Import Data',
      description: 'Bulk import from Excel',
      icon: <Upload className="w-5 h-5" />,
      href: '/import',
      color: 'bg-cyan-500',
    },
    {
      title: 'Export Reports',
      description: 'PDF exports for official filing',
      icon: <Download className="w-5 h-5" />,
      href: '/export',
      color: 'bg-red-500',
      module: 'REPORTS',
    },
  ];

  const activeModules = (currentTenant as any)?.activeModules || [];
  const planId = (currentTenant as any)?.planid || 'BASIC';
  const planName = planId === 'PRO' ? 'Plan Empresarial' : 'Plan Emprendedor';
  const planPrice = planId === 'PRO' ? '950.00' : '450.00';
  
  const currentTransactions = stats?.currentMonthTransactions || 0;
  const isUsageLimitReached = planId === 'BASIC' && currentTransactions >= TRIAL_TRANSACTION_LIMIT;
  const usagePercentage = Math.min((currentTransactions / TRIAL_TRANSACTION_LIMIT) * 100, 100);
  
  const expirationDateStr = (currentTenant as any)?.expirationdate;
  let showReminder = false;
  let isExpired = false;
  let daysRemaining = -1;

  if (expirationDateStr) {
    const expirationDate = new Date(expirationDateStr);
    const today = new Date();
    const diffTime = expirationDate.getTime() - today.getTime();
    daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    isExpired = daysRemaining < 0;
    // Mostrar recordatorio preventivo solo si faltan 7 días o menos, pero aún no ha vencido
    showReminder = !isExpired && daysRemaining <= 7;
  }

  const filteredQuickActions = quickActions.filter(action => !action.module || activeModules.includes(action.module));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-gray-200 rounded w-1/4"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Accounting Dashboard</h1>
          <p className="text-gray-600 mt-1">
            Multi-Currency Double-Entry System with Automated Tax Compliance
          </p>
          <div className="flex items-center mt-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4 mr-1" />
            Current Period: {currentPeriod}
          </div>
        </div>

        {/* System Status */}
        <Card className="mb-6 bg-gradient-to-r from-cyan-50 to-cyan-50 border-cyan-200">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-4">
              <div className="p-3 bg-cyan-100 rounded-full">
                <Shield className="w-6 h-6 text-cyan-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900">System Status: Operational</h3>
                <p className="text-sm text-gray-600">
                  All modules active. Data integrity verified with BigInt precision.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm text-green-600 font-medium">All Systems OK</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Alerts */}
        {isExpired && (
          <Card className="mb-6 border-red-200 bg-red-50">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-red-100 rounded-full">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-red-900">
                      Suscripción vencida: <span className="font-bold">{planName}</span>
                    </p>
                    <p className="text-xs text-red-700">
                      Tu suscripción expiró hace {Math.abs(daysRemaining)} {Math.abs(daysRemaining) === 1 ? 'día' : 'días'}. Por favor, renueva tu plan para evitar la interrupción del servicio y seguir utilizando todas las funciones.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="destructive" asChild>
                  <Link href="/billing/subscriptions">Renovar Ahora</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {showReminder && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="py-4">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-amber-100 rounded-full">
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-amber-900">
                      Suscripción próxima a vencer: <span className="font-bold">{planName}</span> (Vence en {daysRemaining} {daysRemaining === 1 ? 'día' : 'días'})
                    </p>
                    <p className="text-xs text-amber-700">
                      Tu próximo cargo de <span className="font-semibold">L. {planPrice}</span> se procesará automáticamente en los próximos días.
                    </p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="bg-white border-amber-200 text-amber-700 hover:bg-amber-100" asChild>
                  <Link href="/billing/subscriptions">Ver Facturación</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {planId === 'BASIC' && (
          <Card className="mb-6">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <BarChart className="w-4 h-4 text-cyan-600" />
                Uso de Transacciones Mensuales
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex justify-between text-xs mb-1">
                <span>{currentTransactions} de {TRIAL_TRANSACTION_LIMIT} transacciones</span>
                <span className="font-bold">{Math.round(usagePercentage)}%</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2.5">
                <div 
                  className={`h-2.5 rounded-full transition-all ${usagePercentage > 90 ? 'bg-red-500' : 'bg-cyan-600'}`} 
                  style={{ width: `${usagePercentage}%` }}
                ></div>
              </div>
              {isUsageLimitReached && (
                <p className="text-xs text-red-600 mt-2 font-medium">
                  ⚠️ Has alcanzado el límite. Actualiza a PRO para transacciones ilimitadas.
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Key Metrics */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Chart of Accounts</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalAccounts}</div>
                <p className="text-xs text-muted-foreground">Active accounts</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Transactions</CardTitle>
                <Receipt className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalTransactions.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.currentMonthTransactions} this month
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">Revenue (MTD)</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(stats.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground">Month to date</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">ISV to Pay</CardTitle>
                <DollarSign className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {formatCurrency(stats.currentMonthTax)}
                </div>
                <p className="text-xs text-muted-foreground">Current period</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions Grid */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredQuickActions.map((action, index) => (
              <Link key={index} href={planId === 'BASIC' && action.module === 'REPORTS' ? '#' : action.href}>
                <Card className={`hover:shadow-md transition-shadow cursor-pointer h-full ${planId === 'BASIC' && action.module === 'REPORTS' ? 'opacity-75' : ''}`}>
                  <CardContent className="p-6 relative">
                    {planId === 'BASIC' && action.module === 'REPORTS' && (
                      <Badge className="absolute top-2 right-2 bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
                        PRO
                      </Badge>
                    )}
                    <div className="flex items-start space-x-4">
                      <div className={`${action.color} p-3 rounded-lg text-white`}>
                        {action.icon}
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-gray-900">{action.title}</h3>
                        <p className="text-sm text-gray-600 mt-1">{action.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </div>

        {/* System Modules Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Core Accounting */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <BookOpen className="w-5 h-5" />
                <span>Core Accounting</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Double-Entry System</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">BigInt Precision</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Multi-Currency Support</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Automated Voucher Numbering</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Tax Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <FileText className="w-5 h-5" />
                <span>Tax Compliance (SAR)</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Automated ISV 15% Calculation</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Monthly SAR Reports</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Tax Configuration Linked to COA</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Patient Billing with Auto-Tax</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Reporting & Export */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Download className="w-5 h-5" />
                <span>Reporting & Export</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Trial Balance (Balanza)</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Monthly Pólizas (PDF)</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Year-End Closing Reports</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Excel Import/Export</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Audit & Security */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Audit & Security</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Complete Audit Trail</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Before/After Snapshots</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Period Locking</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
                <div className="flex items-center justify-between p-3 bg-gray-50 rounded">
                  <span className="text-sm">Data Integrity Checks</span>
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Professional Workflow Status */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Professional Accounting Workflow</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-cyan-50 rounded-lg">
                <div className="text-lg font-semibold text-cyan-700">1. Data Entry</div>
                <p className="text-sm text-gray-600 mt-1">Multi-currency transactions with auto-tax</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-lg font-semibold text-green-700">2. Trial Balance</div>
                <p className="text-sm text-gray-600 mt-1">Balanza de comprobación monthly</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-lg font-semibold text-purple-700">3. Tax Filing</div>
                <p className="text-sm text-gray-600 mt-1">SAR ISV declarations with PDF export</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <div className="text-lg font-semibold text-orange-700">4. Year Closing</div>
                <p className="text-sm text-gray-600 mt-1">Books closure with retained earnings</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
