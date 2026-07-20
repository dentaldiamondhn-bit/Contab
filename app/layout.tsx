import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { SidebarProvider } from "./contexts/SidebarContext";
import { TenantProvider } from "@/lib/contexts/TenantContext";
import { UserProvider } from "@/contexts/UserContext";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });


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
       afterSignInUrl="/auth/callback"
       signInFallbackRedirectUrl="/auth/login"
       signUpFallbackRedirectUrl="/auth/register"
     >
      <html lang="es-HN">
        <body className={inter.className}>
          <UserProvider>
            <TenantProvider>
              <SidebarProvider>
                {children}
                <Toaster position="top-right" richColors />
              </SidebarProvider>
            </TenantProvider>
          </UserProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
