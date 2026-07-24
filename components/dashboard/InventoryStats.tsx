"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
import { 
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  ShoppingCart,
  Truck,
  DollarSign,
  BarChart3
} from "lucide-react";

interface InventoryStats {
  totalProducts: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  totalInventoryValue: number;
  totalStockValue: number;
  categories: Array<{
    name: string;
    productCount: number;
    totalValue: number;
    stockLevel: number;
  }>;
  recentMovements: Array<{
    id: string;
    productName: string;
    type: 'IN' | 'OUT';
    quantity: number;
    unitCost: number;
    totalCost: number;
    date: string;
    reference: string;
  }>;
  monthlyStats: {
    currentMonthValue: number;
    previousMonthValue: number;
    growth: number;
  };
}

interface InventoryStatsProps {
  tenantId: string;
}

export default function InventoryStats({ tenantId }: InventoryStatsProps) {
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    activeProducts: 0,
    lowStockProducts: 0,
    outOfStockProducts: 0,
    totalInventoryValue: 0,
    totalStockValue: 0,
    categories: [],
    recentMovements: [],
    monthlyStats: {
      currentMonthValue: 0,
      previousMonthValue: 0,
      growth: 0
    }
  });
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState<'month' | 'quarter' | 'year'>('month');

  useEffect(() => {
    loadInventoryStats();
  }, [tenantId, period]);

  const loadInventoryStats = async () => {
    setLoading(true);
    try {
      console.log('Client: Loading inventory stats for tenant:', tenantId, 'period:', period);
      
      const response = await fetch(
        `/api/dashboard/inventory-stats?tenantId=${tenantId}&period=${period}`
      );
      
      console.log('Client: Inventory response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Client: Inventory API Error:', errorText);
        throw new Error(`Failed to fetch inventory stats: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Client: Received inventory data:', data);
      setStats(data);
    } catch (error) {
      console.error("Error loading inventory stats:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 2
    }).format(amount / 100);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('es-HN').format(num);
  };

  const getStockLevelColor = (level: number) => {
    if (level <= 20) return 'text-red-600 bg-red-50';
    if (level <= 50) return 'text-orange-600 bg-orange-50';
    return 'text-green-600 bg-green-50';
  };

  const getStockLevelText = (level: number) => {
    if (level <= 20) return 'Crítico';
    if (level <= 50) return 'Bajo';
    return 'Normal';
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-gray-200 rounded mb-2"></div>
                <div className="h-8 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Estadísticas de Inventario</h2>
          <p className="text-gray-600">Resumen completo de productos y movimientos</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={period === 'month' ? 'default' : 'outline'}
            onClick={() => setPeriod('month')}
            size="sm"
          >
            Mes
          </Button>
          <Button
            variant={period === 'quarter' ? 'default' : 'outline'}
            onClick={() => setPeriod('quarter')}
            size="sm"
          >
            Trimestre
          </Button>
          <Button
            variant={period === 'year' ? 'default' : 'outline'}
            onClick={() => setPeriod('year')}
            size="sm"
          >
            Año
          </Button>
        </div>
      </div>

      {/* Tarjetas principales de productos */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {formatNumber(stats.totalProducts)}
            </div>
            <p className="text-xs text-gray-600">
              {formatNumber(stats.activeProducts)} activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {formatNumber(stats.lowStockProducts)}
            </div>
            <p className="text-xs text-gray-600">
              Necesitan reabastecimiento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sin Stock</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatNumber(stats.outOfStockProducts)}
            </div>
            <p className="text-xs text-gray-600">
              Agotados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(stats.totalInventoryValue)}
            </div>
            <p className="text-xs text-gray-600">
              Valor del inventario
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Estadísticas financieras */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor en Stock</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(stats.totalStockValue)}
            </div>
            <p className="text-xs text-gray-600">
              Costo del inventario actual
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Crecimiento Mensual</CardTitle>
            {stats.monthlyStats.growth >= 0 ? (
              <TrendingUp className="h-4 w-4 text-green-600" />
            ) : (
              <TrendingDown className="h-4 w-4 text-red-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${
              stats.monthlyStats.growth >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {stats.monthlyStats.growth >= 0 ? '+' : ''}{stats.monthlyStats.growth.toFixed(1)}%
            </div>
            <p className="text-xs text-gray-600">
              vs. mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotación</CardTitle>
            <ShoppingCart className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              0x
            </div>
            <p className="text-xs text-gray-600">
              Veces por año
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Categorías */}
        <Card>
          <CardHeader>
            <CardTitle>Productos por Categoría</CardTitle>
            <CardDescription>
              Distribución y valor por categoría
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {stats.categories.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay datos de categorías
                </p>
              ) : (
                stats.categories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-white rounded-lg">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium">{category.name}</div>
                        <div className="text-sm text-gray-600">
                          {formatNumber(category.productCount)} productos
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">
                        {formatCurrency(category.totalValue)}
                      </div>
                      <Badge className={`text-xs ${getStockLevelColor(category.stockLevel)}`}>
                        {getStockLevelText(category.stockLevel)}
                      </Badge>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Movimientos Recientes */}
        <Card>
          <CardHeader>
            <CardTitle>Movimientos Recientes</CardTitle>
            <CardDescription>
              Últimas entradas y salidas de inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.recentMovements.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay movimientos recientes
                </p>
              ) : (
                stats.recentMovements.map((movement) => (
                  <div key={movement.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className={`p-2 rounded-lg ${
                        movement.type === 'IN' ? 'bg-green-100' : 'bg-red-100'
                      }`}>
                        {movement.type === 'IN' ? (
                          <Truck className="h-4 w-4 text-green-600" />
                        ) : (
                          <ShoppingCart className="h-4 w-4 text-red-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-medium">{movement.productName}</div>
                        <div className="text-sm text-gray-600">
                          {movement.reference}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(movement.date).toLocaleDateString('es-HN')}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className={`font-bold ${
                        movement.type === 'IN' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {movement.type === 'IN' ? '+' : '-'}{formatNumber(movement.quantity)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {formatCurrency(movement.totalCost)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
