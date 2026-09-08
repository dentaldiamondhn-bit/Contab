# Workflows del Módulo de Recursos Humanos

> **Fecha:** 7 de Septiembre de 2026
> **Sistema:** Diamond Accounting — Módulo RRHH
> **Tenant:** ANGELOH7 (Angelos)

---

## Índice

1. [Gestión de Empleados](#1-gestión-de-empleados)
2. [Control de Asistencia](#2-control-de-asistencia)
3. [Cálculo de Nómina](#3-cálculo-de-nómina)
4. [Vacaciones y Permisos](#4-vacaciones-y-permisos)
5. [Organigrama y Jerarquía](#5-organigrama-y-jerarquía)
6. [Departamentos y Cargos](#6-departamentos-y-cargos)
7. [Flujos Transversales](#7-flujos-transversales)

---

## 1. Gestión de Empleados

### 1.1 Creación de Empleado

```
TRIGGER: Admin hace clic en "Agregar Empleado"

PASO 1: Formulario se abre con campos vacíos
         ↓
PASO 2: Admin selecciona Departamento (dropdown)
         → Auto-completa "Jefe Directo" desde dept.manager
         → Filtra Cargos disponibles para ese departamento
         ↓
PASO 3: Admin completa campos obligatorios:
         • Nombre, Apellido, No. Identidad
         • Cargo, Salario, Fecha de ingreso
         • Tipo de contrato, Jornada, Modalidad
         ↓
PASO 4: Admin asigna "Jefe Directo" (dropdown de empleados activos)
         ↓
PASO 5: Admin sube foto (opcional) → Supabase Storage
         ↓
PASO 6: Admin agrega documentos RRHH (opcional)
         ↓
PASO 7: Clic en "Guardar"
         ↓
PASO 8: API POST /api/companies/{id}/employees
         ├── Busca/crea cargo en tabla positions
         ├── Inserta empleado en tabla employees
         ├── Inserta documentos en employee_hr_documents
         └── Registra en employee_history (action: "creation")
         ↓
PASO 9: UI recarga lista de empleados
```

**Campos guardados en `employees`:**

| Campo | DB Column | Tipo | Requerido |
|-------|-----------|------|-----------|
| Código empleado | employee_code | TEXT | Auto-generado |
| Nombre | first_name | TEXT | Sí |
| Apellido | last_name | TEXT | Sí |
| No. Identidad | id_number | TEXT | Sí |
| Foto | photo | TEXT (URL) | No |
| Cargo | position_id | UUID FK | Sí |
| Departamento | department | TEXT (nombre) | Sí |
| Salario base | base_salary | DECIMAL | Sí |
| Fecha ingreso | hire_date | DATE | Sí |
| Estado | status | TEXT | Sí (default: active) |
| Tipo contrato | contract_type | TEXT | Sí |
| Jefe directo | reports_to | UUID FK | No |
| Supervisor texto | supervisor | TEXT | No |
| Género | gender | TEXT | No |
| Días libres | free_days | INTEGER[] | No |
| Entrada | schedule_entry | TEXT | No |
| Salida | schedule_exit | TEXT | No |

**Validaciones:**
- Un empleado activo no puede ocupar un puesto ya ocupado en el mismo departamento
- El código de empleado es auto-generado (`emp-${Date.now()}`)

---

### 1.2 Edición de Empleado

```
TRIGGER: Admin hace clic en "Editar" sobre un empleado

PASO 1: Se abre formulario con datos existentes
         ↓
PASO 2: Admin modifica campos necesarios
         ↓
PASO 3: Clic en "Actualizar"
         ↓
PASO 4: API PUT /api/companies/{id}/employees
         ├── Compara datos viejos vs nuevos (detectChanges)
         ├── Actualiza registro en employees
         ├── Reemplaza documentos HR (delete + insert)
         └── Registra cambios en employee_history
         ↓
PASO 5: UI muestra mensaje de éxito
```

**Detección de cambios:** La API compara campo por campo y genera un log legible:
```
Ejemplo: "Salario: 8000 → 9000", "Puesto: Vendedor → Supervisor"
```

---

### 1.3 Cambio de Estado

#### 1.3.1 Desactivar (Terminación)

```
TRIGGER: Admin selecciona "Desactivar" en acciones del empleado

PASO 1: Modal de terminación se abre
         ↓
PASO 2: Admin completa campos obligatorios:
         • Fecha de terminación
         • Razón de terminación
         • Solicitado por (nombre)
         • Realizado por (nombre)
         • ¿Recontratable? (sí/no)
         ↓
PASO 3: Clic en "Confirmar Desactivación"
         ↓
PASO 4: API PUT /api/companies/{id}/employees
         ├── status = "terminated"
         ├── termination_date = fecha
         ├── termination_reason = razón
         ├── termination_requested_by = solicitado
         ├── termination_performed_by = realizado
         ├── rehireable = true/false
         └── employee_history: action = "deactivation"
```

#### 1.3.2 Suspender

```
TRIGGER: Admin selecciona "Suspender"

PASO 1: Modal de suspensión se abre
         ↓
PASO 2: Admin completa:
         • Fecha de suspensión
         • Razón
         • Solicitado por
         • Realizado por
         ↓
PASO 3: API PUT → status = "suspended"
         └── employee_history: action = "suspension"
```

#### 1.3.3 Reactivar

```
TRIGGER: Admin selecciona "Reactivar" (solo empleados inactive/terminated)

PASO 1: Modal de reactivación se abre
         ↓
PASO 2: Admin completa:
         • Fecha de reactivación
         • Razón
         • Solicitado por
         • Realizado por
         ↓
PASO 3: API PUT → status = "active"
         └── employee_history: action = "reactivation"
```

**Diagrama de estados:**
```
                  ┌──────────────┐
         crear →  │   ACTIVE     │ ←────────────────┐
                  └──────┬───────┘                   │
                         │                           │
              ┌──────────┼──────────┐                │
              ▼          ▼          ▼                │
      ┌──────────┐ ┌──────────┐ ┌──────────────┐    │
      │INACTIVE  │ │TERMINATED│ │  SUSPENDED   │    │
      └──────────┘ └──────────┘ └──────┬───────┘    │
                                       │             │
                                       └─────────────┘
                                          reactivar
```

---

### 1.4 Importación CSV de Empleados

```
TRIGGER: Admin hace clic en "Importar CSV"

PASO 1: Admin selecciona archivo CSV/XLSX
         ↓
PASO 2: Sistema parsea el archivo
         ↓
PASO 3: Para cada fila:
         ├── Valida campos obligatorios
         ├── Busca/crea cargo en positions
         └── Crea empleado vía API POST
         ↓
PASO 4: Muestra resumen: X creados, Y errores
```

---

### 1.5 Subir Foto de Empleado

```
TRIGGER: Admin hace clic en avatar/foto (org chart o empleados)

PASO 1: Selector de archivo se abre (solo imágenes)
         ↓
PASO 2: Validación: max 5MB, formatos JPG/PNG/WebP/GIF
         ↓
PASO 3: POST /api/companies/{id}/hr/storage
         ├── Bucket: employee-photos
         ├── Ruta: {companyId}/photos/{filename}
         └── Supabase Storage upsert
         ↓
PASO 4: API PUT employees → photo = URL devuelta
         ↓
PASO 5: UI actualiza avatar del empleado
```

---

## 2. Control de Asistencia

### 2.1 Marcar Asistencia Diaria

```
TRIGGER: Admin selecciona fecha y marca asistencia para empleados

PASO 1: Admin selecciona fecha (default: hoy)
         ↓
PASO 2: Sistema carga empleados activos + horarios + feriados
         ↓
PASO 3: Admin selecciona estado para cada empleado:
         │
         ├── ✅ Presente → amount = 0
         ├── ❌ Ausente → amount = salario * (absent_percent/100)
         ├── ⏰ Tardanza → amount = calculado por minutos
         ├── 🏖️ Vacaciones → amount = 0
         ├── ⏱️ Horas Extra → overtime_hours, overtime_amount
         ├── 🚫 Permiso Sin Sueldo → amount = salario * (unpaid_leave_percent/100)
         ├── 🏥 Incapacidad → amount = según disability_type
         │   ├── "100% patrono" → amount = 0
         │   ├── "IHSS (33%)" → amount = salario * 0.33
         │   ├── "Sin pago" → amount = salario
         │   └── "Maternidad (84 días)" → amount = 0
         ├── 🎉 Feriado → amount = salario / 30 * type_multiplier
         │   ├── "doble" → multiplier = 2
         │   └── "triple" → multiplier = 3
         └── 📅 Día Libre → amount = 0
         ↓
PASO 4: Clic en "Guardar Asistencia"
         ↓
PASO 5: API POST/PUT /api/companies/{id}/hr/attendance
         ├── Upsert: UNIQUE(tenant_id, employee_id, date)
         └── Calcula monto según estado y salario
```

**Cálculo de monto por tardanza:**
```
salary / 30 / 24 * late_minutes * late_deduction_amount
```

**Cálculo de monto por horas extra:**
```
(salary / 30 / 8) * overtime_hours * overtime_rate_multiplier
```

---

### 2.2 Vista Quincenal

```
TRIGGER: Admin cambia a pestaña "Quincenal"

PASO 1: Sistema calcula rango de fechas según quincena actual
         ├── 1ra quincena: día 1-15 del mes
         └── 2da quincena: día 16-fin del mes
         ↓
PASO 2: Carga registros de asistencia del rango
         ↓
PASO 3: Muestra tabla con:
         ├── Empleado
         ├── Estado por día (colores)
         ├── Total deducciones (suma de amounts negativos)
         ├── Total ingresos (horas extra, feriados doble/triple)
         └── Neto = ingresos - deducciones
```

---

### 2.3 Gestión de Feriados

```
TRIGGER: Admin hace clic en "Feriados"

PASO 1: Lista de feriados del año actual
         ↓
PASO 2: Admin puede:
         ├── Agregar feriado (fecha, nombre, tipo: doble/triple)
         ├── Editar feriado
         └── Eliminar feriado
         ↓
PASO 3: API CRUD → attendance_holidays
```

**Feriados pre-configurados Honduras 2026:**
- Año Nuevo (1 Ene) — Doble
- Semana Santa — Doble
- Día del Trabajo (1 May) — Doble
- Día de la Madre (30 May) — Doble
- Día del Padre (17 Jun) — Doble
- Día de la Fuerza Armada (7 Oct) — Doble
- Día de la Raza (12 Oct) — Doble
- Día de las Américas (12 Oct) — Doble
- Navidad (25 Dic) — Doble

---

### 2.4 Operaciones Masivas

```
TRIGGER: Admin usa herramientas masivas

OPCIONES:
├── "Todos Presentes" → Marca todos los activos como present
├── "Todos Ausentes" → Marca todos como ausentes
├── "Aplicar Feriados" → Marca feriado del día seleccionado
└── "Deshacer/Rehacer" → Historial de acciones (undo stack)
```

---

### 2.5 Importación de Asistencia

```
TRIGGER: Admin hace clic en "Importar"

PASO 1: Admin descarga plantilla CSV
         ↓
PASO 2: Admin llena plantilla con estados
         ↓
PASO 3: Admin sube archivo
         ↓
PASO 4: Sistema parsea y mapea estados
         ↓
PASO 5: Preview de cambios antes de aplicar
         ↓
PASO 6: Admin confirma → API POST batch
```

---

### 2.6 Horarios por Empleado

```
TRIGGER: Admin configura horario de un empleado

PASO 1: Selecciona empleado
         ↓
PASO 2: Define:
         • Hora entrada (schedule_entry)
         • Hora salida (schedule_exit)
         • Días libres (INTEGER[]: 0=Dom, 1=Lun, ..., 6=Sáb)
         ↓
PASO 3: API PUT → attendance_schedules + employees.schedule_entry/exit
```

---

## 3. Cálculo de Nómina

### 3.1 Configuración de Nómina

```
TRIGGER: Admin accede a configuración de nómina

CAMPOS CONFIGURABLES:
├── Frecuencia: semanal | quincenal | mensual | cada 2 semanas
├── IGSS empleado: 3.19% (default)
├── IGSS patrono: 4.12% (default)
├── IHSS: 2.5% (default)
├── RAP: 1.5% (default)
├── Día cierre 1ra quincena: 15
├── Día cierre 2da quincena: 30
├── Aguinaldo: 8.33%
├── Bono 14: 8.33%
├── Asignación quincena IGSS/IHSS/RAP: ambas | 1ra | 2da
└── Días límite: documentos, asistencia, horas extra, bonificación
```

---

### 3.2 Cálculo de Nómina (Paso a Paso)

```
TRIGGER: Admin selecciona período y hace clic "Calcular Nómina"

PASO 1: Seleccionar frecuencia y quincena
         ├── "Ambas quincenas" → salario / 2
         ├── "1ra quincena" → salario completo
         └── "2da quincena" → salario completo
         ↓
PASO 2: Para cada empleado activo:
         │
         ├── 2.1 Calcular salario base del período
         │   └── getPeriodSalary(salary, frequency):
         │       ├── quincenal → salary / 2
         │       ├── semanal → salary / 4
         │       ├── mensual → salary
         │       └── cada 2 semanas → salary / 2
         │
         ├── 2.2 Aplicar deducciones de asistencia
         │   ├── Faltas → resta del salario
         │   ├── Tardanzas → resta calculada
         │   └── Incapacidades → según tipo
         │
         ├── 2.3 Agregar ingresos extras
         │   ├── Horas extra → sobretiempo
         │   ├── Feriados doble/triple → bonificación
         │   └── Vacaciones → días tomados
         │
         ├── 2.4 Calcular deducciones LEGALES
         │   ├── IGSS empleado:
         │   │   ├── Si quincena = "ambas": (salario/2) * igss_employee%
         │   │   ├── Si quincena = "1ra": salario * igss_employee%
         │   │   └── Si quincena = "2da": salario * igss_employee%
         │   ├── IHSS: salary * ihss%
         │   ├── RAP: salary * rap%
         │   └── NOTA: Cada empleado puede tener override individual
         │
         ├── 2.5 Aplicar deducciones ESTÁNDAR por empleado
         │   ├── Cada empleado puede activar/desactivar IGSS/IHSS/RAP
         │   └── Puede tener porcentaje custom por empleado
         │
         ├── 2.6 Aplicar deducciones CUSTOM por empleado
         │   ├── Tipo: fijo (monto) o porcentaje
         │   ├── Frecuencia: mensual, quincenal, semanal
         │   └── Asignación quincena: ambas, 1ra, 2da
         │   └── NOTA: El voucher usa calc.customItems (monto ajustado al período)
         │
         ├── 2.7 Calcular salario neto
         │   └── net = base + ingresos - deducciones
         │
         └── 2.8 Calcular costo patrono
             └── employerCost = salary * igss_employer%
         ↓
PASO 3: Mostrar tabla de resultados
         ├── Empleado, base, deducciones, ingresos, neto
         ├── Totales del período
         └── Costo total patrono
```

**Fórmula resumen:**
```
salario_neto = salario_base
             + horas_extra
             + feriados_doble_triple
             - faltas
             - tardanzas
             - igss_empleado
             - ihss
             - rap
             - deducciones_estandar
             - deducciones_custom
```

---

### 3.3 Generación de Comprobante de Pago

```
TRIGGER: Admin hace clic en "Ver Comprobante" de un empleado

PASO 1: Popup HTML con diseño dos columnas
         ├── IZQUIERDA:
         │   ├── Nombre del empleado
         │   ├── Puesto / Departamento
         │   ├── Período de pago
         │   ├── Días laborados
         │   └── Firma
         └── DERECHA:
             ├── Salario base
             ├── Deducciones (IGSS, IHSS, RAP, custom)
             ├── Ingresos (horas extra, feriados)
             ├── Total deducciones
             └── Salario neto
         ↓
PASO 2: window.print() para imprimir
```

---

### 3.4 Cierre de Nómina

```
TRIGGER: Admin hace clic en "Cerrar Nómina"

PASO 1: Confirmación: "¿Cerrar nómina del período {periodo}?"
         ↓
PASO 2: API POST /api/companies/{id}/hr/payroll/closed
         ├── Guarda snapshot completo:
         │   ├── periodo, mes, año, frecuencia
         │   ├── total_period_base, total_base
         │   ├── total_deductions, total_igss_employer
         │   ├── total_net_pay
         │   ├── employee_count
         │   └── employees: JSONB con desglose por empleado
         └── closed_by = usuario actual
         ↓
PASO 3: UI muestra pestaña "Historial" con planillas cerradas
```

**Estructura del JSONB `employees` en payroll_closed:**
```json
[
  {
    "id": "emp-xxx",
    "name": "Juan Pérez",
    "position": "Vendedor",
    "base": 8000,
    "periodBase": 4000,
    "deductions": 500,
    "igssEmployer": 165,
    "netPay": 3500,
    "attendanceDeductions": 200,
    "attendanceIncomes": 100
  }
]
```

---

### 3.5 Historial de Planillas Cerradas

```
TRIGGER: Admin accede a pestaña "Historial"

PASO 1: GET /api/companies/{id}/hr/payroll/closed
         ↓
PASO 2: Lista de planillas cerradas
         ├── Período
         ├── Empleados incluidos
         ├── Total neto pagado
         ├── Fecha de cierre
         └── Cerrado por
         ↓
PASO 3: Admin puede expandir para ver desglose por empleado
```

---

## 4. Vacaciones y Permisos

### 4.1 Gestión de Tipos de Permiso

```
TRIGGER: Admin accede a "Tipos de Permiso"

PASO 1: Lista de tipos existentes
         ├── 🏖️ Vacaciones (días anuales por ley)
         ├── 📋 Permiso Personal
         ├── 🏥 Enfermedad
         ├── ⭐ Permiso Especial
         └── 🚫 Sin Goce de Sueldo
         ↓
PASO 2: Admin puede:
         ├── Crear tipo personalizado (nombre, icono, color, días anuales)
         ├── Editar tipo existente
         └── Eliminar tipo (si no tiene solicitudes asociadas)
```

**Cálculo automático de días de vacaciones por ley hondureña:**
```
Antigüedad < 1 año  → 0 días
Antigüedad = 1 año  → 10 días
Antigüedad = 2 años → 12 días
Antigüedad = 3 años → 14 días
Antigüedad ≥ 4 años → min(20, 14 + (años - 3))
```

---

### 4.2 Flujo de Solicitud de Permiso

```
TRIGGER: Empleado/Supervisor crea solicitud

PASO 1: Seleccionar empleado
         ↓
PASO 2: Seleccionar tipo de permiso
         ↓
PASO 3: Definir fechas (inicio, fin)
         ↓
PASO 4: Escribir razón/motivo
         ↓
PASO 5: Enviar solicitud
         ↓
PASO 6: API POST → permission_requests
         ├── status = "pending"
         ├── type_id = UUID del tipo
         └── days = calculado entre fechas
         ↓
PASO 7: Estado cambia a "pendiente"

═══════════════════════════════════════

FLUJO DE APROBACIÓN:

         ┌──────────────┐
         │   PENDING    │
         └──────┬───────┘
                │
        ┌───────┼───────┐
        ▼               ▼
  ┌──────────┐   ┌──────────┐
  │ APPROVED │   │ REJECTED │
  └──────────┘   └──────────┘

Al APROBAR:
├── status = "approved"
├── resolved_at = now
├── resolved_by = nombre del aprobador
└── permission_used: annual += days, monthly += days

Al RECHAZAR:
├── status = "rejected"
├── resolved_at = now
└── resolved_by = nombre del aprobador
```

---

### 4.3 Seguimiento de Uso

```
TRIGGER: Admin accede a "Estadísticas/Recuento"

PASO 1: Muestra tabla por empleado × tipo
         ├── Empleado
         ├── Tipo de permiso
         ├── Días anuales asignados
         ├── Días usados (annual)
         ├── Días del mes (monthly)
         └── Barra de progreso (usados / asignados)
         ↓
PASO 2: Admin puede hacer ajustes manuales:
         ├── Botón "+" → agregar día usado
         └── Botón "−" → quitar día usado
         ↓
PASO 3: API PUT → permission_used
```

---

## 5. Organigrama y Jerarquía

### 5.1 Asignar Jefe Directo (Árbol)

```
TRIGGER: Admin hace clic en "Asignar Jefe" en nodo del árbol

PASO 1: Dropdown con todos los empleados activos
         (excluye al empleado actual y sus descendientes)
         ↓
PASO 2: Admin selecciona jefe directo
         ↓
PASO 3: API PUT employees → reports_to = UUID del jefe
         ↓
PASO 4: Árbol se re-renderiza con nueva jerarquía

NIVELES:
├── Depth 0 → 🟦 Gerente (Badge azul)
├── Depth 1 → 🟩 Supervisor (Badge verde)
└── Depth 2+ → ⬜ Empleado (Badge gris)
```

---

### 5.2 Subir Foto desde Org Chart

```
TRIGGER: Admin hace hover sobre avatar → clic en cámara

PASO 1: Selector de archivo (solo imágenes, max 5MB)
         ↓
PASO 2: POST /api/companies/{id}/hr/storage
         ├── Bucket: employee-photos
         └── Ruta: {companyId}/photos/{filename}
         ↓
PASO 3: PUT employees → photo = URL
         ↓
PASO 4: Avatar se actualiza en el árbol
```

---

### 5.3 Importar Jerarquía CSV

```
TRIGGER: Admin hace clic en "Importar CSV"

FORMATO CSV:
```
empleado,jefe
Juan Pérez,María García
Carlos López,Juan Pérez
Ana Martínez,María García
```

PASO 1: Admin pega contenido CSV o sube archivo
         ↓
PASO 2: Sistema parsea CSV
         ├── Header: debe tener "empleado" y "jefe"
         └── Busca nombres parcialmente en la lista de empleados
         ↓
PASO 3: Para cada fila:
         ├── Valida que empleado existe
         ├── Valida que jefe existe
         ├── Valida que no sea auto-referencia
         └── PUT employees → reports_to = jefe.id
         ↓
PASO 4: Muestra resultado: X actualizados, Y errores
         ↓
PASO 5: Recarga empleados
```

---

## 6. Departamentos y Cargos

### 6.1 CRUD Departamentos

```
CREAR:
├── Nombre (requerido)
├── Descripción
├── Gerente (dropdown de empleados activos)
└── Departamento padre (opcional, jerarquía)

EDITAR:
└── Inline: nombre, descripción, gerente, padre

ELIMINAR:
├── Confirmación: "Se eliminarán sus puestos también"
├── Elimina todos los positions del departamento
└── Elimina el departamento
```

**Jerarquía de departamentos:**
```
Administración
├── Contabilidad
└── Recursos Humanos
Ventas
Operaciones
```

---

### 6.2 CRUD Cargos

```
CREAR:
├── Nombre (requerido)
├── Descripción
├── Rango salarial (mín, máximo)
├── Departamento (asignado al crear desde dept)
└── Cargo padre (opcional, dentro del mismo departamento)

EDITAR:
└── Inline: nombre, salario, padre

ELIMINAR:
└── Confirmación simple
```

**Cada cargo muestra:**
- Nombre del cargo
- Rango salarial (min - max)
- Empleado que lo ocupa (verde) o "Sin asignar" (gris)
- Cargo superior al que reporta

---

## 7. Flujos Transversales

### 7.1 Flujo Completo: Contratación → Nómina

```
1. Crear departamento → departments
2. Crear cargo → positions
3. Asignar jerarquía cargo → positions.parent_id
4. Crear empleado → employees (con position_id, department, reports_to)
5. Asignar foto → Supabase Storage
6. Subir documentos → employee_hr_documents
7. Configurar horario → attendance_schedules + schedule_entry/exit
8. Marcar asistencia diaria → attendance
9. Cerrar quincena/mes → cálculo de nómina
10. Generar comprobantes → popup HTML
11. Cerrar nómina → payroll_closed (snapshot)
```

---

### 7.2 Flujo: Permiso → Impacto en Nómina

```
1. Empleado solicita permiso → permission_requests
2. Supervisor aprueba → status = "approved"
3. permission_used se actualiza (annual/monthly)
4. En asistencia: se marca como "vacaciones" o "permiso"
5. En nómina: los días de permiso afectan el cálculo
   ├── Permiso Sin Sueldo → descuenta del salario base
   └── Vacaciones → no descuenta (son días pagados)
```

---

### 7.3 Flujo: Asistencia → Impacto en Nómina

```
ASISTENCIA                          NÓMINA
─────────────                       ──────
Presente (0)           →           Sin impacto
Ausente               →           -salario * absent_percent%
Tardanza              →           -monto calculado
Horas Extra           →           +overtime_amount
Feriado Doble         →           +salario/30 * 2
Feriado Triple        →           +salario/30 * 3
Incapacidad 100%      →           Sin impacto
Incapacidad IHSS      →           -salario * 33%
Incapacidad Sin Pago  →           -salario completo
Permiso Sin Sueldo    →           -salario * unpaid_percent%
Día Libre             →           Sin impacto
```

---

### 7.4 Flujo: Cambio de Estado → Impacto en Otros Módulos

```
ESTADO CAMBIADO A       ASISTENCIA        NÓMINA         PERMISOS
──────────────────      ───────────       ──────         ────────
terminated              No aparece        No se calcula  Solicitudes canceladas
suspended               No aparece        No se calcula  Solicitudes en pausa
active                  Aparece           Se calcula     Solicitudes normales
```

---

### 7.5 Flujo: Reportes

```
ASISTENCIA → GET /hr/attendance/reports
├── Filtro por rango de fechas
├── Resumen: total empleados, % asistencia, presentes, ausentes, tardanzas
├── Gráficos: tendencia diaria, distribución estados, horas extra
├── Ranking: empleados con más faltas
├── Incapacidades: distribución por tipo
├── Feriados: lista del período
└── Exportación CSV

NÓMINA → Datos en payroll_closed
├── Histórico de planillas cerradas
├── Desglose por empleado
└── Totales por período

EMPLEADOS → Búsqueda con filtros
├── Texto libre (8 campos)
├── Filtros: departamento, cargo, estado, contrato, género
├── Ordenamiento y paginación
└── Exportación Excel
```

---

## Diagrama de Dependencias entre Workflows

```
                    ┌─────────────────────┐
                    │   CREAR EMPLEADO    │
                    └──────────┬──────────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────┐ ┌──────────────┐
    │  ASIGNAR JERAR- │ │  CONFIGURAR │ │  SUBIR FOTO  │
    │  QUÍA (reports_ │ │  HORARIO    │ │  / DOCS      │
    │  to)            │ │             │ │              │
    └────────┬────────┘ └──────┬──────┘ └──────────────┘
             │                 │
             ▼                 ▼
    ┌─────────────────┐ ┌─────────────┐
    │  ORGANIGRAMA    │ │  ASISTENCIA │
    │  (visualización)│ │  DIARIA     │
    └─────────────────┘ └──────┬──────┘
                               │
              ┌────────────────┼────────────────┐
              ▼                ▼                ▼
    ┌─────────────────┐ ┌─────────────┐ ┌──────────────┐
    │  VISTA          │ │  FERIADOS   │ │  HORARIOS    │
    │  QUINCENAL      │ │             │ │              │
    └────────┬────────┘ └─────────────┘ └──────────────┘
             │
             ▼
    ┌─────────────────┐
    │  CALCULAR       │
    │  NÓMINA         │
    └────────┬────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────────┐
│COMPRO- │ │CERRAR  │ │ HISTORIAL  │
│BANTE   │ │NÓMINA  │ │            │
└────────┘ └────────┘ └────────────┘

    ┌─────────────────┐
    │  SOLICITUD      │
    │  PERMISO        │
    └────────┬────────┘
             │
    ┌────────┼────────┐
    ▼        ▼        ▼
┌────────┐ ┌────────┐ ┌────────────┐
│APROBAR │ │RECHAZAR│ │ USO DE     │
│        │ │        │ │ PERMISOS   │
└────────┘ └────────┘ └────────────┘
```

---

## Resumen de APIs por Workflow

| Workflow | Método | Endpoint | Tabla |
|----------|--------|----------|-------|
| Crear empleado | POST | `/api/.../employees` | employees |
| Editar empleado | PUT | `/api/.../employees` | employees |
| Eliminar empleado | DELETE | `/api/.../employees` | employees |
| Buscar empleados | GET | `/api/.../hr/employees/search` | employees |
| Subir foto | POST | `/api/.../hr/storage` | storage.buckets |
| Marcar asistencia | POST/PUT | `/api/.../hr/attendance` | attendance |
| Feriados CRUD | GET/POST/PUT/DELETE | `/api/.../hr/attendance/holidays` | attendance_holidays |
| Horarios | GET/POST/PUT | `/api/.../hr/attendance/schedules` | attendance_schedules |
| Config asistencia | GET/PUT | `/api/.../hr/attendance/config` | attendance_deduction_config |
| Reportes asistencia | GET | `/api/.../hr/attendance/reports` | (agregado) |
| Config nómina | GET/PUT | `/api/.../hr/payroll/config` | payroll_config |
| Deducciones | GET/POST/PUT/DELETE | `/api/.../hr/payroll/deductions` | payroll_deductions |
| Cerrar nómina | POST | `/api/.../hr/payroll/closed` | payroll_closed |
| Historial | GET | `/api/.../hr/payroll/closed` | payroll_closed |
| Tipos permiso | GET/POST/PUT/DELETE | `/api/.../hr/permissions/types` | permission_types |
| Solicitudes | GET/POST/PUT | `/api/.../hr/permissions/requests` | permission_requests |
| Uso permisos | GET/PUT | `/api/.../hr/permissions/used` | permission_used |
| Departamentos | GET/POST/PUT/DELETE | `/api/.../hr/departments` | departments |
| Cargos | GET/POST/PUT/DELETE | `/api/.../hr/positions` | positions |
