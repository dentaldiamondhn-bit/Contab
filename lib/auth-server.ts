import { UserRole } from "@/types/auth";
import { auth, clerkClient } from "@clerk/nextjs/server";

/**
 * Server-side helper to get user role from sessionClaims or Clerk user.
 * Handles the case where sessionClaims.metadata doesn't contain the role.
 * 
 * This file is server-only and must not be imported in client components.
 */
export async function getUserRoleFromAuth(): Promise<UserRole> {
  const { userId, sessionClaims } = await auth();
  
  // Try to get role from sessionClaims first
  const roleFromSession = (sessionClaims?.metadata as any)?.role as string | undefined;
  if (roleFromSession) {
    return roleFromSession.toUpperCase() as UserRole;
  }
  
  // Fallback: get user from Clerk directly
  if (userId) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      
      const roleFromClerk = (user.publicMetadata?.role as string) ||
                           (user.unsafeMetadata?.role as string) ||
                           (user.privateMetadata as any)?.role;
      
      if (roleFromClerk) {
        return roleFromClerk.toUpperCase() as UserRole;
      }
      
      // Check if email is in super admin list
      const email = user.emailAddresses[0]?.emailAddress;
      const superAdminEmails = (process.env.NEXT_PUBLIC_SUPER_ADMIN_EMAILS || "")
        .split(",")
        .map((e) => e.trim().toLowerCase());
      
      if (email && superAdminEmails.includes(email.toLowerCase())) {
        return "SUPER_ADMIN";
      }
    } catch (error) {
      console.error("Error fetching user from Clerk:", error);
    }
  }
  
  return "VIEWER";
}