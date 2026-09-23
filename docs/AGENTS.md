<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# Enterprise-Ready Improvements (18 Sept 2026)

## Quick Reference

| Area | File | Description |
|---|---|---|
| JWT RLS | `lib/supabase-client-jwt.ts` | Supabase client with Clerk JWT for direct RLS |
| Outbox Audit | `lib/audit-middleware.ts`, `supabase/outbox-audit.sql` | Async audit logs via outbox pattern (`audit_outbox`, `to_jsonb`, idempotent) |
| Outbox Fix | `supabase/fix-audit-triggers-jsonb.sql` | Minimal function-only repair (21 Sept 2026): avoids table locks/deadlocks |
| Import Templates Tab | `app/companies/[id]/accounting/page.tsx` | "Plantillas" tab with 6 downloadable Excel import templates |
| Annual Tax Declarations | `app/reports/annual-tax` | Annual ISV/ISR/withholding declarations page |
| Balance Sheet (modern) | `app/companies/[id]/accounting/financial-statements/balance-general` | Balance general per company: Excel/PDF export, liquidity ratios, % of assets |
| Balance Sheet Comparative | `lib/reports/balance-general.ts`, `components/financials/BalanceSheetComparative.tsx` | Period comparatives (prev month / prev year) with variances |
| Income Statement (modern) | `app/companies/[id]/accounting/financial-statements/estado-resultados` | Estado de resultados per company: margins by category, projections, ISR 25%, Excel export |
| Income Statement Comparative | `lib/reports/income-statement.ts`, `components/financials/IncomeStatementComparative.tsx` | Period comparatives (prev month / prev year) with variances, break-even |
| Cash Flow Comparative | `lib/reports/cash-flow.ts`, `components/financials/CashFlowComparative.tsx` | Period comparatives (prev month / prev year), sources/uses analysis, cash projections & runway |
| PDF Cache | `app/api/pdf-export/route.ts` | PDF generation with Supabase Storage caching |
| Zod Validation | `lib/services/transaction-service-enhanced.ts` | Transaction payload validation |
| Fiscal Middleware | `lib/middleware/fiscal-validation.middleware.ts` | CAI validation before saving |
| Period Snapshot | `lib/services/year-end-closing.ts` | Balance snapshots for historical reports |

## Key Commands

```bash
# Create new migration
prisma migrate add <name>

# Deploy to staging first
npm run prisma:migrate:deploy:staging

# Then production
npm run prisma:migrate:deploy:production

# Or both sequentially
npm run prisma:deploy

# Generate Prisma client
prisma generate
```
