# Documentation de API Contable

> **Proyecto:** Contab - Sistema Contable Honduras
> **Fecha:** 18 de Septiembre de 2026
> **Versión:** 1.8

---

## Tabla de Contenidos

1. [Autenticación y Headers](#autenticación-y-headers)
2. [Endpoints de Transacciones](#endpoints-de-transacciones)
3. [Endpoints de Balances y Cierres](#endpoints-de-balances-y-cierres)
4. [Endpoints de Exportación](#endpoints-de-exportación)
5. [Endpoints de Auditoría](#endpoints-de-auditoría)
6. [Endpoints de Períodos](#endpoints-de-períodos)
7. [Endpoints de Catálogo](#endpoints-de-catalogo)
8. [Endpoints de Reportes](#endpoints-de-reportes)

---

## 1. Autenticación y Headers

Todos los endpoints requieren autenticación mediante headers:

| Header | Descripción | Requerido |
|--------|-------------|-----------|
| `x-tenant-id` | ID del tenant/empresa | **Sí** (para la mayoría de endpoints) |
| `x-user-email` | Email del usuario que realiza la operación | Opcional |
| `Content-Type` | `application/json` | Sí para POST/PUT |

### Ejemplo de header:
```http
x-tenant-id: T1
x-user-email: usuario@empresa.com
Content-Type: application/json
```

---

## 2. Endpoints de Transacciones

### `POST /api/accounting/transactions`

Crear un nuevo asiento contable (póliza).

**Body params:**
- `description`: Descripción del asiento (requerido)
- `date`: Fecha en formato YYYY-MM-DD (requerido)
- `currency`: Moneda (opcional, default: HNL)
- `voucherType`: Tipo de comprobante (INGRESO, EGRESO, DIARIO, AJUSTE)
- `voucherNumber`: Número de comprobante (opcional, se genera automáticamente)
- `entries`: Array de partidas contables (requerido)
  - `accountId`: ID de la cuenta (requerido)
  - `amount`: Monto (requerido)
  - `isDebit`: `true` para débito, `false` para crédito

**Respuestas:**
- `201`: Asiento creado exitosamente
- `400`: Error de validación (desbalanceado, descripción vacía, cuenta inexistente)
- `401`: Sin tenant header
- `500`: Error interno del servidor

**Ejemplo request:**
```http
POST /api/accounting/transactions
x-tenant-id: T1
Content-Type: application/json

{
  "description": "Venta de mercancías",
  "date": "2026-09-17",
  "currency": "HNL",
  "voucherType": "INGRESO",
  "entries": [
    { "accountId": "1101", "amount": 5000, "isDebit": true },
    { "accountId": "4101", "amount": -5000, "isDebit": false }
  ]
}
```

### `GET /api/accounting/transactions`

Obtener lista de transacciones con paginación y filtros.

**Query params:**
- `tenantId`: ID del tenant (opcional, puede venir en header)
- `voucherType`: Filtrar por tipo (INGRESO, EGRESO, DIARIO, AJUSTE)
- `from`: Fecha inicial YYYY-MM-DD
- `to`: Fecha final YYYY-MM-DD
- `page`: Página número (opcional)
- `limit`: Registros por página (opcional, default: 50)

**Respuesta:** Objeto con `transactions`, `total`, `page`, `totalPages`

---

### `PUT /api/accounting/transactions/[id]`

Actualizar un asiento existente.

**Body params:** Igual que POST

**Respuestas:**
- `200`: Asiento actualizado
- `400`: Error de validación
- `404`: Asiento no encontrado

---

### `DELETE /api/accounting/transactions/[id]`

Eliminar un asiento (marcar como anulado).

**Respuestas:**
- `200`: Asiento anulado
- `404`: Asiento no encontrado

---

## 3. Endpoints de Balances y Cierres

### `GET /api/accounting/trial-balance`

Obtener balances de comprobación.

**Query params:**
- `tenantId`: ID del tenant (requerido)
- `year`: Año (opcional, default: actual)
- `month`: Mes (opcional)

**Respuesta:**
```json
{
  "success": true,
  "data": {
    "period": { "year": 2026, "month": 9 },
    "accounts": [
      { "account_id": "1101", "code": "1101", "name": "Caja", "debit": 5000, "credit": 0, "balance": 5000, "balance_type": "DEBIT" },
      ...
    ],
    "totalDebits": 15000,
    "totalCredits": 15000,
    "isBalanced": true,
    "transactionCount": 42
  }
}
```

### `POST /api/accounting/opening-balances/auto`

Automatizar la generación de balances de apertura.

**Body params:**
- `year`: Año para el cual generar balances (requerido)
- `apply`: `true` para aplicar automáticamente, `false` para vista previa
- `overwrite`: `true` para sobrescribir balances existentes

**Respuestas:**
- `200`: `{ success: true, result: { year, applied, skippedNoChart, skippedZero } }`
- `400`: Error de validación (año inválido, período cerrado)
- `403`: Período bloqueado

### `GET /api/accounting/period-closing`

Obtener estado de períodos contables.

**Query params:**
- `tenantId`: ID del tenant (requerido)
- `year`: Año específico (opcional)
- `month`: Mes específico (opcional)

**Respuesta:**
```json
{
  "periods": [
    { "year": 2026, "month": 9, "status": "open", "closed_by": null, "transaction_count": 42, "prev_month_closed": false, "can_close": true },
    ...
  ],
  "years": [2026, 2025],
  "details": { "year": 2026, "month": 9, ... } // si se especifican year y month
}
```

### `POST /api/accounting/period-closing`

Cerrar un período contable.

**Body params:**
- `year`: Año (requerido)
- `month`: Mes (1-12 para mensual, 0 para anual)
- `notes`: Notas del cierre (opcional)
- `action`: "close" para cerrar, "reopen" para reabrir

**Respuestas:**
- `200`: `{ success: true, year, month, status: "closed"|"locked", ... }`
- `400`: Error de validación (período futuro, sin balance, asientos pendientes)
- `403`: Período bloqueado (solo para reabrir)

### `PATCH /api/accounting/period-closing`

Reabrir un período cerrado o bloqueado.

**Body params:**
- `year`, `month`: Período a reabrir
- `reason`: Motivo de la reapertura (requerido si el período está locked)

**Respuestas:**
- `200`: Período reabierto exitosamente
- `400`: No se puede reabrir período locked

---

## 4. Endpoints de Exportación

### `GET /api/accounting/export`

Exportar reportes a PDF o Excel.

**Query params:**
- `module`: `trial-balance` | `polizas` | `tax-report`
- `period`: YYYY-MM (opcional, default: mes actual)
- `tenantId`: ID del tenant (requerido)
- `type`: `pdf` | `excel` (opcional, default: pdf)

**Respuestas:**
- **PDF:** Retorna URL firmada en Supabase Storage
- **Excel:** Retorna archivo Excel como descarga directa

**Módulos soportados:**
- `trial-balance`: Balanza de comprobación
- `polizas`: Historial de asientos (solo PDF)
- `tax-report`: Reporte ISV/SAR (ambos formatos)

### `GET /api/accounting/export-audit`

Exportar logs de auditoría a PDF o Excel.

**Query params:**
- `period`: YYYY-MM (opcional, default: mes actual)
- `tenantId`: ID del tenant (requerido)
- `type`: `pdf` | `excel` (opcional, default: pdf)

**Respuestas:**
- **PDF:** URL firmada con historial de auditoría formateado
- **Excel:** Archivo CSV/Excel con logs detallados

---

## 5. Endpoints de Auditoría

### `GET /api/accounting/audit-logs`

Obtener logs de auditoría con filtros.

**Query params:**
- `tenantId`: ID del tenant (requerido)
- `action`: Filtrar por acción (JOURNAL_CREATE, OPENING_BALANCE_UPDATE, PERIOD_CLOSED, PERIOD_LOCKED, etc.)
- `accountCode`: Filtrar por código de cuenta
- `from`: Fecha inicial YYYY-MM-DD
- `to`: Fecha final YYYY-MM-DD
- `pagina`: Número de página (para paginación)
- `limite`: Registros por página (opcional, default: 50)

**Respuesta:**
```json
{
  "logs": [
    {
      "id": "uuid",
      "tenant_id": "T1",
      "account_code": "1101",
      "action": "JOURNAL_CREATE",
      "old_values": null,
      "new_values": { "transactionId", "voucherType", "voucherNumber", "date", "amount", "currency", "description" },
      "performed_by": "usuario@empresa.com",
      "performed_at": "2026-09-17T10:30:00Z",
      "account_name": "Caja",
      "description": "Asiento de apertura"
    }
  ],
  "total": 150,
  "page": 1,
  "totalPages": 5
}
```

### `GET /api/accounting/opening-balances/route`

Obtener configuración de balances de apertura.

**Respuesta:** Configuración actual de balances y estados de cuentas.

---

## 6. Endpoints de Períodos

### `GET /api/companies/[id]/accounting/period-closing`

Obtener todos los períodos con flags de cierre.

**Respuesta:** Lista de períodos con status, flags `prev_month_closed` y `can_close`, y conteo de transacciones.

### `POST /api/accounting/period-closing`

Cerrar o reabrir períodos (ver descripción en sección 3).

---

## 6. Endpoints de Catálogo

### `GET /api/accounting/accounts`

Obtener catálogo de cuentas con estructura jerárquica.

**Query params:**
- `tenantId`: ID del tenant (opcional)
- `soloActivos`: `true`/`false` (opcional)
- `conNaturaleza`: `true`/`false` (opcional)

**Respuesta:** Array de cuentas con `id`, `code`, `name`, `type`, `nature`, `parentId`, `isActive`, etc.

### `GET /api/accounting/accounts/validate`

Validar catálogo de cuentas.

**Query params:**
- `tenantId`: ID del tenant (requerido)

**Respuesta:**
```json
{
  "total": 57,
  "errores": 0,
  "advertencias": 3,
  "estado": "valid",
  "problemas": [
    { "tipo": "cuenta_sin_codigo", "count": 1 },
    { "tipo": "cuenta_sin_nombre", "count": 2 }
  ]
}
```

---

## 7. Endpoints de Reportes

### `GET /api/accounting/period-variations`

Obtener comparativas año-a-año o entre períodos.

**Query params:**
- `tenantId`: ID del tenant (requerido)
- `from`: Fecha inicial YYYY-MM
- `to`: Fecha final YYYY-MM
- `minAmount`: Monto mínimo para incluir en el reporte (opcional)

**Respuesta:**
```json
{
  "from": "2026-09",
  "to": "2025-09",
  "rows": [
    { "accountId": "1101", "code": "1101", "name": "Caja", " trend": "up" },
    ...
  ],
  "totals": { "fromBalance": 10000, "toBalance": 8500, "varAbs": -1500, "varPct": -15 },
  "counts": { "accounts": 25, "up": 8, "down": 5, "same": 6, "new": 2, "gone": 1 }
}
```

### `GET /api/reports/period-variations/page`

Interfaz de usuario para comparativas con filtros visuales.

---

## 8. Endpoints de Usuarios (Admin)

### `GET /api/accounting/users`

Listar usuarios del tenant (solo con service role).

**Respuesta:**
```json
{
  "users": [
    { "id": "uuid", "firstname": "Juan", "lastname": "Pérez", "email": "juan@empresa.com", "isactive": true, "tenantid": "T1" }
  ],
  "total": 1
}
```

---

## Ejemplos de Códigos

### Crear una póliza con Node.js:

```javascript
const fetch = require('node-fetch');

const payload = {
  description: 'Venta de mercancías',
  date: '2026-09-17',
  currency: 'HNL',
  voucherType: 'INGRESO',
  entries: [
    { accountId: '1101', amount: 5000, isDebit: true },
    { accountId: '4101', amount: -5000, isDebit: false }
  ]
};

const res = await fetch('http://localhost:3000/api/accounting/transactions', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-tenant-id': 'T1',
  },
  body: JSON.stringify(payload)
});

const data = await res.json();
console.log(data.success, data.transaction.voucherNumber);
```

### Obtener balances con Python:

```python
import requests

response = requests.get(
    'http://localhost:3000/api/accounting/trial-balance',
    params={'tenantId': 'T1'}
)
data = response.json()
print(f"Total deudor: {data['data']['totalDebits']}")
print(f"Total acreedor: {data['data']['totalCredits']}")
print(f"Balance: {data['data']['isBalanced']}")
```