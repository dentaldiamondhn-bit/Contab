"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import InvoiceTemplateManager from "@/components/admin/InvoiceTemplateManager";
import InvoiceImage from "@/components/billing/InvoiceImage";
import { Eye, Download, Trash2 } from "lucide-react";

interface User {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  password?: string; // Campo temporal para edición
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
}

export default function TenantDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const tenantId = params.id as string;
  
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showUserModal, setShowUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showInvoiceModal, setShowInvoiceModal] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Payment | null>(null);
  const [showModuleModal, setShowModuleModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'billing' | 'templates' | 'plans' | 'modules'>('overview');
  const [showInvoiceImage, setShowInvoiceImage] = useState(false);
  const [newUser, setNewUser] = useState({
    email: '',
    firstName: '',
    lastName: '',
    role: 'USER',
    password: ''
  });

  // Módulos disponibles en el sistema
  const availableModules = [
    { id: 'accounting', name: 'Contabilidad', icon: '📊', description: 'Gestión contable completa' },
    { id: 'billing', name: 'Facturación', icon: '🧾', description: 'Facturación electrónica' },
    { id: 'reports', name: 'Reportes', icon: '📈', description: 'Reportes y análisis' },
    { id: 'inventory', name: 'Inventario', icon: '📦', description: 'Control de inventario' },
    { id: 'payroll', name: 'Nómina', icon: '💰', description: 'Gestión de nómina' },
    { id: 'api', name: 'API Access', icon: '🔌', description: 'Acceso a API' },
    { id: 'support', name: 'Soporte 24/7', icon: '🎧', description: 'Soporte técnico continuo' },
    { id: 'customization', name: 'Personalización', icon: '⚙️', description: 'Personalización del sistema' }
  ];

  // Transformar planes de suscripción a items de factura
  const transformPlansToInvoiceItems = (plans: any[]) => {
    const planPrices: Record<string, number> = {
      'BASICO': 500,
      'PREMIUM': 1000,
      'ENTERPRISE': 2000,
      'STARTER': 200,
      'GROWTH': 750
    };

    const planDescriptions: Record<string, string> = {
      'BASICO': 'Plan básico de contabilidad con facturación electrónica y reportes básicos',
      'PREMIUM': 'Plan premium con contabilidad completa, nómina, inventario y reportes avanzados',
      'ENTERPRISE': 'Plan enterprise con todos los módulos, soporte prioritario y personalización',
      'STARTER': 'Plan inicial para pequeñas empresas con funcionalidades básicas',
      'GROWTH': 'Plan para empresas en crecimiento con funcionalidades intermedias'
    };

    return plans.map((plan: any, index: number) => {
      const planCode = typeof plan === 'string' ? plan : plan.code;
      const quantity = typeof plan === 'string' ? 1 : (plan.quantity || 1);
      const unitPrice = planPrices[planCode] || 500;
      const total = unitPrice * quantity;
      const taxRate = 0.15; // 15% ISV
      const taxAmount = total * taxRate;
      const subtotal = total - taxAmount;

      return {
        id: `plan-${index}`,
        name: `Plan ${planCode}`,
        description: planDescriptions[planCode] || 'Servicios de contabilidad',
        quantity: quantity,
        unitPrice: unitPrice,
        subtotal: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        total: total
      };
    });
  };

  // Manejar el parámetro tab de la URL
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab && ['overview', 'users', 'billing', 'templates', 'plans', 'modules'].includes(tab as any)) {
      setActiveTab(tab as any);
    }
  }, [searchParams]);

  // Recargar datos cuando cambia a la pestaña de planes
  useEffect(() => {
    if (activeTab === 'plans') {
      fetchTenantDetails();
    }
  }, [activeTab]);

  useEffect(() => {
    fetchTenantDetails();
    fetchPaymentHistory();
  }, [tenantId]);

  // Funciones para gestión de módulos
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
      console.log('📊 fetchTenantDetails - Módulos en datos:', data.modules);
      console.log('📊 fetchTenantDetails - Tenant actual antes de setTenant:', tenant?.modules);
      
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

  const handleCreateUser = async () => {
    try {
      console.log('Enviando datos de usuario:', newUser);
      const response = await fetch(`/api/admin/tenants/${tenantId}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      console.log('Response status:', response.status);
      const data = await response.json();
      console.log('Response data:', data);

      if (response.ok) {
        setShowUserModal(false);
        setNewUser({ email: '', firstName: '', lastName: '', role: 'USER', password: '' });
        fetchTenantDetails(); // Recargar para mostrar el nuevo usuario
      } else {
        setError(data.error || data.details || 'Error al crear usuario');
      }
    } catch (err: any) {
      console.error('Error en handleCreateUser:', err);
      setError(`Error de conexión: ${err.message}`);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar al usuario ${userEmail}? Esta acción también eliminará el usuario de Clerk.`)) {
      return;
    }

    try {
      const response = await fetch(`/api/admin/tenants/${tenantId}/users/${userId}?userId=${userId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchTenantDetails(); // Recargar para mostrar los usuarios actualizados
      } else {
        const data = await response.json();
        setError(data.error || 'Error al eliminar usuario');
      }
    } catch (err) {
      setError('Error de conexión al eliminar usuario');
    }
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowEditUserModal(true);
  };

  const handleTogglePlan = async (planCode: string, isActive: boolean) => {
    try {
      // Obtener planes actuales
      const currentPlans = Array.isArray(tenant?.subscriptionPlans) ? tenant.subscriptionPlans : [];
      
      // Buscar si el plan ya existe
      const existingPlanIndex = currentPlans.findIndex((p: any) => p.code === planCode);
      
      let newPlans;
      if (existingPlanIndex >= 0) {
        // Si el plan existe, eliminarlo
        newPlans = currentPlans.filter((p: any) => p.code !== planCode);
      } else {
        // Si no existe, agregarlo con cantidad 1
        newPlans = [...currentPlans, { code: planCode, quantity: 1 }];
      }
      
      console.log('Toggle plan:', planCode, 'Nuevo estado:', !isActive);
      
      // Calcular el costo total mensual basado en los planes seleccionados
      const calculateMonthlyCost = () => {
        // Aquí deberías obtener los datos de los planes desde una API o configuración
        // Por ahora, usar valores de ejemplo
        const planPrices: Record<string, number> = {
          'BASICO': 500,
          'PREMIUM': 1000,
          'ENTERPRISE': 2000
        };
        
        return newPlans.reduce((total, plan: any) => {
          return total + (planPrices[plan.code] || 0) * (plan.quantity || 1);
        }, 0);
      };
      
      const calculatedMonthlyCost = calculateMonthlyCost();
      
      // Actualizar en la base de datos
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionPlans: JSON.stringify(newPlans),
          monthlyCost: calculatedMonthlyCost
        }),
      });
      
      if (response.ok) {
        console.log('✅ Plan actualizado exitosamente');
        // Recargar datos del tenant para reflejar cambios
        fetchTenantDetails();
      } else {
        const data = await response.json();
        console.error('❌ Error al actualizar plan:', data.error);
        alert(`Error al ${isActive ? 'desactivar' : 'activar'} plan: ${data.error || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error en handleTogglePlan:', err);
      alert('Error de conexión al actualizar plan');
    }
  };

  const handleToggleModule = async (moduleCode: string, isActive: boolean) => {
    try {
      const newModules = isActive 
        ? tenant?.modules?.filter((m: string) => m !== moduleCode) || []
        : [...(tenant?.modules || []), moduleCode];
      
      console.log('Toggle módulo:', moduleCode, 'Nuevo estado:', !isActive);
      console.log('📊 handleToggleModule - Módulos actuales:', tenant?.modules);
      console.log('📊 handleToggleModule - Nuevos módulos:', newModules);
      
      // Actualizar en la base de datos
      const response = await fetch(`/api/admin/tenants/${tenantId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          modules: newModules.join(',')
        }),
      });
      
      if (response.ok) {
        console.log('✅ Módulo actualizado exitosamente');
        // Recargar datos del tenant para reflejar cambios
        await fetchTenantDetails();
        // Forzar actualización del estado
        setTimeout(() => {
          console.log('🔄 Forzando recarga de datos...');
          fetchTenantDetails();
        }, 100);
      } else {
        const data = await response.json();
        console.error('❌ Error al actualizar módulo:', data.error);
        alert(`Error al ${isActive ? 'desactivar' : 'activar'} módulo: ${data.error || 'Error desconocido'}`);
      }
    } catch (err) {
      console.error('Error en handleToggleModule:', err);
      alert('Error de conexión al actualizar módulo');
    }
  };

  const handleUpdateUser = async () => {
    if (!editingUser) return;

    console.log('Actualizando usuario:', editingUser);

    try {
      const updateData: any = {
        firstName: editingUser.firstName,
        lastName: editingUser.lastName,
        role: editingUser.role,
        isActive: editingUser.isActive
      };

      // Agregar contraseña solo si se proporciona
      if (editingUser.password && editingUser.password.trim() !== '') {
        updateData.password = editingUser.password;
      }

      console.log('Datos a enviar:', updateData);

      const response = await fetch(`/api/admin/tenants/${tenantId}/users/${editingUser.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updateData)
      });

      console.log('Respuesta del servidor:', response.status);

      if (response.ok) {
        setShowEditUserModal(false);
        setEditingUser(null);
        fetchTenantDetails(); // Recargar para mostrar los usuarios actualizados
      } else {
        const data = await response.json();
        console.error('Error del servidor:', data);
        setError(data.error || 'Error al actualizar usuario');
      }
    } catch (err) {
      console.error('Error en handleUpdateUser:', err);
      setError('Error de conexión al actualizar usuario');
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
      case 'ACTIVE':
        return 'bg-green-100 text-green-800';
      case 'PAID':
        return 'bg-blue-100 text-blue-800';
      case 'CANCELLED':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewInvoice = (invoice: Payment) => {
    setSelectedInvoice(invoice);
    setShowInvoiceImage(true);
  };

  const handleCloseInvoiceImage = () => {
    setShowInvoiceImage(false);
    setSelectedInvoice(null);
  };

  const handleDeleteInvoice = async (invoiceId: string) => {
    if (!confirm('¿Está seguro de que desea eliminar esta factura? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      console.log('🗑️ Eliminando factura:', invoiceId);
      
      const response = await fetch('/api/admin/billing/invoices', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Factura eliminada:', result);
        
        // Recargar la lista de facturas
        await fetchPaymentHistory();
        
        // Mostrar mensaje de éxito
        setError('Factura eliminada exitosamente');
        setTimeout(() => setError(''), 3000);
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al eliminar la factura');
      }
    } catch (err: any) {
      console.error('❌ Error eliminando factura:', err);
      setError(err.message || 'Error al eliminar la factura');
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

  console.log('🔍 Admin Page - Rendering page for tenant:', tenant?.businessName);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex-1">
                {tenant.businessRTN && (
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-1 text-xs border border-gray-300 rounded">
                    RTN: {tenant.businessRTN}
                  </span>
                  <span className="px-2 py-1 text-xs bg-gray-100 rounded">
                    Código: {tenant.tenantCode}
                  </span>
                  <span className="px-2 py-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded">
                    Admin Activo
                  </span>
                </div>
              )}
            </div>
            <div className="flex space-x-3">
              <button
                onClick={() => router.push("/admin/tenants")}
                className="px-4 py-2 text-blue-600 hover:text-blue-800 border border-blue-300 rounded-lg hover:bg-blue-50"
              >
                ← Volver a Tenants
              </button>
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
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Resumen
              </button>
              <button
                onClick={() => setActiveTab('users')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'users'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Usuarios ({tenant.users.length})
              </button>
              <button
                onClick={() => setActiveTab('billing')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'billing'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Facturación
              </button>
              <button
                onClick={() => setActiveTab('plans')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'plans'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Planes
              </button>
              <button
                onClick={() => setActiveTab('modules')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'modules'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Módulos ({tenant?.modules?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab('templates')}
                className={`py-4 px-6 border-b-2 font-medium text-sm ${
                  activeTab === 'templates'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Templates
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
        </div>
        )}
        
        {activeTab === 'users' && (
          <div className="bg-white rounded-lg shadow p-6">
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
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
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
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      {user.email === 'sucachi.123@gmail.com' && user.role === 'SUPER_ADMIN' ? (
                        <span className="px-3 py-1 rounded bg-gray-100 text-gray-500 text-xs">
                          🔒 Protegido
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleEditUser(user)}
                            className="px-3 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors"
                          >
                            ✏️ Editar
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id, user.email)}
                            className="px-3 py-1 rounded bg-red-100 text-red-700 hover:bg-red-200 transition-colors"
                          >
                            🗑️ Eliminar
                          </button>
                        </>
                      )}
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
                <h2 className="text-xl font-semibold text-gray-900">Generar Factura</h2>
                <button
                  onClick={() => router.push(`/admin/billing/generate-invoice?tenantId=${tenant.id}`)}
                  className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  Generar Nueva Factura
                </button>
              </div>
              <p className="text-gray-600">
                Usa el generador de facturas para crear facturas legales con CAI válido.
              </p>
            </div>

            {/* Historial de Facturas */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold text-gray-900">Historial de Facturas</h2>
                <button
                  onClick={() => {
                    console.log('🔄 Recargando facturas manualmente...');
                    fetchPaymentHistory();
                  }}
                  className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  Recargar
                </button>
              </div>
              
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-500 mt-2">Cargando facturas...</p>
                </div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay facturas generadas</p>
                  <button
                    onClick={() => router.push(`/admin/billing/generate-invoice?tenantId=${tenant.id}`)}
                    className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                  >
                    Generar Primera Factura
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Número de Factura
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Fecha
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Cliente
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          RTN
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Total
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Estado
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Acciones
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {payments.map((payment) => (
                        <tr key={payment.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {payment.invoiceNumber}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(payment.invoiceDate).toLocaleDateString('es-HN')}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.customerName}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {payment.customerRTN}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            L {payment.total.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getPaymentStatusColor(payment.status)}`}>
                              {payment.status === 'ACTIVE' ? 'Activa' : payment.status === 'PAID' ? 'Pagada' : 'Cancelada'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleViewInvoice(payment)}
                              className="text-blue-600 hover:text-blue-900 mr-2"
                            >
                              <Eye className="h-4 w-4 inline mr-1" />
                              Ver
                            </button>
                            <button
                              onClick={() => handleDeleteInvoice(payment.id)}
                              className="text-red-600 hover:text-red-900 mr-2"
                            >
                              <Trash2 className="h-4 w-4 inline mr-1" />
                              Eliminar
                            </button>
                            <button
                              onClick={() => {
                                console.log('Descargar factura:', payment.id);
                                // Aquí podrías agregar funcionalidad de descarga
                                alert('Función de descarga en desarrollo');
                                // handleViewInvoice(payment); // Temporalmente usa la misma función
                                handleViewInvoice(payment);
                              }}
                              className="text-green-600 hover:text-green-900"
                            >
                              <Download className="h-4 w-4 inline mr-1" />
                              Descargar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
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
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
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
        
        {activeTab === 'templates' && (
          <InvoiceTemplateManager tenantId={tenantId} />
        )}

        {activeTab === 'plans' && (
          <div className="space-y-6">
            {/* Gestión de Planes */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Planes de Suscripción</h2>
              
              <div className="space-y-4">
                {tenant?.subscriptionPlans?.map((plan: any, index: number) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h3 className="text-lg font-medium text-gray-900 mb-2">{plan.code}</h3>
                        <div className="text-sm text-gray-600">
                          <p>Plan: {plan.code}</p>
                          <p>Cantidad: {plan.quantity}</p>
                          <p>Estado: <span className="text-green-600 font-medium">Activo</span></p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <button className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
                          Activar
                        </button>
                        <button className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm">
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
                
                <button
                  onClick={() => {
                    // Redirigir a la página de edición del tenant
                    router.push(`/admin/tenants/${tenantId}/edit`);
                  }}
                  className="w-full mt-4 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
                >
                  + Agregar/Editar Planes
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'modules' && (
          <div className="space-y-6">
            {/* Gestión de Módulos */}
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-6">Módulos Activos</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[
                  { code: 'accounting', name: 'Contabilidad', description: 'Gestión contable completa', icon: '📊' },
                  { code: 'billing', name: 'Facturación', description: 'Facturación electrónica', icon: '🧾' },
                  { code: 'reports', name: 'Reportes', description: 'Reportes financieros', icon: '📈' },
                  { code: 'inventory', name: 'Inventario', description: 'Control de inventario', icon: '📦' },
                  { code: 'payroll', name: 'Nómina', description: 'Gestión de nómina', icon: '💰' },
                  { code: 'banking', name: 'Conciliación', description: 'Conciliación bancaria', icon: '🏦' }
                ].map((module) => {
                  const isActive = tenant?.modules?.includes(module.code);
                  return (
                    <div key={module.code} className={`border rounded-lg p-4 ${isActive ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-gray-50'}`}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <span className="text-2xl mr-3">{module.icon}</span>
                          <div>
                            <h3 className="font-medium text-gray-900">{module.name}</h3>
                            <p className="text-sm text-gray-600">{module.description}</p>
                          </div>
                        </div>
                        <div className="flex items-center">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            isActive 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {isActive ? 'Activo' : 'Inactivo'}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleToggleModule(module.code, isActive)}
                        className={`w-full px-3 py-2 rounded-md text-sm font-medium ${
                          isActive 
                            ? 'bg-red-600 text-white hover:bg-red-700' 
                            : 'bg-green-600 text-white hover:bg-green-700'
                        }`}
                      >
                        {isActive ? 'Desactivar' : 'Activar'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

            {/* Modal para ver imagen de factura */}
        {showInvoiceImage && selectedInvoice && (
          <InvoiceImage
            tenant={tenant}
            caiInfo={{
              businessName: 'CONTAB HN',
              rtn: '05011991078006',
              businessAddress: 'Tegucigalpa, Honduras',
              cai: 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
              rangeStart: 1,
              rangeEnd: 50,
              currentNumber: parseInt(String(selectedInvoice.invoiceNumber).split('-').pop() || '1'),
              expiryDate: '2026-12-31T23:59:59.000Z'
            }}
            invoiceItems={transformPlansToInvoiceItems(tenant?.subscriptionPlans || [])}
            invoiceNumber={selectedInvoice.invoiceNumber}
            notes="Servicios profesionales prestados según detalle anterior."
            onClose={handleCloseInvoiceImage}
          />
        )}

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

        {/* Modal para editar usuario */}
        {showEditUserModal && editingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Usuario</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    disabled
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100"
                    placeholder="usuario@ejemplo.com"
                  />
                  <p className="text-xs text-gray-500 mt-1">El email no se puede modificar</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                  <input
                    type="text"
                    value={editingUser.firstName || ''}
                    onChange={(e) => setEditingUser({...editingUser, firstName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Juan"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Apellido</label>
                  <input
                    type="text"
                    value={editingUser.lastName || ''}
                    onChange={(e) => setEditingUser({...editingUser, lastName: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Pérez"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rol</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({...editingUser, role: e.target.value})}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                  <select
                    value={editingUser.isActive ? 'true' : 'false'}
                    onChange={(e) => setEditingUser({...editingUser, isActive: e.target.value === 'true'})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                  >
                    <option value="true">Activo</option>
                    <option value="false">Inactivo</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Contraseña (opcional)</label>
                  <input
                    type="password"
                    value={editingUser.password || ''}
                    onChange={(e) => setEditingUser({...editingUser, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg"
                    placeholder="Dejar en blanco para no cambiar"
                  />
                  <p className="text-xs text-gray-500 mt-1">Si no se especifica, la contraseña actual no se modificará</p>
                </div>
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditUserModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleUpdateUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Actualizar Usuario
                </button>
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
                    <div key={module.id} className="border border-gray-200 rounded-lg p-4 hover:border-blue-500 hover:shadow-md transition-all cursor-pointer"
                         onClick={() => handleAddModule(module.id)}>
                      <div className="flex items-start space-x-3">
                        <div className="text-2xl">{module.icon}</div>
                        <div className="flex-1">
                          <h4 className="font-medium text-gray-900">{module.name}</h4>
                          <p className="text-sm text-gray-600">{module.description}</p>
                        </div>
                        <div className="text-green-600">
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
      </div>
      </div>
    </div>
  );
}
