"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

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
}

interface TenantContextType {
  currentTenant: Tenant | null;
  setTenant: (tenant: Tenant) => void;
  tenants: Tenant[];
  loading: boolean;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

interface TenantProviderProps {
  children: ReactNode;
  initialTenants?: Tenant[];
}

export function TenantProvider({ children, initialTenants = [] }: TenantProviderProps) {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [tenants, setTenants] = useState<Tenant[]>([]); // Start with empty array, force database load
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Al cargar, intentamos recuperar la última empresa del localStorage
  useEffect(() => {
    // No cargar tenant context en páginas de admin (solo admin general, no tenant-admin)
    if (typeof window !== 'undefined') {
      const pathname = window.location.pathname;
      if (pathname?.startsWith('/admin/') && !pathname?.startsWith('/admin/tenants')) {
        console.log('TenantContext - Skipping tenant loading on admin page:', pathname);
        return;
      }
    }

    const saved = localStorage.getItem('selected_tenant');
    if (saved) {
      try {
        const parsedTenant = JSON.parse(saved);
        // Check if saved tenant is Angel Ring - if so, clear it
        if (parsedTenant.businessName === 'Angel Ring' || parsedTenant.id === 'cmofey73w000087izrdfvtlve') {
          console.log('TenantContext - Clearing Angel Ring from localStorage');
          localStorage.removeItem('selected_tenant');
          setCurrentTenant(null);
        } else {
          setCurrentTenant(parsedTenant);
          console.log('TenantContext - Loaded tenant from localStorage:', parsedTenant.businessName);
        }
      } catch (error) {
        console.error('Error parsing saved tenant:', error);
        setCurrentTenant(null); // Don't use fallback, clear it
      }
    } else {
      console.log('TenantContext - No saved tenant found, staying null');
      setCurrentTenant(null); // Explicitly set to null
    }
    // Only run once on mount - no dependencies to prevent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const setTenant = (tenant: Tenant) => {
    setLoading(true);
    try {
      setCurrentTenant(tenant);
      localStorage.setItem('selected_tenant', JSON.stringify(tenant));
      router.refresh(); // Refrescamos para que los Server Components lean el nuevo ID
    } catch (error) {
      console.error('Error setting tenant:', error);
    } finally {
      setLoading(false);
    }
  };

  const value: TenantContextType = {
    currentTenant,
    setTenant,
    tenants,
    loading
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
