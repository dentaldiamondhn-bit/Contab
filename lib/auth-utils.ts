import { UserRole } from "@/types/auth";

export interface UserPermissions {
  role: UserRole;
  isSuperAdmin: boolean;
  isSupport: boolean;
  isAdmin: boolean;
  isManager: boolean;
  isStaff: boolean;
}

// The primary super-admin email taken from the env list (first entry).
// Safe to import in both Client and Server modules.
export const SUPER_ADMIN_EMAIL: string =
  (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim())[0] || "";

/**
 * Centralized logic to determine a user's permissions.
 * Pure, synchronous — safe to import in Client Components.
 */
export function resolveUserPermissions(user: any): UserPermissions {
  const fallback: UserPermissions = {
    role: "VIEWER",
    isSuperAdmin: false,
    isSupport: false,
    isAdmin: false,
    isManager: false,
    isStaff: false,
  };

  if (!user) return fallback;

  // Check multiple sources for role metadata (same as in dashboard)
  const rawRole = ((user.publicMetadata?.role as string) || 
                   (user.unsafeMetadata?.role as string) ||
                   ((user as any).privateMetadata?.role as string) || 
                   "").toUpperCase();
  const email = user.primaryEmailAddress?.emailAddress;

  const superAdminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase());

  let role: UserRole = (rawRole as UserRole) || "VIEWER";

  if (
    rawRole === "SUPER_ADMIN" ||
    (email && superAdminEmails.includes(email.toLowerCase()))
  ) {
    role = "SUPER_ADMIN";
  }

  return {
    role,
    isSuperAdmin: role === "SUPER_ADMIN",
    isSupport: role === "SUPPORT",
    isAdmin: role === "ADMIN",
    isManager: role === "MANAGER",
    isStaff: role === "SUPER_ADMIN" || role === "SUPPORT" || role === "ADMIN" || role === "MANAGER",
  };
}
