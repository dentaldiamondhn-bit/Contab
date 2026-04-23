# Guía de Metadata para Clerk - Estructura Completa

## Cómo Agregar Metadata a Usuarios en Clerk

### Método 1: Desde Clerk Dashboard (Recomendado para pocos usuarios)

1. **Ve a Clerk Dashboard** → **Users**
2. **Selecciona el usuario**
3. **Ve a Metadata** → **Public metadata**
4. **Copia y pega** el JSON correspondiente al rol
5. **Click en Save**

---

### Método 2: Usando el Script de Actualización (Para múltiples usuarios)

```bash
# Configurar la variable de entorno
export CLERK_SECRET_KEY=sk_test_tu_clave_secreta

# Ejecutar el script para verificar usuarios actuales
node scripts/clerk-bulk-import.js check

# Ejecutar el script para actualizar metadata
# (necesitas crear el script de actualización primero)
node scripts/clerk-update-metadata.js
```

---

## Estructura de Metadata por Rol

### 1. SUPER_ADMIN

**Para usuarios con acceso total al sistema:**

```json
{
  "role": "SUPER_ADMIN",
  "tenantId": null,
  "tenantCode": null,
  "permissions": [
    "system:admin",
    "users:manage",
    "tenants:manage",
    "audit:view",
    "reports:all",
    "tenant:*:access"
  ],
  "isolation": {
    "tenantScope": false,
    "crossTenantAccess": true,
    "dataVisibility": "all_tenants"
  }
}
```

**IMPORTANTE:** 
- `tenantId` debe ser `null`
- `tenantCode` debe ser `null`
- Permite acceso completo a todos los tenants

---

### 2. SUPPORT

**Para equipo de soporte técnico:**

```json
{
  "role": "SUPPORT",
  "tenantId": null,
  "tenantCode": null,
  "permissions": [
    "support:admin",
    "tenants:view_basic",
    "users:view_basic",
    "tickets:manage",
    "audit:view_support",
    "reports:basic"
  ],
  "isolation": {
    "tenantScope": false,
    "crossTenantAccess": true,
    "dataVisibility": "support_limited"
  },
  "restrictions": {
    "financial_access": false,
    "sensitive_data": false,
    "user_modification": false,
    "tenant_modification": false
  }
}
```

**IMPORTANTE:**
- `tenantId` debe ser `null`
- `tenantCode` debe ser `null`
- Acceso multi-tenant pero con restricciones
- No puede ver información financiera detallada

---

### 3. ADMIN (de Tenant)

**Para administradores de una empresa específica:**

```json
{
  "role": "ADMIN",
  "tenantId": "tenant_123abc456def",
  "tenantCode": "DEN001",
  "permissions": [
    "tenant:admin",
    "users:tenant_manage",
    "inventory:manage",
    "accounting:manage",
    "reports:tenant",
    "tenant:DEN001:access"
  ],
  "isolation": {
    "tenantScope": true,
    "crossTenantAccess": false,
    "dataVisibility": "tenant_only"
  }
}
```

**IMPORTANTE:**
- `tenantId` debe ser el ID real del tenant en la base de datos
- `tenantCode` debe ser el código real del tenant (ej: DEN001, CON001, EMP001)
- Reemplazar `DEN001` en los permisos con el código real
- Solo puede acceder a datos de su tenant

---

### 4. MANAGER

**Para gerentes con acceso operativo:**

```json
{
  "role": "MANAGER",
  "tenantId": "tenant_123abc456def",
  "tenantCode": "DEN001",
  "permissions": [
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "accounting:view",
    "accounting:create",
    "reports:basic",
    "tenant:DEN001:access"
  ],
  "isolation": {
    "tenantScope": true,
    "crossTenantAccess": false,
    "dataVisibility": "tenant_only"
  }
}
```

**IMPORTANTE:**
- `tenantId` debe ser el ID real del tenant
- `tenantCode` debe ser el código real del tenant
- Reemplazar `DEN001` con el código real

---

### 5. USER

**Para usuarios estándar:**

```json
{
  "role": "USER",
  "tenantId": "tenant_123abc456def",
  "tenantCode": "DEN001",
  "permissions": [
    "inventory:view",
    "accounting:view",
    "reports:personal",
    "tenant:DEN001:access"
  ],
  "isolation": {
    "tenantScope": true,
    "crossTenantAccess": false,
    "dataVisibility": "tenant_only"
  }
}
```

**IMPORTANTE:**
- `tenantId` debe ser el ID real del tenant
- `tenantCode` debe ser el código real del tenant
- Reemplazar `DEN001` con el código real

---

### 6. VIEWER

**Para usuarios de solo lectura:**

```json
{
  "role": "VIEWER",
  "tenantId": "tenant_123abc456def",
  "tenantCode": "DEN001",
  "permissions": [
    "inventory:readonly",
    "accounting:readonly",
    "reports:view",
    "tenant:DEN001:access"
  ],
  "isolation": {
    "tenantScope": true,
    "crossTenantAccess": false,
    "dataVisibility": "tenant_only"
  }
}
```

**IMPORTANTE:**
- `tenantId` debe ser el ID real del tenant
- `tenantCode` debe ser el código real del tenant
- Reemplazar `DEN001` con el código real

---

## Cómo Obtener Tenant IDs y Códigos

### Consulta SQL para obtener tenants:

```sql
SELECT 
  id as tenantId,
  tenant_code as tenantCode,
  businessname
FROM "Tenant"
WHERE isactive = true
ORDER BY businessname;
```

**Resultado ejemplo:**
```
tenantId              | tenantCode | businessname
----------------------|------------|------------------
tenant_abc123def456   | DEN001     | Dental Diamond HN
tenant_ghi789jkl012   | CON001     | Contadora Honduras
tenant_mno345pqr678   | EMP001     | Empresa S.A.
```

---

## Pasos para Configurar un Usuario

### Paso 1: Obtener información del tenant
```sql
-- Ejecutar en tu base de datos
SELECT id, tenant_code, businessname FROM "Tenant";
```

### Paso 2: Preparar el JSON
Usa el template correspondiente al rol y reemplaza:
- `tenant_123abc456def` → con el ID real del tenant
- `DEN001` → con el código real del tenant
- `tenant:DEN001:access` → reemplaza `DEN001` con el código real

### Paso 3: Agregar metadata en Clerk
1. Ve a Clerk Dashboard
2. Selecciona el usuario
3. Ve a Metadata → Public metadata
4. Pega el JSON
5. Guarda

### Paso 4: Verificar sincronización
El webhook sincronizará automáticamente los cambios con la base de datos local.

---

## Ejemplos Completos

### Ejemplo 1: Crear Admin para Dental Diamond

**Tenant:**
- ID: `tenant_abc123def456`
- Código: `DEN001`
- Empresa: Dental Diamond HN

**Metadata para Clerk:**
```json
{
  "role": "ADMIN",
  "tenantId": "tenant_abc123def456",
  "tenantCode": "DEN001",
  "permissions": [
    "tenant:admin",
    "users:tenant_manage",
    "inventory:manage",
    "accounting:manage",
    "reports:tenant",
    "tenant:DEN001:access"
  ],
  "isolation": {
    "tenantScope": true,
    "crossTenantAccess": false,
    "dataVisibility": "tenant_only"
  }
}
```

---

### Ejemplo 2: Crear Soporte Técnico

**Metadata para Clerk:**
```json
{
  "role": "SUPPORT",
  "tenantId": null,
  "tenantCode": null,
  "permissions": [
    "support:admin",
    "tenants:view_basic",
    "users:view_basic",
    "tickets:manage",
    "audit:view_support",
    "reports:basic"
  ],
  "isolation": {
    "tenantScope": false,
    "crossTenantAccess": true,
    "dataVisibility": "support_limited"
  },
  "restrictions": {
    "financial_access": false,
    "sensitive_data": false,
    "user_modification": false,
    "tenant_modification": false
  }
}
```

---

### Ejemplo 3: Crear Contador para Contadora Honduras

**Tenant:**
- ID: `tenant_ghi789jkl012`
- Código: `CON001`
- Empresa: Contadora Honduras

**Metadata para Clerk:**
```json
{
  "role": "MANAGER",
  "tenantId": "tenant_ghi789jkl012",
  "tenantCode": "CON001",
  "permissions": [
    "inventory:view",
    "inventory:create",
    "inventory:edit",
    "accounting:view",
    "accounting:create",
    "reports:basic",
    "tenant:CON001:access"
  ],
  "isolation": {
    "tenantScope": true,
    "crossTenantAccess": false,
    "dataVisibility": "tenant_only"
  }
}
```

---

## Checklist de Configuración

Antes de guardar la metadata en Clerk, verifica:

- [ ] **Rol correcto** (SUPER_ADMIN, SUPPORT, ADMIN, MANAGER, USER, VIEWER)
- [ ] **tenantId correcto** (null para SUPER_ADMIN/SUPPORT, ID real para otros)
- [ ] **tenantCode correcto** (null para SUPER_ADMIN/SUPPORT, código real para otros)
- [ ] **Permisos actualizados** (reemplazar placeholders con códigos reales)
- [ ] **Isolation configurado** (tenantScope, crossTenantAccess, dataVisibility)
- [ ] **Restricciones** (solo para SUPPORT)
- [ ] **JSON válido** (sin errores de sintaxis)

---

## Errores Comunes

### Error: tenantId incorrecto
**Problema:** El ID del tenant no existe en la base de datos
**Solución:** Ejecuta la consulta SQL para obtener el ID correcto

### Error: tenantCode no coincide
**Problema:** El código en los permisos no coincide con tenantCode
**Solución:** Asegúrate de reemplazar todos los placeholders con el código real

### Error: JSON inválido
**Problema:** Comas faltantes o comillas incorrectas
**Solución:** Usa un validador de JSON antes de guardar

### Error: Permisos faltantes
**Problema:** Permisos `tenant:XXX:access` no actualizados
**Solución:** Reemplaza `XXX` con el código real del tenant

---

## Validación

### Verificar que la metadata se sincronizó:

```bash
# Verificar usuarios en Clerk
node scripts/clerk-bulk-import.js check

# Verificar en base de datos local
SELECT email, role, tenant_id FROM users WHERE email = 'usuario@ejemplo.com';
```

---

## Resumen

**Para SUPER_ADMIN y SUPPORT:**
- `tenantId: null`
- `tenantCode: null`
- Acceso multi-tenant

**Para roles de tenant (ADMIN, MANAGER, USER, VIEWER):**
- `tenantId: ID real del tenant`
- `tenantCode: Código real del tenant`
- Permisos específicos: `tenant:CÓDIGO:access`
- Acceso solo a su tenant

**Requisitos obligatorios:**
- `role` (string)
- `tenantId` (null o string)
- `tenantCode` (null o string)
- `permissions` (array)
- `isolation` (object)

**Opcionales:**
- `restrictions` (solo para SUPPORT)
