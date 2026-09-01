"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Package,
  TrendingUp,
  TrendingDown,
  Search,
  AlertCircle,
  Download,
  Calculator
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface InventoryManagerProps {
  tenantId: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  currentStock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  unitPrice: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface InventoryTransaction {
  id: string;
  productId: string;
  transactionType: 'IN' | 'OUT';
  quantity: number;
  unitCost: number;
  totalCost: number;
  reference: string;
  notes: string;
  createdAt: string;
  product?: Product;
}

export default function InventoryManager({ tenantId }: InventoryManagerProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [transactionForm, setTransactionForm] = useState({
    productId: "",
    transactionType: 'IN' as 'IN' | 'OUT',
    quantity: 0,
    unitCost: 0,
    reference: "",
    notes: ""
  });
  const [productForm, setProductForm] = useState({
    code: "",
    name: "",
    description: "",
    category: "",
    unit: "",
    currentStock: 0,
    minStock: 0,
    maxStock: 0,
    unitCost: 0,
    unitPrice: 0
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadInventory();
    loadTransactions();
  }, [tenantId]);

  const loadInventory = async () => {
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

      setProducts(data || []);
    } catch (error: any) {
      console.error("Error loading inventory:", error);
      alert("Error al cargar el inventario");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    try {
      // Cargar transacciones de inventario
      const { data, error } = await supabase
        .from('InventoryTransaction')
        .select(`
          *,
          Product:product(id, name, code, unit)
        `)
        .order('createdAt', { ascending: false })
        .limit(50);

      if (error) throw error;

      setTransactions(data || []);
    } catch (error: any) {
      console.error("Error loading transactions:", error);
    }
  };

  const saveProduct = async () => {
    try {
      if (!productForm.name || !productForm.code) {
        alert("Por favor complete el nombre y código del producto");
        return;
      }

      const productData = {
        tenantId,
        code: productForm.code,
        name: productForm.name,
        description: productForm.description,
        category: productForm.category,
        unit: productForm.unit,
        currentStock: productForm.currentStock,
        minStock: productForm.minStock,
        maxStock: productForm.maxStock,
        unitCost: Math.round(productForm.unitCost * 100), // Convertir a centavos
        unitPrice: Math.round(productForm.unitPrice * 100),
        isActive: true
      };

      if (editingProduct) {
        // Actualizar producto existente
        const { error } = await (supabase as any)
          .from('Product')
          .update(productData)
          .eq('id', editingProduct.id);

        if (error) throw error;
        alert("Producto actualizado exitosamente");
      } else {
        // Crear nuevo producto
        const { error } = await (supabase as any)
          .from('Product')
          .insert(productData);

        if (error) throw error;
        alert("Producto creado exitosamente");
      }

      // Resetear formulario
      setProductForm({
        code: "",
        name: "",
        description: "",
        category: "",
        unit: "",
        currentStock: 0,
        minStock: 0,
        maxStock: 0,
        unitCost: 0,
        unitPrice: 0
      });
      setEditingProduct(null);
      setShowProductForm(false);
      loadInventory();
    } catch (error: any) {
      console.error("Error saving product:", error);
      alert("Error al guardar el producto");
    }
  };

  const processTransaction = async () => {
    try {
      if (!transactionForm.productId || transactionForm.quantity <= 0) {
        alert("Por favor complete todos los campos");
        return;
      }

      const product = products.find(p => p.id === transactionForm.productId);
      if (!product) return;

      const totalCost = Math.round(transactionForm.quantity * transactionForm.unitCost * 100);
      
      // Crear transacción de inventario
      const { error: transactionError } = await (supabase as any)
        .from('InventoryTransaction')
        .insert({
          tenantId,
          productId: transactionForm.productId,
          transactionType: transactionForm.transactionType,
          quantity: transactionForm.quantity,
          unitCost: Math.round(transactionForm.unitCost * 100),
          totalCost,
          reference: transactionForm.reference,
          notes: transactionForm.notes
        });

      if (transactionError) throw transactionError;

      // Actualizar stock del producto
      const newStock = transactionForm.transactionType === 'IN' 
        ? product.currentStock + transactionForm.quantity
        : product.currentStock - transactionForm.quantity;

      const { error: stockError } = await (supabase as any)
        .from('Product')
        .update({ currentStock: newStock })
        .eq('id', transactionForm.productId);

      if (stockError) throw stockError;

      // Crear asiento contable para la transacción
      const { error: accountingError } = await (supabase as any).rpc('create_accounting_transaction', {
        p_tenant_id: tenantId,
        p_date: new Date().toISOString().split('T')[0],
        p_description: `${transactionForm.transactionType === 'IN' ? 'Entrada' : 'Salida'} de inventario: ${product.name}`,
        p_voucher_type: 'DIARIO',
        p_voucher_number: Math.floor(Math.random() * 10000),
        p_total_amount: totalCost,
        p_entries: [
          {
            account_id: transactionForm.transactionType === 'IN' ? '1104' : '6101', // Inventario o Gastos
            amount: totalCost,
            description: `${transactionForm.transactionType === 'IN' ? 'Entrada' : 'Salida'} de ${product.name}`
          },
          {
            account_id: transactionForm.transactionType === 'IN' ? '1102' : '1104', // Bancos o Inventario
            amount: -totalCost,
            description: `Contrapartida de ${transactionForm.transactionType === 'IN' ? 'entrada' : 'salida'}`
          }
        ]
      });

      if (accountingError) throw accountingError;

      alert("Transacción procesada exitosamente");
      setTransactionForm({
        productId: "",
        transactionType: 'IN',
        quantity: 0,
        unitCost: 0,
        reference: "",
        notes: ""
      });
      setShowTransactionForm(false);
      loadInventory();
      loadTransactions();
    } catch (error: any) {
      console.error("Error processing transaction:", error);
      alert("Error al procesar la transacción");
    }
  };

  const getStockStatus = (product: Product) => {
    if (product.currentStock <= product.minStock) {
      return { status: 'low', color: 'text-red-600', bg: 'bg-red-100', label: 'Stock Bajo' };
    } else if (product.currentStock >= product.maxStock) {
      return { status: 'high', color: 'text-orange-600', bg: 'bg-orange-100', label: 'Stock Excesivo' };
    } else {
      return { status: 'normal', color: 'text-green-600', bg: 'bg-green-100', label: 'Stock Normal' };
    }
  };

  const calculateInventoryValue = () => {
    return products.reduce((total, product) => {
      return total + (product.currentStock * product.unitCost);
    }, 0);
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.includes(searchTerm) ||
    product.description.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(product =>
    categoryFilter === "all" || product.category === categoryFilter
  );

  const categories = [...new Set(products.map(p => p.category))];

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-4"></div>
            <p>Cargando inventario...</p>
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
            <Package className="h-6 w-6 mr-2 text-cyan-600" />
            Gestión de Inventario
          </h2>
          <p className="text-gray-600">Control de existencias y valoración</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={() => setShowProductForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Producto
          </Button>
          <Button onClick={() => setShowTransactionForm(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" />
            Movimiento
          </Button>
        </div>
      </div>

      {/* Resumen de Inventario */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Productos</CardTitle>
            <Package className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-cyan-600">
              {products.length}
            </div>
            <p className="text-xs text-gray-600">
              Productos activos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stock Bajo</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {products.filter(p => p.currentStock <= p.minStock).length}
            </div>
            <p className="text-xs text-gray-600">
              Necesitan reabastecimiento
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor del Inventario</CardTitle>
            <Calculator className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              L. {(calculateInventoryValue() / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Valor total en existencia
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rotación</CardTitle>
            <TrendingUp className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {products.length > 0 ? (products.length / 30).toFixed(1) : '0.0'}
            </div>
            <p className="text-xs text-gray-600">
              Productos vendidos por día (promedio)
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar Producto</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Código, nombre o descripción..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Categoría</label>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las categorías</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Productos */}
      <Card>
        <CardHeader>
          <CardTitle>Productos en Inventario</CardTitle>
          <CardDescription>
            Control de existencias y estados de stock
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Código
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Categoría
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Actual
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Stock Mínimo
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Unitario
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor Total
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron productos
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    const totalValue = product.currentStock * product.unitCost;
                    
                    return (
                      <tr key={product.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-4 py-3 text-sm font-medium">
                          {product.code}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <div>
                            <div className="font-medium">{product.name}</div>
                            <div className="text-gray-500 text-xs">
                              {product.description}
                            </div>
                          </div>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm">
                          <Badge variant="outline">{product.category}</Badge>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                          <span className={`font-medium ${stockStatus.color}`}>
                            {product.currentStock} {product.unit}
                          </span>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                          {product.minStock} {product.unit}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-right">
                          L. {(product.unitCost / 100).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-right font-medium">
                          L. {(totalValue / 100).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          <Badge className={`${stockStatus.bg} ${stockStatus.color}`}>
                            {stockStatus.label}
                          </Badge>
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          <div className="flex space-x-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingProduct(product);
                                setProductForm({
                                  code: product.code,
                                  name: product.name,
                                  description: product.description,
                                  category: product.category,
                                  unit: product.unit,
                                  currentStock: product.currentStock,
                                  minStock: product.minStock,
                                  maxStock: product.maxStock,
                                  unitCost: product.unitCost / 100,
                                  unitPrice: product.unitPrice / 100
                                });
                                setShowProductForm(true);
                              }}
                            >
                              Editar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de Producto */}
      {showProductForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingProduct ? 'Editar Producto' : 'Nuevo Producto'}</CardTitle>
            <CardDescription>
              {editingProduct ? 'Modifique los datos del producto' : 'Ingrese los datos del nuevo producto'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="code">Código *</Label>
                <Input
                  id="code"
                  value={productForm.code}
                  onChange={(e) => setProductForm({ ...productForm, code: e.target.value })}
                  placeholder="Código único del producto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={productForm.name}
                  onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                  placeholder="Nombre del producto"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category">Categoría</Label>
                <Input
                  id="category"
                  value={productForm.category}
                  onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                  placeholder="Ej: Electrónicos, Ropa, Alimentos"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unit">Unidad de Medida</Label>
                <Input
                  id="unit"
                  value={productForm.unit}
                  onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                  placeholder="Ej: Unidades, Kg, Litros"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={productForm.description}
                  onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}
                  placeholder="Descripción detallada"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="currentStock">Stock Actual</Label>
                <Input
                  id="currentStock"
                  type="number"
                  value={productForm.currentStock}
                  onChange={(e) => setProductForm({ ...productForm, currentStock: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="minStock">Stock Mínimo</Label>
                <Input
                  id="minStock"
                  type="number"
                  value={productForm.minStock}
                  onChange={(e) => setProductForm({ ...productForm, minStock: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxStock">Stock Máximo</Label>
                <Input
                  id="maxStock"
                  type="number"
                  value={productForm.maxStock}
                  onChange={(e) => setProductForm({ ...productForm, maxStock: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitCost">Costo Unitario (L.)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  value={productForm.unitCost}
                  onChange={(e) => setProductForm({ ...productForm, unitCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitPrice">Precio Unitario (L.)</Label>
                <Input
                  id="unitPrice"
                  type="number"
                  step="0.01"
                  value={productForm.unitPrice}
                  onChange={(e) => setProductForm({ ...productForm, unitPrice: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowProductForm(false);
                  setEditingProduct(null);
                  setProductForm({
                    code: "",
                    name: "",
                    description: "",
                    category: "",
                    unit: "",
                    currentStock: 0,
                    minStock: 0,
                    maxStock: 0,
                    unitCost: 0,
                    unitPrice: 0
                  });
                }}
              >
                Cancelar
              </Button>
              <Button onClick={saveProduct}>
                {editingProduct ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario de Transacción */}
      {showTransactionForm && (
        <Card>
          <CardHeader>
            <CardTitle>Movimiento de Inventario</CardTitle>
            <CardDescription>
              Registre entradas o salidas de inventario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="productId">Producto *</Label>
                <Select value={transactionForm.productId} onValueChange={(value) => setTransactionForm({ ...transactionForm, productId: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Seleccione un producto" />
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
                <Label htmlFor="transactionType">Tipo de Movimiento *</Label>
                <Select value={transactionForm.transactionType} onValueChange={(value: 'IN' | 'OUT') => setTransactionForm({ ...transactionForm, transactionType: value })}>
                  <SelectTrigger className="bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="IN">Entrada</SelectItem>
                    <SelectItem value="OUT">Salida</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quantity">Cantidad *</Label>
                <Input
                  id="quantity"
                  type="number"
                  step="0.01"
                  min="0"
                  value={transactionForm.quantity}
                  onChange={(e) => setTransactionForm({ ...transactionForm, quantity: parseFloat(e.target.value) || 0 })}
                  placeholder="0"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="unitCost">Costo Unitario (L.)</Label>
                <Input
                  id="unitCost"
                  type="number"
                  step="0.01"
                  value={transactionForm.unitCost}
                  onChange={(e) => setTransactionForm({ ...transactionForm, unitCost: parseFloat(e.target.value) || 0 })}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reference">Referencia</Label>
                <Input
                  id="reference"
                  value={transactionForm.reference}
                  onChange={(e) => setTransactionForm({ ...transactionForm, reference: e.target.value })}
                  placeholder="Factura, orden de compra, etc."
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="notes">Notas</Label>
                <Input
                  id="notes"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({ ...transactionForm, notes: e.target.value })}
                  placeholder="Notas adicionales"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTransactionForm(false);
                  setTransactionForm({
                    productId: "",
                    transactionType: 'IN',
                    quantity: 0,
                    unitCost: 0,
                    reference: "",
                    notes: ""
                  });
                }}
              >
                Cancelar
              </Button>
              <Button onClick={processTransaction}>
                Procesar Movimiento
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
