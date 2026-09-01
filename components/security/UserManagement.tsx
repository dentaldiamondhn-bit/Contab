"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, Shield, Search, Plus, Edit, Trash2, UserCheck, UserX } from "lucide-react";
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
}

export default function UserManagement({ tenantId }: UserManagementProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
  }, [tenantId]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      await (supabase as any).rpc('set_tenant', { tenant_id: tenantId });

      const { data, error } = await supabase
        .from('User')
        .select('*')
        .order('createdAt', { ascending: false });

      if (error) throw error;
      setUsers((data || []) as User[]);
    } catch (error: any) {
      console.error("Error loading users:", error);
    } finally {
      setLoading(false);
    }
  };

  const saveUser = async () => {
    try {
      const userData = {
        tenantId,
        email: userForm.email,
        name: userForm.name,
        role: userForm.role,
        isActive: userForm.isActive
      };

      if (editingUser) {
        const { error } = await (supabase as any)
          .from('User')
          .update(userData)
          .eq('id', editingUser.id);
        if (error) throw error;
        alert("Usuario actualizado exitosamente");
      } else {
        const { error } = await (supabase as any)
          .from('User')
          .insert(userData);
        if (error) throw error;
        alert("Usuario creado exitosamente");
      }

      setShowUserForm(false);
      setEditingUser(null);
      setUserForm({ email: "", name: "", role: 'USER', isActive: true });
      loadUsers();
    } catch (error: any) {
      console.error("Error saving user:", error);
      alert("Error al guardar el usuario");
    }
  };

  const toggleUserStatus = async (user: User) => {
    try {
      const { error } = await (supabase as any)
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

  const deleteUser = async (userId: string) => {
    if (!confirm('¿Está seguro de eliminar este usuario?')) return;
    try {
      const { error } = await (supabase as any)
        .from('User')
        .delete()
        .eq('id', userId);

      if (error) throw error;
      alert("Usuario eliminado exitosamente");
      loadUsers();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      alert("Error al eliminar el usuario");
    }
  };

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      'ADMIN': 'bg-red-100 text-red-800',
      'MANAGER': 'bg-cyan-100 text-cyan-800',
      'USER': 'bg-green-100 text-green-800',
      'VIEWER': 'bg-gray-100 text-gray-800'
    };
    const labels: Record<string, string> = {
      'ADMIN': 'Administrador',
      'MANAGER': 'Gerente',
      'USER': 'Usuario',
      'VIEWER': 'Lector'
    };
    return <Badge className={colors[role] || 'bg-gray-100'}>{labels[role] || role}</Badge>;
  };

  const filteredUsers = users.filter(user =>
    user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold flex items-center">
            <Users className="h-6 w-6 mr-2 text-cyan-600" />
            Gestión de Usuarios
          </h2>
          <p className="text-gray-600">Administre los usuarios del sistema</p>
        </div>
        <Button onClick={() => setShowUserForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nuevo Usuario
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Usuarios</CardTitle>
          <CardDescription>Lista de usuarios del sistema</CardDescription>
          <div className="mt-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Buscar usuarios..."
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
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600 mx-auto mb-4"></div>
              <p>Cargando usuarios...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Nombre</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rol</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Estado</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-gray-500">
                        No se encontraron usuarios
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3 text-sm">{user.email}</td>
                        <td className="px-4 py-3 text-sm">{user.name}</td>
                        <td className="px-4 py-3 text-sm">{getRoleBadge(user.role)}</td>
                        <td className="px-4 py-3 text-sm">
                          <Badge variant={user.isActive ? 'default' : 'secondary'}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-sm text-center">
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
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => toggleUserStatus(user)}
                            >
                              {user.isActive ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteUser(user.id)}
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

      {showUserForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingUser ? 'Editar Usuario' : 'Nuevo Usuario'}</CardTitle>
            <CardDescription>
              {editingUser ? 'Modifique los datos del usuario' : 'Ingrese los datos del nuevo usuario'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
            <div className="space-y-2 mb-4">
              <Label htmlFor="role">Rol *</Label>
              <Select 
                value={userForm.role} 
                onValueChange={(value) => setUserForm({ ...userForm, role: value as 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER' })}
              >
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
            <div className="space-y-2 mb-4">
              <Label htmlFor="isActive">Estado</Label>
              <Select 
                value={userForm.isActive ? 'true' : 'false'} 
                onValueChange={(value) => setUserForm({ ...userForm, isActive: value === 'true' })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Activo</SelectItem>
                  <SelectItem value="false">Inactivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end space-x-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => {
                  setShowUserForm(false);
                  setEditingUser(null);
                  setUserForm({ email: "", name: "", role: 'USER', isActive: true });
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
    </div>
  );
}
