"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import FooterPaginator from "@/components/admin/FooterPaginator";
import { Key, Eye, EyeOff } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  isActive: boolean;
  tenantId?: string;
  tenantName?: string;
  createdAt: string;
}

export default function UsersManagementPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState("ALL");
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 10,
  });
  const [formData, setFormData] = useState({
    email: "",
    firstName: "",
    lastName: "",
    username: "",
    password: "",
    role: "USER",
    tenantId: "",
  });
  const [tenants, setTenants] = useState<any[]>([]);
  
  // Password reset modal state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetMessage, setResetMessage] = useState<{type: 'success' | 'error', text: string} | null>(null);

  useEffect(() => {
    fetchUsers();
    fetchTenants();
  }, [pagination.currentPage, searchTerm, roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = new URLSearchParams({
        page: pagination.currentPage.toString(),
        limit: pagination.itemsPerPage.toString(),
        search: searchTerm,
        role: roleFilter === "ALL" ? "" : roleFilter,
      });
      
      const response = await fetch(`/api/admin/users?${params}`);
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || []);
        setPagination(prev => ({
          ...prev,
          totalPages: data.pagination?.pages || 1,
          totalItems: data.pagination?.total || 0,
        }));
      } else {
        setError("Error al cargar los usuarios");
      }
    } catch (err) {
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await fetch("/api/admin/tenants");
      if (response.ok) {
        const data = await response.json();
        setTenants(data.tenants || []);
      }
    } catch (err) {
      console.error("Error al cargar tenants:", err);
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPagination(prev => ({ ...prev, currentPage: 1 }));
    fetchUsers();
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('handleCreateUser llamado');
    console.log('FormData:', formData);
    setError("");

    // Validar contraseña
    if (formData.password.length < 8) {
      setError("La contraseña debe tener al menos 8 caracteres");
      return;
    }

    try {
      let response;

      if (formData.tenantId) {
        console.log('Creando usuario para tenant:', formData.tenantId);
        // Crear usuario para un tenant específico
        response = await fetch(`/api/admin/tenants/${formData.tenantId}/users`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.username,
            password: formData.password,
            role: formData.role
          }),
        });
      } else {
        console.log('Creando usuario sin tenant');
        // Crear usuario sin tenant (super admin)
        response = await fetch("/api/admin/create-user", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            email: formData.email,
            firstName: formData.firstName,
            lastName: formData.lastName,
            username: formData.username,
            password: formData.password,
            publicMetadata: {
              role: formData.role,
              tenantId: null,
              tenantCode: null,
              permissions: [],
              isolation: {
                tenantScope: false,
                crossTenantAccess: true,
                dataVisibility: 'all'
              }
            }
          }),
        });
      }

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({
          email: "",
          firstName: "",
          lastName: "",
          username: "",
          password: "",
          role: "USER",
          tenantId: "",
        });
        fetchUsers();
      } else {
        if (data.error?.includes('data breach') || data.error?.includes('pwned')) {
          setError("La contraseña ha sido comprometida. Por favor usa una contraseña más segura y única.");
        } else if (data.error?.includes('username') || data.error?.includes('taken')) {
          setError("El nombre de usuario ya está en uso. Por favor usa otro.");
        } else {
          setError(data.error || "Error al crear usuario");
        }
      }
    } catch (err) {
      console.error('Error en handleCreateUser:', err);
      setError("Error de conexión al servidor");
    }
  };

  const openPasswordModal = (user: User) => {
    setSelectedUser(user);
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
          userId: selectedUser.id,
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

  const handleToggleStatus = async (userId: string, currentStatus: boolean) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/toggle`, {
        method: "PATCH",
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Error al cambiar estado:", err);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: newRole }),
      });
      if (response.ok) {
        fetchUsers();
      }
    } catch (err) {
      console.error("Error al cambiar rol:", err);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${userEmail}? Esta acción también eliminará el usuario de Clerk.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchUsers();
      } else {
        const data = await response.json();
        alert(data.error || 'Error al eliminar usuario');
      }
    } catch (err) {
      console.error("Error al eliminar usuario:", err);
      alert('Error de conexión al eliminar usuario');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "ALL" || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const roleColors: Record<string, string> = {
    SUPER_ADMIN: "bg-purple-100 text-purple-800",
    SUPPORT: "bg-blue-100 text-blue-800",
    ADMIN: "bg-green-100 text-green-800",
    MANAGER: "bg-yellow-100 text-yellow-800",
    USER: "bg-gray-100 text-gray-800",
    VIEWER: "bg-gray-200 text-gray-700",
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600 mt-2">Administra los usuarios del sistema</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Crear Usuario
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Buscar por email o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
            >
              <option value="ALL">Todos los roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="SUPPORT">Soporte</option>
              <option value="ADMIN">Admin</option>
              <option value="MANAGER">Gerente</option>
              <option value="USER">Usuario</option>
              <option value="VIEWER">Observador</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rol
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                      No se encontraron usuarios
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                            <span className="text-white font-medium">
                              {user.firstName?.charAt(0) || user.email.charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}` 
                                : user.email}
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <select
                          value={user.role}
                          onChange={(e) => handleRoleChange(user.id, e.target.value)}
                          className={`px-2 py-1 text-xs font-semibold rounded-full border-0 cursor-pointer ${roleColors[user.role] || 'bg-gray-100 text-gray-800'}`}
                        >
                          <option value="SUPER_ADMIN">Super Admin</option>
                          <option value="SUPPORT">Soporte</option>
                          <option value="ADMIN">Admin</option>
                          <option value="MANAGER">Gerente</option>
                          <option value="USER">Usuario</option>
                          <option value="VIEWER">Observador</option>
                        </select>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.tenantName || 'Sin tenant'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? 'Activo' : 'Inactivo'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.createdAt).toLocaleDateString('es-HN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                        <button
                          onClick={() => handleToggleStatus(user.id, user.isActive)}
                          className={`px-3 py-1 rounded ${
                            user.isActive
                              ? 'bg-red-100 text-red-700 hover:bg-red-200'
                              : 'bg-green-100 text-green-700 hover:bg-green-200'
                          }`}
                        >
                          {user.isActive ? 'Desactivar' : 'Activar'}
                        </button>
                        <button
                          onClick={() => openPasswordModal(user)}
                          className="px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                        >
                          <Key className="h-4 w-4 inline mr-1" />
                          Cambiar contraseña
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

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
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={generateRandomPassword}
                  className="w-full px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50 text-sm"
                >
                  Generar contraseña aleatoria
                </button>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={closePasswordModal}
                    disabled={resettingPassword}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={resetPassword}
                    disabled={!newPassword || newPassword.length < 8 || resettingPassword}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {resettingPassword ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white inline mr-2"></div>
                        Actualizando...
                      </>
                    ) : (
                      'Actualizar Contraseña'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-6">Crear Usuario</h2>
                
                <form onSubmit={handleCreateUser} className="space-y-4">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                      Email *
                    </label>
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="usuario@ejemplo.com"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-2">
                        Nombre
                      </label>
                      <input
                        type="text"
                        id="firstName"
                        value={formData.firstName}
                        onChange={(e) => {
                          const firstName = e.target.value;
                          const username = `${firstName.toLowerCase()}_${formData.lastName.toLowerCase()}`;
                          setFormData({...formData, firstName, username});
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Juan"
                      />
                    </div>
                    <div>
                      <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-2">
                        Apellido
                      </label>
                      <input
                        type="text"
                        id="lastName"
                        value={formData.lastName}
                        onChange={(e) => {
                          const lastName = e.target.value;
                          const username = `${formData.firstName.toLowerCase()}_${lastName.toLowerCase()}`;
                          setFormData({...formData, lastName, username});
                        }}
                        className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Pérez"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                      Usuario (Username)
                    </label>
                    <input
                      type="text"
                      id="username"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="juan_perez"
                    />
                    <p className="text-xs text-gray-500 mt-1">Solo letras, números, guiones y guiones bajos</p>
                  </div>

                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                      Contraseña *
                    </label>
                    <input
                      type="text"
                      id="password"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder="Contraseña temporal"
                    />
                  </div>

                  <div>
                    <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                      Rol *
                    </label>
                    <select
                      id="role"
                      required
                      value={formData.role}
                      onChange={(e) => setFormData({...formData, role: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="SUPER_ADMIN">Super Admin</option>
                      <option value="SUPPORT">Soporte</option>
                      <option value="ADMIN">Admin</option>
                      <option value="MANAGER">Gerente</option>
                      <option value="USER">Usuario</option>
                      <option value="VIEWER">Observador</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="tenantId" className="block text-sm font-medium text-gray-700 mb-2">
                      Tenant
                    </label>
                    <select
                      id="tenantId"
                      value={formData.tenantId}
                      onChange={(e) => setFormData({...formData, tenantId: e.target.value})}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Sin tenant</option>
                      {tenants.map((tenant) => (
                        <option key={tenant.id} value={tenant.id}>
                          {tenant.businessName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex justify-end space-x-4 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        setFormData({
                          email: "",
                          firstName: "",
                          lastName: "",
                          username: "",
                          password: "",
                          role: "USER",
                          tenantId: "",
                        });
                      }}
                      className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Crear Usuario
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* Pagination */}
        {!loading && users.length > 0 && (
          <FooterPaginator
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={pagination.totalItems}
            itemsPerPage={pagination.itemsPerPage}
            onPageChange={handlePageChange}
          />
        )}
      </div>
    </div>
  );
}
