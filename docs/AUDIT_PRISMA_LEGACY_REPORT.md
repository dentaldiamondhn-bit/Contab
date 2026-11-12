# Reporte de Auditoría: Prisma Audit Middleware - Estado Legacy

> **Fecha:** 18 de Septiembre de 2026
> **Proyecto:** Contab - Sistema Contable Honduras
> **Versión:** 1.8

## 📋 Resumen Ejecutivo

Este documento describe el estado **Legacy** del módulo de auditoría basado en Prisma (`audit-middleware.ts`/`audit-service.ts`). El sistema ha migrado a Supabase para el almacenamiento de auditoría, y el código Prisma ahora solo se mantiene para **compatibilidad hacia atrás**.

---

## 1. Arquitectura Actual vs. Arquitectura Legacy

### Arquitectura Actual (Supabase-first)
- **Tabla principal:** `account_audit_log` en Supabase
- **Acceso directo:** A través de `service_role` con JWT de Clerk para RLS
- **Middleware:** No usa Prisma middleware para escritura principal
- **URL de conexión:** No requiere `DATABASE_URL` para operaciones de auditoría

### Arquitectura Legacy (Prisma)
- **Tabla principal:** `audit_outbox` → procesado → `auditLog`
- **Middleware:** `Prisma.defineExtension` en `lib/audit-middleware.ts`
- **URL de conexión:** Requiere `DATABASE_URL` env variable
- **Patrón:** Outbox Pattern (asíncrono, no bloqueante)

---

## 2. Componentes del Sistema Legacy

### 2.1 `lib/audit-middleware.ts`
**Estado:** Legacy - Mantenido para compatibilidad

```typescript
// Prisma middleware for audit logging using Outbox Pattern
// Escribe en la tabla audit_outbox en lugar de auditLog directamente,
// lo que permite procesamiento asíncrono y no bloquea transacciones de alta concurrencia
export const auditExtension = Prisma.defineExtension((client) => {
  return client.$extends({
    query: {
      async $allOperations({ model, operation, args, query }) {
        // Only audit Transaction and JournalEntry models
        if (model !== 'Transaction' && model !== 'JournalEntry') {
          return query(args);
        }
        // ... intercepta operaciones y escribe en auditOutbox
      },
    },
  });
});
```

**Funcionalidad:**
- Intercepta operaciones CREATE, UPDATE, DELETE en `Transaction` y `JournalEntry`
- Escribe en tabla `auditOutbox` con status PENDING
- No bloquea la transacción principal
- Requiere `DATABASE_URL` para conexión Prisma

### 2.2 `lib/services/audit-service.ts`
**Estado:** Legacy - Funciones helper mantidas

**Funciones principales:**
- `createAuditOutboxEntry(db, payload)` - Escribe en auditOutbox
- `getPeriodAuditTrail(dbClient, from, to, tableName?)` - Lee de auditLog directamente
- `getRecordAuditOutbox(db, tableName, recordId, limit?)` - Lee de auditOutbox
- `processAuditOutbox(db, batchSize?)` - Trabajo en lote: de PENDING a PROCESSED/FAILED, escribe en auditLog

### 2.3 `prisma/schema.prisma` - Modelos Audit
**Estado:** Legacy - Tablas maintenidas pero ya no son la fuente primaria

```prisma
model AuditOutbox {
  id              String   @id @default(cuid())
  tenantId        String   @map("tenant_id")
  tableName       String   // Tabla afectada (Transaction, JournalEntry, etc.)
  recordId        String   // ID del registro afectado
  action          String   // CREATE, UPDATE, DELETE
  oldValues       String?   // JSON old values
  newValues       String?   // JSON new values
  changedFields   String?   // Campos cambiados
  userId          String?   // Usuario que realizó la operación
  userAgent       String?   // User agent del request
  ipAddress       String?   // IP address del request
  category        String   // e.g., 'ADMIN', 'USER'
  description     String?   // Descripción
  status          String   // 'PENDING', 'PROCESSED', 'FAILED'
  createdAt       DateTime @default(now()) @map("created_at")
  processedAt     DateTime? @map("processed_at")

  @@index([tenantId], map: "idx_audit_outbox_tenant")
  @@index([status], map: "idx_audit_outbox_status")
  @@map("audit_outbox")
}

model auditLog {
  // Tabla de auditoría principal - ahora gestionada por Supabase
}
```

---

## 3. Flujo de Trabajo Actual vs. Legacy

### Flujo Actual (Supabase) ✅
```
API Route
    ↓
Clark JWT + RLS policies
    ↓
Supabase Client (service_role)
    ↓
Escritura directa en account_audit_log
    ↓
Sin middleware Prisma
    ✅ Sin DATABASE_URL requerido
    ✅ Alta performance
    ✅ Seguimiento en tiempo real
```

### Flujo Legacy (Prisma) ⚠️
```
API Route
    ↓
Prisma Middleware ($allOperations)
    ↓
Escribe auditOutbox (status PENDING)
    ↓
Job en lote processAuditOutbox()
    ↓
Escribe auditLog
    ↓
Marcar PROCESSED/FAILED
    ⚠️ Requiere DATABASE_URL
    ⚠️ Latencia adicional
    ⚠️ Patrón Outbox complejo
```

---

## 4. ¿Por qué es Legacy?

### 4.1 Motivos de la Migración a Supabase

| Motivo | Prisma Legacy | Supabase Actual |
|--------|--------------|-----------------|
| **Conexión DB** | Requiere `DATABASE_URL` | Usa `SUPABASE_URL` + `SERVICE_ROLE_KEY` |
| **Seguridad** | Row-level via Prisma | RLS nativo de PostgreSQL + JWT Clerk |
| **Performance** | Outbox pattern (2 escrituras) | Escritura directa (1 operación) |
| **Complejidad** | 3 tablas (outbox + auditLog + proceso) | 1 tabla (`account_audit_log`) |
| **Deploy** | Migraciones Prisma necesarias | Deploy directo a Supabase |
| **Tipo** | TypeScript via Prisma schema | TypeScript via Supabase Types |

### 4.2 Mantenerse por Compatibilidad

El código Prisma se mantiene por estos motivos:

1. **Migraciones existentes:** Datos antiguos en `auditOutbox` y `auditLog` aún no migrados
2. **Reportes históricos:** Algunas reportes de auditoría aún consultan las tablas Prisma
3. **Módulos antiguos:** Some módulos legacy aún importan de `lib/audit-middleware.ts`
4. **Zero downtime:** Migracióngradual sin interrumpir operaciones

---

## 5. Estado Actual de los Archivos

### Archivos Legacy (Mantenidos pero sin uso activo en flujo principal)

| Archivo | Ruta | Estado | Última Modificación |
|---------|------|--------|---------------------|
| `lib/audit-middleware.ts` | `lib/audit-middleware.ts` | ✅ Mantenido (legacy) | 17 Sept 2026 |
| `lib/services/audit-service.ts` | `lib/services/audit-service.ts` | ✅ Mantenido (legacy) | 17 Sept 2026 |
| `prisma/schema.prisma` | `prisma/schema.prisma` | ✅ Tablas maintenidas | 16 Sept 2026 |

### Archivos Activos (Nuevo flujo Supabase)

| Archivo | Ruta | Función |
|---------|------|---------|
| `lib/audit-middleware.ts` | *Reemplazado* | Ahora usa RLS policies de Supabase |
| `supabase/audit-schema.sql` | `supabase/` | Esquema de tabla `account_audit_log` |
| `lib/middleware/fiscal-validation.middleware.ts` | *Nuevo* | Middleware fiscal (CAI) |

---

## 6. Recomendaciones

### 6.1 Corto Plazo (Mantenimiento)
- [x] **Mantener** código Prisma legacy tal cual
- [x] **Documentar** estado legacy en este reporte
- [x] **No remover** tablas `auditOutbox` y `auditLog` de Prisma schema
- [x] **Verificar** que migraciones no rompan al deploy

### 6.2 Mediano Plazo (Desacoplamiento)
- [ ] **Crear script** de exportación de datos legacy → Supabase
- [ ] **Actualizar** reportes para que usen `account_audit_log` (Supabase)
- [ ] **Deprecated** importaciones de `lib/audit-middleware.ts` en nuevo código
- [ ] **Remover** `DATABASE_URL` requisito para nuevo desarrollo

### 6.3 Largo Plazo (Optimización)
- [ ] **Eliminar** `AuditOutbox` modelo Prisma (después de migrar todos los datos)
- [ ] **Eliminar** `auditExtension` middleware Prisma
- [ ] **Sustituir** por funciones directas Supabase
- [ ] **Actualizar** documentación técnica

---

## 7. Conclusión

El módulo de auditoría Prisma (`audit-middleware.ts`/`audit-service.ts`) se encuentra en estado **Legacy** y se mantiene exclusivamente para **compatibilidad hacia atrás**. 

**Decisión arquitectónica:**
- **Flujo principal:** Supabase (`account_audit_log` + RLS policies + JWT Clerk)
- **Flujo legacy:** Prisma (`auditOutbox` → `auditLog` con patrón Outbox)
- **Estado:** Código maintenido pero sin ser la vía principal

**Impacto:** 
- Desarrollo nuevo usa Supabase directamente
- Módulos legacy aún funcionan con Prisma
- Mantener compatibilidad cero-downtime durante transición

---

## 8. Próximos Pasos

1. **Auditar datos:** Revisar cantidad de registros en `auditOutbox` vs `account_audit_log`
2. **Script migración:** Crear script para mover datos old → new si es necesario
3. **Actualizar imports:** Verificar qué archivos aún importan del middleware legacy
4. **Deprecated plan:** Planificar remoción gradual en próximos 2-3 meses
5. **Tests:** Verificar que flujo Supabase no rompe validaciones existentes

> **Actualización (21 Sept 2026):** El outbox de auditoría en Supabase (`audit_outbox`) fue reparado en producción — los triggers usan `to_jsonb(NEW/OLD)` con guarda de excepción, `supabase/outbox-audit.sql` es ahora idempotente, y existe un script mínimo `supabase/fix-audit-triggers-jsonb.sql` (solo funciones). Detalle en `SEGURIDAD_CONTROL_REPORT.md` §8.1.

---
*Reporte generado automáticamente el 18 de Septiembre de 2026 como parte de la documentación del sistema Contab.*