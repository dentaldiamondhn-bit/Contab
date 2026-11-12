-- FKs para compras/proveedores: habilitan los joins de PostgREST (Supplier, items, pagos)
-- Ejecutar en: Supabase Dashboard → SQL Editor → New query

ALTER TABLE "Purchase"      ADD CONSTRAINT fk_purchase_supplier      FOREIGN KEY (supplier_id) REFERENCES "Supplier"(id);
ALTER TABLE "PurchaseItem"  ADD CONSTRAINT fk_purchase_item_purchase FOREIGN KEY (purchase_id) REFERENCES "Purchase"(id);
ALTER TABLE "SupplierPayment" ADD CONSTRAINT fk_supplier_payment_supplier FOREIGN KEY (supplier_id) REFERENCES "Supplier"(id);
ALTER TABLE "SupplierPayment" ADD CONSTRAINT fk_supplier_payment_purchase FOREIGN KEY (purchase_id) REFERENCES "Purchase"(id);

-- Recargar esquema en PostgREST para detectar las nuevas relaciones
NOTIFY pgrst, 'reload schema';

-- Verificación: debe devolver 4 filas
SELECT conrelid::regclass AS table_name, conname
FROM pg_constraint
WHERE contype = 'f'
  AND conrelid::regclass::text IN ('"Purchase"', '"PurchaseItem"', '"SupplierPayment"')
ORDER BY 1;