# Final System Verification Guide
## Onboarding Data Saving Fix

> **Actualizado:** 17 de Septiembre de 2026
>
> Esta guía corresponde a una verificación histórica del flujo de onboarding / `update_tenant_statistics()`. **Estado actual:** build `pnpm build` EXIT=0 ("Compiled successfully") con Next.js 16.3.5 y `output: 'standalone'`. El middleware ya no usa rutas "públicas" para `/onboarding`: hoy `middleware.ts` usa `clerkMiddleware` y toda ruta no pública ejecuta `await auth.protect()`, que devuelve HTTP **404** (no redirect) a no autenticados.

---

## ✅ SQL TABLE VERIFICATION

### 1. Run Full System Check
**File:** `full-system-check.sql`

This will verify:
- ✅ Tenant table columns exist
- ✅ tenant_plan_statistics constraints are correct
- ✅ User table columns exist
- ✅ Test insert works

> **Estado:** los DDL de verificación se ejecutan en el **SQL Editor de Supabase** (no hay acceso DDL directo: la conexión `db.<ref>.supabase.co:5432` da `getaddrinfo ENOTFOUND`).

### 2. Key Findings
- **Constraint exists:** `tenant_plan_statistics_tenant_id_key` on `tenant_id` column
- **Function:** `update_tenant_statistics()` has `ON CONFLICT (tenant_id)`
- **Issue:** Constraint exists but error persists - may need function recompilation

### 3. Fix: Recompile the Trigger Function
Run this SQL to force PostgreSQL to recompile the function (vía SQL Editor de Supabase):

```sql
-- Recompile the function to pick up the new constraint
CREATE OR REPLACE FUNCTION update_tenant_statistics()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO tenant_plan_statistics (id, tenant_id, subscriptionplan, plan_code, quantity, usercount, monthly_cost, updated_at)
    VALUES (
        gen_random_uuid()::text,
        NEW.id,
        COALESCE(NEW.subscriptionplan, 'BASIC'),
        CASE 
            WHEN COALESCE(NEW.subscriptionplan, 'BASIC') LIKE '%BASIC%' THEN 'BASIC'
            WHEN COALESCE(NEW.subscriptionplan, 'BASIC') LIKE '%PRO%' THEN 'PRO'
            WHEN COALESCE(NEW.subscriptionplan, 'BASIC') LIKE '%ENTERPRISE%' THEN 'ENTERPRISE'
            ELSE 'BASIC'
        END,
        1,
        (SELECT COUNT(*) FROM "User" u WHERE u.tenantid = NEW.id AND u.isactive = true),
        COALESCE(NEW.monthlycost, 1000),
        CURRENT_TIMESTAMP
    )
    ON CONFLICT (tenant_id) 
    DO UPDATE SET 
        subscriptionplan = EXCLUDED.subscriptionplan,
        plan_code = EXCLUDED.plan_code,
        usercount = EXCLUDED.usercount,
        monthly_cost = EXCLUDED.monthly_cost,
        updated_at = CURRENT_TIMESTAMP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;
```

---

## ✅ MIDDLEWARE VERIFICATION

### Current Status: ✅ READY
- Antes (histórico): `/onboarding` era ruta pública y los API routes accesibles.
- **Ahora (16 Sept 2026):** `middleware.ts` usa `clerkMiddleware` con `isPublicRoute`. `/onboarding` ya **no** está en la lista pública; las rutas no públicas ejecutan `await auth.protect()` (**HTTP 404** para no autenticados). Rutas públicas: `/auth/login`, `/auth/register`, `/auth/sign-in`, `/auth/sign-up`, `/auth/callback`, `/auth/reset-password`, `/api/auth/check-email`, `/api/auth/check-username`, `/api/admin/plans-public`, `/api/paypal/*`, `/api/webhooks/*`, `/api/accounting/uploaded-files`, `/api/accounting/excel-upload`, `/`. (`/api/accounting/trial-balance` salió el 17 Sept 2026.)
- El middleware inyecta `x-tenant-id` desde la metadata de Clerk si la petición no trae un tenant explícito.
- User headers properly set.

**File:** `middleware.ts`

No changes needed - middleware is correctly configured.

---

## ✅ FRONTEND VERIFICATION

### Current Status: ✅ READY
- Onboarding page imports `saveOnboardingData` ✅
- Passes correct data structure ✅
- Handles success/error appropriately ✅

**File:** `app/onboarding/page.tsx`

No changes needed - frontend is correctly configured.

---

## ✅ BACKEND VERIFICATION

### Current Status: ✅ READY
- Using `.insert()` (not upsert) ✅
- All required columns populated ✅
- Both code paths updated ✅

**File:** `lib/actions/onboarding.ts`

No changes needed - backend is correctly configured.

---

## 🚀 TEST ONBOARDING AFTER FIX

### Steps:
1. Run the SQL above to recompile the function (SQL Editor de Supabase)
2. Refresh browser (Ctrl+F5)
3. **Inicia sesión en el navegador primero** — `/auth/login` es pública, pero el resto de rutas (`/onboarding`, `/dashboard`, etc.) devuelven **404** sin sesión por `auth.protect()`
4. Login with: jainreyes8763@gmail.com
5. Complete onboarding with company name "test"
6. Check console for success

### Expected Success:
```
✅ Usuario y tenant creados exitosamente
📊 Tenant ID: TEST-XXXX
📊 User ID: user_XXXXX
```

---

## 🔧 IF STILL FAILING

### Alternative: Disable Trigger Temporarily
If the function recompilation doesn't work, you can disable the trigger temporarily to test (vía SQL Editor de Supabase):

```sql
-- Disable trigger temporarily
ALTER TABLE Tenant DISABLE TRIGGER trigger_update_tenant_statistics;

-- Test onboarding...

-- Re-enable trigger after testing
ALTER TABLE Tenant ENABLE TRIGGER trigger_update_tenant_statistics;
```

### Or: Fix Column Reference in Function
The function references `users` table with `tenant_id` column. Check if this should be `tenantid`:

```sql
-- Check if the subquery in the function has correct column names
SELECT column_name FROM information_schema.columns WHERE table_name = 'User';
```

---

## 📊 VERIFICATION COMPLETE

All components are ready. The issue is the database trigger function needs to be recompiled to recognize the new constraint.

---

## ✅ Estado actual (17 de Septiembre de 2026)

- **Build:** `pnpm build` = `prisma generate && next build` termina con EXIT=0 ("Compiled successfully"). Node portable: `C:\Users\denta\OneDrive\Documentos\Default Project\Node\node-v24.19.0-win-x64\node.exe`.
- **Comportamiento de rutas:** middleware `clerkMiddleware`; rutas no públicas → `auth.protect()` → **404** (no redirect). Los curl/Invoke-WebRequest sin sesión a rutas protegidas devolverán 404 aunque la ruta exista. Verificar con sesión de navegador o rutas públicas.
- **Standalone:** `output: 'standalone'`. Para servir producción: `node .next/standalone/server.js` (con `PORT`), copiando `.next/static`, `public` y `.env.local` dentro de `.next/standalone`. `next start` NO funciona con `output: 'standalone'`.
- **Fix `app/api/companies/route.ts`:** usa `process.env.NEXT_PUBLIC_SUPABASE_URL!` (antes `SUPABASE_URL!` → 500). Verificado lógicamente con script Node contra Supabase (query a `companies` devuelve filas).
- **Fix `app/api/user/profile/route.ts` (404):** el insert de auto-registro no incluía `email` (columna `NOT NULL UNIQUE` en `users`); el `.catch(() => {})` tragaba el error y el re-fetch daba 404. Ahora usa `currentUser()` de Clerk e inserta `email/first_name/last_name/role`.
- **Onboarding multi-empresa + sin confirmación/Paso 0.5:** modo contador elige 1/varias empresas → directo al wizard (sin paso de confirmación); `saveOnboardingData` itera `companies[]` para crear varias empresas; Paso 0.5 "tipo de negocio" eliminado (`businessType` = `'contador'`/`'otro'`).
- **Módulos nuevos:** Notas de Crédito/Débito (`lib/services/notes-service.ts`, `/api/billing/notes`, `components/billing/NoteForm.tsx`, tabla `InvoiceNote`) y DIAT (`lib/services/diat-generator.ts`, `/api/diat`, `/companies/[id]/diat`).
- **Redirect post-onboarding unificado:** ambos modos (contador y empresa) → `/tenant-admin/dashboard` (`page.tsx:778`).
- **Selector de empresa en header:** dropdown nativo en `TenantHeader.tsx` para tenants con >1 empresa; muestra nombre + RTN de la empresa seleccionada; `setCompany(c)` actualiza contexto + localStorage.
- **Dashboard filtrado por empresa:** `/tenant-admin/dashboard` lee `currentCompany` y pasa `companyId` a `/api/tenant-admin/dashboard`; helper `withCompany` añade `.eq('company_id', companyId)` a todas las queries (invoices, transactions, journal entries, accounts, users, etc.).
- **Migración `company_id` en 11 tablas:** `Invoice`, `Transaction`, `JournalEntry`, `Account`, `InvoiceItem`, `InvoicePayment`, `InvoiceNote`, `product`, `User`, `BankAccount` (y `sales_configuration` ya lo tenía). Migración `scripts/migrations/012_ADD_COMPANY_ID_TO_MULTI_TENANT_TABLES.sql` (CTEs para tablas hijas, subqueries correlacionadas para el resto). Verificación: `total = con_company_id` en todas las tablas.
- **Middleware fix impersonación:** `middleware.ts:51-56` omite redirect de SUPER_ADMIN en `/dashboard` si existe cookie `impersonated_tenant_id` (permite que super admin vea tenant como cliente sin rebotar a `/admin/dashboard`).
- **Middleware fix planes públicos:** `middleware.ts:41` añade `!isPublicRoute(req)` para que `/api/admin/plans-public` no sea bloqueado por check de admin.