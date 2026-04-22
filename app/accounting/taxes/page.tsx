"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Plus, 
  Search,
  Filter,
  Download,
  Upload,
  FileText,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  Calendar,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Edit,
  Trash2,
  Receipt,
  CreditCard
} from 'lucide-react';
import { supabase } from '@/lib/supabase/standard-client';

interface Tax {
  id: string;
  tenantId: string;
  name: string;
  type: 'IVA' | 'ISR' | 'ISV' | 'OTRO';
  rate: number;
  description?: string;
  isactive: boolean;
  createdat: string;
  updatedat: string;
}

interface Retention {
  id: string;
  tenantId: string;
  name: string;
  type: 'IVA' | 'ISR' | 'ISV' | 'OTRO';
  rate: number;
  description?: string;
  isactive: boolean;
  createdat: string;
  updatedat: string;
}

interface NewTaxData {
  name: string;
  type: 'IVA' | 'ISR' | 'ISV' | 'OTRO';
  rate: string;
  description: string;
}

export default function TaxesPage() {
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [retentions, setRetentions] = useState<Retention[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('impuestos');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingTax, setEditingTax] = useState<Tax | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [formData, setFormData] = useState<NewTaxData>({
    name: '',
    type: 'IVA',
    rate: '',
    description: ''
  });

  useEffect(() => {
    loadTaxes();
    loadRetentions();
  }, []);

  const loadTaxes = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Taxes')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setTaxes(data || []);
    } catch (error) {
      console.error('Error loading taxes:', error);
      setMessage({ type: 'error', text: 'Error al cargar los impuestos' });
    } finally {
      setLoading(false);
    }
  };

  const loadRetentions = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('Retentions')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setRetentions(data || []);
    } catch (error) {
      console.error('Error loading retentions:', error);
      setMessage({ type: 'error', text: 'Error al cargar las retenciones' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      if (editingTax) {
        // Update existing tax/retention
        const tableName = activeTab === 'impuestos' ? 'Taxes' : 'Retentions';
        const { error } = await supabase
          .from(tableName)
          .update({
            where: { id: editingTax.id },
            data: {
              ...formData,
              rate: parseFloat(formData.rate),
              updatedat: new Date().toISOString()
            }
          });

        if (error) throw error;
        setMessage({ type: 'success', text: `${activeTab === 'impuestos' ? 'Impuesto' : 'Retención'} actualizado exitosamente` });
      } else {
        // Create new tax/retention
        const tableName = activeTab === 'impuestos' ? 'Taxes' : 'Retentions';
        const { error } = await supabase
          .from(tableName)
          .insert({
            ...formData,
            rate: parseFloat(formData.rate),
            tenantid: '1',
            isactive: true,
            createdat: new Date().toISOString(),
            updatedat: new Date().toISOString()
          });

        if (error) throw error;
        setMessage({ type: 'success', text: `${activeTab === 'impuestos' ? 'Impuesto' : 'Retención'} creado exitosamente` });
      }

      // Reset form and close dialog
      setFormData({ name: '', type: 'IVA', rate: '', description: '' });
      setEditingTax(null);
      setShowAddDialog(false);
      
      if (activeTab === 'impuestos') {
        loadTaxes();
      } else {
        loadRetentions();
      }
    } catch (error: any) {
      console.error('Error saving tax/retention:', error);
      setMessage({ type: 'error', text: error.message || 'Error al guardar' });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (item: Tax | Retention) => {
    setEditingTax(item as Tax);
    setFormData({
      name: item.name,
      type: item.type,
      rate: item.rate.toString(),
      description: item.description || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm(`¿Está seguro de que desea eliminar este ${activeTab === 'impuestos' ? 'impuesto' : 'retención'}?`)) return;

    try {
      const tableName = activeTab === 'impuestos' ? 'Taxes' : 'Retentions';
      const { error } = await supabase
        .from(tableName)
        .delete()
        .eq('id', id);

      if (error) throw error;
      setMessage({ type: 'success', text: `${activeTab === 'impuestos' ? 'Impuesto' : 'Retención'} eliminado exitosamente` });
      
      if (activeTab === 'impuestos') {
        loadTaxes();
      } else {
        loadRetentions();
      }
    } catch (error: any) {
      console.error('Error deleting item:', error);
      setMessage({ type: 'error', text: 'Error al eliminar' });
    }
  };

  const toggleStatus = async (id: string) => {
    try {
      const tableName = activeTab === 'impuestos' ? 'Taxes' : 'Retentions';
      const item = activeTab === 'impuestos' ? taxes.find(t => t.id === id) : retentions.find(r => r.id === id);
      if (!item) return;

      const { error } = await supabase
        .from(tableName)
        .update({
          where: { id },
          data: {
            isactive: !item.isactive,
            updatedat: new Date().toISOString()
          }
        });

      if (error) throw error;
      setMessage({ 
        type: 'success', 
        text: `${activeTab === 'impuestos' ? 'Impuesto' : 'Retención'} ${item.isactive ? 'desactivado' : 'activado'} exitosamente` 
      });
      
      if (activeTab === 'impuestos') {
        loadTaxes();
      } else {
        loadRetentions();
      }
    } catch (error: any) {
      console.error('Error toggling status:', error);
      setMessage({ type: 'error', text: 'Error al cambiar el estado' });
    }
  };

  const filteredTaxes = taxes.filter(tax =>
    tax.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tax.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRetentions = retentions.filter(retention =>
    retention.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    retention.type.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const activeTaxes = filteredTaxes.filter(t => t.isactive);
  const inactiveTaxes = filteredTaxes.filter(t => !t.isactive);
  const activeRetentions = filteredRetentions.filter(r => r.isactive);
  const inactiveRetentions = filteredRetentions.filter(r => !r.isactive);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Contabilidad - Impuestos</h1>
          <p className="text-muted-foreground">
            Gestiona impuestos y retenciones fiscales
          </p>
        </div>
        <Button 
          className="bg-blue-600 hover:bg-blue-700"
          onClick={() => {
            setEditingTax(null);
            setFormData({ name: '', type: 'IVA', rate: '', description: '' });
            setShowAddDialog(true);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Nuevo {activeTab === 'impuestos' ? 'Impuesto' : 'Retención'}
        </Button>
      </div>

      {/* Alerts */}
      {message && (
        <Alert className={message.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="impuestos" className="flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            Impuestos
          </TabsTrigger>
          <TabsTrigger value="retenciones" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            Retenciones
          </TabsTrigger>
        </TabsList>

        {/* Search Bar */}
        <Card className="mt-4">
          <CardContent className="flex items-center space-x-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder={`Buscar ${activeTab === 'impuestos' ? 'impuestos' : 'retenciones'}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </Button>
          </CardContent>
        </Card>

        {/* Impuestos Tab */}
        <TabsContent value="impuestos" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Impuestos</CardTitle>
                <Receipt className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{taxes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeTaxes.length} activos
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impuestos Activos</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeTaxes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {((activeTaxes.length / taxes.length) * 100).toFixed(1)}% del total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Impuestos Inactivos</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{inactiveTaxes.length}</div>
                <p className="text-xs text-muted-foreground">
                  {((inactiveTaxes.length / taxes.length) * 100).toFixed(1)}% del total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Impuestos List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTaxes.map((tax) => (
              <Card key={tax.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${tax.isactive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <CardTitle className="text-lg">{tax.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {tax.type}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={tax.isactive ? 'default' : 'secondary'}>
                      {tax.isactive ? 'Activo' : 'Inactivo'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tasa:</span>
                    <span className="text-lg font-bold text-blue-600">{tax.rate}%</span>
                  </div>
                  
                  {tax.description && (
                    <div className="text-sm text-gray-600">
                      <p>{tax.description}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(tax)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(tax.id)}
                      >
                        {tax.isactive ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(tax.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    Creado: {new Date(tax.createdat).toLocaleDateString('es-HN')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Retenciones Tab */}
        <TabsContent value="retenciones" className="space-y-4">
          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Retenciones</CardTitle>
                <CreditCard className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{retentions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {activeRetentions.length} activas
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retenciones Activas</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{activeRetentions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {((activeRetentions.length / retentions.length) * 100).toFixed(1)}% del total
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Retenciones Inactivas</CardTitle>
                <AlertTriangle className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{inactiveRetentions.length}</div>
                <p className="text-xs text-muted-foreground">
                  {((inactiveRetentions.length / retentions.length) * 100).toFixed(1)}% del total
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Retentions List */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredRetentions.map((retention) => (
              <Card key={retention.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className={`w-2 h-2 rounded-full ${retention.isactive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                      <div>
                        <CardTitle className="text-lg">{retention.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {retention.type}
                        </CardDescription>
                      </div>
                    </div>
                    <Badge variant={retention.isactive ? 'default' : 'secondary'}>
                      {retention.isactive ? 'Activa' : 'Inactiva'}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">Tasa:</span>
                    <span className="text-lg font-bold text-orange-600">{retention.rate}%</span>
                  </div>
                  
                  {retention.description && (
                    <div className="text-sm text-gray-600">
                      <p>{retention.description}</p>
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="flex space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(retention)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleStatus(retention.id)}
                      >
                        {retention.isactive ? (
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(retention.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="text-xs text-gray-500 mt-2">
                    Creado: {new Date(retention.createdat).toLocaleDateString('es-HN')}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>

      {/* Empty State */}
      {(activeTab === 'impuestos' ? filteredTaxes.length === 0 : filteredRetentions.length === 0) && (
        <div className="text-center py-12">
          {activeTab === 'impuestos' ? (
            <Receipt className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          ) : (
            <CreditCard className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          )}
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {searchTerm ? `No se encontraron ${activeTab === 'impuestos' ? 'impuestos' : 'retenciones'}` : `No hay ${activeTab === 'impuestos' ? 'impuestos' : 'retenciones'} registrados`}
          </h3>
          <p className="text-gray-600">
            {searchTerm 
              ? `No hay ${activeTab === 'impuestos' ? 'impuestos' : 'retenciones'} que coincidan con "${searchTerm}"`
              : `Empieza agregando tu primer ${activeTab === 'impuestos' ? 'impuesto' : 'retención'}`
            }
          </p>
          {!searchTerm && (
            <Button onClick={() => setShowAddDialog(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Agregar Primer {activeTab === 'impuestos' ? 'Impuesto' : 'Retención'}
            </Button>
          )}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingTax ? `Editar ${activeTab === 'impuestos' ? 'Impuesto' : 'Retención'}` : `Nuevo ${activeTab === 'impuestos' ? 'Impuesto' : 'Retención'}`}
            </DialogTitle>
            <DialogDescription>
              {editingTax 
                ? `Modifica los datos del ${activeTab === 'impuestos' ? 'impuesto' : 'retención'} existente`
                : `Agrega un nuevo ${activeTab === 'impuestos' ? 'impuesto' : 'retención'} fiscal`
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="Nombre del impuesto o retención"
                  required
                />
              </div>
              <div>
                <Label htmlFor="type">Tipo *</Label>
                <select
                  id="type"
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value as any }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="IVA">IVA (Impuesto al Valor Agregado)</option>
                  <option value="ISR">ISR (Impuesto Sobre la Renta)</option>
                  <option value="ISV">ISV (Impuesto Sobre Ventas)</option>
                  <option value="OTRO">Otro</option>
                </select>
              </div>
              <div>
                <Label htmlFor="rate">Tasa (%) *</Label>
                <Input
                  id="rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.rate}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                  placeholder="15.00"
                  required
                />
              </div>
              <div className="md:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Descripción opcional del impuesto o retención"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowAddDialog(false);
                  setEditingTax(null);
                  setFormData({ name: '', type: 'IVA', rate: '', description: '' });
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Guardando...' : (editingTax ? 'Actualizar' : 'Guardar')}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
