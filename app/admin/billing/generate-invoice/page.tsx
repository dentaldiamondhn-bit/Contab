"use client";

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Modal } from '@/components/ui/modal';
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
  Eye,
  Building2,
  ChevronDown
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
  // Información fiscal del emisor
  rtn: string;
  businessName: string;
  businessAddress: string;
  establishmentCode: string;
  pointOfSaleCode: string;
  economicActivity: string;
  taxRate: number;
  // Información adicional
  invoiceNumber?: string;
  sequenceNumber?: number;
}

interface Tenant {
  id: string;
  businessName: string;
  businessRTN: string;
  businessEmail: string;
  businessAddress: string;
  tenantCode: string;
  subscriptionPlans?: any[];
  modules?: string[];
  monthlyCost?: number;
}

export default function GenerateInvoicePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const urlTenantId = searchParams.get('tenantId');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [tenant, setTenant] = useState<any>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [selectedTenantId, setSelectedTenantId] = useState<string>('');
  const [caiInfo, setCaiInfo] = useState<CAIInfo | null>(null);
  const [tenantPlans, setTenantPlans] = useState<InvoiceItem[]>([]);
  const [invoiceItems, setInvoiceItems] = useState<InvoiceItem[]>([]);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (urlTenantId) {
      // Si viene tenantId en URL, usarlo directamente
      setSelectedTenantId(urlTenantId);
      fetchTenantData(urlTenantId);
    } else {
      // Si no hay tenantId, cargar lista de tenants para seleccionar
      fetchTenants();
    }
  }, [urlTenantId]);

  const fetchTenants = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/tenants');
      if (response.ok) {
        const data = await response.json();
        // Filtrar solo tenants activos
        const activeTenants = data.filter((t: Tenant) => t.isActive !== false);
        setTenants(activeTenants);
        setError('');
      } else {
        setError('Error al cargar lista de empresas');
      }
    } catch (error) {
      console.error('Error fetching tenants:', error);
      setError('Error al cargar empresas');
    } finally {
      setLoading(false);
    }
  };

  const handleTenantSelect = (tenantId: string) => {
    setSelectedTenantId(tenantId);
    fetchTenantData(tenantId);
  };

  const fetchCAIInfo = async () => {
    if (!selectedTenantId) return;
    
    console.log('🔄 Recargando información del CAI...');
    try {
      const caiResponse = await fetch(`/api/admin/billing/cai/current?tenantId=${selectedTenantId}`);
      console.log('CAI response status:', caiResponse.status);
      
      if (caiResponse.ok) {
        const caiData = await caiResponse.json();
        console.log('CAI response data:', caiData);
        
        if (caiData.success && caiData.cai) {
          setCaiInfo(caiData.cai);
          console.log('✅ CAI recargado:', caiData.cai);
          setSuccess('CAI actualizado');
          setTimeout(() => setSuccess(''), 2000);
        } else {
          console.log('❌ CAI data no válido:', caiData);
          setCaiInfo(null);
        }
      } else {
        const errorText = await caiResponse.text();
        console.log('CAI response error:', errorText);
        setError('Error al cargar CAI');
        setCaiInfo(null);
      }
    } catch (caiError) {
      console.log('Error en CAI API:', caiError);
      setError('Error al cargar CAI');
      setCaiInfo(null);
    }
  };

  const fetchTenantData = async (tenantIdToFetch: string) => {
    try {
      console.log('Iniciando fetchTenantData para tenantId:', tenantIdToFetch);
      setLoading(true);
      
      // Obtener información del tenant (CRÍTICO - incluye subscriptionPlans)
      console.log('Obteniendo información del tenant...');
      const tenantResponse = await fetch(`/api/admin/tenants/${tenantIdToFetch}`);
      console.log('Tenant response status:', tenantResponse.status);
      
      if (tenantResponse.ok) {
        const tenantData = await tenantResponse.json();
        console.log('Tenant data:', tenantData);
        console.log('SubscriptionPlans:', tenantData.subscriptionPlans);
        
        setTenant(tenantData);
        setError('');
        setSuccess('');
        
        // Procesar planes del tenant
        let plans = [];
        try {
          const plansData = tenantData.subscriptionPlans || [];
          console.log('Plans data raw:', plansData);
          
          if (Array.isArray(plansData) && plansData.length > 0) {
            plans = plansData.map((plan: any, index: number) => {
              console.log(`🔄 Plan ${index}:`, plan);
              const unitPrice = plan.price || 0;
              const quantity = plan.quantity || 1;
              const discount = plan.discount || 0;
              const taxRate = plan.taxRate || 15;
              
              const total = (unitPrice * quantity) - discount;
              const taxAmount = total * (taxRate / 100);
              const subtotal = total - taxAmount;
              
              console.log(`🧮 Plan ${index} - UnitPrice: ${unitPrice}, Quantity: ${quantity}, Subtotal: ${subtotal}, Tax: ${taxAmount}, Total: ${total}`);
              
              return {
                id: `plan-${index}`,
                code: plan.code || `PLAN-${index + 1}`,
                name: plan.name || `Plan ${plan.code || 'BASIC'}`,
                description: plan.description || '',
                quantity,
                unitPrice,
                taxRate,
                discount,
                subtotal,
                taxAmount,
                total
              };
            });
          } else {
            // Si no hay planes, crear un plan básico por defecto
            plans = [{
              id: 'basic-plan',
              code: 'BASIC',
              name: 'Plan Básico',
              description: 'Plan básico de suscripción mensual',
              quantity: 1,
              unitPrice: 500.00,
              taxRate: 15,
              discount: 0,
              subtotal: 500.00,
              taxAmount: 75.00,
              total: 575.00
            }];
          }
        } catch (e) {
          console.error('Error procesando planes:', e);
          // Plan básico por defecto
          plans = [{
            id: 'basic-plan',
            code: 'BASIC',
            name: 'Plan Básico',
            description: 'Plan básico de suscripción mensual',
            quantity: 1,
            unitPrice: 500.00,
            taxRate: 15,
            discount: 0,
            subtotal: 500.00,
            taxAmount: 75.00,
            total: 575.00
          }];
        }
        
        console.log('Processed plans:', plans);
        setTenantPlans(plans);
        setInvoiceItems(plans);
        
      } else {
        const errorData = await tenantResponse.json();
        console.error('Error en tenant response:', errorData);
        setError(`Error al cargar tenant: ${errorData.error || 'Error desconocido'}`);
        return;
      }

      // Obtener información del CAI (NO CRÍTICO - si falla, continuamos sin CAI)
      console.log('Obteniendo información del CAI...');
      try {
        const caiResponse = await fetch(`/api/admin/billing/cai/current?tenantId=${tenantIdToFetch}`);
        console.log('CAI response status:', caiResponse.status);
        console.log('CAI response headers:', caiResponse.headers);
        
        if (caiResponse.ok) {
          const caiData = await caiResponse.json();
          console.log('CAI response data:', caiData);
          console.log('CAI data success:', caiData.success);
          console.log('CAI data cai:', caiData.cai);
          
          if (caiData.success && caiData.cai) {
            setCaiInfo(caiData.cai);
            console.log('✅ CAI establecido:', caiData.cai);
          } else {
            console.log('❌ CAI data no válido:', caiData);
            setCaiInfo(null);
          }
        } else {
          const errorText = await caiResponse.text();
          console.log('CAI response error text:', errorText);
          console.log('CAI API falló, continuando sin CAI');
          setCaiInfo(null);
        }
      } catch (caiError) {
        console.log('Error en CAI API, continuando sin CAI:', caiError);
        setCaiInfo(null);
      }

    } catch (err) {
      console.error('Error general en fetchTenantData:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const updateInvoiceItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setInvoiceItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalcular totales
        if (field === 'quantity' || field === 'unitPrice' || field === 'taxRate' || field === 'discount') {
          const total = (updated.quantity * updated.unitPrice) - updated.discount;
          const taxAmount = total * (updated.taxRate / 100);
          const subtotal = total - taxAmount;
          updated.subtotal = subtotal;
          updated.taxAmount = taxAmount;
          updated.total = total;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const addInvoiceItem = () => {
    const newItem: InvoiceItem = {
      id: `custom-${Date.now()}`,
      code: '',
      name: '',
      quantity: 1,
      unitPrice: 0,
      taxRate: 15,
      discount: 0,
      subtotal: 0,
      taxAmount: 0,
      total: 0
    };
    setInvoiceItems(prev => [...prev, newItem]);
  };

  const removeInvoiceItem = (id: string) => {
    if (invoiceItems.length > 1) {
      setInvoiceItems(prev => prev.filter(item => item.id !== id));
    }
  };

  const calculateTotals = () => {
    console.log('🧮 calculateTotals - InvoiceItems:', invoiceItems);
    console.log('🧮 calculateTotals - Primer item:', invoiceItems[0]);
    
    const subtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
    const tax = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
    const total = invoiceItems.reduce((sum, item) => sum + item.total, 0);
    
    console.log('🧮 calculateTotals - Subtotal:', subtotal);
    console.log('🧮 calculateTotals - Tax:', tax);
    console.log('🧮 calculateTotals - Total:', total);
    
    return { subtotal, tax, total };
  };

  const canGenerateInvoice = () => {
    return tenant && 
           invoiceItems.every(item => item.code && item.name && item.unitPrice > 0) &&
           caiInfo?.isActive;
  };

  const generateInvoice = async () => {
    try {
      if (!tenant || !caiInfo) {
        setError('Se requiere información del tenant y CAI para generar la factura');
        return;
      }

      // Validar que tengamos items
      if (invoiceItems.length === 0) {
        setError('Debe agregar al menos un item a la factura');
        return;
      }

      // Validar que todos los items tengan información completa
      const invalidItems = invoiceItems.filter(item => 
        !item.code || !item.name || item.unitPrice <= 0
      );

      if (invalidItems.length > 0) {
        setError('Todos los items deben tener código, nombre y precio válido');
        return;
      }

      // Calcular totales
      const total = invoiceItems.reduce((sum, item) => sum + item.total, 0);
      const totalTax = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
      const subtotal = total - totalTax;

      // Generar número de factura
      const invoiceNumber = caiInfo.invoiceNumber || caiInfo.currentNumber?.toString() || '1';

      // Crear objeto de factura con información fiscal completa
      const invoiceData = {
        // Información básica
        tenantId: selectedTenantId,
        invoiceNumber,
        invoiceDate: new Date().toISOString(),
        
        // Información del cliente (tenant)
        customerId: tenant.id,
        customerRTN: tenant.businessRTN,
        customerName: tenant.businessName,
        customerAddress: tenant.businessAddress,
        customerEmail: tenant.businessEmail,
        customerPhone: tenant.phoneNumber,
        
        // Información fiscal del emisor (CAI del sistema)
        issuerRTN: caiInfo.rtn,
        issuerName: caiInfo.businessName,
        issuerAddress: caiInfo.businessAddress,
        establishmentCode: caiInfo.establishmentCode,
        pointOfSaleCode: caiInfo.pointOfSaleCode,
        economicActivity: caiInfo.economicActivity,
        
        // Información del CAI
        cai: caiInfo.cai,
        rangeStart: caiInfo.rangeStart,
        rangeEnd: caiInfo.rangeEnd,
        expiryDate: caiInfo.expiryDate,
        
        // Items de la factura
        items: invoiceItems.map(item => ({
          code: item.code,
          name: item.name,
          description: item.description || '',
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxRate: item.taxRate,
          discount: item.discount,
          subtotal: item.subtotal,
          taxAmount: item.taxAmount,
          total: item.total
        })),
        
        // Totales
        subtotal,
        totalTax,
        total,
        
        // Información adicional
        notes: notes || '',
        currency: 'HNL',
        taxRate: caiInfo.taxRate || 15
      };

      console.log('📄 Generando factura con datos:', invoiceData);

      // Enviar al API de facturación
      const response = await fetch('/api/admin/billing/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invoiceData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar factura');
      }

      const result = await response.json();
      console.log('✅ Factura generada exitosamente:', result);

      // Mostrar mensaje de éxito
      setSuccess(`Factura #${invoiceNumber} generada exitosamente`);
      
      // Redirigir a la página del tenant después de un breve delay
      setTimeout(() => {
        router.push(`/admin/tenants/${selectedTenantId}?tab=billing`);
      }, 2000);

    } catch (err: any) {
      console.error('❌ Error generando factura:', err);
      setError(err.message || 'Error al generar la factura');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center">Cargando...</div>
        </div>
      </div>
    );
  }

  if (error && !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          <div className="text-center text-red-600">{error}</div>
        </div>
      </div>
    );
  }

  // Si no hay tenant seleccionado, mostrar selector de tenants
  if (!selectedTenantId && tenants.length > 0) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.push('/admin/tenants')}
              className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver a Tenants
            </button>
            <h1 className="text-3xl font-bold text-gray-900">Generar Factura</h1>
            <p className="text-gray-600 mt-2">Selecciona una empresa para generar la factura</p>
          </div>

          {/* Lista de Tenants */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tenants.map((t) => (
              <div
                key={t.id}
                onClick={() => handleTenantSelect(t.id)}
                className="bg-white rounded-lg shadow-md p-6 cursor-pointer hover:shadow-lg hover:border-blue-500 border-2 border-transparent transition-all"
              >
                <div className="flex items-start gap-4">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <Building2 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900">{t.businessName}</h3>
                    <p className="text-sm text-gray-500">RTN: {t.businessRTN}</p>
                    <p className="text-sm text-gray-500">{t.businessEmail}</p>
                    <p className="text-sm text-gray-500 mt-1">Código: {t.tenantCode}</p>
                    {t.monthlyCost && (
                      <p className="text-sm font-medium text-blue-600 mt-2">
                        Costo mensual: L {t.monthlyCost.toLocaleString()}
                      </p>
                    )}
                  </div>
                  <ChevronDown className="w-5 h-5 text-gray-400 rotate-[-90deg]" />
                </div>
              </div>
            ))}
          </div>

          {tenants.length === 0 && (
            <div className="text-center py-12">
              <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No hay empresas activas</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  const { subtotal, tax, total } = calculateTotals();
  console.log('🎯 Final totals to display:', { subtotal, tax, total });

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push(`/admin/tenants/${selectedTenantId}`)}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al Tenant
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Generar Factura</h1>
              <div className="mt-2">
                <p className="text-gray-600">Tenant: {tenant?.businessName}</p>
                <p className="text-sm text-gray-500">RTN: {tenant?.businessRTN}</p>
                <p className="text-sm text-gray-500">Email: {tenant?.businessEmail}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              {caiInfo?.isActive ? (
                <Badge className="bg-green-100 text-green-800">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  CAI Activo
                </Badge>
              ) : (
                <Badge className="bg-red-100 text-red-800">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  CAI Inactivo
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Formulario */}
        <div className="space-y-6">
          {/* Información del Tenant */}
          <Card>
            <CardHeader>
              <CardTitle>Información del Tenant</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-700">Nombre del Tenant</p>
                  <p className="text-lg font-semibold text-gray-900">{tenant?.businessName}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">RTN</p>
                  <p className="text-lg font-semibold text-gray-900">{tenant?.businessRTN}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Email</p>
                  <p className="text-lg font-semibold text-gray-900">{tenant?.businessEmail}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700">Teléfono</p>
                  <p className="text-lg font-semibold text-gray-900">{tenant?.phoneNumber}</p>
                </div>
              </div>
              <div className="mt-4">
                <p className="text-sm font-medium text-gray-700">Dirección</p>
                <p className="text-gray-900">{tenant?.businessAddress}</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Columna izquierda - Cliente e items */}
          <div className="lg:col-span-2 space-y-6">
            {/* Información del Cliente */}
            <Card>
              <CardHeader>
                <CardTitle>
                  <div className="flex items-center">
                    Información del Cliente
                    <Badge className="ml-2 bg-green-100 text-green-800">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Tenant
                    </Badge>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {tenant ? (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="mb-3 p-2 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-medium text-green-800">
                        <span className="inline-flex items-center">
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Información del Tenant Autocompletada
                        </span>
                      </p>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-700">Nombre del Cliente</p>
                        <p className="text-lg font-semibold text-gray-900">{tenant.businessName}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">RTN</p>
                        <p className="text-lg font-semibold text-gray-900">{tenant.businessRTN}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Email</p>
                        <p className="text-lg font-semibold text-gray-900">{tenant.businessEmail}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">Teléfono</p>
                        <p className="text-lg font-semibold text-gray-900">{tenant.phoneNumber}</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium text-gray-700">Dirección</p>
                      <p className="text-gray-900">{tenant.businessAddress}</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>Cargando información del tenant...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Items de la Factura */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle>Items de la Factura</CardTitle>
                  <div className="flex space-x-2">
                    <Button onClick={addInvoiceItem} size="sm" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Agregar Personalizado
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {/* Planes disponibles del tenant */}
                {tenantPlans.length > 0 && (
                  <div className="mb-6">
                    <h4 className="text-sm font-medium text-gray-700 mb-3">Planes del Tenant (Click para agregar)</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {tenantPlans.map((plan) => (
                        <div
                          key={plan.id}
                          onClick={() => setInvoiceItems(prev => [...prev, { ...plan, id: `${plan.id}-added` }])}
                          className="p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-medium text-sm">{plan.code}</span>
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              Plan Activo
                            </Badge>
                          </div>
                          <p className="text-sm text-gray-600">{plan.name}</p>
                          <p className="text-sm font-semibold text-gray-900">L. {plan.unitPrice}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="space-y-4">
                  {invoiceItems.map((item, index) => (
                    <div key={item.id} className="p-4 border border-gray-200 rounded-lg">
                      {item.id.startsWith('plan-') && (
                        <div className="mb-3 p-2 bg-blue-50 border border-blue-200 rounded">
                          <p className="text-sm font-medium text-blue-800">
                            <span className="inline-flex items-center">
                              <Plus className="h-3 w-3 mr-1" />
                              Plan del Tenant
                            </span>
                          </p>
                          <p className="text-xs text-blue-600 mt-1">Este item viene de los planes activos del tenant</p>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                        <div>
                          <Label>Código</Label>
                          <Input
                            value={item.code}
                            onChange={(e) => updateInvoiceItem(item.id, 'code', e.target.value)}
                            placeholder="Código del producto"
                          />
                        </div>
                        <div>
                          <Label>Descripción</Label>
                          <Input
                            value={item.name}
                            onChange={(e) => updateInvoiceItem(item.id, 'name', e.target.value)}
                            placeholder="Nombre del producto"
                          />
                        </div>
                        <div>
                          <Label>Cantidad</Label>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateInvoiceItem(item.id, 'quantity', parseInt(e.target.value) || 0)}
                            min="1"
                          />
                        </div>
                        <div>
                          <Label>Precio Unitario</Label>
                          <Input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateInvoiceItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <Label>Tasa ISV (%)</Label>
                          <select
                            value={item.taxRate}
                            onChange={(e) => updateInvoiceItem(item.id, 'taxRate', parseFloat(e.target.value))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            <option value="0">Exento</option>
                            <option value="15">15%</option>
                            <option value="18">18%</option>
                          </select>
                        </div>
                        <div>
                          <Label>Descuento</Label>
                          <Input
                            type="number"
                            value={item.discount}
                            onChange={(e) => updateInvoiceItem(item.id, 'discount', parseFloat(e.target.value) || 0)}
                            min="0"
                            step="0.01"
                          />
                        </div>
                        <div className="flex items-end">
                          {invoiceItems.length > 1 && (
                            <Button
                              onClick={() => removeInvoiceItem(item.id)}
                              variant="destructive"
                              size="sm"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <div className="text-right text-sm text-gray-600">
                        Subtotal: L. {item.subtotal.toFixed(2)} | 
                        ISV: L. {item.taxAmount.toFixed(2)} | 
                        Total: L. {item.total.toFixed(2)}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Notas */}
            <Card>
              <CardHeader>
                <CardTitle>Notas</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notas adicionales de la factura..."
                  rows={3}
                />
              </CardContent>
            </Card>
          </div>

          {/* Columna derecha - Resumen y CAI */}
          <div className="space-y-6">
            {/* Información CAI */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    Información del CAI
                    {caiInfo?.isSystemWide && (
                      <Badge className="ml-2 bg-blue-100 text-blue-800">
                        Sistema ContabHN
                      </Badge>
                    )}
                    {caiInfo?.isDemo && (
                      <Badge className="ml-2 bg-yellow-100 text-yellow-800">
                        Demostración
                      </Badge>
                    )}
                  </div>
                  <Button onClick={fetchCAIInfo} variant="outline" size="sm">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Recargar CAI
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {caiInfo ? (
                  <div className="space-y-2">
                    <p><strong>CAI:</strong> {caiInfo.cai}</p>
                    <p><strong>Rango:</strong> {caiInfo.rangeStart} - {caiInfo.rangeEnd}</p>
                    <p><strong>Actual:</strong> {caiInfo.currentNumber}</p>
                    <p><strong>Vence:</strong> {new Date(caiInfo.expiryDate).toLocaleDateString('es-HN')}</p>
                    
                    {caiInfo.isSystemWide && (
                      <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded">
                        <p className="text-sm font-medium text-blue-800">
                          <span className="inline-flex items-center">
                            <CheckCircle className="h-3 w-3 mr-1" />
                            CAI del Sistema
                          </span>
                        </p>
                        <p className="text-xs text-blue-600 mt-1">
                          Este CAI es configurado a nivel del sistema ContabHN
                        </p>
                      </div>
                    )}
                    
                    {caiInfo.isDemo && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-sm font-medium text-yellow-800">
                          <span className="inline-flex items-center">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            CAI de Demostración
                          </span>
                        </p>
                        <p className="text-xs text-yellow-600 mt-1">
                          {caiInfo.message || 'Configure el CAI real en la configuración del sistema.'}
                        </p>
                      </div>
                    )}
                    
                    {caiInfo.rtn && (
                      <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded">
                        <p className="text-sm font-medium text-gray-800">Información Fiscal</p>
                        <p className="text-xs text-gray-600 mt-1">
                          RTN: {caiInfo.rtn} | {caiInfo.businessName}
                        </p>
                        {caiInfo.establishmentCode && (
                          <p className="text-xs text-gray-600">
                            Establecimiento: {caiInfo.establishmentCode} | Punto Venta: {caiInfo.pointOfSaleCode}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500">
                    <p>No hay CAI configurado</p>
                    <Button onClick={fetchCAIInfo} variant="outline" size="sm" className="mt-2">
                      <RefreshCw className="h-4 w-4 mr-2" />
                      Cargar CAI
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Resumen */}
            <Card>
              <CardHeader>
                <CardTitle>Resumen</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>L {subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>ISV (15%):</span>
                    <span>L {tax.toFixed(2)}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>L {total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label htmlFor="notes">Notas (Opcional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Notas adicionales para la factura..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex space-x-3">
                    <Button 
                      onClick={generateInvoice} 
                      disabled={!canGenerateInvoice()}
                      className="flex-1"
                    >
                      <Save className="h-4 w-4 mr-2" />
                      Generar Factura
                    </Button>
                    
                    <Button 
                      onClick={() => setShowPreview(!showPreview)}
                      variant="outline"
                      className="flex-1"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      {showPreview ? 'Ocultar Vista' : 'Vista Previa'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Botón Generar */}
            <Button
              onClick={generateInvoice}
              disabled={!canGenerateInvoice()}
              className="w-full"
              size="lg"
            >
              <FileText className="h-5 w-5 mr-2" />
              Generar Factura
            </Button>
          </div>
        </div>
        </div>

        {/* Vista Previa de la Factura en Modal */}
        <Modal 
          isOpen={showPreview} 
          onClose={() => setShowPreview(false)}
          className="bg-white"
        >
          <div className="space-y-4">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="text-xl font-semibold">Vista Previa de la Factura</h3>
              <div className="flex space-x-2">
                <Button 
                  onClick={() => {
                    // Aquí podrías agregar funcionalidad de impresión
                    window.print();
                  }}
                  variant="outline"
                  size="sm"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Imprimir
                </Button>
                <Button 
                  onClick={() => setShowPreview(false)}
                  variant="outline"
                  size="sm"
                >
                  Cerrar
                </Button>
              </div>
            </div>
            
            <div className="border rounded-lg overflow-hidden bg-white">
              <InvoicePreview
                tenant={tenant}
                caiInfo={caiInfo}
                invoiceItems={invoiceItems}
                invoiceNumber={caiInfo?.invoiceNumber}
                notes={notes}
              />
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
}
