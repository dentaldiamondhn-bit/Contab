'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Plus, 
  Edit, 
  Trash2, 
  Eye,
  Bell,
  Calendar,
  FileText,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Download
} from 'lucide-react';
import { 
  CAI, 
  CAIAlert, 
  CAIStatistics,
  getCAIs, 
  getCAIStatistics, 
  getUnreadAlerts,
  markAllAlertsAsRead,
  createCAI,
  updateCAICurrentNumber,
  canGenerateInvoice,
  formatCAIDisplay,
  getCAIExpirationText
} from '@/lib/services/cai-service';

interface CAIFormData {
  caiCode: string;
  establishmentCode: string;
  pointOfSaleCode: string;
  documentType: string;
  rangeStart: number;
  rangeEnd: number;
  issueDate: string;
  expirationDate: string;
}

export default function CAIManager() {
  const [cais, setCAIs] = useState<CAI[]>([]);
  const [alerts, setAlerts] = useState<CAIAlert[]>([]);
  const [statistics, setStatistics] = useState<CAIStatistics | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCAI, setEditingCAI] = useState<CAI | null>(null);
  const [formData, setFormData] = useState<CAIFormData>({
    caiCode: '',
    establishmentCode: '',
    pointOfSaleCode: '',
    documentType: 'FACT',
    rangeStart: 1,
    rangeEnd: 1000,
    issueDate: new Date().toISOString().split('T')[0],
    expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  });

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [caisData, alertsData, statsData] = await Promise.all([
        getCAIs(),
        getUnreadAlerts(),
        getCAIStatistics(),
      ]);
      
      setCAIs(caisData);
      setAlerts(alertsData);
      setStatistics(statsData);
    } catch (error) {
      console.error('Error loading CAI data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const caiData = {
        ...formData,
        rangeStart: formData.rangeStart,
        rangeEnd: formData.rangeEnd,
        issueDate: new Date(formData.issueDate),
        expirationDate: new Date(formData.expirationDate),
        currentNumber: formData.rangeStart - 1, // Start from rangeStart - 1 so next invoice is rangeStart
      };

      if (editingCAI) {
        // Update existing CAI (would need update function in service)
        console.log('Update CAI:', caiData);
      } else {
        // Create new CAI
        await createCAI(caiData);
      }

      setShowForm(false);
      setEditingCAI(null);
      setFormData({
        caiCode: '',
        establishmentCode: '',
        pointOfSaleCode: '',
        documentType: 'FACT',
        rangeStart: 1,
        rangeEnd: 1000,
        issueDate: new Date().toISOString().split('T')[0],
        expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      });
      loadData();
    } catch (error) {
      console.error('Error saving CAI:', error);
    }
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return <Badge className="bg-green-100 text-green-800">Activo</Badge>;
      case 'EXPIRING':
        return <Badge className="bg-yellow-100 text-yellow-800">Por Vencer</Badge>;
      case 'EXPIRED':
        return <Badge className="bg-red-100 text-red-800">Vencido</Badge>;
      case 'EXHAUSTED':
        return <Badge className="bg-orange-100 text-orange-800">Agotado</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Get alert icon
  const getAlertIcon = (alertType: string) => {
    switch (alertType) {
      case 'RANGE_CRITICAL':
      case 'EXPIRATION_CRITICAL':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'RANGE_WARNING':
      case 'EXPIRATION_WARNING':
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      default:
        return <Bell className="w-4 h-4 text-blue-600" />;
    }
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
            <Shield className="w-8 h-8" />
            Gestión de CAI
          </h1>
          <p className="text-muted-foreground">
            Administra los Códigos de Autorización de Impresión del SAR
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => markAllAlertsAsRead().then(loadData)}>
            <CheckCircle className="w-4 h-4 mr-2" />
            Marcar alertas como leídas
          </Button>
          <Button onClick={() => setShowForm(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Nuevo CAI
          </Button>
        </div>
      </div>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Bell className="w-5 h-5" />
              Alertas Activas ({alerts.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-red-200">
                  {getAlertIcon(alert.alertType)}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString('es-HN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total CAIs</p>
                  <p className="text-2xl font-bold">{statistics.totalCAIs}</p>
                </div>
                <FileText className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Activos</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.activeCAIs}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Por Vencer</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistics.expiringCAIs}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Facturas Restantes</p>
                  <p className="text-2xl font-bold">{statistics.totalRemainingInvoices}</p>
                </div>
                <TrendingUp className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CAI Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>
              {editingCAI ? 'Editar CAI' : 'Nuevo CAI'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="caiCode">Código CAI</Label>
                  <Input
                    id="caiCode"
                    value={formData.caiCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, caiCode: e.target.value }))}
                    placeholder="Ej: 0801-2023-12345678901234567890"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="establishmentCode">Código Establecimiento</Label>
                  <Input
                    id="establishmentCode"
                    value={formData.establishmentCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, establishmentCode: e.target.value }))}
                    placeholder="Ej: 0801"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="pointOfSaleCode">Código POS</Label>
                  <Input
                    id="pointOfSaleCode"
                    value={formData.pointOfSaleCode}
                    onChange={(e) => setFormData(prev => ({ ...prev, pointOfSaleCode: e.target.value }))}
                    placeholder="Ej: 01"
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="documentType">Tipo Documento</Label>
                  <select
                    id="documentType"
                    value={formData.documentType}
                    onChange={(e) => setFormData(prev => ({ ...prev, documentType: e.target.value }))}
                    className="w-full p-2 border rounded-md"
                    required
                  >
                    <option value="FACT">Factura</option>
                    <option value="NOTA_CREDITO">Nota de Crédito</option>
                    <option value="NOTA_DEBITO">Nota de Débito</option>
                    <option value="COMPROBANTE">Comprobante</option>
                  </select>
                </div>
                
                <div>
                  <Label htmlFor="rangeStart">Rango Inicial</Label>
                  <Input
                    id="rangeStart"
                    type="number"
                    value={formData.rangeStart}
                    onChange={(e) => setFormData(prev => ({ ...prev, rangeStart: parseInt(e.target.value) }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="rangeEnd">Rango Final</Label>
                  <Input
                    id="rangeEnd"
                    type="number"
                    value={formData.rangeEnd}
                    onChange={(e) => setFormData(prev => ({ ...prev, rangeEnd: parseInt(e.target.value) }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="issueDate">Fecha Emisión</Label>
                  <Input
                    id="issueDate"
                    type="date"
                    value={formData.issueDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, issueDate: e.target.value }))}
                    required
                  />
                </div>
                
                <div>
                  <Label htmlFor="expirationDate">Fecha Vencimiento</Label>
                  <Input
                    id="expirationDate"
                    type="date"
                    value={formData.expirationDate}
                    onChange={(e) => setFormData(prev => ({ ...prev, expirationDate: e.target.value }))}
                    required
                  />
                </div>
              </div>
              
              <div className="flex gap-2">
                <Button type="submit">
                  {editingCAI ? 'Actualizar' : 'Crear'} CAI
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowForm(false);
                    setEditingCAI(null);
                  }}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* CAI List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de CAIs</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {cais.map((cai) => {
              const remaining = cai.rangeEnd - cai.currentNumber;
              const usagePercentage = ((cai.currentNumber - cai.rangeStart) / (cai.rangeEnd - cai.rangeStart)) * 100;
              
              return (
                <div key={cai.id} className="border rounded-lg p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{cai.caiCode}</h3>
                        {getStatusBadge(cai.status)}
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                        <div>
                          <span className="font-medium">Establecimiento:</span> {cai.establishmentCode}
                        </div>
                        <div>
                          <span className="font-medium">POS:</span> {cai.pointOfSaleCode}
                        </div>
                        <div>
                          <span className="font-medium">Documento:</span> {cai.documentType}
                        </div>
                        <div>
                          <span className="font-medium">Vencimiento:</span> {getCAIExpirationText(cai)}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Uso del Rango: {cai.currentNumber} / {cai.rangeEnd}</span>
                      <span>{usagePercentage.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          usagePercentage > 90 ? 'bg-red-500' : 
                          usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${usagePercentage}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Facturas restantes: {remaining}</span>
                      <span>
                        {remaining <= 1 && '🚨 Crítico'}
                        {remaining > 1 && remaining <= 10 && '⚠️ Precaución'}
                        {remaining > 10 && '✅ Normal'}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
            
            {cais.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No hay CAIs registrados</p>
                <Button onClick={() => setShowForm(true)} className="mt-2">
                  <Plus className="w-4 h-4 mr-2" />
                  Crear primer CAI
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
