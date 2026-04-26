"use client";

// @ts-nocheck

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Building2, 
  Plus, 
  Edit, 
  Trash2, 
  Search, 
  Users, 
  Settings, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff
} from "lucide-react";

interface Plan {
  id: string;
  name: string;
  code: string;
  price: number;
  maxUsers: number;
  maxStorage: number;
  maxTransactions: number;
  features: string[];
  modules: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface Tenant {
  id: string;
  businessName: string;
  businessRTN: string;
  businessEmail: string;
  businessAddress: string;
  tenantCode: string;
  country: string;
  phoneNumber?: string;
  subscriptionPlan: string;
  maxUsers: number;
  maxStorage: number;
  maxTransactions: number;
  monthlyCost: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
  };
}

interface TenantFormData {
  businessName: string;
  businessRTN: string;
  businessEmail: string;
  businessAddress: string;
  country: string;
  phoneNumber: string;
  subscriptionPlan: string;
  maxUsers: number;
  maxStorage: number;
  maxTransactions: number;
  monthlyCost: number;
}

interface UserFormData {
  email: string;
  firstName: string;
  lastName: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  password: string;
}

export default function TenantManager() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showTenantForm, setShowTenantForm] = useState(false);
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  
  const [tenantForm, setTenantForm] = useState<TenantFormData>({
    businessName: '',
    businessRTN: '',
    businessEmail: '',
    businessAddress: '',
    country: 'HN',
    phoneNumber: '',
    subscriptionPlan: 'BASIC',
    maxUsers: 5,
    maxStorage: 100,
    maxTransactions: 10000,
    monthlyCost: 1000,
  });

  const [userForm, setUserForm] = useState<UserFormData>({
    email: '',
    firstName: '',
    lastName: '',
    role: 'ADMIN',
    password: '',
  });

  useEffect(() => {
    loadTenants();
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      console.log('Cargando planes desde /api/admin/plans...');
      const response = await fetch('/api/admin/plans');
      console.log('Response status:', response.status);
      if (response.ok) {
        const data = await response.json();
        console.log('Planes recibidos:', data);
        setPlans(data.plans || []);
      } else {
        console.error('Error en respuesta de planes:', response.status);
        const errorData = await response.json();
        console.error('Error data:', errorData);
      }
    } catch (error: any) {
      console.error("Error loading plans:", error);
    }
  };

  const loadTenants = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/admin/tenants');
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      }
    } catch (error: any) {
      console.error("Error loading tenants:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveTenant = async () => {
    try {
      if (editingTenant) {
        const response = await fetch(`/api/admin/tenants/${editingTenant.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tenantForm)
        });

        if (!response.ok) throw new Error('Error actualizando tenant');
        alert("Tenant actualizado exitosamente");
      } else {
        const response = await fetch('/api/admin/tenants', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(tenantForm)
        });

        if (!response.ok) throw new Error('Error creando tenant');
        alert("Tenant creado exitosamente");
      }

      setShowTenantForm(false);
      setEditingTenant(null);
      resetTenantForm();
      loadTenants();
    } catch (error: any) {
      console.error("Error saving tenant:", error);
      alert("Error al guardar el tenant");
    }
  };

  const createUserForTenant = async () => {
    if (!selectedTenant) return;

    try {
      // Llamar a API para crear usuario en Clerk y en BD local
      const response = await fetch(`/api/admin/tenants/${selectedTenant.id}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userForm.email,
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          password: userForm.password,
          role: userForm.role
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Error creando usuario');
      }

      alert("Usuario creado exitosamente");
      setShowUserForm(false);
      setSelectedTenant(null);
      resetUserForm();
      loadTenants();
    } catch (error: any) {
      console.error("Error creating user:", error);
      alert(`Error: ${error.message}`);
    }
  };

  const getPermissionsForRole = (role: string): string[] => {
    const permissions = {
      'ADMIN': [
        'tenant:admin',
        'users:tenant_manage',
        'inventory:manage',
        'accounting:manage',
        'reports:tenant'
      ],
      'MANAGER': [
        'inventory:view',
        'inventory:create',
        'inventory:edit',
        'accounting:view',
        'accounting:create',
        'reports:basic'
      ],
      'USER': [
        'inventory:view',
        'accounting:view',
        'reports:personal'
      ],
      'VIEWER': [
        'inventory:readonly',
        'accounting:readonly',
        'reports:view'
      ]
    };
    return permissions[role as keyof typeof permissions] || [];
  };

  const toggleTenantStatus = async (tenant: Tenant) => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenant.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: !tenant.isActive })
      });

      if (!response.ok) throw new Error('Error cambiando estado');
      alert(`Tenant ${tenant.isActive ? 'desactivado' : 'activado'} exitosamente`);
      loadTenants();
    } catch (error: any) {
      console.error("Error toggling tenant status:", error);
      alert("Error al cambiar el estado del tenant");
    }
  };

  const deleteTenant = async (tenantId: string) => {
    if (!confirm('¿Está seguro de eliminar este tenant? También se eliminarán todos sus usuarios.')) return;

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Error eliminando tenant');
      alert("Tenant eliminado exitosamente");
      loadTenants();
    } catch (error: any) {
      console.error("Error deleting tenant:", error);
      alert("Error al eliminar el tenant");
    }
  };

  const resetTenantForm = () => {
    setTenantForm({
      businessName: '',
      businessRTN: '',
      businessEmail: '',
      businessAddress: '',
      country: 'HN',
      phoneNumber: '',
      subscriptionPlan: 'BASIC',
      maxUsers: 5,
      maxStorage: 100,
      maxTransactions: 10000,
      monthlyCost: 1000,
    });
  };

  const resetUserForm = () => {
    setUserForm({
      email: '',
      firstName: '',
      lastName: '',
      role: 'ADMIN',
      password: '',
    });
  };

  const getSubscriptionBadge = (plan: string) => {
    const colors: Record<string, string> = {
      'BASIC': 'bg-gray-100 text-gray-800',
      'PREMIUM': 'bg-purple-100 text-purple-800',
      'ENTERPRISE': 'bg-gold-100 text-gold-800'
    };
    const labels: Record<string, string> = {
      'BASIC': 'Básico',
      'PREMIUM': 'Premium',
      'ENTERPRISE': 'Empresarial'
    };
    return <Badge className={colors[plan] || 'bg-gray-100'}>{labels[plan] || plan}</Badge>;
  };

  const getSubscriptionPlanDetails = (planCode: string) => {
    const plan = plans.find(p => p.code === planCode);
    if (plan) {
      return {
        maxUsers: plan.maxUsers,
        maxStorage: plan.maxStorage,
        maxTransactions: plan.maxTransactions,
        monthlyCost: plan.price
      };
    }
    // Valores por defecto si no se encuentra el plan
    return {
      maxUsers: 5,
      maxStorage: 100,
      maxTransactions: 10000,
      monthlyCost: 1000
    };
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.tenantCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.businessEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

  console.log('Estado actual - Plans:', plans.length, 'Tenants:', tenants.length);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Building2 className="h-6 w-6 mr-2 text-blue-600" />
            Gestión de Tenants
          </h2>
          <p className="text-gray-600">Administra los tenants del sistema</p>
        </div>
        <Button onClick={() => setShowTenantForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Tenant
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tenants</CardTitle>
          <CardDescription>Lista de todos los tenants del sistema</CardDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar tenants..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p>Cargando tenants...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Código</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Empresa</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Plan</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Usuarios</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTenants.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                        No se encontraron tenants
                      </td>
                    </tr>
                  ) : (
                    filteredTenants.map((tenant) => (
                      <tr key={tenant.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm font-medium">{tenant.tenantCode}</td>
                        <td className="px-4 py-3 text-sm">{tenant.businessName}</td>
                        <td className="px-4 py-3 text-sm">{tenant.businessEmail}</td>
                        <td className="px-4 py-3 text-sm">{getSubscriptionBadge(tenant.subscriptionPlan)}</td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center">
                            <Users className="h-4 w-4 mr-1" />
                            {tenant._count.users}/{tenant.maxUsers}
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={tenant.isActive ? 'default' : 'secondary'}>
                            {tenant.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
                          <div className="flex space-x-1 justify-center">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedTenant(tenant);
                                setShowUserForm(true);
                              }}
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setEditingTenant(tenant);
                                setTenantForm({
                                  businessName: tenant.businessName,
                                  businessRTN: tenant.businessRTN,
                                  businessEmail: tenant.businessEmail,
                                  businessAddress: tenant.businessAddress,
                                  country: tenant.country,
                                  phoneNumber: tenant.phoneNumber || '',
                                  subscriptionPlan: tenant.subscriptionPlan,
                                  maxUsers: tenant.maxUsers,
                                  maxStorage: tenant.maxStorage,
                                  maxTransactions: tenant.maxTransactions,
                                  monthlyCost: tenant.monthlyCost,
                                });
                                setShowTenantForm(true);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleTenantStatus(tenant)}
                            >
                              {tenant.isActive ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteTenant(tenant.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Formulario de Tenant */}
      {showTenantForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingTenant ? 'Editar Tenant' : 'Nuevo Tenant'}</CardTitle>
            <CardDescription>
              {editingTenant ? 'Modifique los datos del tenant' : 'Ingrese los datos del nuevo tenant'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="businessName">Nombre de Empresa *</Label>
                <Input
                  id="businessName"
                  value={tenantForm.businessName}
                  onChange={(e) => setTenantForm({ ...tenantForm, businessName: e.target.value })}
                  placeholder="Dental Diamond S.A."
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessRTN">RTN *</Label>
                <Input
                  id="businessRTN"
                  value={tenantForm.businessRTN}
                  onChange={(e) => setTenantForm({ ...tenantForm, businessRTN: e.target.value })}
                  placeholder="08011999123456"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessEmail">Email de Empresa *</Label>
                <Input
                  id="businessEmail"
                  type="email"
                  value={tenantForm.businessEmail}
                  onChange={(e) => setTenantForm({ ...tenantForm, businessEmail: e.target.value })}
                  placeholder="contact@empresa.hn"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phoneNumber">Teléfono</Label>
                <Input
                  id="phoneNumber"
                  value={tenantForm.phoneNumber}
                  onChange={(e) => setTenantForm({ ...tenantForm, phoneNumber: e.target.value })}
                  placeholder="+504 2234-5678"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="businessAddress">Dirección *</Label>
                <Input
                  id="businessAddress"
                  value={tenantForm.businessAddress}
                  onChange={(e) => setTenantForm({ ...tenantForm, businessAddress: e.target.value })}
                  placeholder="Tegucigalpa, Honduras"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subscriptionPlan">Plan de Suscripción</Label>
                <select
                  id="subscriptionPlan"
                  value={tenantForm.subscriptionPlan}
                  onChange={(e) => {
                    const plan = getSubscriptionPlanDetails(e.target.value);
                    setTenantForm({ 
                      ...tenantForm, 
                      subscriptionPlan: e.target.value,
                      maxUsers: plan.maxUsers,
                      maxStorage: plan.maxStorage,
                      maxTransactions: plan.maxTransactions,
                      monthlyCost: plan.monthlyCost
                    });
                  }}
                  className="w-full p-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">Selecciona un plan</option>
                  {plans.length > 0 ? (
                    plans.filter(plan => plan.isActive).map(plan => (
                      <option key={plan.id} value={plan.code}>
                        {plan.name} - {plan.maxUsers} usuarios - L. {plan.price.toLocaleString()}/mes
                      </option>
                    ))
                  ) : (
                    <>
                      <option value="BASIC">Básico - 5 usuarios - L. 1,000/mes</option>
                      <option value="PREMIUM">Premium - 20 usuarios - L. 3,000/mes</option>
                      <option value="ENTERPRISE">Empresarial - Ilimitado - L. 10,000/mes</option>
                    </>
                  )}
                </select>
                {tenantForm.subscriptionPlan && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-2">Detalles del Plan:</h4>
                    <div className="text-xs space-y-1">
                      <div>• Usuarios máximos: {tenantForm.maxUsers}</div>
                      <div>• Almacenamiento: {tenantForm.maxStorage}MB</div>
                      <div>• Transacciones: {tenantForm.maxTransactions.toLocaleString()}</div>
                      <div>• Costo mensual: L. {tenantForm.monthlyCost.toLocaleString()}</div>
                    </div>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="maxUsers">Usuarios Máximos</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={tenantForm.maxUsers}
                  onChange={(e) => setTenantForm({ ...tenantForm, maxUsers: parseInt(e.target.value) })}
                  min="1"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTenantForm(false);
                  setEditingTenant(null);
                  resetTenantForm();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={saveTenant}>
                {editingTenant ? 'Actualizar' : 'Crear'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Formulario de Usuario para Tenant */}
      {showUserForm && selectedTenant && (
        <Card>
          <CardHeader>
            <CardTitle>Crear Usuario para {selectedTenant.businessName}</CardTitle>
            <CardDescription>
              Cree un nuevo usuario para el tenant {selectedTenant.tenantCode}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertDescription>
                Este usuario estará aislado al tenant <strong>{selectedTenant.tenantCode}</strong> 
                y solo podrá acceder a los datos de esta empresa.
              </AlertDescription>
            </Alert>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="userEmail">Email *</Label>
                <Input
                  id="userEmail"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="usuario@empresa.hn"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userFirstName">Nombre *</Label>
                <Input
                  id="userFirstName"
                  value={userForm.firstName}
                  onChange={(e) => setUserForm({ ...userForm, firstName: e.target.value })}
                  placeholder="Juan"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userLastName">Apellido *</Label>
                <Input
                  id="userLastName"
                  value={userForm.lastName}
                  onChange={(e) => setUserForm({ ...userForm, lastName: e.target.value })}
                  placeholder="Pérez"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="userRole">Rol *</Label>
                <Select 
                  value={userForm.role} 
                  onValueChange={(value) => setUserForm({ ...userForm, role: value as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ADMIN">Administrador</SelectItem>
                    <SelectItem value="MANAGER">Gerente</SelectItem>
                    <SelectItem value="USER">Usuario</SelectItem>
                    <SelectItem value="VIEWER">Lector</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="userPassword">Contraseña Temporal *</Label>
                <div className="relative">
                  <Input
                    id="userPassword"
                    type={showPassword ? "text" : "password"}
                    value={userForm.password}
                    onChange={(e) => setUserForm({ ...userForm, password: e.target.value })}
                    placeholder="Contraseña temporal"
                    required
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUserForm(false);
                  setSelectedTenant(null);
                  resetUserForm();
                }}
              >
                Cancelar
              </Button>
              <Button onClick={createUserForTenant}>
                Crear Usuario
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
