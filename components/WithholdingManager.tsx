'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Receipt, 
  Calculator, 
  Download, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  CheckCircle,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  FileText,
  Calendar
} from 'lucide-react';
import { 
  Withholding, 
  WithholdingType, 
  WithholdingStatus,
  getWithholdings, 
  getWithholdingStatistics,
  createWithholding,
  updateWithholdingStatus,
  calculateWithholding,
  formatWithholdingType,
  formatWithholdingRate,
  formatCurrency,
  getCurrentPeriod,
  validateRTN,
  generateWithholdingReceipt
} from '@/lib/services/withholding-service';
import { pdf } from '@react-pdf/renderer';
import WithholdingReceiptPDF from './reports/WithholdingReceiptPDF';

import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
interface WithholdingFormData {
  invoiceNumber: string;
  invoiceDate: string;
  providerName: string;
  providerRTN: string;
  providerAddress: string;
  amount: string;
  type: WithholdingType;
  description: string;
}

export default function WithholdingManager() {
  const [withholdings, setWithholdings] = useState<Withholding[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingWithholding, setEditingWithholding] = useState<Withholding | null>(null);
  const [formData, setFormData] = useState<WithholdingFormData>({
    invoiceNumber: '',
    invoiceDate: new Date().toISOString().split('T')[0],
    providerName: '',
    providerRTN: '',
    providerAddress: '',
    amount: '',
    type: 'PROFESSIONAL_SERVICES_1%',
    description: '',
  });
  const [calculation, setCalculation] = useState<any>(null);
  const [generatingPDF, setGeneratingPDF] = useState(false);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [withholdingsData, statsData] = await Promise.all([
        getWithholdings(),
        getWithholdingStatistics(),
      ]);
      
      setWithholdings(withholdingsData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading withholding data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const amountInCents = Math.round(parseFloat(formData.amount) * 100);
      
      const withholdingData = {
        ...formData,
        invoiceDate: new Date(formData.invoiceDate),
        amount: amountInCents,
        period: getCurrentPeriod(),
        withholdingRate: formData.type === 'PROFESSIONAL_SERVICES_1%' ? 0.01 : 0.125,
      };

      if (editingWithholding) {
        // Update existing withholding (would need update function in service)
        console.log('Update withholding:', withholdingData);
      } else {
        await createWithholding(withholdingData);
      }

      setShowForm(false);
      setEditingWithholding(null);
      setFormData({
        invoiceNumber: '',
        invoiceDate: new Date().toISOString().split('T')[0],
        providerName: '',
        providerRTN: '',
        providerAddress: '',
        amount: '',
        type: 'PROFESSIONAL_SERVICES_1%',
        description: '',
      });
      setCalculation(null);
      loadData();
    } catch (error) {
      console.error('Error saving withholding:', error);
    }
  };

  // Calculate withholding on amount change
  const handleAmountChange = (value: string) => {
    setFormData(prev => ({ ...prev, amount: value }));
    
    if (value && !isNaN(parseFloat(value))) {
      const amountInCents = Math.round(parseFloat(value) * 100);
      const calc = calculateWithholding(amountInCents, formData.type);
      setCalculation(calc);
    } else {
      setCalculation(null);
    }
  };

  // Generate PDF receipt
  const generatePDF = async (withholding: Withholding) => {
    try {
      setGeneratingPDF(true);
      
      const receiptData = generateWithholdingReceipt(withholding);
      const doc = <WithholdingReceiptPDF receiptData={receiptData} />;
      
      const pdfBlob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(pdfBlob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `comprobante-retencion-${withholding.receiptNumber || withholding.id}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error generating PDF:', error);
    } finally {
      setGeneratingPDF(false);
    }
  };

  // Update withholding status
  const updateStatus = async (id: string, status: WithholdingStatus) => {
    try {
      await updateWithholdingStatus(id, status, status === 'PAID' ? new Date() : undefined);
      loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-yellow-100 text-yellow-800">Pendiente</Badge>;
      case 'PAID':
        return <Badge className="bg-green-100 text-green-800">Pagado</Badge>;
      case 'CANCELLED':
        return <Badge className="bg-red-100 text-red-800">Cancelado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Validate form
  const validateForm = () => {
    if (!formData.invoiceNumber || !formData.providerName || !formData.providerRTN || !formData.amount) {
      return false;
    }
    
    if (!validateRTN(formData.providerRTN)) {
      return false;
    }
    
    if (isNaN(parseFloat(formData.amount)) || parseFloat(formData.amount) <= 0) {
      return false;
    }
    
    return true;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Receipt className="w-8 h-8" />
            Gestión de Retenciones
          </h1>
          <p className="text-muted-foreground">
            Calcula y gestiona las retenciones del 1% y 12.5% sobre honorarios profesionales
          </p>
        </div>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="w-4 h-4 mr-2" />
          Nueva Retención
        </Button>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Retenciones</p>
                  <p className="text-2xl font-bold">{statistics.totalWithholdings}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monto Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(statistics.totalAmount)}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Retenido</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(statistics.totalWithheld)}</p>
                </div>
                <Calculator className="w-8 h-8 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistics.pendingCount}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Withholding Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingWithholding ? 'Editar Retención' : 'Nueva Retención'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="invoiceNumber">Número de Factura</Label>
                  <Input
                    id="invoiceNumber"
                    value={formData.invoiceNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                    placeholder="F001-1234"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="invoiceDate">Fecha de Factura</Label>
                  <Input
                    id="invoiceDate"
                    type="date"
                    value={formData.invoiceDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, invoiceDate: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="providerName">Nombre del Proveedor</Label>
                  <Input
                    id="providerName"
                    value={formData.providerName}
                    onChange={(e) => setFormData(prev => ({ ...prev, providerName: e.target.value }))}
                    placeholder="Nombre completo del proveedor"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="providerRTN">RTN del Proveedor</Label>
                  <Input
                    id="providerRTN"
                    value={formData.providerRTN}
                    onChange={(e) => setFormData(prev => ({ ...prev, providerRTN: e.target.value }))}
                    placeholder="0801-XXXXX-X"
                    required
                    className={formData.providerRTN && !validateRTN(formData.providerRTN) ? 'border-red-500' : ''}
                  />
                  {formData.providerRTN && !validateRTN(formData.providerRTN) && (
                    <p className="text-xs text-red-600 mt-1">RTN inválido</p>
                  )}
                </div>
                
                <div>
                  <Label htmlFor="providerAddress">Dirección del Proveedor</Label>
                  <Input
                    id="providerAddress"
                    value={formData.providerAddress}
                    onChange={(e) => setFormData(prev => ({ ...prev, providerAddress: e.target.value }))}
                    placeholder="Dirección opcional"
                  />
                </div>
                
                <div>
                  <Label htmlFor="amount">Monto (L)</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => handleAmountChange(e.target.value)}
                    placeholder="0.00"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="type">Tipo de Retención</Label>
                  <select
                    id="type"
                    value={formData.type}
                    onChange={(e) => {
                      const newType = e.target.value as WithholdingType;
                      setFormData(prev => ({ ...prev, type: newType }));
                      if (formData.amount && !isNaN(parseFloat(formData.amount))) {
                        const amountInCents = Math.round(parseFloat(formData.amount) * 100);
                        const calc = calculateWithholding(amountInCents, newType);
                        setCalculation(calc);
                      }
                    }}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="PROFESSIONAL_SERVICES_1%">Servicios Profesionales (1%)</option>
                    <option value="PROFESSIONAL_SERVICES_12_5%">Servicios Profesionales (12.5%)</option>
                    <option value="OTHER">Otros</option>
                  </select>
                </div>
                
                <div className="md:col-span-2">
                  <Label htmlFor="description">Descripción</Label>
                  <Input
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descripción de los servicios prestados"
                    required
                  />
                </div>
              </div>
              
              {/* Calculation Preview */}
              {calculation && (
                <div className="border rounded-lg p-4 bg-muted/50">
                  <h4 className="font-medium mb-2">Cálculo de Retención</h4>
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Monto Base:</span>
                      <p className="font-bold">{formatCurrency(calculation.baseAmount)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Tasa:</span>
                      <p className="font-bold">{formatWithholdingRate(calculation.withholdingRate)}</p>
                    </div>
                    <div>
                      <span className="font-medium">Retención:</span>
                      <p className="font-bold text-red-600">{formatCurrency(calculation.withholdingAmount)}</p>
                    </div>
                  </div>
                  <div className="mt-2 pt-2 border-t">
                    <span className="font-medium">Monto Neto:</span>
                    <p className="font-bold text-green-600">{formatCurrency(calculation.netAmount)}</p>
                  </div>
                </div>
              )}
              
              <div className="flex gap-2">
                <Button type="submit" disabled={!validateForm()}>
                  {editingWithholding ? 'Actualizar' : 'Crear'} Retención
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingWithholding(null);
                    setCalculation(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Withholding List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Retenciones</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {withholdings.map((withholding) => (
              <div key={withholding.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold">{withholding.invoiceNumber}</h3>
                      {getStatusBadge(withholding.status)}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="font-medium">Proveedor:</span> {withholding.providerName}
                      </div>
                      <div>
                        <span className="font-medium">RTN:</span> {withholding.providerRTN}
                      </div>
                      <div>
                        <span className="font-medium">Tipo:</span> {formatWithholdingType(withholding.type)}
                      </div>
                      <div>
                        <span className="font-medium">Período:</span> {withholding.period}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => generatePDF(withholding)}
                      disabled={generatingPDF}
                    >
                      <Download className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4" />
                    </Button>
                    {withholding.status === 'PENDING' && (
                      <Button 
                        size="sm"
                        onClick={() => updateStatus(withholding.id, 'PAID')}
                      >
                        <CheckCircle className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
                
                {/* Amount Details */}
                <div className="grid grid-cols-3 gap-4 text-sm bg-muted/50 p-3 rounded">
                  <div>
                    <span className="font-medium">Monto Base:</span>
                    <p className="font-bold">{formatCurrency(withholding.amount)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Retención:</span>
                    <p className="font-bold text-red-600">{formatCurrency(withholding.withholdingAmount)}</p>
                  </div>
                  <div>
                    <span className="font-medium">Neto:</span>
                    <p className="font-bold text-green-600">{formatCurrency(withholding.amount - withholding.withholdingAmount)}</p>
                  </div>
                </div>
                
                {/* Additional Info */}
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Fecha: {withholding.invoiceDate.toLocaleDateString('es-HN')}</span>
                  {withholding.receiptNumber && (
                    <span>Recibo: {withholding.receiptNumber}</span>
                  )}
                  {withholding.paymentDate && (
                    <span>Pagado: {withholding.paymentDate.toLocaleDateString('es-HN')}</span>
                  )}
                </div>
              </div>
            ))}
            
            {withholdings.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Receipt className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay retenciones registradas</p>
                <Button onClick={() => setShowForm(true)} className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primera retención
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
