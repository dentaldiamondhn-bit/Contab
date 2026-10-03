import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { SidebarProvider } from "./contexts/SidebarContext";
import { TenantProvider } from "@/lib/contexts/TenantContext";
import { WorkspaceProvider } from "@/lib/contexts/WorkspaceContext";
import { TenantBoundary } from "@/lib/contexts/TenantBoundary";
import { WorkspaceShell } from "@/components/workspace/WorkspaceShell";
import { UserProvider } from "@/contexts/UserContext";
import { Toaster } from "sonner";
import LayoutWrapper from "./components/LayoutWrapper";
import ClerkErrorBoundary from "./components/ClerkErrorBoundary";
import { SafeAnalytics, SafeSpeedInsights } from "./components/VercelAnalytics";

const inter = Inter({ subsets: ["latin"] });


export const metadata: Metadata = {
  title: "Diamond Accounting - Sistema de Contabilidad Profesional",
  description: "Sistema de contabilidad hondureño para contadores profesionales",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
<ClerkProvider
       appearance={{
         elements: {
           formButtonPrimary: "bg-cyan-600 hover:bg-cyan-700",
           footerActionLink: "text-cyan-600 hover:text-cyan-800",
         },
       }}
       signInUrl="/auth/login"
       signUpUrl="/auth/register"
       afterSignOutUrl="/auth/login"
       afterSignInUrl="/auth/callback"
       signInFallbackRedirectUrl="/auth/login"
       signUpFallbackRedirectUrl="/auth/register"
     >
      <html lang="es-HN">
        <body className={inter.className}>
          <ClerkErrorBoundary>
            <UserProvider>
              <TenantProvider>
                {/* Empresa y sede activas. Va DENTRO de TenantProvider y no
                    al reves: WorkspaceProvider consulta la membresia del
                    usuario y TenantProvider decide el tenant, asi que el orden
                    refleja la dependencia. El selector de empresa usa
                    useWorkspace(), no useTenant(), porque la empresa no cuelga
                    de un tenant (ver AGENTS.md seccion 1b). */}
                <WorkspaceProvider>
                  {/* Adaptador corto (useTenantUI) sobre el workspace. No
                      remonta el arbol: de eso se encarga WorkspaceShell. */}
                  <TenantBoundary>
                    <SidebarProvider>
                      {/* Cambiar de empresa remonta el subarbol entero: se
                          descartan los estados locales de la empresa anterior. */}
                      <WorkspaceShell>
                        <LayoutWrapper tenants={[]}>
                          {children}
                        </LayoutWrapper>
                      </WorkspaceShell>
                      <Toaster position="top-right" richColors />
                      <SafeAnalytics />
                      <SafeSpeedInsights />
                    </SidebarProvider>
                  </TenantBoundary>
                </WorkspaceProvider>
              </TenantProvider>
            </UserProvider>
          </ClerkErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
