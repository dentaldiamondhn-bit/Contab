"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export interface PurchaseOrderFormProps {
  companyId?: string;
  suppliers?: any[];
  products?: any[];
  initialOrder?: any;
  isEditing?: boolean;
  open?: boolean;
  onSave?: () => void | Promise<void>;
  onCancel?: () => void;
}

/**
 * Reemplazo temporal del formulario original (archivo perdido).
 * Mantiene la misma interfaz para que la página de órdenes de compra compile.
 */
export function PurchaseOrderForm({
  open,
  isEditing,
  onSave,
  onCancel,
}: PurchaseOrderFormProps) {
  return (
    <Dialog
      open={!!open}
      onOpenChange={(value) => {
        if (!value) onCancel?.();
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isEditing ? "Editar orden de compra" : "Nueva orden de compra"}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm text-gray-600">
          El formulario original no está disponible porque el archivo
          <code className="mx-1 rounded bg-gray-100 px-1 py-0.5 text-xs">
            components/purchasing/PurchaseOrderForm.tsx
          </code>
          se perdió. Restáuralo desde OneDrive o un respaldo para recuperar
          esta funcionalidad.
        </p>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button onClick={() => void onSave?.()}>Guardar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PurchaseOrderForm;
