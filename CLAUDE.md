@AGENTS.md

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Enterprise-Ready Files (18 Sept 2026)

### New Files
- `lib/supabase-client-jwt.ts` — Supabase client with Clerk JWT for RLS
- `supabase/outbox-audit.sql` — Outbox pattern for async audit logs
- `app/api/pdf-export/route.ts` — PDF generation with Supabase Storage caching
- `lib/middleware/fiscal-validation.middleware.ts` — CAI validation middleware

### Modified Files
- `lib/audit-middleware.ts` — Outbox Pattern for audit logs
- `lib/supabase-client-direct.ts` — Added `createSupabaseClientFromRequestHeaders()`
- `lib/services/pdf-export.ts` — Added Supabase Storage caching
- `lib/services/transaction-service-enhanced.ts` — Zod validation
- `lib/services/year-end-closing.ts` — Period closing snapshots
- `prisma/schema.prisma` — Added `OutboxAudit` and `PeriodClosingBalance` models
- `middleware.ts` — Added `x-user-jwt` header
- `package.json` — Added CI/CD migration scripts
