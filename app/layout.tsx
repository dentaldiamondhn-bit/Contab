import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { SidebarProvider } from "./contexts/SidebarContext";
import { TenantProvider } from "@/lib/contexts/TenantContext";
import { UserProvider } from "@/contexts/UserContext";
import { Toaster } from "sonner";
import LayoutWrapper from "./components/LayoutWrapper";
import ClerkErrorBoundary from "./components/ClerkErrorBoundary";

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
                <SidebarProvider>
                  <LayoutWrapper tenants={[]}>
                    {children}
                  </LayoutWrapper>
                  <Toaster position="top-right" richColors />
                </SidebarProvider>
              </TenantProvider>
            </UserProvider>
          </ClerkErrorBoundary>
        </body>
      </html>
    </ClerkProvider>
  );
}
