@AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Enterprise-Ready Files (18 Sept 2026)

### New Files
- `lib/supabase-client-jwt.ts` — Supabase client with Clerk JWT for RLS
- `supabase/outbox-audit.sql` — Outbox pattern for async audit logs (`audit_outbox`, idempotent, `to_jsonb`)
- `supabase/fix-audit-triggers-jsonb.sql` — Minimal function-only audit trigger fix (21 Sept 2026)
- `app/api/pdf-export/route.ts` — PDF generation with Supabase Storage caching
- `lib/middleware/fiscal-validation.middleware.ts` — CAI validation middleware

### Modified Files
- `lib/audit-middleware.ts` — Outbox Pattern for audit logs (`audit_outbox` via Prisma)
- `lib/supabase-client-direct.ts` — Added `createSupabaseClientFromRequestHeaders()`
- `lib/services/pdf-export.ts` — Added Supabase Storage caching
- `lib/services/transaction-service-enhanced.ts` — Zod validation
- `lib/services/year-end-closing.ts` — Period closing snapshots
- `prisma/schema.prisma` — Added `AuditOutbox` and `PeriodClosingBalance` models
- `middleware.ts` — Added `x-user-jwt` header
- `package.json` — Added CI/CD migration scripts

### Update (21 Sept 2026)
- `supabase/outbox-audit.sql` — Triggers now use `to_jsonb(NEW/OLD)` + exception guard; script is idempotent (no more `cannot cast type Transaction to jsonb`, no deadlocks 40P01)
- `app/companies/[id]/accounting/page.tsx` — "Plantillas" tab with 6 downloadable Excel import templates
- `components/accounting/ExcelBooksUploader.tsx` — Removed template download buttons
- `app/reports/annual-tax` — New annual ISV/ISR/withholding declarations page
- `lib/reports/balance-general.ts` — Shared balance sheet utils (classification, transform, grouping, liquidity ratios)
- `components/financials/BalanceSheetComparative.tsx` — Independent period comparatives component
- `app/companies/[id]/accounting/financial-statements/balance-general/page.tsx` — Excel + PDF export and integrated liquidity ratios

### Update (22 Sept 2026)
- `lib/reports/income-statement.ts` — Shared income statement (P&L) utils (classification, transform, grouping, category margins, margin summary, run-rate projections, break-even)
- `components/financials/IncomeStatementComparative.tsx` — Independent period comparatives (prev month / prev year) with variances
- `app/companies/[id]/accounting/financial-statements/estado-resultados/page.tsx` — Margin analysis by category, projections (monthly/quarterly/annual, break-even) and integrated period comparatives
