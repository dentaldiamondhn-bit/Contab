"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  BarChart3,
  PieChart,
  Calendar,
  Search,
  Download,
  FileText,
  Target,
  Activity,
  Users,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface FinancialReportsProps {
  tenantId: string;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalExpenses: number;
  netIncome: number;
  grossProfit: number;
  operatingMargin: number;
  profitMargin: number;
  currentRatio: number;
  debtToEquity: number;
  returnOnAssets: number;
  assetTurnover: number;
}

interface RevenueExpense {
  category: string;
  amount: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
}

interface TopExpense {
  category: string;
  amount: number;
  percentage: number;
  count: number;
}

interface CashFlowAnalysis {
  period: string;
  operatingCashFlow: number;
  investingCashFlow: number;
  financingCashFlow: number;
  netCashFlow: number;
  beginningCash: number;
  endingCash: number;
}

interface AccountTotal {
  id: string;
  code: string;
  name: string;
  type: string;
  amount: number;
  count: number;
}

export default function FinancialReports({ tenantId }: FinancialReportsProps) {
  const [metrics, setMetrics] = useState<FinancialMetrics>({
    totalRevenue: 0,
    totalExpenses: 0,
    netIncome: 0,
    grossProfit: 0,
    operatingMargin: 0,
    profitMargin: 0,
    currentRatio: 0,
    debtToEquity: 0,
    returnOnAssets: 0,
    assetTurnover: 0
  });
  
  const [revenueExpenses, setRevenueExpenses] = useState<RevenueExpense[]>([]);
  const [topExpenses, setTopExpenses] = useState<TopExpense[]>([]);
  const [cashFlowAnalysis, setCashFlowAnalysis] = useState<CashFlowAnalysis[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'month' | 'quarter' | 'year'>('month');
  const [reportType, setReportType] = useState<'summary' | 'detailed' | 'trends'>('summary');

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadFinancialMetrics();
    loadRevenueExpenses();
    loadTopExpenses();
    loadCashFlowAnalysis();
  }, [tenantId, periodFilter]);

  const loadFinancialMetrics = async () => {
    try {
      // Establecer tenant context
      await supabase.rpc('set_tenant', { tenant_id: tenantId });

      // Calcular fechas del período
      const now = new Date();
      let startDate: Date;
      
      switch (periodFilter) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
      }

      // Cargar transacciones para cálculos
      const { data: transactions, error: transactionError } = await supabase
        .from('Transaction')
        .select('amount')
        .gte('date', startDate.toISOString().split('T')[0])
        .lte('date', now.toISOString().split('T')[0]);

      if (transactionError) throw transactionError;

      // Cargar asientos para ingresos y gastos
      const { data: journalEntries, error: journalError } = await supabase
        .from('JournalEntry')
        .select(`
          amount,
          Account:account(id, code, type)
        `)
        .gte('createdAt', startDate.toISOString().split('T')[0])
        .lte('createdAt', now.toISOString().split('T')[0]);

      if (journalError) throw journalError;

      // Calcular métricas financieras
      const revenueEntries = journalEntries.filter(entry => entry.Account?.type === 'REVENUE');
      const expenseEntries = journalEntries.filter(entry => entry.Account?.type === 'EXPENSE');

      const totalRevenue = revenueEntries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
      const totalExpenses = expenseEntries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
      const netIncome = totalRevenue - totalExpenses;
      const grossProfit = netIncome;
      const operatingMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

      // Calcular ratios financieros (simplificado)
      const currentAssets = totalRevenue * 0.5; // Estimación
      const currentLiabilities = totalExpenses * 0.3; // Estimación
      const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;
      const debtToEquity = currentAssets > 0 ? currentLiabilities / currentAssets : 0;
      const returnOnAssets = currentAssets > 0 ? netIncome / currentAssets : 0;
      const assetTurnover = currentAssets > 0 ? totalRevenue / currentAssets : 0;

      setMetrics({
        totalRevenue,
        totalExpenses,
        netIncome,
        grossProfit,
        operatingMargin,
        profitMargin,
        currentRatio,
        debtToEquity,
        returnOnAssets,
        assetTurnover
      });
    } catch (error: any) {
      console.error("Error loading financial metrics:", error);
      alert("Error al cargar métricas financieras");
    }
  };

  const loadRevenueExpenses = async () => {
    try {
      // Cargar datos de ingresos y gastos por categoría
      const { data: journalEntries, error } = await supabase
        .from('JournalEntry')
        .select(`
          amount,
          Account:account(id, code, name, type)
        `)
        .gte('createdAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);

      if (error) throw error;

      // Agrupar ingresos por categoría
      const revenueAccounts = journalEntries.filter(entry => entry.Account?.type === 'REVENUE');
      const revenueAccountTotals: Record<string, AccountTotal> = revenueAccounts.reduce((acc, entry) => {
        const accountKey = entry.Account?.code || 'UNKNOWN';
        const accountName = entry.Account?.name || 'Desconocido';
        
        if (!acc[accountKey]) {
          acc[accountKey] = {
            id: entry.Account?.id || '',
            code: accountKey,
            name: accountName,
            type: 'REVENUE',
            amount: 0,
            count: 0
          };
        }
        
        acc[accountKey].amount += Math.abs(entry.amount);
        acc[accountKey].count += 1;
        
        return acc;
      }, {});

      // Agrupar gastos por categoría
      const expenseAccounts = journalEntries.filter(entry => entry.Account?.type === 'EXPENSE');
      const expenseAccountTotals: Record<string, AccountTotal> = expenseAccounts.reduce((acc: Record<string, AccountTotal>, entry) => {
        const accountKey = entry.Account?.code || 'UNKNOWN';
        const accountName = entry.Account?.name || 'Desconocido';
        
        if (!acc[accountKey]) {
          acc[accountKey] = {
            id: entry.Account?.id || '',
            code: accountKey,
            name: accountName,
            type: 'EXPENSE',
            amount: 0,
            count: 0
          };
        }
        
        acc[accountKey].amount += Math.abs(entry.amount);
        acc[accountKey].count += 1;
        
        return acc;
      }, {});

      // Combinar todos los totales
      const allAccountTotals = { ...revenueAccountTotals, ...expenseAccountTotals };

      // Convertir a array y calcular porcentajes
      const total = Object.values(allAccountTotals).reduce((sum, account) => sum + account.amount, 0);
      
      const revenueData = Object.entries(allAccountTotals)
        .filter(([_, account]) => account.type === 'REVENUE')
        .map(([code, account]) => ({
          category: account.name,
          amount: account.amount,
          percentage: total > 0 ? (account.amount / total) * 100 : 0,
          trend: 'up' as 'up' | 'down' | 'stable'
        }));

      const expenseData = Object.entries(allAccountTotals)
        .filter(([_, account]) => account.type === 'EXPENSE')
        .map(([code, account]) => ({
          category: account.name,
          amount: account.amount,
          percentage: total > 0 ? (account.amount / total) * 100 : 0,
          trend: 'down' as 'up' | 'down' | 'stable'
        }));

      setRevenueExpenses([...revenueData, ...expenseData]);
    } catch (error: any) {
      console.error("Error loading revenue expenses:", error);
      alert("Error al cargar ingresos y gastos");
    }
  };

  const loadTopExpenses = async () => {
    try {
      // Cargar los gastos más altos
      const { data: journalEntries, error } = await supabase
        .from('JournalEntry')
        .select(`
          amount,
          Account:account(id, code, name),
          createdAt
        `)
        .gte('createdAt', new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().split('T')[0]);
        const accountKey = entry.Account?.code || 'UNKNOWN';
        const accountName = entry.Account?.name || 'Desconocido';
        
        if (!acc[accountKey]) {
          acc[accountKey] = {
            id: entry.Account?.id || '',
            code: accountKey,
            name: accountName,
            type: 'EXPENSE',
            amount: 0,
            count: 0
          };
        }
        
        acc[accountKey].amount += Math.abs(entry.amount);
        acc[accountKey].count += 1;
        
        return acc;
      }, {});

      // Convertir a array y ordenar por monto
      const topExpensesData = Object.entries(accountTotals)
        .map(([code, account]) => ({
          category: account.name,
          amount: account.amount,
          percentage: 0, // Se calculará después
          count: account.count
        }))
        .sort((a, b) => b.amount - a.amount)
        .slice(0, 10);

      // Calcular porcentajes
      const totalExpenses = topExpensesData.reduce((sum, expense) => sum + expense.amount, 0);
      const topExpensesWithPercentage = topExpensesData.map(expense => ({
        ...expense,
        percentage: totalExpenses > 0 ? (expense.amount / totalExpenses) * 100 : 0
      }));

      setTopExpenses(topExpensesWithPercentage);
    } catch (error: any) {
      console.error("Error loading top expenses:", error);
      alert("Error al cargar los gastos principales");
    }
  };

  const loadCashFlowAnalysis = async () => {
    try {
      // Cargar análisis de flujo de efectivo
      const now = new Date();
      const periods = [];
      
      // Generar datos para los últimos 6 meses
      for (let i = 5; i >= 0; i--) {
        const periodStart = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const periodEnd = new Date(now.getFullYear(), now.getMonth() - i, 0);
        
        const { data: transactions, error } = await supabase
          .from('Transaction')
          .select('amount')
          .gte('date', periodStart.toISOString().split('T')[0])
          .lte('date', periodEnd.toISOString().split('T')[0]);

        if (error) throw error;

        const periodTotal = transactions?.reduce((sum, transaction) => sum + transaction.amount, 0) || 0;
        
        periods.push({
          period: periodStart.toLocaleDateString('es-HN', { month: 'short', year: 'numeric' }),
          operatingCashFlow: periodTotal * 0.7, // Estimación
          investingCashFlow: -periodTotal * 0.1, // Estimación
          financingCashFlow: -periodTotal * 0.05, // Estimación
          netCashFlow: periodTotal * 0.55, // Estimación
          beginningCash: 100000 + (i * 5000), // Estimación
          endingCash: 100000 + ((i + 1) * 5000) // Estimación
        });
      }

      setCashFlowAnalysis(periods);
    } catch (error: any) {
      console.error("Error loading cash flow analysis:", error);
      alert("Error al cargar análisis de flujo de efectivo");
    }
  };

  const exportToCSV = () => {
    let csvContent = '';
    let headers: string[] = [];

    switch (reportType) {
      case 'summary':
        headers = ['Métrica', 'Valor', 'Descripción'];
        csvContent = [
          headers.join(','),
          ['Ingresos Totales', (metrics.totalRevenue / 100).toFixed(2), 'Suma de todos los ingresos del período'],
          ['Gastos Totales', (metrics.totalExpenses / 100).toFixed(2), 'Suma de todos los gastos del período'],
          ['Ingreso Neto', (metrics.netIncome / 100).toFixed(2), 'Ingresos menos gastos'],
          ['Margen Operativo', `${metrics.operatingMargin.toFixed(2)}%`, 'Porcentaje de ganancia sobre ingresos'],
          ['Margen de Utilidad', `${metrics.profitMargin.toFixed(2)}%`, 'Porcentaje de utilidad neta sobre ingresos'],
          ['Ratio Corriente', metrics.currentRatio.toFixed(2), 'Activos corrientes / Pasivos corrientes'],
          ['Deuda/Patrimonio', `${metrics.debtToEquity.toFixed(2)}%`, 'Relación deuda-patrimonio'],
          ['Retorno Activos', `${metrics.returnOnAssets.toFixed(2)}%`, 'Utilidad neta / Activos totales'],
          ['Rotación Activos', metrics.assetTurnover.toFixed(2), 'Ingresos / Activos totales']
        ].join('\n');
        break;

      case 'detailed':
        headers = ['Categoría', 'Tipo', 'Monto', 'Porcentaje', 'Tendencia'];
        csvContent = [
          headers.join(','),
          ...revenueExpenses.map(item => [
            item.category,
            item.amount > 0 ? 'Ingreso' : 'Gasto',
            (item.amount / 100).toFixed(2),
            `${item.percentage.toFixed(2)}%`,
            item.trend
          ])
        ].join('\n');
        break;

      case 'trends':
        headers = ['Período', 'Flujo Operativo', 'Flujo Inversión', 'Flujo Financiero', 'Flujo Neto'];
        csvContent = [
          headers.join(','),
          ...cashFlowAnalysis.map(analysis => [
            analysis.period,
            (analysis.operatingCashFlow / 100).toFixed(2),
            (analysis.investingCashFlow / 100).toFixed(2),
            (analysis.financingCashFlow / 100).toFixed(2),
            (analysis.netCashFlow / 100).toFixed(2)
          ])
        ].join('\n');
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `reportes_financieros_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando reportes financieros...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-purple-600" />
            Reportes Financieros
          </h2>
          <p className="text-gray-600">Análisis financiero y métricas de rendimiento</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Período</label>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as 'month' | 'quarter' | 'year')}
                className="w-full p-2 border rounded-md"
              >
                <option value="month">Mensual</option>
                <option value="quarter">Trimestral</option>
                <option value="year">Anual</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Reporte</label>
              <select
                value={reportType}
                onChange={(e) => setReportType(e.target.value as 'summary' | 'detailed' | 'trends')}
                className="w-full p-2 border rounded-md"
              >
                <option value="summary">Resumen Ejecutivo</option>
                <option value="detailed">Ingresos y Gastos</option>
                <option value="trends">Tendencias de Flujo</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Período Actual</label>
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-medium">
                  {periodFilter === 'month' ? 'Mensual' : 
                   periodFilter === 'quarter' ? 'Trimestral' : 'Anual'}
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Métricas Financieras */}
      <Card>
        <CardHeader>
          <CardTitle>Métricas Financieras</CardTitle>
          <CardDescription>
            Indicadores clave de rendimiento financiero
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  L. {(metrics.totalRevenue / 100).toFixed(2)}
                </div>
                <p className="text-xs text-gray-600">
                  Suma de ingresos del período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  L. {(metrics.totalExpenses / 100).toFixed(2)}
                </div>
                <p className="text-xs text-gray-600">
                  Suma de gastos del período
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingreso Neto</CardTitle>
                <DollarSign className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${metrics.netIncome >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  L. {(metrics.netIncome / 100).toFixed(2)}
                </div>
                <p className="text-xs text-gray-600">
                  Ingresos menos gastos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margen Operativo</CardTitle>
                <Target className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  {metrics.operatingMargin.toFixed(2)}%
                </div>
                <p className="text-xs text-gray-600">
                  Porcentaje de ganancia
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margen de Utilidad</CardTitle>
                <Activity className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {metrics.profitMargin.toFixed(2)}%
                </div>
                <p className="text-xs text-gray-600">
                  Utilidad neta sobre ingresos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ratio Corriente</CardTitle>
                <CheckCircle className="h-4 w-4 text-teal-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-teal-600">
                  {metrics.currentRatio.toFixed(2)}
                </div>
                <p className="text-xs text-gray-600">
                  Activos / Pasivos corrientes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Deuda/Patrimonio</CardTitle>
                <AlertTriangle className="h-4 w-4 text-yellow-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">
                  {metrics.debtToEquity.toFixed(2)}%
                </div>
                <p className="text-xs text-gray-600">
                  Relación deuda-patrimonio
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retorno Activos</CardTitle>
                <Users className="h-4 w-4 text-indigo-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-indigo-600">
                  {metrics.returnOnAssets.toFixed(2)}%
                </div>
                <p className="text-xs text-gray-600">
                  Utilidad neta / Activos totales
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Rotación Activos</CardTitle>
                <PieChart className="h-4 w-4 text-pink-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-pink-600">
                  {metrics.assetTurnover.toFixed(2)}
                </div>
                <p className="text-xs text-gray-600">
                  Ingresos / Activos totales
                </p>
              </CardContent>
            </Card>
          </div>
        </CardContent>
      </Card>

      {/* Ingresos y Gastos por Categoría */}
      <Card>
        <CardHeader>
          <CardTitle>Ingresos y Gastos por Categoría</CardTitle>
          <CardDescription>
            Desglose detallado de ingresos y gastos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-semibold text-green-600 mb-2">Ingresos</h4>
                <div className="space-y-2">
                  {revenueExpenses.filter(item => item.amount > 0).slice(0, 5).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-green-50 rounded">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-green-600 font-bold">
                        L. {(item.amount / 100).toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <h4 className="font-semibold text-red-600 mb-2">Gastos</h4>
                <div className="space-y-2">
                  {revenueExpenses.filter(item => item.amount < 0).slice(0, 5).map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-red-50 rounded">
                      <span className="font-medium">{item.category}</span>
                      <span className="text-red-600 font-bold">
                        L. {(Math.abs(item.amount) / 100).toFixed(2)}
                      </span>
                      <span className="text-sm text-gray-600">
                        {item.percentage.toFixed(1)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Top Gastos */}
      <Card>
        <CardHeader>
          <CardTitle>Principales Gastos</CardTitle>
          <CardDescription>
            Los 10 gastos más altos del período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Porcentaje
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Transacciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {topExpenses.map((expense, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      {expense.category}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-right text-sm font-medium text-red-600">
                      L. {(expense.amount / 100).toFixed(2)}
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-right text-sm">
                      {expense.percentage.toFixed(2)}%
                    </td>
                    <td className="border border-gray-200 px-4 py-3 text-right text-sm">
                      {expense.count}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Análisis de Flujo de Efectivo */}
      <Card>
        <CardHeader>
          <CardTitle>Análisis de Flujo de Efectivo</CardTitle>
          <CardDescription>
            Tendencias de flujo de efectivo por período
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Período
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flujo Operativo
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flujo Inversión
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flujo Financiero
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Flujo Neto
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cashFlowAnalysis.map((analysis, index) => (
                  <tr key={index} className="hover:bg-gray-50">
                    <td className="border border-gray-200 px-4 py-3 text-sm">
                      {analysis.period}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-right text-sm ${
                      analysis.operatingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      L. {(analysis.operatingCashFlow / 100).toFixed(2)}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-right text-sm ${
                      analysis.investingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      L. {(analysis.investingCashFlow / 100).toFixed(2)}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-right text-sm ${
                      analysis.financingCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      L. {(analysis.financingCashFlow / 100).toFixed(2)}
                    </td>
                    <td className={`border border-gray-200 px-4 py-3 text-right text-sm font-medium ${
                      analysis.netCashFlow >= 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      L. {(analysis.netCashFlow / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
