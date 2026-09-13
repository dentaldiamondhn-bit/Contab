# Reporte Maestro: Estado General del Sistema Contable

> **Fecha:** 13 de Septiembre de 2026
> **Proyecto:** Contab - Sistema Contable Honduras
> **Versión del Análisis:** 1.2

---

## 1. Resumen Ejecutivo

| # | Módulo | Completitud | Estado | Prioridad |
|---|---|---|---|---|
| 1 | Contabilidad (Registro + Estados Financieros + Libros Legales) | ~72% | Parcial | Alta |
| 2 | Control de Asistencia | ~95% | Completo | Alta |
| 3 | Facturación y Ventas | ~55% | Parcial | Crítica |
| 4 | Inventario | ~55% | Parcial | Alta |
| 5 | Compras y Proveedores | ~35% | **Básico** | **Crítica** |
| 6 | Control Financiero | ~35% | Parcial | Alta |
| 7 | Reportes y Análisis | ~75% | Completo | Media |
| 8 | Seguridad y Control | ~80% | Completo | Media |
| 9 | Otras Características | ~35% | Básico | Media |
| 10 | Integración Fiscal | ~55% | Parcial | Crítica |
| 11 | Recursos Humanos | ~95% | Completo | Alta |

**Promedio General del Sistema: ~68%**

### Notas de Actualización (12 Sept 2026)

#### Contabilidad — Auditoría + Balances de Apertura + Módulos Combinados
- **Historial de Auditoría** — Tabla `account_audit_log` almacena cambios inmutables de cuentas. API `GET` en `/api/accounting/audit-logs` con paginación, filtros por acción/código/fecha. UI en `/accounting/audit` con logs agrupados por día (expand/collapse por día), columnas de Hora, Cuenta (código + nombre), Acción, Saldo Anterior/Nuevo, Usuario. Valores anteriores/nuevos se muestran formateados (no JSON crudo). Backfill de entradas existentes.
- **Contabilidad unificada** — "Registro Contable", "Estados Financieros" y "Libros Legales" combinados en un solo módulo "Contabilidad". Las 3 tarjetas en la página de módulos ahora son 1 sola. La página de contabilidad (`/accounting`) muestra acceso directo a las 3 áreas (Registro Contable, Estados Financieros, Libros Legales) desde una tarjeta unificada.
- **Performance optimizado** — `loadCompanyData` en `/companies/[id]/accounting` reescrito: fetches de empresa, companies y tenant en paralelo (1 ronda), luego transacciones, cuentas y archivos en paralelo (2da ronda). De 5-6 fetches secuenciales a 2 rondas paralelas.
- **Balances de Apertura** — Nueva página `/accounting/opening-balances` para gestionar saldos iniciales de cuentas. API `GET/PUT` en `/api/accounting/opening-balances`. Botón "Calcular desde Movimientos" que auto-calcula saldos desde el trial balance existente con matching flexible de códigos (maneja `.` y `-`). SQL migration `ADD_OPENING_BALANCE.sql` agrega columnas `opening_balance` y `opening_balance_date` a `chart_of_accounts`.
- **Balance de Comprobación (fix)** — Fix crítico: `tenantId` faltante en el fetch del trial balance causaba página en blanco. Fechas por defecto cambiadas a año completo (no solo mes actual). Simplificado para no depender de API de opening balances (bloqueada por Clerk en client-side). Montos convertidos de centavos a lempiras.
- **Sidebar "Control de Asistencia"** — Nuevo item de navegación en sidebar para admin y contador, acceso directo a `/hr/attendance/time-clock`.

#### HR Module
- **HR: Dashboard de asistencia** — Página `/hr/attendance/time-clock` reestructurada con 4 tabs: Dashboard (stats + tarjetas de empleados colapsables), Mi Fichaje (reloj personal), Mi Equipo (vista de gerente/supervisor), Horarios (CRUD de plantillas de horario). Empleados ausentes ocultos tras toggle "Ver ausentes". Cards de empleados expandibles con historial de eventos.
- **HR: Plantillas de horario con multi-descanso** — Tabla `work_schedules` soporta hasta 3 descansos (`break2_start/end`, `break3_start/end`). CRUD completo en tab Horarios. Asignación de horario a empleados desde la gestión de horarios.
- **HR: Visibilidad del horario en todos los módulos** — Nombre del horario visible en: página de empleados (card y detalle), nómina (columna Horario), asistencia (dropdown de asignación), resultados de búsqueda de empleados.
- **HR: Reloj de asistencia con roles** — Gerente ve todos los empleados; Supervisor ve sus reportes directos; Empleado solo ficha su tiempo. Selector de usuario persistente en localStorage.
- **HR: Asistencia — Rendimiento N+1 eliminado** — `saveAttendanceRecords` usa PATCH batch (1 request vs N POSTs). Schedules usa PUT batch. `autoMarkFreeDays` y `applyHolidayDefaults` solo guardan registros cambiados.
- **HR: PIP implementado y desplegado** — Módulo completo de Planes de Mejoramiento: 5 tablas SQL, 3 API routes, UI con dashboard/crear/detalle/evaluaciones.
- **HR: Nómina optimizada** — API calls paralelos, memoización, API ligera `/hr/payroll/employees`, paginator de 20 empleados, bridge contable automático.
- **HR: Calendario de vacaciones** — Vista con 3 modos (Día/Semana/Mes), edición/eliminación, aprobación/rechazo directo.
- **HR: Validaciones y seguridad completas** — RLS habilitado en las 28+ tablas HR. API input validation. Employee_code collision-safe.

#### Infraestructura y Despliegue
- **Middleware simplificado** — `middleware.ts` optimizado para Vercel edge runtime (sin llamadas DB ni Clerk API). Auth + routing básico.
- **API `/api/user/profile`** — Ruta para obtener perfil de usuario desde Supabase por `auth_id` (Clerk userId). Auto-crea registro si no existe. Archivo duplicado `route.js` eliminado, `route.ts` creado.
- **Vercel env vars fix** — Clerk `publishableKey` y `secret key` agregadas a Vercel para resolver `MIDDLEWARE_INVOCATION_FAILED`.
- **Vercel SpeedInsights + Analytics** — `<SpeedInsights />` y `<Analytics />` integrados en `app/layout.tsx` para monitoreo de rendimiento.
- **@clerk/clerk-sdk-node eliminado** — Paquete deprecado reemplazado por `lib/clerk-api.ts` (helper REST API directo). 7 scripts y 6 API routes migrados. 0 vulnerabilidades restantes.
- **Supabase lazy init** — `lib/supabase.ts` y `lib/supabase-db.ts` migrados a inicialización lazy (Proxy) para evitar errores de build en Vercel donde `NEXT_PUBLIC_SUPABASE_URL` no está disponible.
- **Next.js downgrade a 15.5.25** — Next.js 16 usa Turbopack por defecto para builds, que no genera `.nft.json` en el entorno Linux de Vercel, causando error `ENOENT` en `onBuildComplete`. Next.js 15 usa webpack y genera el archivo correctamente.
- **next.config.js simplificado** — Removido `turbopack: { root }` (dev-only) y restaurado `output: 'standalone'` para serverless en Vercel.

---

## 2. Progreso por Módulo (Visualización)

```
MÓDULO                        PROGRESO                              ESTADO
─────────────────────────────────────────────────────────────────────────────
1.  Contabilidad              █████████████████████░░░░░░░░░  72%  Parcial
    (Registro + EF + LL)
2.  Control de Asistencia     ████████████████████████████░░  95%  Completo
3.  Facturación y Ventas      ██████████████░░░░░░░░░░░░░░░░  55%  Parcial
4.  Inventario                ██████████████░░░░░░░░░░░░░░░░  55%  Parcial
5.  Compras y Proveedores     █████████░░░░░░░░░░░░░░░░░░░░░  35%  Básico
6.  Control Financiero        █████████░░░░░░░░░░░░░░░░░░░░░  35%  Parcial
7.  Reportes y Análisis       ████████████████████░░░░░░░░░░  75%  Completo
8.  Seguridad y Control       █████████████████████░░░░░░░░░  80%  Completo
9.  Otras Características     █████████░░░░░░░░░░░░░░░░░░░░░  35%  Básico
10. Integración Fiscal        ██████████████░░░░░░░░░░░░░░░░  55%  Parcial
11. Recursos Humanos          ███████████████████████░░░░░░░  95%  Completo
─────────────────────────────────────────────────────────────────────────────
PROMEDIO                      ███████████████████░░░░░░░░░░  68%
```

---

## 3. Estado de Almacenamiento de Datos

### 3.1 Métodos de Almacenamiento por Módulo

| Módulo | Supabase | Prisma | localStorage | JSON Files |
|---|---|---|---|---|
| Contabilidad (Registro + EF + LL) | ✅ | ✅ | — | — |
| Facturación y Ventas | ✅ | ✅ | — | — |
| Inventario | ✅ | — | — | — |
| Compras y Proveedores | Parcial | — | — | **⚠️ JSON** |
| Control Financiero | ✅ | ✅ | — | — |
| Reportes y Análisis | ✅ | — | — | — |
| Seguridad y Control | ✅ | ✅ | — | — |
| Otras Características | ✅ | ✅ | — | — |
| Integración Fiscal | ✅ | ✅ | — | — |
| Recursos Humanos | ✅ | — | — | — |

### 3.2 Problemas de Almacenamiento Críticos

| # | Problema | Módulo | Impacto |
|---|---|---|---|
| 1 | Compras y pagos almacenan en archivos JSON | Compras y Proveedores | Datos no persistentes, no escalable |
| 2 | Dual schema en facturas (lowercase + PascalCase) | Facturación | Inconsistencia de datos |
| 3 | Dual schema en productos (lowercase + PascalCase) | Inventario | Inconsistencia de datos |

---

## 4. Problemas Críticos Consolidados (Top 10)

| # | Problema | Módulos Afectados | Impacto | Prioridad |
|---|---|---|---|---|
| 1 | **Compras usan archivos JSON** en lugar de base de datos | Compras | Datos no persistentes | **Crítica** |
| 2 | **Sin DIAT** (Declaración Informativa de Actividades) | Fiscal, Libros | Incumplimiento SAR | **Crítica** |
| 3 | **Sin notas de crédito/débito** con UI | Facturación | Incumplimiento fiscal | **Crítica** |
| 4 | **JournalEntryForm usa mockData** y no guarda | Contabilidad | Función rota | **Crítica** |
| 5 | **FinancialStatements usa mockData** | Contabilidad | Componente inutilizable | **Crítica** |
| 6 | **Sin presupuestos** | Control Financiero | Sin control presupuestario | Alta |
| 7 | **Sin multi-almacén funcional** | Inventario | Sin logística | Alta |
| 8 | **Sin generación de PDF** real | Múltiples | Sin impresión profesional | Alta |
| 9 | **RLS no confirmado** en todas las tablas | Seguridad | Riesgo cross-tenant | Alta |
| 10 | ~~HR sin tipos TypeScript~~ | ~~Recursos Humanos~~ | ~~Difícil mantenimiento~~ | ✅ Resuelta |

---

## 5. Resumen de Infraestructura por Módulo

### 5.1 UI Pages

| Módulo | Páginas Existentes | Páginas Necesarias | Cobertura |
|---|---|---|---|
| Contabilidad (Registro + EF + LL) | 15 | 19 | 79% |
| Facturación y Ventas | 3 | 7 | 43% |
| Inventario | 1 | 4 | 25% |
| Compras y Proveedores | 2 | 5 | 40% |
| Control Financiero | 1 | 4 | 25% |
| Reportes y Análisis | 9 | 10 | 90% |
| Seguridad y Control | 1 | 3 | 33% |
| Otras Características | 1 | 4 | 25% |
| Integración Fiscal | 5 | 8 | 63% |
| Recursos Humanos | 12 | 12 | 100% |

### 5.2 API Routes

| Módulo | APIs Existentes | APIs Necesarias | Cobertura |
|---|---|---|---|
| Contabilidad (Registro + EF + LL) | 24 | 26 | 92% |
| Facturación y Ventas | 12 | 16 | 75% |
| Inventario | 5 | 8 | 63% |
| Compras y Proveedores | 6 | 10 | 60% |
| Control Financiero | 3 | 6 | 50% |
| Reportes y Análisis | 11 | 12 | 92% |
| Seguridad y Control | 2 | 4 | 50% |
| Otras Características | 2 | 5 | 40% |
| Integración Fiscal | 14 | 18 | 78% |
| Recursos Humanos | 23 | 23 | 100% |

### 5.3 Base de Datos (Tablas/Vistas Supabase + Prisma)

| Módulo | Tablas/Vistas | Estado |
|---|---|---|
| Contabilidad (Registro + EF + LL) | Account, Transaction, JournalEntry, chart_of_accounts (con `opening_balance`, `opening_balance_date`), **account_audit_log** (PK, tenant_id, account_id, account_code, action, old_values JSONB, new_values JSONB, performed_by, performed_at), libro_ventas, libro_compras, resumen_isv, declaracion_mensual, Withholding, cai + 5 vistas financieras | Sólido |
| Facturación y Ventas | invoice, invoiceitem, Invoice, InvoiceItem, customer, cai, talonarios | Dual schema |
| Inventario | Product, product, InventoryMovement, inventory_movement, warehouse | Dual schema |
| Compras y Proveedores | Supplier, PurchaseOrder, PurchaseOrderItem, AccountPayable | JSON files |
| Control Financiero | Reconciliation, Transaction (multi-divisa) | Parcial |
| Reportes y Análisis | Vistas existentes | Sólido |
| Seguridad y Control | User, Tenant, auditlog, account_audit_log | Sólido |
| Otras Características | File, FileProcessing, FileTemplate, FileActivity, CompanyLogo, PushSubscription | Prisma |
| Integración Fiscal | TaxConfig, CustomTaxes, Withholding, cai, talonarios | Sólido |
| Recursos Humanos | employees, employee_history, employee_hr_documents, departments, positions, permission_types, permission_requests, permission_used, attendance (con columna hours DECIMAL 5,2), **time_tracking**, **work_schedules**, attendance_holidays, attendance_deduction_config, attendance_schedules, **employee_teams**, **team_members**, payroll_config, payroll_closed, payroll_deductions, payroll_uploads, pip_plans, pip_goals, pip_evaluations, pip_evidence, pip_attendance_metrics + 2 Storage buckets | **Sólido (29 tablas + 2 buckets desplegados, RLS habilitado)** |

---

## 6. Estimación de Esfuerzo Consolidada

### 6.1 Por Módulo

| Módulo | Etapas | Tareas | Estimación |
|---|---|---|---|
| Contabilidad (Registro + EF + LL) | 5 | 43 | 20-30 semanas |
| Facturación y Ventas | 5 | 15 | 9-13 semanas |
| Inventario | 5 | 14 | 10-14 semanas |
| Compras y Proveedores | 5 | 15 | 10-14 semanas |
| Control Financiero | 5 | 16 | 11-15 semanas |
| Reportes y Análisis | 5 | 14 | 8-12 semanas |
| Seguridad y Control | 5 | 14 | 10-15 semanas |
| Otras Características | 5 | 15 | 9-13 semanas |
| Integración Fiscal | 5 | 14 | 11-16 semanas |
| Recursos Humanos | 5 | 28 | 8-12 semanas |
| **TOTAL** | **50** | **188** | **96-140 semanas** |

### 6.2 Por Etapa (Agregado)

| Etapa | Tareas Agregadas | Estimación |
|---|---|---|
| Etapa 1: Consolidación de Datos / Conexión API | ~44 tareas | 8-12 semanas |
| Etapa 2: Funcionalidad Core / Workflows | ~45 tareas | 12-18 semanas |
| Etapa 3: Integraciones / Automatización | ~45 tareas | 12-18 semanas |
| Etapa 4: Exportación / Reporting / Extras | ~40 tareas | 10-15 semanas |
| Etapa 5: QA / Documentación / Seguridad | ~35 tareas | 8-12 semanas |
| **TOTAL** | **~209 tareas** | **50-75 semanas (con paralelismo)** |

### 6.3 Ruta Crítica (Secuencia Obligatoria)

```
Prioridad 1 (Semanas 1-8):
├── ~~Migrar HR de localStorage a Supabase~~ ✅
├── ~~HR: Crear API de búsqueda de empleados~~ ✅
├── ~~HR: Migrar fotos/docs a Supabase Storage~~ ✅
├── ~~HR: Dashboard de reportes de asistencia~~ ✅
├── Migrar Compras de JSON a Supabase
├── Conectar JournalEntryForm a API real
├── Conectar FinancialStatements a datos reales
└── Crear notas de crédito/débito

Prioridad 2 (Semanas 4-16):
├── Implementar DIAT
├── Presupuestos y Centros de Costo
├── Multi-almacén para Inventario
├── Generación de PDF profesional
└── Exportación Excel para todos los reportes

Prioridad 3 (Semanas 12-24):
├── Workflow de órdenes de compra
├── PIP de Recursos Humanos ✅
├── Calendario de vacaciones ✅
├── Notificaciones por correo real
├── 2FA y seguridad avanzada
└── Reportes programados
```

---

## 7. Dependencias entre Módulos

```
                    ┌─────────────────────┐
                    │   8. SEGURIDAD       │
                    │   (Base transversal) │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
    ┌─────────▼─────────┐ ┌───▼────────┐ ┌────▼──────────────┐
    │ 1. CONTABILIDAD    │ │ 3. FACTU-  │ │ 11. RECURSOS      │
    │ (Registro + EF +   │ │ RACIÓN     │ │     HUMANOS       │
    │  Libros Legales)   │ │            │ │                   │
    └─────────┬─────────┘ └───┬────────┘ └────┬──────────────┘
              │               │                │
    ┌─────────▼─────────┐ ┌───▼────────┐ ┌────▼──────────────┐
    │ 2. CONTROL DE      │ │ 4. INVEN-  │ │ 10. INTEGRACIÓN   │
    │    ASISTENCIA      │ │ TARIO      │ │     FISCAL        │
    └─────────┬─────────┘ └───┬────────┘ └────┬──────────────┘
              │               │                │
    ┌─────────▼─────────┐ ┌───▼────────┐ ┌────▼──────────────┐
    │ 5. COMPRAS Y       │ │ 6. REPORTES│ │ 7. CONTROL        │
    │    PROVEEDORES     │ │ Y ANÁLISIS │ │    FINANCIERO     │
    └───────────────────┘ └────────────┘ └───────────────────┘
```

---

## 8. Resumen de Fortalezas y Debilidades

### 8.1 Fortalezas del Sistema

| Fortaleza | Módulos |
|---|---|
| **Autenticación y RBAC sólidos** | Seguridad (Clerk, 7 roles, 30+ permisos) |
| **Catálogo de cuentas completo** | Contabilidad (3 plantillas, jerárquico, multi-divisa) |
| **Auditoría inmutable de cuentas** | Contabilidad (`account_audit_log`, agrupado por día, expand/collapse, backfill automático) |
| **Centro de reportes robusto** | Reportes (18 reportes, 11 APIs, 5+ charts) |
| **Gestión CAI con alertas** | Fiscal/Facturación (alertas de rango y vencimiento) |
| **Retenciones con PDF legal** | Fiscal (recibo A4 con CAI, leyenda SAR) |
| **Importación bancaria** | Otras (9 bancos hondureños detectados automáticamente) |
| **Proyección de flujo de caja** | Control Financiero (30 días, ponderado por probabilidad) |
| **Cálculos fiscales Honduras** | Fiscal (ISV 15%/18%, ISR progresivo, retenciones) |

### 8.2 Debilidades Críticas

| Debilidad | Módulos Afectados |
|---|---|
| **Almacenamiento en archivos JSON** | Compras y Proveedores |
| **Dual schemas (lowercase/PascalCase)** | Facturación, Inventario |
| **Componentes con mockData** | Contabilidad |
| **0% cobertura de pruebas** | Todos los módulos |
| **Sin generación PDF real** | Múltiples |
| **Sin exportación Excel** | Reportes |
| **Sin DIAT** | Fiscal |

---

## 9. Recomendaciones de Priorización

### Fase 1: Estabilidad de Datos (Semanas 1-6)
1. ~~Migrar HR de localStorage a Supabase~~ ✅ Completada
2. ~~HR: Crear API de búsqueda y dashboard de reportes~~ ✅ Completada
3. ~~HR: Migrar fotos/docs a Supabase Storage~~ ✅ Completada
4. ~~HR: Organigrama interactivo~~ ✅ Completada
5. ~~HR: PIP completo (5 tablas, 3 APIs, UI con stats/filtros/drill-down)~~ ✅ Completada
6. ~~HR: Nómina optimizada (Excel, horas extras por turno, bridge contable)~~ ✅ Completada
7. ~~HR: Filtros avanzados vacaciones + rendimiento empleados/vacaciones/PIP~~ ✅ Completada
8. ~~HR: Asistencia N+1 eliminado (PATCH batch, schedules batch, compacto con departamentos)~~ ✅ Completada
9. Migrar Compras de JSON a Supabase
9. Consolidar dual schemas (Facturación, Inventario)
10. Conectar JournalEntryForm y FinancialStatements a API real

### Fase 2: Cumplimiento Fiscal (Semanas 4-12)
5. Implementar DIAT
6. Crear notas de crédito/débito
7. Integrar retenciones con asientos contables
8. Generación de PDF profesional

### Fase 3: Funcionalidad Core (Semanas 8-20)
9. Presupuestos y centros de costo
10. Multi-almacén para inventario
11. Workflow de órdenes de compra
12. Exportación Excel para reportes

### Fase 4: Automatización (Semanas 16-28)
13. Correo electrónico real (Resend/SendGrid)
14. Notificaciones in-app
15. Reportes programados
16. 2FA y seguridad avanzada

### Fase 5: Calidad (Semanas 24-36)
17. Pruebas unitarias para servicios críticos
18. Pruebas E2E para flujos principales
19. Documentación de API
20. Backup/restore automatizado

---

## 10. Métricas de Salud del Proyecto

| Métrica | Valor Actual | Objetivo |
|---|---|---|
| Completitud Funcional | ~68% | 95% |
| Cobertura de Pruebas | 0% | 70% |
| Persistencia de Datos | ~80% | 100% (sin JSON/localStorage) |
| Integración entre Módulos | ~55% | 80% |
| Exportación (PDF/Excel) | ~30% | 90% |
| Cumplimiento Fiscal Honduras | ~50% | 95% |
| Documentación | ~25% | 70% |

### 10.1 Estado de Infraestructura (8 Sept 2026)

| Componente | Estado | Notas |
|---|---|---|
| Next.js | 15.5.25 | Downgraded desde 16 (Turbopack bug en Vercel) |
| React | 19.x | — |
| Clerk Auth | @clerk/nextjs | @clerk/clerk-sdk-node eliminado (deprecado) |
| Supabase Client | Lazy init | Proxy-based, evita errores de build |
| Vercel SpeedInsights | @2.0.0 | ✅ Integrado |
| Vercel Analytics | @2.0.1 | ✅ Integrado |
| Prisma | 5.20.0 | — |
| Build Output | standalone | Genera .nft.json correctamente |
| Vulnerabilidades npm | **0** | Todas resueltas |
| Build Status | ✅ Passing | Verificado localmente |

---

> **Archivos de reporte individuales:**
> - `REGISTROS_CONTABLES_REPORT.md` (incluido en Contabilidad unificada)
> - `ESTADOS_FINANCIEROS_REPORT.md` (incluido en Contabilidad unificada)
> - `LIBROS_LEGALES_REPORT.md` (incluido en Contabilidad unificada)
> - `CONTROL_ASISTENCIA_REPORT.md` — Reporte de Control de Asistencia
> - `FACTURACION_VENTAS_REPORT.md`
> - `INVENTARIO_REPORT.md`
> - `COMPRAS_PROVEEDORES_REPORT.md`
> - `CONTROL_FINANCIERO_REPORT.md`
> - `REPORTES_ANALISIS_REPORT.md`
> - `SEGURIDAD_CONTROL_REPORT.md`
> - `OTRAS_CARACTERISTICAS_REPORT.md`
> - `INTEGRACION_FISCAL_REPORT.md`
> - `HR_MODULE_REPORT.md`
> - `HR_MODULE_REPORT.md`
