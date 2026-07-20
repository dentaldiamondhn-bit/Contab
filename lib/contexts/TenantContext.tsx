"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth, useUser } from '@clerk/nextjs';
import { toast } from 'sonner';

interface Tenant {
  id: string;
  businessName: string;
  tenantCode: string;
  businessEmail: string;
  businessRTN: string;
  phoneNumber: string;
  businessAddress: string;
  industry?: string;
  maxUsers?: number;
  isActive?: boolean; // Campo para el estado activo/inactivo del tenant
}

interface TenantContextType {
  currentTenant: Tenant | null;
  setTenant: (tenant: Tenant) => void;
  tenants: Tenant[];
  loading: boolean;
  refreshTenantData: () => Promise<void>;
  isSuperAdmin: boolean;
  isImpersonating: boolean; // Añadir estado de impersonación
  exitImpersonation: () => void;
}

const IMPERSONATION_COOKIE_NAME = 'impersonated_tenant_id';
const IMPERSONATION_DURATION = 1800; // 30 minutos en segundos

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
  initialTenants?: Tenant[];
}

export function TenantProvider({ children, initialTenants = [] }: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]); // Start empty, load from database
  const [loading, setLoading] = useState(true);
  const [hasCheckedInitialAdminState, setHasCheckedInitialAdminState] = useState(false);
  const [isImpersonating, setIsImpersonating] = useState(false); // Nuevo estado para la impersonación
  const { userId, isLoaded: authLoaded } = useAuth();
  const { user } = useUser();
  const router = useRouter();
  const pathname = usePathname();

  const isSuperAdmin = ((user?.publicMetadata?.role as string) || "").toUpperCase() === 'SUPER_ADMIN' || 
  user?.primaryEmailAddress?.emailAddress === 'sucachi.123@gmail.com';

  // Helper para centralizar la lógica de cookies de impersonación
  const checkAndSetImpersonationCookie = (tenantId: string) => {
    if (!user) return false;
    
    const isSystemPath = pathname.startsWith('/admin') || pathname.startsWith('/auth');

    if (isSuperAdmin && !isSystemPath && pathname !== '/') {
      document.cookie = `${IMPERSONATION_COOKIE_NAME}=${tenantId}; path=/; max-age=${IMPERSONATION_DURATION}; SameSite=Lax`;
      setIsImpersonating(true); // Actualizar estado
      return true;
    }
    setIsImpersonating(false); // Asegurarse de que sea falso si no hay impersonación
    return false;
  };

  // Recuperar tenant guardado al iniciar
  useEffect(() => {
    if (!authLoaded || hasCheckedInitialAdminState) return;

    const savedTenant = localStorage.getItem('selected_tenant');
    
    if (isSuperAdmin) {
      // REQUERIMIENTO: Al inicio, el modo cliente debe estar desactivado para Super Admin.
      // Limpiamos el tenant seleccionado y la cookie para forzar el Modo Sistema por defecto.
      setCurrentTenant(null);
      document.cookie = `${IMPERSONATION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
      setIsImpersonating(false); // Actualizar estado
      console.log('TenantContext - Super Admin iniciado en Modo Sistema (Vista de cliente desactivada)');
      setHasCheckedInitialAdminState(true);
    } else if (savedTenant) {
      try {
        const tenant = JSON.parse(savedTenant);
        setCurrentTenant(tenant);
        // Verificar si hay una cookie de impersonación activa al cargar para no-Super Admins
        setIsImpersonating(document.cookie.includes(IMPERSONATION_COOKIE_NAME));
      } catch (e) {
        console.error("Error parsing saved tenant", e);
      }
    }
    
    if (!isSuperAdmin) setHasCheckedInitialAdminState(true);
  }, [authLoaded, user, hasCheckedInitialAdminState, isSuperAdmin]);

  // Load tenants from database on mount
  useEffect(() => {
    const loadTenantsFromDatabase = async () => {
      // Solo cargar si el usuario ya está autenticado
      if (!userId) {
        setLoading(false);
        return;
      }
      
      // Si los tenants ya están cargados y hay un tenant actual, no es necesario volver a buscar
      // a menos que sea Super Admin (para ver todos los tenants) o se esté refrescando explícitamente.
      if (tenants.length > 0 && currentTenant && !isSuperAdmin) {
        setLoading(false);
        return;
      }

      try {
        const response = await fetch('/api/tenants-api');
        
        if (!response.ok) {
          if (response.status === 401) return; // Ignorar si no está autorizado aún
          console.error('TenantContext - API response not ok:', response.status, response.statusText);
          throw new Error('Failed to load tenants from database');
        }
        
        const databaseTenants = await response.json();
        setTenants(databaseTenants);
        
        // Auto-select first tenant if no current tenant is set
        const isSystemPath = pathname.startsWith('/admin');
        console.log('TenantContext - Loaded tenants from database:', databaseTenants.length);
        console.log('TenantContext - Tenant data:', JSON.stringify(databaseTenants, null, 2));

        if (databaseTenants.length > 0 && !currentTenant) {
          // Evitar auto-selección para Super Admins (deben estar en Modo Sistema por defecto)
          if (isSuperAdmin) {
            console.log('TenantContext - Super Admin en Modo Sistema, omitiendo auto-selección');
            return;
          }

          const firstTenant = databaseTenants[0];
          setCurrentTenant(firstTenant); 
          
          // Persistir inmediatamente para evitar pérdida en el siguiente ciclo
          localStorage.setItem('selected_tenant', JSON.stringify(firstTenant));
          localStorage.setItem('tenant_id', firstTenant.id);

          // Si es Super Admin y no está en rutas de administración, debemos asegurar la cookie
          checkAndSetImpersonationCookie(firstTenant.id);
          console.log('TenantContext - Auto-selected tenant from database:', firstTenant.businessName);
          console.log('TenantContext - Set tenant to:', JSON.stringify(firstTenant, null, 2));
        } else {
          console.log('TenantContext - No auto-selection needed. Database tenants:', databaseTenants.length, 'Current tenant exists:', !!currentTenant);
          // Si ya hay un tenant actual, asegurar que el estado de impersonación sea correcto
          setIsImpersonating(isSuperAdmin && !!currentTenant && document.cookie.includes(IMPERSONATION_COOKIE_NAME));
        }
        
      } catch (error) {
        console.error('TenantContext - Error loading tenants from database:', error);
        // Fallback to initial tenants if database fails
        if (initialTenants && initialTenants.length > 0) {
          setTenants(initialTenants);
          if (!currentTenant) {
            setCurrentTenant(initialTenants[0]);
            console.log('TenantContext - Fallback to initial tenant:', initialTenants[0].businessName);
            // Verificar estado de impersonación para el tenant de fallback
            setIsImpersonating(isSuperAdmin && !!initialTenants[0] && document.cookie.includes(IMPERSONATION_COOKIE_NAME));
          }
        }
      } finally {
        setLoading(false);
      }
    };

    if (authLoaded) {
      loadTenantsFromDatabase();
    }
  }, [authLoaded, userId, isSuperAdmin, pathname]); // Dependencias ajustadas

// Efecto para actualizar el estado de isImpersonating cuando cambian isSuperAdmin o currentTenant
   useEffect(() => {
     // Super Admin solo está impersonando si tiene currentTenant Y cookie de impersonación
     if (isSuperAdmin && currentTenant) {
       setIsImpersonating(document.cookie.includes(IMPERSONATION_COOKIE_NAME));
     } else {
       setIsImpersonating(false);
     }
   }, [isSuperAdmin, currentTenant]);

  const setTenant = (tenant: Tenant) => {
    setLoading(true);
    try {
      setCurrentTenant(tenant);

      // ESENCIAL: Persistir para que tenant-client-final.ts pueda leerlo
      localStorage.setItem('selected_tenant', JSON.stringify(tenant));
      localStorage.setItem('tenant_id', tenant.id);
      setIsImpersonating(false); // Reset impersonating state initially

      // Lógica de redirección para Super Admin al seleccionar empresa
      if (isSuperAdmin) {
        // Establecer la cookie de impersonación (acción explícita del usuario)
        document.cookie = `${IMPERSONATION_COOKIE_NAME}=${tenant.id}; path=/; max-age=${IMPERSONATION_DURATION}; SameSite=Lax`;
        console.log('TenantContext - Super Admin impersonating:', tenant.businessName);

        // Mostrar aviso de recarga necesaria
        toast.info(`Vista de cliente: ${tenant.businessName}`, {
          description: "Para sincronizar todos los datos del servidor, se recomienda recargar la página.",
          action: {
            label: "Recargar ahora",
            onClick: () => window.location.reload()
          },
          duration: 10000, // 10 segundos para dar tiempo a leer
        });

        // Navegar a /dashboard sin recargar completamente la página.
        // El sidebar se actualizará visualmente, pero el contenido de los Server Components
        // en el dashboard NO se actualizará hasta una recarga manual o una navegación completa,
        // ya que el header x-tenant-id solo se establece en el middleware en una petición completa.
        router.push('/dashboard'); 
        return;
      }
      setIsImpersonating(false); // Asegurarse de que sea falso para no-Super Admins
      console.log('TenantContext - Persisted tenant:', tenant.businessName);
    } catch (error) {
      console.error('Error setting tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  // Function to refresh tenant data from database
  const refreshTenantData = async () => {
    try {
      console.log('TenantContext - Refreshing tenant data from database...');
      const response = await fetch('/api/tenants-api');
      
      if (!response.ok) {
        throw new Error('Failed to refresh tenant data');
      }
      
      const updatedTenants = await response.json();
      console.log('TenantContext - Refreshed tenants:', updatedTenants.length);
      
      setTenants(updatedTenants);
      
      // Update current tenant if it exists in the refreshed data
      if (currentTenant) {
        const updatedCurrentTenant = updatedTenants.find((t: Tenant) => t.id === currentTenant.id);
        if (updatedCurrentTenant) {
          setCurrentTenant(updatedCurrentTenant);
          console.log('TenantContext - Updated current tenant with fresh data:', updatedCurrentTenant.businessName);
        }
      }
    } catch (error) {
      console.error('TenantContext - Error refreshing tenant data:', error);
    }
  };

  const exitImpersonation = () => {
    if (typeof window !== 'undefined') {
      // 1. Limpiar rastro de cookies y persistencia local
      document.cookie = `${IMPERSONATION_COOKIE_NAME}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 UTC;`;
      localStorage.removeItem('selected_tenant');
      localStorage.removeItem('tenant_id');
      
      // 2. Forzar una recarga completa hacia el panel de administración.
      // Evitamos actualizar estados de React aquí para que la página actual no se rompa 
      // intentando renderizarse sin tenant antes de que ocurra la navegación.
      window.location.href = '/admin/tenants';
    }
  };

  const value: TenantContextType = {
    currentTenant,
    setTenant,
    tenants,
    loading,
    refreshTenantData,
    isSuperAdmin,
    isImpersonating,
    exitImpersonation
  };

  return (
    <TenantContext.Provider value={value}>
      {children}
    </TenantContext.Provider>
  );
}

export const useTenant = () => {
  const context = useContext(TenantContext);
  if (context === undefined) {
    throw new Error('useTenant debe usarse dentro de TenantProvider');
  }
  return context;
};
