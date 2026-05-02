# Cómo Ejecutar la Migración SQL en Windows

## Opción 1: Usar Prisma (Recomendado)

### Paso 1: Verificar conexión
```bash
npx prisma db pull
```

### Paso 2: Ejecutar SQL directamente
```bash
npx prisma db execute --file=prisma/migrations/011_camelcase_migration.sql
```

### Paso 3: Regenerar cliente
```bash
npx prisma generate
```

---

## Opción 2: Usar Prisma Migrate

```bash
npx prisma migrate dev --name add_invoice_type_fields
```

Esto aplicará automáticamente las migraciones pendientes.

---

## Opción 3: Usar un Cliente PostgreSQL GUI

1. **Descargar DBeaver** (gratis): https://dbeaver.io/download/
2. Conectar a tu base de datos PostgreSQL
3. Abrir el archivo: `prisma/migrations/011_camelcase_migration.sql`
4. Ejecutar el script (F5 o botón "Execute")

---

## Opción 4: Si usas Supabase

1. Ir a: https://app.supabase.com
2. Seleccionar tu proyecto
3. Ir a "SQL Editor" en el menú lateral
4. Crear "New query"
5. Copiar y pegar el contenido de `011_camelcase_migration.sql`
6. Click en "Run"

---

## Solución Alternativa: Migración Manual

Si las migraciones anteriores fallaron, primero limpiar:

```sql
-- Ejecutar esto primero en tu cliente SQL
DROP VIEW IF EXISTS invoice_item_view;
DROP VIEW IF EXISTS InvoiceSummary;

-- Luego ejecutar el script 011
```

---

## Verificación

Después de ejecutar, verificar que las columnas existen:

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Invoice' 
ORDER BY ordinal_position;
```

Deberías ver: `invoiceType`, `dueDate`, `customerEmail`, etc.
