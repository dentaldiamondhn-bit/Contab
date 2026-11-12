'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth, useUser as useClerkUser } from '@clerk/nextjs';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  role: string;
  company: string;
  department: string;
  timezone: string;
  language: string;
  email_notifications: boolean;
  push_notifications: boolean;
  two_factor_enabled: boolean;
  avatar_url: string;
  subscription_plan: string;
  api_access: boolean;
  is_active: boolean;
  email_verified: boolean;
  last_sign_in_at: string;
  created_at: string;
  updated_at: string;
}

interface UserContextType {
  user: UserProfile | null;
  loading: boolean;
  refreshUser: () => Promise<void>;
  updateUser: (userData: Partial<UserProfile>) => void;
  isSignedIn: boolean;
  clerkUserId: string | null;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export function UserProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const { isSignedIn, userId } = useAuth();
  const { user: clerkUser } = useClerkUser();

  const refreshUser = async () => {
    if (!isSignedIn || !clerkUser) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // First try to get from database
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setUser(data.user);
      } else {
        // Fallback: build profile from Clerk user
        const primaryEmail = clerkUser.primaryEmailAddress?.emailAddress || '';
        const role = (clerkUser.publicMetadata?.role as string) || 'USER';
        
        setUser({
          id: userId || '',
          email: primaryEmail,
          first_name: clerkUser.firstName || '',
          last_name: clerkUser.lastName || '',
          phone: '',
          role: role,
          company: '',
          department: '',
          timezone: 'America/Tegucigalpa',
          language: 'es',
          email_notifications: true,
          push_notifications: false,
          two_factor_enabled: false,
          avatar_url: clerkUser.imageUrl || '',
          subscription_plan: 'BASIC',
          api_access: false,
          is_active: true,
          email_verified: clerkUser.primaryEmailAddress?.verification?.status === 'verified',
          last_sign_in_at: clerkUser.lastSignInAt?.toString() || '',
          created_at: clerkUser.createdAt?.toString() || '',
          updated_at: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Error al cargar usuario:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateUser = (userData: Partial<UserProfile>) => {
    if (user) {
      setUser({ ...user, ...userData });
    }
  };

  useEffect(() => {
    refreshUser();
  }, [isSignedIn, clerkUser]);

  return (
    <UserContext.Provider value={{ 
      user, 
      loading, 
      refreshUser, 
      updateUser,
      isSignedIn: isSignedIn || false,
      clerkUserId: userId || null,
    }}>
      {children}
    </UserContext.Provider>
  );
}

export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}
