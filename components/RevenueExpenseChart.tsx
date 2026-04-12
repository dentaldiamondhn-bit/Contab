import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import { Suspense } from "react";

interface MonthlyData {
  month: string;
  monthKey: string;
  revenue: number;
  expenses: number;
}

interface RevenueExpenseChartProps {
  data: MonthlyData[];
}

function RevenueExpenseChart({ data }: RevenueExpenseChartProps) {
  // Calculate totals for the period
  const totalRevenue = data.reduce((sum, item) => sum + item.revenue, 0);
  const totalExpenses = data.reduce((sum, item) => sum + item.expenses, 0);
  const netProfit = totalRevenue - totalExpenses;

  // Find max value for scaling
  const maxValue = Math.max(...data.map(item => Math.max(item.revenue, item.expenses)));
  
  return (
    <Card className="col-span-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Tendencia de Ingresos vs Gastos</span>
          <div className="flex gap-4 text-sm font-normal">
            <span className="text-green-600">
              Ingresos: {formatCurrency(totalRevenue)}
            </span>
            <span className="text-red-600">
              Gastos: {formatCurrency(totalExpenses)}
            </span>
            <span className={netProfit >= 0 ? "text-emerald-700" : "text-red-700"}>
              Neto: {formatCurrency(netProfit)}
            </span>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-80">
          {/* Simple CSS-based chart */}
          <div className="h-full flex items-end justify-between gap-2 px-4">
            {data.map((item, index) => {
              const revenueHeight = maxValue > 0 ? (item.revenue / maxValue) * 100 : 0;
              const expensesHeight = maxValue > 0 ? (item.expenses / maxValue) * 100 : 0;
              
              return (
                <div key={item.monthKey} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-xs text-gray-600 mb-2 text-center">
                    {item.month.split(' ')[0]}
                  </div>
                  <div className="w-full flex gap-1 items-end" style={{ height: '200px' }}>
                    <div
                      className="flex-1 bg-green-500 rounded-t transition-all duration-300 hover:bg-green-600"
                      style={{ height: `${revenueHeight}%` }}
                      title={`Ingresos: ${formatCurrency(item.revenue)}`}
                    />
                    <div
                      className="flex-1 bg-red-500 rounded-t transition-all duration-300 hover:bg-red-600"
                      style={{ height: `${expensesHeight}%` }}
                      title={`Gastos: ${formatCurrency(item.expenses)}`}
                    />
                  </div>
                  <div className="text-xs text-gray-500 text-center">
                    {item.month.split(' ')[1]}
                  </div>
                </div>
              );
            })}
          </div>
          
          {/* Legend */}
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-600">Ingresos</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-sm text-gray-600">Gastos</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Loading fallback component
function RevenueExpenseChartSkeleton() {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="h-6 w-48 bg-gray-200 rounded animate-pulse"></div>
      </CardHeader>
      <CardContent>
        <div className="h-80 bg-gray-100 rounded animate-pulse"></div>
      </CardContent>
    </Card>
  );
}

// Wrapped component with Suspense boundary
export function RevenueExpenseChartWithSuspense(props: RevenueExpenseChartProps) {
  return (
    <Suspense fallback={<RevenueExpenseChartSkeleton />}>
      <RevenueExpenseChart {...props} />
    </Suspense>
  );
}
