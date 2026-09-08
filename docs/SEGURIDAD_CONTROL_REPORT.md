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
| **RLS en TODAS las tablas** | Parcial | — | — | — | Supabase |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~80% | Auth, RBAC, auditoría sólidos; multi-tenant parcial |
| Cobertura de Pruebas | 0% | No existen pruebas de seguridad |
| Fortaleza | ~60% | Rate limiting in-memory (se pierde al reiniciar); RLS no confirmado en todas las tablas |
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
| `types/auth.ts` | Tipo UserRole: SUPER_ADMIN, ADMIN, MANAGER, USER, VIEWER, SUPPORT, TENANT_ADMIN |

**Proveedor:** Clerk (`@clerk/nextjs`) como auth principal

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
| 10 | VIEWER | Solo lectura |

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
| `middleware.ts` | Tenant resolution en middleware |

#### Modelo

- `Tenant` (Prisma) — info de negocio, plan de suscripción, módulos; todos los modelos tienen `tenantId` FK

#### Lo que Falta

- **RLS no confirmado en todas las tablas** (solo auditlog tiene RLS explícito)
- Tenant context setting es manual por componente (RPC `set_tenant`)
- Sin validación server-side de tenant en todas las APIs

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
| 1 | RLS no confirmado en todas las tablas | Riesgo de acceso cross-tenant | **Crítica** |
| 2 | Rate limiting in-memory | Se pierde al reiniciar | Alta |
| 3 | Sin 2FA | Seguridad débil para admins | Alta |
| 4 | Sin logs de seguridad exportables | Sin auditoría externa | Media |
| 5 | Sin detección de anomalías | Sin alertas de seguridad | Media |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Refuerzo de RLS

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | Auditar RLS en todas las tablas Supabase | `supabase/AUDIT_RLS.sql` | Informe |
| 1.2 | Habilitar RLS en tablas sin protección | Migraciones SQL | RLS activo |
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
| Etapa 1: RLS | 3 tareas | Alta | 2-3 semanas |
| Etapa 2: Login | 3 tareas | Alta | 3-4 semanas |
| Etapa 3: Auditoría | 3 tareas | Media | 2-3 semanas |
| Etapa 4: Cumplimiento | 3 tareas | Media | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1-2 semanas |
| **Total** | **14 tareas** | — | **10-15 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 15.5.25 | Downgraded desde 16.x (bug de Turbopack con .nft.json en Vercel) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |
