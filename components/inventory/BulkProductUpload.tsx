"use client";

import React, { useState } from "react";
import { Button, Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui";

interface BulkUploadProps {
  onSuccess?: () => void;
  companyId?: string;
}

export const BulkProductUpload: React.FC<BulkUploadProps> = ({
  onSuccess,
  companyId = "c1-test1",
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpen = () => setIsOpen(true);
  const handleClose = () => {
    setIsOpen(false);
    onSuccess?.();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const file = (document.querySelector('input[type="file"]') as HTMLInputElement).files[0];
    if (!file) {
      alert("Por favor selecciona un archivo primero");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("companyId", companyId);

    try {
      const res = await fetch("/api/inventory/products/bulk-upload", {
        method: "POST",
        body: formData,
      });

      const result = await res.json();

      if (res.ok) {
        alert("✅ " + (result.message || "Productos insertados"));
        handleClose();
      } else {
        alert("❌ " + (result.message || result.error || "Error en subida"));
      }
    } catch (err: any) {
      alert("❌ Error de red: " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div>
      <Button variant="secondary" onClick={handleOpen} className="flex items-center gap-2">
        <span className="text-xl">⬇️</span> Subir Productos Masivo
      </Button>

      <Dialog open={isOpen} onClose={handleClose} className="max-w-2xl">
        <DialogContent className="p-6">
          <DialogHeader>
            <DialogTitle>Cargar Productos por Lote</DialogTitle>
          </DialogHeader>

          <p className="mb-6">Arrastra un archivo o haz clic para seleccionar</p>

          <input type="file" accept=".csv,.xlsx,.xls" style={{ display: "none" }} />
          <button
            onClick={() => (document.querySelector('input[type="file"]') as HTMLInputElement).click()}
            className="mt-2 bg-primary text-white px-4 py-2 rounded"
          >
            Seleccionar archivo
          </button>

          <button onClick={handleSubmit} className="mt-4 bg-primary text-white px-4 py-2 disabled:opacity-50">
            {isOpen ? "Procesando..." : "Subir Productos"}
          </button>
          <button onClick={handleClose} className="mt-4 ml-2 bg-gray-200 px-4 py-2">
            Cancelar
          </button>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default BulkProductUpload;