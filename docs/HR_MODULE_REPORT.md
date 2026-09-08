# Reporte de Estado y Plan de Ejecución: Módulo de Recursos Humanos

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Área Funcional | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Gestión de Personal** | Completo | 4 páginas | 3 rutas | 5 tablas | Supabase + API |
| **Control de Asistencia** | Completo | 1 página | 4 rutas | 4 tablas | Supabase + API |
| **Vacaciones y Permisos** | Completo | 1 página | 3 rutas | 3 tablas | Supabase + API |
| **Cálculo de Planilla (Nómina)** | Completo | 1 página | 3 rutas | 3 tablas | Supabase + API |
| **Planes de Mejoramiento (PIP)** | No Iniciado | 0 | 0 | 0 | N/A |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~80% | 4 de 5 áreas completas (1 API CRUD + 3 migradas a Supabase), 1 sin iniciar |
| Cobertura de Pruebas | 0% | No existen pruebas unitarias ni E2E para HR |
| Estabilidad y Validaciones | ~70% | Validaciones en UI + Supabase RLS + unique constraints |
| Persistencia de Datos | ~100% | Toda la data persiste en Supabase via API routes |
| Integración entre Módulos | ~40% | Asistencia alimenta planilla; no hay integración con contabilidad |
| Documentación y Tipado | ~25% | Sin tipos TypeScript dedicados para HR; sin documentación de API |

---

## 2. Inventario Detallado por Área

### 2.1 Gestión de Personal (Empleados)

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/employees/page.tsx` | UI completa de gestión de empleados: CRUD, pestañas (Personal, Trabajo, Académico, Habilidades, Ficha Médica, Documentos, Doc. RRHH, Historial), modales de desactivar/suspender/reactivar, importación CSV |
| `app/companies/[id]/hr/departments/page.tsx` | Gestión de departamentos y cargos con vista jerárquica en árbol, CRUD, rangos salariales |
| `app/companies/[id]/hr/hierarchy/page.tsx` | Visor de jerarquía organizacional con asignación de padres-cargos |
| `app/companies/[id]/hr/page.tsx` | Dashboard de RRHH con tarjetas resumen (empleados activos, planilla mensual, deducciones, solicitudes pendientes) |
| `app/api/companies/[id]/employees/route.ts` | API CRUD completa (GET/POST/PUT/DELETE) para empleados vía Supabase |
| `app/api/companies/[id]/hr/departments/route.ts` | API CRUD para departamentos (Supabase) |
| `app/api/companies/[id]/hr/positions/route.ts` | API CRUD para cargos (Supabase) |
| `app/api/companies/[id]/hr/storage/route.ts` | API de upload/delete para fotos y documentos en Supabase Storage |

#### Tablas de Base de Datos (Supabase SQL)

- `employees` — Esquema completo con 50+ columnas: datos personales, contrato, educación, habilidades, seguridad social, documentos, médico, campos de terminación/suspensión/reactivación
- `employee_history` — Registro de auditoría para cambios en empleados
- `employee_hr_documents` — Almacenamiento de documentos RRHH por empleado
- `departments` — Departamentos jerárquicos con parent_id
- `positions` — Cargos jerárquicos con rangos salariales y parent_id

#### Supabase Storage (Buckets)

- `employee-photos` — Público, max 5MB, formatos: JPG/PNG/WebP/GIF. Fotos de perfil de empleados
- `employee-documents` — Privado, max 10MB, formatos: PDF/DOC/DOCX/JPG/PNG. Documentos de identidad, contratos, CVs, documentos RRHH

#### Funcionalidad Implementada

- CRUD de empleados con perfil completo (personal, trabajo, académico, habilidades, médico, documentos, historial)
- Gestión de departamentos y cargos con jerarquía
- Estados de empleado: activo, inactivo, terminado, suspendido
- Flujo de terminación/suspensión/reactivación con campos de workflow
- Importación CSV/Excel de empleados
- Exportación de empleados a Excel
- Creación automática de cargo al agregar empleado
- Registro de historial de cambios (audit trail)
- Cálculo de vacaciones por antigüedad (ley hondureña: <1yr=0, 1=10, 2=12, 3=14, 4+=20)
- Almacenamiento de fotos y documentos en Supabase Storage (reemplaza base64)
- Upload de archivos vía API con URLs persistentes
- Aislamiento multi-tenant vía Supabase RLS

#### Lo que Falta

- Sin endpoint de búsqueda/filtrado dedicado para empleados
- Sin modelos en Prisma para entidades HR (todo manejado directamente vía SQL en Supabase)
- Sin archivo de tipos TypeScript para entidades HR
- Sin hooks dedicados para datos de empleados

---

### 2.2 Control de Asistencia

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/attendance/page.tsx` | UI completa: vista diaria + quincenal, 9 estados, gestión de feriados, horarios, operaciones masivas, importación CSV/Excel |
| `app/api/companies/[id]/hr/attendance/route.ts` | API CRUD para registros de asistencia (GET/POST/PUT/DELETE) |
| `app/api/companies/[id]/hr/attendance/holidays/route.ts` | API CRUD para feriados |
| `app/api/companies/[id]/hr/attendance/config/route.ts` | API para configuración de deducciones por asistencia |
| `app/api/companies/[id]/hr/attendance/schedules/route.ts` | API CRUD para horarios por empleado |
| `app/api/companies/[id]/hr/attendance/reports/route.ts` | API de datos agregados para reportes (summary, tendencia diaria, ranking empleados, incapacidades, feriados) |
| `app/companies/[id]/hr/attendance/reports/page.tsx` | Dashboard de análisis con gráficos Recharts (tendencia, distribución, horas extra, ranking, incapacidades) |

#### Tablas de Base de Datos

- `attendance` — Registros diarios de asistencia por empleado (status, monto, horas extra, feriados, incapacidades)
- `attendance_holidays` — Feriados nacionales configurables por tenant
- `attendance_deduction_config` — Configuración de deducciones (% ausencia, tardanza, incapacidad, etc.)
- `attendance_schedules` — Horarios por empleado con días libres (INTEGER[])

#### Funcionalidad Implementada

- Vistas diaria y quincenal de asistencia
- 9 estados de asistencia: Presente, Ausente, Tardanza, Vacaciones, Horas Extra, Permiso Sin Sueldo, Incapacidad, Feriado, Día Libre
- Feriados nacionales de Honduras pre-configurados (2026) con tipos de pago doble/triple
- Configuración de horario laboral por empleado (días libres)
- Tipos de incapacidad: 100% patrono, IHSS (33%), Sin pago, Maternidad (84 días)
- Cálculo automático de monto por tardanza/horas extra basado en salario
- Importación de archivo (CSV/XLSX) con mapeo de estados
- Descarga de plantilla para importación
- Deshacer/rehacer (historial de acciones)
- Operaciones masivas (todos presentes, todos ausentes, aplicar feriados)
- Cálculo de pago por feriado (doble/triple)
- Seguimiento de horas extras y montos
- Configuración de deducciones por empleado
- Totales quincenales (deducciones/ingresos)
- Dashboard de análisis con gráficos (tendencia diaria, distribución por estado, horas extra, ranking de empleados)
- Exportación CSV de reportes de asistencia

#### Almacenamiento de Datos

**Todos los datos se persisten en Supabase via API routes:**
- Asistencia: `/api/companies/${companyId}/hr/attendance` → tabla `attendance`
- Horarios: `/api/companies/${companyId}/hr/attendance/schedules` → tabla `attendance_schedules`
- Feriados: `/api/companies/${companyId}/hr/attendance/holidays` → tabla `attendance_holidays`
- Config deducciones: `/api/companies/${companyId}/hr/attendance/config` → tabla `attendance_deduction_config`

#### Lo que Falta

- Sin registro de entrada/salida en tiempo real con timestamps
- Sin verificación biométrica o por GPS

---

### 2.3 Vacaciones y Permisos

**Estado: Completo (~90%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/vacations/page.tsx` | Gestión completa de permisos/ausencias: tipos de permiso, flujo de solicitudes, panel de control, seguimiento de uso, estadísticas/recuento |
| `app/api/companies/[id]/hr/permissions/types/route.ts` | API CRUD para tipos de permiso |
| `app/api/companies/[id]/hr/permissions/requests/route.ts` | API CRUD para solicitudes de permiso |
| `app/api/companies/[id]/hr/permissions/used/route.ts` | API para seguimiento de uso de permisos |

#### Tablas de Base de Datos (Supabase SQL)

- `permission_types` — Tipos de permiso configurables por tenant (vacaciones, personal, enfermedad, especial, sin_sueldo)
- `permission_used` — Seguimiento de uso anual/mensual por empleado por tipo
- `permission_requests` — Flujo de solicitudes con estado (pendiente/aprobado/rechazado)

#### Funcionalidad Implementada en UI

- 5 tipos de permiso por defecto: Vacaciones, Permiso Personal, Enfermedad, Permiso Especial, Sin Goce de Sueldo
- Creación/edición de tipos de permiso personalizados con iconos y colores
- Flujo de solicitud de permiso (crear → pendiente → aprobar/rechazar)
- Seguimiento de uso anual y mensual por empleado
- Barras de progreso mostrando uso vs límites
- Botones de ajuste manual +/- pestaña de estadísticas/recuento: por tipo, por empleado, por mes
- Cálculo automático de días de vacaciones por antigüedad (ley hondureña)
- Registro del nombre del aprobador al aprobar solicitudes
- Tarjetas resumen por tipo de permiso

#### Almacenamiento de Datos

**Todos los datos se persisten en Supabase via API routes:**
- Tipos: `/api/companies/${companyId}/hr/permissions/types` → tabla `permission_types`
- Solicitudes: `/api/companies/${companyId}/hr/permissions/requests` → tabla `permission_requests`
- Uso: `/api/companies/${companyId}/hr/permissions/used` → tabla `permission_used`

#### Lo que Falta

- Sin notificaciones por correo electrónico para aprobación/rechazo
- Sin integración con planilla (cálculo de pago por vacaciones)
- Sin vista de calendario
- Sin carrying forward de saldos entre años

---

### 2.4 Cálculo de Planilla (Nómina)

**Estado: Completo (~90%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/payroll/page.tsx` | Motor de cálculo de nómina completo: configuración de frecuencia, deducciones, IGSS/IHSS/RAP, deducciones personalizadas, integración con asistencia, exportación CSV, generación de comprobantes de pago, cierre/historial de planilla |
| `app/api/companies/[id]/hr/payroll/config/route.ts` | API para configuración de planilla (frecuencia, % deducciones, quincena, etc.) |
| `app/api/companies/[id]/hr/payroll/closed/route.ts` | API para planillas cerradas (historial con desglose completo) |
| `app/api/companies/[id]/hr/payroll/deductions/route.ts` | API CRUD para deducciones por empleado |

#### Tablas de Base de Datos (Supabase SQL)

- `payroll_config` — Configuración de planilla por tenant (frecuencia, IGSS/IHSS/RAP %, quincena, aguinaldo, bono 14)
- `payroll_closed` — Historial de planillas cerradas con JSONB de empleados
- `payroll_deductions` — Deducciones individuales por empleado (estándar y personalizadas)

#### Funcionalidad Implementada

- 4 frecuencias de pago: Semanal, Quincenal, Mensual, Cada 2 semanas
- 4 métodos de pago: Transferencia, Efectivo, Cheque, Depósito
- Deducción IGSS empleado/patrono (configurable %)
- Deducción IHSS vivienda (configurable %)
- Deducción RAP (configurable %)
- Deducciones personalizadas por empleado (fijo o porcentaje, con frecuencia y asignación de quincena)
- Activación/desactivación de deducciones estándar por empleado
- Integración con datos de asistencia (faltas, tardanzas, horas extra, feriados, vacaciones alimentan planilla)
- Cálculo de salario por período según frecuencia
- Cálculo de salario neto
- Cálculo de costo patrono (IGSS patronal)
- Generación de comprobante de pago (individual y por lote, popup HTML para impresión)
- Descarga CSV de planilla
- Cierre de planilla con historial
- Registros de planilla cerrada con desglose completo por empleado
- Configuración de fechas límite (documentos, asistencia, horas extra, bonificación)

#### Almacenamiento de Datos

**Todos los datos se persisten en Supabase via API routes:**
- Config: `/api/companies/${companyId}/hr/payroll/config` → tabla `payroll_config`
- Planillas cerradas: `/api/companies/${companyId}/hr/payroll/closed` → tabla `payroll_closed`
- Deducciones: `/api/companies/${companyId}/hr/payroll/deductions` → tabla `payroll_deductions`
- Asistencia leída de `/api/companies/${companyId}/hr/attendance` → tabla `attendance`

#### Lo que Falta

- Sin generación de archivos bancarios (SEPA, etc.)
- Sin integración con declaraciones fiscales
- Sin cálculo automático de aguinaldo/bono vacacional/decimotercer mes (config existe pero sin lógica de cálculo)
- Sin generación de PDF de recibo de pago (usa popup HTML)
- Sin integración con módulo de contabilidad para asientos contables

---

### 2.5 Planes de Mejoramiento (PIP)

**Estado: NO INICIADO (0%)**

**No existen archivos, componentes, rutas API, tablas de base de datos, ni migraciones SQL** para planes de mejora, evaluaciones de desempeño, ni revisiones de empleados.

#### Lo que Falta (Todo)

- Sistema de evaluaciones de desempeño
- Seguimiento de PIP (Planes de Mejoramiento)
- Establecimiento de metas y KPIs por empleado
- Gestión de ciclos de revisión
- Evaluaciones de competencias
- Feedback 360 grados
- Sistema de calificación de desempeño
- Plantillas de revisión de empleados

---

## 3. Infraestructura de Soporte

### Navegación Lateral

`components/RoleBasedSidebar.tsx` — Contiene ítem "Recursos Humanos" apuntando a `/hr` para roles ADMIN y MANAGER.

### Migraciones SQL de Supabase (10 archivos)

| Archivo | Propósito |
|---|---|
| `EMPLOYEES_UPDATE.sql` | Agrega 40+ columnas a tabla employees, RLS, índices |
| `EMPLOYEE_HISTORY.sql` | Tabla de auditoría |
| `HR_DEPARTMENTS_POSITIONS.sql` | Tablas de departamentos y cargos con datos semilla |
| `NOMINA_CHANGES.sql` | RLS para positions, employees, departments |
| `PERMISSIONS.sql` | Tablas de tipos de permiso, uso y solicitudes con tipos por defecto |
| `ADD_GENDER_FREE_DAYS.sql` | Agrega columnas gender y free_days a employees |
| `MASTER_SETUP.sql` | Configuración completa de BD (incluye tabla deduction_templates) |
| `ADD_SCHEDULE_ENTRY_EXIT.sql` | Agrega schedule_entry, schedule_exit, schedule_hours a employees |
| `HR_MIGRATE_LOCALSTORAGE.sql` | **10 tablas** para migrar localStorage a Supabase: attendance, holidays, config, schedules, payroll config/closed/deductions, permissions types/requests/used |
| `HR_STORAGE.sql` | **2 buckets** de Supabase Storage (employee-photos, employee-documents) + 10 RLS policies |
| `COST_PAYMENTS.sql` / `BUSINESS_UNITS.sql` | Seguimiento de costos y unidades de negocio |

### Prisma Schema

`prisma/schema.prisma` — **Sin modelos HR definidos**. Solo cubre entidades contables (Account, Transaction, JournalEntry, Tenant, Invoice, etc.). Todas las tablas HR se manejan directamente vía SQL en Supabase, sin Prisma.

### Observaciones Clave

1. **Almacenamiento consolidado en Supabase**: Toda la data del módulo HR (empleados, asistencia, planilla, permisos) ahora persiste en Supabase via API routes con service_role key. Se eliminó 100% del localStorage.
2. **15 API routes para HR**: 3 originales (employees, departments, positions) + 11 nuevas (attendance, holidays, config, schedules, reports, payroll config/closed/deductions, permissions types/requests/used) + 1 storage (upload/delete fotos/documentos).
3. **Sin hooks ni servicios HR dedicados**: No hay hooks en `hooks/` ni servicios en `lib/services/` para funcionalidad HR. Lógica de cálculo está inline en los componentes.
4. **Sin tipos TypeScript HR**: El directorio `types/` solo contiene `env.d.ts` y `file.ts`.
5. **Sin página de reportes**: El dashboard HR enlaza a `/hr/reports` pero esta ruta no existe.
6. **100% específico para Honduras**: Ley de vacaciones, deducciones IGSS/IHSS/RAP, calendario de feriados están adaptados a legislación hondureña.

---

## 4. Problemas Críticos a Resolver

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | Sin tipos TypeScript para entidades HR | Errores en tiempo de ejecución; difícil mantenimiento | Alta |
| 2 | Sin integración contable de planilla | No se generan asientos contables automáticos | Alta |
| 3 | PIP no tiene implementación alguna | Requisito del cliente sin cubrir | Media |
| 4 | Sin generación de PDFs (recibos de pago, reportes) | Limitación para uso en producción | Alta |
| 5 | Sin pruebas automatizadas | Riesgo de regresiones | Media |
| 6 | Lógica de cálculo inline en componentes (~2200 líneas en payroll) | Difícil mantenimiento y testing | Media |

---

## 5. Matriz del Plan por Etapas

### Etapa 1: Consolidación de Datos y Conectividad con Supabase ✅ COMPLETADA

**Objetivo:** Migrar datos de localStorage a Supabase; establecer capa API completa.

| # | Tarea | Archivos a Modificar/Crear | Dependencias | Estado |
|---|---|---|---|---|
| 1.1 | Crear tablas de Supabase para asistencia | `supabase/HR_MIGRATE_LOCALSTORAGE.sql` | Ninguna | ✅ Completada |
| 1.2 | Crear tablas de Supabase para planilla | `supabase/HR_MIGRATE_LOCALSTORAGE.sql` | Ninguna | ✅ Completada |
| 1.3 | Conectar UI de vacaciones a tablas de Supabase | `vacations/page.tsx` | Tablas existen | ✅ Completada |
| 1.4 | Crear rutas API para asistencia (4 routes) | `app/api/.../hr/attendance/*` | Paso 1.1 | ✅ Completada |
| 1.5 | Crear rutas API para planilla (3 routes) | `app/api/.../hr/payroll/*` | Paso 1.2 | ✅ Completada |
| 1.6 | Crear rutas API para permisos/vacaciones (3 routes) | `app/api/.../hr/permissions/*` | Paso 1.3 | ✅ Completada |
| 1.7 | Migrar frontend de localStorage a API calls | Todos los pages.tsx | Pasos 1.4-1.6 | ✅ Completada |
| 1.8 | Crear tipos TypeScript para entidades HR | `types/hr.ts` | — | Pendiente |

---

### Etapa 2: Motor de Asistencia Validado

**Objetivo:** Implementar reglas de negocio, validaciones y consolidación diaria de asistencia.

| # | Tarea | Archivos a Modificar/Crear | Dependencias | Entregable |
|---|---|---|---|---|
| 2.1 | Implementar servicio de detección automática de atrasos | `lib/services/attendance-service.ts` | Etapa 1 completada | Función de detección de tardanzas |
| 2.2 | Implementar detección de horas extra y faltas | `lib/services/attendance-service.ts` | 2.1 | Funciones de horas extra y faltas |
| 2.3 | Implementar reglas de validación (marcas duplicadas, incoherencias) | `lib/services/attendance-service.ts` | 2.2 | Validaciones server-side |
| 2.4 | Crear endpoint de consolidación diaria | `app/api/companies/[id]/hr/attendance/daily-consolidation/route.ts` | 2.1-2.3 | Endpoint de consolidación |
| 2.5 | Crear servicio de cálculo de asistencia | `lib/services/attendance-calculator.ts` | 2.4 | Motor de cálculo diario |
| 2.6 | Integrar consolidación con UI de asistencia | `app/companies/[id]/hr/attendance/page.tsx` | 2.4-2.5 | UI muestra consolidación |
| 2.7 | Implementar reportes de asistencia (resumen diario, quincenal, mensual) | `app/companies/[id]/hr/attendance/reports/page.tsx` | 2.5 | Página de reportes de asistencia |

---

### Etapa 3: Vacaciones, Permisos y PIP

**Objetivo:** Automatizar saldos de licencias; estructurar los Planes de Mejoramiento.

| # | Tarea | Archivos a Modificar/Crear | Dependencias | Entregable |
|---|---|---|---|---|
| 3.1 | Implementar motor de acumulación de vacaciones por antigüedad | `lib/services/vacation-service.ts` | Etapa 1 completada | Servicio de acumulación automática |
| 3.2 | Implementar carried forward de saldos entre años | `lib/services/vacation-service.ts` | 3.1 | Lógica de carried forward |
| 3.3 | Implementar flujos de aprobación (aprobado, rechazado, pendiente) | `lib/services/permission-service.ts` | 1.6 completada | Flujos de aprobación |
| 3.4 | Implementar notificaciones de aprobación/rechazo | `lib/services/notification-service.ts` | 3.3 | Sistema de notificaciones |
| 3.5 | Crear vista de calendario de ausencias | `app/companies/[id]/hr/vacations/calendar/page.tsx` | 3.3 | Página de calendario |
| 3.6 | Crear tablas para PIP en Supabase | `supabase/PIP_TABLES.sql` | Ninguna | Migración SQL para PIP |
| 3.7 | Crear API para PIP | `app/api/companies/[id]/hr/pip/route.ts` | 3.6 | CRUD de PIP |
| 3.8 | Crear UI de PIP (definición de metas, fechas de evaluación, seguimiento) | `app/companies/[id]/hr/pip/page.tsx` | 3.7 | Página de gestión de PIP |
| 3.9 | Implementar notificaciones de vencimiento de metas de PIP | `lib/services/pip-notification-service.ts` | 3.8 | Alertas de vencimiento |
| 3.10 | Integrar indicadores de asistencia con PIP | `lib/services/pip-service.ts` | 2.5, 3.8 | Métricas de asistencia en PIP |

---

### Etapa 4: Motor de Planilla (Nómina)

**Objetivo:** Garantizar precisión en cálculos; integrar con asistencia, permisos y contabilidad.

| # | Tarea | Archivos a Modificar/Crear | Dependencias | Entregable |
|---|---|---|---|---|
| 4.1 | Crear servicio de cálculo de nómina | `lib/services/payroll-service.ts` | Etapa 1 completada | Motor de cálculo |
| 4.2 | Integrar incidencias de asistencia (faltas, horas extra) | `lib/services/payroll-service.ts` | 2.5, 4.1 | Asistencia alimenta planilla |
| 4.3 | Integrar permisos y vacaciones | `lib/services/payroll-service.ts` | 3.3, 4.1 | Permisos alimentan planilla |
| 4.4 | Implementar reglas de deducciones legales (IGSS, IHSS, RAP) | `lib/services/payroll-service.ts` | 4.1 | Deducciones parametrizadas |
| 4.5 | Implementar aguinaldo, bonificación vacacional, decimotercer mes | `lib/services/payroll-service.ts` | 4.1 | Cálculos de prestaciones |
| 4.6 | Crear generador de pre-planilla (inspección antes de cierre) | `lib/services/payroll-service.ts` | 4.1-4.5 | Pre-planilla auditable |
| 4.7 | Integrar planilla con módulo contable (asientos automáticos) | `lib/services/payroll-accounting-integration.ts` | 4.6, módulo contabilidad | Asientos contables automáticos |
| 4.8 | Generar comprobantes de pago en PDF | `lib/services/payslip-generator.ts` | 4.6 | PDFs de recibos de pago |
| 4.9 | Generar reportes consolidados de planilla (Excel/PDF) | `app/companies/[id]/hr/payroll/reports/page.tsx` | 4.6 | Reportes de planilla |

---

### Etapa 5: Cierre, Exportación y QA

**Objetivo:** Asegurar calidad, completar exportaciones y estabilidad del módulo completo.

| # | Tarea | Archivos a Modificar/Crear | Dependencias | Entregable |
|---|---|---|---|---|
| 5.1 | Crear página centralizada de reportes de RRHH | `app/companies/[id]/hr/reports/page.tsx` | Etapas 2-4 | Dashboard de reportes |
| 5.2 | Generar reportes consolidados de asistencia (Excel/PDF) | `app/companies/[id]/hr/reports/page.tsx` | 5.1 | Exportaciones de asistencia |
| 5.3 | Generar reportes consolidados de vacaciones (Excel/PDF) | `app/companies/[id]/hr/reports/page.tsx` | 5.1 | Exportaciones de vacaciones |
| 5.4 | Generar reportes de PIP (Excel/PDF) | `app/companies/[id]/hr/reports/page.tsx` | 5.1 | Exportaciones de PIP |
| 5.5 | Crear pruebas unitarias para servicios HR | `__tests__/services/hr/` | Todas las etapas | Suite de pruebas unitarias |
| 5.6 | Crear pruebas E2E para flujos HR | `__tests__/e2e/hr/` | Todas las etapas | Pruebas E2E |
| 5.7 | Revisión de seguridad (RLS, permisos, validaciones) | Archivos existentes | Todas las etapas | Auditoría de seguridad |
| 5.8 | Optimización de rendimiento (consultas, índices, caché) | Archivos existentes | Todas las etapas | Informe de rendimiento |
| 5.9 | Documentación de API y guía de usuario | `docs/HR_API.md`, `docs/HR_USER_GUIDE.md` | Todas las etapas | Documentación completa |

---

## 6. Diagrama de Dependencias

```
Etapa 1 (Supabase + API)
    ├── Etapa 2 (Asistencia)
    │       └── Etapa 4.2 (Planilla ← Asistencia)
    ├── Etapa 3 (Vacaciones + PIP)
    │       ├── Etapa 3.10 (PIP ← Asistencia)
    │       └── Etapa 4.3 (Planilla ← Permisos)
    └── Etapa 4 (Planilla)
            └── Etapa 5 (Cierre + QA)
```

---

## 7. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: Supabase + API | 8 tareas | Media-Alta | ✅ Completada |
| Etapa 2: Asistencia | 7 tareas | Media | Pendiente |
| Etapa 3: Vacaciones + PIP | 10 tareas | Alta | Pendiente |
| Etapa 4: Planilla | 9 tareas | Alta | Pendiente |
| Etapa 5: Cierre + QA | 9 tareas | Media | Pendiente |
| **Total restante** | **35 tareas** | — | **11-15 semanas** |

---

## 8. Dependencias Técnicas Externas

| Dependencia | Uso | Estado |
|---|---|---|
| Supabase | Base de datos principal, autenticación, RLS | ✅ Configurado |
| Legislación Laboral Honduras | Cálculos de vacaciones, deducciones, feriados | ✅ Implementado parcialmente |
| html2canvas / jspdf | Generación de PDFs | ❌ No instalado (necesario para Etapa 4.8) |
| @tanstack/react-table | Tablas avanzadas para reportes | ❌ Verificar si ya está en package.json |
| xlsx | Exportación Excel | ✅ Verificar disponibilidad |
