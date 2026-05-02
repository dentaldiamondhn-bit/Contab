# Plan de Migración a PostgreSQL con RLS

## 📋 Resumen
Migrar de SQLite a PostgreSQL para habilitar Row Level Security (RLS) y mejorar la seguridad multi-tenant.

## 🎯 Objetivos
- ✅ Migrar base de datos de SQLite a PostgreSQL
- ✅ Implementar RLS para aislamiento de tenants
- ✅ Migrar todos los datos existentes
- ✅ Mantener compatibilidad con el código existente
- ✅ Configurar entorno de producción

---

## 📅 Fase 1: Preparación (1-2 horas)

### 1.1 Configurar PostgreSQL Local
```bash
# Instalar PostgreSQL (si no está instalado)
# Windows: Descargar de https://www.postgresql.org/download/windows/
# O usar Docker:
docker run --name contab-postgres -e POSTGRES_PASSWORD=contab123 -p 5432:5432 -d postgres:16
```

### 1.2 Crear Base de Datos
```sql
-- Conectar a PostgreSQL
psql -U postgres

-- Crear base de datos
CREATE DATABASE contab_dev;
CREATE DATABASE contab_prod;

-- Crear usuario
CREATE USER contab_user WITH PASSWORD 'secure_password_here';
GRANT ALL PRIVILEGES ON DATABASE contab_dev TO contab_user;
GRANT ALL PRIVILEGES ON DATABASE contab_prod TO contab_user;
```

### 1.3 Actualizar Variables de Entorno
```env
# .env
DATABASE_URL="postgresql://contab_user:secure_password_here@localhost:5432/contab_dev"

# .env.production
DATABASE_URL="postgresql://contab_user:secure_password_here@your-host:5432/contab_prod"
```

---

## 📅 Fase 2: Modificar Schema de Prisma (30 minutos)

### 2.1 Actualizar `prisma/schema.prisma`
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

// El resto del schema se mantiene igual
// PostgreSQL soporta todos los tipos que estamos usando
```

### 2.2 Agregar Extensiones PostgreSQL (si es necesario)
```prisma
// Agregar al inicio del schema
generator client {
  provider = "prisma-client-js"
  previewFeatures = ["postgresqlExtensions"]
}
```

---

## 📅 Fase 3: Migración de Datos (1-2 horas)

### 3.1 Exportar Datos de SQLite
```bash
# Usar prisma-db-dump o script personalizado
npx prisma db pull --schema=./prisma/schema.prisma
```

### 3.2 Crear Script de Migración
Crear `scripts/migrate-to-postgres.ts`:
```typescript
import { PrismaClient } from '@prisma/client';
import { Pool } from 'pg';

const sqlite = new PrismaClient({ datasources: { db: { url: 'file:./prisma/dev.db' } } });
const pg = new Pool({ connectionString: process.env.POSTGRES_URL });

async function migrate() {
  // Migrar Tenants
  const tenants = await sqlite.tenant.findMany();
  for (const tenant of tenants) {
    await pg.query(`
      INSERT INTO "Tenant" (
        id, "businessName", "businessRTN", "businessEmail", 
        "businessAddress", "tenantCode", "phoneNumber", 
        "subscriptionPlans", "maxUsers", "monthlyCost", 
        "modules", "isActive", "createdAt", "updatedAt"
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    `, [
      tenant.id, tenant.businessName, tenant.businessRTN, tenant.businessEmail,
      tenant.businessAddress, tenant.tenantCode, tenant.phoneNumber,
      tenant.subscriptionPlans, tenant.maxUsers, tenant.monthlyCost,
      tenant.modules, tenant.isActive, tenant.createdAt, tenant.updatedAt
    ]);
  }
  
  // Repetir para otras tablas...
}

migrate();
```

### 3.3 Ejecutar Migración
```bash
npx ts-node scripts/migrate-to-postgres.ts
```

---

## 📅 Fase 4: Configurar RLS (2-3 horas)

### 4.1 Habilitar RLS en PostgreSQL
```sql
-- Conectar a la base de datos
\c contab_dev

-- Habilitar RLS en todas las tablas
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalEntry" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "CAI" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Invoice" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "File" ENABLE ROW LEVEL SECURITY;
```

### 4.2 Crear Función para Obtener Tenant ID Actual
```sql
-- Función para obtener el tenant_id del contexto
CREATE OR REPLACE FUNCTION get_current_tenant_id()
RETURNS uuid AS $$
BEGIN
  -- Obtener del setting de sesión (configurado por la aplicación)
  RETURN current_setting('app.current_tenant_id', true)::uuid;
EXCEPTION WHEN OTHERS THEN
  RETURN NULL::uuid;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### 4.3 Crear Políticas RLS para Cada Tabla

#### Tabla Tenant
```sql
-- Solo super admins pueden ver todos los tenants
CREATE POLICY "super_admin_view_all" ON "Tenant"
  FOR SELECT
  TO authenticated_user
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE "User"."authId" = current_setting('app.current_user_id', true)::text
      AND "User"."role" IN ('SUPER_ADMIN', 'SUPPORT')
    )
  );

-- Admins de tenant solo pueden ver su tenant
CREATE POLICY "tenant_admin_view_own" ON "Tenant"
  FOR SELECT
  TO authenticated_user
  USING (id = get_current_tenant_id());
```

#### Tabla User
```sql
-- Solo usuarios del mismo tenant
CREATE POLICY "tenant_isolation" ON "User"
  FOR ALL
  TO authenticated_user
  USING ("tenantId" = get_current_tenant_id());

-- Super admins pueden ver todos
CREATE POLICY "super_admin_all" ON "User"
  FOR ALL
  TO authenticated_user
  USING (
    EXISTS (
      SELECT 1 FROM "User" 
      WHERE "User"."authId" = current_setting('app.current_user_id', true)::text
      AND "User"."role" IN ('SUPER_ADMIN', 'SUPPORT')
    )
  );
```

#### Tabla Account
```sql
CREATE POLICY "tenant_isolation" ON "Account"
  FOR ALL
  TO authenticated_user
  USING ("tenantId" = get_current_tenant_id());
```

#### Tabla Transaction
```sql
CREATE POLICY "tenant_isolation" ON "Transaction"
  FOR ALL
  TO authenticated_user
  USING ("tenantId" = get_current_tenant_id());
```

#### Tabla CAI
```sql
CREATE POLICY "tenant_isolation" ON "CAI"
  FOR ALL
  TO authenticated_user
  USING ("tenantId" = get_current_tenant_id());
```

#### Repetir para otras tablas...

---

## 📅 Fase 5: Actualizar Código de Aplicación (1-2 horas)

### 5.1 Crear Middleware de Prisma
Crear `lib/prisma-middleware.ts`:
```typescript
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Middleware para configurar tenant_id en cada query
prisma.$use(async (params, next) => {
  // Obtener tenant_id del contexto (de Clerk o sesión)
  const tenantId = getCurrentTenantId(); // Implementar esta función
  
  if (tenantId && params.model && needsTenantIsolation(params.model)) {
    // Agregar where clause para tenant_id
    if (!params.args.where) {
      params.args.where = {};
    }
    params.args.where.tenantId = tenantId;
  }
  
  return next(params);
});

function needsTenantIsolation(model: string): boolean {
  const modelsWithTenant = [
    'User', 'Account', 'Transaction', 'JournalEntry',
    'CAI', 'Invoice', 'File'
  ];
  return modelsWithTenant.includes(model);
}
```

### 5.2 Configurar Session Variable en PostgreSQL
```typescript
// En tu API o middleware de autenticación
async function setTenantContext(tenantId: string, userId: string) {
  await prisma.$executeRaw`
    SET LOCAL app.current_tenant_id = ${tenantId};
    SET LOCAL app.current_user_id = ${userId};
  `;
}
```

### 5.3 Actualizar Endpoints API
```typescript
// Ejemplo en app/api/tenant/users/route.ts
export async function GET(req: NextRequest) {
  const { userId } = await auth();
  const user = await db.user.findUnique({
    where: { authId: userId }
  });
  
  // Configurar contexto de tenant
  await setTenantContext(user.tenantId, userId);
  
  // Ahora RLS filtrará automáticamente
  const users = await db.user.findMany();
  // Solo devolverá usuarios del tenant actual
}
```

---

## 📅 Fase 6: Pruebas (2-3 horas)

### 6.1 Pruebas Unitarias
```typescript
// tests/rls.test.ts
describe('RLS Tenant Isolation', () => {
  it('should not allow cross-tenant access', async () => {
    // Usuario de tenant A intenta acceder a datos de tenant B
    const result = await prisma.user.findMany({
      where: { tenantId: 'tenant-b-id' }
    });
    expect(result).toHaveLength(0);
  });
});
```

### 6.2 Pruebas de Integración
- Probar endpoints con diferentes usuarios
- Verificar que no hay fuga de datos entre tenants
- Probar operaciones CRUD con RLS activo

### 6.3 Pruebas de Performance
- Comparar performance antes/después de la migración
- Verificar que RLS no afecta significativamente las queries

---

## 📅 Fase 7: Despliegue (1-2 horas)

### 7.1 Configurar PostgreSQL en Producción
```bash
# Opciones:
# 1. Supabase (recomendado - incluye RLS listo)
# 2. AWS RDS
# 3. Railway
# 4. Neon (serverless PostgreSQL)
```

### 7.2 Ejecutar Migraciones en Producción
```bash
npx prisma migrate deploy
```

### 7.3 Verificar RLS en Producción
```sql
-- Verificar que RLS está habilitado
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- Verificar políticas
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
FROM pg_policies 
WHERE schemaname = 'public';
```

---

## 📅 Fase 8: Monitoreo y Mantenimiento

### 8.1 Monitoreo
- Configurar alertas para errores de RLS
- Monitorear performance de queries
- Revisar logs de PostgreSQL

### 8.2 Documentación
- Documentar políticas RLS
- Crear guía para agregar nuevas tablas con RLS
- Documentar proceso de troubleshooting

---

## 🎯 Checklist de Migración

- [ ] PostgreSQL instalado y configurado
- [ ] Base de datos creada
- [ ] Schema de Prisma actualizado
- [ ] Datos migrados de SQLite
- [ ] RLS habilitado en todas las tablas
- [ ] Políticas RLS creadas
- [ ] Middleware de Prisma implementado
- [ ] Variables de entorno actualizadas
- [ ] Pruebas unitarias pasadas
- [ ] Pruebas de integración pasadas
- [ ] Performance verificado
- [ ] Despliegue en producción
- [ ] Monitoreo configurado
- [ ] Documentación actualizada

---

## ⚠️ Consideraciones Importantes

### Seguridad
- Nunca almacenar contraseñas en texto plano
- Usar variables de entorno para credenciales
- Rotar credenciales regularmente
- Usar SSL/TLS para conexiones a PostgreSQL

### Performance
- RLS puede agregar overhead (~5-10%)
- Indexar columnas tenant_id
- Usar EXPLAIN ANALYZE para optimizar queries

### Rollback
- Mantener backup de SQLite durante la transición
- Tener plan de rollback en caso de problemas
- Documentar proceso de reversión

---

## 📞 Soporte

Si encuentras problemas durante la migración:
1. Revisar logs de PostgreSQL
2. Verificar políticas RLS con `\d+ table_name`
3. Usar `EXPLAIN ANALYZE` para debug queries
4. Consultar documentación de Prisma RLS

---

## 🚀 Tiempo Estimado Total: 8-12 horas
