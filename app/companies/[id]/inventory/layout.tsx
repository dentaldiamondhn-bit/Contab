"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { AlertTriangle, BarChart3, Boxes, FileText, Package } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Layout de la seccion de Inventario.
 *
 * Las tres pantallas del modulo (`/inventory`, `/inventory/dashboard` y
 * `/inventory/kardex`) existian como paginas hermanas SIN enlace entre ellas:
 * el sidebar general solo apunta a `/inventory/dashboard`, asi que desde ahi no
 * habia forma de llegar a la lista de productos ni al kardex. En lugar de
 * inventar una barra global nueva, se replica el patron que ya usa
 * `security/layout.tsx`: una sub-navegacion propia del modulo.
 *
 * Solo se enlazan rutas que EXISTEN. `UnifiedSidebar` lista ademas
 * `/inventory/products`, `/inventory/transfers` y `/inventory/warehouses`, pero
 * esas paginas no estan creadas en el proyecto, asi que no se incluyen aqui
 * para no generar enlaces muertos.
 *
 * Este layout NO aporta header ni sidebar propios: el chrome lo sigue poniendo
 * `app/companies/layout.tsx` con `AppShell`, de modo que no se duplica.
 */

const rutas = [
  {
    href: "",
    label: "Productos",
    icon: Boxes,
    description: "Listado y alta de productos",
  },
  {
    href: "/dashboard",
    label: "Dashboard",
    icon: BarChart3,
    description: "Resumen e indicadores",
  },
  {
    href: "/kardex",
    label: "Kardex",
    icon: FileText,
    description: "Movimientos por producto",
  },
  {
    href: "/alertas",
    label: "Alertas",
    icon: AlertTriangle,
    description: "Stock bajo y vencimientos",
  },
];

export default function InventoryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname() ?? "";
  const params = useParams();
  const companyId = (params?.id as string) || "";
  const base = `/companies/${companyId}/inventory`;

  // La coincidencia mas especifica gana: `/inventory` es prefijo de
  // `/inventory/dashboard`, asi que se compara exacto para la raiz y por
  // prefijo para el resto.
  const esActiva = (sufijo: string) => {
    const href = `${base}${sufijo}`;
    return sufijo === ""
      ? pathname === href || pathname === `${href}/`
      : pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-2">
          <Package className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
        </div>
        <p className="text-sm text-gray-600">
          Productos, existencias y movimientos de la empresa
        </p>
      </div>

      <nav className="flex flex-wrap gap-2 border-b border-gray-200 pb-3">
        {rutas.map((ruta) => {
          const Icon = ruta.icon;
          const activa = esActiva(ruta.href);
          return (
            <Link
              key={ruta.href || "root"}
              href={`${base}${ruta.href}`}
              title={ruta.description}
              className={cn(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                activa
                  ? "bg-blue-50 text-blue-700 border border-blue-200"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border border-transparent"
              )}
            >
              <Icon className="h-4 w-4" />
              {ruta.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
