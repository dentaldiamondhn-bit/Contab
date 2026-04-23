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
import { createSupabaseClient } from "@/lib/supabase/client";

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

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadTenants();
  }, []);

  const loadTenants = async () => {
    setLoading(true);
    try {
      // Como SUPER_ADMIN, puede ver todos los tenants
      const { data, error } = await supabase
        .rpc('super_admin_get_all_tenants');

      if (error) throw error;
      setTenants(data || []);
    } catch (error: any) {
      console.error("Error loading tenants:", error);
      // Fallback: obtener tenants sin RPC si no existe
      const { data, error: fetchError } = await supabase
        .from('Tenant')
        .select('*, _count(users)')
        .order('createdAt', { ascending: false });
      
      if (!fetchError) {
        setTenants(data);
      }
    } finally {
      setLoading(false);
    }
  };

  const generateTenantCode = async (businessName: string): Promise<string> => {
    try {
      const { data, error } = await supabase
        .rpc('generate_tenant_code', { business_name: businessName } as any);

      if (error) throw error;
      return data;
    } catch (error) {
      // Fallback: generar código localmente
      const prefix = businessName
        .replace(/[^a-zA-Z]/g, '')
        .substring(0, 3)
        .toUpperCase();
      
      let counter = 1;
      let code = `${prefix}${counter.toString().padStart(3, '0')}`;

      // Verificar si existe
      while (tenants.some(t => t.tenantCode === code)) {
        counter++;
        code = `${prefix}${counter.toString().padStart(3, '0')}`;
      }

      return code;
    }
  };

  const saveTenant = async () => {
    try {
      const tenantCode = await generateTenantCode(tenantForm.businessName);
      
      const tenantData = {
        ...tenantForm,
        tenantCode,
        isActive: true,
      };

      if (editingTenant) {
        const { error } = await supabase
          .from('Tenant')
          .update(tenantData)
          .eq('id', editingTenant.id);

        if (error) throw error;
        alert("Tenant actualizado exitosamente");
      } else {
        const { error } = await supabase
          .from('Tenant')
          .insert(tenantData);
        
        if (error) throw error;
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
      // 1. Crear usuario en Clerk con metadata aislada
      const metadata = {
        role: userForm.role,
        tenantId: selectedTenant.id,
        tenantCode: selectedTenant.tenantCode,
        permissions: getPermissionsForRole(userForm.role),
        isolation: {
          tenantScope: true,
          crossTenantAccess: false,
          dataVisibility: 'tenant_only'
        }
      };

      // Llamar a API para crear usuario en Clerk
      const clerkResponse = await fetch('/api/admin/create-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userForm.email,
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          password: userForm.password,
          publicMetadata: metadata
        })
      });

      if (!clerkResponse.ok) {
        const error = await clerkResponse.json();
        throw new Error(error.message || 'Error creando usuario en Clerk');
      }

      const clerkUser = await clerkResponse.json();

      // 2. Crear usuario en base de datos local
      const { error } = await supabase
        .from('User')
        .insert({
          authId: clerkUser.id,
          email: userForm.email,
          firstName: userForm.firstName,
          lastName: userForm.lastName,
          role: userForm.role,
          tenantId: selectedTenant.id,
          isActive: true
        });

      if (error) throw error;

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
      const { error } = await supabase
        .from('Tenant')
        .update({
          isActive: !tenant.isActive,
          updatedAt: new Date().toISOString()
        })
        .eq('id', tenant.id);

      if (error) throw error;
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
      const { error } = await supabase
        .from('Tenant')
        .delete()
        .eq('id', tenantId);

      if (error) throw error;
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

  const filteredTenants = tenants.filter(tenant =>
    tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.tenantCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.businessEmail.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <Select 
                  value={tenantForm.subscriptionPlan} 
                  onValueChange={(value) => setTenantForm({ ...tenantForm, subscriptionPlan: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="BASIC">Básico</SelectItem>
                    <SelectItem value="PREMIUM">Premium</SelectItem>
                    <SelectItem value="ENTERPRISE">Empresarial</SelectItem>
                  </SelectContent>
                </Select>
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
