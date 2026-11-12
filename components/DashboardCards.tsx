import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, TrendingUp, Wallet, ArrowDown } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { Suspense } from "react";

interface FinancialSummary {
  totalRevenue: number;
  totalExpenses: number;
  cashOnHand: number;
  netProfit: number;
}

// Original component
function DashboardCards({ data }: { data: FinancialSummary }) {
  const stats = [
    { title: "Efectivo Disponible", value: data.cashOnHand, icon: Wallet, color: "text-cyan-600" },
    { title: "Ingresos Totales", value: data.totalRevenue, icon: TrendingUp, color: "text-green-600" },
    { title: "Gastos", value: data.totalExpenses, icon: ArrowDown, color: "text-red-600" },
    { title: "Beneficio Neto", value: data.netProfit, icon: DollarSign, color: "text-emerald-700" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <Card key={stat.title}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">{stat.title}</CardTitle>
            <stat.icon className={`h-4 w-4 ${stat.color}`} />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(stat.value)}</div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Loading fallback component
function DashboardCardsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <div className="h-4 w-20 bg-gray-200 rounded animate-pulse"></div>
            <div className="h-4 w-4 bg-gray-200 rounded animate-pulse"></div>
          </CardHeader>
          <CardContent>
            <div className="h-8 w-24 bg-gray-200 rounded animate-pulse"></div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

// Wrapped component with Suspense boundary
export function DashboardCardsWithSuspense(props: { data: FinancialSummary }) {
  return (
    <Suspense fallback={<DashboardCardsSkeleton />}>
      <DashboardCards {...props} />
    </Suspense>
  );
}