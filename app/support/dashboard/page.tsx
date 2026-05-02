"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Building2, 
  Users, 
  HeadphonesIcon,
  LifeBuoy,
  AlertCircle,
  CheckCircle,
  Activity,
  Search,
  Filter,
  ChevronDown,
  ChevronRight,
  User,
  Mail,
  Phone,
  MapPin,
  CreditCard,
  Key,
  Eye,
  EyeOff,
  Shield,
  Wrench
} from "lucide-react";

interface TenantStats {
  totalTenants: number;
  activeTenants: number;
  suspendedTenants: number;
  totalUsers: number;
  activeUsers: number;
}

interface TenantUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  authId: string;
  createdAt: string;
}

interface Tenant {
  id: string;
  businessName: string;
  tenantCode: string;
  businessEmail: string;
  businessAddress: string;
  businessRTN: string;
  subscriptionPlan: string;
  maxUsers: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  users: TenantUser[];
  userCount: number;
  activeUserCount: number;
}

export default function SupportDashboard() {
  const { user, isLoaded } = useUser();
  const [tenantStats, setTenantStats] = useState<TenantStats | null>(null);
  const [loadingStats, setLoadingStats] = useState(true);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loadingTenants, setLoadingTenants] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());
  
  // Password reset modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  console.log('SupportDashboard - Component loaded');

  useEffect(() => {
    if (isLoaded && user) {
      loadStats();
      loadTenants();
    }
  }, [isLoaded, user]);

  const loadStats = async () => {
    try {
      setLoadingStats(true);
      const response = await fetch('/api/admin/stats');
      const data = await response.json();
      setTenantStats(data.stats);
    } catch (error) {
      console.error('Error loading stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const loadTenants = async () => {
    try {
      setLoadingTenants(true);
      const response = await fetch('/api/support/tenants-with-users');
      const data = await response.json();
      if (data.success) {
        setTenants(data.tenants || []);
      }
    } catch (error) {
      console.error('Error loading tenants:', error);
    } finally {
      setLoadingTenants(false);
    }
  };

  const toggleTenantExpansion = (tenantId: string) => {
    const newExpanded = new Set(expandedTenants);
    if (newExpanded.has(tenantId)) {
      newExpanded.delete(tenantId);
    } else {
      newExpanded.add(tenantId);
    }
    setExpandedTenants(newExpanded);
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.tenantCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.businessEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.users.some(u => 
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const openPasswordModal = (user: TenantUser, tenantName: string) => {
    setSelectedUser(user);
    setSelectedTenantName(tenantName);
    setNewPassword('');
    setShowPassword(false);
    setResetMessage(null);
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setSelectedUser(null);
    setNewPassword('');
    setResetMessage(null);
  };

  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewPassword(password);
    setShowPassword(true);
  };

  const resetPassword = async () => {
    if (!selectedUser || !newPassword) return;

    if (newPassword.length < 8) {
      setResetMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres' });
      return;
    }

    try {
      setResettingPassword(true);
      setResetMessage(null);

      const response = await fetch('/api/support/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.authId,
          newPassword: newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        setResetMessage({ type: 'success', text: 'Contraseña actualizada exitosamente' });
        setTimeout(() => {
          closePasswordModal();
        }, 2000);
      } else {
        setResetMessage({ type: 'error', text: data.error || 'Error al actualizar contraseña' });
      }
    } catch (error) {
      console.error('Error reseteando contraseña:', error);
      setResetMessage({ type: 'error', text: 'Error de conexión' });
    } finally {
      setResettingPassword(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 bg-orange-50/30 min-h-screen">
      {/* Stats Cards - Orange/Amber Theme */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-orange-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 bg-orange-50/50">
            <CardTitle className="text-sm font-medium text-orange-700">Total Tenants</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '...' : tenantStats?.totalTenants || 0}
              </div>
              <Building2 className="h-8 w-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 bg-green-50/50">
            <CardTitle className="text-sm font-medium text-green-700">Tenants Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-green-600">
                {loadingStats ? '...' : tenantStats?.activeTenants || 0}
              </div>
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 bg-amber-50/50">
            <CardTitle className="text-sm font-medium text-amber-700">Total Usuarios</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-gray-900">
                {loadingStats ? '...' : tenantStats?.totalUsers || 0}
              </div>
              <Users className="h-8 w-8 text-amber-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 shadow-sm hover:shadow-md transition-shadow">
          <CardHeader className="pb-3 bg-blue-50/50">
            <CardTitle className="text-sm font-medium text-blue-700">Usuarios Activos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold text-blue-600">
                {loadingStats ? '...' : tenantStats?.activeUsers || 0}
              </div>
              <Activity className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-orange-400 h-4 w-4" />
          <input
            type="text"
            placeholder="Buscar tenant o usuario..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-orange-200 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 bg-white"
          />
        </div>
        <Button variant="outline" className="flex items-center border-orange-200 hover:bg-orange-50 text-orange-700">
          <Filter className="h-4 w-4 mr-2" />
          Filtros
        </Button>
      </div>

      {/* Tenants List with Users */}
      <Card className="border-orange-200 shadow-md">
        <CardHeader className="bg-gradient-to-r from-orange-50 to-amber-50 border-b border-orange-100">
          <div className="flex items-center gap-2">
            <Wrench className="h-5 w-5 text-orange-600" />
            <CardTitle className="text-orange-900">Gestión de Tenants y Usuarios</CardTitle>
          </div>
          <CardDescription className="text-orange-700">
            {loadingTenants ? 'Cargando...' : `${filteredTenants.length} tenant(s) con ${filteredTenants.reduce((acc, t) => acc + t.userCount, 0)} usuario(s) - Vista de Soporte Técnico`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loadingTenants ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600"></div>
            </div>
          ) : filteredTenants.length === 0 ? (
            <div className="text-center py-8 text-orange-600">
              <HeadphonesIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
              No se encontraron tenants
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTenants.map((tenant) => (
                <div key={tenant.id} className="border border-orange-200 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                  {/* Tenant Header - Click to expand - Orange Theme */}
                  <div
                    onClick={() => toggleTenantExpansion(tenant.id)}
                    className="flex items-center justify-between p-4 bg-gradient-to-r from-orange-50 to-amber-50 hover:from-orange-100 hover:to-amber-100 cursor-pointer transition-colors border-b border-orange-100"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        {expandedTenants.has(tenant.id) ? (
                          <ChevronDown className="h-5 w-5 text-orange-600" />
                        ) : (
                          <ChevronRight className="h-5 w-5 text-orange-500" />
                        )}
                        <div className={`w-2 h-2 rounded-full ${tenant.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <div>
                          <h3 className="font-medium text-orange-900">{tenant.businessName}</h3>
                          <p className="text-sm text-orange-700/70">
                            Código: {tenant.tenantCode}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 mt-2 ml-10">
                        <Badge variant="outline" className="text-xs border-orange-200 text-orange-700 bg-white">
                          <CreditCard className="h-3 w-3 mr-1 text-orange-500" />
                          {tenant.subscriptionPlan}
                        </Badge>
                        <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 hover:bg-amber-200">
                          <Users className="h-3 w-3 mr-1 text-amber-600" />
                          {tenant.userCount}/{tenant.maxUsers} usuarios
                        </Badge>
                        <Badge variant={tenant.activeUserCount > 0 ? "default" : "secondary"} className={`text-xs ${tenant.activeUserCount > 0 ? 'bg-green-100 text-green-800 hover:bg-green-200' : 'bg-gray-100 text-gray-600'}`}>
                          <CheckCircle className="h-3 w-3 mr-1" />
                          {tenant.activeUserCount} activos
                        </Badge>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-orange-800">{tenant.businessEmail}</p>
                      <p className="text-xs text-orange-600/70">{tenant.businessRTN}</p>
                    </div>
                  </div>

                  {/* Users List - Expanded */}
                  {expandedTenants.has(tenant.id) && (
                    <div className="bg-white">
                      {tenant.users.length === 0 ? (
                        <div className="p-4 text-center text-orange-500 text-sm bg-orange-50/30">
                          <HeadphonesIcon className="h-5 w-5 mx-auto mb-1 opacity-50" />
                          No hay usuarios en este tenant
                        </div>
                      ) : (
                        <div className="divide-y divide-orange-100">
                          {tenant.users.map((user) => (
                            <div key={user.id} className="p-3 hover:bg-orange-50/50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                                    <User className="h-4 w-4 text-orange-600" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm text-gray-900">
                                      {user.firstName} {user.lastName}
                                    </p>
                                    <p className="text-xs text-gray-600 flex items-center gap-2">
                                      <Mail className="h-3 w-3 text-orange-400" />
                                      {user.email}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs border-orange-200 text-orange-700">
                                    {user.role}
                                  </Badge>
                                  <span className="text-xs text-orange-600/70">
                                    {new Date(user.createdAt).toLocaleDateString()}
                                  </span>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-orange-600 hover:text-orange-700 hover:bg-orange-100"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      openPasswordModal(user, tenant.businessName);
                                    }}
                                  >
                                    <Key className="h-3 w-3 mr-1" />
                                    Cambiar contraseña
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Password Reset Modal */}
      {showPasswordModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 shadow-xl">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              Cambiar Contraseña
            </h3>
            <p className="text-sm text-gray-600 mb-4">
              Usuario: <span className="font-medium">{selectedUser.firstName} {selectedUser.lastName}</span>
              <br />
              Email: <span className="font-medium">{selectedUser.email}</span>
              <br />
              Tenant: <span className="font-medium">{selectedTenantName}</span>
            </p>

            {resetMessage && (
              <div className={`p-3 rounded-md mb-4 text-sm ${
                resetMessage.type === 'success' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {resetMessage.text}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 pr-20"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-10 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={generateRandomPassword}
              >
                Generar contraseña aleatoria
              </Button>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={closePasswordModal}
                  disabled={resettingPassword}
                >
                  Cancelar
                </Button>
                <Button
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                  onClick={resetPassword}
                  disabled={!newPassword || newPassword.length < 8 || resettingPassword}
                >
                  {resettingPassword ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Actualizando...
                    </>
                  ) : (
                    'Actualizar Contraseña'
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
