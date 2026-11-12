-- =============================================
-- CONTAB - Vistas SQL para Reportes (v2)
-- Calculo de saldos basado en naturaleza de cuenta
-- DEBIT nature: Saldo = Suma Debitos - Suma Creditos
-- CREDIT nature: Saldo = Suma Creditos - Suma Debitos
-- =============================================

-- =============================================
-- 1. BALANCE GENERAL (Balance Sheet)
-- Activos, Pasivos y Patrimonio
-- =============================================
CREATE OR REPLACE VIEW balance_general AS
WITH account_movements AS (
  SELECT
    a.id,
    a.code,
    a.name,
    a.type,
    COALESCE(a.nature, 
      CASE WHEN a.type IN ('ASSET', 'EXPENSE') THEN 'DEBIT' ELSE 'CREDIT' END
    ) AS nature,
    a.tenant_id,
    a.is_active,
    COALESCE(SUM(CASE WHEN je.type = 'DEBIT' THEN je.amount ELSE 0 END), 0) AS total_debitos,
    COALESCE(SUM(CASE WHEN je.type = 'CREDIT' THEN je.amount ELSE 0 END), 0) AS total_creditos
  FROM "Account" a
  LEFT JOIN "JournalEntry" je ON je.account_id = a.id OR je."accountId" = a.id
  WHERE a.is_active = true
  GROUP BY a.id, a.code, a.name, a.type, a.tenant_id, a.is_active, a.nature
)
SELECT
  id, code, name, type, nature, tenant_id, is_active,
  total_debitos,
  total_creditos,
  CASE
    WHEN nature = 'DEBIT' THEN total_debitos - total_creditos
    ELSE total_creditos - total_debitos
  END AS balance
FROM account_movements;


-- =============================================
-- 2. ESTADO DE RESULTADOS (Income Statement)
-- Ingresos y Gastos del periodo
-- =============================================
CREATE OR REPLACE VIEW estado_resultados AS
SELECT
  id, code, name, type, nature, tenant_id, is_active,
  total_debitos,
  total_creditos,
  CASE
    WHEN nature = 'DEBIT' THEN total_debitos - total_creditos
    ELSE total_creditos - total_debitos
  END AS balance
FROM balance_general
WHERE type IN ('REVENUE', 'EXPENSE');


-- =============================================
-- 3. BALANZA DE COMPROBACION (Trial Balance)
-- Todos los saldos contables
-- =============================================
CREATE OR REPLACE VIEW balanza_comprobacion AS
SELECT
  id, code, name, type, nature, tenant_id,
  total_debitos,
  total_creditos,
  balance
FROM balance_general
ORDER BY code;


-- =============================================
-- 4. LIBRO DIARIO (Journal Book)
-- Transacciones con asientos contables
-- =============================================
CREATE OR REPLACE VIEW libro_diario AS
SELECT
  t.id AS transaction_id,
  t.date,
  t.description,
  t.voucher_type,
  t.voucher_number,
  t.reference,
  t.tenant_id,
  je.id AS entry_id,
  je.amount,
  je.type AS entry_type,
  je.description AS entry_description,
  a.code AS account_code,
  a.name AS account_name,
  a.type AS account_type,
  COALESCE(a.nature, 
    CASE WHEN a.type IN ('ASSET', 'EXPENSE') THEN 'DEBIT' ELSE 'CREDIT' END
  ) AS account_nature
FROM "Transaction" t
JOIN "JournalEntry" je ON je.transaction_id = t.id OR je."transactionId" = t.id
LEFT JOIN "Account" a ON a.id = je.account_id OR a.id = je."accountId"
ORDER BY t.date DESC, t.voucher_type, t.voucher_number;


-- =============================================
-- 5. LIBRO MAYOR (General Ledger)
-- Resumen por cuenta contable
-- =============================================
CREATE OR REPLACE VIEW libro_mayor AS
SELECT
  id, code, name, type, nature, tenant_id,
  total_debitos,
  total_creditos,
  balance,
  (total_debitos + total_creditos) AS movimientos
FROM balance_general
ORDER BY code;


-- =============================================
-- 6. LIBRO DE VENTAS (Sales Book)
-- =============================================
CREATE OR REPLACE VIEW libro_ventas AS
SELECT
  i.id,
  i."invoiceNumber" AS invoice_number,
  i."issueDate" AS invoice_date,
  i."customerName" AS customer_name,
  i."customerRTN" AS customer_rtn,
  i.subtotal,
  i.tax AS tax_amount,
  i.total,
  i.status,
  i."tenantId" AS tenant_id,
  i.cai
FROM "Invoice" i
WHERE i."invoiceType" = 'CUSTOMER'
  AND i.status != 'CANCELLED'
ORDER BY i."issueDate" DESC;


-- =============================================
-- 7. LIBRO DE COMPRAS (Purchase Book)
-- =============================================
CREATE OR REPLACE VIEW libro_compras AS
SELECT
  i.id,
  i."invoiceNumber" AS invoice_number,
  i."issueDate" AS invoice_date,
  i."customerName" AS supplier_name,
  i."customerRTN" AS supplier_rtn,
  i.subtotal,
  i.tax AS tax_amount,
  i.total,
  i.status,
  i."tenantId" AS tenant_id,
  i.cai
FROM "Invoice" i
WHERE i."invoiceType" = 'EXPENSE'
  AND i.status != 'CANCELLED'
ORDER BY i."issueDate" DESC;


-- =============================================
-- 8. RESUMEN ISV (Tax Summary)
-- =============================================
CREATE OR REPLACE VIEW resumen_isv AS
SELECT
  i."tenantId" AS tenant_id,
  DATE_TRUNC('month', i."issueDate") AS mes,
  SUM(CASE WHEN i."taxRate" = 15 THEN i.subtotal ELSE 0 END) AS base_gravada_15,
  SUM(CASE WHEN i."taxRate" = 15 THEN i.tax ELSE 0 END) AS isv_15,
  SUM(CASE WHEN i."taxRate" = 18 THEN i.subtotal ELSE 0 END) AS base_gravada_18,
  SUM(CASE WHEN i."taxRate" = 18 THEN i.tax ELSE 0 END) AS isv_18,
  SUM(i.subtotal) AS base_total,
  SUM(i.tax) AS isv_total,
  COUNT(*) AS facturas
FROM "Invoice" i
WHERE i.status != 'CANCELLED'
GROUP BY i."tenantId", DATE_TRUNC('month', i."issueDate")
ORDER BY mes DESC;


-- =============================================
-- 9. DECLARACION MENSUAL SAR
-- =============================================
CREATE OR REPLACE VIEW declaracion_mensual AS
SELECT
  i."tenantId" AS tenant_id,
  DATE_TRUNC('month', i."issueDate") AS mes,
  SUM(CASE WHEN i."invoiceType" = 'CUSTOMER' THEN i.subtotal ELSE 0 END) AS ventas_base,
  SUM(CASE WHEN i."invoiceType" = 'CUSTOMER' THEN i.tax ELSE 0 END) AS ventas_isv,
  SUM(CASE WHEN i."invoiceType" = 'CUSTOMER' THEN i.total ELSE 0 END) AS ventas_total,
  COUNT(CASE WHEN i."invoiceType" = 'CUSTOMER' THEN 1 END) AS num_ventas,
  SUM(CASE WHEN i."invoiceType" = 'EXPENSE' THEN i.subtotal ELSE 0 END) AS compras_base,
  SUM(CASE WHEN i."invoiceType" = 'EXPENSE' THEN i.tax ELSE 0 END) AS compras_isv,
  SUM(CASE WHEN i."invoiceType" = 'EXPENSE' THEN i.total ELSE 0 END) AS compras_total,
  COUNT(CASE WHEN i."invoiceType" = 'EXPENSE' THEN 1 END) AS num_compras,
  SUM(CASE WHEN i."invoiceType" = 'CUSTOMER' THEN i.tax ELSE 0 END) -
  SUM(CASE WHEN i."invoiceType" = 'EXPENSE' THEN i.tax ELSE 0 END) AS isv_a_pagar
FROM "Invoice" i
WHERE i.status != 'CANCELLED'
GROUP BY i."tenantId", DATE_TRUNC('month', i."issueDate")
ORDER BY mes DESC;


-- =============================================
-- 10. TOP CLIENTES
-- =============================================
CREATE OR REPLACE VIEW top_clientes AS
SELECT
  i."tenantId" AS tenant_id,
  i."customerName" AS client_name,
  i."customerRTN" AS client_rtn,
  i."customerEmail" AS client_email,
  COUNT(*) AS num_facturas,
  SUM(i.subtotal) AS total_base,
  SUM(i.tax) AS total_isv,
  SUM(i.total) AS total_ventas,
  MIN(i."issueDate") AS primera_venta,
  MAX(i."issueDate") AS ultima_venta
FROM "Invoice" i
WHERE i."invoiceType" = 'CUSTOMER'
  AND i.status != 'CANCELLED'
GROUP BY i."tenantId", i."customerName", i."customerRTN", i."customerEmail"
ORDER BY total_ventas DESC;


-- =============================================
-- 11. INVENTARIO VALORIZADO
-- =============================================
CREATE OR REPLACE VIEW inventario_valorizado AS
SELECT
  p.id, p.code, p.name, p.description, p.category,
  p.current_stock, p.current_cost, p.unit_price, p.tax_rate,
  p.tenant_id,
  (p.current_stock * p.current_cost) AS valor_total,
  (p.current_stock * p.unit_price) AS valor_venta,
  CASE
    WHEN p.current_stock <= p.min_stock THEN 'STOCK_BAJO'
    WHEN p.current_stock >= p.max_stock THEN 'SOBRANTE'
    ELSE 'NORMAL'
  END AS estado_stock
FROM product p
WHERE p.is_active = true
ORDER BY p.name;


-- =============================================
-- 12. RESUMEN CONTABLE POR TENANT
-- Dashboard financiero consolidado
-- =============================================
CREATE OR REPLACE VIEW resumen_contable AS
SELECT
  tenant_id,
  SUM(CASE WHEN type = 'ASSET' THEN balance ELSE 0 END) AS total_activos,
  SUM(CASE WHEN type = 'LIABILITY' THEN balance ELSE 0 END) AS total_pasivos,
  SUM(CASE WHEN type = 'EQUITY' THEN balance ELSE 0 END) AS total_patrimonio,
  SUM(CASE WHEN type = 'REVENUE' THEN balance ELSE 0 END) AS total_ingresos,
  SUM(CASE WHEN type = 'EXPENSE' THEN balance ELSE 0 END) AS total_gastos
FROM balance_general
GROUP BY tenant_id;


-- =============================================
-- 13. CUENTAS POR COBRAR (Accounts Receivable)
-- =============================================
CREATE OR REPLACE VIEW cuentas_por_cobrar AS
SELECT
  i."tenantId" AS tenant_id,
  i."customerName" AS client_name,
  i."customerRTN" AS client_rtn,
  i."invoiceNumber" AS invoice_number,
  i."issueDate" AS invoice_date,
  i."dueDate" AS due_date,
  i.total,
  i.status,
  CASE
    WHEN i."dueDate" IS NULL THEN 'SIN_FECHA'
    WHEN i."dueDate" >= CURRENT_DATE THEN 'VIGENTE'
    ELSE 'VENCIDA'
  END AS estado_cobro,
  CASE
    WHEN i."dueDate" IS NULL THEN 0
    WHEN i."dueDate" >= CURRENT_DATE THEN 0
    ELSE CURRENT_DATE - i."dueDate"
  END AS dias_vencido
FROM "Invoice" i
WHERE i."invoiceType" = 'CUSTOMER'
  AND i.status IN ('ACTIVE', 'PENDING', 'SENT')
ORDER BY i."issueDate";


-- =============================================
-- 14. CUENTAS POR PAGAR (Accounts Payable)
-- =============================================
CREATE OR REPLACE VIEW cuentas_por_pagar AS
SELECT
  i."tenantId" AS tenant_id,
  i."customerName" AS supplier_name,
  i."customerRTN" AS supplier_rtn,
  i."invoiceNumber" AS invoice_number,
  i."issueDate" AS invoice_date,
  i."dueDate" AS due_date,
  i.total,
  i.status,
  CASE
    WHEN i."dueDate" IS NULL THEN 'SIN_FECHA'
    WHEN i."dueDate" >= CURRENT_DATE THEN 'VIGENTE'
    ELSE 'VENCIDA'
  END AS estado_pago,
  CASE
    WHEN i."dueDate" IS NULL THEN 0
    WHEN i."dueDate" >= CURRENT_DATE THEN 0
    ELSE CURRENT_DATE - i."dueDate"
  END AS dias_vencido
FROM "Invoice" i
WHERE i."invoiceType" = 'EXPENSE'
  AND i.status IN ('ACTIVE', 'PENDING', 'SENT')
ORDER BY i."issueDate";


-- =============================================
-- 15. FLUJO DE EFECTIVO MENSUAL
-- =============================================
CREATE OR REPLACE VIEW flujo_efectivo_mensual AS
SELECT
  t.tenant_id,
  DATE_TRUNC('month', t.date) AS mes,
  SUM(CASE WHEN t.type = 'INGRESO' OR t.voucher_type = 'INGRESO' THEN t.total_amount ELSE 0 END) AS ingresos,
  SUM(CASE WHEN t.type = 'EGRESO' OR t.voucher_type = 'EGRESO' THEN ABS(t.total_amount) ELSE 0 END) AS egresos,
  SUM(CASE WHEN t.type = 'INGRESO' OR t.voucher_type = 'INGRESO' THEN t.total_amount ELSE 0 END) -
  SUM(CASE WHEN t.type = 'EGRESO' OR t.voucher_type = 'EGRESO' THEN ABS(t.total_amount) ELSE 0 END) AS flujo_neto
FROM "Transaction" t
GROUP BY t.tenant_id, DATE_TRUNC('month', t.date)
ORDER BY mes DESC;


-- =============================================
-- DONE - 15 vistas con calculo por naturaleza
-- =============================================
