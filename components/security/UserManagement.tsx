"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users,
  Shield,
  Key,
  Search,
  Download,
  Plus,
  Edit,
  Trash2,
  UserCheck,
  UserX,
  Settings,
  Activity,
  Clock,
  AlertTriangle,
  CheckCircle
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";

interface UserManagementProps {
  tenantId: string;
}

interface User {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
  isActive: boolean;
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
}

interface UserActivity {
  id: string;
  userId: string;
  action: string;
  description: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  user?: {
    name: string;
    email: string;
  };
}

interface BackupRecord {
  id: string;
  userId: string;
  type: 'MANUAL' | 'AUTOMATIC' | 'SCHEDULED';
  description: string;
  fileName: string;
  fileSize: number;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  createdAt: string;
  completedAt?: string;
  user?: {
    name: string;
    email: string;
  };
}

export default function UserManagement({ tenantId }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [activities, setActivities] = useState<UserActivity[]>([]);
  const [backupRecords, setBackupRecords] = useState<BackupRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [userForm, setUserForm] = useState({
    email: "",
    name: "",
    role: 'USER' as 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER',
    isActive: true
  });

  const supabase = createSupabaseClient();

  useEffect(() => {
    loadUsers();
    loadActivities();
    loadBackupRecords();
  }, [tenantId]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      // Establecer tenant context
      await supabase.rpc('set_tenant', { tenant_id: tenantId });

      // Cargar usuarios
      const { data, error } = await supabase
        .from('User')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;

      setUsers(data || []);
    } catch (error: any) {
      console.error("Error loading users:", error);
      alert("Error al cargar los usuarios");
    } finally {
      setLoading(false);
    }
  };

  const loadActivities = async () => {
    try {
      // Cargar actividades recientes
      const { data, error } = await supabase
        .from('UserActivity')
        .select(`
          *,
          User:user(id, name, email)
        `)
        .order('createdAt', { ascending: false })
        .limit(50);

      if (error) throw error;

      setActivities(data || []);
    } catch (error: any) {
      console.error("Error loading activities:", error);
      alert("Error al cargar las actividades");
    }
  };

  const loadBackupRecords = async () => {
    try {
      // Cargar registros de respaldos
      const { data, error } = await supabase
        .from('BackupRecord')
        .select(`
          *,
          User:user(id, name, email)
        `)
        .order('createdAt', { ascending: false })
        .limit(20);

      if (error) throw error;

      setBackupRecords(data || []);
    } catch (error: any) {
      console.error("Error loading backups:", error);
      alert("Error al cargar los respaldos");
    }
  };

  const saveUser = async () => {
    try {
      if (!userForm.email || !userForm.name) {
        alert("Por favor complete los campos requeridos");
        return;
      }

      const userData = {
        tenantId,
        email: userForm.email,
        name: userForm.name,
        role: userForm.role,
        isActive: userForm.isActive
      };

      if (editingUser) {
        // Actualizar usuario existente
        const { error } = await supabase
          .from('User')
          .update(userData)
          .eq('id', editingUser.id);

        if (error) throw error;
        alert("Usuario actualizado exitosamente");
      } else {
        // Crear nuevo usuario
        const { error } = await supabase
          .from('User')
          .insert(userData);

        if (error) throw error;
        alert("Usuario creado exitosamente");
      }

      // Resetear formulario
      setUserForm({
        email: "",
        name: "",
        role: 'USER',
        isActive: true
      });
      setEditingUser(null);
      setShowUserForm(false);
      loadUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      alert("Error al guardar el usuario");
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const { error } = await supabase
        .from('User')
        .update({ isActive: !user.isActive, updatedAt: new Date().toISOString() })
        .eq('id', user.id);

      if (error) throw error;

      alert(`Usuario ${user.isActive ? 'desactivado' : 'activado'} exitosamente`);
      loadUsers();
    } catch (error: any) {
      console.error("Error toggling user status:", error);
      alert("Error al cambiar el estado del usuario");
    }
  };

  const exportToCSV = () => {
    const headers = [
      'Email', 'Nombre', 'Rol', 'Estado', 'Último Login', 'Fecha Creación'
    ];
    const rows = users.map(user => [
      user.email,
      user.name,
      user.role,
      user.isActive ? 'Activo' : 'Inactivo',
      user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('es-HN') : 'Nunca',
      new Date(user.createdAt).toLocaleDateString('es-HN')
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `usuarios_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  ).filter(user =>
    roleFilter === "all" || user.role === roleFilter
  ).filter(user =>
    statusFilter === "all" || (statusFilter === "active" && user.isActive) || (statusFilter === "inactive" && !user.isActive)
  );

  const totalUsers = filteredUsers.length;
  const activeUsers = filteredUsers.filter(user => user.isActive).length;
  const inactiveUsers = filteredUsers.filter(user => !user.isActive).length;
  const adminUsers = filteredUsers.filter(user => user.role === 'ADMIN').length;
  const managerUsers = filteredUsers.filter(user => user.role === 'MANAGER').length;
  const regularUsers = filteredUsers.filter(user => user.role === 'USER').length;

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge className="bg-red-100 text-red-800">Administrador</Badge>;
      case 'MANAGER':
        return <Badge className="bg-blue-100 text-blue-800">Gerente</Badge>;
      case 'USER':
        return <Badge className="bg-green-100 text-green-800">Usuario</Badge>;
      case 'VIEWER':
        return <Badge className="bg-gray-100 text-gray-800">Lector</Badge>;
      default:
        return <Badge variant="secondary">{role}</Badge>;
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? 
      <Badge className="bg-green-100 text-green-800">Activo</Badge> :
      <Badge variant="secondary">Inactivo</Badge>;
  };

  const getActionIcon = (action: string) => {
    switch (action.toLowerCase()) {
      case 'login':
        return <UserCheck className="h-4 w-4 text-green-600" />;
      case 'logout':
        return <UserX className="h-4 w-4 text-red-600" />;
      case 'create':
      case 'update':
      case 'delete':
        return <Edit className="h-4 w-4 text-blue-600" />;
      case 'permission_change':
        return <Key className="h-4 w-4 text-purple-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p>Cargando usuarios...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Users className="h-6 w-6 mr-2 text-blue-600" />
            Gestión de Usuarios
          </h2>
          <p className="text-gray-600">Control de acceso y permisos</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Email o nombre..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rol</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="ADMIN">Administrador</option>
                <option value="MANAGER">Gerente</option>
                <option value="USER">Usuario</option>
                <option value="VIEWER">Lector</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Estado</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full p-2 border rounded-md"
              >
                <option value="all">Todos</option>
                <option value="active">Activos</option>
                <option value="inactive">Inactivos</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Total Registros</label>
              <div className="p-2 bg-gray-50 rounded">
                <span className="font-medium">{filteredUsers.length}</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Usuarios</CardTitle>
            <Users className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {totalUsers}
            </div>
            <p className="text-xs text-gray-600">
              Usuarios registrados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Activos</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {activeUsers}
            </div>
            <p className="text-xs text-gray-600">
              Con acceso activo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuarios Inactivos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {inactiveUsers}
            </div>
            <p className="text-xs text-gray-600">
              Sin acceso activo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Administradores</CardTitle>
            <Shield className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {adminUsers}
            </div>
            <p className="text-xs text-gray-600">
              Acceso completo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gerentes</CardTitle>
            <Settings className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              {managerUsers}
            </div>
            <p className="text-xs text-gray-600">
              Acceso de gestión
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Botón de Nuevo Usuario */}
      <div className="flex justify-center">
        <Button onClick={() => setShowUserForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      {/* Lista de Usuarios */}
      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>
            Gestión de usuarios y permisos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-gray-50">
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Login
                  </th>
                  <th className="border border-gray-200 px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-gray-500">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {user.email}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {user.name}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                        {getRoleBadge(user.role)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                        {getStatusBadge(user.isActive)}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm">
                        {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString('es-HN') : 'Nunca'}
                      </td>
                      <td className="border border-gray-200 px-4 py-3 text-sm text-center">
                        <div className="flex space-x-1 justify-center">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditingUser(user);
                              setUserForm({
                                email: user.email,
                                name: user.name,
                                role: user.role,
                                isActive: user.isActive
                              });
                              setShowUserForm(true);
                            }}
                          >
                            Editar
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => toggleUserStatus(user)}
                            variant={user.isActive ? "destructive" : "default"}
                          >
                            {user.isActive ? 'Desactivar' : 'Activar'}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Formulario de Usuario */}
      {showUserForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</CardTitle>
            <CardDescription>
              {editingUser ? 'Modifique los datos del usuario' : 'Ingrese los datos del nuevo usuario'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  type="email"
                  value={userForm.email}
                  onChange={(e) => setUserForm({ ...userForm, email: e.target.value })}
                  placeholder="usuario@ejemplo.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Nombre *</Label>
                <Input
                  id="name"
                  value={userForm.name}
                  onChange={(e) => setUserForm({ ...userForm, name: e.target.value })}
                  placeholder="Nombre completo"
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Rol *</Label>
              <Select value={userForm.role} onValueChange={(value) => setUserForm({ ...userForm, role: value })}>
                <SelectTrigger className="bg-white">
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
            <div className="space-y-2">
              <Label htmlFor="isActive">Estado</Label>
              <Select value={userForm.isActive ? 'true' : 'false'} onValueChange={(value) => setUserForm({ ...userForm, isActive: value === 'true' })}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => {
                setShowUserForm(false);
                setEditingUser(null);
                setUserForm({
                  email: "",
                  name: "",
                  role: 'USER',
                  isActive: true
                });
              }}
            >
              Cancelar
            </Button>
            <Button onClick={saveUser}>
              {editingUser ? 'Actualizar' : 'Guardar'}
            </Button>
          </div>
        </CardContent>
      </Card>
      )}

      {/* Actividad Reciente */}
      <Card>
        <CardHeader>
          <CardTitle>Actividad Reciente</CardTitle>
          <CardDescription>
            Historial de acciones de usuarios
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {activities.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                No hay actividad reciente
              </div>
            ) : (
              activities.map((activity) => (
                <div key={activity.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded">
                  <div className="flex-shrink-0">
                    {getActionIcon(activity.action)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">{activity.action}</p>
                        <p className="text-sm text-gray-600">{activity.description}</p>
                        <p className="text-xs text-gray-500">
                          {activity.user?.name} ({activity.user?.email})
                        </p>
                      </div>
                      <div className="text-right text-xs text-gray-500">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {new Date(activity.createdAt).toLocaleDateString('es-HN')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Respaldo de Información */}
      <Card>
        <CardHeader>
          <CardTitle>Respaldo de Información</CardTitle>
          <CardDescription>
            Historial de respaldos automáticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {backups.length === 0 ? (
              {backups.length === 0 ? (
            <div className="text-center text-gray-500 py-8">
              No hay registros de respaldo
            </div>
          ) : (
            backups.map((backup) => (
              <div key={backup.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <h4 className="font-medium">{backup.description}</h4>
                      <Badge className={
                        backup.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                        backup.status === 'FAILED' ? 'bg-red-100 text-red-800' :
                        backup.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }>
                        {backup.status === 'COMPLETED' ? 'Completado' :
                         backup.status === 'FAILED' ? 'Fallido' :
                         backup.status === 'IN_PROGRESS' ? 'En Progreso' :
                         'Pendiente'}
                      </Badge>
                    </div>
                    <div className="text-xs text-gray-500">
                      {new Date(backup.createdAt).toLocaleDateString('es-HN')}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="font-medium">Archivo:</span>
                      <span className="ml-2">{backup.fileName}</span>
                    </div>
                    <div>
                      <span className="font-medium">Tamaño:</span>
                      <span className="ml-2">{(backup.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="text-xs text-gray-500">
                      {backup.user?.name} ({backup.user?.email})
                    </div>
                    {backup.completedAt && (
                      <div className="text-xs text-green-600">
                        Completado: {new Date(backup.completedAt).toLocaleDateString('es-HN')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
