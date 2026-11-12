"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Users, 
  UserPlus, 
  Search, 
  Filter,
  Edit,
  Trash2,
  Mail,
  Shield,
  CheckCircle,
  XCircle,
  Building
} from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
}

export default function TenantUsersPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { currentTenant } = useTenant();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");

  // Verificar rol y redirigir si no es admin de tenant
  useEffect(() => {
    if (user) {
      const userRole = user.publicMetadata?.role;
      
      // Permitir acceso a ADMIN, MANAGER, y SUPER_ADMIN
      if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole as string)) {
        router.replace('/dashboard');
      }
    }
  }, [user, router]);

  useEffect(() => {
    if (currentTenant) {
      console.log('🔄 useEffect triggered, currentTenant:', currentTenant);
      fetchUsers();
    }
  }, [currentTenant, searchTerm, roleFilter, statusFilter]);

  const fetchUsers = async () => {
    if (!currentTenant) return;
    
    try {
      setLoading(true);
      console.log('🔍 Fetching users for tenant:', currentTenant.id);
      
      const params = new URLSearchParams({
        tenantId: currentTenant.id,
        search: searchTerm,
        role: roleFilter === "ALL" ? "" : roleFilter,
        status: statusFilter === "ALL" ? "" : statusFilter,
      });
      
      console.log('📡 API call params:', params.toString());
      
      const response = await fetch(`/api/tenant/users?${params}`);
      console.log('📡 API response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ Users fetched:', data);
        setUsers(data.users || []);
      } else {
        const errorData = await response.json();
        console.error('❌ API Error:', errorData);
        setError(errorData.error || "Error al cargar los usuarios");
      }
    } catch (err) {
      console.error('❌ Network Error:', err);
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers();
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const response = await fetch(`/api/tenant/users`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId, action: 'toggle_status' }),
      });

      if (response.ok) {
        fetchUsers();
      } else {
        setError("Error al cambiar el estado del usuario");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (confirm('¿Estás seguro de que deseas eliminar este usuario?')) {
      try {
        const response = await fetch(`/api/tenant/users?id=${userId}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          fetchUsers();
        } else {
          setError("Error al eliminar el usuario");
        }
      } catch (err) {
        setError("Error de conexión al servidor");
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'MANAGER':
        return 'bg-cyan-100 text-cyan-800';
      case 'USER':
        return 'bg-gray-100 text-gray-800';
      case 'VIEWER':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-HN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Mostrar loading mientras se verifica el rol
  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Usuario no encontrado...</p>
        </div>
      </div>
    );
  }

  if (!currentTenant) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-red-600">No hay tenant seleccionado</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-600">
            Usuarios de <span className="font-medium">{currentTenant.businessName}</span>
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => router.push(`/admin/tenants/${currentTenant.id}`)}>
            <Building className="h-4 w-4 mr-2" />
            Perfil del Tenant
          </Button>
          <Button onClick={() => router.push('/tenant-admin/users/create')}>
            <UserPlus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Búsqueda y Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar por nombre, email o username..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="ALL">Todos los roles</option>
                  <option value="ADMIN">Admin</option>
                  <option value="MANAGER">Manager</option>
                  <option value="USER">Usuario</option>
                  <option value="VIEWER">Visor</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                >
                  <option value="ALL">Todos los estados</option>
                  <option value="ACTIVE">Activos</option>
                  <option value="INACTIVE">Inactivos</option>
                </select>
                <Button type="submit">
                  <Filter className="h-4 w-4 mr-2" />
                  Filtrar
                </Button>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Users List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Lista de Usuarios
            </div>
            <Badge variant="outline">
              {users.length} usuario(s)
            </Badge>
          </CardTitle>
          <CardDescription>
            Gestiona los usuarios de tu empresa
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600">{error}</p>
            </div>
          ) : users.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
              <p className="text-gray-500 mb-4">
                No se encontraron usuarios con los filtros actuales
              </p>
              <Button onClick={() => router.push('/tenant-admin/users/create')}>
                <UserPlus className="h-4 w-4 mr-2" />
                Crear Primer Usuario
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Usuario</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Rol</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Creado</th>
                    <th className="text-left py-3 px-4 font-medium text-gray-700">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {user.firstName && user.lastName 
                              ? `${user.firstName} ${user.lastName}`
                              : user.email
                            }
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-400" />
                          <span className="text-gray-900">{user.email}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className={getRoleColor(user.role)}>
                          <Shield className="h-3 w-3 mr-1" />
                          {user.role}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge 
                          variant={user.isActive ? "default" : "secondary"}
                          className={user.isActive 
                            ? "bg-green-100 text-green-800" 
                            : "bg-red-100 text-red-800"
                          }
                        >
                          {user.isActive ? (
                            <>
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Activo
                            </>
                          ) : (
                            <>
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactivo
                            </>
                          )}
                        </Badge>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {formatDate(user.createdAt)}
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => router.push(`/tenant-admin/users/${user.id}/edit`)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleToggleUserStatus(user.id)}
                            className={user.isActive ? "text-red-600" : "text-green-600"}
                          >
                            {user.isActive ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteUser(user.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
