'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar, Clock, RefreshCw, Search, Building2, AlertTriangle, CheckCircle, Plus, Gift, CreditCard, ArrowRightLeft, Trash2, History } from 'lucide-react';

interface TenantActivity {
  tenantId: string;
  businessName: string;
  rtn: string;
  tenantCode: string;
  plan: string;
  isActive: boolean;
  monthlyCost: number;
  createdAt: string;
  createdAtFormatted: string;
  daysActive: number;
  monthsActive: number;
  totalMonths: number;
  nextRenewal: string;
  nextRenewalFormatted: string;
  daysUntilRenewal: number;
  totalCompensationDays: number;
}

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  max_users: number;
  max_storage: number;
  max_transactions: number;
  isActive?: boolean;
  is_active?: boolean;
}

interface Compensation {
  id: string;
  tenantid: string;
  type: string;
  days: number;
  amount: number;
  description: string;
  reason: string;
  createdby: string;
  createdat: string;
  used: boolean;
  usedat: string | null;
}

export default function TenantActivityPage() {
  const [tenants, setTenants] = useState<TenantActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCompensationDialog, setShowCompensationDialog] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantActivity | null>(null);
  const [compensations, setCompensations] = useState<Compensation[]>([]);
  const [allCompensations, setAllCompensations] = useState<Compensation[]>([]);
  const [loadingCompensations, setLoadingCompensations] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);

  const [compForm, setCompForm] = useState({
    type: 'EXTEND_DAYS',
    days: '',
    amount: '',
    description: '',
    reason: '',
    selectedPlanCode: '',
  });

  const fetchData = async () => {
    setLoading(true);
    try {
      const [activityRes, compsRes] = await Promise.all([
        fetch('/api/admin/tenants/activity'),
        fetch('/api/admin/tenants/compensations'),
      ]);
      const activityData = await activityRes.json();
      const compsData = await compsRes.json();
      if (activityRes.ok) {
        setTenants(activityData.tenants || []);
      }
      if (compsRes.ok) {
        setAllCompensations(compsData.compensations || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    fetchPlans();
  }, []);

  const fetchPlans = async () => {
    try {
      const res = await fetch('/api/admin/plans');
      const data = await res.json();
      if (res.ok && data.plans) {
        setPlans(data.plans);
      } else if (res.ok && Array.isArray(data)) {
        setPlans(data);
      }
    } catch (error) {
      console.error('Error fetching plans:', error);
    }
  };

  const fetchCompensations = async (tenantId: string) => {
    setLoadingCompensations(true);
    try {
      const res = await fetch(`/api/admin/tenants/compensations?tenantId=${tenantId}`);
      const data = await res.json();
      if (res.ok) {
        setCompensations(data.compensations || []);
      }
    } catch (error) {
      console.error('Error fetching compensations:', error);
    } finally {
      setLoadingCompensations(false);
    }
  };

  const handleAddCompensation = async () => {
    if (!selectedTenant || !compForm.description) return;

    try {
      const res = await fetch('/api/admin/tenants/compensations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tenantId: selectedTenant.tenantId,
          type: compForm.type,
          days: parseInt(compForm.days) || 0,
          amount: parseInt(compForm.amount) || 0,
          description: compForm.description,
          reason: compForm.reason,
          selectedPlanCode: compForm.selectedPlanCode || undefined,
        }),
      });

      if (res.ok) {
        setShowCompensationDialog(false);
        setCompForm({ type: 'EXTEND_DAYS', days: '', amount: '', description: '', reason: '', selectedPlanCode: '' });
        fetchData();
        if (selectedTenant) fetchCompensations(selectedTenant.tenantId);
      }
    } catch (error) {
      console.error('Error adding compensation:', error);
    }
  };

  const handleDeleteCompensation = async (id: string) => {
    if (!confirm('¿Eliminar esta compensación?')) return;
    try {
      const res = await fetch(`/api/admin/tenants/compensations?id=${id}`, { method: 'DELETE' });
      if (res.ok && selectedTenant) {
        fetchCompensations(selectedTenant.tenantId);
        fetchData();
      }
    } catch (error) {
      console.error('Error deleting compensation:', error);
    }
  };

  const openCompensation = (tenant: TenantActivity) => {
    setSelectedTenant(tenant);
    setCompForm({ type: 'EXTEND_DAYS', days: '', amount: '', description: '', reason: '', selectedPlanCode: '' });
    setShowCompensationDialog(true);
  };

  const openHistory = (tenant: TenantActivity) => {
    setSelectedTenant(tenant);
    fetchCompensations(tenant.tenantId);
    setShowHistoryDialog(true);
  };

  const filteredTenants = tenants.filter(t =>
    t.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    t.rtn?.includes(searchTerm) ||
    t.tenantCode?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRenewalColor = (days: number) => {
    if (days <= 3) return 'text-red-600 bg-red-50';
    if (days <= 7) return 'text-orange-600 bg-orange-50';
    if (days <= 14) return 'text-yellow-600 bg-yellow-50';
    return 'text-green-600 bg-green-50';
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'ENTERPRISE': return 'bg-purple-100 text-purple-800';
      case 'PREMIUM': return 'bg-blue-100 text-blue-800';
      case 'GROWTH': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCompTypeLabel = (type: string) => {
    switch (type) {
      case 'EXTEND_DAYS': return { label: 'Extensión', icon: Calendar, color: 'text-blue-600 bg-blue-50 border-blue-200' };
      case 'CREDIT': return { label: 'Crédito', icon: CreditCard, color: 'text-green-600 bg-green-50 border-green-200' };
      case 'CHANGE_PLAN': return { label: 'Cambio Plan', icon: ArrowRightLeft, color: 'text-purple-600 bg-purple-50 border-purple-200' };
      default: return { label: type, icon: Gift, color: 'text-gray-600 bg-gray-50 border-gray-200' };
    }
  };

  const getTenantCompensations = (tenantId: string) => {
    return allCompensations.filter(c => c.tenantid === tenantId);
  };

  const getAvailableCredit = (tenantId: string) => {
    const credits = allCompensations.filter(c => c.tenantid === tenantId && c.type === 'CREDIT');
    const total = credits.reduce((sum, c) => sum + (c.amount || 0), 0);
    const used = credits.filter(c => c.used).reduce((sum, c) => sum + (c.amount || 0), 0);
    return total - used;
  };

  const getStats = () => {
    const total = tenants.length;
    const active = tenants.filter(t => t.isActive).length;
    const renewingSoon = tenants.filter(t => t.daysUntilRenewal <= 7).length;
    const withCompensations = tenants.filter(t => t.totalCompensationDays > 0).length;
    return { total, active, renewingSoon, withCompensations };
  };

  const stats = getStats();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Actividad de Tenants</h1>
          <p className="text-gray-600">Tiempo activo, renovación y compensaciones</p>
        </div>
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Actualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Renuevan esta semana</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{stats.renewingSoon}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Con Compensaciones</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">{stats.withCompensations}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Buscar por nombre, RTN o código..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Activity Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Actividad y Renovaciones
          </CardTitle>
          <CardDescription>
            Estado de suscripción, tiempo restante y compensaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-2 font-medium">Tenant</th>
                  <th className="text-center py-3 px-2 font-medium">Plan</th>
                  <th className="text-center py-3 px-2 font-medium">Tiempo Activo</th>
                  <th className="text-center py-3 px-2 font-medium">Próxima Renovación</th>
                  <th className="text-center py-3 px-2 font-medium">Costo</th>
                  <th className="text-center py-3 px-2 font-medium">Saldo Crédito</th>
                  <th className="text-left py-3 px-2 font-medium min-w-[200px]">Compensaciones</th>
                  <th className="text-center py-3 px-2 font-medium">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.tenantId} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-gray-400" />
                        <div>
                          <div className="font-medium">{tenant.businessName}</div>
                          <div className="text-xs text-gray-500">{tenant.tenantCode}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPlanColor(tenant.plan)}`}>
                        {tenant.plan}
                      </span>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="font-medium">{tenant.monthsActive} meses</div>
                      <div className="text-xs text-gray-500">{tenant.daysActive} días</div>
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg ${getRenewalColor(tenant.daysUntilRenewal)}`}>
                        {tenant.daysUntilRenewal <= 3 ? (
                          <AlertTriangle className="h-3.5 w-3.5" />
                        ) : (
                          <CheckCircle className="h-3.5 w-3.5" />
                        )}
                        <span className="font-medium">{tenant.daysUntilRenewal} días</span>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">{tenant.nextRenewalFormatted}</div>
                    </td>
                    <td className="py-3 px-2 text-center font-medium">
                      L {tenant.monthlyCost.toLocaleString()}
                    </td>
                    <td className="py-3 px-2 text-center">
                      {(() => {
                        const availableCredit = getAvailableCredit(tenant.tenantId);
                        return (
                          <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${availableCredit > 0 ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-gray-50 text-gray-400 border border-gray-200'}`}>
                            {availableCredit > 0 ? `L ${availableCredit.toLocaleString()}` : 'Sin saldo'}
                          </span>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-2">
                      {(() => {
                        const tenantComps = getTenantCompensations(tenant.tenantId);
                        if (tenantComps.length === 0) {
                          <span className="text-xs text-gray-400">Sin compensaciones</span>
                        }
                        return (
                          <div className="flex flex-wrap gap-1">
                            {tenantComps.slice(0, 3).map((comp) => {
                              const typeInfo = getCompTypeLabel(comp.type);
                              return (
                                <span
                                  key={comp.id}
                                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border ${typeInfo.color}`}
                                  title={comp.description}
                                >
                                  {comp.type === 'EXTEND_DAYS' && `+${comp.days}d`}
                                  {comp.type === 'CREDIT' && `L${comp.amount}`}
                                  {comp.type === 'CHANGE_PLAN' && comp.description}
                                </span>
                              );
                            })}
                            {tenantComps.length > 3 && (
                              <button
                                onClick={() => openHistory(tenant)}
                                className="text-[10px] text-blue-600 hover:underline"
                              >
                                +{tenantComps.length - 3} más
                              </button>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="py-3 px-2 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openCompensation(tenant)}
                          title="Agregar compensación"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openHistory(tenant)}
                          title="Historial de compensaciones"
                        >
                          <History className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredTenants.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">
                      No se encontraron tenants
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Compensation Dialog */}
      <Dialog open={showCompensationDialog} onOpenChange={setShowCompensationDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Agregar Compensación</DialogTitle>
            <DialogDescription>
              {selectedTenant && `Para: ${selectedTenant.businessName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Compensación</Label>
              <div className="grid grid-cols-3 gap-2 mt-2">
                <button
                  onClick={() => setCompForm(prev => ({ ...prev, type: 'EXTEND_DAYS' }))}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    compForm.type === 'EXTEND_DAYS' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <Calendar className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Extender Días</span>
                </button>
                <button
                  onClick={() => setCompForm(prev => ({ ...prev, type: 'CREDIT' }))}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    compForm.type === 'CREDIT' ? 'border-green-500 bg-green-50 text-green-700' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <CreditCard className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Crédito</span>
                </button>
                <button
                  onClick={() => setCompForm(prev => ({ ...prev, type: 'CHANGE_PLAN' }))}
                  className={`p-3 rounded-lg border-2 text-center transition-colors ${
                    compForm.type === 'CHANGE_PLAN' ? 'border-purple-500 bg-purple-50 text-purple-700' : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <ArrowRightLeft className="h-5 w-5 mx-auto mb-1" />
                  <span className="text-xs font-medium">Cambiar Plan</span>
                </button>
              </div>
            </div>

            {compForm.type === 'EXTEND_DAYS' && (
              <div>
                <Label htmlFor="days">Días a Extender</Label>
                <Input
                  id="days"
                  type="number"
                  min="1"
                  value={compForm.days}
                  onChange={(e) => setCompForm(prev => ({ ...prev, days: e.target.value }))}
                  placeholder="30"
                />
              </div>
            )}

            {compForm.type === 'CREDIT' && (
              <div>
                <Label htmlFor="amount">Monto del Crédito (L)</Label>
                <Input
                  id="amount"
                  type="number"
                  min="0"
                  value={compForm.amount}
                  onChange={(e) => setCompForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="500"
                />
              </div>
            )}

            {compForm.type === 'CHANGE_PLAN' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="planSelect">Seleccionar Nuevo Plan</Label>
                  <select
                    id="planSelect"
                    value={compForm.selectedPlanCode}
                    onChange={(e) => {
                      const plan = plans.find(p => p.code === e.target.value);
                      setCompForm(prev => ({
                        ...prev,
                        selectedPlanCode: e.target.value,
                        amount: plan ? plan.price.toString() : '',
                      }));
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 mt-1"
                  >
                    <option value="">Seleccionar plan...</option>
                    {plans.filter(p => p.isActive !== false).map(plan => (
                      <option key={plan.code} value={plan.code}>
                        {plan.name} - L {plan.price.toLocaleString()}/mes
                      </option>
                    ))}
                  </select>
                </div>
                {compForm.selectedPlanCode && (
                  <div className="p-3 bg-gray-50 rounded-lg border">
                    {(() => {
                      const plan = plans.find(p => p.code === compForm.selectedPlanCode);
                      if (!plan) return null;
                      return (
                        <div className="space-y-1 text-sm">
                          <div className="font-medium text-gray-900">{plan.name}</div>
                          <div className="text-gray-600">Precio: L {plan.price.toLocaleString()}/mes</div>
                          <div className="text-gray-600">Usuarios: {plan.max_users} | Almacenamiento: {plan.max_storage} GB</div>
                          <div className="text-gray-600">Transacciones: {plan.max_transactions.toLocaleString()}/mes</div>
                        </div>
                      );
                    })()}
                  </div>
                )}
                {selectedTenant && compForm.selectedPlanCode && (
                  <div className="text-xs text-gray-500">
                    Plan actual: <span className="font-medium">{selectedTenant.plan}</span> (L {selectedTenant.monthlyCost.toLocaleString()}/mes)
                  </div>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="description">Descripción *</Label>
              <Input
                id="description"
                value={compForm.description}
                onChange={(e) => setCompForm(prev => ({ ...prev, description: e.target.value }))}
                placeholder="Ej: Compensación por servicio caído"
                required
              />
            </div>

            <div>
              <Label htmlFor="reason">Razón (opcional)</Label>
              <Textarea
                id="reason"
                value={compForm.reason}
                onChange={(e) => setCompForm(prev => ({ ...prev, reason: e.target.value }))}
                placeholder="Detalles adicionales..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setShowCompensationDialog(false)}>
                Cancelar
              </Button>
              <Button
                onClick={handleAddCompensation}
                disabled={!compForm.description}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Agregar Compensación
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* History Dialog */}
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Historial de Compensaciones</DialogTitle>
            <DialogDescription>
              {selectedTenant && `Compensaciones de: ${selectedTenant.businessName}`}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {loadingCompensations ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : compensations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No hay compensaciones registradas
              </div>
            ) : (
              compensations.map((comp) => {
                const typeInfo = getCompTypeLabel(comp.type);
                const Icon = typeInfo.icon;
                return (
                  <div key={comp.id} className="flex items-start gap-3 p-3 border rounded-lg">
                    <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm">{typeInfo.label}</span>
                        <div className="flex items-center gap-1">
                          {comp.type === 'CREDIT' && (
                            <span className={`text-[10px] px-1.5 py-0.5 rounded border ${comp.used ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                              {comp.used ? 'Usado' : 'Disponible'}
                            </span>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteCompensation(comp.id)}
                            className="text-red-500 hover:text-red-700 h-6 px-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600">{comp.description}</p>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {comp.days > 0 && <span>{comp.days} días</span>}
                        {comp.amount > 0 && <span>L {comp.amount.toLocaleString()}</span>}
                        <span>{new Date(comp.createdat).toLocaleDateString('es-HN')}</span>
                        {comp.used && comp.usedat && (
                          <span className="text-gray-400">Usado: {new Date(comp.usedat).toLocaleDateString('es-HN')}</span>
                        )}
                      </div>
                      {comp.reason && (
                        <p className="text-xs text-gray-500 mt-1 italic">{comp.reason}</p>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
