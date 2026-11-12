'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

interface User {
  id: string
  email: string
  firstName?: string
  lastName?: string
  role: string
  isActive: boolean
  tenantId?: string
  createdAt: string
}

interface Tenant {
  id: string
  businessName: string
  businessRTN: string
  businessEmail: string
  isActive: boolean
  createdAt: string
}

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  tenants: Tenant[]
  currentUserRole: string
}

export default function CreateUserModal({ isOpen, onClose, onSuccess, tenants, currentUserRole }: CreateUserModalProps) {
  const [formData, setFormData] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'USER',
    tenantId: '',
    password: '',
    isActive: true
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      setLoading(true)
      setError(null)

      // Create auth user first
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            first_name: formData.firstName,
            last_name: formData.lastName
          }
        }
      })

      if (authError) throw authError

      if (!authData.user) throw new Error('Error creando usuario de autenticación')

      // Create user record
      const userData = {
        email: formData.email,
        firstName: formData.firstName || null,
        lastName: formData.lastName || null,
        role: formData.role,
        tenantId: formData.tenantId || null,
        isActive: formData.isActive,
        authId: authData.user.id
      }

      const { error: userError } = await supabase
        .from('users')
        .insert(userData)

      if (userError) {
        // Rollback auth creation
        await supabase.auth.admin.deleteUser(authData.user.id)
        throw userError
      }

      onSuccess()
      onClose()
      setFormData({
        email: '',
        firstName: '',
        lastName: '',
        role: 'USER',
        tenantId: '',
        password: '',
        isActive: true
      })
    } catch (err: any) {
      setError(err.message || 'Error creando usuario')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }))
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
      <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
        <div className="mt-3">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">
              Crear Nuevo Usuario
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              ×
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Email *
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Nombre
              </label>
              <input
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Apellido
              </label>
              <input
                type="text"
                name="lastName"
                value={formData.lastName}
                onChange={handleChange}
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Contraseña *
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Rol *
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                required
                className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
              >
                <option value="USER">Usuario</option>
                <option value="VIEWER">Lector</option>
                <option value="MANAGER">Gerente</option>
                {currentUserRole === 'SUPER_ADMIN' && (
                  <option value="ADMIN">Administrador</option>
                )}
              </select>
            </div>

            {currentUserRole === 'SUPER_ADMIN' && (
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Empresa (opcional - si no se asigna, será Super Admin)
                </label>
                <select
                  name="tenantId"
                  value={formData.tenantId}
                  onChange={handleChange}
                  className="mt-1 block w-full border-gray-300 rounded-md shadow-sm"
                >
                  <option value="">Sin empresa (Super Admin)</option>
                  {tenants
                    .filter(tenant => tenant.isActive)
                    .map((tenant) => (
                      <option key={tenant.id} value={tenant.id}>
                        {tenant.businessName}
                      </option>
                    ))}
                </select>
              </div>
            )}

            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                className="h-4 w-4 text-cyan-600 border-gray-300 rounded"
              />
              <label className="ml-2 block text-sm text-gray-900">
                Usuario activo
              </label>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded disabled:opacity-50"
              >
                {loading ? 'Creando...' : 'Crear Usuario'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
