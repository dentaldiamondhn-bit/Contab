# Integración de Paquetes con Frontend

> **Actualizado:** 17 de noviembre de 2026

Los paquetes ahora tienen una API dedicada en `/api/inventory/packages/` y componentes frontend completos en `components/inventory/`.

## Rutas API para Paquetes

### 1. `app/api/inventory/packages/route.ts` - API Route Completa

| Método | Descripción |
|--------|-------------|
| `GET` | Obtener todas las paquetes con validación de tenant |
| `POST` | Crear un nuevo paquete con validación de stock |
| `PATCH` | Actualizar paquete existente |
| `DELETE` | Eliminar paquete |

Las rutas usan `contextoDeEmpresa` y `filtroEmpresaOCompany` para validación de tenant, consistente con otros routes de inventario.

### 2. Componentes Frontend

#### `components/inventory/PackagesList.tsx`
Componente para mostrar la lista de paquetes en una tabla con columnas:
- nombre, código, categoría, stock, precio, acciones

#### `components/inventory/PackageForm.tsx`
Modal form para crear/editar paquetes con campos:
- nombre, código, descripción, unidad, precio unitario, stock mínimo/máximo, categoría

## Estructura de la Base de Datos

Las tablas y migraciones de paquetes ya están aplicadas en la base de datos (migraciones 043-045 y siguientes). La estructura incluye tablas `Packages` y `PackageProducts` con políticas RLS por tenant.

## Integración con Supabase

Las operaciones de paquetes están protegidas por RLS por tenant. Las rutas API extraen el `companyId` de la URL pathname (`/companies/[id]/inventory/packages`) para validar el contexto empresarial antes de cualquier operación.

## Flujo Completo

1. **Usuario accede a la sección de paquetes** en la página de inventario
2. **Frontend llama a `GET /api/inventory/packages`** para cargar la lista
3. **Usuario crea un nuevo paquete** usando el `PackageForm` modal
4. **Frontend envía POST a `/api/inventory/packages`** con los datos del paquete
5. **API valida stock y tenant**, entonces crea el paquete en PostgreSQL
6. **Frontend muestra mensaje de éxito** y actualiza la lista

## Consideraciones Importantes

- **Validación de tenant**: Todas las rutas extraen `companyId` del pathname
- **Validación de stock**: El API verifica stock disponible antes de crear paquetes
- **Consistencia**: Mismo patrón que otros routes de inventario (`/api/inventory/products`, etc.)
- **RLS**: Operaciones protegidas por tenant via `contextoDeEmpresa`