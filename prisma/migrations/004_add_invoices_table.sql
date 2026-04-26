-- CreateInvoicesTable
-- Crear tabla para almacenar facturas generadas

CREATE TABLE "Invoice" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "tenantId" TEXT NOT NULL,
    "invoiceNumber" TEXT NOT NULL,
    "invoiceDate" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "customerRTN" TEXT NOT NULL,
    "customerName" TEXT NOT NULL,
    "customerAddress" TEXT NOT NULL,
    "issuerRTN" TEXT NOT NULL,
    "issuerName" TEXT NOT NULL,
    "issuerAddress" TEXT NOT NULL,
    "cai" TEXT NOT NULL,
    "rangeStart" INTEGER NOT NULL,
    "rangeEnd" INTEGER NOT NULL,
    "expiryDate" TEXT NOT NULL,
    "items" TEXT NOT NULL, -- JSON array de items
    "subtotal" REAL NOT NULL,
    "totalTax" REAL NOT NULL,
    "total" REAL NOT NULL,
    "notes" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'HNL',
    "taxRate" REAL NOT NULL DEFAULT 15,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE,
    FOREIGN KEY ("customerId") REFERENCES "Tenant"("id") ON DELETE CASCADE
);

-- Crear índices para mejor rendimiento
CREATE INDEX "Invoice_tenantId_idx" ON "Invoice"("tenantId");
CREATE INDEX "Invoice_status_idx" ON "Invoice"("status");
CREATE INDEX "Invoice_invoiceDate_idx" ON "Invoice"("invoiceDate");
CREATE INDEX "Invoice_createdAt_idx" ON "Invoice"("createdAt");

-- Crear función para actualizar updatedAt automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Crear trigger para actualizar updatedAt automáticamente
CREATE TRIGGER "Invoice_updatedAt"
    BEFORE UPDATE ON "Invoice"
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
