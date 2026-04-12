"use client";

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';

interface Tenant {
  id: string;
  businessName: string;
  industry: string;
  businessRTN?: string;
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
  const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  // Al cargar, intentamos recuperar la última empresa del localStorage
  useEffect(() => {
    const saved = localStorage.getItem('selected_tenant');
    if (saved) {
      try {
        const parsedTenant = JSON.parse(saved);
        setCurrentTenant(parsedTenant);
      } catch (error) {
        console.error('Error parsing saved tenant:', error);
      }
    } else if (tenants.length > 0) {
      setCurrentTenant(tenants[0]);
    }
  }, [initialTenants]);

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
