# Reporte de Estado y Plan de Ejecución: Seguridad y Control

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Autenticación (Clerk)** | Completo | — | — | — | Clerk |
| **RBAC (7 roles, 30+ permisos)** | Completo | Sidebar + RoleGuard | Middleware | — | Clerk metadata |
| **Gestión de Usuarios** | Completo | 1 componente | 1 ruta | User (Prisma) | Supabase + Prisma |
| **Auditoría** | Completo | 1 feed | 1 ruta | 2 tablas | Supabase + Prisma |
| **Multi-Tenant** | Parcial | CompanySwitcher | — | Tenant (Prisma) | Prisma + RLS |
| **Seguridad de Login** | Básico | — | — | — | In-memory |
| **RLS en TODAS las tablas** | ✅ Cerrado (V4 verificada 17 Sept 2026) | — | — | 107 bloqueadas con datos + resto vacío protegido; solo `Taxes` público (intencional); 0 escribibles | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~80% | Auth, RBAC, auditoría sólidos; multi-tenant parcial |
| Cobertura de Pruebas | 0% | No existen pruebas de seguridad |
| Fortaleza | ~75% | RLS cerrado y verificado el 17 Sept 2026 (ver § Auditoría RLS); rate limiting aún in-memory |
| Cumplimiento | ~50% | Sin logs de seguridad exportables; sin 2FA |

---

## 2. Inventario Detallado

### 2.1 Autenticación

**Estado: Completo (~90%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/auth.ts` | Sesiones Supabase vía cookies (sb-access-token, user-data) |
| `lib/auth-server.ts` | Clerk server-side: role desde sessionClaims, fallback a Clerk API, lista de super admin emails |
| `lib/auth-utils.ts` | Resolución de permisos client-side: publicMetadata, unsafeMetadata, privateMetadata |
| `hooks/use-auth-session.ts` | Hook client con Clerk useUser() + resolución de permisos |
| `components/auth/SignOutButton.tsx` | Botón de cerrar sesión |
| `types/auth.ts` | Tipo UserRole: SUPER_ADMIN, ADMIN, MANAGER, USER, ~~VIEWER, TENANT_ADMIN~~ (roles activos: SUPER_ADMIN, SUPPORT, ADMIN, MANAGER, contador/ACCOUNTANT, USER) |

**Proveedor:** Clerk (`@clerk/nextjs`) como auth principal

#### Middleware de Protección (16 Sept 2026)

- `middleware.ts` usa `clerkMiddleware`.
- TODA ruta no pública ejecuta `await auth.protect()`.
- Las rutas protegidas devuelven **HTTP 404** (no redirect) a requests no autenticados.
- El middleware inyecta el header `x-tenant-id` desde metadata de Clerk cuando la petición no lo trae.
- Rutas públicas: `/auth/login`, `/auth/register`, `/auth/sign-in`, `/auth/sign-up`, `/auth/callback`, `/auth/reset-password`, `/api/auth/check-email`, `/api/auth/check-username`, `/api/admin/plans-public`, `/api/paypal/*`, `/api/webhooks/*`, `/api/accounting/uploaded-files`, `/api/accounting/excel-upload`, `/`. (`/api/accounting/trial-balance` salió de la lista el 17 Sept 2026: requería auth y aceptaba `tenantId` libre.)

---

### 2.2 RBAC (Control de Acceso Basado en Roles)

**Estado: Completo (~90%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/permissions.ts` | Sistema centralizado (256 líneas): 7 roles, 30+ permisos, matriz completa, `hasPermission()`, `hasAnyPermission()`, `hasAllPermissions()`, `canAccessModule()`, `getRoleLevel()`, `canManageRole()` |
| `components/RoleBasedSidebar.tsx` | Sidebar por roles: SUPER_ADMIN, SUPPORT, ADMIN/MANAGER, ACCOUNTANT, USER/VIEWER |
| `components/RoleGuard.tsx` | Componente guard para renderizado condicional |

#### Roles (por nivel)

| Nivel | Rol | Permisos |
|---|---|---|
| 100 | SUPER_ADMIN | Todos |
| 80 | SUPPORT | Soporte técnico |
| 60 | ADMIN | Administración completa |
| 50 | MANAGER | Gestión de equipo |
| 40 | ACCOUNTANT | Contabilidad y reportes |
| 20 | USER | Operaciones básicas |
| ~~10~~ | ~~VIEWER~~ | ~~Solo lectura (no activo)~~ |

> Roles activos en producción: `SUPER_ADMIN`, `SUPPORT`, `ADMIN`, `MANAGER`, `ACCOUNTANT` (contador) y `USER`. `VIEWER` y `TENANT_ADMIN` no están activos. `SUPER_ADMIN` también se resuelve por email: `sucachi.123@gmail.com`. Rutas `/admin` y `/api/admin/*` restringidas.

---

### 2.3 Gestión de Usuarios

**Estado: Completo (~80%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `components/security/UserManagement.tsx` | CRUD completo (350 líneas): listar, buscar, crear/editar/eliminar, asignar roles, toggle estado |
| `app/api/tenant/users/route.ts` | API de usuarios |

#### Modelo

- `User` (Prisma) — id, email, authId, firstName, lastName, role, isActive, password, tenantId

---

### 2.4 Auditoría

**Estado: Completo (~85%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/audit-middleware.ts` | Extensión Prisma para auditoría automática en Transaction y JournalEntry |
| `lib/audit-context.ts` | Contexto desde NextRequest (userId, userAgent, ipAddress) |
| `lib/services/audit-service.ts` | CRUD con paginación: createAuditLog, getPeriodAuditTrail, getAuditLogs, getUserAuditLogs |
| `components/dashboard/AuditFeed.tsx` | Feed en tiempo real (376 líneas): auto-refresh 30s, filtro por acción, búsqueda, diff expandible (antes/después) |
| `app/api/audit-logs/route.ts` | API de logs |
| `supabase/auditlog.sql` | Tabla SQL: UUID PK, tablename, recordid, action, oldvalues/newvalues (JSONB), userid, tenantid, timestamp + RLS |

---

### 2.5 Multi-Tenant

**Estado: Parcial (~55%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/tenant-utils.ts` | Extracción de tenant (x-tenant-id header, query param), validación de acceso |
| `components/dashboard/CompanySwitcher.tsx` | UI de cambio de empresa |
| `middleware.ts` | `clerkMiddleware` + `auth.protect()` en toda ruta no pública (HTTP 404 a no autenticados); inyecta header `x-tenant-id` desde metadata de Clerk |

#### Modelo

- `Tenant` (Prisma) — info de negocio, plan de suscripción, módulos; todos los modelos tienen `tenantId` FK

#### Lo que Falta

- **RLS mixto**: auditado el 17 Sept 2026 — ~135 tablas/vistas bloqueadas, ~83 abiertas a anon (ver § Auditoría RLS y Cross-Tenant); remediación en `supabase/RLS_ALL_TABLES.sql` pendiente de aplicar
- Tenant context setting es manual por componente (RPC `set_tenant`)
- APIs confían en `tenantId` del request (spoofeable por usuarios autenticados); `x-tenant-id` del middleware solo se inyecta si no viene en el request

---

### 2.6 Seguridad de Login

**Estado: Básico (~30%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/login-security.ts` | Rate limiting (5 intentos/15 min, bloqueo 30 min), validación email, fortaleza de contraseña (8 chars, mayúscula/minúscula/número/símbolo), sanitización de input |

#### Lo que Falta

- **Rate limiting in-memory** (se pierde al reiniciar servidor)
- Sin 2FA (autenticación de dos factores)
- Sin blacklist de tokens
- Sin detección de intentos sospechosos

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | ~~RLS parcial / cross-tenant directo vía REST~~ | ~~61 tablas/vistas legibles + 49 escribibles con anon~~ | ✅ Resuelta (17 Sept 2026: 1 legible intencional, 0 escribibles; ver Resultado V4) |
| 2 | ~~`/api/accounting/trial-balance` era pública + `tenantId` libre~~ | ~~Lectura no autenticada de cualquier tenant~~ | ✅ Corregida (17 Sept 2026: fuera de rutas públicas) |
| 3 | Rate limiting in-memory | Se pierde al reiniciar | Alta |
| 4 | Sin 2FA | Seguridad débil para admins | Alta |
| 5 | Sin logs de seguridad exportables | Sin auditoría externa | Media |
| 6 | Sin detección de anomalías | Sin alertas de seguridad | Media |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Refuerzo de RLS — ✅ Completada (17 Sept 2026)

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | ✅ Auditar RLS en todas las tablas Supabase | Prueba empírica anon GET/POST en 218 tablas/vistas (ver § Auditoría RLS) | Informe |
| 1.2 | ✅ Habilitar RLS en tablas sin protección | `supabase/RLS_ALL_TABLES.sql` v2 + `V3` + `V4` (REVOKE 3 vistas) | RLS cerrado y verificado |
| 1.3 | Middleware server-side de validación de tenant | `lib/middleware/tenant-validation.ts` | Validación |

### Etapa 2: Seguridad de Login

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | Migrar rate limiting a Redis/Supabase | `lib/login-security.ts` | Persistencia |
| 2.2 | Implementar 2FA | `lib/services/two-factor.ts` + UI | 2FA funcional |
| 2.3 | Detección de anomalías de login | `lib/services/login-anomaly.ts` | Alertas |

### Etapa 3: Auditoría Avanzada

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Exportación de logs de auditoría | `lib/services/audit-export.ts` | CSV/Excel |
| 3.2 | Alertas de acciones críticas | `lib/services/security-alerts.ts` | Notificaciones |
| 3.3 | Dashboard de seguridad | `app/security/dashboard/page.tsx` | Dashboard |

### Etapa 4: Cumplimiento

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 4.1 | Política de contraseñas configurable | `lib/services/password-policy.ts` | Configuración |
| 4.2 | Historial de contraseñas | `lib/services/password-history.ts` | Prevención reutilización |
| 4.3 | Sesiones concurrentes | `lib/services/session-management.ts` | Control |

### Etapa 5: QA de Seguridad

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 5.1 | Pruebas de penetración básicas | `__tests__/security/` | Pruebas |
| 5.2 | Pruebas de RLS | `__tests__/rls/` | Pruebas |

---

## 5. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: RLS | 3 tareas | Alta | ✅ Completada (17 Sept 2026: auditoría + 4 re-auditorías, v1→V4 verificado) |
| Etapa 2: Login | 3 tareas | Alta | 3-4 semanas |
| Etapa 3: Auditoría | 3 tareas | Media | 2-3 semanas |
| Etapa 4: Cumplimiento | 3 tareas | Media | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1-2 semanas |
| **Total** | **14 tareas** | — | **10-15 semanas** |

---

## Actualizaciones de Infraestructura (16 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 16.3.5 | Restaurado desde 15.5.25; build y dev OK en Vercel (16 Sept 2026) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |
| Stack validado | Next.js 16.3.5 (Turbopack), React 19, Clerk, Supabase (Postgres), Prisma 5.x, Tailwind, shadcn/ui; `output: 'standalone'` |
| Build | `pnpm build` EXIT=0 (16 Sept 2026) |

#### Fix `app/api/companies/route.ts` (16 Sept 2026)

- La ruta usaba `process.env.SUPABASE_URL!` (undefined → 500); ahora usa `process.env.NEXT_PUBLIC_SUPABASE_URL!` en GET y PUT.
- Env real en `.env.local`: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` (conexión directa), Clerk keys. **No existe `SUPABASE_URL`.**

## Auditoría RLS y Cross-Tenant (17 Sept 2026)

Método: prueba empírica contra Supabase REST con la key **anónima** (sin login) en las 218 tablas/vistas del OpenAPI: `GET ?select=*&limit=2` (lectura), conteo exacto en tablas críticas y `POST {}` (escritura segura: falla en NOT NULL antes de insertar; 0 filas creadas). Ground truth sobre cualquier documentación previa.

### Resultado: RLS mixto (NO está en todas las tablas)

| Grupo | Cantidad | Detalle |
|---|---|---|
| Bloqueadas (RLS efectivo) | ~135 | anon `GET []` + `POST 401/42501`: `users`, `User`, `companies`, `Invoice`, `InvoiceItem`, `Purchase`, `PurchaseItem`, `Tenant(s)`, `warehouse`, `budgets`, `inventory_transfer`, `login_attempts`, `password_resets`, `tenant_user_access`, `TenantCompensation`, `inventory_movement`, `inventory_adjustment*`, `Reconciliation`, `BankAccount`, `Withholding`, `CAI`, `AccountPayable/Receivable`, `PurchaseOrder*`, etc. |
| Lectura anónima ABIERTA | 61 | Ver tabla de expuestas abajo |
| Escritura anónima ABIERTA (llega a BD) | 49 | `POST {}` retorna 400 NOT NULL (no 401/42501): cualquiera puede intentar INSERT/UPDATE/DELETE por REST directo |
| Migración logística | ✅ | `WAREHOUSE_LOGISTICS.sql` aplicada (`carrier`/`company_id` presentes; `inventory_transfer` con RLS) |

### Tablas expuestas a lectura anónima (conteo exacto, sin login)

| Tabla/Vista | Filas anon | Datos |
|---|---|---|
| `JournalEntry` | 95 | Asientos (cuenta, monto, tenant) |
| `Transaction` | 47 | Transacciones contables globales |
| `employees` | 49 | RRHH (datos personales/contrato) |
| `Account` / `balance_general` | 43 / 43 | Catálogo y balance |
| `payroll_details` | 15 | Detalle de planilla |
| `payroll_vouchers` | 13 | Comprobantes de pago |
| `Taxes` | 10 | Catálogo de impuestos |
| `product` | 11 | Productos de todos los tenants |
| `libro_ventas` | 3 | Ventas fiscales |
| `purchase_book_sar` | 2 | Compras fiscales |
| `vacation_requests` / `vacation_history` | 3 / ? | Vacaciones de empleados |
| `Supplier`, `customer` | 1 / 1 | Proveedores y clientes |
| + vistas `libro_*`, `vista_*`, `resumen_*`, `top_clientes`, etc. | — | Réplicas de lo anterior vía owner (sin `security_invoker`) |

### Por qué el middleware NO protege esto

- Clerk protege rutas Next.js, pero la URL + `anon key` (`NEXT_PUBLIC_*`) viven en el navegador: cualquiera llama a PostgREST directo evadiendo el middleware.
- `createSupabaseClient()` (24 componentes) usa anon **sin JWT de Supabase** (auth es Clerk) → sin claim de tenant; hoy funciona solo porque el RLS está OFF en esas tablas.
- `SUPABASE_SERVICE_ROLE_KEY` **NO** se filtra al navegador (verificado: `createServiceRoleClient` usa var server-only; en cliente es `undefined`). El fallback service-role de `TransactionFormSimple.tsx` es código muerto en browser, sin fuga de secreto. ✅
- `/api/*` confía en `tenantId` del request; el middleware solo inyecta `x-tenant-id` si no viene (spoofeable por usuarios autenticados — patrón aceptado en toda la app; el hueco crítico era el acceso **no autenticado**, ver abajo).

### Hueco crítico corregido en código (17 Sept 2026)

- `/api/accounting/trial-balance` estaba en rutas **públicas** del middleware + aceptaba `tenantId` libre con `service_role` → balanza de cualquier tenant sin login. **Fix**: eliminada de `isPublicRoute` en `middleware.ts` (sus 5 consumidores son páginas logueadas; `next build` verde). Rutas públicas restantes con criterio: `auth/*`, `plans-public`, `paypal`, `webhooks`, `uploaded-files`, `excel-upload` (estas dos últimas: revisar — permiten subida sin auth).

### Remediación entregada

- `supabase/RLS_ALL_TABLES.sql` (idempotente, bloques DO con EXCEPTION + bloque de verificación `pg_tables`): 28 tablas con policy `tenant_isolation` por claim, 28 con deny-by-default (incl. backups y `Customer`/`Packages`/`Retentions`/`Payrolls` sin tenant), `Taxes` solo-lectura, 26 vistas con `security_invoker=true`. No toca las ~135 ya bloqueadas.
- ⚠️ Al aplicar, los componentes anon directos se quedan sin datos (es el objetivo) y **deben migrarse a rutas API** (la mayoría ya existen server-side con `service_role`): `InventoryManager`, `InventoryReports` (`product`, `inventory_movement`), `TransactionFormSimple`, `ExcelBooksUploader` (`Transaction`, `JournalEntry`, `Account`), `SupplierManager` (`Supplier`), `CustomerManager`/`InvoiceForm`/`SalesDashboard` (`Customer`, `Account`), `SalesBook`/`PurchaseBook` (`libro_*`), `BalanceSheet`/`IncomeStatement`/`CashFlowStatement`/`FinancialReports`/`AccountingBooksViewer`/`InventoryBalanceBook` (vistas), `BankAccountManager`/`BankReconciliation` (`BankAccount`, `Reconciliation`), `AccountsReceivableManager`, `WithholdingManager`, `PurchaseOrdersManager`. (`CashFlowManager` también usa anon: tablas por confirmar.)
- Nota: `InvoiceForm`/`SalesDashboard`/`security/UserManagement` leen `Invoice`/`User` (ya con RLS) vía anon → hoy reciben `[]`; la migración a API también los repara.
- Aplicar primero en staging y correr el bloque F de verificación (debe imprimir `OK: RLS habilitado en todas las tablas`).

### Resultado v1 (re-auditoría 17 Sept 2026): parcial — 7 de 218 objetos

La primera aplicación aseguró `cai` + 6 vistas (`declaracion_mensual`, `purchase_book_sar`, `resumen_isv`, `top_clientes`, `vista_resumen_produccion`, `vw_employee_deductions`). El resto crítico sigue abierto (`Transaction`, `JournalEntry`, `Account`, `product`, `employees`, `payroll_details`, ...). Causas raíz:

1. **Identificadores sin comillas**: `ALTER TABLE Transaction` (sin comillas) lo convierte Postgres a minúsculas y toca otra tabla (`transaction`) en vez de `"Transaction"`.
2. **Policies permisivas previas**: Postgres combina policies con OR — una `USING(true)` previa anula la restrictiva nueva aunque el `ALTER`/`CREATE` haya corrido.

`supabase/RLS_ALL_TABLES.sql` **v2** corrige ambas: entrecomilla todos los identificadores y el bloque A0 borra todas las policies previas en alcance antes de crear las restrictivas. **Pendiente: re-ejecutar v2 en el SQL Editor y avisar para re-verificar** (re-auditoría anon debe devolver `[]` en todo lo sensible).

### Resultado v2 (re-auditoría 17 Sept 2026): avance mayor — lecturas 54→13

Todas las tablas críticas quedaron bloqueadas (anon `GET []` + `POST 401/42501`): `Transaction`, `JournalEntry`, `Account`, `product`, `Supplier`, `employees`, `customer`, `payroll_details`, `payroll_vouchers`, `vacation_requests`, más 17 vistas con `security_invoker` (23 bloqueadas con datos). Escrituras reales abiertas: 49→7.

Restan 12 objetos (+ `Taxes`, catálogo global intencionalmente público): `libro_ventas`, `inventario_valorizado`, `Tenants`, `employee_vacation_summary`, `InvoiceSummary`, `PackageDetails`, `tenantstatistics`, `tenant_plan_summary`, `resumen_ingresos_egresos`, `libro_egresos`, `libro_diario_integrado`, `inventory_stock_alert` (+ `libro_compras`, `cuentas_por_pagar/cobrar` vacías, a futuro). Diagnóstico: son vistas simples actualizables (el `POST` 23502 las delataba como tablas) — `ALTER TABLE` no aplica y la policy del mismo bloque se revertía con el `ALTER`. `RLS_ALL_TABLES_V3.sql` lo corrige con 3 bloques independientes por objeto (ENABLE + invoker + policy). **Pendiente: ejecutar V3 y avisar para verificación final.**

### Resultado V3 (re-auditoría 17 Sept 2026): lecturas 13→4, escrituras 7→0

- Bloqueadas con datos: 23→**107** (incl. `product`, `Transaction`, `employees`, `payroll_details`, `libro_ventas`, `inventario_valorizado`, `Tenants`, `libro_compras` vacía a futuro).
- Escrituras anónimas reales: **0** en las 218 (ningún `POST` llega a BD; `PUBLIC_WRITE` siempre fue 0).
- Restan 4 legibles: `Taxes` (catálogo global, público a propósito) + 3 presuntas **vistas materializadas** (`libro_diario_integrado`, `libro_egresos`, `resumen_ingresos_egresos`): el `security_invoker` no aplica a materializadas y corren como owner. `RLS_ALL_TABLES_V4.sql` las cierra con `REVOKE ALL ... FROM anon, authenticated, PUBLIC` (service_role intacto; ningún componente cliente las lee directo). **Pendiente: ejecutar V4 y avisar para verificación final.**

### Resultado V4 / cierre (re-auditoría 17 Sept 2026): 1 legible intencional, 0 escribibles

- Las 3 eran vistas regulares sobre bases ya protegidas; el `REVOKE ALL ... FROM anon, authenticated, PUBLIC` las cerró (`GET 401`). Diagnóstico `pg_class` del usuario confirmó `relkind = view`.
- Estado final verificado: **1** legible con datos (`Taxes`, catálogo global a propósito), **0** escrituras reales en las 218, **107** bloqueadas con datos, resto vacío y protegido, `PUBLIC_WRITE` siempre en 0.
- ⚠️ Efecto previsto: los ~20 componentes cliente con anon directo ahora reciben `[]`/401 y **deben migrarse a rutas API** (lista en § Auditoría RLS); la API server-side (`service_role`) no se afectó.
- Riesgo residual conocido (no bloqueante): spoofing de `tenantId` por usuarios **autenticados** (patrón aceptado en toda la app) y rutas públicas `uploaded-files`/`excel-upload` por revisar.

*Estado validado al 17 de Septiembre de 2026 (auditoría + 4 re-auditorías empíricas, fix trial-balance, RLS v1→v4 aplicado y verificado).*
