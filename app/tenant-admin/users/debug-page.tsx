"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { useTenant } from "@/lib/contexts/TenantContext";
import { 
  Users, 
  ArrowLeft,
  Building,
  AlertTriangle,
  RefreshCw,
  Search,
  Filter,
  Plus,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  CheckCircle,
  XCircle
} from "lucide-react";

export default function DebugTenantUsersPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { currentTenant } = useTenant();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user) {
      const userRole = user.publicMetadata?.role;
      
      if (!['ADMIN', 'MANAGER', 'SUPER_ADMIN'].includes(userRole as string)) {
        router.replace('/dashboard');
        return;
      }
    }
  }, [user, router]);

  const fetchUsers = async () => {
    if (!currentTenant) {
      console.log('❌ No currentTenant available');
      setError("No hay tenant seleccionado");
      setLoading(false);
      return;
    }

    console.log('🔍 DEBUG: Iniciando fetchUsers');
    console.log('📋 Tenant actual:', currentTenant);
    console.log('🆔 Tenant ID:', currentTenant.id);
    
    setLoading(true);
    setError("");

    try {
      const params = new URLSearchParams({
        tenantId: currentTenant.id,
        search: "",
        role: "",
        status: "",
      });
      
      const apiUrl = `/api/tenant/users?${params}`;
      console.log('📡 API URL:', apiUrl);
      
      console.log('⏳️ Enviando petición...');
      const response = await fetch(apiUrl);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Response data:', data);
        console.log('👥 Users count:', data.users?.length || 0);
        
        setUsers(data.users || []);
        setError("");
      } else {
        const errorText = `Error ${response.status}: ${response.statusText}`;
        console.error('❌', errorText);
        setError(errorText);
      }
    } catch (err) {
      console.error('❌ Error en fetchUsers:', err);
      setError("Error de conexión al servidor");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentTenant) {
      fetchUsers();
    }
  }, [currentTenant]);

  // Mostrar loading mientras se verifica el rol
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Verificando usuario...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-cyan-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Usuario no encontrado...</p>
        </div>
      </div>
    );
  }

  if (!currentTenant) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-8 max-w-2xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600" />
            <h2 className="text-lg font-semibold text-yellow-800">Tenant No Seleccionado</h2>
          </div>
          <p className="text-yellow-700 mb-4">
            No hay un tenant seleccionado. Por favor, selecciona un tenant para continuar.
          </p>
          <div className="bg-yellow-100 p-4 rounded text-sm">
            <p className="font-medium mb-2">Información de depuración:</p>
            <p>• Usuario: {user.primaryEmailAddress?.emailAddress}</p>
            <p>• Rol: {user.publicMetadata?.role}</p>
            <p>• Ruta actual: {typeof window !== 'undefined' ? window.location.pathname : 'N/A'}</p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-4 py-2 bg-yellow-600 text-white rounded hover:bg-yellow-700"
          >
            Volver al Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Gestión de Usuarios</h1>
            <p className="text-gray-600">
              Usuarios de <span className="font-medium">{currentTenant.businessName}</span>
            </p>
          </div>
          <button
            onClick={() => router.push('/tenant-admin/users/create')}
            className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700 flex items-center"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nuevo Usuario
          </button>
        </div>

        {/* Debug Info */}
        <div className="mb-6 bg-cyan-50 border border-cyan-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 text-cyan-600" />
              <h3 className="text-sm font-semibold text-cyan-800">Información de Depuración</h3>
            </div>
            <button
              onClick={fetchUsers}
              className="px-3 py-1 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700"
            >
              Refrescar
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="font-medium text-cyan-700">Tenant ID:</span>
              <span className="ml-2 text-gray-900">{currentTenant.id}</span>
            </div>
            <div>
              <span className="font-medium text-cyan-700">Tenant Code:</span>
              <span className="ml-2 text-gray-900">{currentTenant.tenantCode}</span>
            </div>
            <div>
              <span className="font-medium text-cyan-700">Usuario:</span>
              <span className="ml-2 text-gray-900">{user.primaryEmailAddress?.emailAddress}</span>
            </div>
            <div>
              <span className="font-medium text-cyan-700">Rol:</span>
              <span className="ml-2 text-gray-900">{user.publicMetadata?.role}</span>
            </div>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Users List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-semibold text-gray-800">
                Lista de Usuarios
              </h2>
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 bg-cyan-100 text-cyan-800 rounded-full text-sm font-medium">
                  {users.length} usuario(s)
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-600"></div>
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay usuarios</h3>
                <p className="text-gray-500 mb-4">
                  No se encontraron usuarios para este tenant.
                </p>
                <button
                  onClick={() => router.push('/tenant-admin/users/create')}
                  className="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear Primer Usuario
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-gray-50">
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Usuario</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Rol</th>
                      <th className="text-left py-3 px-4 font-medium text-gray-700">Estado</th>
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
                            <div className="w-8 h-8 bg-cyan-100 rounded-full flex items-center justify-center">
                              <span className="text-cyan-600 text-xs font-medium">
                                {user.email.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="text-gray-900">{user.email}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.role === 'ADMIN' ? 'bg-purple-100 text-purple-800' :
                            user.role === 'MANAGER' ? 'bg-cyan-100 text-cyan-800' :
                            user.role === 'USER' ? 'bg-gray-100 text-gray-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                            user.isActive
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {user.isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => router.push(`/tenant-admin/users/${user.id}/edit`)}
                              className="px-3 py-1 bg-cyan-600 text-white text-sm rounded hover:bg-cyan-700"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              className="px-3 py-1 bg-gray-600 text-white text-sm rounded hover:bg-gray-700"
                            >
                              {user.isActive ? (
                                <EyeOff className="h-4 w-4" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
