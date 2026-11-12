"use client";

import InventoryTable from "@/components/inventory/InventoryTable";
import { useState } from "react";

export default function InventoryPage() {
  const [showCreate, setShowCreate] = useState(false);

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">Inventario</h1>
      <InventoryTable />
      <button
        onClick={() => setShowCreate(true)}
        className="mt-4 inline-block bg-primary text-white px-4 py-2 rounded"
      >
        Agregar Producto
      </button>

      {/* Modal de creación */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg p-8 max-w-md w-full">
            <h2 className="text-xl font-bold mb-4">Crear Producto</h2>
            <form>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Código</label>
                <input type="text" className="border rounded p-2 w-full" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Nombre</label>
                <input type="text" className="border rounded p-2 w-full" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Stock Actual</label>
                <input type="number" className="border rounded p-2 w-full" />
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">Ubicación</label>
                <input type="text" className="border rounded p-2 w-full" />
              </div>
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1">Categoría</label>
                <select className="border rounded p-2 w-full">
                  <option value="">Seleccionar categoría</option>
                  <option>Insumos</option>
                  <option>Terminados</option>
                  <option>Materiales</option>
                </select>
              </div>
              <div className="flex gap-3">
                <button type="button" className="flex-1 bg-gray-200 rounded px-4 py-2">
                  Cancelar
                </button>
                <button type="button" className="flex-1 bg-primary text-white rounded px-4 py-2">
                  Guardar
                </button>
              </div>
            </form>
            <button
              onClick={() => setShowCreate(false)}
              className="mt-4 absolute right-2 text-gray-500 hover:text-gray-700"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}