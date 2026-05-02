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
    id: "cmoegv9te0009z0pax786qqqn",
    businessName: "Dental Diamond",
    businessRTN: "05011991078006",
    businessEmail: "dentaldiamondhn@gmail.com",
    businessAddress: "Dirección Dental Diamond",
    phoneNumber: "504XXXXXXX",
    tenantCode: "DD001",
    industry: "Servicios Dentales",
    maxUsers: 5,
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
      signUpUrl="/auth/register"
      afterSignOutUrl="/auth/login"
      signInFallbackRedirectUrl="/auth/login"
      signUpFallbackRedirectUrl="/auth/register"
    >
      <html lang="es-HN">
        <body className={inter.className}>
          <UserProvider>
            <TenantProvider>
              <SidebarProvider>
                <LayoutWrapper tenants={[]}>
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
