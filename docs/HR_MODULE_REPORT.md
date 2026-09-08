# Reporte de Estado y Plan de Ejecución: Módulo de Recursos Humanos

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Área Funcional | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Gestión de Personal** | Parcial | 4 páginas | 3 rutas | 5 tablas | Supabase + localStorage |
| **Control de Asistencia** | Parcial | 1 página | 0 rutas | 0 tablas | Solo localStorage |
| **Vacaciones y Permisos** | Parcial | 1 página | 0 rutas | 3 tablas (sin usar) | localStorage (DB existe pero desconectada) |
| **Cálculo de Planilla (Nómina)** | Parcial | 1 página | 0 rutas | 1 tabla (solo templates) | Solo localStorage |
| **Planes de Mejoramiento (PIP)** | No Iniciado | 0 | 0 | 0 | N/A |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~55% | 4 de 5 áreas con funcionalidad parcial, 1 sin iniciar |
| Cobertura de Pruebas | 0% | No existen pruebas unitarias ni E2E para HR |
| Estabilidad y Validaciones | ~40% | Validaciones básicas en UI, sin validación server-side |
| Persistencia de Datos | ~30% | Solo Gestión de Personal usa Supabase; el resto usa localStorage |
| Integración entre Módulos | ~20% | Asistencia alimenta planilla parcialmente; no hay integración con contabilidad |
| Documentación y Tipado | ~25% | Sin tipos TypeScript dedicados para HR; sin documentación de API |

---

## 2. Inventario Detallado por Área

### 2.1 Gestión de Personal (Empleados)

**Estado: Parcial (~70%)**

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

#### Tablas de Base de Datos (Supabase SQL)

- `employees` — Esquema completo con 50+ columnas: datos personales, contrato, educación, habilidades, seguridad social, documentos, médico, campos de terminación/suspensión/reactivación
- `employee_history` — Registro de auditoría para cambios en empleados
- `employee_hr_documents` — Almacenamiento de documentos RRHH por empleado
- `departments` — Departamentos jerárquicos con parent_id
- `positions` — Cargos jerárquicos con rangos salariales y parent_id

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
- Aislamiento multi-tenant vía Supabase RLS

#### Lo que Falta

- Sin endpoint de búsqueda/filtrado dedicado para empleados
- Sin modelos en Prisma para entidades HR (todo manejado directamente vía SQL en Supabase)
- Sin archivo de tipos TypeScript para entidades HR
- Fotos y documentos usan base64 (sin almacenamiento real en Supabase Storage)
- Sin hooks dedicados para datos de empleados

---

### 2.2 Control de Asistencia

**Estado: Parcial (~50%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/attendance/page.tsx` | UI completa: vista diaria + quincenal, 9 estados, gestión de feriados, horarios, operaciones masivas, importación CSV/Excel |

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

#### Almacenamiento de Datos

**TODOS los datos están en localStorage únicamente:**
- Asistencia: `attendance_{companyId}`
- Horarios: `attendance_schedules_{companyId}`
- Feriados: `attendance_holidays_{companyId}`
- Config deducciones: `attendance_deduction_config_{companyId}`

#### Lo que Falta

- **Sin tabla en Supabase** — datos en localStorage únicamente (se pierden entre dispositivos/navegadores)
- **Sin rutas API** para persistir datos de asistencia
- Sin registro de entrada/salida en tiempo real con timestamps
- Sin verificación biométrica o por GPS
- Sin generación automática de reportes de asistencia
- Sin integración con planilla para aplicación directa de deducciones
- Sin dashboard de análisis/reportes de asistencia

---

### 2.3 Vacaciones y Permisos

**Estado: Parcial (~45%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/vacations/page.tsx` | Gestión completa de permisos/ausencias: tipos de permiso, flujo de solicitudes, panel de control, seguimiento de uso, estadísticas/recuento |

#### Tablas de Base de Datos (Supabase SQL — EXISTEN PERO NO SE USAN)

- `permission_types` — Tipos de permiso configurables por tenant (vacaciones, personal, enfermedad, especial, sin_sueldo)
- `permission_usage` — Seguimiento de uso anual/mensual por empleado por tipo
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

**Las tablas en Supabase existen pero la UI NO las usa — todo está en localStorage:**
- Tipos: `permission_types_{companyId}`
- Solicitudes: `permissions_requests_{companyId}`
- Uso: `permissions_used_{companyId}`

#### Lo que Falta

- **Las tablas de Supabase existen pero están DESCONNECTADAS de la UI**
- Sin rutas API para tipos de permiso, solicitudes ni uso
- Sin notificaciones por correo electrónico para aprobación/rechazo
- Sin integración con planilla (cálculo de pago por vacaciones)
- Sin vista de calendario
- Sin carrying forward de saldos entre años

---

### 2.4 Cálculo de Planilla (Nómina)

**Estado: Parcial (~40%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/payroll/page.tsx` | Motor de cálculo de nómina completo: configuración de frecuencia, deducciones, IGSS/IHSS/RAP, deducciones personalizadas, integración con asistencia, exportación CSV, generación de comprobantes de pago, cierre/historial de planilla |

#### Tablas de Base de Datos (Supabase SQL)

- `deduction_templates` — Configuración de plantillas de deducción

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

**Todo en localStorage — sin persistencia en base de datos:**
- Config: `payroll_config_{companyId}`
- Planillas cerradas: `payrolls_closed_{companyId}`
- Deducciones: `payroll_deductions_{companyId}`
- Datos de asistencia tomados de localStorage

#### Lo que Falta

- **Sin almacenamiento persistente en base de datos** para registros de planilla — todo en localStorage
- Sin rutas API para planilla
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

### Migraciones SQL de Supabase (9 archivos)

| Archivo | Propósito |
|---|---|
| `EMPLOYEES_UPDATE.sql` | Agrega 40+ columnas a tabla employees, RLS, índices |
| `EMPLOYEE_HISTORY.sql` | Tabla de auditoría |
| `HR_DEPARTMENTS_POSITIONS.sql` | Tablas de departamentos y cargos con datos semilla |
| `NOMINA_CHANGES.sql` | RLS para positions, employees, departments |
| `PERMISSIONS.sql` | Tablas de tipos de permiso, uso y solicitudes con tipos por defecto |
| `ADD_GENDER_FREE_DAYS.sql` | Agrega columnas gender y free_days a employees |
| `MASTER_SETUP.sql` | Configuración completa de BD (incluye tabla deduction_templates) |
| `COST_PAYMENTS.sql` | Seguimiento de costos de negocio (no HR) |
| `BUSINESS_UNITS.sql` | Unidades de negocio para seguimiento de desempeño |

### Prisma Schema

`prisma/schema.prisma` — **Sin modelos HR definidos**. Solo cubre entidades contables (Account, Transaction, JournalEntry, Tenant, Invoice, etc.). Todas las tablas HR se manejan directamente vía SQL en Supabase, sin Prisma.

### Observaciones Clave

1. **Problema de almacenamiento híbrido**: Empleados usan Supabase (correcto), pero asistencia, planilla y permisos usan localStorage (frágil, sin persistencia entre dispositivos/navegadores).
2. **Tablas desconectadas**: Las tablas `permission_types`, `permission_usage` y `permission_requests` existen en Supabase pero la página de vacaciones usa localStorage.
3. **Sin hooks ni servicios HR dedicados**: No hay hooks en `hooks/` ni servicios en `lib/services/` para funcionalidad HR.
4. **Sin tipos TypeScript HR**: El directorio `types/` solo contiene `env.d.ts` y `file.ts`.
5. **Sin página de reportes**: El dashboard HR enlaza a `/hr/reports` pero esta ruta no existe.
6. **100% específico para Honduras**: Ley de vacaciones, deducciones IGSS/IHSS/RAP, calendario de feriados están adaptados a legislación hondureña.

---

## 4. Problemas Críticos a Resolver

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | Asistencia, vacaciones y planilla usan localStorage | Datos se pierden entre dispositivos; no hay respaldo | Crítica |
| 2 | Tablas de Supabase para permisos existen pero no se usan | Código muerto; duplicación de esfuerzo | Alta |
| 3 | Sin rutas API para asistencia, vacaciones, planilla | Sin posibilidad de integración con otros módulos | Crítica |
| 4 | Sin tipos TypeScript para entidades HR | Errores en tiempo de ejecución; difícil mantenimiento | Alta |
| 5 | Sin integración contable de planilla | No se generan asientos contables automáticamente | Alta |
| 6 | PIP no tiene implementación alguna | Requisito del cliente sin cubrir | Media |
| 7 | Sin generación de PDFs (recibos de pago, reportes) | Limitación para uso en producción | Alta |
| 8 | Sin pruebas automatizadas | Riesgo de regresiones | Media |

---

## 5. Matriz del Plan por Etapas

### Etapa 1: Consolidación de Datos y Conectividad con Supabase

**Objetivo:** Migrar datos de localStorage a Supabase; establecer capa API completa.

| # | Tarea | Archivos a Modificar/Crear | Dependencias | Entregable |
|---|---|---|---|---|
| 1.1 | Crear tablas de Supabase para asistencia (`attendance_records`, `attendance_schedules`, `attendance_holidays`, `attendance_deduction_config`) | `supabase/ATTENDANCE_TABLES.sql` | Ninguna | Migración SQL ejecutada |
| 1.2 | Crear tablas de Supabase para planilla (`payroll_records`, `payroll_configs`, `payroll_closed`, `payroll_employee_deductions`) | `supabase/PAYROLL_TABLES.sql` | Ninguna | Migración SQL ejecutada |
| 1.3 | Conectar UI de vacaciones a tablas existentes de Supabase | `app/companies/[id]/hr/vacations/page.tsx` | Tablas ya existen | UI usa Supabase en vez de localStorage |
| 1.4 | Crear rutas API para asistencia | `app/api/companies/[id]/hr/attendance/route.ts` | Paso 1.1 | CRUD de asistencia vía API |
| 1.5 | Crear rutas API para planilla | `app/api/companies/[id]/hr/payroll/route.ts` | Paso 1.2 | CRUD de planilla vía API |
| 1.6 | Crear rutas API para permisos/vacaciones | `app/api/companies/[id]/hr/permissions/route.ts` | Paso 1.3 | CRUD de permisos vía API |
| 1.7 | Migrar datos existentes de localStorage a Supabase | Scripts de migración | Pasos 1.1-1.6 | Script de migración de datos |
| 1.8 | Crear tipos TypeScript para todas las entidades HR | `types/hr.ts` | Pasos 1.1-1.2 | Archivo de tipos completo |

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
| Etapa 1: Supabase + API | 8 tareas | Media-Alta | 3-4 semanas |
| Etapa 2: Asistencia | 7 tareas | Media | 2-3 semanas |
| Etapa 3: Vacaciones + PIP | 10 tareas | Alta | 4-5 semanas |
| Etapa 4: Planilla | 9 tareas | Alta | 3-4 semanas |
| Etapa 5: Cierre + QA | 9 tareas | Media | 2-3 semanas |
| **Total** | **43 tareas** | — | **14-19 semanas** |

---

## 8. Dependencias Técnicas Externas

| Dependencia | Uso | Estado |
|---|---|---|
| Supabase | Base de datos principal, autenticación, RLS | ✅ Configurado |
| Legislación Laboral Honduras | Cálculos de vacaciones, deducciones, feriados | ✅ Implementado parcialmente |
| html2canvas / jspdf | Generación de PDFs | ❌ No instalado (necesario para Etapa 4.8) |
| @tanstack/react-table | Tablas avanzadas para reportes | ❌ Verificar si ya está en package.json |
| xlsx | Exportación Excel | ✅ Verificar disponibilidad |
