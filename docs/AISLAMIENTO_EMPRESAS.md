# Aislamiento entre empresas (28 Septiembre 2026 · actualizado 8 Octubre 2026)

Documento de referencia del modelo de datos multi-empresa. Complementa a
`AGENTS.md` (que tiene las reglas) y a `CLAUDE.md` (que tiene el historial).

> **Sobre las fechas.** El cuerpo se escribió el **28 Sept** y se conserva: donde un
> número cambió, aparece **"28 Sept → 7 Oct"** en vez de reescribirlo, para que se
> vea qué se corrigió. Secciones nuevas: **§Rutas (medido)**, **§`product_location`
> sin empresa** y **§Ninguna unicidad que separe empresas**.
>
> | Qué cambió desde el 28 Sept | |
> |---|---|
> | Rutas migradas | 1 de 43 (28 Sept) → hoy **28 siguen solo en `tenant_id`** (8 Oct: `costs` y `custom-kpis` salieron en la 051); las de compras/proveedores ya están |
> | Compras y proveedores | aislados por `company_id` (§Compras) |
> | `Supplier.company_id` | NOT NULL + FK; **sin** unicidad de RTN (§Ninguna unicidad) |
> | Tablas descubiertas con `company_id` incoherente | `product_location` — abajo, *"`product_location` sin empresa"* |

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

### Estado real (verificado el 28 Sept 2026 — **instantánea, no re-medida**)

> Se conserva tal cual. Lo único que sí se re-midió después fue el número de
> membresías (**8**, no 7: la 036 añadió la de Empresa 1) y la resolución por
> identidad de Clerk (5 Oct). Ver `AGENTS.md` §1b.

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

### `product_location` sin empresa (descubierto 7 Oct 2026)

Dato **vivo**, no histórico. Medido sobre producción:

| Tabla | filas | `company_id` | ¿correcto? |
|---|---|---|---|
| `product` | 13 | 3 UUIDs de `companies` | ✅ |
| `warehouse` | 3 | 3 UUIDs de `companies` | ✅ |
| **`product_location`** | **2** | **`TEST1DS`** ×2 | ❌ **es el código del tenant** |

`product_location.company_id` guarda un **tenant** donde debe haber una **empresa**.
Es el mismo problema que la 023 normalizó en `cai`, `warehouse`, `Transaction` y
`Purchase` — esta tabla se quedó fuera. Consecuencias:

- Un `.eq('company_id', uuidEmpresa)` sobre `product_location` **no da error**: compara
  un UUID contra `"TEST1DS"`, no casa nunca, y devuelve **0 filas**. Falla en silencio
  hacia el otro lado del que estábamos acostumbrados.
- Cualquier filtro por empresa sobre estantes no verá nada.

**Reparación APLICADA Y VERIFICADA (8 Oct 2026):** las 2 filas se reasignaron a los
UUIDs reales de `companies` de test 1 (B2 por **decisión explícita del usuario**;
C1 por evidencia directa). Está escrita en
`prisma/migrations/046_product_location_company_id_tenant.sql`. Cómo resolvió cada
fila:

| Fila | Evidencia | Empresa asignada |
|---|---|---|
| C1 `79d3d2bb…` | única: `warehouse_id` → `warehouse` (test 1) + 1 producto en el estante (test 1) | test 1 |
| B2 `20845b5f…` | **ninguna**: `warehouse_id` NULL, 0 productos, 0 movimientos | test 1, **decidido por el usuario** (mismo batch/serie UB que C1) |

El preflight **aborta si la evidencia es ambigua** — nunca inferir la empresa a partir
del tenant, que es exactamente el error. La decisión del usuario es explícita y cerrada:
si aparece una fila rota nueva sin decisión, la migración aborta en vez de adivinar; y
si la evidencia directa (bodega/productos) contradice la decisión, gana la evidencia y
aborta para resolver a mano.

**Verificación medida desde fuera** (PostgREST con `service_role`, 8 Oct 2026), no por
el "Success" del SQL Editor:

- B2 `20845b5f…` → `company_id = 8143dd4e-…` (test 1) y C1 `79d3d2bb…` →
  `company_id = 8143dd4e-…` ✅
- filas con `company_id = 'TEST1DS'` → **0** ✅
- filas con `company_id` que no existe en `companies` → **0** ✅
- total de `product_location` sigue en 2 (no se tocó nada más).

**Paso siguiente que quedaba desbloqueado — HECHO 8 Oct 2026:** el filtro por empresa ya
está en las dos rutas de inventario que aún leían `product_location` solo por tenant
(`locations/import`, `locations/image`, ver "Rutas que siguen en tenant"). Y el mismo
día también `warehouses/import` (la última de inventario). De la lista de rutas
pendientes quedan los de `billing/*` y los de subida fiscal (`costs` y
`custom-kpis` se cerraron el mismo día, ver 051 más abajo y en `CLAUDE.md`).

## Ninguna unicidad que separe empresas

**Regla explícita del usuario (7 Oct 2026): no se impone NINGUNA restricción de
unicidad que trate a las empresas de un mismo tenant como si fueran familia.**

El motivo no es teórico: las empresas de un tenant ya **pueden ser físicamente
distintas** (`TEST1DS` tiene test 1 y test 2), y además un mismo proveedor puede
repetirse en tenants distintos porque es un negocio atendiendo a clientes varios.

Lo que se **eliminó** por esto:

| Qué | Por qué estaba mal |
|---|---|
| `UNIQUE (rtn, tenant_id)` en `Supplier` | Decía "dentro de este tenant, este RTN es único" — un tenant con dos empresas no puede dar de alta al mismo proveedor |
| FK `Supplier.company_id` `ON DELETE CASCADE` | Borrar una empresa borraba sus proveedores **sin error** (el modo de fallo silencioso de siempre) |
| `UNIQUE (tenant_id, cost_type, cost_key)` en `cost_payments` | Decía "dentro de este tenant, este costo es único" — test 2 guardando `fixed::renta` **le cambiaba `company_id` e importe a la fila de test 1** en la misma sentencia (upsert). La 051 lo cambia por `(company_id, cost_type, cost_key)`: cada empresa tiene su propia clave de costo. **APLICADA Y VERIFICADA 8 Oct 2026** (desde fuera: test 1 y test 2 con la misma clave → 201 los dos) |

Verificado el 7 Oct: mismo RTN en test 1 → `201`; mismo RTN en test 2 (mismo
tenant) → **`201`**; borrar empresa con proveedor → **`409 23503`**.

> **Al añadir una restricción nueva, la pregunta es:** ¿separa empresas o solo evita
> duplicados dentro de una? Si toca el segundo caso está bien; si toca el primero,
> no. La frontera es `company_id`, nunca `tenant_id`.

Esto es **coherente con** el resto del documento: `tenant_id` agrupa, `company_id`
aísla. Una restricción unique sobre `tenant_id` es aislamiento en falso.

## Estado de las rutas

**28 Sept:** solo `app/api/inventory/products/route.ts` estaba migrada; **42 archivos
(103 filtros)** se quedaban en `tenant_id`, incluido el libro contable.

**7 Oct (medido con `node scripts/_auditar-comparticion-tenant.mjs`):**

| Superficies (tablas y vistas) | Cantidad |
|---|---|
| Con `company_id` → **separables** | **158** |
| Solo `tenant_id` → **no separables** | 13 (casi todas `*_backup_*`, `outbox_audit`, `auditlog`) |
| Ni tenant ni company (se entra por el padre) | 50 |

| Rutas | |
|---|---|
| Siguen **solo en `tenant_id`** | **28 rutas** (medido 8 Oct 2026; eran 33 el 7 Oct: `locations/import`, `locations/image` y `warehouses/import` en 048/050, `costs` y `custom-kpis` en 051) |
| Tocan una superficie sin `company_id` sin contexto validado | **0** ← el hallazgo bueno |

El avance es real pero **el aislamiento sigue abierto**: hasta que esas 28 no migren
(no son 43 — la cifra del 28 Sept contaba ficheros, aquí se cuentan rutas distintas),
no se puede considerar cerrado. El patrón a seguir está en el GET/POST/PATCH de
`app/api/inventory/products/route.ts`.

### Rutas que siguen en tenant (las que importan para datos)

Excluye las de `tenant/*`, `admin/*` y `support/*`, que son **de tenant por
naturaleza** (leen `User`, `companies`, `Tenant` a nivel de organización):

| Ruta | Tabla | Nota |
|---|---|---|
| `app/api/billing/products/route.ts` | `product` | datos ya con `company_id` correcto |
| `app/api/billing/cai/route.ts` | `cai` | idem |
| ~~`app/api/companies/[id]/inventory/warehouses/import/route.ts`~~ | ~~`warehouse`~~ | **RESUELTO 8 Oct 2026:** `contextoDeEmpresa` con el `[id]` de la ruta (antes el tenant salía de `x-tenant-id` o del campo `tenantId` del cliente), lectura de duplicados con `company_id.eq.X OR company_id.is.null`, INSERT con `company_id = empresa.companyId`, `respuestaDeErrorDeEmpresa` en el catch |
| ~~`app/api/companies/[id]/inventory/locations/import/route.ts`~~ | ~~`product_location`, `warehouse`~~ | **RESUELTO 8 Oct 2026:** `contextoDeEmpresa` con el `[id]` de la ruta (antes el tenant salía de `x-tenant-id` o del campo `tenantId` del cliente), INSERT con `company_id = empresa.companyId`, escritura con el tenant del servidor |
| ~~`app/api/companies/[id]/inventory/locations/image/route.ts`~~ | ~~`product_location`~~ | **RESUELTO 8 Oct 2026:** `contextoDeEmpresa`; UPDATE/DELETE del estante con `id`+`tenant`+`company_id.eq.X OR company_id.is.null` (el UPDATE de solo `id`+tenant era un IDOR dentro de `TEST1DS`); prefijo del bucket `{tenantId}/locations/` con tenant del servidor |
| ~~`app/api/companies/[id]/costs/route.ts`~~ | ~~`cost_payments`~~ | **RESUELTO 8 Oct 2026 (051):** `contextoDeEmpresa` + guard 400 en GET/POST; GET filtra `.eq('company_id', X)` (antes solo tenant, y sin tenant **sin filtro**); POST escribe `tenant_id`/`company_id` del servidor con read-then-write en vez de `upsert` ciego — el `UNIQUE (tenant_id, cost_type, cost_key)` viejo haría que la hermana **pisara** el importe ajeno; choca → **409** pidiendo la migración `051_cost_payments_unicidad_por_empresa.sql` (**ya aplicada y verificada** 8 Oct 2026) |
| ~~`app/api/companies/[id]/custom-kpis/route.ts`~~ | ~~`Transaction`~~ | **RESUELTO 8 Oct 2026 (051):** `getTicketPromedio` filtraba `Transaction` por el `companies.id` de la ruta **como si fuera `tenant_id`** (UUID contra columna de código → 0 filas silenciosas, KPIs que no aparecen); ahora `.eq('company_id', X)` (49/50 filas, medido). GET/POST/DELETE con `contextoDeEmpresa` + guard 400 + `respuestaDeErrorDeEmpresa` |
| `app/api/billing/{customers,payment-links,payment-receipts,bank-accounts}` | | |
| `app/api/closing/perform/route.ts` | | cierre de periodo |
| `app/api/accounting/*-upload`, `sar-*` | `companies` | subida fiscal |

**Rutas de compras/proveedores: NO están en la lista** — migradas el 2-7 Oct
(9 rutas). Ver `docs/COMPRAS_PROVEEDORES_REPORT.md` §6.1. **Órdenes de compra**
(`app/api/purchase-orders/*`) se alineó el **8 Oct 2026**: `lib/purchase-orders-db.ts`
nuevo con toda la lógica aislada por `company_id`, la ruta ya no lee `?companyId`
del cliente (solo `contextoDeEmpresa`), y "Recibir una O.C." crea la `Purchase`
real vía `createPurchase`. Ver `docs/COMPRAS_PROVEEDORES_REPORT.md` §6.6.

**El IDOR del CRUD de estantes: RESUELTO 8 Oct 2026.** `lib/services/location-service.ts`
— `updateLocation` y `deleteLocation` verificaban solo `id` + `tenant_id`, así que dentro
de `TEST1DS` un `PUT`/`DELETE` a `locations/[locationId]` podía tocar el estante de la
empresa hermana. Ahora las dos funciones encadenan `companyScope`
(`company_id.eq.X OR company_id.is.null`) en la comprobación **y** en el `UPDATE`/`DELETE`
(las filas con empresa NULL siguen siendo válidas, misma convención que `listLocations`),
y las rutas `locations/route.ts` / `locations/[locationId]/route.ts` usan
`contextoDeEmpresa` + `respuestaDeErrorDeEmpresa` en vez del `tenantHint` del cliente
(`resolveTenant` prefiere ese hint, o sea que lo mandaba el cliente).
Prueba: `tests/inventory/locations-crud.test.mjs` (8 casos, código real) → 18/18 con
`contexto-empresa.test.mjs`; entran en `npm test`.

## Lo que falta para cerrar el aislamiento

Verificado el 28 Sept 2026 con `node scripts/verificar-contexto.mjs`:

| Gap | Tamaño | Por qué importa |
|---|---|---|
| **Vistas de reportes sin filtrar** | 42 vistas | `libro_ventas`, `libro_mayor`, `balance_general`, `balanza_comprobacion`, `estado_resultados`, `flujo_efectivo_mensual`… Se leen de tablas ya aisladas pero **no filtran por `company_id`**, así que un reporte puede mezclar empresas. **Bloquea la vista consolidada del Empresario.** Es la 027. |
| Tablas sin `company_id` | 51 tablas | Las que no tenían `tenant_id`: `AccountReceivable`, `BookClosing`, `Reconciliation`, `payment_vouchers`, `payroll_vouchers`, `asset_*`, `itr_produccion`, `budget_lines`. Sin `company_id` no se pueden aislar. |
| Rutas API con filtro por tenant | ~~42 archivos~~ → **28 rutas** (8 Oct) | El patrón de `products/route.ts` sin aplicar. **Compras/proveedores ya salió de esta lista**, igual que `locations/import` + `locations/image` + `warehouses/import` (048/050) y `costs` + `custom-kpis` (051). |
| `location_id` con dos significados | 2 tablas | Ver la trampa de arriba. |
| ~~`product_location.company_id` guarda un tenant~~ | ~~2 filas (100%)~~ | **RESUELTO 8 Oct 2026 (046 aplicada y verificada):** las 2 filas apuntan a test 1; quedan 0 con `TEST1DS` y 0 inválidas. El filtro por empresa ya está en las rutas que la leen (`locations/import`, `locations/image`) **y** en el CRUD (`updateLocation`/`deleteLocation` con `companyScope`, rutas con `contextoDeEmpresa`): probado en `tests/inventory/locations-crud.test.mjs`. |

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
