# Guía de Migración - Utilidades de Fecha con Timezone

## Overview

Se ha creado un servicio centralizado para manejo de fechas con timezone de Honduras (`America/Tegucigalpa`) para resolver problemas de consistencia en todo el proyecto.

## Ubicación del Servicio

```
/lib/date-utils.ts
```

## Funciones Disponibles

### 1. `formatDateForInput(date: string | Date | null | undefined): string`
**Uso:** Formatear fechas para inputs de tipo `date` (formato YYYY-MM-DD)
```typescript
// Antes
<input type="date" value={someDate} />

// Ahora  
<input type="date" value={formatDateForInput(someDate)} />
```

### 2. `formatDateForDisplay(date: string | Date | null | undefined): string`
**Uso:** Mostrar fechas en español (formato local)
```typescript
// Antes
{new Date(date).toLocaleDateString('es-HN', { month: 'short', day: 'numeric', year: 'numeric' })}

// Ahora
{formatDateForDisplay(date)}
```

### 3. `formatDateRange(startDate: string | Date | null | undefined, endDate?: string | Date | null | undefined): string`
**Uso:** Mostrar rangos de fechas
```typescript
// Antes
{new Date(start).toLocaleDateString('es-HN', { month: 'short', day: 'numeric', year: 'numeric' })}
{end && ` - ${new Date(end).toLocaleDateString('es-HN', { month: 'short', day: 'numeric', year: 'numeric' })}`}

// Ahora
{formatDateRange(start, end)}
```

### 4. `isDateExpired(endDate: string | Date | null | undefined): boolean`
**Uso:** Verificar si una fecha ha expirado
```typescript
// Antes
const isExpired = endDate && new Date(endDate) < new Date();

// Ahora
const isExpired = isDateExpired(endDate);
```

### 5. `getCurrentDateForInput(): string`
**Uso:** Obtener fecha actual en formato para inputs
```typescript
const today = getCurrentDateForInput();
```

### 6. `inputDateToISO(dateString: string | null | undefined): string | null`
**Uso:** Convertir fecha de input a formato ISO para base de datos
```typescript
const isoDate = inputDateToISO(inputValue);
```

## Migración Paso a Paso

### 1. Agregar Import
```typescript
import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
```

### 2. Reemplazar Formateo de Visualización
**Buscar:**
```javascript
.toLocaleDateString('es-HN', { month: 'short', day: 'numeric', year: 'numeric' })
```

**Reemplazar con:**
```typescript
formatDateForDisplay()
```

### 3. Reemplazar Rangos de Fecha
**Buscar:**
```javascript
new Date(start).toLocaleDateString(...)
{end && ` - ${new Date(end).toLocaleDateString(...)}`}
```

**Reemplazar con:**
```typescript
formatDateRange(start, end)
```

### 4. Reemplazar Verificación de Expiración
**Buscar:**
```javascript
new Date(endDate) < new Date()
```

**Reemplazar con:**
```typescript
isDateExpired(endDate)
```

### 5. Reemplazar Values de Inputs
**Buscar:**
```javascript
<input type="date" value={someDate} />
```

**Reemplazar con:**
```javascript
<input type="date" value={formatDateForInput(someDate)} />
```

## Archivos Actualizados

### Ya Migrados:
- `app/inventory/page.tsx` - Promociones y productos
- `app/companies/[id]/page.tsx` - Fechas de empresa, CAI, talonarios
- `app/accounting/taxes/page.tsx` - Fechas de impuestos y retenciones

### Pendientes de Migración:
- `app/admin/page.tsx`
- `app/contacts/page.tsx`
- `app/accounts/server-page.tsx`
- `app/companies/[id]/security/(modules)/cai/page.tsx`
- `app/companies/[id]/security/(modules)/retenciones/page.tsx`
- Archivos en `components/`

## Script Automático

Se ha creado un script para ayudar con la migración:

```bash
node scripts/update-date-imports.js
```

Este script:
1. Busca archivos que usan `toLocaleDateString`
2. Agrega automáticamente los imports necesarios
3. Reporta qué archivos necesitan actualización manual

## Benefits

### 1. **Consistencia**
- Todas las fechas usan el mismo timezone (America/Tegucigalpa)
- Formato consistente en toda la aplicación

### 2. **Mantenibilidad**
- Centralizado en un solo servicio
- Fácil de actualizar o modificar

### 3. **Precisión**
- Manejo correcto de timezone
- Comparaciones de fechas precisas

### 4. **Type Safety**
- Tipos TypeScript definidos
- Manejo de null/undefined

## Ejemplos Prácticos

### Componente de Tarjeta
```typescript
// Antes
<CardDescription>
  Vence: {new Date(expiryDate).toLocaleDateString('es-HN', { month: 'short', day: 'numeric', year: 'numeric' })}
</CardDescription>

// Ahora
<CardDescription>
  Vence: {formatDateForDisplay(expiryDate)}
</CardDescription>
```

### Verificación de Expiración
```typescript
// Antes
const isExpired = product.promotionEndDate && new Date(product.promotionEndDate) < new Date();
const showBadge = product.isDiscount && !isExpired;

// Ahora
const isExpired = isDateExpired(product.promotionEndDate);
const showBadge = product.isDiscount && !isExpired;
```

### Input de Fecha
```typescript
// Antes
<input
  type="date"
  value={promotionData.promotionEndDate || ''}
  onChange={(e) => setPromotionData(prev => ({ ...prev, promotionEndDate: e.target.value }))}
/>

// Ahora
<input
  type="date"
  value={formatDateForInput(promotionData.promotionEndDate)}
  onChange={(e) => setPromotionData(prev => ({ ...prev, promotionEndDate: e.target.value }))}
/>
```

## Troubleshooting

### Problema: Las fechas no se muestran correctamente
**Solución:** Verificar que los datos de la base de datos estén en formato ISO string

### Problema: Los inputs no muestran el valor
**Solución:** Usar `formatDateForInput()` para asegurar formato YYYY-MM-DD

### Problema: La expiración no funciona correctamente
**Solución:** Usar `isDateExpired()` que maneja timezone correctamente

## Future Enhancements

1. **Formatos personalizables:** Agregar parámetros para diferentes formatos
2. **Timezone configurable:** Permitir cambiar timezone por usuario/empresa
3. **Validación:** Agregar validación de rangos de fechas
4. **Relativos:** Agregar funciones para fechas relativas ("hace 2 días")
