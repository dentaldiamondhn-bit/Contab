"use client";

import React, { useEffect, useState } from "react";
import { Package } from "lucide-react";
import { useParams } from "next/navigation";

export const InventoryTable: React.FC = () => {
  const { pathname } = useParams();
  const companyId = pathname?.split("/")[3] || "c1-test1"; // Extraer ID de la empresa de la ruta

  const [filters, setFilters] = React.useState({
    code: "",
    name: "",
    location: "",
    category: "",
  });
  const [showProductDetail, setShowProductDetail] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [selectedProduct, setSelectedProduct] = React.useState<any>(null);
  const [editData, setEditData] = React.useState<any>({
    name: "",
    description: "",
    unit: "caja",
    unitPrice: 0,
    minStock: 0,
    maxStock: 0,
    location: "",
    supplier: "",
  });
  const [saving, setSaving] = React.useState(false);
  const [products, setProducts] = React.useState<any[]>([]);

  

  const getStockColor = (stock: number, minStock: number) => {
    if (stock <= 0) return "bg-red-100 text-red-800";
    if (stock <= minStock) return "bg-yellow-100 text-yellow-800";
    return "bg-green-100 text-green-800";
  };

  // Cargar productos de la API cuando el componente monta o cambia companyId
  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const res = await fetch(`http://localhost:3000/api/inventory/products?companyId=${companyId}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Error al cargar productos");
        const data = await res.json();
        setProducts(data);
      } catch (error) {
        console.error("Error fetching products:", error);
        setProducts([]);
      }
    };

    fetchProducts();
  }, [companyId]);

  const handleEditProduct = async () => {
    if (!selectedProduct || !editData) return;

    setSaving(true);
    try {
      const res = await fetch(`/api/inventory/products?companyId=${companyId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: selectedProduct.id,
          name: editData.name,
          description: editData.description,
          unitPrice: parseFloat(editData.unitPrice) || 0,
          currentCost: parseFloat(editData.unitPrice) || 0,
          minStock: parseInt(editData.minStock) || 0,
          maxStock: parseInt(editData.maxStock) || 0,
          taxRate: 15,
          productType: "product",
          valuationMethod: "weighted_average",
          imageUrl: null,
          isService: false,
        }),
      });

      const text = await res.text();
      console.log("Response status:", res.status);
      console.log("Response body:", text);

      if (!res.ok) {
        let errorMessage = "Error al actualizar producto";
        try {
          const errorData = JSON.parse(text);
          errorMessage = errorData.error || errorData.message || errorMessage;
        } catch (e) {
          // Not JSON, use text
        }
        throw new Error(errorMessage);
      }

      setSelectedProduct((prev) => (prev ? { ...prev, ...editData } : prev));
      setShowProductDetail(false);
      setIsEditing(false);
      alert("Producto actualizado exitosamente");
    } catch (error) {
      console.error("Error updating product:", error);
      alert(error instanceof Error ? error.message : "Error al actualizar producto");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
  {products.length === 0 ? (
    <tr>
      <td colSpan={6} className="p-3 text-center text-gray-500">
        No hay productos disponibles
      </td>
    </tr>
  ) : (
    products.map((product) => (
      <tr key={product.id} className="hover:bg-gray-50">
        <td className="p-3 border border-gray-200">
          <p className="font-medium">{product.code}</p>
        </td>
        <td className="p-3 border border-gray-200">
          <p className="font-medium">{product.name}</p>
          <p className="text-xs text-gray-500">{product.description}</p>
        </td>
        <td className="p-3 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase">{product.category}</p>
          <p className="font-medium">{product.unit}</p>
        </td>
        <td className="p-3 border border-gray-200">
          <div className="flex items-baseline gap-2">
            <p className="text-xs text-gray-500 uppercase">Stock Actual</p>
            <p className={getStockColor(product.stock, product.minStock)}>
              {product.stock}
            </p>
          </div>
          <div className="flex items-baseline gap-2">
            <p className="text-xs text-gray-500 uppercase">Stock Mínimo</p>
            <p className="font-medium">{product.minStock}</p>
          </div>
        </td>
        <td className="p-3 border border-gray-200">
          <p className="text-xs text-gray-500 uppercase">{product.location}</p>
        </td>
        <td className="p-3 border border-gray-200 text-center">
          <button
            onClick={() => {
              setSelectedProduct(product);
              setShowProductDetail(true);
            }}
            className="text-primary hover:underline"
          >
            Ver detalles
          </button>
        </td>
      </tr>
    ))
  )}
</tbody>
          </table>
        </div>
      </div>

      {showProductDetail && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowProductDetail(false)} />
          <div className="relative z-50 bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-900">{isEditing ? "Editar Producto" : "Detalles del Producto"}</h2>
              <button
                onClick={() => setShowProductDetail(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            {isEditing ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Código</p>
                  <p className="text-sm font-medium text-gray-900">{selectedProduct.code}</p>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Nombre del Producto</p>
                  <input
                    type="text"
                    value={editData.name}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Unidad</p>
                    <select
                      value={editData.unit}
                      onChange={(e) => setEditData({ ...editData, unit: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    >
                      <option value="caja">Caja</option>
                      <option value="unidad">Unidad</option>
                      <option value="paquete">Paquete</option>
                      <option value="frasco">Frasco</option>
                      <option value="par">Par</option>
                    </select>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Precio Unitario (L)</p>
                    <input
                      type="number"
                      value={editData.unitPrice}
                      onChange={(e) => setEditData({ ...editData, unitPrice: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Stock Mínimo</p>
                    <input
                      type="number"
                      value={editData.minStock}
                      onChange={(e) => setEditData({ ...editData, minStock: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase">Stock Máximo</p>
                    <input
                      type="number"
                      value={editData.maxStock}
                      onChange={(e) => setEditData({ ...editData, maxStock: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                    />
                  </div>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Ubicación</p>
                  <select
                    value={editData.location}
                    onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  >
                    <option value="">Todas</option>
                    <option value="Bodega A">Bodega A</option>
                    <option value="Bodega B">Bodega B</option>
                    <option value="Bodega C">Bodega C</option>
                  </select>
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Descripción</p>
                  <textarea
                    value={editData.description}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase">Proveedor</p>
                  <input
                    type="text"
                    value={editData.supplier || selectedProduct.supplier || ""}
                    onChange={(e) => setEditData({ ...editData, supplier: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-primary"
                  />
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => {
                      setEditData({
                        id: selectedProduct.id,
                        name: selectedProduct.name,
                        description: selectedProduct.description,
                        unit: selectedProduct.unit,
                        unitPrice: selectedProduct.unitPrice,
                        minStock: selectedProduct.minStock,
                        maxStock: selectedProduct.maxStock,
                        location: selectedProduct.location,
                        supplier: selectedProduct.supplier,
                      });
                      setIsEditing(false);
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleEditProduct}
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover disabled:opacity-50"
                  >
                    {saving ? "Guardando..." : "Guardar Cambios"}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold">{selectedProduct.name}</h3>
                    <p className="text-sm text-gray-500">{selectedProduct.code}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 uppercase">Categoría</p>
                    <p className="text-sm font-medium">{selectedProduct.category}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 uppercase">Ubicación</p>
                    <p className="text-sm font-medium">{selectedProduct.location}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 uppercase">Stock Actual</p>
                    <p className={`text-xl font-bold ${getStockColor(selectedProduct.stock, selectedProduct.minStock)}`}>
                      {selectedProduct.stock}
                    </p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 uppercase">Stock Mínimo</p>
                    <p className="text-sm font-medium">{selectedProduct.minStock}</p>
                  </div>
                </div>

                {selectedProduct.description && (
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 uppercase">Descripción</p>
                    <p className="text-sm text-gray-700">{selectedProduct.description}</p>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 pt-4">
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 uppercase">Precio Unitario</p>
                    <p className="text-sm font-medium">L {selectedProduct.unitPrice}</p>
                  </div>
                  <div className="p-3 rounded-lg bg-gray-50">
                    <p className="text-xs font-medium text-gray-500 uppercase">Unidad</p>
                    <p className="text-sm font-medium">{selectedProduct.unit}</p>
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setShowProductDetail(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-100"
                  >
                    Cerrar
                  </button>
                  <button
                    onClick={() => {
                      setEditData({
                        id: selectedProduct.id,
                        name: selectedProduct.name,
                        description: selectedProduct.description || "",
                        unit: selectedProduct.unit,
                        unitPrice: selectedProduct.unitPrice,
                        minStock: selectedProduct.minStock,
                        maxStock: selectedProduct.maxStock || 0,
                        location: selectedProduct.location,
                        supplier: selectedProduct.supplier,
                      });
                      setIsEditing(true);
                    }}
                    className="flex-1 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-hover"
                  >
                    Editar Producto
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default InventoryTable;