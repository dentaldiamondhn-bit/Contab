"use client";

import React from "react";

/**
 * InventoryTable - Tabla de productos del inventario con filtros y acciones
 * 
 * Features:
 * - Tabla responsive con product code, name, stock, location
 * - Filtros por código, nombre, categoría, ubicación
 * - Estado de stock (verde/amarillo/rojo según cantidad)
 * - Acciones: editar, ver detalles, movimientos
 */
export const InventoryTable: React.FC = () => {
  const [filters, setFilters] = React.useState({
    code: "",
    name: "",
    location: "",
    category: "",
  });

  // Datos de ejemplo - en producción vendrían de API
  const sampleProducts = [
    { id: "1", code: "PROD-001", name: "Guantes Nitrile", stock: 51, location: "Bodega A", category: "Insumos", minStock: 10 },
    { id: "2", code: "PROD-002", name: "Gasas Estériles", stock: 50, location: "Bodega B", category: "Insumos", minStock: 20 },
    { id: "3", code: "PROD-003", name: "Jeringas", stock: 100, location: "Bodega A", category: "Insumos", minStock: 50 },
    { id: "4", code: "PROD-004", name: "Guantes Quirúrgicos", stock: 30, location: "Bodega C", category: "Insumos", minStock: 15 },
    { id: "5", code: "PROD-005", name: "Alcohol 70%", stock: 120, location: "Bodega B", category: "Insumos", minStock: 30 },
    { id: "6", code: "PROD-006", name: "Sutura 3-0", stock: 4, location: "Bodega C", category: "Insumos", minStock: 10 },
  ];

  // Calcular colores de stock
  const getStockColor = (stock: number, minStock: number) => {
    if (stock <= 0) return "bg-red-100 text-red-800";
    if (stock <= minStock) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  const getStockStatus = (stock: number, minStock: number) => {
    if (stock <= 0) return "Sin stock";
    if (stock <= minStock) return "Stock bajo";
    return "Suficiente";
  };

  return (
    <div className="bg-white rounded-lg shadow-sm overflow-hidden">
      {/* Header con filtros */}
      <div className="p-4 border-b border-gray-200">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
          <div>
            <input
              type="text"
              placeholder="Código..."
              className="border rounded p-1 w-full"
              onChange={(e) => setFilters({ ...filters, code: e.target.value })}
              value={filters.code}
            />
          </div>
          <div>
            <input
              type="text"
              placeholder="Nombre..."
              className="border rounded p-1 w-full"
              onChange={(e) => setFilters({ ...filters, name: e.target.value })}
              value={filters.name}
            />
          </div>
          <div>
            <select
              className="border rounded p-1 w-full"
              onChange={(e) => setFilters({ ...filters, location: e.target.value })}
              value={filters.location}
            >
              <option value="">Todas</option>
              <option value="Bodega A">Bodega A</option>
              <option value="Bodega B">Bodega B</option>
              <option value="Bodega C">Bodega C</option>
            </select>
          </div>
          <div>
            <select
              className="border rounded p-1 w-full"
              onChange={(e) => setFilters({ ...filters, category: e.target.value })}
              value={filters.category}
            >
              <option value="">Todas</option>
              <option value="Insumos">Insumos</option>
              <option value="Terminados">Terminados</option>
              <option value="Materiales">Materiales</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de productos */}
      <div className="p-4 overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50">
              <th className="p-3 border border-gray-200 text-left">Código</th>
              <th className="p-3 border border-gray-200 text-left">Nombre</th>
              <th className="p-3 border border-gray-200 text-left">Categoría</th>
              <th className="p-3 border border-gray-200 text-left">Stock</th>
              <th className="p-3 border border-gray-200 text-left">Ubicación</th>
              <th className="p-3 border border-gray-200 text-center">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {sampleProducts
              .filter(
                (product) =>
                  product.code.includes(filters.code) ||
                  product.name.toLowerCase().includes(filters.name.toLowerCase()) ||
                  product.location.includes(filters.location) ||
                  product.category.includes(filters.category)
              )
              .map((product) => (
                <tr key={product.id} className="border-b border-gray-200">
                  <td className="p-3 font-medium">{product.code}</td>
                  <td className="p-3">{product.name}</td>
                  <td className="p-3">{product.category}</td>
                  <td className="p-3">
                    <span className={getStockColor(product.stock, product.minStock)}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="p-3">{product.location}</td>
                  <td className="p-3 text-center">
                    <button className="text-sm text-primary hover:underline">Ver</button>
                    <button className="text-sm text-green-600 hover:underline ml-2">Mov.</button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default InventoryTable;