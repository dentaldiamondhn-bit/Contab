# Reporte de Estado: Control de Asistencia

> **Fecha de actualización:** 12 de Septiembre de 2026
> **Ruta:** `/companies/[id]/hr/attendance/time-clock`
> **Módulo independiente:** Sí (accesible desde grid de módulos)

---

## 1. Resumen Ejecutivo

| Área | Estado | UI | APIs | DB |
|---|---|---|---|---|
| **Dashboard en tiempo real** | Completo | 1 página (4 tabs) | 4 rutas | 3 tablas |
| **Fichaje de empleados** | Completo | Integrado | 2 rutas | 1 tabla |
| **Vista de equipo** | Completo | Integrado | — | — |
| **Plantillas de horario** | Completo | Integrado | 1 ruta | 1 tabla |
| **Control por roles** | Completo | Integrado | — | — |

**Estado: Completo (~95%)**

---

## 2. Arquitectura del Dashboard

### 2.1 Estructura de Tabs

```
┌─────────────────────────────────────────────────────────┐
│  ⏰ Control de Asistencia - [Empresa]                   │
├──────────┬──────────┬──────────┬────────────────────────┤
│ Dashboard│Mi Fichaje│Mi Equipo │     Horarios           │
├──────────┴──────────┴──────────┴────────────────────────┤
│                                                         │
│  TAB: Dashboard                                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐      │
│  │Presentes│ │ Break   │ │Almuerzo│ │Finalizado│      │
│  │   12    │ │   3     │ │   2    │ │    8     │      │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘      │
│                                                         │
│  ┌─ Empleados en turno (colapsable) ──────────────┐    │
│  │ [Card] Juan Pérez - Gerente - Presente    ▼    │    │
│  │   └─ Historial: 08:00 ENTRADA, 10:15 BREAK    │    │
│  │   └─ [Fichar este empleado]                    │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  ┌─ Ausentes (toggle "Ver ausentes") ─────────────┐    │
│  │ [Card] María López - Empleado - Ausente        │    │
│  └────────────────────────────────────────────────┘    │
│                                                         │
│  TAB: Mi Fichaje                                        │
│  ┌─────────────────────────────────────────────┐       │
│  │  🕐 08:34:21                                │       │
│  │  [▶ ENTRADA] [⏸ BREAK] [▶ REANUDAR]        │       │
│  │  [🍽 ALMUERZO] [⏹ SALIR]                    │       │
│  │  Horas trabajadas: 0h 34m                    │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  TAB: Mi Equipo (solo gerente/supervisor)               │
│  ┌─────────────────────────────────────────────┐       │
│  │  Departamento: Ventas (5 empleados)         │       │
│  │  [Card] Ana - Presente, 4h 12m              │       │
│  │  [Card] Pedro - Break, 2h 45m               │       │
│  └─────────────────────────────────────────────┘       │
│                                                         │
│  TAB: Horarios                                          │
│  ┌─────────────────────────────────────────────┐       │
│  │  [+ Nuevo Horario]                          │       │
│  │  ┌─ Horario Mañana (colapsable) ──────┐    │       │
│  │  │ Entrada: 08:00 | Salida: 17:00     │    │       │
│  │  │ Descanso: 10:00-10:15              │    │       │
│  │  │ Almuerzo: 12:00-13:00              │    │       │
│  │  │ Días: Lun-Sáb                      │    │       │
│  │  │ [Asignar] [Editar] [Eliminar]      │    │       │
│  │  └────────────────────────────────────┘    │       │
│  └─────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────┘
```

---

## 3. Archivos Implementados

| Archivo | Propósito | Líneas |
|---|---|---|
| `app/companies/[id]/hr/attendance/time-clock/page.tsx` | Dashboard completo con 4 tabs | ~1200 |
| `app/api/companies/[id]/hr/attendance/time-tracking/route.ts` | API de fichaje por timestamps | ~150 |
| `app/api/companies/[id]/hr/attendance/schedules/route.ts` | API de horarios por empleado | ~120 |
| `app/api/companies/[id]/hr/work-schedules/route.ts` | API CRUD de plantillas de horario | ~200 |
| `app/api/companies/[id]/hr/teams/route.ts` | API CRUD de equipos | ~180 |
| `app/api/companies/[id]/employees/route.ts` | API de empleados (con work_schedule_id) | ~300 |

---

## 4. Base de Datos

### 4.1 Tablas Utilizadas

| Tabla | Propósito | Relación |
|---|---|---|
| `time_tracking` | Fichajes por timestamps | employee_id → employees |
| `work_schedules` | Plantillas de horario | tenant_id → Tenant |
| `employee_teams` | Sub-equipos por departamento | department → employees |
| `team_members` | Relación empleado-equipo | employee_id → employees |
| `employees` | Empleados (con role, work_schedule_id) | — |

### 4.2 Campos Clave en `employees`

| Campo | Tipo | Valores |
|---|---|---|
| `role` | ENUM | gerente, supervisor, empleado |
| `work_schedule_id` | UUID FK | → work_schedules.id |
| `reports_to` | UUID FK | → employees.id (jefe directo) |

### 4.3 Estructura de `time_tracking`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → Tenant |
| `employee_id` | UUID | FK → employees |
| `date` | DATE | Fecha del fichaje |
| `event_type` | ENUM | entrance, break_start, break_end, lunch_start, lunch_end, end_of_shift, overtime_start, overtime_end |
| `event_time` | TIMESTAMPTZ | Fecha/hora del evento |
| `notes` | TEXT | Notas opcionales |
| `created_at` | TIMESTAMPTZ | Timestamp de creación |

**UNIQUE:** `(tenant_id, employee_id, date, event_type)`

### 4.4 Estructura de `work_schedules`

| Columna | Tipo | Descripción |
|---|---|---|
| `id` | UUID | PK |
| `tenant_id` | UUID | FK → Tenant |
| `name` | TEXT | Nombre del horario |
| `entry_time` | TIME | Hora de entrada |
| `exit_time` | TIME | Hora de salida |
| `break_start` | TIME | Descanso 1 inicio |
| `break_end` | TIME | Descanso 1 fin |
| `break2_start` | TIME | Descanso 2 inicio |
| `break2_end` | TIME | Descanso 2 fin |
| `break3_start` | TIME | Descanso 3 inicio |
| `break3_end` | TIME | Descanso 3 fin |
| `lunch_start` | TIME | Almuerzo inicio |
| `lunch_end` | TIME | Almuerzo fin |
| `free_days` | INTEGER[] | Días libres (0=Dom, 6=Sáb) |
| `created_at` | TIMESTAMPTZ | Timestamp de creación |
| `updated_at` | TIMESTAMPTZ | Timestamp de actualización |

**UNIQUE:** `(tenant_id, name)`

---

## 5. Funcionalidad por Tab

### 5.1 Dashboard (Overview)

- **Stats cards**: Presentes, Break, Almuerzo, Finalizados, Ausentes
- **Sección colapsable** "Empleados en turno": cards expandibles con historial de eventos
- **Toggle** "Ver ausentes": muestra/oculta empleados sin fichaje hoy
- **Fichaje rápido**: botón "Fichar este empleado" desde cualquier card

### 5.2 Mi Fichaje (Personal)

- **Reloj en tiempo real** con segundos
- **Botones de acción**: Entrada, Break, Reanudar, Almuerzo, Salir
- **Cálculo de horas trabajadas** en tiempo real
- **Historial del día**: lista de eventos con timestamps
- **Selector de empleado**: búsqueda por nombre

### 5.3 Mi Equipo (Gerente/Supervisor)

- **Vista por departamento**: empleados agrupados
- **Filtros**: búsqueda por nombre, filtro por departamento
- **Control de fichaje**: permite fichar por otros empleados
- **Indicadores**: horas trabajadas, estado actual

### 5.4 Horarios (CRUD)

- **Crear horario**: nombre, entrada, salidas, hasta 3 descansos, almuerzo, días libres
- **Editar horario**: modificación en modal
- **Eliminar verificación**: antes de eliminar, verifica asignaciones
- **Asignar empleados**: modal con selección múltiple
- **Desasignar empleados**: opción individual
- **Cards colapsables**: vista resumen de cada horario

---

## 6. Control por Roles

| Rol | Puede ver | Puede fichar |
|---|---|---|
| **Gerente** | Todos los empleados | Todos |
| **Supervisor** | Empleados directos (via `reports_to`) | Empleados directos |
| **Empleado** | Solo sí mismo | Solo sí mismo |

---

## 7. APIs

### 7.1 Time Tracking

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/.../time-tracking?date=YYYY-MM-DD` | Obtener fichajes del día |
| POST | `/api/.../time-tracking` | Registrar evento (upsert) |
| DELETE | `/api/.../time-tracking?id=xxx` | Eliminar evento |

### 7.2 Work Schedules

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/.../work-schedules` | Listar plantillas |
| POST | `/api/.../work-schedules` | Crear plantilla |
| PUT | `/api/.../work-schedules` | Actualizar plantilla |
| DELETE | `/api/.../work-schedules` | Eliminar plantilla (verifica asignaciones) |

### 7.3 Attendance Schedules

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/.../attendance/schedules` | Obtener horarios por empleado |
| PUT | `/api/.../attendance/schedules` | Asignar horario a empleado |

---

## 8. SQL Migrations

| Archivo | Propósito |
|---|---|
| `TIME_TRACKING.sql` | Tabla time_tracking con CHECK constraint para event_type |
| `WORK_SCHEDULES.sql` | Tabla work_schedules con UNIQUE tenant+name |
| `ADD_MULTI_BREAKS.sql` | Columnas break2_start/end, break3_start/end |
| `FIX_WORK_SCHEDULES.sql` | Migración idempotente para todas las columnas |
| `ADD_OVERTIME_EVENTS.sql` | Tipos overtime_start/overtime_end en CHECK |
| `EMPLOYEE_TEAMS.sql` | Tablas employee_teams y team_members |

---

## 9. Módulos Relacionados

| Módulo | Conexión |
|---|---|
| **Empleados** | `work_schedule_id` visible en card, detalle y búsqueda |
| **Nómina** | Columna "Horario" en tabla de planilla |
| **Asistencia (config)** | Dropdown de asignación de horarios |
| **Módulos** | Tarjeta "⏰ Control de Asistencia" en grid |

---

## 10. Estado

| Aspecto | Estado |
|---|---|
| UI Dashboard | ✅ Completo |
| Fichaje con roles | ✅ Completo |
| CRUD Horarios | ✅ Completo |
| Multi-descanso | ✅ Completo |
| Asignación a empleados | ✅ Completo |
| Visibilidad cross-module | ✅ Completo |
| RLS | ✅ Habilitado |
| TypeScript | ✅ Sin errores |
| Performance | ✅ Fetches paralelos |
