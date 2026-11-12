-- ============================================================
-- CONTAB - Reparar Costo de Ventas en PENDIENTE (múltiples tenants)
-- 4 queries SQL sueltas, totalmente automáticas.
-- Section 1 ya corre sin error. Las Sections 2 y 3 usan los mismos
-- filtros que Section 1, así que no hay necesidad de poner IDs a mano.
-- ============================================================

-- ====== SECTION 1: Diagnóstico - Listar transactions huérfanos por tenant ======
-- Ejecutar primero. Te mostrará cada transaction, su tenant_id y total_amount.
-- Anota los valores si quieres verificarlos después, o solo continua directo.
SELECT
  t.id AS tx_id,
  t.tenant_id,
  t.description,
  t.total_amount,
  (SELECT COUNT(*) FROM "JournalEntry" je WHERE je."transactionId" = t.id) AS je_count
FROM "Transaction" t
WHERE t.description ILIKE '%Costo de ventas%'
  AND NOT EXISTS (SELECT 1 FROM "JournalEntry" je WHERE je."transactionId" = t.id)
ORDER BY t.tenant_id, t.date DESC;

-- ====== SECTION 2: Asegurar accounts 5101 y 1105 para todos los tenants afectados ======
-- Inserta las accounts code='5101' (Costo de Ventas) y '1105' (Inventario)
-- para cada tenant que tenga transactions "Costo de ventas" sin JournalEntry.
-- Es idempotente: si ya existen, no hace nada (NOT EXISTS).
--
-- Query A: Crear account '5101' para todos los tenants afectados:
INSERT INTO "Account" ("tenantId", "code", "name", "type", "createdAt", "updatedAt")
SELECT DISTINCT tenant_id, '5101', 'Costo de Ventas', 'EXPENSE', now(), now()
FROM "Transaction"
WHERE description ILIKE '%Costo de ventas%'
  AND NOT EXISTS (SELECT 1 FROM "JournalEntry" je WHERE je."transactionId" = "Transaction".id);

--
-- Query B: Crear account '1105' para todos los tenants afectados:
INSERT INTO "Account" ("tenantId", "code", "name", "type", "createdAt", "updatedAt")
SELECT DISTINCT tenant_id, '1105', 'Inventario de Mercadería', 'ASSET', now(), now()
FROM "Transaction"
WHERE description ILIKE '%Costo de ventas%'
  AND NOT EXISTS (SELECT 1 FROM "JournalEntry" je WHERE je."transactionId" = "Transaction".id);

-- ====== SECTION 3: Insertar las 2 líneas de JournalEntry para todas las transactions huérfanas ======
-- Inserta la partida doble (débito 5101 + crédito 1105) por cada transaction
-- "Costo de ventas" que no tenga JournalEntry.
-- Usa los mismos filtros de Section 1, así no necesitas poner IDs a mano.
--
-- Query A: Insertar el débito (accountId = 5101):
INSERT INTO "JournalEntry" ("transactionId", "accountId", "tenantId", "amount", "originalAmount", "currency", "exchangeRate", "description")
SELECT "Transaction".id, '5101', "Transaction".tenant_id, ABS("Transaction".total_amount), ABS("Transaction".total_amount), 'HNL', 24.7, 'Costo de ventas - Transaction'
FROM "Transaction"
WHERE "Transaction".description ILIKE '%Costo de ventas%'
  AND NOT EXISTS (SELECT 1 FROM "JournalEntry" je WHERE je."transactionId" = "Transaction".id);

--
-- Query B: Insertar el crédito (accountId = 1105):
INSERT INTO "JournalEntry" ("transactionId", "accountId", "tenantId", "amount", "originalAmount", "currency", "exchangeRate", "description")
SELECT "Transaction".id, '1105', "Transaction".tenant_id, -ABS("Transaction".total_amount), ABS("Transaction".total_amount), 'HNL', 24.7, 'Costo de ventas - Transaction'
FROM "Transaction"
WHERE "Transaction".description ILIKE '%Costo de ventas%'
  AND NOT EXISTS (SELECT 1 FROM "JournalEntry" je WHERE je."transactionId" = "Transaction".id);

-- ====== SECTION 4: Verificación final ======
-- Deve devolver 0 si la reparación fue exitosa en todos los tenants.
SELECT COUNT(*) AS pendientes_costo_ventas
FROM v_transacciones_cierre
WHERE estado = 'PENDIENTE' AND concepto ILIKE '%Costo de ventas%';