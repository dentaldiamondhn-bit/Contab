'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  ArrowLeft,
  History,
  ArrowUp,
  ArrowDown,
  Search,
  FileText,
  Package,
  Calendar,
} from 'lucide-react';

interface Product {
  id: string;
  code: string;
  name: string;
  current_stock: number;
  current_cost: number;
}

interface Movement {
  id: string;
  product_id: string;
  movement_type: 'IN' | 'OUT';
  movement_reason: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
  stock_before: number;
  stock_after: number;
  reference_number?: string;
  notes?: string;
  created_at: string;
  created_by?: string;
}

export default function KardexPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [products, setProducts] = useState<Product[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<string>('');
  const [movements, setMovements] = useState<Movement[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    loadProducts();
  }, []);

  useEffect(() => {
    if (selectedProduct) {
      loadKardex();
    }
  }, [selectedProduct, startDate, endDate]);

  const loadProducts = async () => {
    try {
      const res = await fetch('/api/inventory/products');
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const loadKardex = async () => {
    try {
      setLoading(true);
      let url = `/api/inventory/movements?productId=${selectedProduct}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setMovements(data);
      }
    } catch (error) {
      console.error('Error loading kardex:', error);
    } finally {
      setLoading(false);
    }
  };

  const getMovementIcon = (type: string) => {
    return type === 'IN' ? (
      <ArrowUp className="w-4 h-4 text-green-600" />
    ) : (
      <ArrowDown className="w-4 h-4 text-red-600" />
    );
  };

  const getMovementReason = (reason: string) => {
    const reasons: Record<string, string> = {
      purchase: 'Compra',
      sale: 'Venta',
      return: 'Devolución',
      adjustment: 'Ajuste',
      damage: 'Merma/Daño',
      consumption: 'Consumo Interno',
      transfer: 'Transferencia',
      initial_stock: 'Stock Inicial',
    };
    return reasons[reason] || reason;
  };

  const selectedProductData = products.find(p => p.id === selectedProduct);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/companies/${companyId}/inventory`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Kardex de Inventario</h1>
            <p className="text-gray-500">Historial detallado de movimientos por producto</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Producto</Label>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger>
                  <SelectValue placeholder="Seleccionar producto..." />
                </SelectTrigger>
                <SelectContent>
                  {products.map((product) => (
                    <SelectItem key={product.id} value={product.id}>
                      {product.code} - {product.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Fecha Inicio</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Fecha Fin</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={loadKardex} disabled={!selectedProduct}>
                <Search className="w-4 h-4 mr-2" />
                Buscar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Product Info */}
      {selectedProductData && (
        <Card className="bg-blue-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-4">
                <Package className="w-8 h-8 text-blue-600" />
                <div>
                  <h3 className="font-semibold text-lg">
                    {selectedProductData.code} - {selectedProductData.name}
                  </h3>
                  <p className="text-gray-600">
                    Stock Actual: <strong>{selectedProductData.current_stock}</strong> unidades
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Costo Actual</p>
                <p className="text-xl font-bold text-blue-600">
                  L {selectedProductData.current_cost?.toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Kardex Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="w-5 h-5" />
            Historial de Movimientos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!selectedProduct ? (
            <div className="text-center py-8 text-gray-500">
              Selecciona un producto para ver su historial
            </div>
          ) : loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay movimientos registrados para este producto
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Fecha</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Tipo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Motivo</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Cantidad</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Costo Unit.</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Costo Total</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Stock Ant.</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-gray-600">Stock Nuevo</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-gray-600">Referencia</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      {new Date(movement.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {getMovementIcon(movement.movement_type)}
                        <Badge
                          className={
                            movement.movement_type === 'IN'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }
                        >
                          {movement.movement_type === 'IN' ? 'Entrada' : 'Salida'}
                        </Badge>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {getMovementReason(movement.movement_reason)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">{movement.quantity}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      L {movement.unit_cost?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      L {movement.total_cost?.toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right text-gray-500">
                      {movement.stock_before}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {movement.stock_after}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      {movement.reference_number || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
