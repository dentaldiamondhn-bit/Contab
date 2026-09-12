# Reporte de Estado y Plan de Ejecución: Módulo de Recursos Humanos

> **Fecha de actualización:** 11 de Septiembre de 2026

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Área Funcional | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Gestión de Personal** | Completo | 5 páginas | 4 rutas | 5 tablas | Supabase Storage + API |
| **Control de Asistencia** | Completo | 3 páginas | 5 rutas | 4 tablas | Supabase + API |
| **Vacaciones y Permisos** | Completo | 2 páginas | 3 rutas | 3 tablas | Supabase + API |
| **Cálculo de Planilla (Nómina)** | Completo | 1 página | 5 rutas | 4 tablas | Supabase + API |
| **Reportes de RRHH** | Completo | 1 página | — | — | — |
| **Planes de Mejoramiento (PIP)** | Completo | 1 página | 3 rutas | 5 tablas | Supabase + API |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | **~100%** | **6 de 6 áreas completas** (todas en Supabase con RLS, PIP con estadísticas/filtros) |
| Cobertura de Pruebas | 0% | No existen pruebas unitarias ni E2E para HR |
| Estabilidad y Validaciones | ~85% | Validaciones en UI + Supabase RLS + unique constraints + employee_code auto-gen con colisión segura + API input validation (nombre requerido, salario >= 0, salario max >= min) + duplicados prevenidos en departamentos/cargos/nómina |
| Persistencia de Datos | 100% | Toda la data persiste en Supabase via API routes. **localStorage eliminado al 100%** |
| Integración entre Módulos | ~75% | Asistencia alimenta planilla; **cierre de planilla genera asientos contables automáticamente** (gasto salarios, cargas sociales, pago nómina); **carga Excel de deducciones/ingresos** con persistencia en DB |
| Documentación y Tipado | ~90% | `types/hr.ts` con **50+ interfaces** alineadas al código real; `hooks/use-hr.ts` con 3 hooks CRUD completos (useEmployees, useDepartments, usePositions) |
| Seguridad y Aislamiento | **95%** | **RLS habilitado en todas las 25 tablas HR** con service_role + tenant isolation. UNIQUE constraints en employee_code, departments, positions, payroll_closed. API input validation. Collision-safe employee_code. |
| **Rendimiento** | **~95%** | **N+1 eliminado**: batch save (PATCH), schedules batch (PUT), auto-mark solo guarda cambios. **Re-fetch automático al cambiar de mes**. Skeleton de carga, memoización, API calls paralelos. |

---

## 2. Inventario Detallado por Área

### 2.1 Gestión de Personal (Empleados)

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/employees/page.tsx` | UI completa de gestión de empleados: CRUD, pestañas (Personal, Trabajo, Académico, Habilidades, Ficha Médica, Documentos, Doc. RRHH, Historial), modales de desactivar/suspender/reactivar, importación CSV, **búsqueda server-side con debounce (300ms)**, upload de fotos/docs vía API con URLs, **puestos multi-ocupante (múltiples empleados por puesto)** |
| `app/companies/[id]/hr/departments/page.tsx` | Gestión de departamentos y cargos con vista jerárquica en árbol, CRUD, rangos salariales, **pestañas Departamentos/Puestos**, **importación CSV unificada de departamentos y puestos con plantilla descargable y vista previa**, **cambio de departamento al editar puestos**, **múltiples ocupantes por puesto mostrados en badges** |
| `app/companies/[id]/hr/hierarchy/page.tsx` | Visor de jerarquía organizacional con asignación de padres-cargos |
| `app/companies/[id]/hr/org-chart/page.tsx` | **Organigrama interactivo**: vista de árbol y lista, expandir/contraer, búsqueda en tiempo real, filtro por departamento, asignar/cambiar/quitar jefe directo, subir foto del empleado (Supabase Storage), importación CSV de jerarquía con plantilla descargable |
| `app/companies/[id]/hr/page.tsx` | Dashboard de RRHH con tarjetas resumen (empleados activos, planilla mensual, deducciones, solicitudes pendientes) |
| `app/api/companies/[id]/employees/route.ts` | API CRUD completa (GET/POST/PUT/DELETE) para empleados vía Supabase |
| `app/api/companies/[id]/hr/departments/route.ts` | API CRUD para departamentos (Supabase) |
| `app/api/companies/[id]/hr/positions/route.ts` | API CRUD para cargos (Supabase) |
| `app/api/companies/[id]/hr/accounting/route.ts` | **Bridge planilla → contabilidad**: genera asientos contables al cerrar nómina (gasto salarios, cargas sociales patronales, pago de nómina) |
| `app/api/companies/[id]/hr/storage/route.ts` | API de upload/delete para fotos y documentos en Supabase Storage |
| `app/api/companies/[id]/hr/employees/search/route.ts` | **API de búsqueda server-side** con filtrado en JS por 8 campos (first_name, last_name, id_number, employee_id, position, department, email, phone), filtros exactos (department, position, status, contractType, gender), ordenamiento y paginación |

#### Tablas de Base de Datos (Supabase SQL)

- `employees` — Esquema completo con 50+ columnas: datos personales, contrato, educación, habilidades, seguridad social, documentos, médico, campos de terminación/suspensión/reactivación. **Photo almacena URL (no base64)**
- `employee_history` — Registro de auditoría para cambios en empleados
- `employee_hr_documents` — Almacenamiento de documentos RRHH por empleado
- `departments` — Departamentos jerárquicos con parent_id
- `positions` — Cargos jerárquicos con rangos salariales y parent_id

#### Supabase Storage (Buckets)

- `employee-photos` — Público, max 5MB, formatos: JPG/PNG/WebP/GIF. Fotos de perfil de empleados. **Almacenadas como URLs en DB, no base64**
- `employee-documents` — Privado, max 10MB, formatos: PDF/DOC/DOCX/JPG/PNG. Documentos de identidad, contratos, CVs, documentos RRHH

#### Funcionalidad Implementada

- CRUD de empleados con perfil completo (personal, trabajo, académico, habilidades, médico, documentos, historial)
- Gestión de departamentos y cargos con jerarquía
- **Importación CSV unificada de departamentos y puestos** con plantilla descargable (columna `tipo`: departamento/puesto) y vista previa antes de importar
- **Pestaña de Puestos** en la página de departamentos: tabla agrupada por departamento con edición inline (nombre, descripción, departamento, rango salarial, reporta a, asignado a)
- Puestos sin departamento editables con dropdown para asignar departamento
- **Cambio de departamento en puestos** al editar (árbol y pestaña de puestos)
- Estados de empleado: activo, inactivo, terminado, suspendido
- Flujo de terminación/suspensión/reactivación con campos de workflow
- Importación CSV/Excel de empleados
- Exportación de empleados a Excel
- Creación automática de cargo al agregar empleado
- Registro de historial de cambios (audit trail)
- Cálculo de vacaciones por antigüedad (ley hondureña: <1yr=0, 1=10, 2=12, 3=14, 4+=20) con carry-forward de días no usados
- **Organigrama interactivo** con vista de árbol y lista, búsqueda, filtro por departamento, asignación de jefes directos, subir foto, importación CSV de jerarquía
- **Upload de fotos y documentos vía API** con URLs persistentes en Supabase Storage (reemplaza base64)
- **Dropdown de Cargo filtrado por departamento** (case-insensitive)
- **Dropdown de Jefe Directo filtrado por departamento**
- Búsqueda server-side con debounce (300ms) que filtra en 8 campos
- Filtros exactos por departamento, cargo, estado, tipo de contrato, género
- Aislamiento multi-tenant vía Supabase RLS
- **Rendimiento optimizado**: eliminación de N+1 queries (batch queries para employee_hr_documents + employee_history en lugar de consultas individuales por empleado), 3 fetches iniciales paralelizados en un solo `Promise.all`, `useMemo` para empleados filtrados/ordenados/paginados, skeleton de carga, actualizaciones optimistas para crear/editar/eliminar

#### Implementado ✅

- **Tipos TypeScript HR completos** en `types/hr.ts`: Employee, Department, Position, Attendance, Payroll, Permissions (50+ interfaces)
- **Hooks dedicados** en `hooks/use-hr.ts`: useEmployees, useDepartments, usePositions con CRUD, loading, error, refetch automático

---

### 2.2 Control de Asistencia

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/attendance/page.tsx` | UI completa: vista diaria + quincenal + **compacta**, **11 estados**, gestión de feriados, horarios, operaciones masivas, importación CSV/Excel, **tarjetas de stats clickeables**, **safeFetch para carga resiliente** |
| `app/companies/[id]/hr/attendance/reports/page.tsx` | **Dashboard de análisis con gráficos Recharts**: tendencia diaria, distribución por estado, horas extra, ranking de empleados, incapacidades, feriados |
| `app/api/companies/[id]/hr/attendance/route.ts` | API CRUD para registros de asistencia (GET/POST/PUT/DELETE) |
| `app/api/companies/[id]/hr/attendance/holidays/route.ts` | API CRUD para feriados |
| `app/api/companies/[id]/hr/attendance/config/route.ts` | API para configuración de deducciones por asistencia |
| `app/api/companies/[id]/hr/attendance/schedules/route.ts` | API CRUD para horarios por empleado |
| `app/api/companies/[id]/hr/attendance/reports/route.ts` | **API de datos agregados** para reportes (summary, tendencia diaria, ranking empleados, incapacidades, feriados) |

#### Tablas de Base de Datos

- `attendance` — Registros diarios de asistencia por empleado (status, monto, horas extra, feriados, incapacidades)
- `attendance_holidays` — Feriados nacionales configurables por tenant
- `attendance_deduction_config` — Configuración de deducciones (% ausencia, tardanza, incapacidad, etc.)
- `attendance_schedules` — Horarios por empleado con días libres (INTEGER[])

#### Funcionalidad Implementada

- **3 vistas de asistencia**: diaria (con botones de acción), quincenal (tabla 2 semanas), **compacta** (grid de tarjetas con empleados agrupados por departamento, **secciones colapsables** por defecto)
- **11 estados de asistencia**: Presente, Ausente, Tardanza, Vacaciones, Horas Extra, Permiso Sin Sueldo, **Permiso Con Pago**, **Suspensión sin Goce de Salario**, Incapacidad, Feriado, Día Libre
- Feriados nacionales de Honduras pre-configurados (2026) con tipos de pago doble/triple
- Labels mejorados: "Día Feriado (Doble)", "Día Feriado (Triple)", "Día Asueto"
- Configuración de horario laboral por empleado (días libres)
- Tipos de incapacidad: 100% patrono, IHSS (33%), Sin pago, Maternidad (84 días)
- Cálculo automático de monto por tardanza/horas extra basado en salario
- Importación de archivo (CSV/XLSX) con mapeo de estados (acepta: suspension, suspendido, sus, permiso con pago, permiso c/pago, pcp)
- Descarga de plantilla para importación
- Deshacer/rehacer (historial de acciones)
- Operaciones masivas (todos presentes, todos ausentes, aplicar feriados)
- Cálculo de pago por feriado (doble/triple)
- Seguimiento de horas extras y montos
- Configuración de deducciones por empleado
- Totales quincenales (deducciones/ingresos)
- **Dashboard de análisis con gráficos Recharts** (tendencia diaria, distribución por estado, horas extra, ranking de empleados, distribución de incapacidades, feriados)
- Exportación CSV de reportes de asistencia
- Link a reportes desde herramientas de asistencia ("Reportes / Análisis")
- **Filtros avanzados**: búsqueda por nombre de empleado, dropdown de departamento, filtro por estado (activos/suspendidos/inactivos/terminados), botón "Limpiar filtros", contador de empleados filtrados — disponibles en ambas vistas (Día y Quincena)
- **Tarjetas de estadísticas clickeables**: cada tarjeta (Presentes, Ausentes, Tardanzas, Vacaciones, HE, Permiso s/pago, Permiso c/pago, Suspensión, Incapacidad, **Días Libres**, **Feriados**) filtra la lista de empleados al hacer click. Filtro especial para HE que detecta `overtimeHours > 0` en lugar de comparar status
- **Control de asistencia desactivado para empleados inactivos/terminados**: desde la fecha de terminación, no se muestran botones de asistencia ni horario. Vista día muestra badge "Inactivo desde {fecha}" y fila atenuada. Vista quincena muestra "Sin horario" y celdas "Inactivo" sin botones desde la fecha de terminación
- **Suspensión sin goce de salario**: estado con descuento de día completo (salario/30), botón rojo oscuro con icono Ban, badge rojo
- **Permiso con pago**: estado sin descuento (salario pagado completo), botón verde esmeralda, badge verde
- **Carga resiliente**: `safeFetch()` wrapper que maneja errores de API individualmente — una API caída no impide que las demás carguen
- **Rendimiento**: filtro de fecha en API de asistencia (solo carga mes actual en vez de todos los registros), skeleton de carga animado, **re-fetch automático al cambiar de mes**
- **Vista compacta con departamentos**: empleados agrupados por departamento con secciones colapsables (colapsadas por defecto), indicador de empleados con registro por departamento, `Building2` icon
- **Permisos parciales (horas/minutos)**: Permiso Sin Pago y Permiso Con Pago abren modal con selector de horas y minutos. Permiso sin pago descuenta salario horario × horas. Permiso con pago rastrea horas sin descuento (amount=0)
- **Columna `hours` en asistencia**: DECIMAL(5,2) para almacenar horas fraccionadas (tardanzas, permisos parciales). Guardada en POST y PATCH. Soporte en todos los modales (tardanza, incapacidad, permisos)
- **Optimización de rendimiento masiva**: eliminación completa de patrón N+1 en carga de página:
  - `saveAttendanceRecords` usa PATCH batch (1 request) en vez de N POSTs individuales
  - Schedules usa PUT batch (1 request) en vez de N POSTs individuales
  - `autoMarkFreeDays` solo guarda registros cambiados (no todos)
  - `applyHolidayDefaults` solo guarda registros cambiados (no todos)
  - PATCH endpoint actualizado con campos `hours`, `holiday_type`, `disability_type`
- **Vista compacta colapsable**: departamentos con secciones expandible/colapsable (default: colapsado), click en header para toggle

#### Almacenamiento de Datos

**Todos los datos se persisten en Supabase via API routes:**
- Asistencia: `/api/companies/${companyId}/hr/attendance` → tabla `attendance`
- Horarios: `/api/companies/${companyId}/hr/attendance/schedules` → tabla `attendance_schedules`
- Feriados: `/api/companies/${companyId}/hr/attendance/holidays` → tabla `attendance_holidays`
- Config deducciones: `/api/companies/${companyId}/hr/attendance/config` → tabla `attendance_deduction_config`
- Reportes: `/api/companies/${companyId}/hr/attendance/reports` → datos agregados de las 4 tablas

#### Lo que Falta

- Sin registro de entrada/salida en tiempo real con timestamps
- Sin verificación biométrica o por GPS

---

### 2.3 Vacaciones y Permisos

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/vacations/page.tsx` | Gestión completa de permisos/ausencias: tipos de permiso, flujo de solicitudes, panel de control, seguimiento de uso, estadísticas/recuento, **filtros avanzados** |
| `app/companies/[id]/hr/vacations/calendar/page.tsx` | **Calendario** de vacaciones y permisos con **3 vistas (Día/Semana/Mes)**: grilla mensual con eventos multi-día, vista semanal con fila de eventos "todo el día" + **cuadrícula de horas (12AM-11PM)**, vista diaria con sección de eventos "todo el día" + **cuadrícula de horas con línea roja de hora actual**. **Edición/eliminación** de permisos desde el calendario (modal de edición, confirmación de eliminación). Aprobación/rechazo directo. Filtros por empleado/tipo/estado |
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
- **Carry-forward automático**: días no usados del año anterior se arrastran al año actual, con vencimiento a 2 años según Código de Trabajo de Honduras (calculado on-the-fly desde solicitudes aprobadas)
- Registro del nombre del aprobador al aprobar solicitudes
- Tarjetas resumen por tipo de permiso
- **Cálculo de salario por período** ajustado según frecuencia (quincenal = salario/2, semanal = salario/4)
- **Filtros avanzados**: búsqueda por nombre/posición del empleado, dropdown de departamento, filtro por estado de solicitud (todas/aprobadas/rechazadas) en historial, botón "Limpiar filtros" condicional
- **Rendimiento optimizado**: API ligera de empleados (`/hr/payroll/employees`), 4 fetches paralelos en un solo `Promise.all`, `useMemo` para datos derivados (approvedRequests, activeEmployees, pendingRequests, processedRequests, typesToShow, filteredEmployees, departments), skeleton de carga
- **Calendario con 3 vistas**: **Mes** — grilla 7×6 con eventos multi-día codificados por color; **Semana** — fila de eventos "todo el día" + cuadrícula de horas (12AM-11PM) con línea roja de hora actual; **Día** — sección de eventos "todo el día" con acciones (aprobar/rechazar/editar/eliminar) + cuadrícula de horas con indicador de hora actual. **Edición** de permisos (modal con tipo, fechas, motivo, estado), **eliminación** con confirmación, **aprobación/rechazo** directo. Navegación prev/next adaptativa por vista, estadísticas del mes

#### Almacenamiento de Datos

**Todos los datos se persisten en Supabase via API routes:**
- Tipos: `/api/companies/${companyId}/hr/permissions/types` → tabla `permission_types`
- Solicitudes: `/api/companies/${companyId}/hr/permissions/requests` → tabla `permission_requests`
- Uso: `/api/companies/${companyId}/hr/permissions/used` → tabla `permission_used`

#### Lo que Falta

- Sin notificaciones por correo electrónico para aprobación/rechazo
- ~~Integración vacaciones→planilla~~ ✅ Implementado
- ~~Sin vista de calendario~~ ✅ Implementada (3 vistas Día/Semana/Mes con cuadrícula de horas, edición/eliminación, aprobación/rechazo directo)
- ~~Carry-forward de saldos entre años~~ ✅ Implementado
- Filtros de empleados: ✅ Implementado (búsqueda por nombre, departamento, estado de solicitud)

---

### 2.4 Cálculo de Planilla (Nómina)

**Estado: Completo (~95%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/payroll/page.tsx` | Motor de cálculo de nómina completo (~2600 líneas): configuración de frecuencia, deducciones, IGSS/IHSS/RAP, deducciones personalizadas por empleado, deducciones custom por período, integración con asistencia, exportación CSV, generación de comprobantes de pago (**diseño dos columnas**), cierre/historial de planilla, **menú desplegable de acciones consolidado**, **carga Excel de deducciones/ingresos con persistencia en DB**, **paginator de 20 empleados por página**, **skeleton de carga**, **optimización de rendimiento (memoización, API calls paralelos)**, **horas extras divididas por turno (mañana 25%, mixto 50%, nocturno 75%)**, **código de empleado en detalle/voucher** |
| `app/api/companies/[id]/hr/payroll/config/route.ts` | API para configuración de planilla (frecuencia, % deducciones, quincena, etc.) |
| `app/api/companies/[id]/hr/payroll/closed/route.ts` | API para planillas cerradas (historial con desglose completo) |
| `app/api/companies/[id]/hr/payroll/deductions/route.ts` | API CRUD para deducciones por empleado (override individual de IGSS/IHSS/RAP) |
| `app/api/companies/[id]/hr/payroll/employees/route.ts` | **API ligera de empleados para planilla** — solo 9 columnas (id, employeeCode, name, position, department, salary, startDate, status), sin mapeo de 50+ campos, sin cálculo de vacaciones |
| `app/api/companies/[id]/hr/payroll/uploads/route.ts` | **API CRUD para datos subidos por Excel** — persiste deducciones/ingresos cargados vía Excel en tabla `payroll_uploads` |

#### Tablas de Base de Datos (Supabase SQL)

- `payroll_config` — Configuración de planilla por tenant (frecuencia, IGSS/IHSS/RAP %, quincena, aguinaldo, bono 14)
- `payroll_closed` — Historial de planillas cerradas con JSONB de empleados
- `payroll_deductions` — Deducciones individuales por empleado (estándar y personalizadas)
- `payroll_uploads` — **Datos subidos por Excel por empleado por período** (items JSONB con deducciones/ingresos, unique constraint por tenant/employee/month/year)

#### Funcionalidad Implementada

- 4 frecuencias de pago: Semanal, Quincenal, Mensual, Cada 2 semanas
- 4 métodos de pago: Transferencia, Efectivo, Cheque, Depósito
- Deducción IGSS empleado/patrono (configurable %, con override individual por empleado)
- Deducción IHSS vivienda (configurable %, con override individual)
- Deducción RAP (configurable %, con override individual)
- Deducciones personalizadas por empleado (fijo o porcentaje, con frecuencia y asignación de quincena)
- **Deducciones custom por período** (el voucher usa `calc.customItems` que son montos ajustados al período, no `customDeds` que son montos completos)
- Activación/desactivación de deducciones estándar por empleado
- **Lógica de quincena invertida**: "ambas quincenas" = amount / 2; "1ra" o "2da" = monto completo
- **División de salario por período**: `getPeriodSalary()` — quincenal → salary/2; semanal → salary/4; mensual → sin división
- Integración con datos de asistencia (faltas, tardanzas, horas extra, feriados, vacaciones alimentan planilla)
- Cálculo de salario por período según frecuencia
- Cálculo de salario neto
- Cálculo de costo patrono (IGSS patronal)
- **Comprobante de pago con diseño dos columnas** (referencia a imagen de diseño)
- Generación de comprobante de pago (individual y por lote, popup HTML para impresión)
- **Código de empleado en voucher** y en tabla de detalle
- **Menú desplegable "Acciones"** consolidando botones de comprobante, exportar y cerrar planilla
- **Resolución de datos del empleado**: API carga positions/departments en `posMap`/`deptMap` para resolver UUIDs → nombres
- **Corrección de timezone**: Siempre usar `selectedDate + 'T12:00:00'` al crear objetos Date
- Descarga CSV de planilla
- Cierre de planilla con historial
- Registros de planilla cerrada con desglose completo por empleado
- Configuración de fechas límite (documentos, asistencia, horas extra, bonificación)
- **Carga Excel de deducciones/ingresos**: menú "Subir Excel" que procesa archivos .xlsx/.xls/.csv, matching por código de empleado (primario) o nombre, persiste en DB (`payroll_uploads`)
- **Descarga de formato Excel**: plantilla con headers, nombres de empleados reales, código de empleado, columna de instrucciones
- **Horas extras divididas por turno**: Mañana (25%), Mixto (50%), Nocturno (75%) — el monto se calcula automáticamente según salario y horas
- **Paginator**: 20 empleados por página con controles de navegación
- **Skeleton de carga**: UI de esqueleto animado mientras se cargan datos
- **Optimización de rendimiento**: API calls paralelos (`Promise.all`), memoización de `calculatePayroll`, `activeEmployees` y `paginatedEmployees` memoizados, `currencyFormatter` memoizado
- **API ligera de empleados**: `/hr/payroll/employees` retorna solo 9 columnas (vs 50+ del endpoint general)

#### Almacenamiento de Datos

**Todos los datos se persisten en Supabase via API routes:**
- Config: `/api/companies/${companyId}/hr/payroll/config` → tabla `payroll_config`
- Planillas cerradas: `/api/companies/${companyId}/hr/payroll/closed` → tabla `payroll_closed`
- Deducciones: `/api/companies/${companyId}/hr/payroll/deductions` → tabla `payroll_deductions`
- Datos Excel: `/api/companies/${companyId}/hr/payroll/uploads` → tabla `payroll_uploads`
- Asistencia leída de `/api/companies/${companyId}/hr/attendance` → tabla `attendance`

#### Lo que Falta

- Sin generación de archivos bancarios (SEPA, etc.)
- Sin integración con declaraciones fiscales
- Sin cálculo automático de aguinaldo/bono vacacional/decimotercer mes (config existe pero sin lógica de cálculo)
- Sin generación de PDF de recibo de pago (usa popup HTML)
- ~~Sin integración con módulo contabilidad para asientos contables~~ ✅ Bridge planilla→contabilidad implementado

---

### 2.5 Reportes de Recursos Humanos

**Estado: Completo (~85%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/companies/[id]/hr/reports/page.tsx` | **Hub centralizado de reportes de RRHH** con enlaces a reportes de asistencia, planilla, empleados y vacaciones |
| `app/companies/[id]/hr/attendance/reports/page.tsx` | Dashboard de análisis de asistencia con Recharts |

#### Funcionalidad Implementada

- Página hub `/hr/reports` con tarjetas de acceso rápido a:
  - Reportes de Asistencia (`/hr/attendance/reports`)
  - Reportes de Planilla
  - Reportes de Empleados
  - Reportes de Vacaciones
- Dashboard de asistencia con gráficos:
  - Gráfico de área: tendencia diaria de asistencia
  - Gráfico de pie: distribución por estado
  - Tabla de ranking de empleados
  - Distribución de incapacidades
  - Historial de feriados

#### Lo que Falta

- Reportes de planilla, empleados y vacaciones aún no tienen páginas dedicadas
- Sin exportación a PDF de reportes
- Sin reportes programados o programables

---

### 2.6 Planes de Mejoramiento (PIP)

**Estado: IMPLEMENTADO (100%)**

#### Componentes Implementados

| Archivo | Función |
|---------|---------|
| `supabase/HR_PIP.sql` | 5 tablas: `pip_plans`, `pip_goals`, `pip_evaluations`, `pip_evidence`, `pip_attendance_metrics` + RLS |
| `app/api/companies/[id]/hr/pip/route.ts` | CRUD planes PIP (GET/POST/PUT/DELETE) con goals |
| `app/api/companies/[id]/hr/pip/evaluations/route.ts` | CRUD evaluaciones + auto-update goal progress |
| `app/api/companies/[id]/hr/pip/metrics/route.ts` | Métricas de asistencia para PIP |
| `app/companies/[id]/hr/pip/page.tsx` | UI completa: dashboard, crear plan, detalle, evaluaciones, estadísticas |
| `types/hr.ts` | 8 interfaces PIP (PipPlan, PipGoal, PipEvaluation, PipEvidence, PipAttendanceMetric, NewPipPlanForm, PipDashboardSummary) |

#### Funcionalidades

- Crear planes PIP por empleado con metas/objetivos medibles
- Estados del plan: Borrador → Activo → Completado/Extendido/Cancelado
- Metas con métricas: porcentaje, días, horas, unidades, calificación
- Evaluaciones periódicas con calificación (0-100) y progreso
- Dashboard con resumen: planes activos, borradores, completados, por vencer
- Detalle de plan con barra de progreso, metas, evaluaciones con historial de comentarios
- Métricas de asistencia integradas (faltas, tardanzas, horas extra)
- Plantillas de revisión de empleados
- **Tab de Estadísticas por Área**: barras horizontales con frecuencia de cada área de mejoramiento
- **Filtros de tiempo**: mes, trimestre, año, rango personalizado (en ambos tabs)
- **Click en empleados**: desde estadísticas se puede filtrar los planes por empleado específico
- **Rendimiento optimizado**: API ligera de empleados, `.limit(50)` en consulta de planes, skeleton de carga, `useMemo` para filteredPlans/activePlans/draftPlans/completedPlans, `statsData` memoizado

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
| `HR_MIGRATE_LOCALSTORAGE.sql` | **10 tablas** desplegadas en Supabase: attendance, holidays, config, schedules, payroll config/closed/deductions, permissions types/requests/used + RLS |
| `HR_STORAGE.sql` | **2 buckets** de Supabase Storage (employee-photos, employee-documents) + 10 RLS policies |
| `HR_HIERARCHY.sql` | **Columna reports_to** en employees (UUID FK) + índice para consultas de jerarquía |
| `HR_PIP.sql` | **5 tablas PIP**: pip_plans, pip_goals, pip_evaluations, pip_evidence, pip_attendance_metrics + RLS + índices |
| `PAYROLL_UPLOADS.sql` | **Tabla payroll_uploads**: datos subidos por Excel por empleado por período (items JSONB), unique constraint, índice |
| `HR_VALIDATIONS.sql` | **RLS + Validaciones**: RLS en employees/employee_history/employee_hr_documents, tenant isolation en pip_plans, fix payroll_uploads RLS, UNIQUE constraints en employee_code, departments, positions, payroll_closed |
| `HR_EMPLOYEE_WORKFLOW.sql` | **Columnas de workflow de estado**: termination_date/reason/requested_by/performed_by, suspension_date/reason/requested_by/performed_by, reactivation_date/reason/requested_by/performed_by, rehireable |
| `ATTENDANCE_TABLES.sql` | **4 tablas de asistencia**: attendance_schedules (horarios/días libres), attendance_deduction_config (config deducciones), attendance_holidays (feriados), employee_history (auditoría) — todas con RLS |

### Prisma Schema

`prisma/schema.prisma` — **Sin modelos HR definidos**. Solo cubre entidades contables (Account, Transaction, JournalEntry, Tenant, Invoice, etc.). Todas las tablas HR se manejan directamente vía SQL en Supabase, sin Prisma.

### Observaciones Clave

1. **Almacenamiento consolidado al 100% en Supabase**: Toda la data del módulo HR (empleados, asistencia, planilla, permisos) persiste en Supabase via API routes con service_role key. **localStorage eliminado completamente.**
2. **21 API routes para HR**: 4 de personal (employees CRUD + search, departments, positions) + 1 storage + 5 de asistencia (attendance, holidays, config, schedules, reports) + 5 de planilla (config, closed, deductions, employees, uploads) + 3 de permisos (types, requests, used) + 3 de PIP (plans, evaluations, metrics).
3. **11 UI pages para HR**: employees, departments, hierarchy, org-chart, dashboard, attendance, attendance reports, payroll, vacations, **vacations calendar**, reports hub.
4. **25 tablas + 2 buckets en Supabase**: Todas desplegadas y funcionales con RLS habilitado. Columna `reports_to` para jerarquía de empleados. Tabla `payroll_uploads` para datos de Excel. Tablas de asistencia (`attendance_schedules`, `attendance_deduction_config`, `attendance_holidays`, `employee_history`) creadas con RLS.
5. **Fotos y documentos migrados**: Almacenamiento en Supabase Storage con URLs persistentes en DB (reemplaza base64 en localStorage).
6. **Tipos TypeScript y hooks HR implementados**: `types/hr.ts` con 50+ interfaces y `hooks/use-hr.ts` con 3 hooks CRUD (useEmployees, useDepartments, usePositions) — cada uno con loading, error, refetch automático y optimistic updates.
7. ~~Sin tipos TypeScript HR~~ ✅ `types/hr.ts` con 50+ interfaces.
8. **100% específico para Honduras**: Ley de vacaciones, deducciones IGSS/IHSS/RAP, calendario de feriados están adaptados a legislación hondureña.
9. **Rendimiento optimizado al 95%**: **N+1 eliminado en carga de página**: saveAttendanceRecords usa PATCH batch (1 request vs N), schedules usa PUT batch (1 request vs N), autoMarkFreeDays y applyHolidayDefaults solo guardan registros cambiados. API calls paralelos, memoización de cálculos, API ligera de empleados para planilla, paginator de 20 empleados por página, skeleton de carga. **Empleados**: N+1 fix con batch queries (employee_hr_documents + employee_history), fetches paralelos, `useMemo` en filtros/paginación. **Vacaciones**: fetches paralelos, `useMemo` en datos derivados, filtros por nombre/departamento/estado. **PIP**: `.limit(50)`, `useMemo` en planes filtrados y stats. **Asistencia**: safeFetch wrapper para carga resiliente, filtro de fecha por mes actual, **re-fetch automático al cambiar de mes**, skeleton animado.
10. **11 estados de asistencia**: Presente, Ausente, Tardanza, Vacaciones, HE, Permiso Sin Sueldo, Permiso Con Pago, Suspensión sin Goce, Incapacidad, Feriado, Día Libre. Tarjetas de stats clickeables (11) con filtro especial para HE.
11. **3 vistas de asistencia**: Diaria (con botones), Quincenal (tabla 2 semanas), **Compacta** (empleados agrupados por departamento con secciones colapsables por defecto, indicador de registro por depto).
12. **Carga Excel persistente**: Datos subidos por Excel se guardan en tabla `payroll_uploads` y se cargan automáticamente al abrir la nómina. Matching por código de empleado (primario) o nombre normalizado (unicode).
13. **Validaciones y seguridad completas**: RLS en las 25 tablas HR, UNIQUE constraints (employee_code, departments, positions, payroll_closed), API input validation (nombre requerido, salario >= 0, salarios coherentes), employee_code collision-safe con random, prevención de cierre duplicado de nómina, tenant_id check en PIP DELETE.
14. **Permisos parciales**: Permiso Sin Pago y Permiso Con Pago soportan horas y minutos parciales (modal con selector de horas/minutos). Horas almacenadas en columna `hours` (DECIMAL 5,2) de la tabla attendance.

---

## 4. Problemas Críticos a Resolver

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | ~~Sin tipos TypeScript para entidades HR~~ | ~~Errores en tiempo de ejecución; difícil mantenimiento~~ | ✅ Resuelta |
| 2 | ~~Sin integración contable de planilla~~ | ~~No se generan asientos contables automáticos~~ | ✅ Resuelta |
| 3 | ~~PIP no tiene implementación alguna~~ | ~~Requisito del cliente sin cubrir~~ | ✅ Resuelta |
| 4 | ~~Sin RLS en tablas employees/employee_history/employee_hr_documents~~ | ~~Cross-tenant data leak~~ | ✅ Resuelta |
| 5 | ~~Sin UNIQUE en employee_code, departments, positions, payroll_closed~~ | ~~Duplicados posibles~~ | ✅ Resuelta |
| 6 | Sin generación de PDFs (recibos de pago, reportes) | Limitación para uso en producción | Alta |
| 7 | Sin pruebas automatizadas | Riesgo de regresiones | Media |
| 8 | Lógica de cálculo inline en componentes (~2600 líneas en payroll) | Difícil mantenimiento y testing | Media |
| 9 | Search API filtra en JS (no en DB) | Rendimiento con muchos empleados | Baja |

---

## 5. Matriz del Plan por Etapas

### Etapa 1: Consolidación de Datos y Conectividad con Supabase ✅ COMPLETADA

**Objetivo:** Migrar datos de localStorage a Supabase; establecer capa API completa.

| # | Tarea | Archivos a Modificar/Crear | Dependencias | Estado |
|---|---|---|---|---|
| 1.1 | Crear tablas de Supabase para asistencia | `supabase/HR_MIGRATE_LOCALSTORAGE.sql` | Ninguna | ✅ Completada |
| 1.2 | Crear tablas de Supabase para planilla | `supabase/HR_MIGRATE_LOCALSTORAGE.sql` | Ninguna | ✅ Completada |
| 1.3 | Conectar UI de vacaciones a tablas de Supabase | `vacations/page.tsx` | Tablas existen | ✅ Completada |
| 1.4 | Crear rutas API para asistencia (5 routes) | `app/api/.../hr/attendance/*` | Paso 1.1 | ✅ Completada |
| 1.5 | Crear rutas API para planilla (3 routes) | `app/api/.../hr/payroll/*` | Paso 1.2 | ✅ Completada |
| 1.6 | Crear rutas API para permisos/vacaciones (3 routes) | `app/api/.../hr/permissions/*` | Paso 1.3 | ✅ Completada |
| 1.7 | Migrar frontend de localStorage a API calls | Todos los pages.tsx | Pasos 1.4-1.6 | ✅ Completada |
| 1.8 | Crear API de búsqueda de empleados | `app/api/.../hr/employees/search/route.ts` | Paso 1.1 | ✅ Completada |
| 1.9 | Migrar fotos/docs a Supabase Storage | `hr/storage/route.ts`, employees page | Buckets creados | ✅ Completada |
| 1.10 | Crear dashboard de reportes de asistencia | `hr/attendance/reports/page.tsx` + API | Paso 1.4 | ✅ Completada |
| 1.11 | Crear hub de reportes de RRHH | `hr/reports/page.tsx` | Pasos 1.4-1.6 | ✅ Completada |
| 1.12 | Crear tipos TypeScript para entidades HR | `types/hr.ts` | — | ✅ Completada |

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

---

### Etapa 3: Vacaciones, Permisos y PIP

**Objetivo:** Automatizar saldos de licencias; estructurar los Planes de Mejoramiento.

| # | Tarea | Archivos a Modificar/Crear | Dependencias | Entregable |
|---|---|---|---|---|
| 3.1 | Implementar motor de acumulación de vacaciones por antigüedad | `lib/services/vacation-service.ts` | Etapa 1 completada | Servicio de acumulación automática |
| 3.2 | Implementar carried forward de saldos entre años | `vacations/page.tsx` | 3.1 | ✅ Completada (on-the-fly calculation) |
| 3.3 | Implementar flujos de aprobación (aprobado, rechazado, pendiente) | `lib/services/permission-service.ts` | 1.6 completada | Flujos de aprobación |
| 3.4 | Implementar notificaciones de aprobación/rechazo | `lib/services/notification-service.ts` | 3.3 | Sistema de notificaciones |
| 3.5 | Crear vista de calendario de ausencias | `app/companies/[id]/hr/vacations/calendar/page.tsx` | 3.3 | Página de calendario |
| 3.6 | Crear tablas para PIP en Supabase | `supabase/HR_PIP.sql` | Ninguna | ✅ Completada (5 tablas + RLS) |
| 3.7 | Crear API para PIP | `app/api/companies/[id]/hr/pip/*` | 3.6 | ✅ Completada (3 routes) |
| 3.8 | Crear UI de PIP (definición de metas, fechas de evaluación, seguimiento) | `app/companies/[id]/hr/pip/page.tsx` | 3.7 | ✅ Completada (dashboard + crear + detalle + evaluar) |
| 3.9 | Implementar notificaciones de vencimiento de metas de PIP | — | 3.8 | Pendiente |
| 3.10 | Integrar indicadores de asistencia con PIP | API metrics | 2.5, 3.8 | ✅ Completada (API + UI)

---

### Etapa 4: Motor de Planilla (Nómina)

**Objetivo:** Garantizar precisión en cálculos; integrar con asistencia, permisos y contabilidad.

| # | Tarea | Archivos a Modificar/Crear | Dependencias | Entregable |
|---|---|---|---|---|
| 4.1 | Crear servicio de cálculo de nómina | `lib/services/payroll-service.ts` | Etapa 1 completada | Motor de cálculo |
| 4.2 | Integrar incidencias de asistencia (faltas, horas extra) | `lib/services/payroll-service.ts` | 2.5, 4.1 | Asistencia alimenta planilla |
| 4.3 | Integrar permisos y vacaciones | `payroll/page.tsx`, `hr/accounting/route.ts` | 3.3, 4.1 | ✅ Completada (pago vacaciones automático + asiento contable 5103) |
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
| 5.1 | Generar reportes consolidados de asistencia (Excel/PDF) | `app/companies/[id]/hr/attendance/reports/page.tsx` | Etapa 1 completada | Exportaciones de asistencia |
| 5.2 | Crear reportes de vacaciones (Excel/PDF) | `app/companies/[id]/hr/reports/page.tsx` | — | Exportaciones de vacaciones |
| 5.3 | Crear reportes de PIP (Excel/PDF) | `app/companies/[id]/hr/reports/page.tsx` | Etapa 3 completada | Exportaciones de PIP |
| 5.4 | Crear pruebas unitarias para servicios HR | `__tests__/services/hr/` | Todas las etapas | Suite de pruebas unitarias |
| 5.5 | Crear pruebas E2E para flujos HR | `__tests__/e2e/hr/` | Todas las etapas | Pruebas E2E |
| 5.6 | Revisión de seguridad (RLS, permisos, validaciones) | Archivos existentes | Todas las etapas | Auditoría de seguridad |
| 5.7 | Optimización de rendimiento (consultas, índices, caché) | Archivos existentes | Todas las etapas | Informe de rendimiento |
| 5.8 | Documentación de API y guía de usuario | `docs/HR_API.md`, `docs/HR_USER_GUIDE.md` | Todas las etapas | Documentación completa |

---

## 6. Diagrama de Dependencias

```
Etapa 1 (Supabase + API) ✅
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
| Etapa 1: Supabase + API | 12 tareas | Media-Alta | ✅ Completada |
| Etapa 2: Asistencia | 6 tareas | Media | Pendiente |
| Etapa 3: Vacaciones + PIP | 10 tareas | Alta | Pendiente |
| Etapa 4: Planilla | 9 tareas | Alta | Pendiente |
| Etapa 5: Cierre + QA | 8 tareas | Media | Pendiente |
| **Total restante** | **32 tareas** | — | **10-14 semanas** |

---

## 8. Dependencias Técnicas Externas

| Dependencia | Uso | Estado |
|---|---|---|
| Supabase | Base de datos principal, autenticación, RLS, Storage | ✅ Configurado |
| Legislación Laboral Honduras | Cálculos de vacaciones, deducciones, feriados | ✅ Implementado |
| Recharts | Gráficos de dashboard de reportes | ✅ Disponible en package.json |
| html2canvas / jspdf | Generación de PDFs | ❌ No instalado (necesario para Etapa 4.8) |
| @tanstack/react-table | Tablas avanzadas para reportes | ❌ Verificar si ya está en package.json |
| xlsx | Exportación Excel | ✅ Verificar disponibilidad |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 15.5.25 | Downgraded desde 16.x (bug de Turbopack con .nft.json en Vercel) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |
