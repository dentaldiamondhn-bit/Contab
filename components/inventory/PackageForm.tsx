"use client";

import React from "react";
import { Package } from "lucide-react";

interface PackageFormProps {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  package?: {
    id: string;
    name: string;
    code: string;
    description: string;
    unit: string;
    unitPrice: number;
    minStock: number;
    maxStock: number;
    category: string;
  };
  onSave?: (packageData: any) => void;
  onClose?: () => void;
}

export const PackageForm: React.FC<PackageFormProps> = ({
  isOpen,
  setIsOpen,
  package,
  onSave,
  onClose,
}) => {
  const [formData, setFormData] = React.useState({
    name: package?.name || "",
    code: package?.code || `PKG-${Date.now().toString(36).toUpperCase().substring(2, 8)}`,
    description: package?.description || "",
    unit: package?.unit || "paquete",
    unitPrice: package?.unitPrice || 0,
    minStock: package?.minStock || 0,
    maxStock: package?.maxStock || 0,
    category: package?.category || "Insumos",
  });

  const handleSave = async () => {
    setIsOpen(false);
    onSave && onSave(formData);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg p-8 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">
          {package ? "Editar Paquete" : "Crear Paquete"}
        </h2>

        <form>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Nombre</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="border rounded p-2 w-full"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Código</label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              className="border rounded p-2 w-full"
            />
            <p className="text-xs text-gray-500 mt-1">
              Formato: PKG-XXXX (generado automáticamente)
            </p>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Descripción</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="border rounded p-2 w-full"
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Unidad</label>
              <select
                value={formData.unit}
                onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                className="border rounded p-2 w-full"
              >
                <option value="paquete">Paquete</option>
                <option value="caja">Caja</option>
                <option value="unidad">Unidad</option>
                <option value="frasco">Frasco</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Precio Unitario (L)</label>
              <input
                type="number"
                value={formData.unitPrice}
                onChange={(e) => setFormData({ ...formData, unitPrice: parseFloat(e.target.value) || 0 })}
                className="border rounded p-2 w-full"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Stock Mínimo</label>
              <input
                type="number"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 0 })}
                className="border rounded p-2 w-full"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Stock Máximo</label>
              <input
                type="number"
                value={formData.maxStock}
                onChange={(e) => setFormData({ ...formData, maxStock: parseInt(e.target.value) || 0 })}
                className="border rounded p-2 w-full"
              />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Categoría</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="border rounded p-2 w-full"
            >
              <option value="Insumos">Insumos</option>
              <option value="Terminados">Terminados</option>
              <option value="Materiales">Materiales</option>
              <option value="Kit">Kit</option>
            </select>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                onClose && onClose();
              }}
              className="flex-1 bg-gray-200 rounded px-4 py-2 text-gray-700 hover:bg-gray-300"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={formData.name.trim() === ""}
              className="flex-1 bg-primary text-white rounded px-4 py-2 hover:bg-primary-hover disabled:opacity-50"
            >
              {package ? "Actualizar" : "Crear Paquete"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};