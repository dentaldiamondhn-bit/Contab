"use client";

import { IncomeStatementComparative } from "@/components/financials/IncomeStatementComparative";
import { usePathname } from "next/navigation";

export default function InventoryDashboard() {
  // En Next.js app router, obtener el ID de la empresa de la ruta
  // El pathname esperado es: /companies/[id]/inventory/dashboard
  const pathname = usePathname() || "/companies//inventory/dashboard";
  const pathParts = pathname.split("/");
  const id = pathParts[2]; // Extrae el ID de /companies/[id]/inventory/dashboard
  
  // El componente renderizará el dashboard independientemente del ID
  // El ID solo se usa si se necesita para fetch operations

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Dashboard de Inventario</h1>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* KPI Cards */}
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Productos Totales</h3>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Stock Bajo</h3>
          <p className="text-3xl font-bold">0</p>
        </div>
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">Valor Inventario</h3>
          <p className="text-3xl font-bold">$0</p>
        </div>
      </div>

      {/* Graficos */}
      <div className="mt-6 grid grid-cols-1 gap-4">
        <IncomeStatementComparative />
        <IncomeStatementComparative />
      </div>

      {/* Tabla de productos recientes */}
      <div className="mt-6">
        <h2 className="text-xl font-bold mb-4">Productos Recientes</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full bg-white rounded-lg shadow-sm">
            <thead>
              <tr>
                <th className="p-3 border border-gray-200">Código</th>
                <th className="p-3 border border-gray-200">Nombre</th>
                <th className="p-3 border border-gray-200">Stock</th>
                <th className="p-3 border border-gray-200">Ubicación</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="p-3 border border-gray-200">PROD-001</td>
                <td className="p-3 border border-gray-200">Guantes Nitrile</td>
                <td className="p-3 border border-gray-200">51</td>
                <td className="p-3 border border-gray-200">Bodega A</td>
              </tr>
              <tr>
                <td className="p-3 border border-gray-200">PROD-002</td>
                <td className="p-3 border border-gray-200">Gasas Estériles</td>
                <td className="p-3 border border-gray-200">50</td>
                <td className="p-3 border border-gray-200">Bodega B</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}