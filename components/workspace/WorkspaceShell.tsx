"use client";

import { Fragment, type ReactNode } from "react";
import { useWorkspace } from "@/lib/contexts/WorkspaceContext";

/**
 * Frontera de remontaje por empresa ("UI purge").
 *
 * Envuelve el arbol de la aplicacion con una `key` ligada a la empresa activa.
 * Al cambiar de empresa React desmonta TODO el subarbol anterior y monta uno
 * nuevo: desaparecen los `useState` locales (filtros de tablas, formularios,
 * paginas a medias) que de otro modo sobreviven al cambio porque el layout se
 * reutiliza y React reconcilia el mismo tipo de componente en la misma posicion.
 *
 * Por que hace falta y no basta con limpiar el contexto: los datos que no vienen
 * de una respuesta HTTP (estado local) no los puede limpiar un `setState`
 * generico; solo el desmontaje los tira. Es la regla 1 del aislamiento en UI.
 *
 * Se usa un `Fragment` con `key` (no la sintaxis corta `<>`, que no acepta key)
 * para no meter un `<div>` extra que rompa el layout de pantalla completa.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const { activeCompanyId } = useWorkspace();
  return <Fragment key={activeCompanyId ?? "sin-empresa"}>{children}</Fragment>;
}
