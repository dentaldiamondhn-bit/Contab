'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import CreateUserModal from '../../components/admin/UserManagement'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  isActive: boolean
  tenantId?: string
  tenant?: {
    id: string
    businessName: string
  }
  createdAt: string
}

interface Tenant {
  id: string
  businessName: string
  businessRTN: string
  businessEmail: string
  phoneNumber?: string
  subscriptionPlan?: string
  isActive: boolean
  createdAt: string
}

export default function AdminPage() {
  const [users, setUsers] = useState<User[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  useEffect(() => {
    fetchUsersAndTenants()
  }, [])

  const fetchUsersAndTenants = async () => {
    try {
      setLoading(true)
      
      // Fetch all users (for super admin) or users from current tenant
      const { data: { user } } = await supabase.auth.getUser()
      
      if (!user) {
        throw new Error('No autenticado')
      }

      // Get current user role
      const { data: currentUserData } = await supabase
        .from('users')
        .select('role, tenantId')
        .eq('authId', user.id)
        .single()

      if (!currentUserData) {
        throw new Error('Usuario no encontrado')
      }

      setCurrentUser({
        id: '',
        email: '',
        role: currentUserData.role,
        tenantId: currentUserData.tenantId,
        isActive: true,
        createdAt: ''
      })

      let usersQuery = supabase
        .from('users')
        .select(`
          *,
          tenant (
            id,
            businessName
          )
        `)
        .order('createdAt', { ascending: false })

      // If not super admin, filter by current tenant
      if (currentUserData.role !== 'SUPER_ADMIN') {
        usersQuery = usersQuery.eq('tenantId', currentUserData.tenantId)
      }

      const { data: usersData, error: usersError } = await usersQuery

      if (usersError) throw usersError

      // Fetch all tenants if super admin
      let tenantsData: Tenant[] = []
      if (currentUserData.role === 'SUPER_ADMIN') {
        const { data: tenantsResult, error: tenantsError } = await supabase
          .from('Tenant')
          .select('*')
          .order('createdAt', { ascending: false })

        if (tenantsError) throw tenantsError
        tenantsData = tenantsResult || []
      }

      setUsers(usersData || [])
      setTenants(tenantsData)
    } catch (err: any) {
      setError(err.message || 'Error cargando datos')
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (userId: string, newRole: string) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ role: newRole })
        .eq('id', userId)

      if (error) throw error

      await fetchUsersAndTenants()
    } catch (err: any) {
      setError(err.message || 'Error actualizando rol')
    }
  }

  const toggleUserStatus = async (userId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('users')
        .update({ isActive })
        .eq('id', userId)

      if (error) throw error

      await fetchUsersAndTenants()
    } catch (err: any) {
      setError(err.message || 'Error actualizando estado')
    }
  }

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'bg-purple-100 text-purple-800'
      case 'ADMIN': return 'bg-red-100 text-red-800'
      case 'MANAGER': return 'bg-blue-100 text-blue-800'
      case 'USER': return 'bg-green-100 text-green-800'
      case 'VIEWER': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return 'Super Admin'
      case 'ADMIN': return 'Administrador'
      case 'MANAGER': return 'Gerente'
      case 'USER': return 'Usuario'
      case 'VIEWER': return 'Lector'
      default: return role
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900"></div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          <strong>Error:</strong> {error}
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Panel de Administración
        </h1>
        <p className="text-gray-600">
          {currentUser?.role === 'SUPER_ADMIN' 
            ? 'Gestión de todos los usuarios y tenants del sistema'
            : 'Gestión de usuarios de tu organización'
          }
        </p>
        
        {(currentUser?.role === 'SUPER_ADMIN' || currentUser?.role === 'ADMIN') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="mb-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded"
          >
            Crear Nuevo Usuario
          </button>
        )}
      </div>

      {/* Create User Modal */}
      <CreateUserModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onSuccess={fetchUsersAndTenants}
        tenants={tenants}
        currentUserRole={currentUser?.role || ''}
      />

      {/* Error Alert */}
      {error && (
        <div className="mb-6 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Super Admin: Tenants Section */}
      {currentUser?.role === 'SUPER_ADMIN' && tenants.length > 0 && (
        <div className="mb-8 bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Empresas/Tenants</h2>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    RTN
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Teléfono
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Plan
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuarios
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenants.map((tenant) => (
                  <tr key={tenant.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-gray-600">
                            {tenant.businessName.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm font-medium text-gray-900">{tenant.businessName}</div>
                          <div className="text-xs text-gray-500">{tenant.businessRTN}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {currentUser?.role === 'SUPER_ADMIN' ? tenant.businessEmail : '***@***.***'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {currentUser?.role === 'SUPER_ADMIN' ? tenant.phoneNumber || 'No registrado' : '***@***.***'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        (tenant as any).subscriptionPlan === 'PROFESSIONAL' ? 'bg-purple-100 text-purple-800' :
                        (tenant as any).subscriptionPlan === 'BUSINESS' ? 'bg-blue-100 text-blue-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {(tenant as any).subscriptionPlan || 'BASIC'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        tenant.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {tenant.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(tenant.createdAt).toLocaleDateString('es-HN')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => window.open(`mailto:${tenant.businessEmail}`, '_blank')}
                          className="text-blue-600 hover:text-blue-800 text-xs"
                          title="Enviar email"
                        >
                          ✉️
                        </button>
                        <button
                          onClick={() => window.open(`tel:${tenant.phoneNumber || ''}`, '_blank')}
                          className="text-green-600 hover:text-green-800 text-xs"
                          title="Llamar"
                          disabled={!tenant.phoneNumber}
                        >
                          📞
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="text-xs text-gray-500">
                        {new Date(tenant.createdAt).toLocaleDateString('es-HN')}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <div className="flex space-x-1">
                        <button
                          onClick={() => {/* TODO: Implementar función para ver usuarios del tenant */}}
                          className="text-indigo-600 hover:text-indigo-800 text-xs"
                          title="Ver usuarios"
                        >
                          👥
                        </button>
                        <button
                          onClick={() => {/* TODO: Implementar función para editar tenant */}}
                          className="text-yellow-600 hover:text-yellow-800 text-xs"
                          title="Editar tenant"
                        >
                          ✏️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Users Section */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Usuarios {currentUser?.role === 'SUPER_ADMIN' && '(Todos los Tenants)'}
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Usuario
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rol
                </th>
                {currentUser?.role === 'SUPER_ADMIN' && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                )}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Estado
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {user.firstName && user.lastName 
                        ? `${user.firstName} ${user.lastName}`
                        : 'Sin nombre'
                      }
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{user.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getRoleBadgeColor(user.role)}`}>
                      {getRoleLabel(user.role)}
                    </span>
                  </td>
                  {currentUser?.role === 'SUPER_ADMIN' && (
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {user.tenant?.businessName || 'Sin empresa'}
                      </div>
                    </td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.isActive 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.isActive ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      {currentUser?.role === 'SUPER_ADMIN' && user.role !== 'SUPER_ADMIN' && (
                        <select
                          value={user.role}
                          onChange={(e) => updateUserRole(user.id, e.target.value)}
                          className="text-sm border-gray-300 rounded-md"
                        >
                          <option value="ADMIN">Administrador</option>
                          <option value="MANAGER">Gerente</option>
                          <option value="USER">Usuario</option>
                          <option value="VIEWER">Lector</option>
                        </select>
                      )}
                      
                      <button
                        onClick={() => toggleUserStatus(user.id, !user.isActive)}
                        className={`px-3 py-1 text-xs rounded ${
                          user.isActive
                            ? 'bg-red-100 text-red-800 hover:bg-red-200'
                            : 'bg-green-100 text-green-800 hover:bg-green-200'
                        }`}
                      >
                        {user.isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
