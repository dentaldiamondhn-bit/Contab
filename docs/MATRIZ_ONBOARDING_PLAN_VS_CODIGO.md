# Matriz: Plan de Onboarding vs. Estado Actual del Código

> Comparación del plan documentado en `docs/WORKFLOW_INICIO_SESION_ONBOARDING.md` (§5) contra la implementación real (`app/onboarding/page.tsx`, `lib/actions/onboarding.ts`, `app/api/admin/plans-public/route.ts`, `app/api/tenant/check-user-tenant/route.ts`, `app/auth/callback/page.tsx`).
>
> **Fecha:** 16 de septiembre de 2026
>
> **Estatus:** ✅ Implementado · ⚠️ Parcial (UI sí / persistencia no) · ❌ Falta

---

## 1. Paso 0 / Preliminares

| # | Plan (§5) | Estado actual | Ubicación | Estatus |
|---|---|---|---|---|
| P0.1 | Selección de modo Contador / Empresa | Implementado | `page.tsx:101-114,267-274` | ✅ |
| P0.2 | Contador → confirmación **y luego wizard** | **Cambiado**: se elimina el paso de confirmación — al elegir 1/varias empresas se pasa directo a `startBusinessSetup` (Paso 1 del wizard); guarda en BD con `mode`/rol **ACCOUNTANT** → redirect `/dashboard` | `page.tsx:288,394-400; onboarding.ts:155-157,259,275` | ✅ |
| ~~P0.3~~ | ~~Tipo de negocio (7 opciones)~~ | **Eliminado** del onboarding: `business` entra directo al wizard; `businessType` se fija en `'otro'`/`'contador'` | — | ⛔ |

## 2. Wizard 7 pasos (UI)

| # | Plan (§5.3) | Estado actual | Ubicación | Estatus |
|---|---|---|---|---|
| S1.1 | Datos Empresa (nombre\*, RTN\*, dirección, país, email, teléfonos) | Implementado. **Multi-empresa (modo contador/varias)**: lista con pestañas por empresa + botón "Agregar Empresa" (`Plus`); se valida cada empresa por separado (`RTN` con `isValidRTN` para todas) y se guardan todas en `companies[]` → la primera es la principal. | `page.tsx:424,740-800,1467; onboarding.ts:504` | ✅ |
| S1.2 | "¿Quién lleva la contabilidad?" + omitir Catálogo si tiene contador | Implementado: UI salta el **paso 2 (Catálogo)** cuando `hasAccountant === true` y **se persiste** en `publicMetadata` + `privateMetadata` de Clerk (usuario nuevo/existente y actualización final). La pregunta está **oculta en modo contador** (`selectedMode !== 'accountant'`). | `page.tsx; onboarding.ts:277,287,429,439,528` | ✅ |
| S2.1 | Planes desde `GET /api/admin/plans-public` | Implementado (con fallback si la respuesta no es JSON) | `page.tsx:245-265`; `plans-public/route.ts` | ✅ |
| S2.2 | Multi-selección + resumen subtotal/ISV 15%/total | Implementado | `page.tsx:282-290,724-766` | ✅ |
| S2.3 | Obligatorio elegir ≥1 plan (desabilita "Siguiente") | Implementado | `page.tsx:1267-1271` | ✅ |
| S3.1 | Catálogo de cuentas: selección individual + "seleccionar/deseleccionar todas" | Implementado (UI). **En modo contador/varias** el catálogo es **por empresa**: pestañas por compañía, cada una con su propia selección (`accountCatalogs[]` / `catalogCompanyIndex`). | `page.tsx:312,461-478,991-1040` | ✅ |
| S3.2 | Cuentas elegidas **guardadas en `chart_of_accounts`** | Implementado: `saveOnboardingData` recibe `selectedAccounts` y `createDefaultChartOfAccounts(companyId, selectedAccounts?)` inserta la selección del usuario mapeando `activo→ASSET`, `pasivo→LIABILITY`, `patrimonio→EQUITY`, `ingreso→REVENUE`, `gasto→EXPENSE`. Códigos UI y catálogo por defecto **alineados al formato estándar** (`110101` Caja General, `110201` Clientes…). Sin selección → catálogo HN/SAR por defecto. | `onboarding.ts:663-665,701-747; page.tsx:126-158,335` | ✅ |
| S4.1 | Imagen: logo opcional (JPG/PNG/SVG ≤2MB) | Implementado y **persistido**. Subida real a Supabase Storage (bucket privado `company-logos`) con barra de progreso; se guarda el **path** en `companies.logo_url`. **Por empresa** en modo contador/varias (`logoPreviews[]` / `logoCompanyIndex`). | `page.tsx`; `logo-upload/route.ts` | ✅ |
| S5.1 | Config. Ventas: CAI, tipo, código, **tasas múltiples** (ISV/IT/IVA/ISR/Exento/Otro), prefijo | UI completa. **Por empresa** en modo contador/varias (pestañas por compañía; `salesConfigs[]` / `salesCompanyIndex`). | `page.tsx` | ✅ |
| S5.2 | **Persistir** configuración de ventas en `sales_configuration` | Implementado **por empresa** dentro del loop: `salesConfigs[índice].company_id` guarda `cai_enabled`, `cai_type`, `cai_code`, `tax_rate` (primera tasa), `invoice_prefix`. Las tasas múltiples se persisten en la tabla **`Taxes`** (nivel tenant, deduplicadas por tipo+tasa; mapeo `TAX_TYPE_MAP` cumple el CHECK `IVA|ISR|ISV|OTRO`). | `onboarding.ts` | ✅ |
| S6.1 | Términos: lectura + checkbox obligatorio + link `/terms` | Implementado | `page.tsx:979-1026` | ✅ |
| S7.1 | Método de pago: tarjeta/PayPal/Google/Stripe con modales + resumen | Implementado (UI+captura local de datos) | `page.tsx:1029-1651` | ✅ |
| S7.2 | `paymentMethod` en metadata Clerk | Implementado | `onboarding.ts:243,393` | ✅ |
| S7.3 | Excepción Stripe → `/api/stripe/checkout` (`planPrice`, `customerEmail`, `tenantId`) | Implementado | `page.tsx:343-369` | ✅ |

## 3. Navegación (§5.4)

| # | Plan | Estado | Estatus |
|---|---|---|---|
| N1 | Anterior / Volver | Implementado (`page.tsx:1243-1256`) | ✅ |
| N2 | Siguiente deshabilitado sin contador / sin plan / sin términos | Implementado: bloquea en paso 1 (contador + datos/RTN válido), paso 6 (**sin plan**) y paso 5 (**sin aceptar términos**). | ✅ |
| N3 | "Saltar y Finalizar" / "Finalizar Configuración" | Implementado (`page.tsx:1275-1284`) | ✅ |
| N4 | Ancho de la barra de progreso con pasos filtrados | Adaptado: usa divisor 7 (`page.tsx:864`) | ✅ |

## 4. `saveOnboardingData` (§5.5)

| # | Plan | Estado actual | Estatus |
|---|---|---|---|
| D1 | Verificar sesión | `onboarding.ts:102-105` | ✅ |
| D2 | Email/nombre desde Clerk | `onboarding.ts:110-134` | ✅ |
| D3 | Buscar usuario por `authid`; crearlo si falta | `onboarding.ts:136-155` | ✅ |
| D4 | Crear Tenant (código 6 letras + 2 aleatorios, BASIC, max 5, módulos) | `onboarding.ts:72-98,158-213` | ✅ |
| D5 | Crear/actualizar `User` rol ADMIN | Implementado con rol dinámico: contador → `ACCOUNTANT` + `permissions: ['accountant','tenant_admin']`; empresa → `ADMIN` + `['admin','tenant_admin']`. En metadata Clerk también. | `onboarding.ts:155-157,259,272,275,424,427` | ✅ |
| D6 | Metadata Clerk (`role`, `tenantId`, `tenantCode`, `permissions`, `paymentMethod`, `isolation`) + privada (`onboardingCompleted`, `companyId`) | `onboarding.ts:233-259,383-408,483-496` | ✅ |
| D7 | Crear empresa en `companies` | Implementado. **Loop por empresas**: `data.companies ?? [data.companyData]`; en modo contador/varias inserta todas las empresas con `onboarding_companies` por cada una; la primera queda como principal. | `onboarding.ts:504-549` | ✅ |
| D8 | Guardar cuentas bancarias | `onboarding.ts:499-516` | ✅ |
| D9 | Guardar configuración de ventas | **Por empresa** dentro del loop: `sales_configuration.company_id` con `cai_enabled`, `cai_type`, `cai_code`, `tax_rate`, `invoice_prefix` (usa `salesConfigs[índice]`). Tasas múltiples en tabla **`Taxes`** (nivel tenant, deduplicadas). | `onboarding.ts` | ✅ |
| D10 | Guardar planes en `tenant_plans` | `onboarding.ts:542-567` | ✅ |
| D11 | `onboarding_companies` con `setup_completed:true` | `onboarding.ts:578-597` | ✅ |
| D12 | Crear catálogo por defecto | Se respeta la selección **por empresa**: `createDefaultChartOfAccounts(companyId, selectedAccountsList?.[índice] ?? selectedAccounts)` inserta el catálogo individual de cada empresa o usa el default HN/SAR | `onboarding.ts:717-805` | ✅ |
| D13 | No bloquear si algo falla (respaldo `localStorage`) | Implementado (`onboarding.ts:610-615`; `page.tsx:305-315`) | ✅ |

## 5. Redirección final (§5.6)

| # | Plan | Estado | Estatus |
|---|---|---|---|
| R1 | `router.push('/tenant-admin/dashboard')` | Implementado — **ambos modos** (empresa y contador) → `/tenant-admin/dashboard` (`page.tsx:778`) | ✅ |
| R2 | Stripe → checkout antes que dashboard | Implementado (`page.tsx:705-731`) | ✅ |

## 6. Selector de empresa / multi-empresa en dashboard

| # | Funcionalidad | Estado | Estatus |
|---|---|---|---|
| E1 | Dropdown de empresa en header (`TenantHeader.tsx`) | Implementado con `<select>` nativo; visible si `companies.length > 1` | ✅ |
| E2 | Header muestra nombre de empresa seleccionada + RTN | Implementado (`TenantHeader.tsx:122-135`) | ✅ |
| E3 | Cambio de empresa → `setCompany(c)` actualiza contexto + localStorage | Implementado (`TenantContext.tsx:301-306`) | ✅ |
| E4 | Dashboard `/tenant-admin/dashboard` lee `currentCompany` y pasa `companyId` | Implementado (`tenant-admin/dashboard/page.tsx:41-65`) | ✅ |
| E5 | API `/api/tenant-admin/dashboard` filtra por `company_id` (helper `withCompany`) | Implementado (`tenant-admin/dashboard/route.ts:21`) | ✅ |
| E6 | Métricas (KPIs, AR aging, cash flow, top clients, tax alerts) filtradas por empresa | Implementado (todas las queries usan `withCompany`) | ✅ |

## 7. Migración `company_id` en tablas multi-tenant

| # | Tabla | `company_id` + índice | Backfill | Estatus |
|---|---|---|---|---|
| M1 | `Invoice` | ✅ | Subquery correlacionada | ✅ |
| M2 | `Transaction` | ✅ | Subquery correlacionada | ✅ |
| M3 | `JournalEntry` | ✅ | Subquery correlacionada | ✅ |
| M4 | `Account` | ✅ | Subquery correlacionada | ✅ |
| M5 | `InvoiceItem` | ✅ | CTE → subquery correlacionada | ✅ |
| M6 | `InvoicePayment` | ✅ | CTE → subquery correlacionada | ✅ |
| M7 | `InvoiceNote` | ✅ | CTE → subquery correlacionada | ✅ |
| M8 | `product` | ✅ | Subquery correlacionada | ✅ |
| M9 | `User` | ✅ | Subquery correlacionada | ✅ |
| M10 | `BankAccount` | ✅ | Subquery correlacionada | ✅ |
| M11 | `sales_configuration` | Ya existía (PK) | N/A | ✅ |

**Migración:** `scripts/migrations/012_ADD_COMPANY_ID_TO_MULTI_TENANT_TABLES.sql` (ejecutar en Supabase SQL Editor por bloques para evitar deadlocks).
**Verificación:** `total = con_company_id` en todas las tablas.

---

## 6. Brechas detectadas (todas resueltas)

1. **S3.2/D12 — Persistir la selección del catálogo de cuentas**: `saveOnboardingData` debe recibir las cuentas elegidas por el usuario y guardarlas en `chart_of_accounts` (usar la función SQL `create_default_chart_of_accounts` como plantilla o insertar la selección real mapeando los tipos `activo/pasivo/patrimonio/ingreso/gasto` → `ASSET/LIABILITY/EQUITY/REVENUE/EXPENSE`). ✅
2. **S5.2/D9 — Persistir configuración completa de ventas**: guardar `cai_type`, `cai_code` y las tasas múltiples (hoy solo la primera) en `sales_configuration` / tabla `Taxes`. ✅
3. **P0.2/D5 — Modo Contador**: cumplir el plan — entrar al wizard **(ya no hay paso de confirmación)** al elegir 1/varias empresas, asignar rol `ACCOUNTANT` y redirigir a `/dashboard`. ✅
4. **S1.2 — Persistir `hasAccountant`**: guardar la preferencia (BD o metadata Clerk) para que no se pierda tras el wizard. ✅

---

## 7. Estado de las correcciones (16 de septiembre de 2026)

> Las 4 brechas fueron corregidas en esta fecha:

| Brecha | Corrección aplicada | Archivo |
|---|---|---|
| S3.2/D12 | `saveOnboardingData` ahora recibe `selectedAccounts` y `createDefaultChartOfAccounts(companyId, selectedAccounts?)` inserta la selección del usuario (mapeando `activo→ASSET`, `pasivo→LIABILITY`, `patrimonio→EQUITY`, `ingreso→REVENUE`, `gasto→EXPENSE`). La UI y el catálogo por defecto comparten la **misma codificación de códigos** (`110101`, `110201`…). Sin selección, usa el catálogo por defecto HN/SAR. | `lib/actions/onboarding.ts`, `app/onboarding/page.tsx` |
| S5.2/D9 | `sales_configuration` ahora guarda `cai_type` y `cai_code`; las tasas múltiples se registran en la tabla **`Taxes`** (mapeando IT/Exento/Otro → OTRO para cumplir el CHECK `IVA|ISR|ISV|OTRO`). | `lib/actions/onboarding.ts` |
| P0.2/D5 | El modo Contador entra al wizard (al elegir 1/varias empresas va directo a `startBusinessSetup`, sin confirmación), el action asigna rol `ACCOUNTANT` (en `User` y metadata Clerk) y redirige a `/dashboard`. El modo Empresa conserva rol `ADMIN` y `/tenant-admin/dashboard`. | `app/onboarding/page.tsx`, `lib/actions/onboarding.ts` |
| S1.2 | `hasAccountant` se envía en `saveOnboardingData` y se persiste en `publicMetadata` y `privateMetadata` de Clerk. | `app/onboarding/page.tsx`, `lib/actions/onboarding.ts` |

> Nota: las tasas del onboarding se insertan en la tabla `Taxes` (schema en `scripts/migrations/CUSTOMER_TABLE_WORKING.sql`, columns `id, tenantid, name, type, rate, description, isactive, createdat, updatedat`), con `type` dentro del CHECK `('IVA','ISR','ISV','OTRO')`. El catálogo de cuentas UI y el por defecto comparten la misma codificación de códigos.

---

## 8. Ajustes de consistencia (codificación de códigos y tabla de impuestos)

> Aplicados el 16 de septiembre de 2026 para eliminar inconsistencias entre la UI, el SQL de referencia y el guardado en BD:

| Aspecto | Antes | Ahora |
|---|---|---|
| **Códigos del catálogo UI** (`page.tsx`) | `1.1.01`, `1.2.01`, `5.2.01`… (formato con puntos) | `110101`, `110201`, `510201`… (formato numérico estándar, mismo conjunto que el catálogo por defecto) |
| **Catálogo por defecto en `createDefaultChartOfAccounts`** (`onboarding.ts`) | `11`, `1101`, `110101`… mezclaba niveles de jerarquía y nombres distintos a la UI | Misma codificación y nombres que la UI: `110101` Caja General, `110201` Clientes, `210101` Proveedores, `310101` Capital Social, `410101` Ventas de Mercadería, `510101` Costo de Ventas… |
| **Persistencia de tasas múltiples** | Insertaba en `CustomTaxes` | Inserta en la tabla **`Taxes`** del módulo de contabilidad (columns `tenantid`, `name`, `type`, `rate`, `description`, `isactive`, `createdat`, `updatedat`), con `type` mapeado por `TAX_TYPE_MAP` para respetar el CHECK `IVA|ISR|ISV|OTRO` (ISV/IVA/ISR directo; IT/Exento/Otro → OTRO) |

> Resultado: selección del usuario y catálogo por defecto producen exactamente los mismos códigos de cuenta, y las tasas configuradas en el wizard quedan visibles en `/accounting/taxes`.

---

## 9. Fixes multi-empresa dashboard (17 sep 2026)

| # | Fix | Archivo | Descripción |
|---|---|---|---|
| F1 | Eliminar `TenantProvider` anidado | `app/tenant-admin/layout.tsx` | Provider anidado creaba contexto separado; header cambiaba empresa en contexto root pero dashboard usaba contexto anidado (desactualizado). Quitado provider anidado. |
| F2 | Restaurar header en `/tenant-admin` | `app/tenant-admin/layout.tsx` | Al quitar provider anidado se perdió header. Restaurado `<TenantHeader />` sin provider anidado. |
| F3 | Debug API dashboard | `app/api/tenant-admin/dashboard/route.ts` | Logs de debug para verificar filtrado por `company_id` (helper `withCompany` con subqueries correlacionadas). |
| F3 | Fix middleware impersonación | `middleware.ts:51-56` | Omite redirect SUPER_ADMIN en `/dashboard` si existe cookie `impersonated_tenant_id`. |
| F4 | Fix middleware planes públicos | `middleware.ts:41` | Añade `!isPublicRoute(req)` para que `/api/admin/plans-public` no sea bloqueado por check admin. |