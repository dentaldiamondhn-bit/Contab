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
  ShoppingCart,
  TrendingUp,
  TrendingDown,
  Search,
  Download,
  Calendar,
  Package
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface PurchaseOrdersManagerProps {
  tenantId: string;
}

interface PurchaseOrder {
  id: string;
  orderNumber: string;
  supplierId: string;
  orderDate: string;
  expectedDate: string;
  status: 'DRAFT' | 'SENT' | 'RECEIVED' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  supplier?: {
    name: string;
    rtn: string;
    email?: string;
    phone?: string;
  };
  items: Array<{
    id: string;
    productId: string;
    description: string;
    quantity: number;
    unitPrice: number;
    taxRate: number;
    taxAmount: number;
    totalAmount: number;
  }>;
}

export default function PurchaseOrdersManager({ tenantId }: PurchaseOrdersManagerProps) {
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showOrderForm, setShowOrderForm] = useState(false);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);
  const [orderForm, setOrderForm] = useState({
    supplierId: "",
    orderNumber: "",
    orderDate: new Date().toISOString().split('T')[0],
    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'DRAFT' as 'DRAFT' | 'SENT' | 'RECEIVED' | 'PARTIAL' | 'PAID' | 'CANCELLED',
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0,
    notes: ""
  });

  const [products, setProducts] = useState<any[]>([]);
  const [orderItems, setOrderItems] = useState<any[]>([]);

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadPurchaseOrders();
    loadProducts();
  }, [tenantId]);

  const loadPurchaseOrders = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await supabase.rpc('set_tenant', { tenant_id: tenantId });

      // Cargar órdenes de compra
      const { data, error } = await supabase
        .from('PurchaseOrder')
        .select(`
          *,
          Supplier:supplier(id, name, rtn),
          items:PurchaseOrderItem(id, productId, description, quantity, unitPrice, taxRate, taxAmount, totalAmount)
        `)
        .order('createdAt', { ascending: false });

      if (error) throw error;

      setOrders(data || []);
    } catch (error: any) {
      console.error("Error loading purchase orders:", error);
      alert("Error al cargar las órdenes de compra");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('Product')
        .select('id, name, code, unitCost')
        .eq('isActive', true)
        .order('name');

      if (error) throw error;

      setProducts(data || []);
    } catch (error: any) {
      console.error("Error loading products:", error);
    }
  };

  const savePurchaseOrder = async () => {
    try {
      if (!orderForm.supplierId || !orderForm.orderNumber || !orderForm.subtotal || orderForm.subtotal <= 0) {
        alert("Por favor complete los campos requeridos");
        return;
      }

      // Calcular totales
      const totalTaxAmount = orderItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const totalAmount = orderForm.subtotal + totalTaxAmount;

      const orderData = {
        tenantId,
        supplierId: orderForm.supplierId,
        orderNumber: orderForm.orderNumber,
        orderDate: orderForm.orderDate,
        expectedDate: orderForm.expectedDate,
        status: orderForm.status,
        subtotal: Math.round(orderForm.subtotal * 100), // Convertir a centavos
        taxAmount: Math.round(totalTaxAmount),
        totalAmount: Math.round(totalAmount),
        notes: orderForm.notes
      };

      if (editingOrder) {
        // Actualizar orden existente
        const { error } = await supabase
          .from('PurchaseOrder')
          .update(orderData)
          .eq('id', editingOrder.id);

        if (error) throw error;

        alert("Orden de compra actualizada exitosamente");
      } else {
        // Crear nueva orden
        const { data, error } = await supabase
          .from('PurchaseOrder')
          .insert(orderData);

        if (error) throw error;

        const orderId = data[0].id;

        // Insertar items de la orden
        const itemsWithOrderId = orderItems.map(item => ({
          ...item,
          purchaseOrderId: orderId
        }));

        if (itemsWithOrderId.length > 0) {
          const { error: itemsError } = await supabase
            .from('PurchaseOrderItem')
            .insert(itemsWithOrderId);

          if (itemsError) throw itemsError;
        }

        alert("Orden de compra creada exitosamente");
      }

      // Resetear formulario
      setOrderForm({
        supplierId: "",
        orderNumber: "",
        orderDate: new Date().toISOString().split('T')[0],
        expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        status: 'DRAFT',
        subtotal: 0,
        taxAmount: 0,
        totalAmount: 0,
        notes: ""
      });
      setOrderItems([]);
      setEditingOrder(null);
      setShowOrderForm(false);
      loadPurchaseOrders();
    } catch (error: any) {
      console.error("Error saving purchase order:", error);
      alert("Error al guardar la orden de compra");
    }
  };

  const addOrderItem = () => {
    if (!products.length) return;

    const product = products[0]; // Seleccionar el primer producto como ejemplo
    const quantity = 1;
    const unitPrice = product.unitCost / 100;
    const taxRate = 0.15; // 15% de IVA

    const subtotal = unitPrice * quantity;
    const taxAmount = subtotal * taxRate;
    const totalAmount = subtotal + taxAmount;

    const newItem = {
      productId: product.id,
      description: product.name,
      quantity,
      unitPrice: Math.round(unitPrice * 100),
      taxRate,
      taxAmount: Math.round(taxAmount),
      totalAmount: Math.round(totalAmount)
    };

    setOrderItems([...orderItems, newItem]);
    setOrderForm({
      ...orderForm,
      subtotal: (orderForm.subtotal + subtotal),
      taxAmount: (orderForm.taxAmount + taxAmount),
      totalAmount: (orderForm.totalAmount + totalAmount)
    });
  };

  const removeOrderItem = (index: number) => {
    setOrderItems(orderItems.filter((_, i) => i !== index));
  };

  const exportToCSV = () => {
    const headers = [
      'Número de Orden', 'Proveedor', 'Fecha', 'Fecha Esperada',
      'Subtotal', 'Impuesto', 'Total', 'Estado', 'Notas'
    ];
    const rows = orders.map(order => [
      order.orderNumber,
      order.supplier?.name || 'N/A',
      order.orderDate,
      order.expectedDate,
      (order.subtotal / 100).toFixed(2),
      (order.taxAmount / 100).toFixed(2),
      (order.totalAmount / 100).toFixed(2),
      order.status,
      order.notes || ''
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `ordenes_compra_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredOrders = orders.filter(order =>
    order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    order.status.toLowerCase().includes(statusFilter.toLowerCase())
  );

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return <Badge variant="secondary">Borrador</Badge>;
      case 'SENT':
        return <Badge variant="outline">Enviada</Badge>;
      case 'RECEIVED':
        return <Badge variant="default">Recibida</Badge>;
      case 'PARTIAL':
        return <Badge variant="outline">Parcial</Badge>;
      case 'PAID':
        return <Badge variant="default">Pagada</Badge>;
      case 'CANCELLED':
        return <Badge variant="destructive">Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const totalOrders = filteredOrders.length;
  const totalValue = filteredOrders.reduce((sum, order) => sum + order.totalAmount, 0);

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando órdenes de compra...</p>
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
            <ShoppingCart className="h-6 w-6 mr-2 text-orange-600" />
            Órdenes de Compra
          </h2>
          <p className="text-gray-600">Gestión de órdenes y seguimiento de proveedores</p>
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
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Número de orden, proveedor..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="DRAFT">Borrador</option>
                <option value="SENT">Enviada</option>
                <option value="RECEIVED">Recibida</option>
                <option value="PARTIAL">Parcial</option>
                <option value="PAID">Pagada</option>
                <option value="CANCELLED">Cancelada</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Registros</label>
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-medium">{filteredOrders.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Órdenes</CardTitle>
            <ShoppingCart className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {totalOrders}
            </div>
            <p className="text-xs text-gray-600">
              Órdenes registradas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              L. {(totalValue / 100).toFixed(2)}
            </div>
            <p className="text-xs text-gray-600">
              Valor total de compras
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Promedio por Orden</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              L. {totalOrders > 0 ? (totalValue / totalOrders / 100).toFixed(2) : '0.00'}
            </div>
            <p className="text-xs text-gray-600">
              Promedio por orden
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Órdenes Pendientes</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {orders.filter(o => o.status === 'DRAFT' || o.status === 'SENT' || o.status === 'RECEIVED').length}
            </div>
            <p className="text-xs text-gray-600">
              Requieren atención
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Botón de Nueva Orden */}
      <div className="flex justify-center">
        <Button onClick={() => setShowOrderForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nueva Orden de Compra
        </Button>
      </div>

      {/* Lista de Órdenes */}
      <Card>
        <CardHeader>
          <CardTitle>Órdenes de Compra</CardTitle>
          <CardDescription>
            Gestión de órdenes y seguimiento con proveedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Número
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Proveedor
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha Esperada
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Impuesto
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Total
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
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron órdenes de compra
                    </td>
                          <div className="text-gray-500 text-xs">
                            RTN: {order.supplier?.rtn || 'N/A'}
                          </div>
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        <div className={isOverdue ? 'text-red-600 font-medium' : ''}>
                          {new Date(order.orderDate).toLocaleDateString('es-HN')}
                          {isOverdue && (
                            <div className="text-xs">
                              {Math.ceil((new Date().getTime() - new Date(order.expectedDate).getTime()) / (1000 * 60 * 60 * 24))} días vencido
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        <div className="text-gray-500 text-xs">
                          {new Date(order.expectedDate).toLocaleDateString('es-HN')}
                        </div>
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right">
                        L. {(order.subtotal / 100).toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right">
                        L. {(order.taxAmount / 100).toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-right font-bold">
                        L. {(order.totalAmount / 100).toFixed(2)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                        <div className="flex space-x-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingOrder(order);
                              setOrderForm({
                                supplierId: order.supplierId,
                                orderNumber: order.orderNumber,
                                orderDate: order.orderDate,
                                expectedDate: order.expectedDate,
                                status: order.status,
                                subtotal: order.subtotal,
                                taxAmount: order.taxAmount,
                                totalAmount: order.totalAmount,
                                notes: order.notes
                              });
                              setShowOrderForm(true);
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
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-right font-bold">
                          L. {(order.totalAmount / 100).toFixed(2)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          {getStatusBadge(order.status)}
                        </td>
                        <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                          <div className="flex space-x-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingOrder(order);
                                setOrderForm({
                                  supplierId: order.supplierId,
                                  orderNumber: order.orderNumber,
                                  orderDate: order.orderDate,
                                  expectedDate: order.expectedDate,
                                  status: order.status,
                                  subtotal: order.subtotal,
                                  taxAmount: order.taxAmount,
                                  totalAmount: order.totalAmount,
                                  notes: order.notes
                                });
                                setShowOrderForm(true);
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

      {/* Formulario de Orden de Compra */}
      {showOrderForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingOrder ? 'Editar Orden de Compra' : 'Nueva Orden de Compra'}</CardTitle>
            <CardDescription>
              {editingOrder ? 'Modifique los datos de la orden' : 'Ingrese los datos de la nueva orden'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supplierId">Proveedor *</Label>
                  <Select value={orderForm.supplierId} onValueChange={(value) => setOrderForm({ ...orderForm, supplierId: value })}>
                    <SelectTrigger className="bg-white">
                      <SelectValue placeholder="Seleccione un proveedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((supplier) => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.rtn} - {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="orderNumber">Número de Orden *</Label>
                  <Input
                    id="orderNumber"
                    value={orderForm.orderNumber}
                    onChange={(e) => setOrderForm({ ...orderForm, orderNumber: e.target.value })}
                    placeholder="OC-2023-0001"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="orderDate">Fecha de Orden *</Label>
                  <Input
                    id="orderDate"
                    type="date"
                    value={orderForm.orderDate}
                    onChange={(e) => setOrderForm({ ...orderForm, orderDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="expectedDate">Fecha Esperada *</Label>
                  <Input
                    id="expectedDate"
                    type="date"
                    value={orderForm.expectedDate}
                    onChange={(e) => setOrderForm({ ...orderForm, expectedDate: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="status">Estado</Label>
                  <Select value={orderForm.status} onValueChange={(value: string) => setOrderForm({ ...orderForm, status: value as any })}>
                    <SelectTrigger className="bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DRAFT">Borrador</SelectItem>
                      <SelectItem value="SENT">Enviada</SelectItem>
                      <SelectItem value="RECEIVED">Recibida</SelectItem>
                      <SelectItem value="PARTIAL">Parcial</SelectItem>
                      <SelectItem value="PAID">Pagada</SelectItem>
                      <SelectItem value="CANCELLED">Cancelada</SelectItem>
                    </SelectContent>
                  </Select>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notas</Label>
                <Input
                  id="notes"
                  value={orderForm.notes}
                  onChange={(e) => setOrderForm({ ...orderForm, notes: e.target.value })}
                  placeholder="Notas adicionales de la orden"
                />
              </div>
            </div>
            <div className="space-y-4">
              <Label>Items de la Orden</Label>
              <div className="border rounded-lg p-4 bg-gray-50">
                <div className="space-y-2">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium">Producto</span>
                    <span className="text-sm text-gray-600">Cantidad</span>
                    <span className="text-sm text-gray-600">Precio Unitario</span>
                    <span className="text-sm text-gray-600">Total</span>
                    <span className="text-sm text-gray-600">Acciones</span>
                  </div>
                </div>
                {orderItems.map((item, index) => (
                  <div key={item.id} className="flex items-center space-x-2 mb-2">
                    <Select
                      value={item.productId}
                      onValueChange={(value) => {
                        const updatedItems = [...orderItems];
                        updatedItems[index].productId = value;
                        setOrderItems(updatedItems);
                        
                        // Recalcular totales
                        const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                        const newTaxAmount = updatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
                        const newTotalAmount = newSubtotal + newTaxAmount;
                        
                        setOrderForm({
                          ...orderForm,
                          subtotal: newSubtotal,
                          taxAmount: newTaxAmount,
                          totalAmount: newTotalAmount
                        });
                      }}
                    >
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
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.quantity}
                      onChange={(e) => {
                        const updatedItems = [...orderItems];
                        updatedItems[index].quantity = parseFloat(e.target.value) || 0;
                        setOrderItems(updatedItems);
                        
                        // Recalcular totales
                        const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                        const newTaxAmount = updatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
                        const newTotalAmount = newSubtotal + newTaxAmount;
                        
                        setOrderForm({
                          ...orderForm,
                          subtotal: newSubtotal,
                          taxAmount: newTaxAmount,
                          totalAmount: newTotalAmount
                        });
                      }}
                    </div>
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unitPrice}
                      onChange={(e) => {
                        const updatedItems = [...orderItems];
                        updatedItems[index].unitPrice = parseFloat(e.target.value) || 0;
                        setOrderItems(updatedItems);
                        
                        // Recalcular totales
                        const newSubtotal = updatedItems.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                        const newTaxAmount = updatedItems.reduce((sum, item) => sum + item.taxAmount, 0);
                        const newTotalAmount = newSubtotal + newTaxAmount;
                        
                        setOrderForm({
                          ...orderForm,
                          subtotal: newSubtotal,
                          taxAmount: newTaxAmount,
                          totalAmount: newTotalAmount
                        });
                      }}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeOrderItem(index)}
                    >
                      Eliminar
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-between items-center mt-4">
                <Button
                  variant="outline"
                  onClick={addOrderItem}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Agregar Item
                </Button>
              </div>
            </div>
          </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowOrderForm(false);
                  setEditingOrder(null);
                  setOrderForm({
                    supplierId: "",
                    orderNumber: "",
                    orderDate: new Date().toISOString().split('T')[0],
                    expectedDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                    status: 'DRAFT',
                    subtotal: 0,
                    taxAmount: 0,
                    totalAmount: 0,
                    notes: ""
                  });
                  setOrderItems([]);
                }}
              >
                Cancelar
              </Button>
              <Button onClick={savePurchaseOrder}>
                {editingOrder ? 'Actualizar' : 'Guardar'}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
