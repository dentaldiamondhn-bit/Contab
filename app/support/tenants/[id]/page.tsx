"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Eye } from "lucide-react";

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
  invoiceNumber: string;
  invoiceDate: string;
  customerName: string;
  customerRTN: string;
  subtotal: number;
  totalTax: number;
  total: number;
  status: 'ACTIVE' | 'PAID' | 'CANCELLED';
  createdAt: string;
  notes?: string;
  items?: {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
  }[];
}

export default function SupportTenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantId = params.id as string;
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'billing' | 'plans' | 'modules'>('overview');
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [editingPlanIndex, setEditingPlanIndex] = useState<number | null>(null);
  const [newPlan, setNewPlan] = useState({ code: 'BASICO', quantity: 1 });
  const [availablePlans, setAvailablePlans] = useState<any[]>([]);

  // Manejar el parámetro tab de la URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'users', 'billing', 'plans', 'modules'].includes(tab as any)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  useEffect(() => {
    fetchTenantDetails();
    fetchPaymentHistory();
    fetchAvailablePlans();
  }, [tenantId]);

  const fetchTenantDetails = async () => {
    try {
      console.log('🔄 fetchTenantDetails - Iniciando...');
      const response = await fetch(`/api/admin/tenants/${tenantId}`);
      console.log('📡 fetchTenantDetails - Response status:', response.status);
      
      if (!response.ok) {
        throw new Error("Error al cargar el tenant");
      }
      
      const data = await response.json();
      console.log('📦 fetchTenantDetails - Datos recibidos:', data);
      setTenant(data);
      
      console.log('✅ fetchTenantDetails - Tenant actualizado');
    } catch (err) {
      console.error('❌ fetchTenantDetails - Error:', err);
      setError("Error al cargar el tenant");
    } finally {
      setLoading(false);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      console.log('🔄 fetchPaymentHistory - Iniciando para tenantId:', tenantId);
      const response = await fetch(`/api/admin/billing/invoices?tenantId=${tenantId}`);
      console.log('📡 Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('📦 Response data:', data);
        console.log('📊 Invoices recibidos:', data.invoices);
        setPayments(data.invoices || []);
      } else {
        const errorText = await response.text();
        console.log('❌ Error response:', errorText);
      }
    } catch (err) {
      console.error('❌ Error fetching payment history:', err);
    }
  };

  const getNextPaymentDate = () => {
    if (!tenant) return null;
    
    const createdDate = new Date(tenant.createdAt);
    const nextPaymentDate = new Date(createdDate);
    nextPaymentDate.setMonth(nextPaymentDate.getMonth() + 1);
    
    return nextPaymentDate;
  };

  const cleanEmail = (email: string) => {
    if (!email) return '';
    return email.replace(/\+[^@]+@/, '@');
  };

  // Módulos disponibles en el sistema (excluyendo hidden y required)
  const availableModules = [
    { id: 'ACCOUNTING', name: 'Contabilidad Central', icon: '📊', description: 'Libros contables, asientos y transacciones' },
    { id: 'FINANCIAL_STATEMENTS', name: 'Estados Financieros', icon: '📈', description: 'Balance General, Estado de Resultados, Flujo de Efectivo' },
    { id: 'LEGAL_BOOKS', name: 'Libros Legales', icon: '📕', description: 'Libros legales y registros fiscales obligatorios' },
    { id: 'BILLING', name: 'Facturación y Ventas', icon: '🧾', description: 'Facturación, ventas y gestión de clientes' },
    { id: 'INVENTORY', name: 'Inventarios', icon: '📦', description: 'Gestión de inventario y kardex' },
    { id: 'PURCHASES', name: 'Compras y Proveedores', icon: '🛒', description: 'Órdenes de compra, proveedores y gastos' },
    { id: 'FINANCIAL_CONTROL', name: 'Control Financiero', icon: '💰', description: 'Presupuestos, flujos de efectivo y KPIs financieros' },
    { id: 'REPORTS', name: 'Reportes y Análisis', icon: '📊', description: 'Reportes personalizados y análisis de datos' },
    { id: 'SECURITY', name: 'Seguridad y Control', icon: '🔒', description: 'Auditoría, control de acceso y bitácoras' },
    { id: 'TAX_REPORTING', name: 'Reportes Fiscales', icon: '🏛️', description: 'Reportes SAR, ISV, retenciones y declaraciones fiscales' },
    { id: 'TAX_INTEGRATION', name: 'Integración con Impuestos', icon: '🔗', description: 'Integración automática con sistemas fiscales' },
    { id: 'CONTACTS', name: 'Contactos (CRM)', icon: '👥', description: 'Gestión de clientes, proveedores y contactos' },
  ];

  const handleAddModule = async (moduleId: string) => {
    try {
      if (!tenant) return;

      const currentModules = tenant.modules || [];
      if (currentModules.includes(moduleId)) {
        console.log('El módulo ya está asignado');
        return;
      }

      const updatedModules = [...currentModules, moduleId];
      
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modules: updatedModules.join(',')
        }),
      });

      if (response.ok) {
        await fetchTenantDetails();
        setTimeout(() => {
          fetchTenantDetails();
        }, 100);
      }
    } catch (error) {
      console.error('Error adding module:', error);
    }
  };

  const handleRemoveModule = async (moduleId: string) => {
    try {
      if (!tenant) return;

      const currentModules = tenant.modules || [];
      const updatedModules = currentModules.filter((m: string) => m !== moduleId);
      
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modules: updatedModules.join(',')
        }),
      });

      if (response.ok) {
        await fetchTenantDetails();
        setTimeout(() => {
          fetchTenantDetails();
        }, 100);
      }
    } catch (error) {
      console.error('Error removing module:', error);
    }
  };

  const handleUpdatePlan = async (index: number, updatedPlan: any) => {
    try {
      if (!tenant) return;

      const updatedPlans = [...(tenant.subscriptionPlans || [])];
      updatedPlans[index] = updatedPlan;
      
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionplans: JSON.stringify(updatedPlans)
        }),
      });

      if (response.ok) {
        await fetchTenantDetails();
        setEditingPlanIndex(null);
      }
    } catch (error) {
      console.error('Error updating plan:', error);
    }
  };

  const handleAddPlan = async () => {
    try {
      if (!tenant) return;

      const updatedPlans = [...(tenant.subscriptionPlans || []), newPlan];
      
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionplans: JSON.stringify(updatedPlans)
        }),
      });

      if (response.ok) {
        await fetchTenantDetails();
        setShowPlanModal(false);
        setNewPlan({ code: 'BASICO', quantity: 1 });
      }
    } catch (error) {
      console.error('Error adding plan:', error);
    }
  };

  const handleRemovePlan = async (index: number) => {
    try {
      if (!tenant) return;

      const updatedPlans = tenant.subscriptionPlans?.filter((_: any, i: number) => i !== index) || [];
      
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionplans: JSON.stringify(updatedPlans)
        }),
      });

      if (response.ok) {
        await fetchTenantDetails();
      }
    } catch (error) {
      console.error('Error removing plan:', error);
    }
  };

  const fetchAvailablePlans = async () => {
    try {
      const response = await fetch('/api/admin/plans');
      if (response.ok) {
        const data = await response.json();
        const activePlans = data.plans?.filter((plan: any) => plan.isActive) || [];
        setAvailablePlans(activePlans);
        if (activePlans.length > 0) {
          setNewPlan({ code: activePlans[0].code, quantity: 1 });
        }
      }
    } catch (error) {
      console.error('Error fetching available plans:', error);
    }
  };

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAID':
        return 'bg-cyan-100 text-cyan-800';
      case 'CANCELLED':
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
        return 'bg-cyan-100 text-cyan-800';
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600"></div>
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

  console.log('🔍 Support Page - Rendering page for tenant:', tenant?.businessName);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h1 className="text-2xl font-bold text-gray-900">{tenant.businessName}</h1>
              {tenant.businessRTN && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 text-xs border border-gray-300 rounded">
                    RTN: {tenant.businessRTN}
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                    Código: {tenant.tenantCode}
                  </span>
                  <span className="px-2 py-1 text-xs bg-orange-50 text-orange-700 border border-orange-200 rounded">
                    Vista de Soporte (Solo Lectura)
                  </span>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push("/support/tenants")}
                className="px-4 py-2 text-orange-600 hover:text-orange-800 border border-orange-300 rounded-lg hover:bg-orange-50"
              >
                ← Volver a Tenants
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Page Content */}
      <div className="p-8">
        <div className="max-w-6xl mx-auto">

        {/* Pestañas */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'overview'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Usuarios ({tenant.users.length})
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'billing'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Facturación
              </button>
              <button
                onClick={() => setActiveTab('plans')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'plans'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Planes
              </button>
              <button
                onClick={() => setActiveTab('modules')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'modules'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Módulos ({tenant?.modules?.length || 0})
              </button>
            </nav>
          </div>
        </div>

        {/* Contenido según pestaña activa */}
        {activeTab === 'overview' && (
          <div>
            {/* Resumen General */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="p-3 bg-orange-100 rounded-lg">
                <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                    <span key={idx} className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm">
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
        </div>
        )}
        
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Usuarios ({tenant.users.length})</h2>
            <p className="text-sm text-gray-500 mb-4">Vista de solo lectura</p>
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
                      <div className="text-sm text-gray-900">{cleanEmail(user.email)}</div>
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
        )}
        
        {activeTab === 'billing' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Facturación Mensual - ContabHN</h2>
                  <p className="text-sm text-gray-500">Facturas generadas por servicios de ContabHN</p>
                </div>
                <button
                  onClick={() => router.push(`/support/billing/generate-invoice?tenantId=${tenantId}`)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium flex items-center"
                >
                  <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Generar Factura
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Cargando facturas...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay facturas generadas</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {payments.map((payment) => (
                    <div key={payment.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="text-lg font-medium text-gray-900">{payment.invoiceNumber}</h3>
                          <p className="text-sm text-gray-500">
                            {new Date(payment.invoiceDate).toLocaleDateString('es-HN', { month: 'long', year: 'numeric' })}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">L {payment.total?.toFixed(2) || '0.00'}</p>
                          <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(payment.status)}`}>
                            {payment.status === 'ACTIVE' ? 'Pendiente' : payment.status === 'PAID' ? 'Pagada' : 'Cancelada'}
                          </span>
                        </div>
                      </div>
                      
                      <div className="border-t pt-3 mt-3">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Detalle de servicios:</h4>
                        <div className="space-y-1">
                          {payment.items?.map((item: any, idx: number) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-gray-600">{item.description}</span>
                              <span className="text-gray-900">L {item.total?.toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div className="border-t pt-3 mt-3 flex justify-between text-sm">
                        <div>
                          <span className="text-gray-600">Subtotal: </span>
                          <span className="text-gray-900">L {payment.subtotal?.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-gray-600">ISV (15%): </span>
                          <span className="text-gray-900">L {payment.totalTax?.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        
        {activeTab === 'modules' && (
          <div className="space-y-6">
            {/* Gestión de Módulos */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Gestión de Módulos</h2>
                <button
                  onClick={() => setShowModuleModal(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  + Agregar Módulo
                </button>
              </div>
              
              {/* Módulos Actuales */}
              <div className="mb-6">
                <h3 className="text-sm font-medium text-gray-700 mb-3">Módulos Activos ({tenant?.modules?.length || 0})</h3>
                {tenant?.modules && tenant.modules.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {tenant.modules.map((moduleId: string) => {
                      const module = availableModules.find(m => m.id === moduleId);
                      return (
                        <div key={moduleId} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start space-x-3">
                            <div className="text-2xl">{module?.icon || '📦'}</div>
                            <div className="flex-1">
                              <h4 className="font-medium text-gray-900">{module?.name || moduleId}</h4>
                              <p className="text-sm text-gray-600">{module?.description || 'Módulo del sistema'}</p>
                            </div>
                            <button
                              onClick={() => handleRemoveModule(moduleId)}
                              className="px-2 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 text-sm font-medium"
                            >
                              Quitar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <div className="text-4xl mb-2">📦</div>
                    <p>Este tenant no tiene módulos asignados</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'plans' && (
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">Planes de Suscripción</h2>
                <button
                  onClick={() => setShowPlanModal(true)}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
                >
                  + Agregar Plan
                </button>
              </div>
              
              <div className="space-y-4">
                {tenant?.subscriptionPlans?.map((plan: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    {editingPlanIndex === index ? (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                          <select
                            value={plan.code}
                            onChange={(e) => {
                              const updatedPlans = [...tenant.subscriptionPlans];
                              updatedPlans[index] = { ...plan, code: e.target.value };
                              setTenant({ ...tenant, subscriptionPlans: updatedPlans });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                          >
                            {availablePlans.map((availablePlan) => (
                              <option key={availablePlan.code} value={availablePlan.code}>
                                {availablePlan.name}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                          <input
                            type="number"
                            value={plan.quantity}
                            onChange={(e) => {
                              const updatedPlans = [...tenant.subscriptionPlans];
                              updatedPlans[index] = { ...plan, quantity: parseInt(e.target.value) || 1 };
                              setTenant({ ...tenant, subscriptionPlans: updatedPlans });
                            }}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                            min="1"
                          />
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleUpdatePlan(index, plan)}
                            className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            Guardar
                          </button>
                          <button
                            onClick={() => setEditingPlanIndex(null)}
                            className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h3 className="text-lg font-medium text-gray-900 mb-2">
                            {availablePlans.find(p => p.code === plan.code)?.name || plan.code}
                          </h3>
                          <div className="text-sm text-gray-600">
                            <p>Plan: {availablePlans.find(p => p.code === plan.code)?.name || plan.code}</p>
                            <p>Cantidad: {plan.quantity}</p>
                            <p>Estado: <span className="text-green-600 font-medium">Activo</span></p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => setEditingPlanIndex(index)}
                            className="px-3 py-1 bg-cyan-100 text-cyan-700 rounded-md hover:bg-cyan-200 text-sm"
                          >
                            Editar
                          </button>
                          <button
                            onClick={() => handleRemovePlan(index)}
                            className="px-3 py-1 bg-red-100 text-red-700 rounded-md hover:bg-red-200 text-sm"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal para agregar módulos */}
        {showModuleModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Módulos</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {availableModules
                  .filter(module => !tenant?.modules?.includes(module.id))
                  .map((module) => (
                    <div key={module.id} className="border border-gray-200 rounded-lg p-4 hover:border-orange-500 hover:shadow-md transition-all cursor-pointer"
                         onClick={() => handleAddModule(module.id)}>
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">{module.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{module.name}</h4>
                          <p className="text-sm text-gray-600">{module.description}</p>
                        </div>
                        <div className="text-orange-600">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>

              {availableModules.filter(module => !tenant?.modules?.includes(module.id)).length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">✅</div>
                  <p>Este tenant ya tiene todos los módulos disponibles</p>
                </div>
              )}

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowModuleModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal para agregar plan */}
        {showPlanModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Plan</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                  <select
                    value={newPlan.code}
                    onChange={(e) => setNewPlan({ ...newPlan, code: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    {availablePlans.map((availablePlan) => (
                      <option key={availablePlan.code} value={availablePlan.code}>
                        {availablePlan.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Cantidad</label>
                  <input
                    type="number"
                    value={newPlan.quantity}
                    onChange={(e) => setNewPlan({ ...newPlan, quantity: parseInt(e.target.value) || 1 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    min="1"
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPlanModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleAddPlan}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700"
                >
                  Agregar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
}
