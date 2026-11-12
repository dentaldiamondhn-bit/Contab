import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { UserProvider } from "@/contexts/UserContext";
import { SidebarProvider } from "./contexts/SidebarContext";
import { TenantProvider } from "@/lib/contexts/TenantContext";
import { WorkspaceProvider as WorkspaceDataProvider } from "@/lib/contexts/WorkspaceContext";
import { TenantBoundary } from "@/lib/contexts/TenantBoundary";
import { WorkspaceProvider } from "@/providers/WorkspaceProvider";
import { AppFrame } from "@/components/AppFrame";

// Misma tipografía que el build desplegado en app.contabhn.com.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Diamond Accounting - Sistema de Contabilidad Profesional",
  description:
    "Sistema de contabilidad hondureño para contadores profesionales",
  icons: { icon: "/favicon.ico" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider
      signInUrl="/auth/login"
      signUpUrl="/auth/register"
      afterSignOutUrl="/auth/login"
    >
      <html lang="es" suppressHydrationWarning>
        <body
          className={`${inter.variable} font-sans antialiased bg-gray-50 text-gray-900`}
        >
          <UserProvider>
            <SidebarProvider>
              <TenantProvider>
                <WorkspaceDataProvider>
                  <WorkspaceProvider>
                    <TenantBoundary>
                      <AppFrame>{children}</AppFrame>
                    </TenantBoundary>
                  </WorkspaceProvider>
                </WorkspaceDataProvider>
              </TenantProvider>
            </SidebarProvider>
          </UserProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
