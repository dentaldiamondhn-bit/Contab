<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes â€” APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` â€” verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

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
| **Aislamiento multi-empresa** | `lib/tenant-resolver.ts`, `lib/company-scope.ts` | `contextoDeEmpresa()` (valida pertenencia, 400/403) + `filtroEmpresa()`. AÃ­sla por **`company_id`**, no por `tenant_id`: un tenant puede tener varias empresas (`TEST1DS` tiene "test 1" y "test 2") |
| **Roles Contador/Empresario** | `user_company_access`, `company_location` | MembresÃ­a usuarioâ†”empresa (`relationship` = `owner` / `accountant`) y sedes. **1 empresa = empresario, 2+ = contador.** Es la fuente de verdad; `User.tenantid` es legacy |
| **Verificar aislamiento** | `scripts/verificar-aislamiento.mjs`, `scripts/verificar-contexto.mjs` | Solo lectura. El primero: `company_id` y cruce entre empresas. El segundo: sedes, membresÃ­a, `location_id` |
| **Correlativo de factura** | `lib/billing/invoice-number.ts` | `previewInvoiceNumber` / `reserveInvoiceNumber(tenantId, { suelo })`; el servidor es la autoridad |
| **Email de factura** | `lib/email/send.ts`, `lib/email/invoice-email.ts` | EnvÃ­o por Resend con el PDF real adjunto |
| **Stock al vender** | `lib/services/stock-sale.ts` | `checkSaleStock()` / `applySaleStock()`: actualizaciÃ³n optimista e idempotente |

> Las reglas que no se negocian (tenant, lempiras, esquema real, migraciones) estÃ¡n en
> **`AGENTS.md` en la raÃ­z**. El typecheck tiene un baseline de **481** errores: un cambio
> solo estÃ¡ bien si el total no sube de 481.

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
## Progreso de la SesiÃ³n Actual (6 de noviembre de 2026)

### Estado General: 90% Completo

**Fixes Aplicados en esta SesiÃ³n:**
- âœ… Style consistency: primary-50 â†’ bg-secondary en AppSidebar.tsx
- âœ… --accent variable removida de globals.css
- âœ… React hydration mismatch fix (suppressHydrationWarning en <nav>)
- âœ… Layout.tsx: Removed "use client" para Server Component
- âœ… WorkspaceProvider y WorkspaceBar con "use client" aÃ±adido
- âœ… Auth middleware signature fix (headers() vs headers({ req }))
- âœ… MÃ³dulos faltantes creados (client.ts, supabase.ts)
- âœ… 40+ tablas de base de datos Supabase creadas
- âœ… 12 polÃ­ticas RLS implementadas en tablas clave
- âœ… next build exit code 0 (Ã©xito)
- âœ… 298 pÃ¡ginas estÃ¡ticas generadas
- âœ… Clerk authentication configurado con keys de prueba

**Pending:**
- âš ï¸ Permisos de schema pÃºblico (re-aplicables tras reinicio Supabase)
- â³ Testing final de APIs: /api/admin/plans-public, /api/workspace
- â³ Reemplazar favicon.ico con logo archivo

**Progreso Calculado:** 90% - Los fixes crÃ­ticos y de base de datos estÃ¡n completados, pending los Ãºltimos detalles de testing y configuraciÃ³n.

---

## Progreso de la SesiÃ³n Actual (17 de noviembre de 2026)

### Estado General: 92% Completo

**Fixes Aplicados en esta SesiÃ³n:**
- âœ… **CSS duplicado entre `/dashboard` y `/companies/[id]`**: Eliminado layout duplicado `/app/companies/[id]/layout.tsx`; corregido `tieneShellPropio()` en `components/AppFrame.tsx` para que todas las rutas bajo `/companies/[id]/*` compartan el `AppShell` nico (TenantHeader + WorkspaceBar + RoleBasedSidebar). Ahora `/companies/c1-test1` tiene exactamente el mismo tema, header, sidebar y padding que `/dashboard`.
- âœ… **Error 500 en `/api/tenants-api`**: Eliminados casts de TypeScript inválidos (`as Record<string, unknown>`, `as { email?: string }`) de `app/api/tenants-api/route.js` que causaban parsing error `Expected ',', got 'as'` y 500 en `/api/tenants-api`, `/api/workspace` y `/api/user/profile`.
- âœ… **Error 500 en `GET /api/inventory/products` (MigraciÃ³n 041)**: Renombrada tabla `Product` → `product`, renombradas columnas camelCase (`tenantId`→`tenant_id`, `currentStock`→`current_stock`, `companyId`→`company_id`) y aÃ±adidas columnas faltantes (`is_active`, `unit_cost`, `sale_price`, `unit_price`, `current_cost`, `min_stock`, `max_stock`, `tax_rate`, `type`, `unit`, `product_type`, `valuation_method`, `warehouse_id`, `image_url`, `stock_quantity`, `created_at`, `updated_at`, `deleted_at`). Tabla con 0 filas, renombrados seguros.
- âœ… **INSERT roto en `product` por trigger camelCase (MigraciÃ³n 042)**: Eliminado trigger `set_company_id_from_tenantid()` que referenciaba `new."tenantId"` (error `42703 record "new" has no field "tenantId"`); quedado solo trigger snake `trg_set_company_id` que usa `new.tenant_id` y rellena `company_id` vÃ­a `oldest_company_of_tenant()`.

**Pending:**
- âš ï¸ Permisos de schema pÃºblico (re-aplicables tras reinicio Supabase)
- â³ Testing final de APIs: /api/admin/plans-public, /api/workspace
- â³ Reemplazar favicon.ico con logo archivo

**Progreso Calculado:** 92% - Se resolvieron el CSS duplicado, el parsing error de tenants-api y las dos migraciones crÃ­ticas del inventario.
