"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface SidebarLinkProps {
  href: string;
  icon: ReactNode;
  label: string;
  onClick?: () => void;
  collapsed?: boolean;
}

export function SidebarLink({ href, icon, label, onClick, collapsed }: SidebarLinkProps) {
  const pathname = usePathname();
  
  // Determinamos si el enlace está activo.
  // 1. Coincidencia exacta (ej: /dashboard)
  // 2. Coincidencia de sub-ruta (ej: /accounts/new activa el link /accounts)
  const isActive = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200 text-sm font-medium",
        collapsed ? "justify-center px-2" : "justify-start",
        isActive 
          ? "bg-blue-600/10 text-blue-700 dark:bg-blue-600/20 dark:text-blue-400 shadow-sm" 
          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200"
      )}
      title={collapsed ? label : undefined}
    >
      <div className={cn(
        "transition-colors flex items-center justify-center w-5 h-5 flex-shrink-0",
        isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
      )}>
        {icon}
      </div>
      {!collapsed && <span className="truncate animate-in fade-in duration-300">{label}</span>}
    </Link>
  );
}
