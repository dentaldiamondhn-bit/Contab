"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FileText, 
  Plus, 
  Trash2, 
  Save, 
  Download, 
  Receipt, 
  Calculator,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  ArrowLeft,
  Eye
} from 'lucide-react';
import InvoicePreview from '@/components/billing/InvoicePreview';

interface InvoiceItem {
  id: string;
  code: string;
  name: string;
  description?: string;
  quantity: number;
  unitPrice: number;
  taxRate: number;
  discount: number;
  subtotal: number;
  taxAmount: number;
  total: number;
}

interface Customer {
  id: string;
  rtn: string;
  name: string;
  address: string;
}

interface CAIInfo {
  id: string;
  cai: string;
  rangeStart: number;
  rangeEnd: number;
  currentNumber: number;
  expiryDate: string;
  isActive: boolean;
  isSystemWide?: boolean;
  isDemo?: boolean;
  message?: string;
  rtn: string;
  businessName: string;
  businessAddress: string;
  establishmentCode: string;
  pointOfSaleCode: string;
  economicActivity: string;
  taxRate: number;
  invoiceNumber?: string;
  sequenceNumber?: number;
}

export default function SupportGenerateInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tenantId = searchParams.get('tenantId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [caiInfo, setCaiInfo] = useState<CAIInfo | null>(null);
  const [tenantPlans, setTenantPlans] = useState<InvoiceItem[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (!tenantId) {
      setError('Tenant ID no proporcionado');
      setLoading(false);
      return;
    }

    fetchTenantData();
  }, [tenantId]);

  const fetchCAIInfo = async () => {
    if (!tenantId) return;
    
    try {
      console.log('🔍 Fetching CAI info for tenant:', tenantId);
      const response = await fetch(`/api/admin/billing/cai?tenantId=${tenantId}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ CAI info received:', data);
        
        if (data.cai) {
          setCaiInfo(data.cai);
        } else {
          console.log('⚠️ No CAI info found, will try to use demo CAI');
          setError('No hay CAI configurado. Contacte al administrador.');
        }
      } else {
        console.error('❌ Error fetching CAI info:', response.status);
        setError('Error al obtener información del CAI');
      }
    } catch (error) {
      console.error('❌ Error fetching CAI:', error);
      setError('Error de conexión al obtener CAI');
    }
  };

  const fetchTenantData = async () => {
    try {
      console.log('🔄 Fetching tenant data for:', tenantId);
      
      // Fetch tenant details
      const tenantResponse = await fetch(`/api/admin/tenants/${tenantId}`);
      if (!tenantResponse.ok) {
        throw new Error('Error al cargar datos del tenant');
      }
      
      const tenantData = await tenantResponse.json();
      console.log('✅ Tenant data received:', tenantData);
      setTenant(tenantData);

      // Fetch CAI info
      await fetchCAIInfo();

      // Convert subscription plans to invoice items
      const planPrices: Record<string, number> = {
        'BASICO': 500,
        'PREMIUM': 1000,
        'ENTERPRISE': 2000,
        'STARTER': 200,
        'GROWTH': 750
      };

      const items: InvoiceItem[] = [];
      
      if (tenantData.subscriptionPlans && tenantData.subscriptionPlans.length > 0) {
        tenantData.subscriptionPlans.forEach((plan: any, index: number) => {
          const planCode = typeof plan === 'string' ? plan : plan.code;
          const quantity = typeof plan === 'string' ? 1 : (plan.quantity || 1);
          const unitPrice = planPrices[planCode] || 500;
          const subtotal = unitPrice * quantity;
          const taxRate = 0.15;
          const taxAmount = subtotal * taxRate;
          const total = subtotal + taxAmount;

          items.push({
            id: `plan-${index}`,
            code: planCode,
            name: `Plan ${planCode}`,
            description: `Servicios de contabilidad - Plan ${planCode}`,
            quantity: quantity,
            unitPrice: unitPrice,
            taxRate: 15,
            discount: 0,
            subtotal: subtotal,
            taxAmount: taxAmount,
            total: total
          });
        });
      }

      setTenantPlans(items);
      setInvoiceItems(items);
      
    } catch (error) {
      console.error('❌ Error fetching tenant data:', error);
      setError('Error al cargar datos del tenant');
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
    const totalTax = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    
    return { subtotal, totalTax, total };
  };

  const handleAddItem = () => {
    const newItem: InvoiceItem = {
      id: `item-${Date.now()}`,
      code: '',
      name: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 15,
      discount: 0,
      subtotal: 0,
      taxAmount: 0,
      total: 0
    };
    setInvoiceItems([...invoiceItems, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    setInvoiceItems(invoiceItems.filter(item => item.id !== id));
  };

  const handleItemChange = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(invoiceItems.map(item => {
      if (item.id === id) {
        const updatedItem = { ...item, [field]: value };
        
        // Recalculate totals
        if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate') {
          updatedItem.subtotal = updatedItem.quantity * updatedItem.unitPrice;
          updatedItem.taxAmount = updatedItem.subtotal * (updatedItem.taxRate / 100);
          updatedItem.total = updatedItem.subtotal + updatedItem.taxAmount;
        }
        
        return updatedItem;
      }
      return item;
    }));
  };

  const handleGenerateInvoice = async () => {
    if (!tenant || !caiInfo) {
      setError('Faltan datos necesarios para generar la factura');
      return;
    }

    if (invoiceItems.length === 0) {
      setError('Debe agregar al menos un item a la factura');
      return;
    }

    try {
      setLoading(true);
      
      const { subtotal, totalTax, total } = calculateTotals();
      
      const invoiceData = {
        tenantId: tenantId,
        invoiceNumber: caiInfo.invoiceNumber || `CONTAB-${tenant.tenantCode}-${Date.now()}`,
        invoiceDate: new Date().toISOString(),
        customerId: tenant.id,
        customerRTN: tenant.businessRTN,
        customerName: tenant.businessName,
        customerAddress: tenant.businessAddress,
        customerEmail: tenant.businessEmail,
        issuerRTN: caiInfo.rtn,
        issuerName: caiInfo.businessName,
        issuerAddress: caiInfo.businessAddress,
        cai: caiInfo.cai,
        rangeStart: caiInfo.rangeStart,
        rangeEnd: caiInfo.rangeEnd,
        expiryDate: caiInfo.expiryDate,
        items: invoiceItems.map(item => ({
          code: item.code,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          subtotal: item.subtotal,
          taxAmount: item.taxAmount,
          total: item.total
        })),
        subtotal: subtotal,
        totalTax: totalTax,
        total: total,
        notes: notes,
        currency: 'HNL',
        taxRate: 15
      };

      console.log('📦 Generating invoice with data:', invoiceData);

      const response = await fetch('/api/admin/billing/invoices', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invoiceData),
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Invoice generated:', result);
        setSuccess('Factura generada exitosamente');
        
        // Redirect back to tenant detail after 2 seconds
        setTimeout(() => {
          router.push(`/support/tenants/${tenantId}?tab=billing`);
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error('❌ Error generating invoice:', errorData);
        setError(errorData.error || 'Error al generar la factura');
      }
    } catch (error) {
      console.error('❌ Error generating invoice:', error);
      setError('Error de conexión al generar factura');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Cargando...</p>
        </div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white rounded-lg shadow p-6 max-w-md">
          <div className="flex items-center text-red-600 mb-4">
            <AlertTriangle className="w-6 h-6 mr-2" />
            <h2 className="text-lg font-semibold">Error</h2>
          </div>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => router.back()}
            className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
          >
            <ArrowLeft className="w-4 h-4 inline mr-2" />
            Volver
          </button>
        </div>
      </div>
    );
  }

  const { subtotal, totalTax, total } = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="mb-4 flex items-center text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Volver
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Generar Factura (Soporte)</h1>
          <p className="text-gray-600 mt-2">
            Generar factura para {tenant?.businessName}
          </p>
        </div>

        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-center text-red-700">
            <AlertTriangle className="w-5 h-5 mr-2" />
            {error}
          </div>
        )}

        {success && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center text-green-700">
            <CheckCircle className="w-5 h-5 mr-2" />
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Invoice Items */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                  <Receipt className="w-5 h-5 mr-2" />
                  Items de Factura
                </h2>
                <button
                  onClick={handleAddItem}
                  className="px-3 py-1 bg-orange-100 text-orange-700 rounded hover:bg-orange-200 text-sm font-medium flex items-center"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Agregar Item
                </button>
              </div>

              {invoiceItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Receipt className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>No hay items en la factura</p>
                  <button
                    onClick={handleAddItem}
                    className="mt-2 text-orange-600 hover:text-orange-700 text-sm"
                  >
                    Agregar primer item
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {invoiceItems.map((item, index) => (
                    <div key={item.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex justify-between items-start mb-3">
                        <span className="text-sm font-medium text-gray-500">Item #{index + 1}</span>
                        <button
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                          <input
                            type="text"
                            value={item.code}
                            onChange={(e) => handleItemChange(item.id, 'code', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                          <input
                            type="text"
                            value={item.name}
                            onChange={(e) => handleItemChange(item.id, 'name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                          <input
                            type="text"
                            value={item.description || ''}
                            onChange={(e) => handleItemChange(item.id, 'description', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Precio Unitario (L)</label>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => handleItemChange(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">% ISV</label>
                          <input
                            type="number"
                            value={item.taxRate}
                            onChange={(e) => handleItemChange(item.id, 'taxRate', parseFloat(e.target.value) || 0)}
                            min="0"
                            max="100"
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Total</label>
                          <div className="px-3 py-2 bg-gray-100 rounded-lg text-gray-900 font-medium">
                            L {item.total.toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Notes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <FileText className="w-5 h-5 mr-2" />
                Notas
              </h2>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
                placeholder="Notas adicionales para la factura..."
              />
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Totals */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                <Calculator className="w-5 h-5 mr-2" />
                Totales
              </h2>
              
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subtotal:</span>
                  <span className="text-gray-900 font-medium">L {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">ISV (15%):</span>
                  <span className="text-gray-900 font-medium">L {totalTax.toFixed(2)}</span>
                </div>
                <div className="border-t pt-3">
                  <div className="flex justify-between text-lg">
                    <span className="text-gray-900 font-semibold">Total:</span>
                    <span className="text-orange-600 font-bold">L {total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* CAI Info */}
            {caiInfo && (
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Información CAI</h2>
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-gray-600">CAI:</span>
                    <p className="text-gray-900 font-mono break-all">{caiInfo.cai}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Rango:</span>
                    <p className="text-gray-900">{caiInfo.rangeStart} - {caiInfo.rangeEnd}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Vence:</span>
                    <p className="text-gray-900">{new Date(caiInfo.expiryDate).toLocaleDateString('es-HN')}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="space-y-3">
                <button
                  onClick={() => setShowPreview(true)}
                  disabled={invoiceItems.length === 0}
                  className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Vista Previa
                </button>
                
                <button
                  onClick={handleGenerateInvoice}
                  disabled={invoiceItems.length === 0 || loading}
                  className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="w-4 h-4 mr-2" />
                  )}
                  Generar Factura
                </button>

                <button
                  onClick={() => router.push(`/support/tenants/${tenantId}?tab=billing`)}
                  className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 font-medium"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-bold text-gray-900">Vista Previa de Factura</h2>
                <button
                  onClick={() => setShowPreview(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  ✕
                </button>
              </div>
              
              <InvoicePreview
                tenant={tenant}
                caiInfo={caiInfo}
                invoiceItems={invoiceItems}
                invoiceNumber={caiInfo?.invoiceNumber || 'PREVIEW'}
                notes={notes}
              />
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowPreview(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                >
                  Cerrar
                </button>
                <button
                  onClick={() => {
                    setShowPreview(false);
                    handleGenerateInvoice();
                  }}
                  disabled={loading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {loading ? 'Generando...' : 'Confirmar y Generar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
