-- =====================================================
-- VERIFY INDICES CREATED IN FASE 7
-- =====================================================

SELECT indexname, tablename, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('User', 'Account', 'Transaction', 'JournalEntry', 'CAI', 'Invoice', 'Tenant')
ORDER BY tablename, indexname;

-- Expected indices (6 total):
-- 1. idx_user_tenant_id ON "User"("tenantid")
-- 2. idx_account_tenant_id ON "Account"("tenantId")
-- 3. idx_transaction_tenant_id ON "Transaction"("tenantId")
-- 4. idx_journal_entry_tenant_id ON "JournalEntry"("tenantId")
-- 5. idx_cai_tenant_id ON "CAI"("tenant_id")
-- 6. idx_invoice_tenant_id ON "Invoice"("tenantId")

SELECT '✅ idx_user_tenant_id' AS status, 'User' AS table_name WHERE EXISTS (
  SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='User' AND indexname='idx_user_tenant_id'
) UNION ALL
SELECT '✅ idx_account_tenant_id', 'Account' WHERE EXISTS (
  SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='Account' AND indexname='idx_account_tenant_id'
) UNION ALL
SELECT '✅ idx_transaction_tenant_id', 'Transaction' WHERE EXISTS (
  SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='Transaction' AND indexname='idx_transaction_tenant_id'
) UNION ALL
SELECT '✅ idx_journal_entry_tenant_id', 'JournalEntry' WHERE EXISTS (
  SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='JournalEntry' AND indexname='idx_journal_entry_tenant_id'
) UNION ALL
SELECT '✅ idx_cai_tenant_id', 'CAI' WHERE EXISTS (
  SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='CAI' AND indexname='idx_cai_tenant_id'
) UNION ALL
SELECT '✅ idx_invoice_tenant_id', 'Invoice' WHERE EXISTS (
  SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='Invoice' AND indexname='idx_invoice_tenant_id'
);