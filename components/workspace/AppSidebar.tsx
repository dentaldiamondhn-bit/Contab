"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { BarChart3, Boxes, FileText, LayoutDashboard, ShoppingCart } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWorkspace } from "@/providers/WorkspaceProvider";

export function AppSidebar() {
  const pathname = usePathname() || "/";
  const { activeCompanyId, company } = useWorkspace();
  const companyId = activeCompanyId || company?.id || "demo";

  const items = [
    { href: "/", label: "Inicio", icon: LayoutDashboard },
    { href: `/companies/${companyId}/inventory`, label: "Inventario", icon: Boxes },
    { href: `/companies/${companyId}/inventory/dashboard`, label: "Dashboard", icon: BarChart3 },
    { href: `/companies/${companyId}/purchase-orders`, label: "Compras", icon: ShoppingCart },
    { href: "/reports/purchases", label: "Reportes", icon: FileText },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-gray-200 bg-white">
      <div className="p-4">
        <p className="px-3 text-xs font-semibold uppercase tracking-wider text-gray-400">
          Menú
        </p>
        <nav className="mt-2 space-y-1" suppressHydrationWarning>
          {items.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                suppressHydrationWarning={true}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-secondary text-secondary-foreground"
                    : "text-gray-700 hover:bg-gray-100"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}

export default AppSidebar;