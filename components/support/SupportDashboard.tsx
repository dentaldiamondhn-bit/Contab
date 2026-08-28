"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Building2, 
  Ticket, 
  Search, 
  Eye,
  Phone,
  Mail,
  AlertTriangle,
  MessageSquare,
  Clock,
  CheckCircle,
  XCircle,
  Key,
  EyeOff,
  Shield,
  Paperclip,
  X,
  FileIcon,
  Database
} from "lucide-react";

interface SupportTicket {
  id: string;
  subject: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  ticket_type: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  user_email: string;
  user_name: string;
  tenant_name: string;
  tenant_code: string;
  assigned_name?: string;
  comments?: string;
  attachments?: Array<{
    name: string;
    url: string;
    size: number;
    type: string;
  }>;
  timeline?: Array<{
    type: 'created' | 'status_change' | 'comment';
    message?: string;
    from?: string;
    to?: string;
    user?: string;
    timestamp: string;
  }>;
  created_at: string;
  updated_at: string;
}

interface SupportUser {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  tenant_name: string;
  tenant_code: string;
  last_login?: string;
  created_at: string;
}

interface SupportTenant {
  id: string;
  businessName: string;
  tenantCode: string;
  subscriptionPlan: string;
  isActive: boolean;
  user_count: number;
  created_at: string;
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

interface TenantWithUsers {
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
  const [tenants, setTenants] = useState<SupportTenant[]>([]);
  const [users, setUsers] = useState<SupportUser[]>([]);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [tenantsWithUsers, setTenantsWithUsers] = useState<TenantWithUsers[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("tickets");
  const [expandedTenants, setExpandedTenants] = useState<Set<string>>(new Set());

  // Password reset modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<TenantUser | null>(null);
  const [selectedTenantName, setSelectedTenantName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  // Ticket detail modal state
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [ticketReply, setTicketReply] = useState('');
  const [updatingTicket, setUpdatingTicket] = useState(false);
  const [confirmStatusModal, setConfirmStatusModal] = useState<{status: string} | null>(null);
  const [commentFiles, setCommentFiles] = useState<File[]>([]);
  const [selectedUserDetail, setSelectedUserDetail] = useState<SupportUser | null>(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [helpMessage, setHelpMessage] = useState('');

  useEffect(() => {
    loadSupportData();
  }, []);

  const loadSupportData = async () => {
    setLoading(true);
    try {
      // Cargar tenants (información básica)
      const tenantsResponse = await fetch('/api/support/tenants');
      if (tenantsResponse.ok) {
        const tenantsData = await tenantsResponse.json();
        setTenants(tenantsData.tenants || []);
      }

      // Cargar usuarios (información básica)
      const usersResponse = await fetch('/api/support/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData.users || []);
      }

      // Cargar tickets de soporte
      const ticketsResponse = await fetch('/api/support/tickets');
      if (ticketsResponse.ok) {
        const ticketsData = await ticketsResponse.json();
        setTickets(ticketsData.tickets || []);
      }

      // Cargar tenants con usuarios (para gestión de contraseñas)
      const tenantsWithUsersResponse = await fetch('/api/support/tenants-with-users');
      if (tenantsWithUsersResponse.ok) {
        const tenantsWithUsersData = await tenantsWithUsersResponse.json();
        if (tenantsWithUsersData.success) {
          setTenantsWithUsers(tenantsWithUsersData.tenants || []);
        }
      }
    } catch (error) {
      console.error('Error cargando datos de soporte:', error);
    } finally {
      setLoading(false);
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-purple-100 text-purple-800';
      case 'resolved': return 'bg-green-100 text-green-800';
      case 'closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <MessageSquare className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'resolved': return <CheckCircle className="h-4 w-4" />;
      case 'closed': return <XCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      'SUPER_ADMIN': 'bg-purple-100 text-purple-800',
      'SUPPORT': 'bg-orange-100 text-orange-800',
      'ADMIN': 'bg-red-100 text-red-800',
      'MANAGER': 'bg-blue-100 text-blue-800',
      'USER': 'bg-green-100 text-green-800',
      'VIEWER': 'bg-gray-100 text-gray-800'
    };
    const labels: Record<string, string> = {
      'SUPER_ADMIN': 'Super Admin',
      'SUPPORT': 'Soporte',
      'ADMIN': 'Administrador',
      'MANAGER': 'Gerente',
      'USER': 'Usuario',
      'VIEWER': 'Lector'
    };
    return (
      <Badge className={colors[role] || 'bg-gray-100'}>
        {labels[role] || role}
      </Badge>
    );
  };

  const filteredTickets = tickets.filter(ticket =>
    ticket.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ticket.tenant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    `${user.firstName} ${user.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.tenant_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTenants = tenants.filter(tenant =>
    tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.tenantCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredTenantsWithUsers = tenantsWithUsers.filter(tenant =>
    tenant.businessName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.tenantCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.businessEmail.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.users.some(u =>
      u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.lastName.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const toggleTenantExpansion = (tenantId: string) => {
    const newExpanded = new Set(expandedTenants);
    if (newExpanded.has(tenantId)) {
      newExpanded.delete(tenantId);
    } else {
      newExpanded.add(tenantId);
    }
    setExpandedTenants(newExpanded);
  };

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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Panel de Soporte Técnico</h1>
          <p className="text-gray-600">Gestión de soporte técnico y ayuda a usuarios</p>
        </div>
        <a
          href="/support/databases"
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
        >
          <Database className="h-4 w-4" />
          Bases de Datos
        </a>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Building2 className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Tenants Activos</p>
                <p className="text-2xl font-bold">{tenants.filter(t => t.isActive).length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Users className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Usuarios Totales</p>
                <p className="text-2xl font-bold">{users.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <Ticket className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Tickets Activos</p>
                <p className="text-2xl font-bold">{tickets.filter(t => t.status === 'open').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm text-gray-600">Urgentes</p>
                <p className="text-2xl font-bold">{tickets.filter(t => t.priority === 'urgent').length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Barra de búsqueda */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
        <Input
          placeholder="Buscar tickets, usuarios o tenants..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs de gestión */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
          <TabsTrigger value="users">Usuarios</TabsTrigger>
          <TabsTrigger value="tenants">Tenants</TabsTrigger>
          <TabsTrigger value="user-management">Gestión de Usuarios</TabsTrigger>
        </TabsList>

        {/* Tickets Tab */}
        <TabsContent value="tickets" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ticket className="h-5 w-5 mr-2" />
                Tickets de Soporte
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTickets.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron tickets
                  </div>
                ) : (
                  filteredTickets.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{ticket.subject}</h4>
                          <Badge className={getPriorityColor(ticket.priority)}>
                            {ticket.priority}
                          </Badge>
                          <Badge className={getStatusColor(ticket.status)}>
                            {ticket.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-1">{ticket.description}</p>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {ticket.user_name} ({ticket.user_email})
                          </span>
                          <span className="flex items-center">
                            <Building2 className="h-3 w-3 mr-1" />
                            {ticket.tenant_name} ({ticket.tenant_code})
                          </span>
                          <span className="flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {new Date(ticket.created_at).toLocaleDateString('es-HN')}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedTicket(ticket); setShowTicketModal(true); setTicketReply(''); }}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedTicket(ticket); setShowTicketModal(true); setTicketReply(''); }}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Responder
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Usuarios del Sistema
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron usuarios
                  </div>
                ) : (
                  filteredUsers.map((user) => (
                    <div key={user.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : 'Sin nombre'
                            }
                          </h4>
                          {getRoleBadge(user.role)}
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Mail className="h-3 w-3 mr-1" />
                            {user.email}
                          </span>
                          <span className="flex items-center">
                            <Building2 className="h-3 w-3 mr-1" />
                            {user.tenant_name} ({user.tenant_code})
                          </span>
                          {user.last_login && (
                            <span className="flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Último login: {new Date(user.last_login).toLocaleDateString('es-HN')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline" onClick={() => { setSelectedUserDetail(user); setShowUserModal(true); }}>
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setSelectedUserDetail(user); setHelpMessage(''); setShowUserModal(true); }}>
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Ayudar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tenants Tab */}
        <TabsContent value="tenants" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Building2 className="h-5 w-5 mr-2" />
                Empresas/Tenants
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredTenants.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No se encontraron tenants
                  </div>
                ) : (
                  filteredTenants.map((tenant) => (
                    <div key={tenant.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <h4 className="font-medium">{tenant.businessName}</h4>
                          <Badge variant="outline">{tenant.tenantCode}</Badge>
                          <Badge variant={tenant.isActive ? 'default' : 'secondary'}>
                            {tenant.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <span className="flex items-center">
                            <Users className="h-3 w-3 mr-1" />
                            {tenant.user_count} usuarios
                          </span>
                          <span>Plan: {tenant.subscriptionPlan}</span>
                          <span>Creado: {new Date(tenant.created_at).toLocaleDateString('es-HN')}</span>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        <Button size="sm" variant="outline">
                          <Phone className="h-4 w-4 mr-1" />
                          Contactar
                        </Button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* User Management Tab - Tenants with Users and Password Reset */}
        <TabsContent value="user-management" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Gestión de Usuarios y Contraseñas
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredTenantsWithUsers.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No se encontraron tenants
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredTenantsWithUsers.map((tenant) => (
                    <div key={tenant.id} className="border rounded-lg overflow-hidden">
                      <div
                        onClick={() => toggleTenantExpansion(tenant.id)}
                        className="flex items-center justify-between p-4 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors border-b"
                      >
                        <div className="flex-1">
                          <div className="flex items-center gap-3">
                            {expandedTenants.has(tenant.id) ? (
                              <span className="text-gray-500">▼</span>
                            ) : (
                              <span className="text-gray-400">▶</span>
                            )}
                            <div className={`w-2 h-2 rounded-full ${tenant.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                            <div>
                              <h4 className="font-medium">{tenant.businessName}</h4>
                              <p className="text-sm text-gray-500">Código: {tenant.tenantCode}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 mt-2 ml-10">
                            <Badge variant="outline" className="text-xs">
                              {tenant.subscriptionPlan}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {tenant.userCount}/{tenant.maxUsers} usuarios
                            </Badge>
                            <Badge variant={tenant.activeUserCount > 0 ? "default" : "secondary"} className="text-xs">
                              {tenant.activeUserCount} activos
                            </Badge>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-gray-600">{tenant.businessEmail}</p>
                          <p className="text-xs text-gray-400">{tenant.businessRTN}</p>
                        </div>
                      </div>

                      {expandedTenants.has(tenant.id) && (
                        <div className="bg-white">
                          {tenant.users.length === 0 ? (
                            <div className="p-4 text-center text-gray-500 text-sm">
                              No hay usuarios en este tenant
                            </div>
                          ) : (
                            <div className="divide-y">
                              {tenant.users.map((user) => (
                                <div key={user.id} className="p-3 hover:bg-gray-50 transition-colors">
                                  <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                      <div className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center">
                                        <span className="text-sm font-medium text-gray-600">
                                          {user.firstName?.charAt(0) || user.email.charAt(0)}
                                        </span>
                                      </div>
                                      <div>
                                        <p className="font-medium text-sm">
                                          {user.firstName} {user.lastName}
                                        </p>
                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                          <Mail className="h-3 w-3" />
                                          {user.email}
                                        </p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <Badge variant="outline" className="text-xs">
                                        {user.role}
                                      </Badge>
                                      <span className="text-xs text-gray-400">
                                        {new Date(user.createdAt).toLocaleDateString()}
                                      </span>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-7 px-2"
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
        </TabsContent>
      </Tabs>

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
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 pr-20"
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
                  className="flex-1 bg-orange-600 hover:bg-orange-700 text-white"
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

      {/* Ticket Detail Modal */}
      {showTicketModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-gray-900">Detalle del Ticket</h2>
                <button onClick={() => setShowTicketModal(false)} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedTicket.subject}</h3>
                  <div className="flex items-center space-x-2 mt-2">
                    <Badge className={getPriorityColor(selectedTicket.priority)}>{selectedTicket.priority}</Badge>
                    <Badge className={getStatusColor(selectedTicket.status)}>{selectedTicket.status}</Badge>
                    {selectedTicket.ticket_type && (
                      <Badge className="bg-purple-100 text-purple-800">{selectedTicket.ticket_type}</Badge>
                    )}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-1">Descripcion:</p>
                  <p className="text-sm text-gray-600 whitespace-pre-wrap bg-gray-50 p-3 rounded">{selectedTicket.description}</p>
                </div>

                {selectedTicket.attachments && selectedTicket.attachments.length > 0 && (
                  <div className="border-t pt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Archivos adjuntos:</p>
                    <div className="space-y-1">
                      {selectedTicket.attachments.map((att: any, i: number) => (
                        <a
                          key={i}
                          href={att.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 text-sm text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>{att.name}</span>
                          <span className="text-xs text-gray-400">({att.size < 1024 * 1024 ? (att.size / 1024).toFixed(1) + ' KB' : (att.size / (1024 * 1024)).toFixed(1) + ' MB'})</span>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-medium text-gray-700">Solicitado por:</p>
                    <p className="text-gray-600">{selectedTicket.user_name} ({selectedTicket.user_email})</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Tenant:</p>
                    <p className="text-gray-600">{selectedTicket.tenant_name} ({selectedTicket.tenant_code})</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Asignado a:</p>
                    <p className="text-gray-600">{selectedTicket.assigned_name || 'Sin asignar'}</p>
                  </div>
                  <div>
                    <p className="font-medium text-gray-700">Fecha:</p>
                    <p className="text-gray-600">{new Date(selectedTicket.created_at).toLocaleString('es-HN')}</p>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Historial:</p>
                  <div className="space-y-3 max-h-60 overflow-y-auto mb-4">
                    {(!selectedTicket.timeline || selectedTicket.timeline.length === 0) ? (
                      <p className="text-sm text-gray-400 italic">Sin eventos registrados</p>
                    ) : (
                      selectedTicket.timeline.slice().reverse().map((event: any, i: number) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex flex-col items-center">
                            <div className={`w-3 h-3 rounded-full mt-1 ${
                              event.type === 'created' ? 'bg-green-500' :
                              event.type === 'status_change' ? 'bg-blue-500' :
                              event.type === 'comment' ? 'bg-yellow-500' :
                              'bg-gray-400'
                            }`} />
                            {i < (selectedTicket.timeline?.length || 0) - 1 && <div className="w-px flex-1 bg-gray-200 mt-1" />}
                          </div>
                          <div className="pb-3 flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                                event.type === 'created' ? 'bg-green-100 text-green-700' :
                                event.type === 'status_change' ? 'bg-blue-100 text-blue-700' :
                                event.type === 'comment' ? 'bg-yellow-100 text-yellow-700' :
                                'bg-gray-100 text-gray-700'
                              }`}>
                                {event.type === 'created' ? 'Creado' :
                                 event.type === 'status_change' ? `${event.from || 'abierto'} → ${event.to}` :
                                 event.type === 'comment' ? 'Comentario' :
                                 event.type}
                              </span>
                              <span className="text-xs text-gray-400">{event.timestamp}</span>
                              {event.user && <span className="text-xs text-gray-500">por {event.user}</span>}
                            </div>
                            {event.message && <p className="text-sm text-gray-600 mt-1">{event.message}</p>}
                            {event.attachments && event.attachments.length > 0 && (
                              <div className="mt-1 space-y-0.5">
                                {event.attachments.map((att: any, j: number) => (
                                  <a key={j} href={att.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                                    <Paperclip className="w-3 h-3" />{att.name}
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                   {!['closed', 'resolved'].includes(selectedTicket.status) && (
                    <>
                      <p className="text-sm font-medium text-gray-700 mb-2">Comentario:</p>
                      <textarea
                        value={ticketReply}
                        onChange={(e) => setTicketReply(e.target.value)}
                        placeholder="Escribe un comentario sobre la actualizacion del ticket..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
                      />
                      <label className="flex items-center gap-2 text-xs text-gray-500 hover:text-gray-700 cursor-pointer mb-2">
                        <Paperclip className="w-3.5 h-3.5" />
                        <span>Adjuntar archivos</span>
                        <input
                          type="file"
                          multiple
                          className="hidden"
                          accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip"
                          onChange={e => {
                            if (e.target.files) {
                              setCommentFiles(prev => [...prev, ...Array.from(e.target.files!)]);
                            }
                          }}
                        />
                      </label>
                      {commentFiles.length > 0 && (
                        <div className="mb-2 space-y-1">
                          {commentFiles.map((file, i) => (
                            <div key={i} className="flex items-center justify-between bg-white border rounded px-2 py-1">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileIcon className="w-3 h-3 text-gray-400 shrink-0" />
                                <span className="text-xs text-gray-600 truncate">{file.name}</span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setCommentFiles(prev => prev.filter((_, j) => j !== i))}
                                className="text-gray-400 hover:text-red-500 shrink-0"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={updatingTicket || (!ticketReply.trim() && commentFiles.length === 0)}
                        onClick={async () => {
                          setUpdatingTicket(true);
                          try {
                            let uploadedAttachments: Array<{ name: string; url: string; size: number; type: string }> = [];
                            if (commentFiles.length > 0) {
                              for (const file of commentFiles) {
                                const fd = new FormData();
                                fd.append('file', file);
                                fd.append('ticketId', selectedTicket.id);
                                const uploadRes = await fetch('/api/support/tickets/attachments', { method: 'POST', body: fd });
                                if (uploadRes.ok) {
                                  const uploadData = await uploadRes.json();
                                  uploadedAttachments.push(uploadData.attachment);
                                }
                              }
                            }
                            const res = await fetch('/api/support/tickets', {
                              method: 'PUT',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                ticketId: selectedTicket.id,
                                comment: ticketReply || undefined,
                                attachments: uploadedAttachments.length > 0 ? uploadedAttachments : undefined
                              })
                            });
                            const data = await res.json();
                            if (data.ticket) {
                              setSelectedTicket(data.ticket);
                              setTickets(prev => prev.map(t => t.id === selectedTicket.id ? data.ticket : t));
                            }
                            setTicketReply('');
                            setCommentFiles([]);
                          } catch (e) { console.error(e); }
                          setUpdatingTicket(false);
                        }}
                      >
                        Comentar
                      </Button>
                      <p className="text-sm font-medium text-gray-700 mt-3 mb-2">Actualizar estado:</p>
                      <div className="flex gap-2 flex-wrap">
                        {['open', 'in_progress', 'resolved', 'closed'].map(s => (
                          <Button
                            key={s}
                            size="sm"
                            variant={selectedTicket.status === s ? 'default' : 'outline'}
                            disabled={updatingTicket}
                            onClick={() => {
                              if (s === 'resolved' || s === 'closed') {
                                setConfirmStatusModal({ status: s });
                              } else {
                                setUpdatingTicket(true);
                                fetch('/api/support/tickets', {
                                  method: 'PUT',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify({ ticketId: selectedTicket.id, status: s, comment: ticketReply || undefined })
                                }).then(r => r.json()).then(data => {
                                  if (data.ticket) {
                                    setSelectedTicket(data.ticket);
                                    setTickets(prev => prev.map(t => t.id === selectedTicket.id ? data.ticket : t));
                                  }
                                  setTicketReply('');
                                }).catch(e => console.error(e)).finally(() => setUpdatingTicket(false));
                              }
                            }}
                      >
                        {s === 'open' ? 'Abierto' : s === 'in_progress' ? 'En Progreso' : s === 'resolved' ? 'Resuelto' : 'Cerrado'}
                      </Button>
                    ))}
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <Button variant="outline" onClick={() => setShowTicketModal(false)}>Cerrar</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmStatusModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Cambiar estado a {confirmStatusModal.status === 'resolved' ? 'Resuelto' : 'Cerrado'}
            </h3>
            <p className="text-sm text-gray-600 mb-6">
              {confirmStatusModal.status === 'resolved'
                ? '¿Seguro que deseas marcar este ticket como Resuelto? Una vez resuelto, no se podran agregar mas comentarios ni cambios de estado.'
                : '¿Seguro que deseas cerrar este ticket? Una vez cerrado, no se podran agregar mas comentarios ni cambios de estado.'}
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => setConfirmStatusModal(null)}>
                Cancelar
              </Button>
              <Button
                size="sm"
                className={confirmStatusModal.status === 'resolved' ? 'bg-green-600 hover:bg-green-700 text-white' : 'bg-red-600 hover:bg-red-700 text-white'}
                disabled={updatingTicket}
                onClick={async () => {
                  setUpdatingTicket(true);
                  try {
                    const res = await fetch('/api/support/tickets', {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ ticketId: selectedTicket.id, status: confirmStatusModal.status, comment: ticketReply || undefined })
                    });
                    const data = await res.json();
                    if (data.ticket) {
                      setSelectedTicket(data.ticket);
                      setTickets(prev => prev.map(t => t.id === selectedTicket.id ? data.ticket : t));
                    }
                    setTicketReply('');
                  } catch (e) { console.error(e); }
                  setUpdatingTicket(false);
                  setConfirmStatusModal(null);
                }}
              >
                {updatingTicket ? 'Procesando...' : 'Confirmar'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {showUserModal && selectedUserDetail && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Detalle del Usuario</h3>
              <button onClick={() => setShowUserModal(false)} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-3 text-sm">
              <div>
                <p className="font-medium text-gray-700">Nombre:</p>
                <p className="text-gray-600">{selectedUserDetail.firstName} {selectedUserDetail.lastName}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Email:</p>
                <p className="text-gray-600">{selectedUserDetail.email}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Rol:</p>
                <p className="text-gray-600">{selectedUserDetail.role}</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Tenant:</p>
                <p className="text-gray-600">{selectedUserDetail.tenant_name} ({selectedUserDetail.tenant_code})</p>
              </div>
              <div>
                <p className="font-medium text-gray-700">Estado:</p>
                <Badge variant={selectedUserDetail.isActive ? 'default' : 'secondary'}>
                  {selectedUserDetail.isActive ? 'Activo' : 'Inactivo'}
                </Badge>
              </div>
              {selectedUserDetail.last_login && (
                <div>
                  <p className="font-medium text-gray-700">Ultimo login:</p>
                  <p className="text-gray-600">{new Date(selectedUserDetail.last_login).toLocaleString('es-HN')}</p>
                </div>
              )}
            </div>
            <div className="mt-4 pt-4 border-t">
              <p className="text-sm font-medium text-gray-700 mb-2">Enviar mensaje de ayuda:</p>
              <textarea
                value={helpMessage}
                onChange={e => setHelpMessage(e.target.value)}
                placeholder="Escribe un mensaje o instruccion para el usuario..."
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none mb-2"
              />
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowUserModal(false)}>Cerrar</Button>
                <Button
                  size="sm"
                  disabled={!helpMessage.trim()}
                  onClick={async () => {
                    try {
                      const res = await fetch('/api/support/tickets', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          subject: `Ayuda para ${selectedUserDetail.firstName} ${selectedUserDetail.lastName}`,
                          description: helpMessage,
                          priority: 'medium',
                          ticketType: 'support',
                          userEmail: selectedUserDetail.email,
                          userName: `${selectedUserDetail.firstName} ${selectedUserDetail.lastName}`.trim(),
                          assignedTo: null,
                          assignedName: null
                        })
                      });
                      if (res.ok) {
                        setHelpMessage('');
                        setShowUserModal(false);
                        fetchTickets();
                      }
                    } catch (e) { console.error(e); }
                  }}
                >
                  Enviar Ayuda
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
