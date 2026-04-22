import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { SidebarProvider } from "./contexts/SidebarContext";
import { TenantProvider } from "@/lib/contexts/TenantContext";
import { UserProvider } from "@/contexts/UserContext";
import LayoutWrapper from "./components/LayoutWrapper";

const inter = Inter({ subsets: ["latin"] });

// Datos de ejemplo - en producción vendrían de la base de datos
const mockTenants = [
  {
    id: "tenant_001",
    businessName: "Empresa Ejemplo S.A.",
    businessRTN: "08011999012345",
    industry: "Servicios Profesionales",
    subscriptionType: "PROFESSIONAL",
    isActive: true,
  },
  {
    id: "tenant_002",
    businessName: "Negocio Demo",
    businessRTN: "08011999012346",
    industry: "Comercio",
    subscriptionType: "BASIC",
    isActive: true,
  },
];

export const metadata: Metadata = {
  title: "Contador - Sistema de Contabilidad Profesional",
  description: "Sistema de contabilidad hondureño para contadores profesionales",
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
          formButtonPrimary: "bg-blue-600 hover:bg-blue-700",
          footerActionLink: "text-blue-600 hover:text-blue-800",
        },
      }}
      signInUrl="/auth/login"
      signUpUrl="/auth/sign-up"
      afterSignOutUrl="/auth/login"
    >
      <html lang="es-HN">
        <body className={inter.className}>
          <UserProvider>
            <TenantProvider initialTenants={mockTenants}>
              <SidebarProvider>
                <LayoutWrapper tenants={mockTenants}>
                  {children}
                </LayoutWrapper>
              </SidebarProvider>
            </TenantProvider>
          </UserProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
