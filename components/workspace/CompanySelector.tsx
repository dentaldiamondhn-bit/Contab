import React, { useEffect, useRef, useState } from "react";
import { useWorkspace } from "@/providers/WorkspaceProvider";

export const CompanySelector: React.FC<{
  companies: any[];
  setCompany: (company: any) => void;
  activeCompanyId: string | null | undefined;
}> = ({ companies, setCompany, activeCompanyId }) => {
  const { company, loading } = useWorkspace();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onClickFuera = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickFuera);
    return () => document.removeEventListener("mousedown", onClickFuera);
  }, [open]);

  const activa =
    company?.name ||
    companies.find((c) => c.id === activeCompanyId)?.name ||
    (loading ? "Cargando empresa…" : "Sin empresa");

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((previo) => !previo)}
        disabled={loading && companies.length === 0}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="flex items-center gap-2 rounded-full bg-gray-100 py-1.5 px-3 text-sm text-gray-700 hover:bg-gray-200 disabled:opacity-60"
      >
        <span>{activa}</span>
        <svg
          className="w-3 h-3"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {open && companies.length > 0 && (
        <ul
          className="absolute right-0 mt-2 w-48 rounded-md bg-white shadow-lg border border-gray-200 z-20 py-1"
          role="listbox"
          aria-label="Empresas"
        >
          {companies.map((c) => (
            <li key={c.id} role="option" aria-selected={c.id === activeCompanyId}>
              <button
                type="button"
                onClick={() => {
                  setCompany(c.id);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-3 px-3 py-2 text-left text-sm ${
                  c.id === activeCompanyId
                    ? "bg-primary-100 text-primary-800"
                    : "text-gray-700 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                <span>{c.name || "Sin nombre"}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
