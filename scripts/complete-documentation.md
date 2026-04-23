# Documentación Completa del Sistema Multi-Tenant

Este documento contiene toda la información necesaria para configurar, implementar y mantener el sistema multi-tenant con aislamiento de roles.

---

# Tabla de Contenidos

1. [Jerarquía de Roles](#jerarquía-de-roles)
2. [Configuración de Clerk](#configuración-de-clerk)
3. [Metadata de Usuarios](#metadata-de-usuarios)
4. [Roles Aislados por Tenant](#roles-aislados-por-tenant)
5. [Rol SUPPORT (Servicio al Cliente)](#rol-support-servicio-al-cliente)
6. [Guía Completa de Implementación](#guía-completa-de-implementación)
7. [Configuración de Base de Datos](#configuración-de-base-de-datos)
8. [Validación y Solución de Problemas](#validación-y-solución-de-problemas)

---

# Jerarquía de Roles

## Estructura de Roles

```
SUPER_ADMIN (control total del sistema)
    |
SUPPORT (soporte técnico multi-tenant)
    |
ADMIN (administración de tenant específico)
    |
MANAGER (gestión operativa)
    |
USER (acceso básico)
    |
VIEWER (solo lectura)
```

## Descripción de Roles

### SUPER_ADMIN
- **Acceso total al sistema**
- **Crear/Gestionar todos los tenants**
- **Crear usuarios en cualquier tenant**
- **tenantId: null**
- **tenantCode: null**

### SUPPORT
- **Acceso multi-tenant** con permisos limitados
- **Solo lectura** en datos sensibles
- **Gestión de tickets** de soporte
- **Ayuda a usuarios** (reset contraseñas, etc.)
- **Sin acceso financiero** ni configuración crítica
- **tenantId: null**
- **tenantCode: null**

### ADMIN (de tenant)
- **Administración de su tenant**
- **Gestionar usuarios de su tenant**
- **Acceso completo a datos de su tenant**
- **Aislado a su tenantCode**
- **tenantId: ID del tenant**
- **tenantCode: Código del tenant**

### MANAGER
- **Gestión limitada**
- **Puede crear y editar datos**
- **Aislado a su tenant**
- **tenantId: ID del tenant**
- **tenantCode: Código del tenant**

### USER
- **Acceso básico de lectura**
- **Aislado a su tenant**
- **tenantId: ID del tenant**
- **tenantCode: Código del tenant**

### VIEWER
- **Solo lectura**
- **Aislado a su tenant**
- **tenantId: ID del tenant**
- **tenantCode: Código del tenant**

---

# Configuración de Clerk

## Pasos para Configurar los Roles en Clerk Dashboard

### 1. Acceder al Dashboard de Clerk
- Inicia sesión en [Clerk Dashboard](https://dashboard.clerk.com)
- Selecciona tu aplicación

### 2. Configurar Metadata de Usuario
Ve a **User & Authentication** > **Metadata** y configura los siguientes metadatos:

#### Public Metadata (para todos los usuarios):
```json
{
  "role": "USER",
  "tenantId": null
}
```

### 3. Crear Roles Personalizados

Los roles se gestionan a través del campo `role` en public metadata:

- **SUPER_ADMIN**: Acceso completo a todo el sistema
- **SUPPORT**: Soporte técnico con acceso multi-tenant limitado
- **ADMIN**: Acceso administrativo dentro de un tenant
- **MANAGER**: Acceso gerencial limitado
- **USER**: Acceso básico de usuario
- **VIEWER**: Solo lectura

### 4. Configurar Webhooks
Asegúrate que el webhook esté configurado en **Webhooks** > **Endpoints**:

- URL: `https://tu-dominio.com/api/webhook/clerk`
- Eventos: `user.created`, `user.updated`, `user.deleted`
- Secret: Configurado en `CLERK_WEBHOOK_SECRET`

### 5. Asignar Roles Manualmente (para usuarios existentes)

Para usuarios existentes, actualiza su metadata:

1. Ve a **Users** 
2. Selecciona el usuario
3. Ve a **Metadata** > **Public metadata**
4. Actualiza el campo `role`:

```json
{
  "role": "ADMIN",
  "tenantId": "tenant-id-del-usuario"
}
```

### 6. Probar la Configuración

#### Verificar Middleware
El middleware ya está configurado para verificar roles:

```typescript
// Para rutas de admin
if (isAdminRoute(req)) {
  const role = (sessionClaims?.metadata as any)?.role;
  if (!['SUPER_ADMIN', 'ADMIN'].includes(role as string)) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }
}
```

#### Verificar Webhook
El webhook sincroniza los roles con la base de datos:

```typescript
const role = public_metadata?.role || 'USER';
```

### 7. Roles por Defecto

- **Usuarios nuevos**: `USER` (definido en webhook)
- **Super Admin**: Debe asignarse manualmente
- **Admins/MANAGERs**: Asignar según necesidad
- **Support**: Asignar manualmente para equipo de soporte

### 8. Consideraciones de Seguridad

- Los roles se almacenan en public metadata de Clerk
- El middleware verifica los roles en cada request
- Los cambios en Clerk se sincronizan vía webhook
- SUPER_ADMIN y SUPPORT no requieren tenantId
- Los demás roles deben tener un tenantId válido

## Comandos Útiles

### Verificar configuración actual:
```bash
# Revisar variables de entorno
cat .env.clerk

# Verificar webhook
curl -X POST https://tu-dominio.com/api/webhook/clerk
```

### Actualizar usuarios existentes:
Usa el script de actualización masiva o actualiza manualmente desde Clerk Dashboard.

## Notas Importantes

1. **SUPER_ADMIN** debe tener `tenantId: null` en metadata
2. **SUPPORT** debe tener `tenantId: null` en metadata
3. Los demás roles deben tener un `tenantId` válido
4. Los cambios en roles pueden tardar hasta 5 minutos en sincronizarse
5. Siempre prueba los cambios con usuarios de prueba primero

---

# Metadata de Usuarios

## Estructura de Public Metadata

### Formato General
```json
{
  "role": "ROLE_NAME",
  "tenantId": "tenant-id-o-null",
  "tenantCode": "tenant-code-o-null",
  "permissions": ["permission1", "permission2", "..."],
  "isolation": {
    "tenantScope": true/false,
    "crossTenantAccess": true/false,
    "dataVisibility": "tenant_only/all_tenants/support_limited"
  }
}
```

## Configuración por Rol

### 1. SUPER_ADMIN
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
    "reports:all"
  ],
  "isolation": {
    "tenantScope": false,
    "crossTenantAccess": true,
    "dataVisibility": "all_tenants"
  }
}
```

### 2. SUPPORT
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

### 3. ADMIN
```json
{
  "role": "ADMIN",
  "tenantId": "tenant-123abc456def",
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

### 4. MANAGER
```json
{
  "role": "MANAGER",
  "tenantId": "tenant-123abc456def",
  "tenantCode": "DEN001",
  "permissions": [
    "inventory:view",
    "inventory:create",
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

### 5. USER
```json
{
  "role": "USER",
  "tenantId": "tenant-123abc456def",
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

### 6. VIEWER
```json
{
  "role": "VIEWER",
  "tenantId": "tenant-123abc456def",
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

## Métodos de Configuración

### Método 1: Manual en Clerk Dashboard
1. Ve a **Users** > selecciona usuario
2. Ve a **Metadata** > **Public metadata**
3. Pega el JSON correspondiente al rol
4. Click **Save**

### Método 2: Script Masivo
```bash
# Verificar usuarios existentes
CLERK_SECRET_KEY=sk_test_xxx node scripts/clerk-bulk-import.js check

# Importar usuarios nuevos
CLERK_SECRET_KEY=sk_test_xxx node scripts/clerk-bulk-import.js import
```

### Método 3: API Directa
```javascript
const { createClerkClient } = require('@clerk/clerk-sdk-node');
const clerk = createClerkClient({ secretKey: 'sk_test_xxx' });

await clerk.users.updateUser('user_123', {
  publicMetadata: {
    role: 'ADMIN',
    tenantId: 'tenant-123',
    tenantCode: 'DEN001',
    permissions: ['tenant:admin', 'users:tenant_manage']
  }
});
```

## Tenant IDs

### Obtener Tenant IDs
```sql
-- Consulta para obtener tenants disponibles
SELECT id, business_name, business_rtn 
FROM tenants 
WHERE is_active = true;
```

### Tenant IDs Comunes
- `null`: Solo para SUPER_ADMIN y SUPPORT
- `tenant-123abc456def`: Reemplazar con ID real
- `default-tenant`: Tenant por defecto

## Validación

### Verificar Configuración
```bash
# Ejecutar script de validación SQL
psql -t tu_database < scripts/role-validation.sql

# Verificar usuarios en Clerk
CLERK_SECRET_KEY=sk_test_xxx node scripts/clerk-bulk-import.js check
```

### Errores Comunes
1. **tenantId inválido**: Verificar que exista en BD
2. **role no válido**: Debe ser uno de los 6 roles definidos
3. **metadata vacía**: Siempre incluir al menos `role`

## Permisos Detallados

### Nivel Sistema
- `system:admin`: Acceso completo al sistema
- `users:manage`: Gestionar todos los usuarios
- `tenants:manage`: Gestionar tenants
- `audit:view`: Ver logs de auditoría

### Nivel Tenant
- `tenant:admin`: Administración del tenant
- `users:tenant_manage`: Gestionar usuarios del tenant
- `inventory:manage`: Gestión completa de inventario
- `accounting:manage`: Gestión completa de contabilidad

### Nivel Operación
- `inventory:view/create`: Ver/crear inventario
- `accounting:view/create`: Ver/crear contabilidad
- `reports:basic/personal/all`: Tipos de reportes

### Nivel Lectura
- `inventory:readonly`: Solo lectura inventario
- `accounting:readonly`: Solo lectura contabilidad
- `reports:view`: Ver reportes

## Ejemplos Prácticos

### Crear Admin de Empresa
```json
{
  "role": "ADMIN",
  "tenantId": "tenant-empresa-abc",
  "tenantCode": "EMP001",
  "permissions": [
    "tenant:admin",
    "users:tenant_manage",
    "inventory:manage",
    "accounting:manage",
    "reports:tenant"
  ]
}
```

### Crear Contador
```json
{
  "role": "MANAGER",
  "tenantId": "tenant-empresa-abc", 
  "tenantCode": "EMP001",
  "permissions": [
    "inventory:view",
    "inventory:create",
    "accounting:view",
    "accounting:create",
    "reports:basic"
  ]
}
```

### Crear Empleado Básico
```json
{
  "role": "USER",
  "tenantId": "tenant-empresa-abc",
  "tenantCode": "EMP001",
  "permissions": [
    "inventory:view",
    "accounting:view", 
    "reports:personal"
  ]
}
```

## Checklist de Configuración

- [ ] Configurar CLERK_SECRET_KEY en variables de entorno
- [ ] Verificar tenant IDs en base de datos
- [ ] Ejecutar script de validación SQL
- [ ] Configurar metadata para usuarios existentes
- [ ] Probar acceso con cada rol
- [ ] Verificar sincronización via webhook
- [ ] Documentar usuarios de prueba

---

# Roles Aislados por Tenant

## Estructura de Tenant con Código Único

### Modelo de Tenant con Código
```sql
-- Estructura tenant con código único
{
  "id": "tenant_abc123def456",
  "businessName": "Empresa S.A.",
  "businessRTN": "08011999123456",
  "tenantCode": "EMP001",  // Código único de identificación
  "subscriptionPlan": "PREMIUM",
  "maxUsers": 50,
  "isActive": true
}
```

## Configuración de Aislamiento

### Middleware Actualizado
```typescript
// middleware.ts - Verificación de aislamiento
export default clerkMiddleware(async (auth, req) => {
  const { userId, sessionClaims } = await auth();
  const metadata = sessionClaims?.metadata as any;

  // Extraer información del tenant
  const userTenantId = metadata?.tenantId;
  const userTenantCode = metadata?.tenantCode;
  const userRole = metadata?.role;

  // Verificar aislamiento de tenant
  if (userTenantId && userRole !== 'SUPER_ADMIN' && userRole !== 'SUPPORT') {
    const requestedTenant = req.cookies.get('selected_tenant')?.value;
    
    if (requestedTenant && requestedTenant !== userTenantId) {
      return NextResponse.redirect(new URL('/unauthorized', req.url));
    }
  }

  // Headers de aislamiento para componentes
  const response = NextResponse.next();
  if (userTenantId) {
    response.headers.set('x-tenant-id', userTenantId);
    response.headers.set('x-tenant-code', userTenantCode);
    response.headers.set('x-user-role', userRole);
  }

  return response;
});
```

## Generación de Códigos de Tenant

### Sistema de Códigos Únicos
```typescript
// lib/tenant-code-generator.ts
export class TenantCodeGenerator {
  private static usedCodes = new Set<string>();

  static generateUniqueCode(businessName: string): string {
    // Extraer primeras 3 letras del negocio
    const prefix = businessName
      .replace(/[^a-zA-Z]/g, '')
      .substring(0, 3)
      .toUpperCase();

    // Generar número secuencial
    let counter = 1;
    let code = `${prefix}${counter.toString().padStart(3, '0')}`;

    // Encontrar código único
    while (this.usedCodes.has(code)) {
      counter++;
      code = `${prefix}${counter.toString().padStart(3, '0')}`;
    }

    this.usedCodes.add(code);
    return code;
  }

  static async isCodeAvailable(code: string): Promise<boolean> {
    const existing = await db.tenant.findUnique({
      where: { tenantCode: code }
    });
    return !existing;
  }
}
```

## Ejemplos Prácticos

### Tenant 1: "Contadora Honduras"
```json
{
  "id": "tenant_def789ghi012",
  "businessName": "Contadora Honduras",
  "businessRTN": "08011998123456",
  "tenantCode": "CON001",
  "users": [
    {
      "email": "admin@contadora.hn",
      "role": "ADMIN",
      "tenantId": "tenant_def789ghi012",
      "tenantCode": "CON001"
    },
    {
      "email": "manager@contadora.hn", 
      "role": "MANAGER",
      "tenantId": "tenant_def789ghi012",
      "tenantCode": "CON001"
    }
  ]
}
```

### Tenant 2: "Dental Diamond"
```json
{
  "id": "tenant_ghi345jkl678",
  "businessName": "Dental Diamond",
  "businessRTN": "08011999567890", 
  "tenantCode": "DEN001",
  "users": [
    {
      "email": "admin@dental.hn",
      "role": "ADMIN",
      "tenantId": "tenant_ghi345jkl678",
      "tenantCode": "DEN001"
    }
  ]
}
```

## Validación de Aislamiento

### SQL para Verificar Aislamiento
```sql
-- Verificar que cada usuario pertenezca a un solo tenant
SELECT 
  u.email,
  u.role,
  u.tenant_id,
  t.tenant_code,
  t.business_name
FROM users u
LEFT JOIN tenants t ON u.tenant_id = t.id
WHERE u.role != 'SUPER_ADMIN'
  AND u.role != 'SUPPORT'
ORDER BY t.tenant_code, u.role;

-- Verificar que no existan usuarios con múltiples tenants
SELECT 
  email,
  COUNT(DISTINCT tenant_id) as tenant_count
FROM users 
WHERE role NOT IN ('SUPER_ADMIN', 'SUPPORT') 
  AND tenant_id IS NOT NULL
GROUP BY email
HAVING COUNT(DISTINCT tenant_id) > 1;
```

## Script de Creación Masiva

### Crear Tenant con Roles Aislados
```javascript
// scripts/create-isolated-tenant.js
async function createIsolatedTenant(tenantData) {
  const { businessName, businessRTN, users } = tenantData;
  
  // 1. Generar código único
  const tenantCode = TenantCodeGenerator.generateUniqueCode(businessName);
  
  // 2. Crear tenant
  const tenant = await db.tenant.create({
    data: {
      businessName,
      businessRTN,
      tenantCode,
      // ... otros campos
    }
  });

  // 3. Crear usuarios con metadata aislada
  for (const userData of users) {
    await clerk.users.createUser({
      emailAddress: [userData.email],
      // ... otros campos
      publicMetadata: {
        role: userData.role,
        tenantId: tenant.id,
        tenantCode: tenantCode,
        permissions: getPermissionsForRole(userData.role),
        isolation: {
          tenantScope: true,
          crossTenantAccess: false,
          dataVisibility: 'tenant_only'
        }
      }
    });
  }

  return { tenant, users };
}
```

## Reglas de Aislamiento

1. **Cada usuario (excepto SUPER_ADMIN y SUPPORT) pertenece a exactamente un tenant**
2. **Los códigos de tenant son únicos e irrepetibles**
3. **No se permite acceso cruzado entre tenants**
4. **SUPER_ADMIN y SUPPORT son los únicos roles con acceso multi-tenant**
5. **Todos los datos están filtrados por tenant_id automáticamente**
6. **SUPPORT tiene acceso multi-tenant pero con permisos limitados**

---

# Rol SUPPORT (Servicio al Cliente)

## Características del Rol SUPPORT

### Permisos y Acceso
- **Acceso multi-tenant**: Puede ver información de todos los tenants
- **Solo lectura**: En la mayoría de los datos sensibles
- **Gestión de tickets**: Puede crear y gestionar tickets de soporte
- **Ayuda a usuarios**: Puede resetear contraseñas y ver actividad básica
- **Sin acceso financiero**: No puede ver información financiera detallada

### Alcance
- **tenantId**: `null` (como SUPER_ADMIN)
- **Acceso**: Multi-tenant con permisos limitados
- **Visibilidad**: Solo lectura en la mayoría de casos

## Componentes de Soporte

### SupportDashboard.tsx
El componente principal de soporte incluye:

#### Estadísticas en Tiempo Real
- **Tenants Activos**: Cantidad de empresas activas
- **Usuarios Totales**: Total de usuarios en el sistema
- **Tickets Activos**: Tickets pendientes de atención
- **Urgentes**: Tickets marcados como urgentes

#### Gestión de Tabs
1. **Tickets**: Gestión de tickets de soporte
2. **Usuarios**: Vista de usuarios del sistema
3. **Tenants**: Vista de empresas/tenants

#### Características por Tab

##### Tickets Tab
- Ver todos los tickets del sistema
- Filtrar por prioridad y estado
- Responder y gestionar tickets
- Ver información del usuario y tenant

##### Users Tab
- Ver información básica de usuarios
- Filtrar por nombre, email o tenant
- Ver rol y estado de cada usuario
- Acciones de ayuda (reset password, etc.)

##### Tenants Tab
- Ver todos los tenants del sistema
- Información básica de cada empresa
- Cantidad de usuarios por tenant
- Estado y plan de suscripción

## API Endpoints para Support

### /api/support/tenants
- **GET**: Ver lista de tenants (información básica)
- **POST**: Crear nuevo tenant (solo SUPER_ADMIN)

### /api/support/users  
- **GET**: Ver lista de usuarios (información básica)
- **POST**: Crear nuevo usuario (solo SUPER_ADMIN)
- **PUT**: Actualizar usuario (solo SUPER_ADMIN)

### /api/support/tickets
- **GET**: Ver tickets de soporte
- **POST**: Crear nuevo ticket
- **PUT**: Actualizar estado de ticket

## Flujo de Trabajo para Soporte

### 1. Acceso al Sistema
- El usuario de soporte inicia sesión
- Tiene acceso a `/support` y `/admin`
- Puede ver información de todos los tenants

### 2. Gestión de Tickets
- Recibe notificaciones de nuevos tickets
- Puede ver detalles del ticket
- Responde y actualiza estados
- Escala tickets urgentes a SUPER_ADMIN

### 3. Ayuda a Usuarios
- Busca usuarios por email o nombre
- Ve información básica del perfil
- Puede ayudar con reset de contraseña
- Ve actividad reciente del usuario

### 4. Monitoreo de Tenants
- Ve estado general del sistema
- Identifica tenants con problemas
- Reporta métricas de uso
- Contacta a administradores de tenant

## Seguridad y Restricciones

### Datos No Accesibles para SUPPORT
- **Información financiera detallada**
- **RTN y datos fiscales completos**
- **Configuración de sistema crítica**
- **Logs de auditoría completos**

### Acceso Permitido
- **Información básica de usuarios**
- **Estado general de tenants**
- **Tickets de soporte**
- **Métricas básicas del sistema**

## Implementación en UI

### Badges de Rol
```typescript
const labels: Record<string, string> = {
  'SUPER_ADMIN': 'Super Admin',
  'SUPPORT': 'Soporte Técnico',
  'ADMIN': 'Administrador',
  'MANAGER': 'Gerente',
  'USER': 'Usuario',
  'VIEWER': 'Lector'
};

const colors: Record<string, string> = {
  'SUPER_ADMIN': 'bg-purple-100 text-purple-800',
  'SUPPORT': 'bg-orange-100 text-orange-800',
  'ADMIN': 'bg-red-100 text-red-800',
  'MANAGER': 'bg-blue-100 text-blue-800',
  'USER': 'bg-green-100 text-green-800',
  'VIEWER': 'bg-gray-100 text-gray-800'
};
```

### Navegación
- **SUPPORT** accede a `/support` y `/admin`
- **SUPER_ADMIN** accede a todo
- **Otros roles** acceso limitado

## Pruebas y Validación

### Crear Usuario SUPPORT
```bash
# Via Clerk Dashboard o API
{
  "email": "soporte@tudominio.com",
  "role": "SUPPORT",
  "tenantId": null,
  "permissions": [...]
}
```

### Verificar Acceso
1. Iniciar sesión como usuario SUPPORT
2. Acceder a `/support` - debe funcionar
3. Acceder a `/admin` - debe funcionar con limitaciones
4. Intentar crear tenant - debe ser bloqueado
5. Ver usuarios de otros tenants - debe funcionar

### Validar Restricciones
- No puede ver información financiera
- No puede modificar roles de otros usuarios
- No puede acceder a configuración crítica
- Solo ve información básica de tenants

## Resumen de Beneficios

### Para el Equipo de Soporte
- **Visibilidad completa** del sistema para ayudar mejor
- **Gestión centralizada** de tickets de soporte
- **Acceso multi-tenant** sin comprometer seguridad
- **Herramientas específicas** para diagnóstico

### Para la Seguridad
- **Permisos granulares** y bien definidos
- **Aislamiento de datos sensibles**
- **Auditoría de acciones de soporte**
- **Restricciones claras** de acceso

### Para los Usuarios
- **Soporte más eficiente** con información contextual
- **Respuesta más rápida** a problemas
- **Diagnóstico preciso** con visibilidad completa
- **Experiencia mejorada** de servicio

---

# Guía Completa de Implementación

## Resumen de la Implementación

Solución completa donde el **SUPER_ADMIN puede crear tenants** con **aislamiento total** y **códigos únicos**, y el rol **SUPPORT** proporciona soporte multi-tenant con permisos limitados.

## Archivos Creados

### Componentes
- **`components/admin/TenantManager.tsx`** - Interfaz para gestionar tenants
- **`components/support/SupportDashboard.tsx`** - Panel de soporte técnico
- **`app/api/admin/create-user/route.ts`** - API para crear usuarios aislados
- **`app/api/support/tenants/route.ts`** - API para ver tenants (información limitada)
- **`app/api/support/users/route.ts`** - API para ver usuarios (información básica)
- **`app/api/support/tickets/route.ts`** - API para gestión de tickets
- **`app/support/page.tsx`** - Ruta del panel de soporte

### Scripts y Configuración
- **`scripts/tenant-code-generator.ts`** - Generador de códigos únicos
- **`scripts/create-isolated-tenant-users.ts`** - Script de creación masiva
- **`scripts/complete-setup.sql`** - Setup SQL completo
- **`scripts/role-validation.sql`** - Validación de roles

### Actualizaciones
- **`prisma/schema.prisma`** - Agregado campo `tenant_code`
- **`app/admin/page.tsx`** - Interfaz con tabs para gestión
- **`middleware.ts`** - Actualizado con rol SUPPORT

## Flujo de Creación de Tenant

### Paso 1: SUPER_ADMIN crea Tenant
```
SUPER_ADMIN (en /admin) 
  -> Tab "Tenants" 
  -> "Nuevo Tenant"
  -> Ingresa datos de empresa
  -> Sistema genera código único (ej: DEN001)
  -> Tenant creado en BD
```

### Paso 2: Crear Usuarios para el Tenant
```
SUPER_ADMIN 
  -> Selecciona tenant creado
  -> "Crear Usuario" 
  -> Asigna rol (ADMIN/MANAGER/USER/VIEWER)
  -> Usuario creado con metadata aislada
  -> Solo puede acceder a datos de su tenant
```

## Configuración de la Base de Datos

### Ejecutar Migration
```bash
# 1. Ejecutar migration SQL completa
psql -t tu_database < scripts/complete-setup.sql

# 2. Generar Prisma Client
npx prisma generate

# 3. Aplicar cambios a BD
npx prisma db push
```

### Verificar Configuración
```sql
-- Verificar tenantCode agregado
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'Tenant' AND column_name = 'tenant_code';

-- Verificar funciones creadas
SELECT proname FROM pg_proc WHERE proname LIKE '%tenant%';

-- Verificar tenants con códigos
SELECT id, businessname, tenant_code, isactive, createdat
FROM Tenant 
ORDER BY tenant_code;
```

## Configuración de Clerk

### Variables de Entorno
```bash
# .env.local
CLERK_SECRET_KEY=sk_test_xxx
CLERK_WEBHOOK_SECRET=whsec_xxx
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxx
```

### Webhook Configuration
- URL: `https://tudominio.com/api/webhook/clerk`
- Eventos: `user.created`, `user.updated`, `user.deleted`

## Flujo Completo de Uso

### Para SUPER_ADMIN
1. **Acceder a `/admin`**
2. **Ver tab "Tenants"**
3. **Crear nuevo tenant**:
   - Nombre: "Dental Diamond HN"
   - RTN: "08011999123456"
   - Email: "contact@dental.hn"
   - Sistema asigna código: "DEN001"
4. **Crear usuarios para el tenant**:
   - Click en botón de usuarios del tenant
   - Crear ADMIN con email "admin@dental.hn"
   - Usuario queda aislado a DEN001

### Para SUPPORT
1. **Acceder a `/support`**
2. **Ver estadísticas del sistema**
3. **Gestionar tickets de soporte**
4. **Ver información básica de tenants y usuarios**
5. **Ayudar a usuarios con problemas básicos**

### Para Usuarios del Tenant
1. **Inician sesión normalmente**
2. **Solo ven datos de su tenant**
3. **No pueden acceder a otros tenants**
4. **Permisos según su rol**

## Validación y Pruebas

### Probar Aislamiento
```bash
# 1. Crear tenant de prueba
CLERK_SECRET_KEY=xxx npx ts-node scripts/create-isolated-tenant-users.ts create

# 2. Verificar tenants
psql -t tu_database -c "SELECT tenant_code, business_name FROM Tenant;"

# 3. Verificar usuarios aislados
psql -t tu_database -c "SELECT email, role, tenant_id FROM users WHERE role NOT IN ('SUPER_ADMIN', 'SUPPORT');"
```

### Probar Acceso Cruzado
1. **Iniciar sesión como usuario de DEN001**
2. **Intentar acceder a datos de CON001**
3. **Sistema debe bloquear acceso**

## Solución de Problemas

### Errores Comunes
1. **tenantCode no existe**: Ejecutar migration SQL
2. **Clerk SDK no encontrado**: `npm install @clerk/clerk-sdk-node`
3. **Permisos denegados**: Verificar metadata en Clerk
4. **Acceso cruzado**: Revisar middleware

### Debug
```bash
# Verificar metadata de usuario en Clerk
curl -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  "https://api.clerk.dev/v1/users"

# Verificar tenants en BD
psql -t tu_database -c "SELECT * FROM Tenant;"

# Verificar usuarios con metadata
psql -t tu_database -c "SELECT email, role, tenant_id FROM users;"
```

## Resumen de Características

### Aislamiento Total
- **Cada usuario pertenece a un tenant** (excepto SUPER_ADMIN y SUPPORT)
- **Códigos únicos por tenant**
- **Prevención de acceso cruzado**
- **Metadata con permisos específicos**

### Gestión Centralizada
- **SUPER_ADMIN crea tenants**
- **Código automático de tenant**
- **Creación de usuarios aislados**
- **Control de límites y planes**

### Soporte Multi-Tenant
- **SUPPORT puede ver todos los tenants** con permisos limitados
- **Gestión centralizada de tickets**
- **Ayuda a usuarios sin comprometer seguridad**
- **Visibilidad contextual para diagnóstico

### Escalabilidad
- **Multi-tenant nativo**
- **Códigos únicos garantizados**
- **Middleware de seguridad**
- **API endpoints protegidos**

## Próximos Pasos

1. **Ejecutar migrations SQL**
2. **Configurar Clerk webhooks**
3. **Probar creación de tenants**
4. **Validar aislamiento**
5. **Documentar para usuarios finales**

---

# Configuración de Base de Datos

## Ejecutar Setup Completo

```bash
# Ejecutar todo el setup SQL
psql -t tu_database < scripts/complete-setup.sql
```

## Componentes del Setup SQL

### 1. Migration de tenant_code
- Agrega columna `tenant_code` a tabla Tenant
- Genera códigos únicos para tenants existentes
- Crea índice para mejor rendimiento

### 2. Funciones SQL para SUPER_ADMIN
- `generate_tenant_code()` - Genera códigos únicos
- `super_admin_get_all_tenants()` - Lista todos los tenants
- `create_tenant_with_code()` - Crea tenant con código
- `update_tenant()` - Actualiza tenant
- `delete_tenant_safely()` - Elimina tenant seguro
- `super_admin_statistics()` - Estadísticas generales

### 3. Vistas de Estadísticas
- `tenant_statistics` - Estadísticas por tenant
- `tenant_plan_statistics` - Estadísticas por plan

### 4. Triggers
- `tenant_update_timestamp` - Actualiza timestamps automáticamente

## Verificación de Instalación

```sql
-- Verificar columnas
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Tenant' 
  AND column_name IN ('tenant_code', 'businessname', 'isactive');

-- Verificar funciones
SELECT proname FROM pg_proc WHERE proname LIKE '%tenant%';

-- Verificar vistas
SELECT matviewname FROM pg_matviews WHERE matviewname LIKE '%tenant%';

-- Verificar triggers
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%tenant%';
```

---

# Validación y Solución de Problemas

## Validación del Sistema

### Validar Aislamiento de Datos
```sql
-- Verificar que cada usuario pertenezca a un solo tenant
SELECT 
  email,
  role,
  tenant_id,
  COUNT(*) as user_count
FROM users 
WHERE role NOT IN ('SUPER_ADMIN', 'SUPPORT')
GROUP BY email, role, tenant_id
HAVING COUNT(*) > 1;
```

### Validar Códigos de Tenant
```sql
-- Verificar que los códigos sean únicos
SELECT 
  tenant_code,
  COUNT(*) as duplicate_count
FROM Tenant 
WHERE tenant_code IS NOT NULL
GROUP BY tenant_code
HAVING COUNT(*) > 1;
```

### Validar Permisos en Clerk
```bash
# Verificar metadata de usuarios
CLERK_SECRET_KEY=sk_test_xxx node scripts/clerk-bulk-import.js check
```

## Errores Comunes y Soluciones

### Error: tenantCode no existe
**Causa**: Columna no agregada a la base de datos
**Solución**: Ejecutar `psql -t tu_database < scripts/complete-setup.sql`

### Error: Permisos denegados
**Causa**: Metadata incorrecta en Clerk
**Solución**: Verificar y corregir metadata del usuario en Clerk Dashboard

### Error: Acceso cruzado
**Causa**: Middleware no actualizado
**Solución**: Verificar que middleware.ts incluya validación de aislamiento

### Error: Clerk SDK no encontrado
**Causa**: Paquete no instalado
**Solución**: `npm install @clerk/clerk-sdk-node`

## Debug Avanzado

### Verificar Metadata en Clerk
```bash
curl -H "Authorization: Bearer $CLERK_SECRET_KEY" \
  "https://api.clerk.dev/v1/users" | jq '.data[] | {email, publicMetadata}'
```

### Verificar Datos en Base de Datos
```sql
-- Ver todos los tenants
SELECT * FROM Tenant ORDER BY tenant_code;

-- Ver usuarios y sus tenants
SELECT 
  u.email,
  u.role,
  u.tenant_id,
  t.tenant_code,
  t.business_name
FROM users u
LEFT JOIN Tenant t ON u.tenant_id = t.id
ORDER BY t.tenant_code, u.role;
```

### Verificar Logs de Webhook
```bash
# En Clerk Dashboard, ve a Webhooks > Logs
# Revisa los últimos eventos para verificar sincronización
```

## Checklist Final de Implementación

- [ ] Schema actualizado con tenant_code
- [ ] Migration SQL ejecutada
- [ ] Funciones de admin creadas
- [ ] Middleware actualizado con rol SUPPORT
- [ ] Componente TenantManager funcional
- [ ] Componente SupportDashboard funcional
- [ ] API endpoints protegidos
- [ ] Clerk webhooks configurados
- [ ] Aislamiento validado
- [ ] Documentación completa

---

**¡Sistema Multi-Tenant Completo!** 

El sistema ahora tiene:
- **SUPER_ADMIN** - Control total y gestión de tenants
- **SUPPORT** - Soporte técnico multi-tenant con permisos limitados
- **ADMIN/MANAGER/USER/VIEWER** - Roles aislados por tenant
- **Códigos únicos** para identificación de tenants
- **Aislamiento completo** de datos y acceso
- **Gestión centralizada** para administración

Para cualquier problema o duda, consulta las secciones específicas de esta documentación o revisa los logs de error en la aplicación.
