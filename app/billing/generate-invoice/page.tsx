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
  Building2
} from 'lucide-react';
import { useTenant } from '@/lib/contexts/TenantContext';

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Customer {
  name: string;
  rtn: string;
  email: string;
  address: string;
}

export default function GenerateInvoicePage() {
  const router = useRouter();
  const { currentTenant } = useTenant();
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Customer info
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    rtn: '',
    email: '',
    address: ''
  });
  
  // Invoice items
  const [items, setItems] = useState<InvoiceItem[]>([]);
  
  // Dates
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(() => {
    const date = new Date();
    date.setDate(date.getDate() + 30);
    return date.toISOString().split('T')[0];
  });
  
  // Notes
  const [notes, setNotes] = useState('');

  // Calculate totals
  const subtotal = items.reduce((sum, item) => sum + item.total, 0);
  const tax = subtotal * 0.15; // 15% ISV
  const total = subtotal + tax;

  const addItem = () => {
    const newItem: InvoiceItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
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
        // Recalculate total if quantity or unitPrice changes
        if (field === 'quantity' || field === 'unitPrice') {
          updatedItem.total = updatedItem.quantity * updatedItem.unitPrice;
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

    if (!customer.name || !customer.rtn) {
      setError('Debe ingresar el nombre y RTN del cliente');
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

      const invoiceData = {
        tenantId: currentTenant.id,
        invoiceType: 'CUSTOMER',
        customerName: customer.name,
        customerRTN: customer.rtn,
        customerEmail: customer.email,
        customerAddress: customer.address,
        issueDate,
        dueDate,
        items: items.map(item => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.total
        })),
        subtotal,
        tax,
        total,
        notes
      };

      const response = await fetch('/api/admin/billing/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        throw new Error('Error al guardar la factura');
      }

      setSuccess('Factura generada exitosamente');
      
      // Redirect after success
      setTimeout(() => {
        router.push('/billing');
      }, 1500);
    } catch (error: any) {
      console.error('Error generating invoice:', error);
      setError('Error al generar la factura');
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
                  RTN *
                </label>
                <input
                  type="text"
                  value={customer.rtn}
                  onChange={(e) => setCustomer({ ...customer, rtn: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="0801-XXXX-XXXXX"
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
              <Button
                onClick={addItem}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Agregar Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {items.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay items agregados</p>
                <Button
                  onClick={addItem}
                  variant="outline"
                  className="mt-4"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Agregar Primer Item
                </Button>
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
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Precio Unit.
                      </label>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      />
                    </div>
                    <div className="col-span-1">
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Total
                      </label>
                      <p className="py-2 text-sm font-medium">
                        {formatCurrency(item.total)}
                      </p>
                    </div>
                    <div className="col-span-1 flex items-end justify-end">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
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
                <div className="flex justify-between py-2">
                  <span className="text-gray-600">ISV (15%):</span>
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

        {/* Actions */}
        <div className="flex justify-end gap-4">
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
  );
}
