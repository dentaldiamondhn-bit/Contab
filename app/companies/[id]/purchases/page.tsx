'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Search, Plus, FileText, Calendar, CreditCard, AlertCircle, ChevronLeft, Trash2, Upload, Printer, Eye, Edit, BarChart3, Wallet, MoreHorizontal, Menu } from 'lucide-react';
import PaymentManager from '@/components/purchases/PaymentManager';

import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
interface Supplier {
  id: string;
  rtn: string;
  name: string;
  commercial_name?: string;
  supplier_type: string;
  payment_terms: number;
}

interface Product {
  id: string;
  code: string;
  name: string;
  unit_price: number;
  stock_quantity: number;
}

interface PurchaseItem {
  id?: string;
  product_id?: string;
  product_code?: string;
  product_name: string;
  description: string;
  quantity: number;
  unit_price: number;
  discount_percentage: number;
  discount_amount: number;
  subtotal: number;
  tax_rate: number;
  tax_amount: number;
  total: number;
}

interface Purchase {
  id: string;
  invoice_number: string;
  invoice_date: string;
  cai?: string;
  supplier: Supplier;
  total: number;
  status: string;
  is_credit: boolean;
  purchase_type: string;
  created_at: string;
}

export default function PurchasesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedPurchase, setSelectedPurchase] = useState<Purchase | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  // Form states
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [cai, setCai] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [isCredit, setIsCredit] = useState(false);
  const [dueDate, setDueDate] = useState('');
  const [purchaseType, setPurchaseType] = useState('merchandise');
  const [expenseCategory, setExpenseCategory] = useState('administrative');
  const [documentUrl, setDocumentUrl] = useState('');
  const [taxRate, setTaxRate] = useState(15);

  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [newItem, setNewItem] = useState<Partial<PurchaseItem>>({
    product_name: '',
    description: '',
    quantity: 1,
    unit_price: 0,
    discount_percentage: 0,
    tax_rate: 15,
  });

  const [caiError, setCaiError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const subtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.tax_amount, 0);
    const discountAmount = items.reduce((sum, item) => sum + item.discount_amount, 0);
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, discountAmount, total };
  }, [items]);

  const { subtotal, taxAmount, total } = calculateTotals();

  useEffect(() => {
    loadSuppliers();
    loadProducts();
    loadPurchases();
  }, [companyId]);

  useEffect(() => {
    if (selectedSupplier && isCredit) {
      const date = new Date(invoiceDate);
      date.setDate(date.getDate() + selectedSupplier.payment_terms);
      setDueDate(date.toISOString().split('T')[0]);
    }
  }, [selectedSupplier, isCredit, invoiceDate]);

  // Load selected purchase data into form when editing
  useEffect(() => {
    if (selectedPurchase && showEditModal) {
      console.log('Loading purchase data for editing:', selectedPurchase);
      
      // Set supplier
      const supplier = suppliers.find((s: any) => s.id === (selectedPurchase as any).supplier_id);
      setSelectedSupplier(supplier || null);
      
      // Set basic fields
      setInvoiceNumber(selectedPurchase.invoice_number || '');
      setCai(selectedPurchase.cai || '');
      setInvoiceDate(selectedPurchase.invoice_date || new Date().toISOString().split('T')[0]);
      setIsCredit(selectedPurchase.is_credit || false);
      setDueDate((selectedPurchase as any).due_date || '');
      setPurchaseType(selectedPurchase.purchase_type || 'merchandise');
      setExpenseCategory((selectedPurchase as any).expense_category || 'administrative');
      
      // Set items
      if ((selectedPurchase as any).items && (selectedPurchase as any).items.length > 0) {
        setItems((selectedPurchase as any).items);
      } else {
        setItems([{
          id: Date.now().toString(),
          product_name: '',
          description: '',
          quantity: 1,
          unit_price: 0,
          total: 0,
          discount_percentage: 0,
          discount_amount: 0,
          subtotal: 0,
          tax_rate: 15,
          tax_amount: 0
        }]);
      }
      
      console.log('Form data loaded for editing');
    }
  }, [selectedPurchase, showEditModal, suppliers]);

  const loadSuppliers = async () => {
    try {
      const res = await fetch(`/api/suppliers?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setSuppliers(data.filter((s: any) => s.is_active !== false));
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

  const loadPurchases = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchases?companyId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        console.log('Loaded purchases after update:', data);
        setPurchases(data);
      }
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setLoading(false);
    }
  };

  // Validate CAI format
  const validateCAI = (caiValue: string): boolean => {
    // CAI format for Honduras: XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-X
    // Should be 37 characters including dashes
    const cleanCAI = caiValue.replace(/-/g, '');
    return cleanCAI.length === 32;
  };

  const formatCAI = (value: string): string => {
    const clean = value.replace(/[^A-Z0-9]/gi, '').toUpperCase();
    const parts = [];
    for (let i = 0; i < clean.length && i < 32; i += 6) {
      parts.push(clean.slice(i, i + 6));
    }
    return parts.join('-');
  };

  const calculateItemValues = (item: Partial<PurchaseItem>): PurchaseItem => {
    const quantity = item.quantity || 0;
    const unitPrice = item.unit_price || 0;
    const discountPercentage = item.discount_percentage || 0;
    const itemTaxRate = item.tax_rate || taxRate;

    const grossSubtotal = quantity * unitPrice;
    const discountAmount = Math.round(grossSubtotal * (discountPercentage / 100));
    const subtotalValue = grossSubtotal - discountAmount;
    const taxAmountValue = Math.round(subtotalValue * (itemTaxRate / 100));
    const totalValue = subtotalValue + taxAmountValue;

    return {
      product_id: item.product_id,
      product_code: item.product_code,
      product_name: item.product_name || '',
      description: item.description || '',
      quantity,
      unit_price: unitPrice,
      discount_percentage: discountPercentage,
      discount_amount: discountAmount,
      subtotal: subtotalValue,
      tax_rate: itemTaxRate,
      tax_amount: taxAmountValue,
      total: totalValue,
    } as PurchaseItem;
  };

  const addItem = () => {
    if (!newItem.product_name || !newItem.quantity || !newItem.unit_price) {
      alert('Complete los datos del artículo');
      return;
    }

    const calculatedItem = calculateItemValues(newItem);
    setItems([...items, calculatedItem]);
    
    // Reset new item form
    setNewItem({
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: taxRate,
    });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const selectProduct = (productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      setNewItem({
        ...newItem,
        product_id: product.id,
        product_code: product.code,
        product_name: product.name,
        unit_price: product.unit_price || 0,
        quantity: 1,
        tax_rate: taxRate,
      });
    }
  };

  const handleSubmit = async () => {
    if (!selectedSupplier) {
      alert('Seleccione un proveedor');
      return;
    }

    if (!invoiceNumber) {
      alert('Ingrese el número de factura');
      return;
    }

    if (items.length === 0) {
      alert('Agregue al menos un artículo');
      return;
    }

    if (cai && !validateCAI(cai)) {
      setCaiError('El CAI debe tener 32 caracteres alfanuméricos (formato: XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-X)');
      return;
    }
    setCaiError('');

    setSubmitting(true);

    try {
      const { subtotal, taxAmount, total } = calculateTotals();

      const purchaseData = {
        supplier_id: selectedSupplier.id,
        invoice_number: invoiceNumber,
        cai: cai || null,
        invoice_date: invoiceDate,
        items: items.map(item => ({
          ...item,
          unit_price: Math.round(item.unit_price),
          subtotal: Math.round(item.subtotal),
          tax_amount: Math.round(item.tax_amount),
          total: Math.round(item.total),
        })),
        subtotal: Math.round(subtotal),
        tax_rate: taxRate,
        tax_amount: Math.round(taxAmount),
        total: Math.round(total),
        purchase_type: purchaseType,
        expense_category: purchaseType === 'expense' ? expenseCategory : null,
        document_url: documentUrl || null,
        is_credit: isCredit,
        due_date: isCredit ? dueDate : null,
        companyId,
      };

      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData),
      });

      if (res.ok) {
        const result = await res.json();
        alert('Compra registrada exitosamente');
        setShowCreateModal(false);
        resetForm();
        loadPurchases();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'No se pudo registrar la compra'));
      }
    } catch (error) {
      alert('Error al registrar la compra');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setSelectedSupplier(null);
    setInvoiceNumber('');
    setCai('');
    setInvoiceDate(new Date().toISOString().split('T')[0]);
    setIsCredit(false);
    setDueDate('');
    setPurchaseType('merchandise');
    setExpenseCategory('administrative');
    setDocumentUrl('');
    setTaxRate(15);
    setItems([]);
    setNewItem({
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 15,
    });
    setCaiError('');
  };

  const handleDeletePurchase = async (purchaseId: string) => {
    if (!confirm('¿Está seguro que desea eliminar esta compra? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const res = await fetch(`/api/purchases?id=${purchaseId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Compra eliminada exitosamente');
        loadPurchases();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'No se pudo eliminar la compra'));
      }
    } catch (error) {
      alert('Error al eliminar la compra');
    }
  };

  const handleEditPurchase = (purchase: Purchase) => {
    setSelectedPurchase(purchase);
    // Cargar los datos de la compra en el formulario
    const supplier = suppliers.find((s: any) => s.id === (purchase as any).supplier_id);
    setSelectedSupplier(supplier || null);
    setInvoiceNumber(purchase.invoice_number);
    setCai(purchase.cai || '');
    setInvoiceDate(purchase.invoice_date);
    setIsCredit(purchase.is_credit);
    setDueDate((purchase as any).due_date || '');
    setPurchaseType(purchase.purchase_type);
    setExpenseCategory((purchase as any).expense_category || 'administrative');
    setDocumentUrl((purchase as any).document_url || '');
    setTaxRate((purchase as any).tax_rate || 15);
    setItems((purchase as any).items || []);
    setShowEditModal(true);
  };

  const handleAddItem = () => {
    if (!newItem.product_name || !newItem.unit_price || !newItem.quantity) {
      alert('Complete todos los campos obligatorios del artículo');
      return;
    }

    const item: PurchaseItem = {
      product_name: newItem.product_name!,
      description: newItem.description || '',
      quantity: newItem.quantity || 1,
      unit_price: newItem.unit_price || 0,
      discount_percentage: newItem.discount_percentage || 0,
      discount_amount: 0,
      subtotal: (newItem.quantity || 1) * (newItem.unit_price || 0),
      tax_rate: taxRate,
      tax_amount: 0,
      total: 0,
    };

    // Calculate discount amount
    item.discount_amount = item.subtotal * (item.discount_percentage / 100);
    item.subtotal = item.subtotal - item.discount_amount;
    
    // Calculate tax and total
    item.tax_amount = item.subtotal * (item.tax_rate / 100);
    item.total = item.subtotal + item.tax_amount;

    setItems([...items, item]);
    setNewItem({
      product_name: '',
      description: '',
      quantity: 1,
      unit_price: 0,
      discount_percentage: 0,
      tax_rate: 15,
    });
  };

  const handleUpdatePurchase = async () => {
    if (!selectedSupplier) {
      alert('Seleccione un proveedor');
      return;
    }

    if (!invoiceNumber) {
      alert('Ingrese el número de factura');
      return;
    }

    if (items.length === 0) {
      alert('Agregue al menos un artículo');
      return;
    }

    if (cai && !validateCAI(cai)) {
      setCaiError('El CAI debe tener 32 caracteres alfanuméricos (formato: XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-X)');
      return;
    }
    setCaiError('');

    setSubmitting(true);

    try {
      const { subtotal, taxAmount, total } = calculateTotals();

      const purchaseData = {
        supplier_id: selectedSupplier.id,
        invoice_number: invoiceNumber,
        cai: cai || null,
        invoice_date: invoiceDate,
        items: items.map(item => ({
          ...item,
          unit_price: Math.round(item.unit_price),
          subtotal: Math.round(item.subtotal),
          tax_amount: Math.round(item.tax_amount),
          total: Math.round(item.total),
        })),
        subtotal: Math.round(subtotal),
        tax_rate: taxRate,
        tax_amount: Math.round(taxAmount),
        total: Math.round(total),
        purchase_type: purchaseType,
        expense_category: purchaseType === 'expense' ? expenseCategory : null,
        document_url: documentUrl || null,
        is_credit: isCredit,
        due_date: isCredit ? dueDate : null,
        companyId,
      };

      const res = await fetch(`/api/purchases?id=${selectedPurchase?.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(purchaseData),
      });

      if (res.ok) {
        const result = await res.json();
        alert('Compra actualizada exitosamente');
        console.log('About to call loadPurchases after successful update');
        setShowEditModal(false);
        setSelectedPurchase(null); // Clear selected purchase
        resetForm();
        loadPurchases();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'No se pudo actualizar la compra'));
      }
    } catch (error) {
      alert('Error al actualizar la compra');
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusBadge = (status: string, isCredit: boolean) => {
    if (isCredit) {
      if (status === 'PENDING') return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      if (status === 'PARTIAL') return <Badge className="bg-blue-100 text-blue-800">Parcial</Badge>;
      if (status === 'PAID') return <Badge className="bg-green-100 text-green-800">Pagada</Badge>;
    }
    return <Badge className="bg-green-100 text-green-800">Contado</Badge>;
  };

  const getPaymentStatusBadge = (status: string, balanceDue: number, total: number) => {
    if (balanceDue <= 0) {
      return <Badge className="bg-green-100 text-green-800">Pagada</Badge>;
    }
    if (balanceDue < total) {
      return <Badge className="bg-blue-100 text-blue-800">Parcial</Badge>;
    }
    return <Badge className="bg-red-100 text-red-800">Pendiente</Badge>;
  };

  const formatCurrency = (amount: number) => {
    return `L ${(amount / 100).toLocaleString('es-HN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Compras</h1>
          <p className="text-gray-500">Gestión de compras y facturas recibidas</p>
        </div>
        
        {/* Single Dropdown Menu - Same level as title */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-10 px-3">
              <Menu className="w-4 h-4 mr-2" />
              Menú
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" side="bottom" className="w-64" forceMount>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/modules`)}>
              <ChevronLeft className="w-4 h-4 mr-2" />
              Menú Principal
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/suppliers`)}>
              <FileText className="w-4 h-4 mr-2" />
              Proveedores
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/accounts-payable`)}>
              <CreditCard className="w-4 h-4 mr-2" />
              Ctas. por Pagar
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`/companies/${companyId}/purchases/dashboard`)}>
              <BarChart3 className="w-4 h-4 mr-2" />
              Dashboard de Compras
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => { resetForm(); setShowCreateModal(true); }} className="bg-blue-50 text-blue-700 hover:bg-blue-100">
              <Plus className="w-4 h-4 mr-2" />
              Nueva Compra
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Compras</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{purchases.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Este Mes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {formatCurrency(purchases
                .filter(p => new Date(p.invoice_date).getMonth() === new Date().getMonth())
                .reduce((sum, p) => sum + p.total, 0))}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">A Crédito</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchases.filter(p => p.is_credit).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Pendientes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {purchases.filter(p => p.is_credit && p.status === 'PENDING').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Buscar por número de factura, proveedor..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Purchases List */}
      <Card>
        <CardHeader>
          <CardTitle>Historial de Compras</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Cargando...</div>
          ) : purchases.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              No hay compras registradas. Registre una nueva compra para comenzar.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4">Factura</th>
                    <th className="text-left py-3 px-4">Fecha</th>
                    <th className="text-left py-3 px-4">Proveedor</th>
                    <th className="text-left py-3 px-4">CAI</th>
                    <th className="text-right py-3 px-4">Total</th>
                    <th className="text-center py-3 px-4">Tipo</th>
                    <th className="text-center py-3 px-4">Estado Pago</th>
                    <th className="text-center py-3 px-4">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {purchases
                    .filter(p => 
                      p.invoice_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                      p.supplier?.name?.toLowerCase().includes(searchTerm.toLowerCase())
                    )
                    .map((purchase) => (
                    <tr key={purchase.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4 font-medium">{purchase.invoice_number}</td>
                      <td className="py-3 px-4">{new Date(purchase.invoice_date).toLocaleDateString()}</td>
                      <td className="py-3 px-4">{purchase.supplier?.name}</td>
                      <td className="py-3 px-4 text-sm font-mono">
                        {purchase.cai ? purchase.cai.substring(0, 15) + '...' : '-'}
                      </td>
                      <td className="py-3 px-4 text-right font-medium">
                        {formatCurrency(purchase.total)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {purchase.is_credit ? (
                          <Badge className="bg-red-100 text-red-800 border-red-300">Crédito</Badge>
                        ) : (
                          <Badge className="bg-green-100 text-green-800 border-green-300">Contado</Badge>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {getPaymentStatusBadge(purchase.status, (purchase as any).balance_due, purchase.total)}
                      </td>
                      <td className="py-3 px-4 text-right relative">
                        <div className="flex justify-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" side="right" className="w-48" style={{ left: 'auto !important', right: '0 !important' }} forceMount>
                              <DropdownMenuItem onClick={() => { setSelectedPurchase(purchase); setShowViewModal(true); }}>
                                <Eye className="w-4 h-4 mr-2" />
                                Ver detalles
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedPurchase(purchase); setShowPaymentModal(true); }}>
                                <Wallet className="w-4 h-4 mr-2" />
                                Gestionar pagos
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => { setSelectedPurchase(purchase); setShowEditModal(true); }}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar compra
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => handleDeletePurchase(purchase.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Eliminar compra
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Registrar Nueva Compra</DialogTitle>
            <DialogDescription>
              Complete el formulario para registrar una nueva compra en el sistema.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="items">Artículos</TabsTrigger>
              <TabsTrigger value="payment">Pago</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              {/* Supplier Selection */}
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
                        {supplier.name} ({supplier.rtn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedSupplier && (
                  <div className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                    <span className="font-medium">RTN:</span> {selectedSupplier.rtn} | 
                    <span className="font-medium"> Términos:</span> {selectedSupplier.payment_terms} días
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Número de Factura *</Label>
                  <Input
                    value={invoiceNumber}
                    onChange={(e) => setInvoiceNumber(e.target.value)}
                    placeholder="001-001-000000001"
                  />
                </div>
                <div className="space-y-2">
                  <Label>CAI</Label>
                  <Input
                    value={cai}
                    onChange={(e) => setCai(formatCAI(e.target.value))}
                    placeholder="AAAAAA-BBBBBB-CCCCCC-DDDDDD-EEEEEE-F"
                    maxLength={37}
                  />
                  {caiError && (
                    <Alert variant="destructive" className="py-2">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="text-xs">{caiError}</AlertDescription>
                    </Alert>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Fecha de Factura</Label>
                  <Input
                    type="date"
                    value={invoiceDate}
                    onChange={(e) => setInvoiceDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Tipo de Compra</Label>
                  <Select
                    value={purchaseType}
                    onValueChange={setPurchaseType}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="merchandise">Mercadería (Inventario)</SelectItem>
                      <SelectItem value="expense">Gasto / Servicio</SelectItem>
                      <SelectItem value="asset">Activo Fijo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {purchaseType === 'expense' && (
                <div className="space-y-2">
                  <Label>Categoría de Gasto</Label>
                  <Select
                    value={expenseCategory}
                    onValueChange={setExpenseCategory}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="administrative">Gastos Administrativos</SelectItem>
                      <SelectItem value="sales">Gastos de Venta</SelectItem>
                      <SelectItem value="financial">Gastos Financieros</SelectItem>
                      <SelectItem value="operating">Gastos Operativos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="space-y-2">
                <Label>Tasa de ISV (%)</Label>
                <Select
                  value={taxRate.toString()}
                  onValueChange={(v) => setTaxRate(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="15">15%</SelectItem>
                    <SelectItem value="18">18%</SelectItem>
                    <SelectItem value="0">Exento (0%)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Documento Adjunto (URL)</Label>
                <Input
                  value={documentUrl}
                  onChange={(e) => setDocumentUrl(e.target.value)}
                  placeholder="https://... o ruta del archivo"
                />
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4">
              {/* Add New Item */}
              <Card className="bg-gray-50">
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm">Agregar Artículo</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {purchaseType === 'merchandise' && (
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
                              {product.code} - {product.name} (Stock: {product.stock_quantity})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label>Descripción *</Label>
                    <Input
                      value={newItem.product_name}
                      onChange={(e) => setNewItem({ ...newItem, product_name: e.target.value })}
                      placeholder="Nombre del artículo o servicio"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-3">
                    <div className="space-y-2">
                      <Label>Cantidad</Label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={newItem.quantity}
                        onChange={(e) => setNewItem({ ...newItem, quantity: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Precio Unit.</Label>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        value={newItem.unit_price}
                        onChange={(e) => setNewItem({ ...newItem, unit_price: parseFloat(e.target.value) || 0 })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Desc. %</Label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={newItem.discount_percentage}
                        onChange={(e) => setNewItem({ ...newItem, discount_percentage: parseFloat(e.target.value) || 0 })}
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

              {/* Items List */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="text-left p-2">Descripción</th>
                      <th className="text-center p-2">Cant.</th>
                      <th className="text-right p-2">P.Unit</th>
                      <th className="text-right p-2">Desc.</th>
                      <th className="text-right p-2">Subtotal</th>
                      <th className="text-right p-2">ISV</th>
                      <th className="text-right p-2">Total</th>
                      <th className="text-center p-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="text-center p-4 text-gray-500">
                          No hay artículos agregados
                        </td>
                      </tr>
                    ) : (
                      items.map((item, index) => (
                        <tr key={index} className="border-t">
                          <td className="p-2">{item.product_name}</td>
                          <td className="p-2 text-center">{item.quantity}</td>
                          <td className="p-2 text-right">{formatCurrency(item.unit_price * 100)}</td>
                          <td className="p-2 text-right">{item.discount_percentage}%</td>
                          <td className="p-2 text-right">{formatCurrency(item.subtotal * 100)}</td>
                          <td className="p-2 text-right">{formatCurrency(item.tax_amount * 100)}</td>
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

              {/* Totals */}
              <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal * 100)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ISV ({taxRate}%):</span>
                  <span className="font-medium">{formatCurrency(taxAmount * 100)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold border-t pt-2">
                  <span>TOTAL:</span>
                  <span>{formatCurrency(total * 100)}</span>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              <div className="space-y-2">
                <Label>Tipo de Pago</Label>
                <div className="flex gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={!isCredit}
                      onChange={() => setIsCredit(false)}
                    />
                    <span>Contado</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      checked={isCredit}
                      onChange={() => setIsCredit(true)}
                    />
                    <span>Crédito</span>
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
                  {selectedSupplier && (
                    <p className="text-sm text-gray-500">
                      Términos del proveedor: {selectedSupplier.payment_terms} días
                    </p>
                  )}
                </div>
              )}

              <Alert className="bg-blue-50 border-blue-200">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  {isCredit 
                    ? 'Esta compra generará una cuenta por pagar. El pago se registrará posteriormente.'
                    : 'Esta compra se pagará de inmediato. El asiento contable incluirá la salida de efectivo/banco.'
                  }
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowCreateModal(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || items.length === 0 || !selectedSupplier || !invoiceNumber}
            >
              {submitting ? 'Guardando...' : 'Registrar Compra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={showViewModal} onOpenChange={setShowViewModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Detalle de Compra</DialogTitle>
            <DialogDescription>
              Revisa los detalles de esta compra registrada.
            </DialogDescription>
          </DialogHeader>

          {selectedPurchase && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Factura</Label>
                  <div className="font-medium">{selectedPurchase.invoice_number}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Fecha</Label>
                  <div>{new Date(selectedPurchase.invoice_date).toLocaleDateString()}</div>
                </div>
              </div>

              <div>
                <Label className="text-gray-500">Proveedor</Label>
                <div className="font-medium">{(selectedPurchase as any).supplier_name || 'N/A'}</div>
                <div className="text-sm text-gray-600">ID: {(selectedPurchase as any).supplier_id}</div>
              </div>

              {selectedPurchase.cai && (
                <div>
                  <Label className="text-gray-500">CAI</Label>
                  <div className="font-mono text-sm">{selectedPurchase.cai}</div>
                </div>
              )}

              {/* Items Section */}
              <div className="border-t pt-4">
                <Label className="text-gray-500 mb-2 block">Artículos Comprados</Label>
                <div className="space-y-2">
                  {(selectedPurchase as any).items && (selectedPurchase as any).items.length > 0 ? (
                    (selectedPurchase as any).items.map((item: any, index: number) => (
                      <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                        <div className="flex-1">
                          <div className="font-medium">{item.product_name || item.description || 'Sin nombre'}</div>
                          <div className="text-sm text-gray-600">
                            {item.quantity} x {formatCurrency(item.unit_price)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium">{formatCurrency(item.total)}</div>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-gray-500 text-sm">No hay artículos registrados</div>
                  )}
                </div>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(selectedPurchase.total)}</span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowViewModal(false)}>
              Cerrar
            </Button>
            <Button variant="outline">
              <Printer className="w-4 h-4 mr-2" />
              Imprimir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Editar Compra</DialogTitle>
            <DialogDescription>
              Modifica los detalles de esta compra registrada.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="items">Artículos</TabsTrigger>
              <TabsTrigger value="payment">Pago</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-4">
              {/* Supplier Selection */}
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
                        {supplier.name} ({supplier.rtn})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Invoice Number */}
              <div className="space-y-2">
                <Label>Número de Factura *</Label>
                <Input
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  placeholder="Ej: INV-001"
                />
              </div>

              {/* CAI */}
              <div className="space-y-2">
                <Label>CAI (Opcional)</Label>
                <Input
                  value={cai}
                  onChange={(e) => setCai(e.target.value)}
                  placeholder="XXXXXX-XXXXXX-XXXXXX-XXXXXX-XXXXXX-X"
                  className={caiError ? "border-red-500" : ""}
                />
                {caiError && <p className="text-sm text-red-500">{caiError}</p>}
              </div>

              {/* Invoice Date */}
              <div className="space-y-2">
                <Label>Fecha de Factura *</Label>
                <Input
                  type="date"
                  value={invoiceDate}
                  onChange={(e) => setInvoiceDate(e.target.value)}
                />
              </div>

              {/* Purchase Type */}
              <div className="space-y-2">
                <Label>Tipo de Compra *</Label>
                <Select value={purchaseType} onValueChange={setPurchaseType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="merchandise">Mercancía</SelectItem>
                    <SelectItem value="service">Servicio</SelectItem>
                    <SelectItem value="expense">Gasto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="items" className="space-y-4">
              {/* Items Table */}
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Artículo</th>
                      <th className="text-left p-2">Descripción</th>
                      <th className="text-center p-2">Cantidad</th>
                      <th className="text-right p-2">Precio</th>
                      <th className="text-right p-2">Descuento</th>
                      <th className="text-right p-2">Subtotal</th>
                      <th className="text-center p-2">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, index) => (
                      <tr key={index} className="border-b">
                        <td className="p-2">{item.product_name}</td>
                        <td className="p-2">{item.description}</td>
                        <td className="p-2 text-center">{item.quantity}</td>
                        <td className="p-2 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="p-2 text-right">{item.discount_percentage}%</td>
                        <td className="p-2 text-right">{formatCurrency(item.total)}</td>
                        <td className="p-2 text-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              const newItems = items.filter((_, i) => i !== index);
                              setItems(newItems);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Add Item Form */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-4">Agregar Artículo</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Nombre del Artículo *</Label>
                    <Input
                      value={newItem.product_name || ''}
                      onChange={(e) => setNewItem({...newItem, product_name: e.target.value})}
                      placeholder="Ej: Laptop Dell"
                    />
                  </div>
                  <div>
                    <Label>Descripción</Label>
                    <Input
                      value={newItem.description || ''}
                      onChange={(e) => setNewItem({...newItem, description: e.target.value})}
                      placeholder="Descripción del producto"
                    />
                  </div>
                  <div>
                    <Label>Cantidad *</Label>
                    <Input
                      type="number"
                      value={newItem.quantity || 1}
                      onChange={(e) => setNewItem({...newItem, quantity: parseInt(e.target.value) || 1})}
                      min="1"
                    />
                  </div>
                  <div>
                    <Label>Precio Unitario *</Label>
                    <Input
                      type="number"
                      value={newItem.unit_price || 0}
                      onChange={(e) => setNewItem({...newItem, unit_price: parseFloat(e.target.value) || 0})}
                      min="0"
                      step="0.01"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <Button onClick={handleAddItem}>Agregar Artículo</Button>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="payment" className="space-y-4">
              {/* Credit/Cash Selection */}
              <div className="space-y-2">
                <Label>Tipo de Pago *</Label>
                <Select value={isCredit ? 'credit' : 'cash'} onValueChange={(value) => setIsCredit(value === 'credit')}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cash">Contado</SelectItem>
                    <SelectItem value="credit">Crédito</SelectItem>
                  </SelectContent>
                </Select>
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

              {/* Tax Rate */}
              <div className="space-y-2">
                <Label>Tasa de Impuesto (%)</Label>
                <Input
                  type="number"
                  value={taxRate}
                  onChange={(e) => setTaxRate(parseFloat(e.target.value) || 15)}
                  min="0"
                  max="100"
                  step="0.1"
                />
              </div>

              {/* Totals */}
              <div className="border-t pt-4 space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatCurrency(calculateTotals().subtotal)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Impuesto ({taxRate}%):</span>
                  <span>{formatCurrency(calculateTotals().taxAmount)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold">
                  <span>Total:</span>
                  <span>{formatCurrency(calculateTotals().total)}</span>
                </div>
              </div>

              <Alert className="bg-blue-50 border-blue-200">
                <CreditCard className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  {isCredit 
                    ? 'Esta compra generará una cuenta por pagar. El pago se registrará posteriormente.'
                    : 'Esta compra se pagará de inmediato. El asiento contable incluirá la salida de efectivo/banco.'
                  }
                </AlertDescription>
              </Alert>
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleUpdatePurchase}
              disabled={submitting || items.length === 0 || !selectedSupplier || !invoiceNumber}
            >
              {submitting ? 'Actualizando...' : 'Actualizar Compra'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Payment Manager Modal */}
      {selectedPurchase && (
        <PaymentManager
          purchase={selectedPurchase}
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          onPaymentUpdate={loadPurchases}
        />
      )}
    </div>
  );
}
