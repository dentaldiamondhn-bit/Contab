const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function createInvoiceTables() {
  try {
    // Create Invoice table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "Invoice" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "tenant_id" TEXT NOT NULL,
        "invoice_number" TEXT NOT NULL UNIQUE,
        "issue_date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "due_date" DATETIME NOT NULL,
        "period_start" DATETIME NOT NULL,
        "period_end" DATETIME NOT NULL,
        "subtotal" INTEGER NOT NULL DEFAULT 0,
        "tax" INTEGER NOT NULL DEFAULT 0,
        "total" INTEGER NOT NULL DEFAULT 0,
        "currency" TEXT NOT NULL DEFAULT 'HNL',
        "status" TEXT NOT NULL DEFAULT 'PENDING',
        "plans_data" TEXT,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updated_at" DATETIME NOT NULL,
        FOREIGN KEY ("tenant_id") REFERENCES "Tenant" ("id") ON DELETE CASCADE
      )
    `;

    console.log('Tabla Invoice creada exitosamente');

    // Create InvoiceItem table
    await prisma.$executeRaw`
      CREATE TABLE IF NOT EXISTS "InvoiceItem" (
        "id" TEXT NOT NULL PRIMARY KEY,
        "invoice_id" TEXT NOT NULL,
        "plan_id" TEXT,
        "plan_name" TEXT NOT NULL,
        "quantity" INTEGER NOT NULL,
        "unit_price" INTEGER NOT NULL,
        "subtotal" INTEGER NOT NULL,
        "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY ("invoice_id") REFERENCES "Invoice" ("id") ON DELETE CASCADE,
        FOREIGN KEY ("plan_id") REFERENCES "Plan" ("id")
      )
    `;

    console.log('Tabla InvoiceItem creada exitosamente');

    // Create indexes
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_invoice_tenant" ON "Invoice"("tenant_id")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_invoice_status" ON "Invoice"("status")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_invoice_period" ON "Invoice"("period_start", "period_end")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_invoice_invoice_number" ON "Invoice"("invoice_number")`;

    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_invoice_item_invoice" ON "InvoiceItem"("invoice_id")`;
    await prisma.$executeRaw`CREATE INDEX IF NOT EXISTS "idx_invoice_item_plan" ON "InvoiceItem"("plan_id")`;

    console.log('Índices creados exitosamente');

  } catch (error) {
    console.error('Error creando tablas de facturas:', error);
  } finally {
    await prisma.$disconnect();
  }
}

createInvoiceTables();
