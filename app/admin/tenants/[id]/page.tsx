"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
}

interface Tenant {
  id: string;
  businessName: string;
  tenantCode: string;
  businessEmail: string;
  businessRTN: string;
  phoneNumber: string;
  businessAddress: string;
  subscriptionPlans: any[];
  maxUsers: number;
  monthlyCost: number;
  isActive: boolean;
  modules: string[];
  createdAt: string;
  users: User[];
  userCounts: Record<string, number>;
  totalUsers: number;
  activeUsers: number;
}

interface Payment {
  id: string;
  amount: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  dueDate: string;
  paidDate?: string;
  planName: string;
  description: string;
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const tenantId = params.id as string;
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'USER',
    password: ''
  });

  useEffect(() => {
    fetchTenantDetails();
    fetchPaymentHistory();
  }, [tenantId]);

  const fetchTenantDetails = async () => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}`);
      if (!response.ok) {
        throw new Error("Error al cargar el tenant");
      }
      const data = await response.json();
      setTenant(data);
    } catch (err) {
      setError("Error al cargar el tenant");
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const response = await fetch(`/api/admin/billing/invoices?tenantId=${tenantId}`);
      if (response.ok) {
        const data = await response.json();
        setPayments(data.invoices || []);
      }
    } catch (err) {
      console.error('Error fetching payment history:', err);
    }
  };

  const handleCreateUser = async () => {
    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (response.ok) {
        setShowUserModal(false);
        setNewUser({ email: '', firstName: '', lastName: '', role: 'user', password: '' });
        fetchTenantDetails(); // Recargar para mostrar el nuevo usuario
      } else {
        const data = await response.json();
        setError(data.error || 'Error al crear usuario');
      }
    } catch (err) {
      setError('Error de conexión al crear usuario');
    }
  };

  const getNextPaymentDate = () => {
    if (!tenant) return null;
    
    const createdDate = new Date(tenant.createdAt);
    const nextPaymentDate = new Date(createdDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    
    return nextPaymentDate;
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN':
        return 'bg-purple-100 text-purple-800';
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800';
      case 'MANAGER':
        return 'bg-green-100 text-green-800';
      case 'ACCOUNTANT':
        return 'bg-orange-100 text-orange-800';
      case 'VIEWER':
        return 'bg-cyan-100 text-cyan-800';
      case 'USER':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <div className="min-h-screen bg-gray-50 p-8">
        <div className="max-w-4xl mx-auto">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{error || "Tenant no encontrado"}</p>
          </div>
        </div>
      </div>
    );
  }

  const nextPaymentDate = getNextPaymentDate();

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.push("/admin/tenants")}
            className="text-blue-600 hover:text-blue-800 mb-4 inline-flex items-center"
          >
            ← Volver a Tenants
          </button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{tenant.businessName}</h1>
              <p className="text-gray-600 mt-1">Código: {tenant.tenantCode}</p>
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push(`/admin/tenants/${tenant.id}/edit`)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Editar Tenant
              </button>
              <button
                onClick={() => router.push(`/admin/billing/generate-invoice?tenantId=${tenant.id}`)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                Generar Factura
              </button>
            </div>
          </div>
        </div>

        {/* Resumen General */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Usuarios</p>
                <p className="text-2xl font-semibold text-gray-900">{tenant.activeUsers}/{tenant.maxUsers}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Costo Mensual</p>
                <p className="text-2xl font-semibold text-gray-900">L. {tenant.monthlyCost.toLocaleString()}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-purple-100 rounded-lg">
                <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Planes Activos</p>
                <p className="text-2xl font-semibold text-gray-900">{Array.isArray(tenant.subscriptionPlans) ? tenant.subscriptionPlans.length : 0}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className={`p-3 rounded-lg ${tenant.isActive ? 'bg-green-100' : 'bg-red-100'}`}>
                <svg className={`w-6 h-6 ${tenant.isActive ? 'text-green-600' : 'text-red-600'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-4">
                <p className="text-sm text-gray-600">Estado</p>
                <p className="text-2xl font-semibold text-gray-900">{tenant.isActive ? 'Activo' : 'Suspendido'}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Información de Contacto */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Información de Contacto</h2>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Email</p>
                <p className="text-gray-900">{tenant.businessEmail}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Teléfono</p>
                <p className="text-gray-900">{tenant.phoneNumber || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">RTN</p>
                <p className="text-gray-900">{tenant.businessRTN || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Dirección</p>
                <p className="text-gray-900">{tenant.businessAddress || 'No especificado'}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Fecha de Creación</p>
                <p className="text-gray-900">{new Date(tenant.createdAt).toLocaleDateString('es-HN')}</p>
              </div>
              {nextPaymentDate && (
                <div>
                  <p className="text-sm text-gray-600">Próximo Pago</p>
                  <p className="text-gray-900 font-medium">{nextPaymentDate.toLocaleDateString('es-HN')}</p>
                </div>
              )}
            </div>
          </div>

          {/* Planes y Módulos */}
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Planes y Módulos</h2>
            
            <div className="mb-6">
              <h3 className="text-sm font-medium text-gray-700 mb-2">Planes de Suscripción</h3>
              {Array.isArray(tenant.subscriptionPlans) && tenant.subscriptionPlans.length > 0 ? (
                <div className="space-y-2">
                  {tenant.subscriptionPlans.map((plan: any, idx: number) => (
                    <div key={idx} className="flex items-center justify-between bg-gray-50 p-3 rounded">
                      <div>
                        <span className="font-medium">{plan.code}</span>
                        <span className="text-sm text-gray-600 ml-2">x{plan.quantity}</span>
                      </div>
                      <span className="text-sm text-gray-900">
                        L. {(plan.price * plan.quantity).toLocaleString()}/mes
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Sin planes asignados</p>
              )}
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Módulos Activos</h3>
              {tenant.modules.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {tenant.modules.map((module: string, idx: number) => (
                    <span key={idx} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                      {module}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">Sin módulos asignados</p>
              )}
            </div>
          </div>
        </div>

        {/* Usuarios */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Usuarios ({tenant.users.length})</h2>
            <button
              onClick={() => setShowUserModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              + Agregar Usuario
            </button>
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Último Login
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tenant.users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {user.firstName} {user.lastName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{user.email}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${getRoleBadgeColor(user.role)}`}>
                        {user.role}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        user.isActive 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.isActive ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.lastLoginAt 
                        ? new Date(user.lastLoginAt).toLocaleDateString('es-HN')
                        : 'Nunca'
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Historial de Pagos */}
        <div className="bg-white rounded-lg shadow p-6 mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Historial de Pagos</h2>
          {payments.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Vencimiento
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plan
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Monto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha de Pago
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {payments.map((payment) => (
                    <tr key={payment.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {new Date(payment.dueDate).toLocaleDateString('es-HN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {payment.planName}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        L. {payment.amount.toLocaleString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-1 text-xs rounded-full ${getPaymentStatusColor(payment.status)}`}>
                          {payment.status === 'PAID' ? 'Pagado' : 
                           payment.status === 'PENDING' ? 'Pendiente' : 'Vencido'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {payment.paidDate 
                          ? new Date(payment.paidDate).toLocaleDateString('es-HN')
                          : '-'
                        }
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500">No hay registros de pagos</p>
          )}
        </div>

        {/* Modal para crear usuario */}
        {showUserModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Nuevo Usuario</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={newUser.email}
                    onChange={(e) => setNewUser({...newUser, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="usuario@ejemplo.com"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={newUser.firstName}
                    onChange={(e) => setNewUser({...newUser, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={newUser.lastName}
                    onChange={(e) => setNewUser({...newUser, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({...newUser, role: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="USER">Usuario</option>
                    <option value="ADMIN">Administrador</option>
                    <option value="MANAGER">Gerente</option>
                    <option value="VIEWER">Observador</option>
                    <option value="ACCOUNTANT">Contador</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
                  <input
                    type="password"
                    value={newUser.password}
                    onChange={(e) => setNewUser({...newUser, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="••••••••••"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowUserModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreateUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Crear Usuario
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
