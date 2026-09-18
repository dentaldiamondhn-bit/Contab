# Protección del Super Admin Principal

## Usuario Protegido
- **Email:** `sucachi.123@gmail.com`
- **Rol:** `SUPER_ADMIN`
- **Tenant ID:** `tenant_001`

## Protecciones Implementadas

### 1. Protección en la Interfaz (Frontend)
**Archivo:** `app/admin/tenants/[id]/page.tsx`

```typescript
{user.email === 'sucachi.123@gmail.com' && user.role === 'SUPER_ADMIN' ? (
  <span className="px-3 py-1 rounded bg-gray-100 text-gray-500 text-xs">
    🔒 Protegido
  </span>
) : (
  <>
    <button onClick={() => handleEditUser(user)}>✏️ Editar</button>
    <button onClick={() => handleDeleteUser(user.id, user.email)}>🗑️ Eliminar</button>
  </>
)}
```

**Resultado:** Los botones de Editar y Eliminar no se muestran para el super admin.

### 2. Protección en API de Eliminación
**Archivo:** `app/api/admin/tenants/[id]/users/route.ts`

```typescript
// Protección: No permitir eliminar al super admin principal
try {
  const client = await clerkClient();
  const userToDelete = await client.users.getUser(userIdToDelete);
  const userToDeleteEmail = userToDelete.emailAddresses[0]?.emailAddress || '';
  
  if (userToDeleteEmail === 'sucachi.123@gmail.com') {
    console.log('🔒 Intento de eliminar super admin bloqueado:', userToDeleteEmail);
    return NextResponse.json(
      { error: 'No se puede eliminar al super admin principal' },
      { status: 403 }
    );
  }
} catch (error) {
  // Manejo de errores
}
```

**Resultado:** La API rechaza cualquier intento de eliminar al super admin con error 403.

### 3. Protección en API de Modificación
**Archivo:** `app/api/admin/tenants/[id]/users/[userId]/route.ts`

```typescript
// Protección: No permitir modificar al super admin principal
try {
  const clerk = await clerkClient();
  const targetUser = await clerk.users.getUser(targetUserId);
  const targetUserEmail = targetUser.emailAddresses[0]?.emailAddress || '';
  
  if (targetUserEmail === 'sucachi.123@gmail.com') {
    console.log('🔒 Intento de modificar super admin bloqueado:', targetUserEmail);
    return NextResponse.json(
      { error: 'No se puede modificar al super admin principal' },
      { status: 403 }
    );
  }
} catch (error) {
  // Manejo de errores
}
```

**Resultado:** La API rechaza cualquier intento de modificar los datos del super admin con error 403.

### 4. Acceso del Super Admin
**Archivo:** `app/api/admin/tenants/[id]/route-new.ts`

```typescript
// Si es super admin, mostrar todos los usuarios
if (isSuperAdminEmail) {
  console.log('👑 Super Admin: Mostrando todos los usuarios');
  users = allUsers.map((user: any) => ({ /* ... */ }));
} else {
  // Si no es super admin, mostrar solo usuarios del tenant
  console.log('🏢 Usuario normal: Mostrando solo usuarios del tenant');
  users = allUsers.filter((user: any) => {
    const metadata = user.publicMetadata as any;
    return metadata.tenantId === id;
  }).map((user: any) => ({ /* ... */ }));
}
```

**Resultado:** El super admin puede ver todos los usuarios de todos los tenants.

> **Nota de migración (16 Sept 2026):** Los fragmentos de código de este documento usan `clerkClient()` por claridad. Tras la migración del SDK, todo acceso a Clerk se realiza vía REST con `lib/clerk-api.ts` (`@clerk/clerk-sdk-node` fue eliminado). La lógica de bloqueo por email (`sucachi.123@gmail.com`) se mantiene igual.

## Seguridad del Middleware (16 Sept 2026)

- `middleware.ts` usa `clerkMiddleware`; TODA ruta no pública ejecuta `await auth.protect()`.
- Las rutas protegidas (incluidas `/admin` y `/api/admin/*`) devuelven **HTTP 404** (no redirect) a requests no autenticados.
- El middleware inyecta el header `x-tenant-id` desde metadata de Clerk cuando la petición no lo trae.
- Estas protecciones de Middleware se suman a la protección por email del super admin: ningún tenant puede eliminar/modificar a `sucachi.123@gmail.com`.

## Comportamiento Esperado

### Para el Super Admin (`sucachi.123@gmail.com`):
- ✅ Puede ver todos los usuarios del sistema
- ✅ Puede modificar/eliminar otros usuarios
- ❌ No puede ser modificado por nadie
- ❌ No puede ser eliminado por nadie
- 🔒 Muestra "Protegido" en la interfaz

### Para otros usuarios:
- ✅ Solo ven usuarios de su tenant
- ✅ Pueden modificar/eliminar usuarios de su tenant
- ❌ No pueden ver usuarios de otros tenants
- ❌ No pueden modificar/eliminar al super admin

## Logs de Seguridad

Cuando alguien intenta modificar/eliminar al super admin, se registran logs:
```
🔒 Intento de eliminar super admin bloqueado: sucachi.123@gmail.com
🔒 Intento de modificar super admin bloqueado: sucachi.123@gmail.com
```

## Respuestas de Error

- **Eliminación:** `{ error: "No se puede eliminar al super admin principal", status: 403 }`
- **Modificación:** `{ error: "No se puede modificar al super admin principal", status: 403 }`

## Notas Importantes

1. **Protección a nivel de API:** Incluso si alguien manipula el frontend, la API rechazará las solicitudes.
2. **Protección a nivel de interfaz:** Los usuarios no ven los botones para evitar intentos.
3. **Logs de auditoría:** Todos los intentos bloqueados se registran.
4. **Super Admin general:** Mantiene `tenantId: tenant_001` como identificador global.
5. **Fix de env (16 Sept 2026):** `app/api/companies/route.ts` usaba `process.env.SUPABASE_URL!` (undefined → 500); corregido a `process.env.NEXT_PUBLIC_SUPABASE_URL!` (GET y PUT). Env real: `NEXT_PUBLIC_SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `DATABASE_URL` (conexión directa), Clerk keys. **No existe `SUPABASE_URL`.**

*Estado validado al 17 de Septiembre de 2026.*
