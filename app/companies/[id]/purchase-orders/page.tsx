'use client';

import { useState, useEffect, type ReactNode } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, FileText, CheckCircle, Clock, AlertCircle, ChevronLeft, Trash2, Edit, Eye, Send, Package, CheckSquare, XCircle } from 'lucide-react';

import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
// Aritmetica pura (0 imports): segura en pagina 'use client', igual que
// `validarMedidas` en inventario. NO importar aqui `product-measures`.
import { desglosarImpuesto } from '@/lib/services/measure-calc';
import { PurchaseOrderForm } from '@/components/purchasing/PurchaseOrderForm';
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
  price_includes_tax?: boolean;
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
  price_includes_tax?: boolean;
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
  status: 'DRAFT' | 'PENDING' | 'APPROVED' | 'PARTIALLY_RECEIVED' | 'RECEIVED' | 'COMPLETED' | 'CANCELLED';
  notes?: string;
  requested_by?: string;
  approved_by?: string;
  approved_at?: string;
  received_by?: string;
  received_at?: string;
  purchase_id?: string;
  cancellation_reason?: string;
  cancelled_by?: string;
  created_at?: string;
  updated_at?: string;
  items?: PurchaseOrderItem[];
  edits?: { id?: string; edited_by?: string | null; edited_at: string }[];
}

interface ReceiptLine {
  id: string;
  invoice_number: string;
  invoice_date?: string;
  cai?: string;
  purchase_id?: string;
  received_at?: string;
  items?: PurchaseOrderItem[];
}

export default function PurchaseOrdersPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  // Clerk no está configurado (faltan .env.local y ClerkProvider en el layout),
  // así que se usa un nombre vacío mientras se restaura la autenticación.
  const nombreActual = '';

  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<PurchaseOrder[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [loading, setLoading] = useState(true);

  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [orderNumberAuto, setOrderNumberAuto] = useState('');
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showReceiveModal, setShowReceiveModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<PurchaseOrder | null>(null);
  const [editingOrder, setEditingOrder] = useState<PurchaseOrder | null>(null);

  // Form states
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [orderNumber, setOrderNumber] = useState('');
  const [orderDate, setOrderDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedDate, setExpectedDate] = useState('');
  const [notes, setNotes] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [items, setItems] = useState<PurchaseOrderItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<PurchaseOrderItem>>({
    product_name: '',
    quantity_requested: 1,
    unit_price: 0,
    price_includes_tax: false,
  });

  const [submitting, setSubmitting] = useState(false);

  // Recepción: datos de la factura que se registra al crear la compra real.
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [cai, setCai] = useState('');
  const [isCredit, setIsCredit] = useState(false);
  const [dueDate, setDueDate] = useState('');
  // Recepción parcial: cantidad de ESTA entrega por línea (id de PurchaseOrderItem).
  const [receivedQuantities, setReceivedQuantities] = useState<Record<string, number>>({});

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
        setSuppliers(data.filter((s: any) => s.supplier_type === 'merchandise'));
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

  // Totales de la orden desglosados LINEA por LINEA: si el articulo trae el
  // precio con ISV adentro (`price_includes_tax`), el importe tecleado manda y
  // el 15% se extrae de adentro; si no, se suma encima. Lo usan el cuerpo del
  // POST/PATCH y el pie del modal, para que siempre cuadren igual.
  const TASA_ISV = 15;
  const desgloseDeItems = (lista: PurchaseOrderItem[]) =>
    lista.reduce(
      (acc, it) => {
        const d = desglosarImpuesto(it.total || 0, TASA_ISV, !!it.price_includes_tax, 2);
        acc.base += d.base;
        acc.impuesto += d.impuesto;
        acc.total += d.total;
        return acc;
      },
      { base: 0, impuesto: 0, total: 0 }
    );

  const handleCreate = async () => {
    if (!selectedSupplier || items.length === 0) {
      alert('Seleccione un proveedor y agregue al menos un artículo');
      return;
    }

    setSubmitting(true);

    try {
      const orderNum = orderNumber || orderNumberAuto || generateOrderNumber();
      const desglose = desgloseDeItems(items);
      const subtotal = Math.round(desglose.base);
      const taxAmount = Math.round(desglose.impuesto);
      const total = Math.round(desglose.total);

      const isEditing = !!editingOrder;
      const url = isEditing
        ? `/api/purchase-orders?companyId=${companyId}`
        : `/api/purchase-orders?companyId=${companyId}`;
      const method = isEditing ? 'PATCH' : 'POST';

      const body = {
        ...(isEditing ? { id: editingOrder.id } : {}),
        order_number: orderNum,
        supplier_id: selectedSupplier.id,
        order_date: orderDate,
        expected_date: expectedDate || null,
        subtotal,
        tax_amount: taxAmount,
        total,
        notes: notes || null,
        requested_by: requestedBy || null,
        items: items.map(item => ({
          ...item,
          unit_price: Math.round(item.unit_price),
          total: Math.round(item.total),
        })),
        companyId,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        alert(isEditing ? 'Orden de compra actualizada exitosamente' : 'Orden de compra creada exitosamente');
        setShowCreateModal(false);
        setEditingOrder(null);
        resetForm();
        await loadOrders();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || (isEditing ? 'No se pudo actualizar la orden' : 'No se pudo crear la orden')));
      }
    } catch (error) {
      alert(editingOrder ? 'Error al actualizar orden de compra' : 'Error al crear orden de compra');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedOrder) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-orders?companyId=${companyId}`, {
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
        await loadOrders();
      } else {
        const error = await res.json().catch(() => ({}));
        alert('Error: ' + (error.error || 'No se pudo aprobar la orden'));
      }
    } catch (error) {
      alert('Error al aprobar orden');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelOrder = async (order: PurchaseOrder) => {
    const reason = window.prompt('Ingrese el motivo de cancelación (obligatorio):');
    if (!reason || reason.trim() === '') {
      alert('El motivo de cancelación es obligatorio');
      return;
    }
    if (!window.confirm(`¿Está seguro de cancelar la orden ${order.order_number}?`)) return;

    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-orders?companyId=${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: order.id,
          status: 'CANCELLED',
          cancellation_reason: reason.trim(),
        }),
      });

      if (res.ok) {
        alert('Orden cancelada exitosamente');
        await loadOrders();
      } else {
        const error = await res.json().catch(() => ({}));
        alert('Error: ' + (error.error || 'No se pudo cancelar la orden'));
      }
    } catch (error) {
      alert('Error al cancelar orden');
    } finally {
      setSubmitting(false);
    }
  };

  const openReceiveModal = (order: PurchaseOrder) => {
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setCai('');
    setIsCredit(false);
    setDueDate('');
    const inicial: Record<string, number> = {};
    for (const it of order.items || []) {
      if (!it.id) continue;
      inicial[it.id] = Math.max(0, (it.quantity_requested || 0) - (it.quantity_received || 0));
    }
    setReceivedQuantities(inicial);
    setSelectedOrder(order);
    setShowReceiveModal(true);
  };

  const handleReceive = async () => {
    if (!selectedOrder) return;

    if (!invoiceNumber.trim()) {
      alert('Ingrese el número de factura');
      return;
    }

    // Solo se envían las líneas con cantidad en ESTA entrega. Una orden sin
    // artículos se recibe por los totales de la cabecera (lo resuelve el backend).
    const tieneItems = (selectedOrder.items || []).length > 0;
    const lineas = (selectedOrder.items || [])
      .filter((it) => it.id && (receivedQuantities[it.id] || 0) > 0)
      .map((it) => ({ purchase_order_item_id: it.id!, quantity_received: receivedQuantities[it.id!] }));

    if (tieneItems && lineas.length === 0) {
      alert('Indique al menos una cantidad a recibir');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/purchase-orders/receive?companyId=${companyId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedOrder.id,
          invoice_number: invoiceNumber.trim(),
          invoice_date: invoiceDate,
          cai: cai.trim() || null,
          is_credit: isCredit,
          due_date: isCredit ? dueDate || null : null,
          items: lineas,
        }),
      });

      if (res.ok) {
        const data = await res.json().catch(() => ({}));
        alert(
          data?.order?.status === 'PARTIALLY_RECEIVED'
            ? 'Recepción parcial registrada. La orden sigue pendiente de más entregas.'
            : 'Orden recibida y compra registrada. Puede verla en el módulo de Compras.'
        );
        setShowReceiveModal(false);
        setSelectedOrder(null);
        await loadOrders();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'No se pudo recibir la orden'));
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
    setItems([...items, { ...newItem, total, price_includes_tax: !!newItem.price_includes_tax } as PurchaseOrderItem]);
    
    setNewItem({
      product_name: '',
      quantity_requested: 1,
      unit_price: 0,
      price_includes_tax: false,
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Editar una linea ya agregada: cantidad, precio o el flag de ISV. El total
  // de la fila se recalcula siempre desde cantidad x precio.
  const updateItem = (index: number, patch: Partial<PurchaseOrderItem>) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== index) return it;
        const next = { ...it, ...patch };
        next.total = (next.quantity_requested || 0) * (next.unit_price || 0);
        return next;
      })
    );
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
        price_includes_tax: !!product.price_includes_tax,
      });
    }
  };

  // Al escoger proveedor, precarga los articulos que ese proveedor suministra
  // desde su historial de precios (`supplier_price_history`), con el ultimo
  // precio registrado por producto. El GET ya viene ordenado por
  // `effective_date` descendente, asi que basta con quedarse con la primera
  // aparicion de cada `product_id`. Solo se ofrecen productos que sigan
  // existiendo en el inventario de esta empresa (la ruta esta aislada por
  // `company_id`). No hay relacion directa proveedor -> articulos: esta es la
  // unica fuente disponible.
  const articulosDelProveedor = async (supplier: Supplier): Promise<PurchaseOrderItem[]> => {
    try {
      const res = await fetch(
        `/api/suppliers/price-history?companyId=${companyId}&supplierId=${supplier.id}`
      );
      if (!res.ok) return [];
      const historial = await res.json();
      if (!Array.isArray(historial)) return [];

      const vistos = new Set<string>();
      const nuevos: PurchaseOrderItem[] = [];
      for (const row of historial) {
        const productId = row.product_id ? String(row.product_id) : '';
        if (!productId || vistos.has(productId)) continue;
        const product = products.find(p => p.id === productId);
        if (!product) continue;
        vistos.add(productId);
        const unitPrice = Number(row.price) || 0;
        nuevos.push({
          product_id: product.id,
          product_code: product.code,
          product_name: product.name,
          quantity_requested: 1,
          unit_price: unitPrice,
          total: Math.round(unitPrice),
          price_includes_tax: !!product.price_includes_tax,
        });
      }
      return nuevos;
    } catch (error) {
      console.error('Error cargando articulos del proveedor:', error);
      return [];
    }
  };

  const handleSupplierChange = async (value: string) => {
    const supplier = suppliers.find(s => s.id === value) || null;
    setSelectedSupplier(supplier);
    if (!supplier) return;

    const nuevos = await articulosDelProveedor(supplier);
    if (nuevos.length === 0) return;

    if (
      items.length > 0 &&
      !window.confirm(
        'Este proveedor tiene artículos en su historial de precios. ¿Reemplazar los artículos actuales de la orden?'
      )
    ) {
      return;
    }

    setItems(nuevos);
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setOrderNumber('');
    setOrderDate(new Date().toISOString().split('T')[0]);
    setExpectedDate('');
    setNotes('');
    setRequestedBy(nombreActual);
    setItems([]);
    setNewItem({
      product_name: '',
      quantity_requested: 1,
      unit_price: 0,
      price_includes_tax: false,
    });
    setInvoiceNumber('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setCai('');
    setIsCredit(false);
    setDueDate('');
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; className: string; icon: any }> = {
      DRAFT: { label: 'Borrador', className: 'bg-gray-100 text-gray-800', icon: FileText },
      PENDING: { label: 'Pendiente', className: 'bg-yellow-100 text-yellow-800', icon: Clock },
      APPROVED: { label: 'Aprobada', className: 'bg-cyan-100 text-cyan-800', icon: CheckCircle },
      PARTIALLY_RECEIVED: { label: 'Parcialmente recibida', className: 'bg-amber-100 text-amber-800', icon: Package },
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
  const canReceive = (order: PurchaseOrder) => {
    if (!['APPROVED', 'PARTIALLY_RECEIVED'].includes(order.status)) return false;
    const items = order.items || [];
    if (items.length === 0) return order.status === 'APPROVED';
    return items.some((it) => (it.quantity_requested || 0) > (it.quantity_received || 0));
  };
  const canCancel = (order: PurchaseOrder) =>
    !['COMPLETED', 'CANCELLED', 'RECEIVED', 'PARTIALLY_RECEIVED'].includes(order.status);

  const canEdit = (order: PurchaseOrder) => order.status === 'DRAFT';

  const openEditModal = (order: PurchaseOrder) => {
    setEditingOrder(order);
    setSelectedOrder(order);
    setShowCreateModal(true);
    setActiveTab('general');
    setSelectedSupplier(order.supplier);
    setOrderNumber(order.order_number || '');
    setOrderDate(order.order_date);
    setExpectedDate(order.expected_date || '');
    setNotes(order.notes || '');
    setRequestedBy(order.requested_by || nombreActual);
    setItems(order.items ? order.items.map((item: any) => ({
      product_id: item.product_id || '',
      product_code: item.product_code || '',
      product_name: item.product_name,
      quantity_requested: item.quantity_requested || 1,
      unit_price: item.unit_price || 0,
      total: item.total || 0,
      price_includes_tax: !!item.price_includes_tax,
    })) : []);
  };

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
          <Button
            variant="outline"
            onClick={() => router.push(`/companies/${companyId}/purchase-orders/conciliation`)}
          >
            Conciliación
          </Button>
          <Button onClick={() => { resetForm(); setEditingOrder(null); setShowCreateModal(true); }}>
            <Plus className="w-4 h-4 mr-2" />
            Nueva OC
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
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
            <CardTitle className="text-sm font-medium text-gray-600">Parciales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {orders.filter(o => o.status === 'PARTIALLY_RECEIVED').length}
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
            <SelectItem value="PARTIALLY_RECEIVED">Parcialmente recibidas</SelectItem>
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
                    <th className="text-left py-3 px-4">Solicitado por</th>
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
                        {formatCurrency(order.total * 100)}
                      </td>
                      <td className="py-3 px-4">
                        {order.requested_by || 'N/A'}
                      </td>
<td className="py-3 px-4 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => { setSelectedOrder(order); setShowViewModal(true); }}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {canEdit(order) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openEditModal(order)}
                            >
                              <Edit className="w-4 h-4 text-blue-600" />
                            </Button>
                          )}
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
                              onClick={() => openReceiveModal(order)}
                            >
                              <Package className="w-4 h-4 text-cyan-600" />
                            </Button>
                          )}
                          {canCancel(order) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCancelOrder(order)}
                              disabled={submitting}
                            >
                              <XCircle className="w-4 h-4 text-red-600" />
                            </Button>
                          )}
                        </td>
                      </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create Modal using PurchaseOrderForm component */}
      <PurchaseOrderForm
        companyId={companyId}
        suppliers={suppliers}
        products={products}
        initialOrder={editingOrder}
        isEditing={!!editingOrder}
        open={showCreateModal}
        onSave={async () => {
          alert(editingOrder ? 'Orden de compra actualizada exitosamente' : 'Orden de compra creada exitosamente');
          resetForm();
          await loadOrders();
        }}
        onCancel={() => {
          setShowCreateModal(false);
          setEditingOrder(null);
        }}
      />

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
                      <th className="text-center p-2">Pedido</th>
                      <th className="text-center p-2">Recibido</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOrder.items?.map((item, idx) => (
                      <tr key={idx} className="border-t">
                        <td className="p-2">
                          {item.product_name}
                          {item.price_includes_tax && (
                            <span className="ml-2 text-[10px] uppercase text-cyan-700 bg-cyan-50 px-1.5 py-0.5 rounded">
                              ISV inc.
                            </span>
                          )}
                        </td>
                        <td className="p-2 text-center">{item.quantity_requested}</td>
                        <td className="p-2 text-center">{item.quantity_received || 0}</td>
                        <td className="p-2 text-right">{formatCurrency(item.total * 100)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Workflow</h4>
                <div className="space-y-0">
                  <WorkflowStep
                    icon={<FileText className="w-4 h-4" />}
                    title="Creada"
                    done={true}
                    detail={
                      <>
                        {new Date(selectedOrder.created_at || selectedOrder.order_date).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })}
                        {selectedOrder.requested_by && <span className="text-gray-500"> — Solicitada por {selectedOrder.requested_by}</span>}
                      </>
                    }
                  />
                  {(selectedOrder.edits || []).map((ed, i) => (
                    <WorkflowStep
                      key={ed.id || i}
                      icon={<Edit className="w-4 h-4" />}
                      title="Modificada"
                      done={true}
                      detail={
                        <>
                          {ed.edited_at && new Date(ed.edited_at).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })}
                          {ed.edited_by && <span className="text-gray-500"> — Modificada por {ed.edited_by}</span>}
                        </>
                      }
                    />
                  ))}
                  <WorkflowStep
                    icon={<CheckCircle className="w-4 h-4" />}
                    title="Aprobada"
                    done={!!selectedOrder.approved_at}
                    detail={selectedOrder.approved_at
                      ? <>
                          {new Date(selectedOrder.approved_at).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })}
                          {selectedOrder.approved_by && <span className="text-gray-500"> — Aprobada por {selectedOrder.approved_by}</span>}
                        </>
                      : <span className="text-gray-400">Pendiente de aprobación</span>
                    }
                  />
                  <WorkflowStep
                    icon={<Package className="w-4 h-4" />}
                    title="Recibida"
                    done={selectedOrder.status === 'RECEIVED' || selectedOrder.status === 'COMPLETED'}
                    partial={selectedOrder.status === 'PARTIALLY_RECEIVED'}
                    detail={
                      selectedOrder.status === 'PARTIALLY_RECEIVED'
                        ? <span className="text-amber-600">Recepción parcial — aún pendiente</span>
                        : selectedOrder.received_at
                          ? <>
                              {new Date(selectedOrder.received_at).toLocaleString('es-HN', { dateStyle: 'medium', timeStyle: 'short' })}
                              {selectedOrder.received_by && <span className="text-gray-500"> — Recibida por {selectedOrder.received_by}</span>}
                            </>
                          : <span className="text-gray-400">Pendiente de recepción</span>
                    }
                  />
                  {(selectedOrder.status === 'CANCELLED' || selectedOrder.cancellation_reason) && (
                    <WorkflowStep
                      icon={<XCircle className="w-4 h-4" />}
                      title="Cancelada"
                      done={true}
                      danger={true}
                      detail={
                        <span className="text-red-600">
                          {selectedOrder.cancelled_by ? `Cancelada por ${selectedOrder.cancelled_by} — ` : ''}
                          {selectedOrder.cancellation_reason
                            ? `Motivo: ${selectedOrder.cancellation_reason}`
                            : 'Sin motivo registrado'}
                        </span>
                      }
                    />
                  )}
                </div>
              </div>

              <div className="border-t pt-4 flex justify-between text-lg font-bold">
                <span>Total:</span>
                <span>{formatCurrency(selectedOrder.total * 100)}</span>
              </div>

              {canCancel(selectedOrder) && (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={async () => {
                      const reason = window.prompt('Ingrese el motivo de cancelación (obligatorio):');
                      if (!reason || reason.trim() === '') {
                        alert('El motivo de cancelación es obligatorio');
                        return;
                      }
                      if (window.confirm('¿Está seguro de cancelar esta orden de compra?')) {
                        const res = await fetch(`/api/purchase-orders?companyId=${companyId}`, {
                          method: 'PATCH',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            id: selectedOrder.id,
                            status: 'CANCELLED',
                            cancellation_reason: reason.trim(),
                          }),
                        });
                        if (res.ok) {
                          alert('Orden cancelada exitosamente');
                          setShowViewModal(false);
                          await loadOrders();
                        } else {
                          const error = await res.json();
                          alert('Error: ' + (error.error || 'No se pudo cancelar la orden'));
                        }
                      }
                    }}
                  >
                    Cancelar Orden
                  </Button>
                </div>
              )}

              {canEdit(selectedOrder) && (
                <div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowViewModal(false);
                      openEditModal(selectedOrder);
                    }}
                  >
                    Modificar Orden
                  </Button>
                </div>
              )}

              {selectedOrder.purchase_id && (
                <div className="border-t pt-4 space-y-2">
                  <Badge className="bg-green-100 text-green-800">
                    <CheckSquare className="w-3 h-3 mr-1" />
                    Compra registrada
                  </Badge>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => router.push(`/companies/${companyId}/purchases`)}
                  >
                    Ver en el módulo de Compras
                  </Button>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => router.push(`/companies/${companyId}/purchase-orders/conciliation?orderId=${selectedOrder?.id || ''}`)}
            >
              Ver conciliación
            </Button>
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
              <div className="bg-cyan-50 p-4 rounded">
                <div className="font-medium">{selectedOrder.order_number}</div>
                <div className="text-sm text-gray-600">{selectedOrder.supplier?.name}</div>
                <div className="text-lg font-bold mt-2">{formatCurrency(selectedOrder.total * 100)}</div>
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
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Recibir Orden de Compra</DialogTitle>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              <div className="bg-purple-50 p-4 rounded">
                <div className="font-medium">{selectedOrder.order_number}</div>
                <div className="text-sm text-gray-600">{selectedOrder.supplier?.name}</div>
                <div className="text-lg font-bold mt-1">{formatCurrency(selectedOrder.total * 100)}</div>
              </div>

              <Alert className="bg-cyan-50 border-cyan-200">
                <Package className="h-4 w-4 text-cyan-600" />
                <AlertDescription>
                  Al confirmar, se registra la compra en el módulo de Compras (artículos, stock, historial y asiento) y se enlaza a esta orden. Puede recibir la orden completa o solo una parte; si queda pendiente, la orden pasa a "Parcialmente recibida".
                </AlertDescription>
              </Alert>

              {(selectedOrder.items || []).length > 0 && (
                <div className="border rounded-lg overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="text-left p-2">Artículo</th>
                        <th className="text-center p-2">Pedido</th>
                        <th className="text-center p-2">Recibido</th>
                        <th className="text-center p-2">Esta entrega</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(selectedOrder.items || []).map((it) => {
                        const pendiente = Math.max(0, (it.quantity_requested || 0) - (it.quantity_received || 0));
                        return (
                          <tr key={it.id} className="border-t">
                            <td className="p-2">{it.product_name}</td>
                            <td className="p-2 text-center">{it.quantity_requested}</td>
                            <td className="p-2 text-center">{it.quantity_received || 0}</td>
                            <td className="p-2 text-center">
                              <Input
                                type="number"
                                min="0"
                                max={pendiente}
                                className="w-24 mx-auto"
                                value={receivedQuantities[it.id!] ?? 0}
                                onChange={(e) =>
                                  setReceivedQuantities({
                                    ...receivedQuantities,
                                    [it.id!]: Math.max(0, Math.min(pendiente, parseInt(e.target.value) || 0)),
                                  })
                                }
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="border-t pt-4 space-y-3">
                <div className="space-y-2">
                  <Label>Número de Factura *</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="FACT-0001 o correlativo del CAI"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>Fecha de Factura</Label>
                    <Input
                      type="date"
                      value={invoiceDate}
                      onChange={(e) => setInvoiceDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>CAI</Label>
                    <Input
                      value={cai}
                      onChange={(e) => setCai(e.target.value)}
                      placeholder="Opcional"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Forma de Pago</Label>
                  <div className="flex gap-3">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={!isCredit}
                        onChange={() => setIsCredit(false)}
                      />
                      Contado
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        checked={isCredit}
                        onChange={() => setIsCredit(true)}
                      />
                      Crédito
                    </label>
                  </div>
                </div>

                {isCredit && (
                  <div className="space-y-2">
                    <Label>Fecha de Vencimiento</Label>
                    <Input
                      type="date"
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                    />
                  </div>
                )}
              </div>
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

function WorkflowStep({ icon, title, done, partial, danger, detail }: {
  icon: ReactNode;
  title: string;
  done: boolean;
  partial?: boolean;
  danger?: boolean;
  detail: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 ${
          danger
            ? 'bg-red-100 border-red-500 text-red-600'
            : done
              ? partial
                ? 'bg-amber-100 border-amber-500 text-amber-600'
                : 'bg-green-100 border-green-500 text-green-600'
              : 'bg-gray-100 border-gray-300 text-gray-400'
        }`}>
          {icon}
        </div>
        <div className="w-0.5 h-6 bg-gray-200 last:hidden" />
      </div>
      <div className="pb-2">
        <div className="font-medium text-sm">{title}</div>
        <div className="text-xs text-gray-600">{detail}</div>
      </div>
    </div>
  );
}
