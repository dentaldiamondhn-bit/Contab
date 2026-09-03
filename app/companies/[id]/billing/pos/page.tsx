'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
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
  Save,
  Plus,
  Trash2,
  Receipt,
  CreditCard,
  DollarSign,
  Search,
  AlertTriangle,
  CheckCircle,
  FileText,
  Calculator,
  User,
  Calendar,
  Clock,
  QrCode
} from 'lucide-react';
import PaymentLinkGenerator from '@/components/billing/PaymentLinkGenerator';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
interface InvoiceItem {
  id: string;
  productId?: string;
  code: string;
  name: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // 0, 15, or 18
  discount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

interface Customer {
  id: string;
  rtn: string;
  name: string;
  email?: string;
  phone?: string;
  creditLimit?: number;
  currentDebt?: number;
}

interface CAIInfo {
  cai: string;
  currentNumber: number;
  finalNumber: number;
  issueDate: string;
  expirationDate: string;
  daysRemaining: number;
}

export default function POSPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [caiInfo, setCaiInfo] = useState<CAIInfo | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [showProductSearch, setShowProductSearch] = useState<{index: number, search: string} | null>(null);
  
  const [customer, setCustomer] = useState<Partial<Customer>>({
    rtn: '',
    name: ''
  });

  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([
    { id: '1', code: '', name: '', quantity: 1, unitPrice: 0, taxRate: 15, discount: 0, subtotal: 0, taxAmount: 0, total: 0 }
  ]);

  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'transfer'>('cash');
  const [cardConfirmation, setCardConfirmation] = useState('');
  const [transferReference, setTransferReference] = useState('');
  const [showPaymentLink, setShowPaymentLink] = useState(false);
  const [lastInvoiceId, setLastInvoiceId] = useState<string>('');

  const loadCAIInfo = async () => {
    try {
      const response = await fetch(`/api/billing/cai?tenantId=${companyId}`);
      if (response.ok) {
        const data = await response.json();
        setCaiInfo(data);
      }
    } catch (error) {
      console.error('Error loading CAI info:', error);
    }
  };

  const loadCustomers = async () => {
    try {
      const response = await fetch('/api/billing/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data || []);
      }
    } catch (error) {
      console.error('Error loading customers:', error);
    }
  };

  const loadProducts = async () => {
    try {
      const response = await fetch('/api/billing/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data || []);
      }
    } catch (error) {
      console.error('Error loading products:', error);
    }
  };

  // Calcular totales
  const totals = invoiceItems.reduce((acc, item) => {
    acc.subtotal += item.subtotal;
    acc.tax15 += item.taxRate === 15 ? item.taxAmount : 0;
    acc.tax18 += item.taxRate === 18 ? item.taxAmount : 0;
    acc.total += item.total;
    return acc;
  }, { subtotal: 0, tax15: 0, tax18: 0, total: 0 });

  // Generar número de factura
  const generateInvoiceNumber = () => {
    if (!caiInfo) return '';
    
    const currentNum = caiInfo.currentNumber;
    const establecimiento = '001';
    const puntoVenta = '01';
    const tipo = '01'; // Factura
    const correlativo = currentNum.toString().padStart(8, '0');
    
    return `${establecimiento}-${puntoVenta}-${tipo}-${correlativo}`;
  };

  // Agregar item
  const addInvoiceItem = () => {
    const newId = (Math.max(...invoiceItems.map(i => parseInt(i.id))) + 1).toString();
    setInvoiceItems(prev => [...prev, {
      id: newId,
      code: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 15,
      discount: 0,
      subtotal: 0,
      taxAmount: 0,
      total: 0
    }]);
  };

  // Actualizar item
  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalcular totales
        const subtotal = (updated.quantity || 0) * (updated.unitPrice || 0);
        const discountAmount = subtotal * ((updated.discount || 0) / 100);
        const taxableAmount = subtotal - discountAmount;
        const taxAmount = taxableAmount * ((updated.taxRate || 0) / 100);
        const total = taxableAmount + taxAmount;
        
        return {
          ...updated,
          subtotal,
          taxAmount,
          total
        };
      }
      return item;
    }));
  };

  // Eliminar item
  const removeInvoiceItem = (id: string) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(prev => prev.filter(item => item.id !== id));
    }
  };

  // Seleccionar cliente
  const selectCustomer = (customer: Customer) => {
    setCustomer(customer);
    setShowCustomerSearch(false);
  };

  // Seleccionar producto
  const selectProduct = (itemId: string, product: any) => {
    updateInvoiceItem(itemId, 'code', product.code);
    updateInvoiceItem(itemId, 'name', product.name);
    updateInvoiceItem(itemId, 'unitPrice', parseFloat(product.unit_price) || 0);
    updateInvoiceItem(itemId, 'taxRate', parseFloat(product.tax_rate) || 15);
    setShowProductSearch(null);
  };

  // Filtrar clientes
  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customer.name?.toLowerCase() || '') ||
    c.rtn.includes(customer.rtn || '')
  );

  // Filtrar productos
  const filteredProducts = products.filter(p => 
    p.code.toLowerCase().includes((showProductSearch?.search || '').toLowerCase()) ||
    p.name.toLowerCase().includes((showProductSearch?.search || '').toLowerCase())
  );

  // Validar factura
  const canIssueInvoice = () => {
    if (!customer.name || !customer.rtn) return false;
    if (totals.total === 0) return false;
    if (paymentMethod === 'card' && !cardConfirmation) return false;
    if (paymentMethod === 'transfer' && !transferReference) return false;
    return true;
  };

  // Emitir factura
  const issueInvoice = async () => {
    if (!canIssueInvoice()) {
      alert('Por favor complete todos los campos obligatorios');
      return;
    }

    setLoading(true);
    try {
      const invoiceData = {
        tenantId: companyId,
        invoiceNumber: generateInvoiceNumber(),
        cai: caiInfo?.cai,
        customer: {
          rtn: customer.rtn,
          name: customer.name
        },
        items: invoiceItems.filter(item => item.name && item.total > 0),
        totals,
        paymentMethod,
        paymentReference: paymentMethod === 'card' ? cardConfirmation : transferReference,
        date: new Date().toISOString()
      };

      const response = await fetch('/api/billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });

      if (response.ok) {
        const result = await response.json();
        setLastInvoiceId(result.invoice?.id || '');
        
        if (paymentMethod === 'transfer') {
          // Mostrar generador de enlace de pago para transferencias
          setShowPaymentLink(true);
        } else {
          alert('Factura emitida exitosamente');
          // Reset form y recargar CAI para obtener nuevo número
          resetInvoiceForm();
          loadCAIInfo();
        }
      } else {
        const errorData = await response.json();
        console.error('API ERROR:', errorData);
        throw new Error(errorData.details || errorData.error || 'Error al emitir factura');
      }
    } catch (error: any) {
      console.error('Error issuing invoice:', error);
      alert('Error: ' + (error.message || 'Error al emitir factura'));
    } finally {
      setLoading(false);
    }
  };

  const resetInvoiceForm = () => {
    setCustomer({ rtn: '', name: '' });
    setInvoiceItems([{ id: '1', code: '', name: '', quantity: 1, unitPrice: 0, taxRate: 15, discount: 0, subtotal: 0, taxAmount: 0, total: 0 }]);
    setPaymentMethod('cash');
    setCardConfirmation('');
    setTransferReference('');
    setShowPaymentLink(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/companies/${companyId}/modules`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center space-x-3">
                <Receipt className="h-6 w-6 text-green-600" />
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
                  <p className="text-gray-600">Facturación y Ventas</p>
                </div>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {caiInfo && caiInfo.daysRemaining <= 30 && (
                <Badge variant="destructive" className="animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  CAI vence en {caiInfo.daysRemaining} días
                </Badge>
              )}
              <Button variant="outline" onClick={() => router.push(`/companies/${companyId}/billing/invoices`)}>
                <FileText className="h-4 w-4 mr-2" /> Ver facturas emitidas
              </Button>
              <Button onClick={issueInvoice} disabled={!canIssueInvoice() || loading}>
                <Receipt className="h-4 w-4 mr-2" />
                {loading ? 'Emitiendo...' : 'Emitir Factura'}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Columna Izquierda - Cliente y Items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del CAI */}
            {caiInfo && (
              <Card className="bg-cyan-50 border-cyan-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-blue-900">CAI Vigente</p>
                      <p className="text-xs text-cyan-700">{caiInfo.cai}</p>
                      <p className="text-xs text-cyan-600">
                        Factura: {generateInvoiceNumber()} | 
                        Restantes: {caiInfo.finalNumber - caiInfo.currentNumber + 1}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-cyan-600">Vence:</p>
                      <p className="text-sm font-medium text-blue-900">
                        {new Date(caiInfo.expirationDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Información del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Datos del Cliente
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="customerName">Nombre del Cliente *</Label>
                    <div className="relative">
                      <Input
                        id="customerName"
                        value={customer.name || ''}
                        onChange={(e) => setCustomer(prev => ({...prev, name: e.target.value}))}
                        placeholder="Buscar cliente..."
                        onFocus={() => setShowCustomerSearch(true)}
                      />
                      {showCustomerSearch && (
                        <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                          {filteredCustomers.slice(0, 10).map(c => (
                            <div
                              key={c.id}
                              className="p-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => selectCustomer(c)}
                            >
                              <div className="font-medium">{c.name}</div>
                              <div className="text-sm text-gray-600">RTN: {c.rtn}</div>
                              {c.currentDebt && (
                                <div className="text-xs text-orange-600">Deuda: L {c.currentDebt}</div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="customerRTN">RTN *</Label>
                    <Input
                      id="customerRTN"
                      value={customer.rtn || ''}
                      onChange={(e) => setCustomer(prev => ({...prev, rtn: e.target.value}))}
                      placeholder="0801-XXXX-XXXXX"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Items de la Factura */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Items de la Factura</span>
                  <Button variant="outline" size="sm" onClick={addInvoiceItem}>
                    <Plus className="h-4 w-4 mr-2" />
                    Agregar Item
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {invoiceItems.map((item, index) => (
                    <div key={item.id} className="p-3 border rounded-lg">
                      <div className="grid grid-cols-12 gap-2">
                        {/* Código */}
                        <div className="col-span-2">
                          <Input
                            value={item.code}
                            onChange={(e) => updateInvoiceItem(item.id, 'code', e.target.value)}
                            placeholder="Código"
                            onFocus={() => setShowProductSearch({index, search: ''})}
                          />
                        </div>
                        
                        {/* Nombre */}
                        <div className="col-span-4 relative">
                          <Input
                            value={item.name}
                            onChange={(e) => updateInvoiceItem(item.id, 'name', e.target.value)}
                            placeholder="Descripción del producto/servicio"
                          />
                          {showProductSearch?.index === index && (
                            <div className="absolute top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto">
                              <Input
                                placeholder="Buscar producto..."
                                value={showProductSearch.search || ''}
                                onChange={(e) => setShowProductSearch({index, search: e.target.value})}
                                className="m-2"
                                autoFocus
                              />
                              {filteredProducts.slice(0, 10).map(p => (
                                <div
                                  key={p.id}
                                  className="p-2 hover:bg-gray-100 cursor-pointer"
                                  onClick={() => selectProduct(item.id, p)}
                                >
                                  <div className="font-medium">{p.code} - {p.name}</div>
                                  <div className="text-sm text-gray-600">L {p.unit_price}</div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        {/* Cantidad */}
                        <div className="col-span-1">
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                            placeholder="Qty"
                            min="1"
                          />
                        </div>
                        
                        {/* Precio Unitario */}
                        <div className="col-span-2">
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            placeholder="Precio"
                            min="0"
                            step="0.01"
                          />
                        </div>
                        
                        {/* Impuesto */}
                        <div className="col-span-1">
                          <Select 
                            value={item.taxRate.toString()} 
                            onValueChange={(value) => updateInvoiceItem(item.id, 'taxRate', parseFloat(value))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="0">Exento</SelectItem>
                              <SelectItem value="15">15%</SelectItem>
                              <SelectItem value="18">18%</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {/* Descuento */}
                        <div className="col-span-1">
                          <Input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateInvoiceItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                            placeholder="%"
                            min="0"
                            max="100"
                          />
                        </div>
                        
                        {/* Total */}
                        <div className="col-span-1">
                          <Input
                            value={`L ${item.total.toFixed(2)}`}
                            readOnly
                            className="bg-gray-100 text-right"
                          />
                        </div>
                        
                        {/* Eliminar */}
                        <div className="col-span-1">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => removeInvoiceItem(item.id)}
                            disabled={invoiceItems.length <= 1}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha - Resumen y Pago */}
          <div className="space-y-6">
            {/* Resumen de Totales */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Resumen de Totales
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal:</span>
                    <span className="font-medium">L {totals.subtotal.toFixed(2)}</span>
                  </div>
                  {totals.tax15 > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ISV 15%:</span>
                      <span>L {totals.tax15.toFixed(2)}</span>
                    </div>
                  )}
                  {totals.tax18 > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">ISV 18%:</span>
                      <span>L {totals.tax18.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between text-lg font-bold">
                    <span>Total:</span>
                    <span className="text-green-600">L {totals.total.toFixed(2)}</span>
                  </div>
                </div>

                {/* Leyendas obligatorias */}
                <div className="mt-4 p-3 bg-gray-50 rounded text-xs text-gray-600">
                  <p className="font-medium mb-1">Leyendas Fiscales:</p>
                  {totals.tax15 > 0 && <p>Importe gravado 15%</p>}
                  {totals.tax18 > 0 && <p>Importe gravado 18%</p>}
                  <p>Original: Cliente</p>
                  <p>Copia: Vendedor</p>
                </div>
              </CardContent>
            </Card>

            {/* Método de Pago */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Método de Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">
                        <div className="flex items-center">
                          <DollarSign className="h-4 w-4 mr-2" />
                          Efectivo
                        </div>
                      </SelectItem>
                      <SelectItem value="card">
                        <div className="flex items-center">
                          <CreditCard className="h-4 w-4 mr-2" />
                          Tarjeta
                        </div>
                      </SelectItem>
                      <SelectItem value="transfer">
                        <div className="flex items-center">
                          <FileText className="h-4 w-4 mr-2" />
                          Transferencia
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {paymentMethod === 'card' && (
                    <div className="space-y-2">
                      <Label htmlFor="cardConfirmation">Confirmación Tarjeta</Label>
                      <Input
                        id="cardConfirmation"
                        value={cardConfirmation}
                        onChange={(e) => setCardConfirmation(e.target.value)}
                        placeholder="Últimos 4 dígitos o referencia"
                      />
                    </div>
                  )}

                  {paymentMethod === 'transfer' && (
                    <div className="space-y-2">
                      <Label htmlFor="transferReference">Referencia Transferencia</Label>
                      <Input
                        id="transferReference"
                        value={transferReference}
                        onChange={(e) => setTransferReference(e.target.value)}
                        placeholder="Número de referencia"
                      />
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Validación */}
            <Card className={canIssueInvoice() ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-2">
                  {canIssueInvoice() ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-5 w-5 text-red-600" />
                  )}
                  <span className={`text-sm ${canIssueInvoice() ? 'text-green-800' : 'text-red-800'}`}>
                    {canIssueInvoice() ? 'Factura lista para emitir' : 'Complete los campos obligatorios'}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      {/* Payment Link Generator Modal */}
      {showPaymentLink && lastInvoiceId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto m-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Generar Enlace de Pago</h2>
                <Button variant="outline" onClick={() => setShowPaymentLink(false)}>
                  Cerrar
                </Button>
              </div>
              <PaymentLinkGenerator
                invoiceId={lastInvoiceId}
                invoiceNumber={generateInvoiceNumber()}
                totalAmount={totals.total}
                currency="HNL"
                onPaymentCompleted={() => {
                  setShowPaymentLink(false);
                  resetInvoiceForm();
                  loadCAIInfo();
                  alert('Pago completado exitosamente');
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
