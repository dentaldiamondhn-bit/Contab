'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, FileText, CheckCircle, Clock, AlertCircle, ChevronLeft, Trash2, Edit, Eye, Send, Package, CheckSquare } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
  rtn: string;
}

interface Product {
  id: string;
  code: string;
  name: string;
  unit_price: number;
}

interface PurchaseOrderItem {
  id?: string;
  product_id?: string;
  product_code?: string;
  product_name: string;
  quantity_requested: number;
  quantity_received?: number;
  unit_price: number;
  total: number;
  notes?: string;
}

interface PurchaseOrder {
  id: string;
  order_number: string;
  supplier: Supplier;
  order_date: string;
  expected_date?: string;
  subtotal: number;
  tax_amount: number;
  total: number;
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;
  received_by?: string;
  received_at?: string;
  purchase_id?: string;
  items?: PurchaseOrderItem[];
}

export default function PurchaseOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);

  // Form states
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<PurchaseOrderItem>>({
    product_name: '',
    quantity_requested: 1,
    unit_price: 0,
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadOrders();
    loadSuppliers();
    loadProducts();
  }, [companyId]);

  useEffect(() => {
    let filtered = orders;

    if (searchTerm.trim() !== '') {
      filtered = filtered.filter(o =>
        o.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(o => o.status === filterStatus);
    }

    setFilteredOrders(filtered);
  }, [searchTerm, filterStatus, orders]);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchase-orders?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setOrders(data);
        setFilteredOrders(data);
      }
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSuppliers = async () => {
    try {
      const res = await fetch(`/api/suppliers?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.filter((s: Supplier) => s.supplier_type === 'merchandise'));
      }
    } catch (error) {
      console.error('Error loading suppliers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const res = await fetch(`/api/inventory/products?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  const generateOrderNumber = () => {
    const prefix = 'OC';
    const date = new Date().toISOString().slice(2, 4) + new Date().toISOString().slice(5, 7);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `${prefix}-${date}-${random}`;
  };

  const handleCreate = async () => {
    if (!selectedSupplier || items.length === 0) {
      alert('Seleccione un proveedor y agregue al menos un artículo');
      return;
    }

    setSubmitting(true);

    try {
      const orderNum = orderNumber || generateOrderNumber();
      const subtotal = items.reduce((sum, item) => sum + item.total, 0);
      const taxAmount = Math.round(subtotal * 0.15);
      const total = subtotal + taxAmount;

      const res = await fetch('/api/purchase-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          order_number: orderNum,
          supplier_id: selectedSupplier.id,
          order_date: orderDate,
          expected_date: expectedDate || null,
          subtotal,
          tax_amount: taxAmount,
          total,
          notes: notes || null,
          items: items.map(item => ({
            ...item,
            unit_price: Math.round(item.unit_price),
            total: Math.round(item.total),
          })),
          companyId,
        }),
      });

      if (res.ok) {
        alert('Orden de compra creada exitosamente');
        setShowCreateModal(false);
        resetForm();
        loadOrders();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'No se pudo crear la orden'));
      }
    } catch (error) {
      alert('Error al crear orden de compra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOrder.id,
          status: 'APPROVED',
          approved_at: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        alert('Orden aprobada');
        setShowApproveModal(false);
        setSelectedOrder(null);
        loadOrders();
      }
    } catch (error) {
      alert('Error al aprobar orden');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReceive = async () => {
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/purchase-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOrder.id,
          status: 'RECEIVED',
          received_at: new Date().toISOString(),
        }),
      });

      if (res.ok) {
        alert('Orden marcada como recibida');
        setShowReceiveModal(false);
        setSelectedOrder(null);
        loadOrders();
      }
    } catch (error) {
      alert('Error al recibir orden');
    } finally {
      setSubmitting(false);
    }
  };

  const addItem = () => {
    if (!newItem.product_name || !newItem.quantity_requested || !newItem.unit_price) {
      alert('Complete los datos del artículo');
      return;
    }

    const total = (newItem.quantity_requested || 0) * (newItem.unit_price || 0);
    setItems([...items, { ...newItem, total } as PurchaseOrderItem]);
    
    setNewItem({
      product_name: '',
      quantity_requested: 1,
      unit_price: 0,
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const selectProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setNewItem({
        product_id: product.id,
        product_code: product.code,
        product_name: product.name,
        quantity_requested: 1,
        unit_price: product.unit_price || 0,
      });
    }
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setOrderNumber('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setExpectedDate('');
    setNotes('');
    setItems([]);
    setNewItem({
      product_name: '',
      quantity_requested: 1,
      unit_price: 0,
    });
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      DRAFT: { label: 'Borrador', className: 'bg-gray-100 text-gray-800', icon: FileText },
      PENDING: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      APPROVED: { label: 'Aprobada', className: 'bg-blue-100 text-blue-800', icon: CheckCircle },
      RECEIVED: { label: 'Recibida', className: 'bg-purple-100 text-purple-800', icon: Package },
      COMPLETED: { label: 'Completada', className: 'bg-green-100 text-green-800', icon: CheckSquare },
      CANCELLED: { label: 'Cancelada', className: 'bg-red-100 text-red-800', icon: AlertCircle },
    };

    const config = statusConfig[status] || statusConfig.DRAFT;
    const Icon = config.icon;

    return (
      <Badge className={config.className}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const canApprove = (order: PurchaseOrder) => ['DRAFT', 'PENDING'].includes(order.status);
  const canReceive = (order: PurchaseOrder) => order.status === 'APPROVED';
  const canCancel = (order: PurchaseOrder) => !['COMPLETED', 'CANCELLED', 'RECEIVED'].includes(order.status);

  const formatCurrency = (amount: number) => {
    return `L ${(amount / 100).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => router.push(`/companies/${companyId}/modules`)}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Menú
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Órdenes de Compra</h1>
            <p className="text-gray-500">Control y aprobación de órdenes de compra</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/companies/${companyId}/suppliers`)}
          >
            Proveedores
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/companies/${companyId}/purchases`)}
          >
            Compras
          </Button>
          <Button onClick={() => { resetForm(); setShowCreateModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva OC
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Órdenes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orders.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Borradores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'DRAFT').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Por Aprobar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'PENDING').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Aprobadas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'APPROVED').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Recibidas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'RECEIVED').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Buscar por número de orden o proveedor..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filtrar por estado" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="DRAFT">Borradores</SelectItem>
            <SelectItem value="PENDING">Pendientes</SelectItem>
            <SelectItem value="APPROVED">Aprobadas</SelectItem>
            <SelectItem value="RECEIVED">Recibidas</SelectItem>
            <SelectItem value="COMPLETED">Completadas</SelectItem>
            <SelectItem value="CANCELLED">Canceladas</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Listado de Órdenes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No se encontraron órdenes de compra.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Estado</th>
                    <th className="text-left py-3 px-4">Orden</th>
                    <th className="text-left py-3 px-4">Proveedor</th>
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-left py-3 px-4">Entrega Est.</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-center py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-4 font-medium">{order.order_number}</td>
                      <td className="py-3 px-4">{order.supplier?.name}</td>
                      <td className="py-3 px-4">
                        {new Date(order.order_date).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-4">
                        {order.expected_date 
                          ? new Date(order.expected_date).toLocaleDateString()
                          : '-'
                        }
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(order.total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex gap-1 justify-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedOrder(order); setShowViewModal(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canApprove(order) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedOrder(order); setShowApproveModal(true); }}
                            >
                              <CheckCircle className="w-4 h-4 text-green-600" />
                            </Button>
                          )}
                          {canReceive(order) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => { setSelectedOrder(order); setShowReceiveModal(true); }}
                            >
                              <Package className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Nueva Orden de Compra</DialogTitle>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="items">Artículos</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              <div className="space-y-2">
                <Label>Proveedor *</Label>
                <Select
                  value={selectedSupplier?.id || ''}
                  onValueChange={(value) => {
                    const supplier = suppliers.find(s => s.id === value);
                    setSelectedSupplier(supplier || null);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un proveedor" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((supplier) => (
                      <SelectItem key={supplier.id} value={supplier.id}>
                        {supplier.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de Orden</Label>
                  <Input
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder={generateOrderNumber()}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Fecha de Orden</Label>
                  <Input
                    type="date"
                    value={orderDate}
                    onChange={(e) => setOrderDate(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Fecha de Entrega Esperada</Label>
                <Input
                  type="date"
                  value={expectedDate}
                  onChange={(e) => setExpectedDate(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label>Notas</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Instrucciones especiales..."
                />
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4">
              <Card className="bg-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Agregar Artículo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-2">
                    <Label>Seleccionar Producto</Label>
                    <Select
                      value={newItem.product_id || ''}
                      onValueChange={selectProduct}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Buscar producto..." />
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
                    <Label>Descripción</Label>
                    <Input
                      value={newItem.product_name}
                      onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                      placeholder="Nombre del artículo"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="1"
                        value={newItem.quantity_requested}
                        onChange={(e) => setNewItem({ ...newItem, quantity_requested: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio Unit. Est.</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="flex items-end">
                      <Button onClick={addItem} className="w-full">
                        <Plus className="w-4 h-4 mr-1" />
                        Agregar
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2">Descripción</th>
                      <th className="text-center p-2">Cant.</th>
                      <th className="text-right p-2">P.Unit</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-center p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center p-4 text-gray-500">
                          No hay artículos agregados
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{item.product_name}</td>
                          <td className="p-2 text-center">{item.quantity_requested}</td>
                          <td className="p-2 text-right">{formatCurrency(item.unit_price * 100)}</td>
                          <td className="p-2 text-right font-medium">{formatCurrency(item.total * 100)}</td>
                          <td className="p-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                            >
                              <Trash2 className="w-4 h-4 text-red-500" />
                            </Button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(items.reduce((sum, i) => sum + i.total, 0) * 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ISV (15%):</span>
                  <span className="font-medium">{formatCurrency(items.reduce((sum, i) => sum + i.total, 0) * 15)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(items.reduce((sum, i) => sum + i.total, 0) * 115)}</span>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateModal(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={submitting || items.length === 0 || !selectedSupplier}>
              {submitting ? 'Guardando...' : 'Crear Orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Orden de Compra</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="flex justify-between items-start">
                {getStatusBadge(selectedOrder.status)}
                <div className="text-right">
                  <div className="text-sm text-gray-500">Orden</div>
                  <div className="font-mono text-lg">{selectedOrder.order_number}</div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Proveedor</Label>
                  <div className="font-medium">{selectedOrder.supplier?.name}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Fecha de Orden</Label>
                  <div>{new Date(selectedOrder.order_date).toLocaleDateString()}</div>
                </div>
              </div>

              {selectedOrder.expected_date && (
                <div>
                  <Label className="text-gray-500">Entrega Esperada</Label>
                  <div>{new Date(selectedOrder.expected_date).toLocaleDateString()}</div>
                </div>
              )}

              {selectedOrder.notes && (
                <div>
                  <Label className="text-gray-500">Notas</Label>
                  <div className="bg-gray-50 p-2 rounded">{selectedOrder.notes}</div>
                </div>
              )}

              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Artículos</h4>
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2">Descripción</th>
                      <th className="text-center p-2">Cant.</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">{item.product_name}</td>
                        <td className="p-2 text-center">{item.quantity_requested}</td>
                        <td className="p-2 text-right">{formatCurrency(item.total * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(selectedOrder.total)}</span>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>Cerrar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Approve Modal */}
      <Dialog open={showApproveModal} onOpenChange={setShowApproveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Aprobar Orden de Compra</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-4 rounded">
                <div className="font-medium">{selectedOrder.order_number}</div>
                <div className="text-sm text-gray-600">{selectedOrder.supplier?.name}</div>
                <div className="text-lg font-bold mt-2">{formatCurrency(selectedOrder.total)}</div>
              </div>

              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription>
                  Al aprobar esta orden, se autoriza al departamento de compras proceder con el pedido.
                </AlertDescription>
              </Alert>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowApproveModal(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={submitting} className="bg-green-600 hover:bg-green-700">
              <CheckCircle className="w-4 h-4 mr-2" />
              {submitting ? 'Aprobando...' : 'Aprobar Orden'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Receive Modal */}
      <Dialog open={showReceiveModal} onOpenChange={setShowReceiveModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Recibir Orden de Compra</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded">
                <div className="font-medium">{selectedOrder.order_number}</div>
                <div className="text-sm text-gray-600">{selectedOrder.supplier?.name}</div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <Package className="h-4 w-4 text-blue-600" />
                <AlertDescription>
                  Confirme que ha recibido la mercadería/servicio y que cumple con las especificaciones de la orden.
                </AlertDescription>
              </Alert>

              <p className="text-sm text-gray-600">
                Al recibir esta orden, podrá proceder a registrar la factura correspondiente en el módulo de Compras.
              </p>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReceiveModal(false)} disabled={submitting}>
              Cancelar
            </Button>
            <Button onClick={handleReceive} disabled={submitting} className="bg-purple-600 hover:bg-purple-700">
              <Package className="w-4 h-4 mr-2" />
              {submitting ? 'Procesando...' : 'Confirmar Recepción'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
