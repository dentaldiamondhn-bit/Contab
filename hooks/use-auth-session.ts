'use client';

import { useUser } from "@clerk/nextjs";
import { resolveUserPermissions, UserPermissions } from "@/lib/auth-utils";
import { useMemo } from "react";

export function useAuthSession() {
  const { user, isLoaded } = useUser();

  const permissions = useMemo(() => {
    return resolveUserPermissions(user);
  }, [user]);

  return {
    user,
    isLoaded,
    isLoading: !isLoaded,
    ...permissions,
    displayName: user?.firstName || user?.primaryEmailAddress?.emailAddress?.split('@')[0] || 'Usuario'
  };
}