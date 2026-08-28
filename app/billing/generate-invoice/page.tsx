'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Receipt, 
  Calculator,
  ArrowLeft,
  Building2,
  Upload,
  Image as ImageIcon,
  X,
  Eye,
  Package,
  Search,
  DollarSign,
  Printer
} from 'lucide-react';
import { useTenant } from '@/lib/contexts/TenantContext';
import { createSupabaseClient } from '@/lib/supabase/client';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  taxRate: number;
  taxAmount: number;
}

interface Product {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  stock: number;
  minStock: number;
  maxStock: number;
  unitCost: number;
  unitPrice: number;
  price?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Customer {
  name: string;
  rtn: string;
  email: string;
  address: string;
  requireRtn?: boolean;
}

export default function GenerateInvoicePage() {
  const router = useRouter();
  const { currentTenant } = useTenant();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Customer information
  const [customer, setCustomer] = useState<Customer>({
    name: 'Consumidor Final',
    rtn: '',
    email: '',
    address: '',
    requireRtn: false
  });
  
  // Invoice items
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  // Inventory products
  const [products, setProducts] = useState<Product[]>([]);
  const [showInventorySelector, setShowInventorySelector] = useState(false);
  const [inventorySearch, setInventorySearch] = useState('');
  
  // Dates
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  
  // Notes
  const [notes, setNotes] = useState('');
  
  // Discount
  const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [discountValue, setDiscountValue] = useState(0);
  
  // Tax configuration
  const [enable15Tax, setEnable15Tax] = useState(true);
  const [enable18Tax, setEnable18Tax] = useState(false);
  const [customTaxes, setCustomTaxes] = useState<any[]>([]);
  
  // Invoice image
  const [invoiceImage, setInvoiceImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  // Preview mode
  const [showPreview, setShowPreview] = useState(false);

  const handlePrint = () => {
    const content = document.getElementById('invoice-preview');
    if (!content) return;
    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) return;
    printWindow.document.write(`
      <html><head><title>Factura</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; color: #000; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: left; font-size: 12px; }
        th { background: #f3f4f6; }
        .text-center { text-align: center; }
        .text-right { text-align: right; }
        .font-bold { font-weight: bold; }
        .text-xs { font-size: 11px; }
        .border-t { border-top: 1px solid #ccc; }
        .mt-4 { margin-top: 16px; }
        .mb-4 { margin-bottom: 16px; }
        .flex { display: flex; }
        .justify-between { justify-content: space-between; }
        .justify-end { justify-content: flex-end; }
        .py-1 { padding: 4px 0; }
        .py-2 { padding: 8px 0; }
        .p-3 { padding: 12px; }
        .grid { display: grid; }
        .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
        .gap-3 { gap: 12px; }
        .bg-gray-50 { background: #f9fafb; }
        .bg-gray-100 { background: #f3f4f6; }
        .rounded { border-radius: 4px; }
        .w-full { width: 100%; }
        @media print { body { padding: 0; } }
      </style></head><body>
      ${content.innerHTML}
      </body></html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => { printWindow.print(); }, 300);
  };

  // Get CAI info from localStorage
  const [caiInfo, setCaiInfo] = useState<any>(null);

  // Load CAI info and custom taxes from localStorage and API
  useEffect(() => {
    const loadData = async () => {
      try {
        // Load CAI info
        const savedCaiInfo = localStorage.getItem('caiInfo');
        if (savedCaiInfo) {
          const parsedCaiInfo = JSON.parse(savedCaiInfo);
          setCaiInfo(parsedCaiInfo);
          console.log('🔍 CAI info loaded:', parsedCaiInfo);
        }

        // Load custom taxes from API
        try {
          const response = await fetch('/api/taxes/custom');
          if (response.ok) {
            const { data: taxes } = await response.json();
            setCustomTaxes(taxes || []);
            console.log('🔍 Custom taxes loaded from API:', taxes);
          } else {
            console.log('⚠️ Error loading custom taxes from API');
          }
        } catch (apiError) {
          console.log('⚠️ API error, using empty custom taxes:', apiError);
          setCustomTaxes([]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
      }
    };

    loadData();
  }, []);

  const supabase = createSupabaseClient();

  useEffect(() => {
    // Load inventory products
    if (currentTenant) {
      loadInventory();
    }
  }, [currentTenant]);

  const loadInventory = async () => {
    if (!currentTenant) return;
    
    try {
      // Establecer tenant context
      await (supabase as any).rpc('set_tenant', { tenant_id: currentTenant.id });

      // Cargar productos activos
      const { data, error } = await supabase
        .from('Product')
        .select('*')
        .eq('isActive', true)
        .gt('stock', 0)
        .order('name');

      if (error) {
        console.error('Error loading inventory:', error);
      } else {
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Error loading inventory:', error);
    }
  };

  const addInventoryItem = (product: Product) => {
    const unitPrice = product.unitPrice || product.price || 0;
    const newItem: InvoiceItem = {
      id: `inv-${Date.now()}-${Math.random()}`,
      description: `${product.name} - ${product.description}`,
      quantity: 1,
      unitPrice: unitPrice,
      total: unitPrice
    };
    
    setItems([...items, newItem]);
    setShowInventorySelector(false);
    setInventorySearch('');
  };

  const filteredProducts = products.filter(product =>
    (product.name && product.name.toLowerCase().includes(inventorySearch.toLowerCase())) ||
    (product.code && product.code.toLowerCase().includes(inventorySearch.toLowerCase())) ||
    (product.category && product.category.toLowerCase().includes(inventorySearch.toLowerCase()))
  );

  // Calculate totals
  const subtotal = items.reduce((sum: number, item: InvoiceItem) => sum + item.total, 0);
  const tax = items.reduce((sum: number, item: InvoiceItem) => sum + item.taxAmount, 0);
  const discountAmount = discountType === 'percentage' ? subtotal * (discountValue / 100) : discountValue;
  const total = subtotal - discountAmount + tax;

  const addItem = () => {
    // Usar el primer impuesto personalizado disponible o 15% como defecto
    const defaultTaxRate = customTaxes.length > 0 ? customTaxes[0].rate : 0.15;
    
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0,
      taxRate: defaultTaxRate,
      taxAmount: 0
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalcular montos si cambia precio, cantidad o tasa de impuesto
        if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
          const itemSubtotal = updatedItem.quantity * updatedItem.unitPrice;
          updatedItem.taxAmount = itemSubtotal * updatedItem.taxRate;
          updatedItem.total = itemSubtotal; // Total sin impuestos
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleSubmit = async () => {
    if (!currentTenant) {
      setError('No hay empresa seleccionada');
      return;
    }

    if (!customer.name) {
      setError('Debe ingresar el nombre del cliente');
      return;
    }

    if (customer.requireRtn && !customer.rtn) {
      setError('Debe ingresar el RTN del cliente');
      return;
    }

    if (items.length === 0) {
      setError('Debe agregar al menos un item');
      return;
    }

    if (items.some(item => !item.description || item.unitPrice <= 0)) {
      setError('Todos los items deben tener descripción y precio válido');
      return;
    }

    try {
      setLoading(true);
      setError('');

      const response = await fetch('/api/admin/billing/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          tenantId: currentTenant?.id,
          customerName: customer.name || 'Consumidor Final',
          customerRtn: customer.rtn || '',
          customerEmail: customer.email,
          customerAddress: customer.address,
          items,
          issueDate,
          dueDate,
          notes,
          subtotal,
          tax,
          total,
          discountAmount,
          discountType,
          enable15Tax,
          enable18Tax,
          invoiceImage
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al guardar la factura');
      }

      const result = await response.json();
      setSuccess('Factura guardada exitosamente!');
      
      // Clear form
      setCustomer({ name: '', rtn: '', email: '', address: '', requireRtn: false });
      setItems([]);
      setNotes('');
      
      setTimeout(() => {
        router.push('/billing');
        // Force refresh after navigation to show new invoice
        setTimeout(() => {
          window.location.reload();
        }, 500);
      }, 2000);

    } catch (err: any) {
      console.error('Error saving invoice:', err);
      setError(err.message || 'Error al guardar la factura');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL'
    }).format(amount);
  };

  if (!currentTenant) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-4xl mx-auto">
          <Card className="text-center">
            <CardContent className="p-8">
              <Building2 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-gray-900 mb-2">
                No hay empresa seleccionada
              </h2>
              <Button onClick={() => router.push('/dashboard')} className="mt-4">
                Ir al Dashboard
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/billing')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver a Facturas
            </button>
          </div>
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Nueva Factura</h1>
              <p className="text-gray-600 mt-1">
                Generar factura para cliente de {currentTenant.businessName}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setShowPreview(!showPreview)}
                disabled={loading || items.length === 0}
                className="flex items-center gap-2"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? 'Ocultar Vista' : 'Vista Previa'}
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push('/billing')}
                disabled={loading}
              >
                Cancelar
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={loading}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
              >
                <Save className="w-4 h-4" />
                {loading ? 'Guardando...' : 'Guardar Factura'}
              </Button>
            </div>
          </div>
        </div>

        {/* Error/Success Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-700">{error}</p>
          </div>
        )}
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Customer Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              Información del Cliente
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre o Razón Social *
                </label>
                <input
                  type="text"
                  value={customer.name}
                  onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Empresa Cliente S.A."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  RTN {customer.requireRtn ? '*' : '(Opcional)'}
                </label>
                <input
                  type="text"
                  value={customer.rtn}
                  onChange={(e) => setCustomer({ ...customer, rtn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={customer.requireRtn ? "0801-XXXX-XXXXX" : "Opcional: 0801-XXXX-XXXXX"}
                  disabled={!customer.requireRtn}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo Electrónico
                </label>
                <input
                  type="email"
                  value={customer.email}
                  onChange={(e) => setCustomer({ ...customer, email: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="cliente@ejemplo.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dirección
                </label>
                <input
                  type="text"
                  value={customer.address}
                  onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Dirección del cliente"
                />
              </div>
            </div>
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                checked={customer.requireRtn}
                onChange={(e) => setCustomer({ ...customer, requireRtn: e.target.checked })}
                className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label className="ml-2 text-sm text-gray-600">
                Requerir RTN (marcar si el cliente necesita RTN)
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="w-5 h-5" />
              Fechas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Emisión
                </label>
                <input
                  type="date"
                  value={issueDate}
                  onChange={(e) => setIssueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Fecha de Vencimiento
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Items de la Factura
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setShowInventorySelector(!showInventorySelector)}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Package className="w-4 h-4" />
                  Inventario
                </Button>
                <Button
                  onClick={addItem}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Agregar Item
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Inventory Selector */}
            {showInventorySelector && (
              <div className="mb-6 p-4 border border-gray-200 rounded-lg bg-gray-50">
                <div className="flex items-center gap-2 mb-4">
                  <Search className="w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Buscar productos por nombre, código o categoría..."
                    value={inventorySearch}
                    onChange={(e) => setInventorySearch(e.target.value)}
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowInventorySelector(false)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                </div>
                
                <div className="max-h-64 overflow-y-auto">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-4 text-gray-500">
                      <Package className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No hay productos disponibles</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2">
                      {filteredProducts.map((product) => (
                        <div
                          key={product.id}
                          className="flex items-center justify-between p-3 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                          onClick={() => addInventoryItem(product)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm">{product.name}</span>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                {product.code}
                              </span>
                            </div>
                            <div className="text-xs text-gray-500 mt-1">
                              {product.category} • Stock: {product.stock} {product.unit}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {product.description}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="font-medium text-sm">
                              {formatCurrency(product.unitPrice || product.price || 0)}
                            </div>
                            <div className="text-xs text-gray-500">
                              /{product.unit}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="mb-2">No hay items agregados</p>
                <p className="text-sm mb-4">Agrega productos desde el inventario o crea items personalizados</p>
                <div className="flex gap-2 justify-center">
                  <Button
                    onClick={() => setShowInventorySelector(true)}
                    variant="outline"
                  >
                    <Package className="w-4 h-4 mr-2" />
                    Ver Inventario
                  </Button>
                  <Button
                    onClick={addItem}
                    variant="outline"
                  >
                    <Plus className="w-4 h-4 mr-2" />
                    Agregar Item Manual
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border border-gray-200 rounded-lg">
                    <div className="col-span-6">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Descripción
                      </label>
                      <input
                        type="text"
                        value={item.description}
                        onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="Descripción del servicio o producto"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Cantidad
                      </label>
                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        onChange={(e) => updateItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="0"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Precio Unitario
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                        placeholder="0.00"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Total
                      </label>
                      <div className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm font-medium">
                        {formatCurrency(item.total)}
                      </div>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Impuesto
                      </label>
                      <select
                        value={item.taxRate}
                        onChange={(e) => updateItem(item.id, 'taxRate', parseFloat(e.target.value))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      >
                        {customTaxes.map((tax: any) => (
                          <option key={tax.id} value={tax.rate}>
                            {tax.name} ({(tax.rate * 100).toFixed(1)}%)
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Acciones
                      </label>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="w-full"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Tax Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Configuración de Impuestos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ISV 15%
                  </label>
                  <div className="text-xs text-gray-500">
                    Impuesto sobre ventas al 15%
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enable15Tax}
                    onChange={(e) => setEnable15Tax(e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium">
                    {enable15Tax ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </div>
              <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    ISV 18%
                  </label>
                  <div className="text-xs text-gray-500">
                    Impuesto sobre ventas al 18%
                  </div>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={enable18Tax}
                    onChange={(e) => setEnable18Tax(e.target.checked)}
                    className="w-4 h-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <span className="ml-2 text-sm font-medium">
                    {enable18Tax ? 'Activado' : 'Desactivado'}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Discount */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="w-5 h-5" />
              Descuento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo de Descuento
                </label>
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as 'percentage' | 'fixed')}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="percentage">Porcentaje (%)</option>
                  <option value="fixed">Monto Fijo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {discountType === 'percentage' ? 'Porcentaje' : 'Monto'}
                </label>
                <input
                  type="number"
                  min="0"
                  max={discountType === 'percentage' ? 100 : undefined}
                  step={discountType === 'percentage' ? 0.1 : 0.01}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={discountType === 'percentage' ? '0.0' : '0.00'}
                />
              </div>
              <div className="flex items-end">
                <div className="text-right w-full">
                  <div className="text-sm text-gray-500">Descuento:</div>
                  <div className="font-medium text-lg">
                    {formatCurrency(discountAmount)}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Totals */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="w-5 h-5" />
              Totales
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex justify-end">
              <div className="w-full md:w-1/3">
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="font-medium">{formatCurrency(subtotal)}</span>
                </div>
                {discountAmount > 0 && (
                  <div className="flex justify-between py-2">
                    <span className="text-red-600">Descuento:</span>
                    <span className="font-medium text-red-600">-{formatCurrency(discountAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">Impuestos:</span>
                  <span className="font-medium">{formatCurrency(tax)}</span>
                </div>
                <div className="flex justify-between py-2 text-lg font-bold border-t border-gray-200">
                  <span>Total:</span>
                  <span>{formatCurrency(total)}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Notes */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Notas adicionales para la factura..."
            />
          </CardContent>
        </Card>

        {/* Invoice Image Upload */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Imagen de la Factura (Opcional)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!imagePreview ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setInvoiceImage(file);
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setImagePreview(reader.result as string);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="hidden"
                  id="invoice-image-upload"
                />
                <label
                  htmlFor="invoice-image-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <Upload className="w-12 h-12 text-gray-400 mb-3" />
                  <p className="text-gray-600 font-medium mb-1">
                    Click para subir imagen
                  </p>
                  <p className="text-sm text-gray-500">
                    PNG, JPG, JPEG (máx. 5MB)
                  </p>
                </label>
              </div>
            ) : (
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Vista previa de factura"
                  className="max-h-64 mx-auto rounded-lg border border-gray-200"
                />
                <button
                  onClick={() => {
                    setInvoiceImage(null);
                    setImagePreview(null);
                  }}
                  className="absolute top-2 right-2 bg-red-500 text-white p-2 rounded-full hover:bg-red-600 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <p className="text-center text-sm text-gray-500 mt-2">
                  {invoiceImage?.name}
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Invoice Preview */}
        {showPreview && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="w-5 h-5" />
                  Vista Previa de Factura
                </span>
                <Button variant="outline" size="sm" onClick={handlePrint} className="flex items-center gap-2">
                  <Printer className="w-4 h-4" />
                  Imprimir
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="border rounded-lg p-6 bg-white shadow-sm" id="invoice-preview">
                {/* Header */}
                <div className="text-center mb-6 border-b pb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {currentTenant?.businessName || 'Mi Empresa'}
                  </h2>
                  <p className="text-sm text-gray-600">RTN: {currentTenant?.businessRTN || 'CF'}</p>
                  <p className="text-sm text-gray-600">{currentTenant?.businessAddress || ''}</p>
                  <p className="text-sm text-gray-600">
                    {currentTenant?.businessEmail || ''} | {currentTenant?.phoneNumber || ''}
                  </p>
                  <h3 className="text-lg font-bold mt-4 text-gray-800 border-b-2 border-gray-800 inline-block px-4 pb-1">
                    FACTURA
                  </h3>
                </div>

                {/* CAI Info */}
                {caiInfo && (
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-4 bg-gray-50 p-3 rounded-lg">
                    <div>
                      <span className="font-semibold text-gray-600">CAI: </span>
                      <span className="text-gray-800">{caiInfo.cai || 'N/A'}</span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Rango: </span>
                      <span className="text-gray-800">
                        {String(caiInfo.rangeStart || 1).padStart(8, '0')} - {String(caiInfo.rangeEnd || 500).padStart(8, '0')}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">Fecha Limite: </span>
                      <span className="text-gray-800">
                        {caiInfo.expiryDate ? new Date(caiInfo.expiryDate).toLocaleDateString('es-HN') : 'N/A'}
                      </span>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">No. Factura: </span>
                      <span className="text-gray-800 font-mono">
                        001-001-01-{String(caiInfo.currentNumber || 1).padStart(8, '0')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Customer */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm mb-4 border rounded-lg p-3">
                  <div>
                    <span className="font-semibold text-gray-600">Cliente: </span>
                    <span className="text-gray-800">{customer.name || 'Consumidor Final'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">RTN: </span>
                    <span className="text-gray-800">{customer.rtn || 'CF'}</span>
                  </div>
                  <div>
                    <span className="font-semibold text-gray-600">Fecha: </span>
                    <span className="text-gray-800">{new Date().toLocaleDateString('es-HN')}</span>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-4">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-100 border">
                        <th className="text-left p-2 font-semibold">Cant.</th>
                        <th className="text-left p-2 font-semibold">Descripcion</th>
                        <th className="text-right p-2 font-semibold">P. Unitario</th>
                        <th className="text-right p-2 font-semibold">15%</th>
                        <th className="text-right p-2 font-semibold">18%</th>
                        <th className="text-right p-2 font-semibold">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.length === 0 ? (
                        <tr className="border">
                          <td colSpan={6} className="text-center p-4 text-gray-400 italic">
                            Agrega items a la factura...
                          </td>
                        </tr>
                      ) : (
                        items.map((item) => {
                          const tax15Amount = item.taxRate === 15 ? item.total * (15 / 115) : 0;
                          const tax18Amount = item.taxRate === 18 ? item.total * (18 / 118) : 0;
                          return (
                            <tr key={item.id} className="border">
                              <td className="p-2">{item.quantity}</td>
                              <td className="p-2">{item.description}</td>
                              <td className="p-2 text-right">{formatCurrency(item.unitPrice)}</td>
                              <td className="p-2 text-right">{tax15Amount > 0 ? formatCurrency(tax15Amount) : '-'}</td>
                              <td className="p-2 text-right">{tax18Amount > 0 ? formatCurrency(tax18Amount) : '-'}</td>
                              <td className="p-2 text-right font-medium">{formatCurrency(item.total)}</td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end">
                  <div className="w-full md:w-1/3 border rounded-lg p-3">
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-600">Subtotal:</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    {discountAmount > 0 && (
                      <div className="flex justify-between py-1 text-sm text-red-600">
                        <span>Descuento:</span>
                        <span>-{formatCurrency(discountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-600">ISV 15%:</span>
                      <span>{formatCurrency(items.reduce((sum, i) => sum + (i.taxRate === 15 ? i.unitPrice * i.quantity * 0.15 : 0), 0))}</span>
                    </div>
                    <div className="flex justify-between py-1 text-sm">
                      <span className="text-gray-600">ISV 18%:</span>
                      <span>{formatCurrency(items.reduce((sum, i) => sum + (i.taxRate === 18 ? i.unitPrice * i.quantity * 0.18 : 0), 0))}</span>
                    </div>
                    <div className="flex justify-between py-2 text-base font-bold border-t mt-1">
                      <span>Total:</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {notes && (
                  <div className="mt-4 text-sm border-t pt-3">
                    <span className="font-semibold text-gray-600">Notas: </span>
                    <span className="text-gray-700">{notes}</span>
                  </div>
                )}

                {/* Footer */}
                <div className="mt-6 text-center text-xs text-gray-500 border-t pt-3">
                  <p>Original: Cliente | Copia: Obligado Tributario Emisor</p>
                  <p>Sistema de Facturacion: ContabHN</p>
                  <p className="mt-1">Documento fiscal valido segun normativa SAR-HN</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={() => setShowPreview(!showPreview)}
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            {showPreview ? 'Ocultar Vista Previa' : 'Vista Previa'}
          </Button>
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => router.push('/billing')}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              {loading ? 'Guardando...' : 'Guardar Factura'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
