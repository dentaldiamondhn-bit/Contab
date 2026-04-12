"use client";

import { useTenant } from '../contexts/TenantContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

// Tipos para el hook
interface User {
  id: string;
  email: string;
  role?: 'ADMIN' | 'MANAGER' | 'USER' | 'VIEWER';
}

interface Session {
  user?: User;
}

interface TenantData {
  id: string;
  businessName: string;
  businessRTN?: string;
  industry: string;
  isActive: boolean;
}

const Permissions = {
  ADMIN: ['read', 'write', 'delete', 'manage_users', 'manage_tenants'],
  MANAGER: ['read', 'write', 'delete', 'manage_accounts'],
  USER: ['read', 'write'],
  VIEWER: ['read'],
} as const;

export function useTenantSupabase() {
  const { currentTenant, setTenant } = useTenant();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<Session | null>(null);

  // Simular sesión (reemplazar con tu auth real)
  useEffect(() => {
    // Aquí deberías obtener la sesión real de tu auth system
    // Por ahora, simulamos una sesión para pruebas
    const mockSession: Session = {
      user: {
        id: 'user_001',
        email: 'admin@empresa.com',
        role: 'ADMIN'
      }
    };
    setSession(mockSession);
  }, []);

  // Sincronizar tenant con el usuario autenticado
  useEffect(() => {
    if (session?.user && currentTenant) {
      // El usuario está autenticado y hay un tenant seleccionado
      syncTenantWithSupabase();
    }
  }, [session, currentTenant]);

  // Función para sincronizar tenant con Supabase
  const syncTenantWithSupabase = async () => {
    if (!currentTenant) return;
    
    try {
      setLoading(true);
      
      // Aquí podrías establecer una variable de sesión en Supabase
      // o usar un custom claim para el tenant actual
      
      console.log('Tenant sincronizado:', currentTenant);
      
    } catch (error) {
      console.error('Error sincronizando tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para cambiar de tenant
  const switchTenant = async (tenant: any) => {
    try {
      setLoading(true);
      
      // 1. Actualizar contexto
      setTenant(tenant);
      
      // 2. Guardar en localStorage
      localStorage.setItem('selected_tenant', JSON.stringify(tenant));
      
      // 3. Refrescar la aplicación
      router.refresh();
      
      // 4. Sincronizar con Supabase
      if (session?.user) {
        await syncTenantWithSupabase();
      }
      
    } catch (error) {
      console.error('Error cambiando tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  // Función para obtener datos del tenant actual
  const getCurrentTenantData = () => {
    if (!currentTenant) return null;
    
    return {
      id: currentTenant.id,
      businessName: currentTenant.businessName,
      businessRTN: currentTenant.businessRTN || '', // Si tienes RTN en el tenant
      industry: currentTenant.industry,
      isActive: true
    };
  };

  // Función para verificar permisos del usuario en el tenant actual
  const hasPermission = (permission: string): boolean => {
    if (!session?.user || !currentTenant) return false;
    
    // Lógica de permisos basada en el rol del usuario
    const userRole = session.user.role || 'USER';
    const tenantId = currentTenant.id;
    
    // Ejemplo de lógica de permisos
    if (userRole === 'ADMIN') {
      return Permissions.ADMIN.includes(permission as any);
    } else if (userRole === 'MANAGER') {
      return Permissions.MANAGER.includes(permission as any);
    } else if (userRole === 'USER') {
      return Permissions.USER.includes(permission as any);
    } else if (userRole === 'VIEWER') {
      return Permissions.VIEWER.includes(permission as any);
    }
    
    return false;
  };

  return {
    currentTenant,
    setTenant: switchTenant,
    loading,
    getCurrentTenantData,
    hasPermission,
    syncTenantWithSupabase
  };
}

// Helper para obtener tenant_id para consultas Supabase
export const getTenantFilter = () => {
  const saved = localStorage.getItem('selected_tenant');
  if (!saved) return null;
  
  const tenant = JSON.parse(saved);
  return tenant.id;
};
