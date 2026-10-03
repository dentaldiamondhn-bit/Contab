# Aislamiento entre empresas (28 Septiembre 2026)

Documento de referencia del modelo de datos multi-empresa. Complementa a
`AGENTS.md` (que tiene las reglas) y a `CLAUDE.md` (que tiene el historial).

## El modelo

Tres conceptos que se confunden entre sí:

| Concepto | Dónde vive | Ejemplo |
|---|---|---|
| **Tenant** | `Tenant.id` | `TEST1DS`, `ANGELOH7`, `1` |
| **Empresa** | `companies.id` (un `text`, no un UUID) | `8143dd4e-4aef-4619-87a2-0504d0c8c46a` |
| **Pantalla** | `/companies/[id]/...` → ese `[id]` es el **`companies.id`** | — |

**Un tenant puede tener varias empresas.** `TEST1DS` tiene dos:

| Empresa | `companies.id` | RTN | Creada |
|---|---|---|---|
| test 1 | `8143dd4e-4aef-4619-87a2-0504d0c8c46a` | 0101-0220-312304 | 04:54:51.391 |
| test 2 | `971bec43-5c57-44a3-92b0-db7f909c5276` | 0101-0220-312303 | 04:54:56.243 |

**No comparten nada.** Y antes de la migración 023 sí compartían: todas las tablas
filtraban por `tenant_id`, y las dos empresas tienen `tenant_id = TEST1DS`. Test 1
veía los 2 productos de test 2 y las facturas del libro del otro.

## Por qué `company_id` y no `tenant_id`

`tenant_id` sirve para **agrupar**; `company_id` es lo que **aísla**. Por eso las
consultas llevan los dos: el de tenant por coherencia y compatibilidad, el de
empresa por seguridad.

```ts
import { contextoDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: id });

let q = getSupabaseServer()
  .from("product")
  .select("*")
  .eq("tenant_id", empresa.tenantId)        // agrupa
  .match(filtroEmpresaOCompany(empresa))     // aísla
```

## La comprobación de pertenencia

`contextoDeEmpresa()` es lo que cierra el agujero de seguridad. Orden de
resolución:

1. `[id]` de la ruta (`/companies/[id]/...`)
2. `?companyId` o `?company_id` de la query
3. header `x-tenant-id` de la sesión

El header **valida**: si la empresa pedida no es del tenant de la sesión, lanza
**403** y no devuelve nada.

Antes esto no existía y el orden era `?companyId` → header. Como `?companyId` lo
manda el cliente, **cualquier usuario autenticado leía y escribía datos de otra
empresa** con `?companyId=ANGELOH7`. `validateTenantAccess` de
`lib/tenant-utils.ts` es un stub que devuelve `true` siempre: no sirve como control
de acceso.

## Cómo se resolvió

La migración **`023_company_level_isolation.sql`** (aplicada el 28 Sept 2026):

1. Añadió `company_id` a las 5 tablas que no lo tenían: `bankaccount`, `customer`,
   `inventory_movement`, `File`, `paymentlink`.
2. **Normalizó los valores que ya había.** `company_id` guardaba dos cosas
   distintas según la tabla:
   - `product`, `Invoice`, `InvoiceItem`, `Account`, `JournalEntry` → UUID de
     `companies.id` (correcto).
   - `cai`, `warehouse`, `Transaction`, `Purchase`, `talonarios` → **el código del
     tenant** (`"DENTALWD"`, `"ANGELOH7"`, `"TEST1DS"`), que no era ninguna
     empresa. Cualquier filtro por `company_id` mezclando ambas convenciones daba
     resultados erróneos.
3. **Rellenó las filas huérfanas** (8 productos, 28 cuentas, 1 bodega) con la
   **empresa más antigua del tenant**, por `created_at`. Para `TEST1DS` gana
   "test 1" por 5 segundos.
4. **Puso un trigger `BEFORE INSERT`** para que las filas nuevas hereden
   `company_id` de su tenant. Sin esto, el siguiente `INSERT` que solo mandara
   `tenant_id` dejaría la fila sin empresa y el aislamiento se pudriría solo.

### Verificar

```bash
node scripts/verificar-aislamiento.mjs
```

Solo lectura, va por PostgREST. Dice si la 023 está aplicada, si cada `company_id`
apunta a una empresa real, y si las empresas de un mismo tenant comparten filas.
Estado actual: **`TODO OK`**.

### Estado de los datos

| Empresa | productos | facturas | CAI | bodegas |
|---|---|---|---|---|
| test 1 | 2 | 0 | 1 | 2 |
| test 2 | 0 | 0 | 0 | 0 |

**test 2 quedó con inventario vacío**, porque los 2 productos de `TEST1DS` son de
test 1 por la regla de la más antigua. Es el comportamiento esperado, pero si
test 2 debería tenerlos hay que moverlos.

Quedan **8 cuentas** sin `company_id`, de los tenants `tenant_001` y
`default-tenant`, que **no existen en `companies`**. Son basura legacy: borrarlas o
asignarlas a una empresa.

## Los dos roles del onboarding

No es una diferencia de permisos: es un **modelo de datos distinto**.

| | **CONTADOR** | **EMPRESARIO** |
|---|---|---|
| Empresas | **N**, cada una aislada por completo | **1** |
| Sedes | no le aplican | **N** (sucursales) |
| Vista consolidada | **PROHIBIDA**: nada de reporte global entre empresas | **SÍ**, sumando sus sedes |
| Membresía | una fila por empresa, `relationship='accountant'` | una sola fila, `relationship='owner'` |

El campo que decide es `relationship` en `user_company_access`. Con **1** empresa es
un empresario; con **2 o más** es un contador. La 024 hizo ese reparto solo, a
partir de cuántas empresas tiene el tenant del usuario.

### Estado real (verificado el 28 Sept 2026)

| usuario | empresas | relationship |
|---|---|---|
| `azuna22@outlook.com` | test 1, test 2 | `accountant` ← **el contador** |
| `gcalix12@hotmail.com` | Clinica Dental Diamond, Angelos | `owner` ×2 (ver abajo) |
| `jainreyes8763@gmail.com` | Empresa TST20HM | `owner` |
| `sucachi.123@gmail.com` | Empresa CLINICB3 | `owner` |

Dos problemas que salieron al medir:

- **`gcalix12@hotmail.com` tiene DOS filas en `User`**, no una: una MANAGER de
  Clinica Dental Diamond y otra ADMIN de Angelos. El caso del contador ya existe
  en los datos, pero partido en dos usuarios. Lo correcto es un `User` con dos
  filas en `user_company_access`.
- **`Empresa 1` (tenant `'1'`) no tiene membresía**: ningún `User` tiene ese
  `tenantid`, así que es inalcanzable desde la UI. Hay que darle dueño o borrarla.

### `User.tenantid` es legacy

Sirvió para el backfill de la 024, pero la verdad es `user_company_access`. Un
"empresa activa" guardado en `User` sería una copia que se desincroniza.

### La jerarquía de ubicaciones

```
companies          (empresa)        <- company_id: la frontera de aislamiento
  └── company_location   (sucursal)  <- location_id: creada en la 024
        └── warehouse    (bodega)   <-TIENE location_id desde la 024b
              └── product_location  (estante; TIENE aisle y shelf)
```

`product_location` (creada en la 017) es el maestro de **estantes**, no de sedes:
tiene `aisle` y `shelf`. Por eso la tabla de sedes se llamó `company_location` y
no `location`: el nombre ya estaba ocupado por otra cosa.

Las 8 sedes que creó la 024b son todas `PRINCIPAL` con `is_default=true`. **No
inventó ninguna sede real**: si una empresa tiene tres sucursales, hay que
crearlas; la 024b solo dejó una sede por defecto para que la UI tenga algo que
mostrar y los INSERT hereden una ubicación.

## Los dos flujos, en el código

### Contador: selector de empresa

```
contextoDeEmpresa(request, { companyIdDeRuta: id })
```
valida que esa empresa esté en la membresía del usuario y lanza 403 si no. Al
cambiar de empresa hay que **limpiar el estado global** (React Query, Zustand) e
inyectar el `company_id` nuevo en cada petición: sin eso, un cambio de empresa
deja en pantalla datos de la anterior.

### Empresario: selector de sede

`activeLocationId: string | 'ALL'`. Con `'ALL'` los reportes consolidan (se
**excluye** el filtro `location_id`) y los formularios **exigen** elegir sede.
Con una sede concreta, todo filtra por `location_id` y las escrituras lo heredan
por defecto (trigger `trg_fill_location`).

`location_id = NULL` significa **"a nivel de empresa"**: cuenta en la consolidada y
no aparece en el filtro de una sede. No es "dato faltante".

### Lo que NO lleva `location_id`

- `Account` y `chart_of_accounts`: el plan de cuentas es de la **empresa**. No
  existe el concepto de plan por sucursal y no hay que inventarlo.
- `BankAccount`: una cuenta bancaria es de la empresa. Repartirla entre sedes es
  una decisión del cliente, no una suposición.
- `product`: su stock se reparte por `product_location` (estante), no por sede.
- `warehouse` y `product_location`: cuelgan **de** la sede, no al revés.


### `location_id` significa DOS cosas (trampa activa)

Después de la 024b, el mismo nombre de columna apunta a cosas distintas:

| Tabla | Tipo | Apunta a | Qué es |
|---|---|---|---|
| `warehouse` | `uuid` | `company_location.id` | la **sede** |
| `product` | **`text`** | `product_location.id` | el **estante** (viene de la 017) |

Las 29 tablas con `location_id` son `uuid` y significan sede, **menos `product`**, que
es `text` y significa estante. Consecuencia práctica: un
`.eq('location_id', sedeId)` sobre `product` **no da error**, compara un texto y
filtra por la columna equivocada, devolviendo productos de otra sede. El
`product_location_id` correcto está en `inventory_movement` y en `product_location`.

`product.location` (a secas) es texto libre descriptive, del tipo
`"Edificio Principal - Planta Baja"`. No sirve para filtrar.

## Estado de las rutas

Solo `app/api/inventory/products/route.ts` está migrada. **Los otros 42 archivos
con filtro por `tenant_id` (103 filtros) siguen mostrando los datos de las empresas
hermanas del mismo tenant**, incluido el libro contable.

Hasta que se migren, no se puede considerar cerrado el aislamiento. El patrón a
seguir está en el GET/POST/PATCH de `products/route.ts`.

## Lo que falta para cerrar el aislamiento

Verificado el 28 Sept 2026 con `node scripts/verificar-contexto.mjs`:

| Gap | Tamaño | Por qué importa |
|---|---|---|
| **Vistas de reportes sin filtrar** | 42 vistas | `libro_ventas`, `libro_mayor`, `balance_general`, `balanza_comprobacion`, `estado_resultados`, `flujo_efectivo_mensual`… Se leen de tablas ya aisladas pero **no filtran por `company_id`**, así que un reporte puede mezclar empresas. **Bloquea la vista consolidada del Empresario.** Es la 027. |
| Tablas sin `company_id` | 51 tablas | Las que no tenían `tenant_id`: `AccountReceivable`, `BookClosing`, `Reconciliation`, `payment_vouchers`, `payroll_vouchers`, `asset_*`, `itr_produccion`, `budget_lines`. Sin `company_id` no se pueden aislar. |
| Rutas API con filtro por tenant | 42 archivos | El patrón de `products/route.ts` sin aplicar. |
| `location_id` con dos significados | 2 tablas | Ver la trampa de abajo. |

**El orden importa:** la 027 (vistas) antes que cualquier reporte consolidado. Con
las vistas mezclando empresas, un "estado de resultados consolidado" de un
empresario puede estar sumando la contabilidad de otra.

## Errores que de verdad se cometieron en este trabajo

Sirven como advertencia, porque todos pasaban el typecheck:

1. **`?companyId` ganaba al header de sesión.** `?companyId` lo manda el cliente;
   el header sale de la sesión. Con el orden invertido, acceso cruzado a cualquier
   empresa.
2. **`update` por solo `id`, sin filtro de tenant** (en el PATCH de productos). Un
   IDOR: cualquiera autenticado modificaba el registro de otra empresa con solo
   conocer el id.
3. **`body.tenantId` como fallback** del tenant. El cliente decidía en qué empresa
   se guardaba el registro.
4. **`.eq()` sin reasignar** (`query.eq('tenant_id', t)`). supabase-js devuelve una
   consulta nueva: el filtro no se aplicaba y salían datos de todas las empresas.
5. **`company_id` con dos convenciones mezcladas.** Columna existente y medio
   inútil, y ninguna ruta la usaba para filtrar.
6. **`add column if not exists` no cambia el tipo** de una columna que ya existe.
   Falló más tarde y lejos de la causa.
7. **`companies.id` es `text`, no `uuid`.** El esquema mezcla `text` y `uuid`
   (`product.id` sí es `uuid`). Suponerlo rompe la migración.
8. **`%1$I` fuera de un `format()`** dentro de un `DO $$`. Postgres lo lee como SQL.
