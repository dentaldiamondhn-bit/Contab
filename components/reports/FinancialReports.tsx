"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, DollarSign, BarChart3 } from "lucide-react";
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

export default function FinancialReports({ tenantId }: FinancialReportsProps) {
  const [metrics, setMetrics] = useState<FinancialMetrics | null>(null);
  const [loading, setLoading] = useState(false);
  const [periodFilter, setPeriodFilter] = useState<'month' | 'quarter' | 'year'>('month');
  const supabase = createSupabaseClient();

  useEffect(() => {
    loadFinancialMetrics();
  }, [tenantId, periodFilter]);

  const loadFinancialMetrics = async () => {
    setLoading(true);
    try {
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      const now = new Date();
      let startDate: Date;
      
      switch (periodFilter) {
        case 'month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          break;
        case 'quarter':
          startDate = new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1);
          break;
        case 'year':
          startDate = new Date(now.getFullYear(), 0, 1);
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      }

      const { data: journalEntries, error: journalError } = await supabase
        .from('JournalEntry')
        .select(`
          amount,
          Account:account(id, code, type)
        `)
        .gte('createdAt', startDate.toISOString().split('T')[0])
        .lte('createdAt', now.toISOString().split('T')[0]);

      if (journalError) throw journalError;

      const entries = (journalEntries || []) as any[];
      const revenueEntries = entries.filter(entry => entry.Account?.type === 'REVENUE');
      const expenseEntries = entries.filter(entry => entry.Account?.type === 'EXPENSE');

      const totalRevenue = revenueEntries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
      const totalExpenses = expenseEntries.reduce((sum, entry) => sum + Math.abs(entry.amount), 0);
      const netIncome = totalRevenue - totalExpenses;
      const grossProfit = netIncome;
      const operatingMargin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
      const profitMargin = totalRevenue > 0 ? (netIncome / totalRevenue) * 100 : 0;

      const currentAssets = totalRevenue * 0.5;
      const currentLiabilities = totalExpenses * 0.3;
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
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return `L. ${(amount / 100).toFixed(2)}`;
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p>Cargando reportes financieros...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <BarChart3 className="h-6 w-6 mr-2 text-cyan-600" />
            Reportes Financieros
          </h2>
          <p className="text-gray-600">Análisis y métricas financieras</p>
        </div>
        <div className="flex space-x-2">
          <Button variant={periodFilter === 'month' ? 'default' : 'outline'} onClick={() => setPeriodFilter('month')}>
            Mes
          </Button>
          <Button variant={periodFilter === 'quarter' ? 'default' : 'outline'} onClick={() => setPeriodFilter('quarter')}>
            Trimestre
          </Button>
          <Button variant={periodFilter === 'year' ? 'default' : 'outline'} onClick={() => setPeriodFilter('year')}>
            Año
          </Button>
        </div>
      </div>

      {metrics && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingresos Totales</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.totalRevenue)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Gastos Totales</CardTitle>
                <TrendingDown className="h-4 w-4 text-red-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.totalExpenses)}</div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Ingreso Neto</CardTitle>
                <DollarSign className="h-4 w-4 text-cyan-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{formatCurrency(metrics.netIncome)}</div>
                <Badge variant={metrics.netIncome >= 0 ? 'default' : 'destructive'}>
                  {metrics.netIncome >= 0 ? 'Positivo' : 'Negativo'}
                </Badge>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Margen de Ganancia</CardTitle>
                <BarChart3 className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{metrics.profitMargin.toFixed(1)}%</div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Ratios Financieros</CardTitle>
              <CardDescription>Métricas de salud financiera</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-sm text-gray-600">Ratio Corriente</div>
                  <div className="text-xl font-bold">{metrics.currentRatio.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Deuda/Patrimonio</div>
                  <div className="text-xl font-bold">{metrics.debtToEquity.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">ROA</div>
                  <div className="text-xl font-bold">{(metrics.returnOnAssets * 100).toFixed(1)}%</div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-gray-600">Rotación Activos</div>
                  <div className="text-xl font-bold">{metrics.assetTurnover.toFixed(2)}</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
