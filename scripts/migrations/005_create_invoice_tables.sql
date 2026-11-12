-- ========================================
-- MIGRACIÓN 005: TABLAS DE FACTURACIÓN
-- ========================================
-- Crear tablas para persistencia de facturas creadas y recibidas
-- Autor: Sistema ContabHN
-- Fecha: 2026-05-04
-- ========================================

-- 1. Tabla principal de facturas
CREATE TABLE IF NOT EXISTS "Invoice" (
    "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::TEXT),
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "invoiceNumber" VARCHAR(50) NOT NULL UNIQUE,
    "invoiceType" VARCHAR(20) NOT NULL CHECK ("invoiceType" IN ('CUSTOMER', 'EXPENSE', 'SUBSCRIPTION')),
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'PAID', 'OVERDUE', 'CANCELLED')),
    
    -- Información del cliente/proveedor
    "customerName" VARCHAR(255) NOT NULL,
    "customerRTN" VARCHAR(20),
    "customerEmail" VARCHAR(255),
    "customerAddress" TEXT,
    
    -- Información del emisor
    "issuerName" VARCHAR(255) NOT NULL,
    "issuerRTN" VARCHAR(20),
    "issuerAddress" TEXT,
    
    -- Fechas
    "issueDate" DATE NOT NULL,
    "dueDate" DATE,
    
    -- Información fiscal (CAI)
    "cai" VARCHAR(50),
    "rangeStart" BIGINT,
    "rangeEnd" BIGINT,
    "expiryDate" DATE,
    
    -- Montos
    "subtotal" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "tax" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "currency" VARCHAR(10) NOT NULL DEFAULT 'HNL',
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    
    -- Archivos adjuntos
    "invoiceImage" TEXT,
    "invoicePdf" TEXT,
    
    -- Notas y observaciones
    "notes" TEXT,
    
    -- Metadatos
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT REFERENCES "User"("id"),
    "updatedBy" TEXT REFERENCES "User"("id")
);

-- 2. Tabla de items de factura
CREATE TABLE IF NOT EXISTS "InvoiceItem" (
    "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::TEXT),
    "invoiceId" TEXT NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE,
    "description" TEXT NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL DEFAULT 1,
    "unitPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 15.00,
    "taxAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "isTaxable" BOOLEAN NOT NULL DEFAULT true,
    "productCode" VARCHAR(50),
    "serviceCode" VARCHAR(50),
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabla de pagos de facturas
CREATE TABLE IF NOT EXISTS "InvoicePayment" (
    "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::TEXT),
    "invoiceId" TEXT NOT NULL REFERENCES "Invoice"("id") ON DELETE CASCADE,
    "paymentDate" DATE NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "paymentMethod" VARCHAR(50) NOT NULL CHECK ("paymentMethod" IN ('CASH', 'TRANSFER', 'CHECK', 'CARD', 'CREDIT')),
    "referenceNumber" VARCHAR(100),
    "bankName" VARCHAR(100),
    "notes" TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT REFERENCES "User"("id")
);

-- 4. Tabla de notas de crédito/débito
CREATE TABLE IF NOT EXISTS "InvoiceNote" (
    "id" TEXT PRIMARY KEY DEFAULT (gen_random_uuid()::TEXT),
    "tenantId" TEXT NOT NULL REFERENCES "Tenant"("id") ON DELETE CASCADE,
    "originalInvoiceId" TEXT REFERENCES "Invoice"("id") ON DELETE SET NULL,
    "noteType" VARCHAR(20) NOT NULL CHECK ("noteType" IN ('CREDIT', 'DEBIT')),
    "noteNumber" VARCHAR(50) NOT NULL,
    "reason" TEXT NOT NULL,
    "amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK ("status" IN ('PENDING', 'APPLIED', 'CANCELLED')),
    "appliedDate" DATE,
    "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "createdBy" TEXT REFERENCES "User"("id")
);

-- 5. Índices para optimización
CREATE INDEX IF NOT EXISTS "idx_invoice_tenant" ON "Invoice"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_invoice_type" ON "Invoice"("invoiceType");
CREATE INDEX IF NOT EXISTS "idx_invoice_status" ON "Invoice"("status");
CREATE INDEX IF NOT EXISTS "idx_invoice_customer" ON "Invoice"("customerName");
CREATE INDEX IF NOT EXISTS "idx_invoice_dates" ON "Invoice"("issueDate", "dueDate");
CREATE INDEX IF NOT EXISTS "idx_invoice_number" ON "Invoice"("invoiceNumber");
CREATE INDEX IF NOT EXISTS "idx_invoice_cai" ON "Invoice"("cai");

CREATE INDEX IF NOT EXISTS "idx_invoice_item_invoice" ON "InvoiceItem"("invoiceId");
CREATE INDEX IF NOT EXISTS "idx_invoice_item_description" ON "InvoiceItem"("description");

CREATE INDEX IF NOT EXISTS "idx_invoice_payment_invoice" ON "InvoicePayment"("invoiceId");
CREATE INDEX IF NOT EXISTS "idx_invoice_payment_date" ON "InvoicePayment"("paymentDate");

CREATE INDEX IF NOT EXISTS "idx_invoice_note_tenant" ON "InvoiceNote"("tenantId");
CREATE INDEX IF NOT EXISTS "idx_invoice_note_original" ON "InvoiceNote"("originalInvoiceId");

-- 6. Triggers para actualización automática de timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invoice_updated_at 
    BEFORE UPDATE ON "Invoice" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoice_item_updated_at 
    BEFORE UPDATE ON "InvoiceItem" 
    FOR EACH ROW 
    EXECUTE FUNCTION update_updated_at_column();

-- 7. Restricciones adicionales
ALTER TABLE "Invoice" ADD CONSTRAINT "chk_invoice_dates" 
    CHECK ("dueDate" IS NULL OR "dueDate" >= "issueDate");

ALTER TABLE "Invoice" ADD CONSTRAINT "chk_invoice_amounts" 
    CHECK ("total" >= 0 AND "subtotal" >= 0 AND "tax" >= 0);

ALTER TABLE "InvoiceItem" ADD CONSTRAINT "chk_invoice_item_amounts" 
    CHECK ("total" >= 0 AND "unitPrice" >= 0 AND "quantity" >= 0);

ALTER TABLE "InvoicePayment" ADD CONSTRAINT "chk_invoice_payment_amount" 
    CHECK ("amount" > 0);

ALTER TABLE "InvoiceNote" ADD CONSTRAINT "chk_invoice_note_amount" 
    CHECK ("amount" > 0);

-- 8. Políticas de Row Level Security (RLS)
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoicePayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "InvoiceNote" ENABLE ROW LEVEL SECURITY;

-- Políticas para Invoice
CREATE POLICY "Users can view invoices from their tenant" ON "Invoice"
    FOR SELECT USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can insert invoices for their tenant" ON "Invoice"
    FOR INSERT WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can update invoices from their tenant" ON "Invoice"
    FOR UPDATE USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can delete invoices from their tenant" ON "Invoice"
    FOR DELETE USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- Políticas para InvoiceItem (heredan de Invoice)
CREATE POLICY "Users can manage invoice items from their tenant" ON "InvoiceItem"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "Invoice" 
            WHERE "Invoice"."id" = "InvoiceItem"."invoiceId" 
            AND "Invoice"."tenantId" = current_setting('app.current_tenant_id', true)
        )
    );

-- Políticas para InvoicePayment (heredan de Invoice)
CREATE POLICY "Users can manage invoice payments from their tenant" ON "InvoicePayment"
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM "Invoice" 
            WHERE "Invoice"."id" = "InvoicePayment"."invoiceId" 
            AND "Invoice"."tenantId" = current_setting('app.current_tenant_id', true)
        )
    );

-- Políticas para InvoiceNote
CREATE POLICY "Users can view invoice notes from their tenant" ON "InvoiceNote"
    FOR SELECT USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can insert invoice notes for their tenant" ON "InvoiceNote"
    FOR INSERT WITH CHECK ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can update invoice notes from their tenant" ON "InvoiceNote"
    FOR UPDATE USING ("tenantId" = current_setting('app.current_tenant_id', true));

CREATE POLICY "Users can delete invoice notes from their tenant" ON "InvoiceNote"
    FOR DELETE USING ("tenantId" = current_setting('app.current_tenant_id', true));

-- 9. Vistas útiles
CREATE OR REPLACE VIEW "InvoiceSummary" AS
SELECT 
    i."id",
    i."tenantId",
    i."invoiceNumber",
    i."invoiceType",
    i."status",
    i."customerName",
    i."customerRTN",
    i."issueDate",
    i."dueDate",
    i."total",
    i."currency",
    CASE 
        WHEN i."dueDate" < CURRENT_DATE AND i."status" != 'PAID' THEN 'OVERDUE'
        ELSE i."status"
    END as "calculatedStatus",
    COALESCE(SUM(ip."amount"), 0) as "paidAmount",
    i."total" - COALESCE(SUM(ip."amount"), 0) as "balanceDue",
    i."createdAt",
    i."updatedAt"
FROM "Invoice" i
LEFT JOIN "InvoicePayment" ip ON i."id" = ip."invoiceId"
GROUP BY i."id", i."tenantId", i."invoiceNumber", i."invoiceType", i."status", 
         i."customerName", i."customerRTN", i."issueDate", i."dueDate", 
         i."total", i."currency", i."createdAt", i."updatedAt";

-- 10. Función auxiliar para generar número de factura
CREATE OR REPLACE FUNCTION generate_invoice_number(p_tenant_id TEXT, p_invoice_type VARCHAR)
RETURNS VARCHAR(50) AS $$
DECLARE
    v_prefix VARCHAR(10);
    v_sequence_num BIGINT;
    v_invoice_number VARCHAR(50);
BEGIN
    -- Determinar prefijo según tipo
    CASE p_invoice_type
        WHEN 'CUSTOMER' THEN v_prefix := 'CUST';
        WHEN 'EXPENSE' THEN v_prefix := 'EXP';
        WHEN 'SUBSCRIPTION' THEN v_prefix := 'SUB';
        ELSE v_prefix := 'INV';
    END CASE;
    
    -- Obtener siguiente número de secuencia
    SELECT COALESCE(MAX(CAST(SUBSTRING("invoiceNumber", '-[0-9]+$') AS BIGINT)), 0) + 1
    INTO v_sequence_num
    FROM "Invoice"
    WHERE "tenantId" = p_tenant_id AND "invoiceType" = p_invoice_type;
    
    -- Generar número de factura (simplificado para TEXT)
    v_invoice_number := v_prefix || '-' || p_tenant_id || '-' || LPAD(v_sequence_num::TEXT, 6, '0');
    
    RETURN v_invoice_number;
END;
$$ LANGUAGE plpgsql;

-- 11. Comentarios y documentación
COMMENT ON TABLE "Invoice" IS 'Tabla principal para almacenar todas las facturas (emitidas y recibidas)';
COMMENT ON TABLE "InvoiceItem" IS 'Items/detalles de cada factura';
COMMENT ON TABLE "InvoicePayment" IS 'Pagos aplicados a las facturas';
COMMENT ON TABLE "InvoiceNote" IS 'Notas de crédito/débito relacionadas con facturas';
COMMENT ON VIEW "InvoiceSummary" IS 'Vista resumida de facturas con información de pagos';

-- 12. Estadísticas para optimización
ANALYZE "Invoice";
ANALYZE "InvoiceItem";
ANALYZE "InvoicePayment";
ANALYZE "InvoiceNote";

-- ========================================
-- FIN DE MIGRACIÓN 005
-- ========================================
