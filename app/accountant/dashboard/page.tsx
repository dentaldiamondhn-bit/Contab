"use client";

import { useTenant } from "@/lib/contexts/TenantContext";
import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  TrendingUp, 
  TrendingDown,
  DollarSign,
  FileText,
  BookOpen,
  FolderTree,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Activity
} from "lucide-react";
import Link from "next/link";

export default function AccountantDashboardPage() {
  const { currentTenant } = useTenant();
  const { user } = useUser();
  const router = useRouter();
  const [stats, setStats] = useState({
    transactions: 0,
    income: 0,
    expenses: 0,
    netProfit: 0
  });
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      const role = user.publicMetadata?.role || 
                   user.unsafeMetadata?.role || 
                   (user as any).privateMetadata?.role;
      
      if (role === 'SUPER_ADMIN') {
        router.replace('/admin/dashboard');
      } else if (role !== 'ACCOUNTANT') {
        router.replace('/dashboard');
      }
    }
  }, [user, router]);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!currentTenant) return;
      
      try {
        setLoading(true);
        
        const [transactionsRes, incomeRes, expensesRes] = await Promise.all([
          fetch(`/api/transactions?tenantId=${currentTenant.id}&limit=100`),
          fetch(`/api/transactions?tenantId=${currentTenant.id}&type=INCOME&month=current`),
          fetch(`/api/transactions?tenantId=${currentTenant.id}&type=EXPENSE&month=current`)
        ]);

        const transactionsData = await transactionsRes.json();
        const incomeData = await incomeRes.json();
        const expensesData = await expensesRes.json();

        const totalIncome = incomeData.transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;
        const totalExpenses = expensesData.transactions?.reduce((sum: number, t: any) => sum + (t.amount || 0), 0) || 0;

        setStats({
          transactions: transactionsData.transactions?.length || 0,
          income: totalIncome,
          expenses: totalExpenses,
          netProfit: totalIncome - totalExpenses
        });

        setRecentActivity(transactionsData.transactions?.slice(0, 5) || []);
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [currentTenant]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 0
    }).format(amount);
  };

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">Selecciona una Empresa</h3>
          <p className="text-gray-500">Por favor selecciona una empresa para ver el dashboard contable</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Resumen Contable</h2>
          <p className="text-gray-600">Vista general de la contabilidad del mes</p>
        </div>
        <Badge variant="outline" className="bg-green-50 text-green-700">
          {new Date().toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })}
        </Badge>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones del Mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.transactions}</div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Cargando...' : 'Transacciones registradas'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos del Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.income)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Cargando...' : 'Ingresos totales'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos del Mes</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(stats.expenses)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Cargando...' : 'Gastos totales'}
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            <DollarSign className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${stats.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.netProfit)}
            </div>
            <p className="text-xs text-muted-foreground">
              {loading ? 'Cargando...' : 'Ingresos - Gastos'}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>Accesos directos a funciones contables</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Link href="/accounting/books">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-cyan-50 hover:border-cyan-200">
                <BookOpen className="h-6 w-6 text-cyan-600" />
                <span className="text-sm">Nuevo Asiento</span>
              </Button>
            </Link>
            
            <Link href="/accounting/books">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-green-50 hover:border-green-200">
                <FileText className="h-6 w-6 text-green-600" />
                <span className="text-sm">Ver Libro Diario</span>
              </Button>
            </Link>
            
            <Link href="/accounting/catalog">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-purple-50 hover:border-purple-200">
                <FolderTree className="h-6 w-6 text-purple-600" />
                <span className="text-sm">Catálogo de Cuentas</span>
              </Button>
            </Link>
            
            <Link href="/reports">
              <Button variant="outline" className="w-full h-24 flex flex-col items-center justify-center gap-2 hover:bg-orange-50 hover:border-orange-200">
                <BarChart3 className="h-6 w-6 text-orange-600" />
                <span className="text-sm">Reportes</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Actividad Reciente
          </CardTitle>
          <CardDescription>Últimas transacciones registradas</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No hay actividad reciente</p>
            </div>
          ) : (
            <div className="space-y-4">
              {recentActivity.map((activity: any) => (
                <div key={activity.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      activity.type === 'INCOME' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {activity.type === 'INCOME' ? (
                        <ArrowUpRight className="h-4 w-4 text-green-600" />
                      ) : (
                        <ArrowDownRight className="h-4 w-4 text-red-600" />
                      )}
                    </div>
                    <div>
                      <p className="text-sm font-medium">{activity.description || 'Sin descripción'}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(activity.date || activity.createdAt).toLocaleDateString('es-HN')}
                      </p>
                    </div>
                  </div>
                  <span className={`text-sm font-medium ${
                    activity.type === 'INCOME' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {activity.type === 'INCOME' ? '+' : '-'}{formatCurrency(activity.amount || 0)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
