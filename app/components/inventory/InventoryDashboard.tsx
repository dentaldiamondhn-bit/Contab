'use client';

import { useParams, useEffect, useState } from 'next/navigation';
import { useSearchParams, usePathname } from 'next/navigation';
import axios from 'axios';
import { Chart, LineElement, PointElement, CategoryScale, LinearScale, Tooltip, Filler } from 'react-chartjs-2';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { useForm } from 'react-hook-form';
import { useAirtable } from '@/hooks/use-airtable';
import { useToast } from '@/components/ui/use-toast';

import { demandaForecast } from '@/app/api/inventory/demand-forecast/route';
import { calcularValorFIFO, calcularValorLIFO, calcularValorPromedio } from '@/lib/services/inventory-valuation';

const productTypes = ['consumible', 'equipment', 'servicio', 'mercancia'];
const warehouseOptions = ['Principal', 'Almacen 1', 'Almacen 2', 'Todos'];

export default function InventoryDashboard({ companyId }: { companyId?: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchParams] = useSearchParams();
  const company_id = companyId || searchParams.get('companyId') || '';

  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setHours(0, 0, 0, 0)).toISOString().slice(0, 10),
    end: new Date().toISOString().slice(0, 10),
  });

  const [selectedWarehouse, setSelectedWarehouse] = useState('Todos');
  const [showFilters, setShowFilters] = useState(false);

  const [forecastData, setForecastData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: userData, isLoading } = useAirtable();

  // Estado de valoración de inventario
  const [valorationMethod, setValorationMethod] = useState<'fifo' | 'lifo' | 'average'>('fifo');
  const [valorationData, setValorationData] = useState<{
    costoCogs: number;
    valorInventarioFinal: number;
    costoUnitario: number;
    cantidadVendida: number;
    cantidadQued: number;
    metodo: string;
  } | null>(null);
  const [valorationLoading, setValorationLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  // Fetch demand forecast data
  useEffect(() => {
    const fetchForecast = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          startDate: dateRange.start,
          endDate: dateRange.end,
        });
        if (selectedWarehouse && selectedWarehouse !== 'Todos') {
          params.append('warehouseId', selectedWarehouse);
        }
        if (company_id) {
          params.append('companyId', company_id);
        }

        const response = await axios.get(
          `/api/inventory/demand-forecast?${params.toString()}`,
          {
            headers: {
              'x-tenant-id': userData?.tenantId || '',
            },
          }
        );

        setForecastData(response.data.forecast || []);
        setForecastData(prev => [...prev]); // force update
        setError(null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Error al cargar el pronóstico');
        setForecastData([]);
      } finally {
        setLoading(false);
      }
    };

    fetchForecast();
  }, [dateRange, selectedWarehouse, company_id, userData?.tenantId]);

  // Fetch valuation data
  useEffect(() => {
    const fetchValoration = async () => {
      if (!dateRange.start || !dateRange.end) return;
      setValorationLoading(true);
      setValorationData(null);
      try {
        const response = await axios.get(
          `/api/inventory/valuation?productId=&fechaInicial=${dateRange.start}&fechaFinal=${dateRange.end}&method=${valorationMethod}`
        );
        setValorationData(response.data);
      } catch (err: any) {
        setValorationData(null);
        setToast({
          variant: "destructive",
          title: "Error",
          description: err.response?.data?.message || "Error al cargar valoración",
        });
      } finally {
        setValorationLoading(false);
      }
    };

    fetchValoration();
  }, [dateRange, valorationMethod, userData?.tenantId]);

  // Calculate summary stats
  const totalProducts = forecastData.length;
  const criticalStock = forecastData.filter(
    (f: any) => f.current_stock <= (f.min_stock ?? 0) && f.high_turnover
  ).length;
  const highTurnoverLowStock = forecastData.filter(
    (f: any) => f.high_turnover && f.current_stock < (f.suggested_stock ?? 0)
  ).length;
  const totalProjectedDemand = forecastData.reduce(
    (sum: number, f: any) => sum + (f.projected_demand_30d || 0),
    0
  );

  // Products by stock status
  const stockStatusCounts = {
    optimal: forecastData.filter((f: any) => f.stock_status === 'optimal').length,
    low: forecastData.filter((f: any) => f.stock_status === 'low').length,
    critical: forecastData.filter(
      (f: any) => f.current_stock <= (f.min_stock ?? 0)
    ).length,
  };

  return (
    <div className="container mx-auto p-6">
      {/* Header with filters */}
      <div className="mb-6">
        <Card>
          <CardHeader className="flex flex-col space-y-2">
            <CardTitle>
              <h2 className="text-2xl font-bold text-gray-900">
                Dashboard de Inventario
              </h2>
              <p className="text-sm text-gray-500">
                Pronóstico de demanda y niveles de stock
              </p>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* Filters section */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Período
                </label>
                <div className="relative">
                  <Input
                    placeholder="MM/DD/AAAA"
                    value={dateRange.start}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        start: e.target.value || new Date(new Date().setHours(0, 0, 0, 0))
                          .toISOString()
                          .slice(0, 10),
                      }))
                    }
                    disabled={isLoading}
                  />
                  <Input
                    placeholder="MM/DD/AAAA"
                    value={dateRange.end}
                    onChange={(e) =>
                      setDateRange((prev) => ({
                        ...prev,
                        end: e.target.value || new Date().toISOString().slice(0, 10),
                      }))
                    }
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Almacén
                </label>
                <Select onValueChange={setSelectedWarehouse} disabled={isLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccione un almacén" />
                    <SelectContent>
                      <SelectItem value="Todos">
                        <div className="flex items-center px-2 py-1 text-sm text-gray-500">
                          Todos
                        </div>
                      </SelectItem>
                      {warehouseOptions.map((warehouse) => (
                        <SelectItem key={warehouse} value={warehouse}>
                          <div className="flex items-center px-2 py-1 text-sm text-gray-700">
                            {warehouse}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </SelectTrigger>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Método de Valoración
                </label>
                <Select onValueChange={setValorationMethod} disabled={valorationLoading}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Seleccione método" />
                    <SelectContent>
                      <SelectItem value="fifo">FIFO</SelectItem>
                      <SelectItem value="lifo">LIFO</SelectItem>
                      <SelectItem value="average">Promedio Ponderado</SelectItem>
                    </SelectContent>
                  </SelectTrigger>
                </Select>
                {valorationLoading && <p className="text-xs text-gray-500 mt-2">Calculando...</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Empresa
                </label>
                <Input
                  value={company_id || 'SELECCIONAR'}
                  onChange={(e) => router.push(`/?companyId=${e.target.value}`)}
                  disabled={isLoading}
                  placeholder="ID de empresa"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1"></label>
                <Button
                  onClick={() => setShowFilters(!showFilters)}
                  disabled={isLoading}
                  variant="secondary"
                  className="w-full">
                  {showFilters ? 'Ocultar filtros' : 'Mostrar filtros'}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 pt-4">
        <Card className="h-full">
          <CardHeader>
            <CardTitle>Productos Totales</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-gray-900">{totalProducts}</p>
            <p className="text-sm text-gray-500">Productos en el pronóstico</p>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Stock Crítico</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">{criticalStock}</p>
            <p className="text-sm text-red-500">Productos con stock crítico</p>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Alta Rotación</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-orange-600">{highTurnoverLowStock}</p>
            <p className="text-sm text-orange-500">Alta rotación con stock insuficiente</p>
          </CardContent>
        </Card>

        <Card className="h-full">
          <CardHeader>
            <CardTitle>Proyección 30d</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-blue-600">{totalProjectedDemand}</p>
            <p className="text-sm text-blue-500">Unidades proyectadas</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts section */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 pt-6">
        {/* Demand Projection Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Proyección de Demanda (30 días)</CardTitle>
          </CardHeader>
          <CardContent>
            <Chart
              data={{
                labels: forecastData.map((f: any) => f.name),
                datasets: [
                  {
                    label: 'Demanda Actual',
                    data: forecastData.map((f: any) => f.current_stock),
                    backgroundColor: 'rgba(59, 130, 246, 0.2)',
                    borderColor: 'rgba(59, 130, 246, 1)',
                    borderWidth: 1,
                  },
                  {
                    label: 'Proyección 30d',
                    data: forecastData.map((f: any) => f.projected_demand_30d),
                    backgroundColor: 'rgba(239, 68, 68, 0.2)',
                    borderColor: 'rgba(239, 68, 68, 1)',
                    borderWidth: 1,
                    type: 'line',
                  },
                ],
              }}
              options={{
                responsive: true,
                scales: {
                  y: {
                    beginAtZero: true,
                    ticks: {
                      stepSize: 1,
                    },
                  },
                },
                plugins: {
                  legend: {
                    position: 'top' as const,
                  },
                  tooltip: {
                    mode: 'index' as const,
                    intersect: false,
                  },
                },
              }}
              width={800}
              height={400}
            />
          </CardContent>
        </Card>

        {/* Stock Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle>Distribución de Stock</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Óptimo</span>
                <span className="text-green-600">{forecastData.filter(
                  (f: any) => f.stock_status === 'optimal'
                ).length} ({((forecastData.filter(
                  (f: any) => f.stock_status === 'optimal'
                ).length / totalProducts) * 100).toFixed(1)}%)</span>
              </div>
              <div>
                <div className="w-24 h-2 bg-green-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-500 w-1/3"
                    style={{ width: `${(forecastData.filter(
                      (f: any) => f.stock_status === 'optimal'
                    ).length / totalProducts) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Bajo</span>
                <span className="text-yellow-600">{forecastData.filter(
                  (f: any) => f.stock_status === 'low'
                ).length} ({((forecastData.filter(
                  (f: any) => f.stock_status === 'low'
                ).length / totalProducts) * 100).toFixed(1)}%)</span>
              </div>
              <div>
                <div className="w-24 h-2 bg-yellow-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-500 w-1/3"
                    style={{ width: `${(forecastData.filter(
                      (f: any) => f.stock_status === 'low'
                    ).length / totalProducts) * 100}%` }}
                  ></div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span>Crítico</span>
                <span className="text-red-600">{forecastData.filter(
                  (f: any) => f.current_stock <= (f.min_stock ?? 0)
                ).length} ({((forecastData.filter(
                  (f: any) => f.current_stock <= (f.min_stock ?? 0)
                ).length / totalProducts) * 100).toFixed(1)}%)</span>
              </div>
              <div>
                <div className="w-24 h-2 bg-red-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-red-500 w-1/3"
                    style={{ width: `${(forecastData.filter(
                      (f: any) => f.current_stock <= (f.min_stock ?? 0)
                    ).length / totalProducts) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical items list */}
      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {forecastData
          .filter(
            (f: any) =>
              f.current_stock <= (f.min_stock ?? 0) && f.high_turnover
          )
          .slice(0, 5)
          .map((product: any, index: number) => (
            <Card key={index} className="flex flex-col h-24">
              <CardHeader className="p-2">
                <span className="text-sm text-red-600 font-medium">
                  {product.name}
                </span>
              </CardHeader>
              <CardContent className="flex flex-col h-12">
                <p className="text-xs text-gray-500 line-clamp-2">
                  Stock Actual: {product.current_stock} | Mínimo: {product.min_stock || 0}
                </p>
                <p className="text-xs text-gray-400 line-clamp-1">
                  Suggested: {product.suggested_stock} | Ventas: {product.total_quantity_sold}
                </p>
              </CardContent>
            </Card>
          ))}
        {criticalStock === 0 && <p className="text-sm text-green-600">¡No hay productos críticos!</p>}
      </div>

      {/* Valuation section */}
      {valorationData && (
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          <Card>
            <CardHeader>
              <CardTitle>Costo COGS</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-green-600">{valorationData.costoCogs}</p>
              <p className="text-sm text-gray-500">Costo de bienes vendidos</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Valor Inventario</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-blue-600">{valorationData.valorInventarioFinal}</p>
              <p className="text-sm text-blue-500">Valor final del inventario</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Costo Unitario</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-orange-600">{valorationData.costoUnitario}</p>
              <p className="text-sm text-orange-500">Costo por unidad</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Cantidad</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-3xl font-bold text-purple-600">
                {valorationData.cantidadVendida} vendidas / {valorationData.cantidadQued} quedas
              </p>
              <p className="text-sm text-purple-500">Unidades en período</p>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-500">
            <thead>
              <tr>
                <th className="text-left p-2 border border-gray-200">Producto</th>
                <th className="text-left p-2 border border-gray-200">Costo Unit.</th>
                <th className="text-left p-2 border border-gray-200">COGS</th>
                <th className="text-left p-2 border border-gray-200">Stock Qued</th>
                <th className="text-left p-2 border border-gray-200">Método</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-2 border border-gray-200">Total Período</td>
                <td className="p-2 border border-gray-200">{valorationData.costoUnitario}</td>
                <td className="p-2 border border-gray-200">{valorationData.costoCogs}</td>
                <td className="p-2 border border-gray-200">{valorationData.cantidadQued}</td>
                <td className="p-2 border border-gray-200">{valorationData.metodo}</td>
              </tr>
            </tbody>
          </table>
        </div>
      )}
      {error && (
        <div className="mt-6 p-4 bg-red-100 text-red-800 rounded-border">
          <p>{error}</p>
        </div>
      )}
    </div>
  );
}

/* ── Props ────────────────────────────────────────────────────────────────── */

InventoryDashboard.def = {
  companyId: { type: 'string', optional: true },
};