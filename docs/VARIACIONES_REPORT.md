# Reporte de Variaciones Periódicas

> **Documenta:** Comparación de balances contables entre dos períodos con variaciones absolutas, porcentuales y tendencias.

---

## 1. Resumen Ejecutivo

El **Reporte de Variaciones** permite comparar el estado financiero (debe/haber/saldo) de todas las cuentas contables entre dos meses diferentes. Es una herramienta esencial para:

- Identificar cuentas con cambios significativos
- Detectar tendencias (aumento o disminución de balances)
- Apoyar en el análisis de cierre de período y explicación de variaciones
- Cumplimiento de normativas fiscales hondureñas (SAR, ISV)

**Estado**: ✅ **Implementado** - API y servicio completos, listo para uso en producción.

---

## 2. Endpoint de API

```
GET /api/accounting/period-variations?tenantId=&from=YYYY-MM&to=YYYY-MM
```

### Parámetros de Query

| Parámetro | Descripción | Obligatorio | Ejemplo |
|-----------|-------------|-------------|---------|
| `tenantId` | ID del tenant (se inyecta vía header `x-tenant-id` si no se provee) | Sí | `tenant_123` |
| `from` | Período inicial (formato YYYY-MM) | Sí | `2026-08` |
| `to` | Período final (formato YYYY-MM) | Sí | `2026-09` |

### Respuesta Exitosa (200)

```json
{
  "success": true,
  "data": {
    "report": {
      "from": "2026-08",
      "to": "2026-09",
      "rows": [
        {
          "accountId": "1101",
          "code": "1101",
          "name": "Caja",
          "type": "ASSET",
          "fromDebit": 0,
          "fromCredit": 50000,
          "fromBalance": -50000,
          "toDebit": 20000,
          "toCredit": 0,
          "toBalance": 20000,
          "varAbs": 70000,
          "varPct": 140,
          "trend": "up"
        }
        // ... más filas
      ],
      "totals": {
        "fromBalance": -1500000,
        "toBalance": 500000,
        "varAbs": 2000000,
        "varPct": -133.33
      },
      "counts": {
        "accounts": 25,
        "up": 12,
        "down": 8,
        "same": 3,
        "new": 1,
        "gone": 0
      }
    }
  }
}
```

### Códigos de Error

| Código | Mensaje | Causa |
|--------|---------|-------|
| 400 | `Tenant ID requerido` | No se proporcionó tenantId |
| 400 | `from y to deben tener formato YYYY-MM (mes 01-12)` | Formato de fecha inválido |
| 400 | `from y to deben ser períodos diferentes` | Both períodos son idénticos |

---

## 3. Estructura de Datos

### `VariationRow` - Fila individual de variación

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `accountId` | `string` | ID de la cuenta en la BD |
| `code` | `string` | Código de la cuenta (ej. `1101`) |
| `name` | `string` | Nombre descriptivo de la cuenta |
| `type` | `string` | Tipo: `ASSET`, `LIABILITY`, `EQUITY`, `REVENUE`, `EXPENSE` |
| `fromDebit` | `number` | Mustio del período inicial |
| `fromCredit` | `number` | Abono del período inicial |
| `fromBalance` | `number` | Saldo del período inicial (debit - credit) |
| `toDebit` | `number` | Mustio del período final |
| `toCredit` | `number` | Abono del período final |
| `toBalance` | `number` | Saldo del período final (debit - credit) |
| `varAbs` | `number` | **Variación absoluta** (toBalance - fromBalance) |
| `varPct` | `number \| null` | **Variación porcentual** (puede ser null si fromBalance es 0) |
| `trend` | `Trend` | Tendencia: `up`, `down`, `same`, `new`, `gone` |

### `VariationsReport` - Reporte completo

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `from` | `string` | Período inicial (YYYY-MM) |
| `to` | `string` | Período final (YYYY-MM) |
| `rows` | `VariationRow[]` | Lista de todas las cuentas con variación |
| `totals` | `object` | Totales consolidados |
| `counts` | `object` | Conteo de tendencias por cuenta |

### `Totals` - Resumen financiero

| Campo | Descripción |
|-------|-------------|
| `fromBalance` | Suma de todos los saldos del período inicial |
| `toBalance` | Suma de todos los saldos del período final |
| `varAbs` | Variación absoluta total (toBalance - fromBalance) |
| `varPct` | Variación porcentual total |

### `Counts` - Conteos de tendencias

| Campo | Descripción |
|-------|-------------|
| `accounts` | Total de cuentas incluidas en el reporte |
| `up` | Cuentas con variación positiva (balance aumentó) |
| `down` | Cuentas con variación negativa (balance disminuyó) |
| `same` | Cuentas sin variación (balance igual) |
| `new` | Cuentas nuevas (existían en un período, no en otro) |
| `gone` | Cuentas dadas de baja (existían antes, ya no) |

---

## 4. Lógica de Cálculo

### Variación Absoluta
```
varAbs = toBalance - fromBalance
```

### Variación Porcentual
```
varPct = ((toBalance - fromBalance) / Math.abs(fromBalance)) * 100
```
*Retorna `null` si fromBalance es 0 (para evitar división por cero).*

### Tendencia
- `up`: `varAbs > 0` (el balance aumentó)
- `down`: `varAbs < 0` (el balance disminuyó)
- `same`: `varAbs = 0` (el balance se mantuvo)
- `new`: La cuenta no existía en el período `from`
- `gone`: La cuenta existió en `from` pero no en `to`

---

## 5. Uso en el Frontend

### Llamada desde React

```tsx
import { useEffect, useState } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";

export function usePeriodVariances(from: string, to: string) {
  const { currentTenant } = useTenant();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentTenant?.id) return;

    fetch(`/api/accounting/period-variations?tenantId=${currentTenant.id}&from=${from}&to=${to}`)
      .then((res) => {
        if (!res.ok) throw new Error("Error al cargar variaciones");
        return res.json();
      })
      .then((data) => {
        setReport(data.data.report);
        setLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setError(err.message);
        setLoading(false);
      });
  }, [currentTenant?.id, from, to]);

  return { report, loading, error };
}
```

### Ejemplo de componente de reporte

```tsx
function PeriodVariancesReport({ from, to }: { from: string; to: string }) {
  const { report, loading, error } = usePeriodVariances(from, to);

  if (loading) return <p>Cargando variaciones...</p>;
  if (error) return <p className="text-red-500">Error: {error}</p>;
  if (!report) return <p>No hay datos para el período seleccionado.</p>;

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">Reporte de Variaciones: {from} → {to}</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <h3>Total Inicial</h3>
          <p className="text-2xl font-medium">{report.totals.fromBalance.toLocaleString()} HNL</p>
        </div>
        <div>
          <h3>Total Final</h3>
          <p className="text-2xl font-medium">{report.totals.toBalance.toLocaleString()} HNL</p>
        </div>
        <div>
          <h3>Variación Total</h3>
          <p className={report.totals.varPct >= 0 ? "text-green-600" : "text-red-600">
            {report.totals.varPct?.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h3>Tendencias</h3>
          <ul>
            <li>📈 Subieron: {report.counts.up} cuentas</li>
            <li>📉 Bajaron: {report.counts.down} cuentas</li>
            <li>➖ Iguales: {report.counts.same} cuentas</li>
            <li>➕ Nuevas: {report.counts.new} cuentas</li>
            <li>➖ Eliminadas: {report.counts.gone} cuentas</li>
          </ul>
        </div>
        <div>
          <h3>Cuentas con mayor variación</h3>
          <ul>
            {report.rows
              .sort((a, b) => Math.abs(b.varAbs) - Math.abs(a.varAbs))
              .slice(0, 10)
              .map((row) => (
                <li key={row.accountId}>
                  {row.code} {row.name}: 
                  {row.varPct !== null ? `${row.varPct > 0 ? '+' : ''}${row.varPct}%` : 'N/A'} 
                  (${row.trend})
                </li>
              ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Reportes Predefinidos Disponibles

El sistema incluye los siguientes reportes de variaciones por defecto:

1. **Variaciones Mensuales** - Compara mes actual vs mes anterior
2. **Variaciones Trimestrales** - Compara trimestres del año
3. **Variaciones Anuales** - Compara año actual vs año anterior
4. **Variaciones por Cuenta** - Filtro por cuenta específica o rango de códigos

---

## 7. Integración con Otros Módulos

### Conexión con Cierre de Período
El reporte de variaciones es esencial para el proceso de cierre mensual, ya que:
- Identifica qué cuentas tienen variaciones significativas
- Sirve de base para justificar asientos de ajuste
- Ayuda a validar que los saldos iniciales del nuevo período sean consistentes

### Conexión con Estados Financieros
Los totales y variaciones del reporte alimentan automáticamente:
- **Balance General**: Cambios en activos, pasivos y patrimonio
- **Estado de Resultados**: Variaciones en ingresos y gastos
- **Flujo de Efectivo**: Movimientos de caja explicados

### Conexión con DIAT
Las variaciones de cuentas también se cruzan con el reporte DIAT para:
- Validar que los movimientos fiscales conciden con la contabilidad
- Identificar transacciones que requieren declaración formal

---

## 8. Ejemplo de Uso Práctico

### Comparar agosto vs septiembre 2026

**Solicitud API:**
```
GET /api/accounting/period-variations?tenantId=tenant_001&from=2026-08&to=2026-09
```

**Resultado esperado:** Reporte que muestra:
- 25 cuentas analizadas
- 12 con variaciones positivas (aumentos de saldo)
- 8 con variaciones negativas (disminuciones de saldo)
- 3 cuentas sin cambios
- 1 cuenta nueva
- 0 cuentas dadas de baja
- **Variación total**: +2,000,000 HNL (+133.33%)
- Cuentas destacadas: Caja (+700,000 HNL), Ventas (+350,000 HNL), Proveedores (-200,000 HNL)

---

## 9. Pruebas y QA

### Cobertura de Pruebas (Tests)

El servicio `getVariationsReport` está cubierto por tests en:
- `tests/accounting/period-variations.test.mjs`

### Casos de Prueba Incluidos

1. **Validación de formato** - `from` y `to` deben ser `YYYY-MM`
2. **Validación de períodos diferentes** - No permite `from === to`
3. **Validación de tenant** - Requiere tenantId informado
4. **Cálculo de variaciones** - Verifica varAbs, varPct y trend correctamente
5. **Fallback de columnas** - Maneja tanto `tenantId` como `tenant_id`
6. **Filtro de cuentas nuevas y dadas de baja** - Detecta accounts new/gone correctamente

### Ejecutar Tests

```bash
# Desde la raíz del proyecto Contab
npm test -- --grep "period-variations"
```

---

## 10. Próximas Mejoras

| # | Característica | Prioridad | Comentario |
|---|----------------|-----------|------------|
| 1 | Exportación a Excel/CSV | Media | Permite análisis fuera de la plataforma |
| 2 | Filtro por rango de códigos de cuenta | Media | Facilita reports específicos por tipo de cuenta |
| 3 | Comparación de más de 2 períodos | Baja | Soporte para tendencias multi-período |
| 4 | Exportación a PDF profesional | Alta | Formato oficial para presentación ante autoridades |
| 5 | Alertas automáticas de variaciones críticas | Media | Notificación cuando varPct excede umbral definido |

---

*Documento generado automáticamente basado en la implementación del servicio `getVariationsReport` en `lib/services/period-variations.ts` y la API route `app/api/accounting/period-variations/route.ts`.*

**Versión**: 1.0  
**Última actualización**: 17 de Septiembre de 2026  
**Estado**: ✅ Implementado y en producción