# Cómo Ejecutar la Migración SQL en Windows

> **Actualizado:** 16 de Septiembre de 2026

> ⚠️ **VÍA RECOMENDADA — SQL Editor de Supabase.** No hay acceso DDL directo: la conexión directa a `db.<ref>.supabase.co:5432` falla con `getaddrinfo ENOTFOUND`. Las migraciones DDL **se aplican vía SQL Editor de Supabase**, no con `prisma migrate` ni `psql` contra el host directo.

> **Node portable del proyecto:** `C:\Users\denta\OneDrive\Documentos\Default Project\Node\node-v24.19.0-win-x64`. Para scripts usa `& "ruta\node.exe" script.js`. `pnpm.ps1` está bloqueado en Windows; usar `pnpm.cmd`.

## Opción 1: Aplicar SQL desde Supabase (RECOMENDADO)

1. Ir a: https://app.supabase.com
2. Seleccionar tu proyecto
3. Ir a **"SQL Editor"** en el menú lateral
4. Crear **"New query"**
5. Copiar y pegar el contenido del script a ejecutar (ej. `scripts/migrations/008_consolidate_inventory_schema.sql`). Las consolidaciones vigentes son `007_consolidate_invoice_schema.sql` (facturación) y `008_consolidate_inventory_schema.sql` (inventario), ambas aplicadas el 16 Sept 2026.
6. Click en **"Run"**
7. Verificar el resultado en la misma consola

Las migraciones persistentes viven en dos lugares:
- `prisma/migrations/*.sql` (migraciones de schema vía Prisma)
- `scripts/migrations/*.sql` (scripts ad-hoc de Supabase/RLS)

## Opción 2: Usar Prisma para generar el cliente (no aplica DDL a Supabase)

Con Node portable + `pnpm.cmd`:

```bash
pnpm.cmd prisma generate
```

(Nota: usa `pnpm.cmd` — el `pnpm.ps1` está bloqueado por política de ejecución en Windows.)

`npx prisma db pull`, `db execute`, `migrate dev` y `migrate deploy` requieren conexión directa y fallan contra Supabase con `getaddrinfo ENOTFOUND`. Úsalos solo contra una instancia local si existe, o aplica el SQL manualmente (Opción 1).

## Opción 3: Usar un Cliente PostgreSQL GUI (solo si hay conexión disponible)

1. **Descargar DBeaver** (gratis): https://dbeaver.io/download/
2. Conectar a tu base de datos PostgreSQL **con una cadena que tenga acceso** (no el host directo `db.<ref>.supabase.co`, que da ENOTFOUND)
3. Abrir el archivo: `scripts/migrations/008_consolidate_inventory_schema.sql`
4. Ejecutar el script (F5 o botón "Execute")

En la práctica, para este proyecto se prefiere la **Opción 1 (SQL Editor de Supabase)**.

---

## Solución Alternativa: Migración Manual

Si las migraciones anteriores fallaron, primero limpiar:

```sql
-- Ejecutar esto primero en el SQL Editor de Supabase
DROP VIEW IF EXISTS invoice_item_view;
DROP VIEW IF EXISTS InvoiceSummary;

-- Luego ejecutar el script 007/008 según corresponda
```

---

## Verificación

Después de ejecutar, verificar que las columnas existen (también desde el SQL Editor):

```sql
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'Invoice' 
ORDER BY ordinal_position;
```

Deberías ver: `invoiceType`, `dueDate`, `customerEmail`, etc.

Para verificar la consolidación de inventario:

```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'product'
ORDER BY ordinal_position;
```

Para verificar que las tablas legacy fueron eliminadas:

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('invoice','invoiceitem','invoices','invoice_items','Product','products','InventoryMovement','InventoryTransaction');
-- Debe devolver 0 filas (legacy eliminadas en 007/008)
```

> **Nota:** si la ruta a verificar es una API protegida, un `curl`/`Invoke-WebRequest` sin sesión devolverá **404** (middleware `auth.protect()`), aunque la columna exista. Verifica la tabla desde SQL Editor, o la API desde el navegador con sesión iniciada.