-- ========================================
-- EJEMPLOS DE QUERIES PARA FACTURACIÓN
-- ========================================
-- Consultas SQL útiles para gestión de facturas creadas y recibidas
-- Autor: Sistema ContabHN
-- Fecha: 2026-05-04
-- ========================================

-- ========================================
-- 1. INSERCIÓN DE FACTURAS
-- ========================================

-- Insertar factura emitida a cliente (CUSTOMER)
INSERT INTO "Invoice" (
    "tenantId", "invoiceNumber", "invoiceType", "status",
    "customerName", "customerRTN", "customerEmail", "customerAddress",
    "issuerName", "issuerRTN", "issuerAddress",
    "issueDate", "dueDate",
    "cai", "rangeStart", "rangeEnd", "expiryDate",
    "subtotal", "tax", "total", "currency", "taxRate",
    "notes", "createdBy"
) VALUES (
    'uuid-del-tenant',  -- Reemplazar con UUID real
    'CUST-123456-000001',
    'CUSTOMER',
    'PENDING',
    'Cliente Ejemplo S.A.',
    '0801-2000-12345',
    'cliente@ejemplo.com',
    'Tegucigalpa, Honduras',
    'Dental Diamond S.A.',
    '05011991078006',
    'Tegucigalpa, Honduras',
    '2026-05-04',
    '2026-06-04',
    'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A',
    1,
    1000,
    '2026-12-31',
    5000.00,
    750.00,
    5750.00,
    'HNL',
    15.00,
    'Servicios profesionales prestados',
    'uuid-del-usuario'  -- Reemplazar con UUID real
);

-- Insertar factura recibida de proveedor (EXPENSE)
INSERT INTO "Invoice" (
    "tenantId", "invoiceNumber", "invoiceType", "status",
    "customerName", "customerRTN", "customerEmail", "customerAddress",
    "issuerName", "issuerRTN", "issuerAddress",
    "issueDate", "dueDate",
    "subtotal", "tax", "total", "currency", "taxRate",
    "notes", "createdBy"
) VALUES (
    'uuid-del-tenant',
    'EXP-123456-000001',
    'EXPENSE',
    'PENDING',
    'Microsoft Corporation',
    '99-999-9999',
    'billing@microsoft.com',
    'One Microsoft Way, Redmond, WA',
    'Dental Diamond S.A.',
    '05011991078006',
    'Tegucigalpa, Honduras',
    '2026-05-01',
    '2026-05-31',
    1200.00,
    180.00,
    1380.00,
    'HNL',
    15.00,
    'Suscripción Office 365 Business',
    'uuid-del-usuario'
);

-- Insertar items de factura
INSERT INTO "InvoiceItem" (
    "invoiceId", "description", "quantity", "unitPrice", "total", 
    "taxRate", "taxAmount", "isTaxable", "productCode"
) VALUES 
(
    'uuid-de-factura',  -- Reemplazar con UUID real de factura
    'Servicios de Consultoría IT',
    10,
    500.00,
    5000.00,
    15.00,
    750.00,
    true,
    'SRV-001'
),
(
    'uuid-de-factura',
    'Mantenimiento Preventivo',
    5,
    200.00,
    1000.00,
    15.00,
    150.00,
    true,
    'SRV-002'
);

-- Insertar pago de factura
INSERT INTO "InvoicePayment" (
    "invoiceId", "paymentDate", "amount", "paymentMethod", 
    "referenceNumber", "bankName", "notes", "createdBy"
) VALUES (
    'uuid-de-factura',
    '2026-05-10',
    2875.00,
    'TRANSFER',
    'TRF-2026-001',
    'Banco Atlántida',
    'Pago parcial de factura',
    'uuid-del-usuario'
);

-- ========================================
-- 2. CONSULTAS DE FACTURAS CREADAS (EMITIDAS)
-- ========================================

-- Todas las facturas emitidas a clientes de un tenant
SELECT 
    i."invoiceNumber",
    i."customerName",
    i."customerRTN",
    i."issueDate",
    i."dueDate",
    i."total",
    i."currency",
    i."status",
    CASE 
        WHEN i."dueDate" < CURRENT_DATE AND i."status" != 'PAID' THEN 'VENCIDA'
        ELSE i."status"
    END as "estadoCalculado"
FROM "Invoice" i
WHERE i."tenantId" = 'uuid-del-tenant'
  AND i."invoiceType" = 'CUSTOMER'
ORDER BY i."issueDate" DESC;

-- Facturas emitidas por estado
SELECT 
    i."status",
    COUNT(*) as "cantidad",
    SUM(i."total") as "montoTotal"
FROM "Invoice" i
WHERE i."tenantId" = 'uuid-del-tenant'
  AND i."invoiceType" = 'CUSTOMER'
GROUP BY i."status"
ORDER BY "cantidad" DESC;

-- Facturas emitidas vencidas
SELECT 
    i."invoiceNumber",
    i."customerName",
    i."customerRTN",
    i."issueDate",
    i."dueDate",
    i."total",
    i."currency",
    EXTRACT(DAYS FROM CURRENT_DATE - i."dueDate") as "diasVencidos"
FROM "Invoice" i
WHERE i."tenantId" = 'uuid-del-tenant'
  AND i."invoiceType" = 'CUSTOMER'
  AND i."dueDate" < CURRENT_DATE
  AND i."status" != 'PAID'
ORDER BY i."dueDate" ASC;

-- ========================================
-- 3. CONSULTAS DE FACTURAS RECIBIDAS
-- ========================================

-- Todas las facturas recibidas de proveedores
SELECT 
    i."invoiceNumber",
    i."customerName" as "proveedor",
    i."customerRTN" as "rtnProveedor",
    i."issueDate",
    i."dueDate",
    i."total",
    i."currency",
    i."status",
    COALESCE(SUM(ip."amount"), 0) as "pagado",
    i."total" - COALESCE(SUM(ip."amount"), 0) as "saldoPendiente"
FROM "Invoice" i
LEFT JOIN "InvoicePayment" ip ON i."id" = ip."invoiceId"
WHERE i."tenantId" = 'uuid-del-tenant'
  AND i."invoiceType" = 'EXPENSE'
GROUP BY i."id", i."invoiceNumber", i."customerName", i."customerRTN", 
         i."issueDate", i."dueDate", i."total", i."currency", i."status"
ORDER BY i."issueDate" DESC;

-- Facturas recibidas por pagar
SELECT 
    i."invoiceNumber",
    i."customerName" as "proveedor",
    i."dueDate",
    i."total",
    i."currency",
    EXTRACT(DAYS FROM i."dueDate" - CURRENT_DATE) as "diasParaVencer",
    CASE 
        WHEN i."dueDate" < CURRENT_DATE THEN 'VENCIDA'
        WHEN i."dueDate" <= CURRENT_DATE + INTERVAL '7 days' THEN 'POR VENCER'
        ELSE 'NORMAL'
    END as "urgencia"
FROM "Invoice" i
WHERE i."tenantId" = 'uuid-del-tenant'
  AND i."invoiceType" = 'EXPENSE'
  AND i."status" != 'PAID'
ORDER BY i."dueDate" ASC;

-- ========================================
-- 4. REPORTES Y ANÁLISIS
-- ========================================

-- Resumen mensual de facturas emitidas
SELECT 
    TO_CHAR(i."issueDate", 'YYYY-MM') as "mes",
    COUNT(*) as "cantidadFacturas",
    SUM(i."subtotal") as "subtotalTotal",
    SUM(i."tax") as "impuestoTotal",
    SUM(i."total") as "granTotal"
FROM "Invoice" i
WHERE i."tenantId" = 'uuid-del-tenant'
  AND i."invoiceType" = 'CUSTOMER'
  AND i."issueDate" >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '12 months'
GROUP BY TO_CHAR(i."issueDate", 'YYYY-MM')
ORDER BY "mes" DESC;

-- Top 10 clientes por monto facturado
SELECT 
    i."customerName",
    i."customerRTN",
    COUNT(*) as "cantidadFacturas",
    SUM(i."total") as "montoTotal"
FROM "Invoice" i
WHERE i."tenantId" = 'uuid-del-tenant'
  AND i."invoiceType" = 'CUSTOMER'
  AND i."issueDate" >= DATE_TRUNC('year', CURRENT_DATE)
GROUP BY i."customerName", i."customerRTN"
ORDER BY "montoTotal" DESC
LIMIT 10;

-- Análisis de cobranza
SELECT 
    CASE 
        WHEN i."status" = 'PAID' THEN 'PAGADAS'
        WHEN i."dueDate" < CURRENT_DATE AND i."status" != 'PAID' THEN 'VENCIDAS'
        WHEN i."dueDate" >= CURRENT_DATE AND i."status" != 'PAID' THEN 'PENDIENTES'
        ELSE 'OTRAS'
    END as "categoria",
    COUNT(*) as "cantidad",
    SUM(i."total") as "monto"
FROM "Invoice" i
WHERE i."tenantId" = 'uuid-del-tenant'
  AND i."invoiceType" = 'CUSTOMER'
GROUP BY 
    CASE 
        WHEN i."status" = 'PAID' THEN 'PAGADAS'
        WHEN i."dueDate" < CURRENT_DATE AND i."status" != 'PAID' THEN 'VENCIDAS'
        WHEN i."dueDate" >= CURRENT_DATE AND i."status" != 'PAID' THEN 'PENDIENTES'
        ELSE 'OTRAS'
    END;

-- ========================================
-- 5. ACTUALIZACIONES
-- ========================================

-- Actualizar estado de factura a pagada
UPDATE "Invoice" 
SET "status" = 'PAID', "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'uuid-de-factura'
  AND "tenantId" = 'uuid-del-tenant';

-- Actualizar monto total de factura (recalcular items)
UPDATE "Invoice" 
SET 
    "subtotal" = (
        SELECT SUM(ii."total") 
        FROM "InvoiceItem" ii 
        WHERE ii."invoiceId" = 'uuid-de-factura'
    ),
    "tax" = (
        SELECT SUM(ii."taxAmount") 
        FROM "InvoiceItem" ii 
        WHERE ii."invoiceId" = 'uuid-de-factura'
    ),
    "total" = (
        SELECT SUM(ii."total" + ii."taxAmount") 
        FROM "InvoiceItem" ii 
        WHERE ii."invoiceId" = 'uuid-de-factura'
    ),
    "updatedAt" = CURRENT_TIMESTAMP
WHERE "id" = 'uuid-de-factura'
  AND "tenantId" = 'uuid-del-tenant';

-- ========================================
-- 6. ELIMINACIONES (CON CUIDADO)
-- ========================================

-- Eliminar factura y todos sus datos relacionados
-- (Usar transacción para seguridad)
BEGIN;
    
    -- Eliminar pagos
    DELETE FROM "InvoicePayment" 
    WHERE "invoiceId" = 'uuid-de-factura';
    
    -- Eliminar items
    DELETE FROM "InvoiceItem" 
    WHERE "invoiceId" = 'uuid-de-factura';
    
    -- Eliminar factura
    DELETE FROM "Invoice" 
    WHERE "id" = 'uuid-de-factura'
      AND "tenantId" = 'uuid-del-tenant';
    
COMMIT;

-- ========================================
-- 7. FUNCIONES AVANZADAS
-- ========================================

-- Función para calcular saldo pendiente de factura
CREATE OR REPLACE FUNCTION get_invoice_balance(p_invoice_id UUID)
RETURNS DECIMAL(15,2) AS $$
DECLARE
    v_invoice_total DECIMAL(15,2);
    v_paid_amount DECIMAL(15,2);
    v_balance DECIMAL(15,2);
BEGIN
    -- Obtener total de factura
    SELECT "total" INTO v_invoice_total
    FROM "Invoice"
    WHERE "id" = p_invoice_id;
    
    -- Obtener monto pagado
    SELECT COALESCE(SUM("amount"), 0) INTO v_paid_amount
    FROM "InvoicePayment"
    WHERE "invoiceId" = p_invoice_id;
    
    -- Calcular saldo
    v_balance := v_invoice_total - v_paid_amount;
    
    RETURN v_balance;
END;
$$ LANGUAGE plpgsql;

-- Función para actualizar estado de factura basado en pagos
CREATE OR REPLACE FUNCTION update_invoice_status(p_invoice_id UUID)
RETURNS VOID AS $$
DECLARE
    v_balance DECIMAL(15,2);
    v_invoice_total DECIMAL(15,2);
    v_paid_amount DECIMAL(15,2);
BEGIN
    -- Calcular balance
    SELECT get_invoice_balance(p_invoice_id) INTO v_balance;
    
    -- Obtener totales
    SELECT "total", COALESCE(SUM("amount"), 0) 
    INTO v_invoice_total, v_paid_amount
    FROM "Invoice" i
    LEFT JOIN "InvoicePayment" ip ON i."id" = ip."invoiceId"
    WHERE i."id" = p_invoice_id
    GROUP BY i."total";
    
    -- Actualizar estado
    UPDATE "Invoice"
    SET "status" = CASE 
        WHEN v_paid_amount >= v_invoice_total THEN 'PAID'
        WHEN v_paid_amount > 0 THEN 'PARTIAL'
        ELSE 'PENDING'
    END,
    "updatedAt" = CURRENT_TIMESTAMP
    WHERE "id" = p_invoice_id;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 8. VISTAS ÚTILES
-- ========================================

-- Vista completa de facturas con detalles
CREATE OR REPLACE VIEW "InvoiceDetails" AS
SELECT 
    i."id",
    i."tenantId",
    i."invoiceNumber",
    i."invoiceType",
    i."status",
    i."customerName",
    i."customerRTN",
    i."customerEmail",
    i."customerAddress",
    i."issuerName",
    i."issuerRTN",
    i."issueDate",
    i."dueDate",
    i."cai",
    i."subtotal",
    i."tax",
    i."total",
    i."currency",
    i."notes",
    i."createdAt",
    i."updatedAt",
    -- Información de pagos
    COALESCE(SUM(ip."amount"), 0) as "paidAmount",
    i."total" - COALESCE(SUM(ip."amount"), 0) as "balanceDue",
    -- Conteo de items
    (SELECT COUNT(*) FROM "InvoiceItem" ii WHERE ii."invoiceId" = i."id") as "itemCount"
FROM "Invoice" i
LEFT JOIN "InvoicePayment" ip ON i."id" = ip."invoiceId"
GROUP BY i."id", i."tenantId", i."invoiceNumber", i."invoiceType", i."status",
         i."customerName", i."customerRTN", i."customerEmail", i."customerAddress",
         i."issuerName", i."issuerRTN", i."issueDate", i."dueDate", i."cai",
         i."subtotal", i."tax", i."total", i."currency", i."notes",
         i."createdAt", i."updatedAt";

-- Vista de items de facturas
CREATE OR REPLACE VIEW "InvoiceItemsDetail" AS
SELECT 
    i."invoiceNumber",
    i."invoiceType",
    i."customerName",
    ii."description",
    ii."quantity",
    ii."unitPrice",
    ii."total",
    ii."taxRate",
    ii."taxAmount",
    ii."isTaxable",
    ii."productCode",
    i."issueDate"
FROM "InvoiceItem" ii
JOIN "Invoice" i ON ii."invoiceId" = i."id";

-- ========================================
-- FIN DE EJEMPLOS
-- ========================================
