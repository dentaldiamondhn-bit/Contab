"use client";

import React from "react";
import { Package } from "lucide-react";

interface PackageItem {
  id: string;
  name: string;
  code: string;
  description: string | null;
  unit: string;
  unitPrice: number;
  currentStock: number;
  minStock: number;
  maxStock: number;
  category: string;
  isKit: boolean;
}

interface PackageTableProps {
  packages: PackageItem[];
  onEdit?: (package: PackageItem) => void;
  onDelete?: (packageId: string) => void;
}

export const PackagesList: React.FC<PackageTableProps> = ({
  packages,
  onEdit,
  onDelete,
}) => {
  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      <div className="p-4 border-b border-gray-200">
        <h2 className="text-xl font-bold text-gray-900">
          <Package className="h-5 w-5 inline-block mr-2" />
          Paquetes y Kits
        </h2>
      </div>

      <div className="p-4 overflow-x-auto">
        {packages.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Package className="h-12 w-12 mx-auto mb-3 opacity-50" />
            <p>No hay paquetes registrados</p>
            <p className="text-sm mt-1">Crea tu primer paquete usando el botón de abajo</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50">
                  <th className="p-3 border border-gray-200 text-left">Nombre</th>
                  <th className="p-3 border border-gray-200 text-left">Código</th>
                  <th className="p-3 border border-gray-200 text-left">Categoría</th>
                  <th className="p-3 border border-gray-200 text-center">Stock</th>
                  <th className="p-3 border border-gray-200 text-right">Precio</th>
                  <th className="p-3 border border-gray-200 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {packages.map((pkg) => (
                  <tr key={pkg.id} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="p-3 font-medium">{pkg.name}</td>
                    <td className="p-3 text-sm text-gray-500">{pkg.code}</td>
                    <td className="p-3 text-sm text-gray-500">{pkg.category}</td>
                    <td className="p-3">
                      <span className={pkg.currentStock <= 0 ? "bg-red-100 text-red-800" : ""}>
                        {pkg.currentStock}
                      </span>
                    </td>
                    <td className="p-3 text-right">
                      <span className="font-medium">L {pkg.unitPrice}</span>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex gap-1">
                        <button
                          onClick={() => onEdit && onEdit(pkg)}
                          className="text-xs text-primary hover:underline"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => onDelete && onDelete(pkg.id)}
                          className="text-xs text-red-600 hover:underline"
                        >
                          Eliminar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="mt-4 flex justify-end">
          <button
            onClick={() => window.location.hash && window.location.hash.includes("#package-modal")}
            className="inline-block bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover"
          >
            Nuevo Paquete
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackagesList;