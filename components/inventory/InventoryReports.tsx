"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Download,
  Package,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  BarChart3,
  PieChart
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface InventoryReportsProps {
  tenantId: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  category: string;
  currentStock: number;
  minStock: number;
  unitCost: number;
  unitPrice: number;
}

interface InventoryStats {
  totalProducts: number;
  totalValue: number;
  lowStockItems: number;
  outOfStockItems: number;
  topCategories: Array<{
    name: string;
    count: number;
    value: number;
  }>;
  stockTurnover: number;
  deadStock: number;
}

export default function InventoryReports({ tenantId }: InventoryReportsProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [stats, setStats] = useState<InventoryStats>({
    totalProducts: 0,
    totalValue: 0,
    lowStockItems: 0,
    outOfStockItems: 0,
    topCategories: [],
    stockTurnover: 0,
    deadStock: 0
  });
  const [loading, setLoading] = useState(false);
  const [reportType, setReportType] = useState<'summary' | 'valuation' | 'turnover'>('summary');

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadInventoryData();
  }, [tenantId]);

  const loadInventoryData = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      // Cargar productos
      const { data, error } = await supabase
        .from('Product')
        .select('*')
        .eq('isActive', true)
        .order('name');

      if (error) throw error;

      const productList = (data || []) as any[];
      setProducts(productList);

      // Calcular estadísticas
      const totalProducts = productList.length;
      const totalValue = productList.reduce((sum: number, product: any) => sum + (product.currentStock * product.unitCost), 0);
      const lowStockItems = productList.filter((product: any) => product.currentStock <= product.minStock && product.currentStock > 0).length;
      const outOfStockItems = productList.filter((product: any) => product.currentStock === 0).length;

      // Top categorías
      const categoryStats = productList.reduce((acc: any, product: any) => {
        if (!acc[product.category]) {
          acc[product.category] = { count: 0, value: 0 };
        }
        acc[product.category].count += 1;
        acc[product.category].value += product.currentStock * product.unitCost;
        return acc;
      }, {} as Record<string, { count: number; value: number }>);

      const topCategories = Object.entries(categoryStats)
        .map(([category, stats]: [string, any]) => ({
          name: category,
          count: stats.count,
          value: stats.value
        }))
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);

      // Calcular rotación de inventario (simplificado)
      const avgInventoryValue = totalValue / 12; // Promedio mensual
      const stockTurnover = avgInventoryValue > 0 ? (totalValue / avgInventoryValue) : 0;

      // Stock muerto (sin movimiento en 90 días - simplificado)
      const deadStock = productList.filter(product => {
        // Lógica simplificada: productos con stock alto y rotación baja
        return product.currentStock > product.minStock * 2 && product.unitPrice < product.unitCost * 1.5;
      }).length;

      setStats({
        totalProducts,
        totalValue,
        lowStockItems,
        outOfStockItems,
        topCategories,
        stockTurnover,
        deadStock
      });
    } catch (error: any) {
      console.error("Error loading inventory data:", error);
      alert("Error al cargar datos de inventario");
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    let csvContent = '';
    let headers: string[] = [];

    switch (reportType) {
      case 'summary':
        headers = ['Código', 'Producto', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Costo Unitario', 'Valor Total', 'Estado'];
        csvContent = [
          headers.join(','),
          ...products.map(product => [
            product.code,
            product.name,
            product.category,
            product.currentStock.toString(),
            product.minStock.toString(),
            (product.unitCost / 100).toFixed(2),
            ((product.currentStock * product.unitCost) / 100).toFixed(2),
            product.currentStock === 0 ? 'Sin Stock' : 
            product.currentStock <= product.minStock ? 'Stock Bajo' : 'Normal'
          ])
        ].join('\n');
        break;

      case 'valuation':
        headers = ['Categoría', 'Cantidad Productos', 'Valor Total Inventario', 'Porcentaje del Total'];
        const categoryData = products.reduce((acc, product) => {
          if (!acc[product.category]) {
            acc[product.category] = { count: 0, value: 0 };
          }
          acc[product.category].count += 1;
          acc[product.category].value += product.currentStock * product.unitCost;
          return acc;
        }, {} as Record<string, { count: number; value: number }>);

        csvContent = [
          headers.join(','),
          ...Object.entries(categoryData).map(([category, data]) => [
            category,
            data.count.toString(),
            (data.value / 100).toFixed(2),
            ((data.value / stats.totalValue) * 100).toFixed(2) + '%'
          ])
        ].join('\n');
        break;

      case 'turnover':
        headers = ['Producto', 'Stock Actual', 'Costo Unitario', 'Valor Total', 'Rotación', 'Recomendación'];
        csvContent = [
          headers.join(','),
          ...products.map(product => {
            const turnoverRate = product.unitCost > 0 ? (product.unitPrice / product.unitCost) : 0;
            const recommendation = product.currentStock === 0 ? 'Reabastecer urgente' :
                                 product.currentStock <= product.minStock ? 'Reabastecer pronto' :
                                 turnoverRate < 1.2 ? 'Reducir stock' :
                                 turnoverRate > 2 ? 'Aumentar precio' : 'Optimal';
            
            return [
              product.name,
              product.currentStock.toString(),
              (product.unitCost / 100).toFixed(2),
              ((product.currentStock * product.unitCost) / 100).toFixed(2),
              turnoverRate.toFixed(2),
              recommendation
            ];
          })
        ].join('\n');
        break;
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inventario_${reportType}_${new Date().toISOString().split('T')[0]}.csv`);
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
            <p>Cargando reportes de inventario...</p>
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
            Reportes de Inventario
          </h2>
          <p className="text-gray-600">Análisis y valoración de existencias</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant={reportType === 'summary' ? 'default' : 'outline'}
            onClick={() => setReportType('summary')}
          >
            Resumen
          </Button>
          <Button
            variant={reportType === 'valuation' ? 'default' : 'outline'}
            onClick={() => setReportType('valuation')}
          >
            Valoración
          </Button>
          <Button
            variant={reportType === 'turnover' ? 'default' : 'outline'}
            onClick={() => setReportType('turnover')}
          >
            Rotación
          </Button>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* KPIs Principales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.totalProducts}
            </div>
            <p className="text-xs text-gray-600">
              Productos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor del Inventario</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              L. {(stats.totalValue / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Valor total en existencia
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
              {stats.lowStockItems}
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
              {stats.outOfStockItems}
            </div>
            <p className="text-xs text-gray-600">
              Agotados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* KPIs Secundarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotación de Inventario</CardTitle>
            <PieChart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.stockTurnover.toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Veces al año
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Muerto</CardTitle>
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {stats.deadStock}
            </div>
            <p className="text-xs text-gray-600">
              Productos sin rotación
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficiencia</CardTitle>
            <BarChart3 className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-600">
              {stats.stockTurnover > 4 ? 'Alta' : 
               stats.stockTurnover > 2 ? 'Media' : 'Baja'}
            </div>
            <p className="text-xs text-gray-600">
              Basado en rotación
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reportes Detallados */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Categorías */}
        <Card>
          <CardHeader>
            <CardTitle>Top Categorías por Valor</CardTitle>
            <CardDescription>
              Categorías con mayor valor en inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {stats.topCategories.length === 0 ? (
                <p className="text-gray-500 text-center py-4">
                  No hay datos de categorías
                </p>
              ) : (
                stats.topCategories.map((category, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{category.name}</div>
                      <div className="text-sm text-gray-600">
                        {category.count} productos
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-blue-600">
                        L. {(category.value / 100).toFixed(2)}
                      </div>
                      <div className="text-sm text-gray-600">
                        {((category.value / stats.totalValue) * 100).toFixed(1)}% del total
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* Análisis de Stock */}
        <Card>
          <CardHeader>
            <CardTitle>Análisis de Stock</CardTitle>
            <CardDescription>
              Distribución del estado de inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Productos con Stock Normal</span>
                <Badge className="bg-green-100 text-green-800">
                  {products.length - stats.lowStockItems - stats.outOfStockItems}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Productos con Stock Bajo</span>
                <Badge className="bg-orange-100 text-orange-800">
                  {stats.lowStockItems}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Productos sin Stock</span>
                <Badge className="bg-red-100 text-red-800">
                  {stats.outOfStockItems}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tasa de Agotamiento</span>
                <span className="text-sm font-medium">
                  {stats.totalProducts > 0 ? ((stats.outOfStockItems / stats.totalProducts) * 100).toFixed(1) : '0.0'}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recomendaciones */}
      <Card>
        <CardHeader>
          <CardTitle>Recomendaciones de Gestión</CardTitle>
          <CardDescription>
            Sugerencias basadas en el análisis del inventario
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-semibold mb-3 text-blue-700">Acciones Inmediatas</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {stats.outOfStockItems > 0 && (
                  <li className="flex items-start">
                    <AlertTriangle className="h-4 w-4 mr-2 text-red-500 mt-0.5" />
                    <span>Reabastecer {stats.outOfStockItems} productos sin stock</span>
                  </li>
                )}
                {stats.lowStockItems > 0 && (
                  <li className="flex items-start">
                    <AlertTriangle className="h-4 w-4 mr-2 text-orange-500 mt-0.5" />
                    <span>Monitorear {stats.lowStockItems} productos con stock bajo</span>
                  </li>
                )}
                {stats.deadStock > 0 && (
                  <li className="flex items-start">
                    <AlertTriangle className="h-4 w-4 mr-2 text-yellow-500 mt-0.5" />
                    <span>Revisar {stats.deadStock} productos con posible obsolescencia</span>
                  </li>
                )}
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-3 text-green-700">Optimización</h4>
              <ul className="space-y-2 text-sm text-gray-600">
                {stats.stockTurnover < 2 && (
                  <li className="flex items-start">
                    <TrendingUp className="h-4 w-4 mr-2 text-blue-500 mt-0.5" />
                    <span>Implementar programa de reducción de inventario</span>
                  </li>
                )}
                {stats.stockTurnover > 4 && (
                  <li className="flex items-start">
                    <TrendingUp className="h-4 w-4 mr-2 text-green-500 mt-0.5" />
                    <span>Aumentar niveles de stock para evitar faltantes</span>
                  </li>
                )}
                {stats.totalValue > 1000000 && (
                  <li className="flex items-start">
                    <Package className="h-4 w-4 mr-2 text-purple-500 mt-0.5" />
                    <span>Considerar seguro de inventario para productos de alto valor</span>
                  </li>
                )}
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
