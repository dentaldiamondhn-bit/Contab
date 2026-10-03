
?# AGENTS.md — Reglas del proyecto

Lee esto antes de tocar código. Estas reglas están verificadas contra la base de
datos real y contra el esquema real de Supabase; no las "adivines", casi todas
nacieron de un bug.

`CLAUDE.md` es el diario de cambios: qué se arregló, cuándo y con qué prueba.
Aquí van las **reglas invariantes**.

---

## 1. Multi-empresa: aísla por `company_id`, no por `tenant_id`

Las rutas API usan el contexto compartido, que **valida pertenencia**:

```ts
import { contextoDeEmpresa } from "@/lib/tenant-resolver";
import { filtroEmpresaOCompany } from "@/lib/company-scope";

const empresa = await contextoDeEmpresa(request, { companyIdDeRuta: id }); // lanza 400/403
let q = getSupabaseServer().from("product").select("*")
  .eq("tenant_id", empresa.tenantId)          // agrupa
  .match(filtroEmpresaOCompany(empresa))       // separa  <-- lo que de verdad aísla
```

`contextoDeEmpresa` devuelve `{ tenantId, companyId }`:

- **`companyId`** = `companies.id`. **Este es el isolation key real.**
- **`tenantId`** = `Tenant.id`, el grupo al que pertenece la empresa.

### Por qué importa: un tenant puede tener varias empresas

`TEST1DS` tiene **dos**: "test 1" (`8143dd4e-…`) y "test 2" (`971bec43-…`), con RTN
distinto. **No comparten nada.** Como las tablas filtraban solo por `tenant_id`,
test 1 veía el inventario de test 2 y viceversa. Por eso el filtro por tenant
solo no basta: hay que añadir siempre el de empresa.

### `companies.id` NO es el `tenant_id` de las tablas

Es la trampa más cara del proyecto:

- Las pantallas viven en `/companies/[id]/...`, y ese `[id]` es **`companies.id`**
  (un UUID para 7 de las 8 empresas actuales).
- Las tablas de negocio guardan el **`Tenant.id`** (`"ANGELOH7"`, `"TEST1DS"`, `"1"`)
  en `tenant_id` / `tenantId`. `companies.tenant_id` es donde vive ese valor.
- Usar uno por otro **no da error: devuelve cero filas**. Por eso el POS
  mostraba inventario vacío sin que nada fallara.

### `company_id` tenía dos convenciones mezcladas

Antes de la migración 023 la columna `company_id` guardaba **dos cosas distintas**:

| Tabla | Qué guardaba |
|---|---|
| `product`, `Invoice`, `InvoiceItem`, `Account` | el UUID de `companies.id` (correcto) |
| `cai`, `warehouse`, `Transaction`, `Purchase`, `talonarios` | **el código del tenant** (`"DENTALWD"`, `"ANGELOH7"`) |

Normalizado a UUID en la 023. Si ves un `company_id` que no parece un UUID, es
una fila que se coló por atrás.

### Comprobación de pertenencia (esto faltaba y era el agujero)

`contextoDeEmpresa` lanza **403** si la empresa pedida no es del tenant de la
sesión, y **400** si no se puede determinar. Antes ninguna ruta lo comprobaba, así
que `?companyId` (que manda el cliente) bastaba para leer y escribir datos de
**otra empresa**. El orden es `[id]` de la ruta → `?companyId` → header, y el
header **valida**: no se fía de la query.

- **Nunca** uses `|| "1"`, `.eq("tenantId", "1")` ni un tenant fijo.
- Sin contexto: **400**. No caigas a la empresa 1.
- `validateTenantAccess` de `lib/tenant-utils.ts` es un stub que devuelve `true`
  siempre: **no lo uses como control de acceso**.
- Ojo al migrar: un `update`/`.delete()` por solo `id` es un **IDOR** (se ha
  encontrado en varios sitios). Filtra siempre por empresa.
- **`contextoDeEmpresa` lanza `ErrorDeEmpresa` (400/401/403).** Si la ruta tiene su
  propio `try/catch` y responde `500` a secas, un **403 se reporta como 500** y un
  fallo de permisos parece un fallo del servidor. Usa `withEmpresa(...)` o, dentro
  del catch, `const r = respuestaDeErrorDeEmpresa(error); if (r) return r;` (ambos
  en `lib/tenant-resolver.ts`). Estaba mal en todo el árbol de `hr` (PIP y
  `hr/storage`).
- Y ojo: si `contextoDeEmpresa(...)` se llama **fuera** del `try`, su 403 escapa sin
  traducir (Next responde 500). Ponlo **dentro** del `try`.

### El RLS no te protege

`lib/supabase/server-lazy.ts` y `lib/supabase-db.ts` usan `SUPABASE_SERVICE_ROLE_KEY`,
que **salta el RLS por completo**. El aislamiento depende al 100% del código de
aplicación. (Hay además `supabase/disable-rls-*.sql` en el repo.)

### La `service_role` NO va hardcodeada, en NINGÚN sitio

No por buena práctica: aquí hay **33 ficheros de `scripts/`** más 2 fuera
(`delete-tenant-direct.ts`, `test-tenants-api.js`) que la llevan en claro y
**commiteada** (medido el 2 Oct 2026). `.gitignore` ya cubre `.env*` y
`.env.local` no está rastreado, así que el problema no es la config: es código que
declara `const supabaseServiceKey = 'eyJ...'` en lugar de leer `process.env`.

**SANEADO HECHO (2 Oct 2026): ya hay 0 credenciales en el código.** Se creó
`scripts/_supabase-env.js` (CommonJS, porque los scripts de ahí lo son) y los 35
ficheros leen de `process.env` / `.env.local`. `npm run verificar:credenciales`
falla si vuelve a colarse un JWT. Ojo al hacerlo: **el proyecto llama a la URL
`NEXT_PUBLIC_SUPABASE_URL`**, no `SUPABASE_URL`; usar el nombre de la documentación
deja los scripts rotos y hace parecer que el sanado funcionó.

**NO son varias claves: es una, copiada 33 veces.** Al decodificar los JWT se vio
que comparten **la misma firma** con payloads distintos, por typos: `"rose"`
en vez de `"role"`, y `"ref":"…esct"` en vez de `…ec3t`. Como la firma cubre
header+payload, **todos menos uno son 401 garantizado**. Consecuencias: rotar
**una** clave basta (comparar las claves como texto no las distingue), y
**comparar texto no es decodificar**: aquí se pensaron dos.

Lo que **queda** es rotar, y solo el usuario puede: sanear el fichero no invalida
nada. La clave sigue viva (probado el 2 Oct 2026) y en el historial de git
(6 commits, desde `b858db0` initial commit, 20 jul 2026). Guía en
`docs/ROTAR_SERVICE_ROLE.md`.

Los `scripts/disable-rls*.js` y `execute-rls.js` son el caso peor: con esa
clave, cualquiera con acceso al repo deja **producción entera sin RLS**.

- **Rota primero, sanea después**, nunca al revés: si cambias los 33 ficheros
  antes de rotar, te quedan scripts rotos y sin forma de probarlos.
- **Rotar invalida la clave pero no la borra del historial de git**
  (`git log -p` la sigue sacando). Si el repo llega a ser público, trátala como
  filtrada, no como "pendiente de rotar".

### El `[id]` de `/companies/[id]/...` NUNCA se compara contra `tenant_id`

Encontrado el 2 Oct 2026: las paginas de contabilidad mostraban el nombre de la
empresa equivocada, y **las dos mostraban la misma** (la de test 2). No era que
test 1 viera a test 2: era que un

```ts
comps.find((c) => c.tenant_id === tenantIdReal || c.id === tenantIdReal || ...)
```

**caia siempre en la primera fila**, porque `tenantIdReal` es un `tenant_id` y
`find` evalua en orden. Test 1 y test 2 comparten `TEST1DS`, asi que son
indistinguibles por ahi.

- **Busca solo por `c.id === companyId`.** El `[id]` de la ruta es `companies.id`
  y es unico.
- **`find`/`filter` con varios `||` sobre claves que no son unicas es un bug
  esperando:** gana el primero, y el orden parece inocuo.
- Cuando un bug de empresa sale en una sola de dos, **repara las dos**: la que
  "funcionaba" lo hacia por casualidad, no porque estuviera bien.
- Ojo al **merge**: `{ ...companyData, ...comp }` deja que `comp` pise la
  respuesta ya resuelta. El enrichido debe ser `{ ...comp, ...companyData }`.

Ojo con `/api/companies/[id]`: devuelve `id = c.tenant_id || c.id`, o sea su
`.id` es un **tenant**, no una empresa. Por eso `tenantIdReal` salia siendo
`TEST1DS`. Esa ruta ademas **no valida pertenencia** (service role sin
`contextoDeEmpresa`), con 24 consumidores: es un IDOR de lectura pendiente de
decidir.

### Usar `companies.name`, no `companies.business_name`

Medido el 2 Oct 2026: `companies` **no tiene columna `business_name`**. El nombre
esta en **`name`**; el RTN en `rtn`. Pedir `business_name` da
`42703 column companies.business_name does not exist`. La tabla si trae
`business_type`, `industry`, `contact_phone`, `email`, `address`.

- `.eq()` devuelve una consulta **nueva**: hay que reasignar.
  `query.eq('tenant_id', t)` sin asignar deja la consulta **sin filtro**.
- `searchParams.get('companyId')` dentro de un bloque puede **ocultar** la
  variable del `[id]` de la ruta y cambiar el tipo a `string | null`.
- `.order(col, { ascending: true })` recibe un **objeto**, no el string `"asc"`;
  si te equivoca el orden "la más antigua" sale al revés y el reparto de filas
  huérfanas se invierte en silencio.


### Un comentario que "explica" por qué algo NO está arreglado

Encontrado el 2 Oct 2026, y es la lección más transferable de este bloque.
`kpis` y `reports/occupancy` filtraban solo por `tenantId`, y el comentario decía:

> `Invoice` no tiene columna `company_id` […] el fallback por `tenantId` con el
> companies.id -> cero filas para casi toda empresa

**Era falso.** Medido: `Invoice`, `Transaction` y `cost_payments` **sí tienen
`company_id`**. Y `AGENTS.md` repetía el mismo error en su tabla de esquema real,
así que los dos documentos se copiaron el error mutuamente. Resultado: test 1 y
test 2 veían las mismas facturas y los mismos KPI.

- **No escribas que una columna "no existe" sin medirlo.** Que no exista en una
  tabla **sí** importa, y se comprueba rápido: `.eq('nombre', 'x')` da `42703` si
  la columna no está, y `0 filas` si existe. Un `select('*')` sobre una tabla
  **vacía** no dice nada: devuelve 0 filas y ninguna columna.
- **Un comentario que justifica un bug es el sitio más peligroso para meter una
  mentira**, porque el siguiente lo lee como justificación y no lo vuelve a medir.
- **Antes de cambiar un filtro a algo que "no funciona", comprueba que la
  columna existe.** Puede que el filtro estuviera bien y el dato, no.
- Y ojo con el otro sentido: **los fallbacks que se olvidan del filtro de
  empresa** convierten un "0 filas" en una fuga. Un fallback global como red de
  seguridad empeora el aislamiento.

### Rutas mock: no hay datos que aislar

`app/api/companies/[id]/reports/{profitability,maintenance,marketing}` devuelven
un **objeto literal fijo** en el código: no leen la base ni el `[id]`. Dos empresas
no pueden ver datos distintos porque no hay datos. Fallar al aislarlas sería
falso: lo que hay que arreglar es **el mock**, porque hoy enseña números
inventados (`totalRevenue: 1250000`) con apariencia de reales. Las cuatro rutas
tienen la advertencia en la cabecera.

### `scripts/_auditar-rutas-company.mjs`

Recorre `app/api/companies/[id]/**` y marca las que filtran por `tenantId` y no
por `company_id`. Solo lectura. Al 2 Oct 2026: **61 rutas, 36 sin contexto
validado, 9 sospechosas** (`billing/config*`, `billing/stats`, `costs`,
`custom-kpis`, 3 de importacion de inventario). Ojo: `globSync` **no encuentra
`[id]`** porque es un patrón de glob, hay que recorrer a mano.

## 1b. Los dos roles del onboarding: Contador y Empresario

No es una distinción de permisos, es un **modelo de datos distinto**. Ver
`docs/AISLAMIENTO_EMPRESAS.md`.

| | **CONTADOR** | **EMPRESARIO** |
|---|---|---|
### Dos trampas de supabase-js
| Empresas | **N**, cada una aislada por completo | **1** |
| Ubicaciones | no le aplican | **N** (sucursales) |
| Vista consolidada | **PROHIBIDA**: nada de reporte global entre empresas | **SÍ**, sumando sus ubicaciones |
| Membresía | una fila por empresa en `user_company_access` | una sola fila, `relationship='owner'` |

- La frontera es **`company_id`**. `tenant_id` agrupa, no aísla.
- Las sedes viven en **`company_location`**, no en `warehouse`. La jerarquía es
  `company → company_location (sucursal) → warehouse (bodega) → product_location
  (estante)`. Una bodega cuelga de una sucursal, no al revés, y `product_location`
  (creada en la 017) es el maestro de estantes: no la confundas con una sede.
- `location_id` **NULL significa "a nivel de empresa"**, no "sin dato". Cuenta en
  la consolidada y no aparece en el filtro de una sucursal.
- El plan de cuentas y los bancos son de la **empresa**, no de la sede: no les
  pongas `location_id` (ver el comentario de la 026).

### Tablas que parecen de rol y están vacías

`accountant_profiles`, `accountant_managed_companies`, `onboarding_companies` y
`business_units` existen pero tienen **0 filas**, y `accountant_managed_companies`
guarda `company_name` y `rtn` como **texto**, sin `companies.id`: es un duplicado
del cliente, no un vínculo, y no sirve como fuente de permisos. La membresía
válida está en **`user_company_access`**.

### El rol es POR EMPRESA, no del usuario entero

Esto no es un detalle de implementación: sale de los datos reales y es la clase
de bug que quita una función a alguien que le corresponde.

**El rol se deriva del `relationship` de la empresa ACTIVA** (`rolDeEmpresa()` en
`lib/workspace.ts`), no del número de empresas que administra el usuario.

Hay un caso que ya existe en la base: `azuna22@outlook.com` tiene **dos filas en
`User`** y **tres membresías**:

| Empresa | `relationship` | Rol en esa empresa |
|---|---|---|
| Empresa TEST185 | `owner` | `business_owner` (puede consolidar) |
| test 1 | `accountant` | `accountant` (sin consolidar) |
| test 2 | `accountant` | `accountant` (sin consolidar) |

Es **empresario de su propia empresa y contador de las de sus clientes al
mismo tiempo**. Si el rol se sacara del conteo global ("si tiene 2+ empresas,
es contador"), a esta persona se le negaría la vista consolidada de **su
propia** empresa, que sí le corresponde, y el selector de sede desaparecería
justo donde debería aparecer.

Por eso van **dos banderas separadas**:

- `role` — el de la empresa activa. Decide si aparece el filtro de sedes.
- `multiEmpresa` — tiene 2+ empresas. El flujo del contador aplica.
- `permiteConsolidar` — `role === 'business_owner'`. **`'ALL'` es exclusivo suyo.**

No las fuses en un solo campo `role` global.

### `User` tiene UN solo `tenantid`, y la membresía manda

`User.tenantid` es un dato **legacy**: se usó para el backfill de la 024, pero la
fuente de verdad de "a qué empresas entra este usuario" es **`user_company_access`**.
Si añades un campo a `User` para "empresa activa", será una copia
desincronizada: cámbialo en un sitio y el otro mintirá.

Un caso que ya existe en los datos, **medido el 30 Sept 2026**: no es un usuario
partido, son **DOS**. Hay 6 filas en `User` para 4 correos distintos, y los correos
duplicados son `gcalix12@hotmail.com` y `azuna22@outlook.com`.

| email | tenantid | role | `authid` de Clerk |
|---|---|---|---|
| `gcalix12@hotmail.com` | `cVcLafoZ…` | MANAGER | `user_3D99UNQz…` |
| `gcalix12@hotmail.com` | `ANGELOH7` | ADMIN | `user_3IbveWjN…` |
| `azuna22@outlook.com` | `TEST185` | ACCOUNTANT | `user_3JRMfTFp…` |
| `azuna22@outlook.com` | `TEST1DS` | ACCOUNTANT | `user_3JROv9o…` |

**Cada fila tiene un `authid` DISTINTO**: son dos cuentas de **Clerk** por persona,
no dos registros duplicados de la misma cuenta. Por eso el "un `User` y dos filas
en `user_company_access`" que se venía diciendo aquí **no es un `DELETE` de SQL**:
primero hay que resolver la identidad en Clerk, y solo después se puede fusionar la
fila. Cada fila está atada además a una empresa distinta como **`owner`**
(las 4 con authid propio son las 4 de las 7 membresías), así que borrar una fila
le quitaría la propiedad de esa empresa en silencio: es un cambio de permisos, no
una limpieza.

**El índice de email NO puede ser `UNIQUE(email)`.** `supabase/FULL_SETUP.sql` lo
tenía así y falla con `23505 could not create unique index "idx_user_email"`,
aunque no haya ningún bug de datos: en multi-tenant un correo puede ser usuario
legítimo de varios tenants.

**La invariante "un usuario por tenant" YA LA CUBRE Prisma**, no hay que añadir
nada:

```sql
CREATE UNIQUE INDEX "User_tenantId_email_unique" ON public."User" USING btree (tenantid, email)
```

Ojo al nombre: dice `tenantId` pero la columna real es **`tenantid`** en
minúsculas (Prisma la mapea con `@map`). Igual con `User_isActive_idx`, que está
sobre `isactive`. **No "arregles" esos nombres**, están bien.

Consecuencia práctica: los 4 duplicados (2 correos) nunca violaron ese unique
porque sus `tenantid` son distintos entre sí (`cVcLafoZ…`/`ANGELOH7` y
`TEST185`/`TEST1DS`). La tensión real no es de índices, es que hay **dos
identidades de Clerk** por persona.

Cuando migres índices a mano, **verifica si la invariante ya está cubierta antes
de crear otro índice.** Se escribió una migración (`027d`) que añadía un segundo
unique sobre esas mismas columnas, y `CREATE UNIQUE` sobre lo que ya es único no
falla: solo cobra el doble. Anulada; no la corras. El error fue comprobar que no
existiera un índice con el nombre que crea `FULL_SETUP`, en vez de comprobar si
el unique ya existía con otro nombre.

Ojo: un índice único trata los NULL como distintos, así que dos filas con el
mismo email y `tenantid` NULL **no** colisionarían. Hoy hay 0 NULL.

Y `authid` (el id de Clerk) **no tiene índice único**, solo `idx_user_authid` no
único: nada impide que dos filas de `User` apunten a la misma identidad de Clerk.

Ojo también con `app/api/auth/check-email/route.ts`: consulta la tabla **`users`**
(otra tabla, snake_case, con un `SUPER_ADMIN` que no es de auth) y no `User`. El
fallback a `"User"` solo se dispara si `users` no existe, y ahí usa
`.maybeSingle()`, que con estos duplicados revienta con `PGRST116`. Además
filtra `PGRST116` como "sin error", así que respondería `exists: false`. La
comprobación de "¿existe este correo?" está corriendo contra la tabla
equivocada.

### Cómo está montado el contexto (archivos, no teoría)

| Pieza | Archivo | Qué hace |
|---|---|---|
| Contexto de servidor | `lib/workspace.ts` | `contextoDeEspacio()` valida **empresa y sede** contra `user_company_access`. Lanza 400/401/403. |
| Endpoint | `app/api/workspace/route.ts` | Alimenta el selector. Único lugar que decide la empresa activa. |
| Contexto de cliente | `lib/contexts/WorkspaceContext.tsx` | Estado de empresa/sede para la UI. |
| Barra visible | `components/workspace/WorkspaceBar.tsx` | Badge + selector de empresa + filtro de sede, en todos los layouts. |
| Cookies → headers | `middleware.ts` | `active_company_id` / `active_location_id` → `x-company-id` / `x-location-id`. |

Reglas que este contexto respeta y hay que mantener:

- **La cookie es una pista, no una frontera de seguridad.** Cualquiera puede
  editar sus cookies. Por eso `contextoDeEspacio()` **vuelve a validar** la
  empresa contra la membresía y devuelve 403 si no es del usuario. Un
  middleware que solo reenvía el header sin validar deja el mismo agujero que
  tenía `?companyId` sin comprobar.
- **`x-tenant-id` NO se reemplaza por la cookie de empresa.** Sigue saliendo de
  los claims de Clerk, que son un solo tenant. `contextoDeEspacio()` **deriva**
  el tenant de la empresa activa, y por eso `tenant_id` y `company_id` nunca
  discrepan. Ese era el bug original.
- **Al cambiar de empresa se aborta lo que está en vuelo y se sube una
  "generación".** Sin esto, una respuesta vieja que aterrice tras el cambio
  pinta datos de la empresa anterior en la pantalla nueva: sin error y sin que
  nadie lo note. También se borran las claves `ws_*` de `localStorage`.
- **`/api/workspace` DEBE usar la misma precedencia que `contextoDeEspacio`:**
  `?companyId` → `x-company-id` (cookie) → por defecto. Si ignoraba el header, en
  un reload caía a `empresas[0]` y el selector/badge mostraban una empresa
  distinta del `[id]` de la URL, que es la que consultan las páginas. El cliente,
  además, pasa el `[id]` de la URL en la carga inicial
  (`WorkspaceContext.cargar`).
- **No hay React Query / Zustand / Redux / SWR** en el proyecto, y no se
  añadieron. El estado global es React Context. Cambiar el modelo de estado de
  un proyecto con 481 errores de typecheck es un trabajo con riesgo propio.
- Los Server Components **no leen la cookie de empresa**. Cambiar de empresa
  navega a `/companies/[id]` para que el servidor se recargue; por eso
  `TenantContext` sigue recomendando el `reload()` en su propio flujo.
- **Cambiar de empresa REMONTA el arbol de la UI (key).** El subarbol va envuelto
  en `WorkspaceShell` (`components/workspace/WorkspaceShell.tsx`), un `Fragment`
  con `key={activeCompanyId}`. Cambiar la key desmonta el arbol entero: es lo
  unico que borra el ESTADO LOCAL que no viene de HTTP (filtros de tabla,
  formularios, `useState` de paginas a medias), que de otro modo sobrevive
  porque el layout se reutiliza. `WorkspaceContext` expone `activeCompanyId` (la
  empresa comprometida con la UI; se mantiene mientras `empresa` es null en la
  transicion) y `limpiarEstado()` (el "RESET_STORE" de este proyecto: NO hay
  Redux/Zustand, asi que no existe un `queryClient.clear()`). Toda pagina que
  pida datos por empresa DEBE llevar `empresa?.id` en las dependencias del efecto
  y vaciar el dataset anterior antes del fetch; si falta, cambiar de empresa deja
  los datos de la anterior en pantalla (era el bug de `IntegratedBooksViewer`,
  cuyo efecto solo dependia de `bookType`).

## 2. Montos: lempiras, no centavos

Los importes de `Invoice` (`subtotal`, `tax`, `total`), de `InvoiceItem`
(`unitPrice`) y de `product` (`unit_price`) están **en lempiras**.

- **No** multipliques ni dividas por 100 "para convertir a centavos".
- Excepciones reales: `lib/reports/*` y `components/sales/SalesDashboard.tsx`
  (este último además está huérfano y roto: usa tablas inexistentes).

## 3. Correlativo de factura — el servidor es la autoridad

- El cliente **nunca** decide el número. `app/api/billing/invoices/route.ts` ignora
  `invoiceData.invoiceNumber`.
- Toda preview o reserva pasa por `lib/billing/invoice-number.ts`:
  - `previewInvoiceNumber(tenantId)` — lo que se muestra.
  - `reserveInvoiceNumber(tenantId, { suelo })` — lo que se emite.
- El correlativo sale de la **última factura de esa misma empresa**, no de una
  constante ni de una búsqueda global. El prefijo (`001-01-01-`) se toma de esa
  factura: cada empresa tiene su serie.
- Si hay un CAI vigente, **manda el rango del CAI** sobre la serie de facturas.
- La reserva con CAI es **condicional** (`.eq('current_number', valorLeido)`) y
  valida el rango **antes** de escribir, igual que `lib/services/stock-sale.ts`.
  Si la actualización no afecta filas, otro se llevó el correlativo: reintenta.
- La unicidad real es `UNIQUE("tenantId", "invoiceNumber")` (migración
  `022_invoice_number_unique_per_tenant.sql`, aplicada). Por empresa, no global.

## 4. Esquema real (no asumir)

| Tabla | Notas |
|---|---|
| `Invoice` | Prisma **camelCase**: `invoiceNumber`, `customerName`, `tenantId`, `issueDate`. Estados canónicos: `PAID` / `PENDING` / `CANCELLED` / `OVERDUE`. |
| `InvoiceItem` | igual en camelCase. Tiene `product_id` desde la migración 021. |
| `paymentlink` | **minúsculas**, columna `tenant_id`. **No declara ninguna FK**: los embeds de PostgREST son imposibles (`PGRST200`), hay que resolver con una segunda consulta. |
| `bankaccount` | minúsculas, `tenant_id`. |
| `cai` | **dos esquemas superpuestos**: español (`cai_number`, `rango_inicial`, `rango_final`, `fecha_limite_emision`, `current_correlative`, `estado`) y legacy inglés (`cai`, `start_number`, `end_number`, `current_number`, `expiration_date`, `status`). **La emisión depende del inglés**, así que se escriben los dos. |
| `product` | `current_stock` es la fuente real; `stock_quantity` es un espejo. |
| `File` | Tiene `tenantId` **y** `tenant_id`. Filtrar por las dos si no sabes cual escribio la fila. |
| `Transaction` | Prisma camelCase: `tenantId`, `voucherNumber`, `totalAmount`. **CORRECCION (medido 2 Oct 2026): SI tiene `company_id`**, ademas de `tenantId`, `tenant_id` y `tenantid`. Este doc decia antes que no; de ahi salio un bug de fuga en `kpis` y `occupancy`. |
| `Account` | Prisma camelCase: `tenantId`, `code`. Códigos reales: `1101-01`, `1103.01`. |

`Invoice` y `InvoiceItem` **sí** tienen `company_id` (migración 023). `InvoiceItem`
no tiene columna de tenant: se hereda de la factura por `"invoiceId"` (camelCase,
no `invoice_id`).

### PIP: las tablas hijas NO tienen `company_id`, se aíslan por `pip_plans`

`pip_plans`, `pip_goals`, `pip_evaluations`, `pip_evidence` y `pip_attendance_metrics`
**no tienen `company_id` ni `tenant_id`**. No los puedes filtrar por empresa
directamente: tienes que **entrar por el plan**, que sí lo tiene.

```ts
// Correcto: el plan es el que aísla, y además es la única forma de
// añadir goals/evaluaciones/métricas/evidencia a un plan existente.
const { data: plan } = await sb.from('pip_plans')
  .select('id')
  .eq('id', planId)
  .eq('company_id', empresa.companyId)   // <- el aislamiento real
  .single();
if (!plan) return NextResponse.json({ error: 'Plan no encontrado' }, { status: 404 });

const { data: goals } = await sb.from('pip_goals')
  .select('*')
  .eq('planId', plan.id)                 // por la FK, no por company_id
```

**Regla dura:** cualquier ruta nueva de PIP (incluida `pip_evidence`, que hoy no
tiene ninguna) **debe validar el `planId` contra `pip_plans.company_id` antes de
leer o escribir**. Un `eq('planId', planId)` a secas es un agujero: cualquier
tenant que pruebe un UUID ajeno lee evidencia ajena. Y al crear un goal/evaluación,
exigir que el goal pertenezca al **mismo `plan.id`** del cuerpo de la petición, en
el mismo orden: validar **antes** del insert, no después (si no, el insert crea una
fila huérfana y solo después te enteras).

`pip_plans` sí tiene `company_id` (verificado). El resto de tablas PIP no lo tienen
y no hay que añadirlo: la relación por `planId` es el patrón que ya usa el resto
del proyecto para `InvoiceItem`.

### `employees` se aísla por `company_id` (rutas de RRHH alineadas, 1 Oct 2026)

`employees` tiene **las dos** columnas (`company_id` = `companies.id`, texto; y
`tenant_id`). El aislamiento correcto es `company_id`. Estado medido el 1 Oct 2026:

- **ARREGLADO en `app/api/companies/[id]/employees/route.ts`.** Usaba el `[id]` de
  la ruta (que es `companies.id`, un UUID) como si fuera **`tenantId`**
  (`.eq('tenant_id', companyId)`) y **no llamaba a `contextoDeEmpresa`**: devolvia
  **0 filas** para toda empresa, y sin comprobar pertenencia. Ahora usa
  `contextoDeEmpresa` + `filtroEmpresa(empresa)` (solo `company_id`) en GET/POST/PUT/
  DELETE y `respuestaDeErrorDeEmpresa` en cada `catch`. En INSERT/UPDATE escribe
  `tenant_id = empresa.tenantId` y `company_id = empresa.companyId`.
- `.../hr/employees/search/route.ts`, `.../hr/attendance/reports/route.ts`,
  `.../hr/payroll/employees/route.ts` y `.../hr/storage/route.ts`: ya usaban
  `contextoDeEmpresa` + `filtroEmpresaOCompany`. **Se les quito el `.eq("tenant_id")`
  redundante en las consultas a `employees`** (y en storage la comprobacion del
  empleado): con `company_id` basta, y asi un `tenant_id` NULL tampoco esconde filas.

**Trampa de FK: `tenants` (minúsculas) NO es `Tenant` (Prisma).** El FK
`employees_tenant_id_fkey` apunta a **`tenants`**, una tabla legacy con **una sola
fila (`ANGELOH7`)**. La app usa `Tenant` (7 filas). Consecuencia medida: un
`employees.tenant_id = 'TEST1DS'` da `23503 Key (tenant_id)=(TEST1DS) is not
present in table "tenants"`. **ARREGLADO (1 Oct 2026):** el FK
`employees_tenant_id_fkey` ya no apunta a la tabla legacy y acepta `TEST1DS`
(comprobado con un PATCH del mismo valor, HTTP 200); Sully quedo con
`tenant_id='TEST1DS'`. Aun asi, las rutas de empleado filtran por `company_id`
para no depender de que `tenant_id` este poblado. Mismo patrón que las convenciones mezcladas: los nombres difieren en una `s`,
y el error sale como violación de FK, no como "tabla equivocada".

**Misma trampa en `employee_hr_documents.tenant_id` (pendiente, migracion 034).**
Medido el 1 Oct 2026 por el OpenAPI de PostgREST: `employee_hr_documents.tenant_id`
es **NOT NULL** y su FK todavia apunta a la tabla legacy `tenants`, mientras que
`employees.tenant_id` ya apunta a `Tenant`. O sea que a `employees` se le aplico el
repunte pero a `employee_hr_documents` se le paso. Consecuencia: el alta de
documentos de RRHH para cualquier empresa fuera de Angelos falla con `23503` y la
ruta lo capturaba en silencio (el empleado se creaba, los documentos se perdian).
La migracion **034** repunta ese FK a `"Tenant"(id)`; **pendiente de aplicar en el
SQL Editor**. En codigo, la ruta ya devuelve `hrDocumentsWarning` cuando el insert
falla, para que no se pierda sin avisar. Ojo: `positions`, `departments`,
`work_schedules`, `employee_history` y `attendance` tienen `tenant_id` NOT NULL
**sin FK**, y asi se dejan: sin FK no hay bloqueo.

## 5. Migraciones

- Los archivos en `prisma/migrations/*.sql` **no se aplican solos**: se ejecutan a
  mano en el **SQL Editor de Supabase**. Avisa al usuario y márcalas como
  pendientes en `CLAUDE.md` hasta que se confirmen.
- **NO corras `supabase/FULL_SETUP.sql` ni `scripts/migrations/SUPABASE_COMPLETE.sql`
  en esta base.** No son migraciones, son scripts de arranque para una base vacía, y
  están desfasados respecto al esquema real: `FULL_SETUP` tiene **9 sentencias que
  fallan** (las tablas de factura en snake_case contra el camelCase de Prisma:
  `tenantid` vs `tenantId`, `invoicedate` vs `issueDate`… y tres índices sobre
  `invoice`/`invoiceitem`, que no existen) y además **define las tablas de factura
  dos veces**, así que crearía un juego paralelo vacío y moriría a mitad.
  `SUPABASE_COMPLETE` es de otra generación entera (`"tenantId"`, `"Product"`,
  `"AccountPayable"`). Para esta base, **migraciones dirigidas** como la serie 027,
  aplicadas y verificadas una a una.
- **Estado: 022 y 023 aplicadas** (28 Sept 2026). La 023 rellenó `company_id` en
  todas las filas y dejó el trigger puesto. Para comprobarlo:
  `node scripts/verificar-aislamiento.mjs` (solo lectura, da `TODO OK`).
  - Quedan **8 cuentas** sin `company_id`, de tenants que **no existen** en
    `companies`: `tenant_001` y `default-tenant`. **NO son basura: 6 lo son, 2 no.**
    Ver la sección "Las 8 cuentas sin `company_id`: NO las borres" más abajo.
- **Estado: 024, 024b, 025 y 026 APLICADAS** (28 Sept 2026, corrieron sin error).
  Medido con `node scripts/verificar-contexto.mjs` (solo lectura):
  - `company_id` pasó de **54 a 98 tablas**.
  - `location_id` presente en las **8/8 transaccionales** del núcleo.
  - **8 sedes** creadas, todas `PRINCIPAL` y `is_default` (corrió la 024b).
  - `user_company_access`: **7 membresías**, repartidas en 2 usuarios
    empresario y 2 contador. El detalle del reparto y el caso de `azuna22`
    están en la sección 1b.
  - **Pendientes:** 51 tablas siguen sin `company_id` (las que no tenían
    `tenant_id`: `AccountReceivable`, `BookClosing`, `Reconciliation`,
    `payment_vouchers`, `asset_*`, `itr_produccion`…) y 42 de ellas son **vistas**.
  - ~~**`Empresa 1` (tenant `'1'`) no tiene membresía: nadie puede entrar.`~~
    **CORREGIDO el 2 Oct 2026: ya tiene dueño.** La migración
    **`036_empresa_1_dueno.sql`** asignó `owner` a `gcalix12@hotmail.com`
    (`00dec7a4-59f7-46c4-b475-dcf735df816e`) y se verificó **en la BD**: Empresa 1
    ya tiene su fila en `user_company_access`, con `relationship='owner'` e
    `is_default=false` (no se le cambia el defecto, que es Angelos). O sea que se
    puede entrar. Lo que sigue valiendo de esta sección es que **`User.tenantid` no
    es la fuente de la membresía**: ningún `User` tiene `tenantid = '1'` y aun así
    la empresa es accesible, porque la membresía vive en `user_company_access`.
  - `gcalix12@hotmail.com` tiene **dos filas en `User`** (MANAGER en Clinica Dental
    Diamond, ADMIN en Angelos). La 024 le dejó **dos membresías `owner`**, no
    `accountant`: si es contador, hay que corregirlo a mano.
  - Siguen **8 `Account` sin `company_id`** de los tenants `tenant_001` y
    `default-tenant`, que no existen en `companies`. **La 023/024 las dejaron igual,
    y NO se deben borrar tal cual**: se corrigió que 2 de ellas (`1101`, `4101`)
    tienen 65 asientos reales de tres empresas a la vez. Ver más abajo.
- **Estado: 027 APLICADA** (28 Sept 2026). Aisló **25 de las 46 vistas**
  contables por `company_id`. Verificada con `node scripts/verificar-vistas.mjs`
  (solo lectura): **25/25 exponen `company_id`** y el filtro por empresa devuelve
  exactamente las mismas filas que la tabla base (`libro_ventas` 3=3,
  `inventario_valorizado` 5/6/2 = 5/6/2). Los detalles y lo que deja fuera, más
  abajo.

### `Account.name` NO es único globalmente (y antes sí lo era, por un motivo malo)

La tabla tenía un **índice único global sobre `name`** (`Account_name_key`), y
posiblemente otro sobre `code`. En multi-empresa eso es una equivocación de diseño,
no una commodidad: **todas las empresas tienen una "Caja y Bancos"**. Con ese
`UNIQUE` es literalmente imposible que dos empresas tengan el mismo plan de cuentas.

Y eso es justo lo que causó el bug de las 8 cuentas: la semilla no pudo crear una
`1101` por empresa, así que creó **una fila compartida** (`tenantId='tenant_001'`,
que no existe en `Tenant`) y le colgó los asientos de tres empresas a la vez.

El correcto es **único por empresa**:

```sql
CREATE UNIQUE INDEX "Account_company_id_code_key" ON public."Account" ("company_id", code);
CREATE UNIQUE INDEX "Account_company_id_name_key" ON public."Account" ("company_id", name);
```

Las 8 filas legacy tienen `company_id` NULL, y Postgres trata los NULL como
distintos, así que no colisionan entre sí (comprobado: 0 duplicados en
`(company_id, code)` y `(company_id, name)` sobre las 35 legítimas).

Nada del código dependía del `UNIQUE` global: no hay ni un `.eq('name')` sobre
`Account`. `lib/accounting/resolve-account.ts` resuelve por **prefijo de código**
(`.ilike('code', prefijo + '%')`) con `.order('code').limit(1)`.

**No está en `prisma/schema.prisma`** (donde `name` no es único): es un residuo de
una versión antigua del schema de Prisma, así que quitarlo **elimina** drift.

**OJO, y esto costó dos intentos:** para encontrar un UNIQUE hay que mirar
**`pg_index`, no solo `pg_constraint`**. El `@unique` de Prisma se crea con
`CREATE UNIQUE INDEX`, o sea que es un **índice**, y no aparece en `pg_constraint`
con `contype='u'`. Pero Postgres **reporta igual** `violates unique constraint
"Account_name_key"` en los dos casos, porque el mensaje usa el nombre del índice.
Buscar solo en `pg_constraint` no dropea nada y el `INSERT` vuelve a fallar con
**exactamente el mismo error**, sin ninguna pista de que el `DROP` no ocurrió.

```sql
--ASI se recorren los unicos reales de una tabla
SELECT i.indexrelid, ic.relname, i.indisprimary, i.indnkeyatts,
       pg_get_indexdef(i.indexrelid, 1, true) AS col,
       EXISTS (SELECT 1 FROM pg_constraint k
               WHERE k.conindid = i.indexrelid AND k.contype = 'u') AS es_constraint
FROM pg_index i
JOIN pg_class ic ON ic.oid = i.indexrelid
JOIN pg_class tc ON tc.oid = i.indrelid
JOIN pg_namespace nsp ON nsp.oid = tc.relnamespace
WHERE nsp.nspname = 'public' AND tc.relname = 'Account' AND i.indisunique;
```

`indnkeyatts` dice cuántas columnas tiene la clave, y `pg_get_indexdef(oid, 1, true)`
devuelve el nombre de esa columna. Si el índice pertenece a un constraint hay que
bajar el **CONSTRAINT** (`ALTER TABLE ... DROP CONSTRAINT`); `DROP INDEX` sobre un
índice que backs un constraint da error.

Leccion: una migración que hace `DROP` tiene que **verificar que dropeó
algo**. Si el `DROP` no encuentra su objetivo y el `INSERT` falla después, el error
que ves es el del `INSERT` y parece un problema de datos, no del `DROP`. La 030
aborta si no dropea ningún índice, justo por eso.

Ojo al quitarlo: `resolveAccountId` gana el primer código en orden alfabético. Con
una copia `1101` propia de Angelos, esa gana el prefijo `1101` sobre su
`1101-01 Caja General`, que queda sin uso. No se pierde información (los 65
asientos históricos quedan en la `1101`), pero la empresa pasa a tener dos cuentas
de caja. Es una decisión de contabilidad, no de código.

**Detalle de tipo:** `Account.id` es **`text`** (Prisma `cuid()`, aunque
`companies.id` usa default `gen_random_uuid()`). Al insertar ids a mano,
`gen_random_uuid()::text` con el cast explícito. `"type"` es texto, no enum.

**Bug latente aparte:** `unique_code_tenant` es `UNIQUE (code, tenant_id)`, o sea
por tenant, no por empresa. Como **test 1 y test 2 comparten `TEST1DS`**, no
pueden tener las dos una `1101`. Hoy no choca porque test 2 no tiene cuentas, pero
es el mismo error de diseño que el del `name`: la invariante correcta sería
`(code, company_id)`. No se toca en la 030 (cambiarlo exigiría actualizar también
`prisma/schema.prisma` para no dejar drift).

### Las 8 cuentas sin `company_id`: YA NO EXISTEN (medido 2 Oct 2026)

**Actualizado:** la tabla de abajo era el estado del 30 Sept. Hoy **quedan 0
`Account` sin `company_id`**, y las 8 filas ya no estan. Lo que paso es que la
**030** creo una copia de `1101`/`4101` **por empresa** y borro las
compartidas, que es justo lo que la 039 (borrar las 8 huerfanas) pretendia
hacer. **Por eso la 039 esta corregida pero no se corre: su trabajo ya estaba
hecho.** Se conserva el archivo por si reapareciesen esas 8 filas concretas.

Lo que sigue **NO** ha cambiado y sigue valiendo:

- **`Account.name` no es unico global**, y eso es correcto en multi-empresa
  (todas las empresas tienen una "Caja y Bancos"). Lo unico por empresa es
  `(company_id, code)`. Medido: **0 codigos repetidos dentro de una misma
  empresa**, asi que las copias quedaron una por empresa como debian.
- **Angelos tiene `1101`, `1101-01` y `1101.01` a la vez** (y `4101`, `4101-01`,
  `4101.01`). No choca con ningun indice, pero `resolveAccountId` busca por
  **prefijo**, asi que el prefijo `1101` matchea las tres y gana la alfabetica
  (`1101`), dejando **`1101-01` sin uso**. Si Angelos tiene de verdad una caja o
  tres, hay que decidirlo antes de tocar el codigo: es contabilidad, no un bug.

### Las 8 cuentas sin `company_id` (ESTADO DEL 30 SEPT 2026, ya obsoleto)

Durante años estas 8 se documentaron como "basura legacy, se pueden borrar".
**Eso es falso para 2 de ellas**, y borrarlas rompería el histórico contable:

| Cuenta | Tenant declarado | Asientos | Quién la usa de verdad |
|---|---|---|---|
| `1101` Caja y Bancos | `tenant_001` | **42** | Angelos 27, Empresa 1 12, test 1 3 |
| `4101` Ingresos por Servicios | `tenant_001` | **23** | Angelos 13, Empresa 1 7, test 1 3 |
| `1102` Banco BAC | `tenant_001` | 0 | — |
| `1301` Inventario | `default-tenant` | 0 | — |
| `1501` Activos Fijos | `default-tenant` | 0 | — |
| `5102` Servicios Profesionales | `default-tenant` | 0 | — |
| `5201` Alquiler de Oficina | `default-tenant` | 0 | — |
| `2201` ISV por Pagar | `default-tenant` | 0 | — |

`1101` y `4101` son **una sola fila de cuenta compartida por tres empresas**, con un
`tenantId` (`tenant_001`) que no existe en `Tenant`. Los datos son reales: importes
en HNL no nulos, 42 `Transaction` existentes, rango 2024-01-01 .. 2026-09-30.

Tres consecuencias, todas medibles:

1. Esos 65 asientos son el **64% del libro entero** (101 asientos en total).
2. **`v_transacciones_cierre` no los mostraba** (0 filas). Atribuido durante meses
   a que "la vista une por tenant"; **el diagnóstico era incompleto**. La causa
   inmediata es que la vista unia por `je.accountid`/`je.transactionid`, y esos 65
   asientos los tienen en NULL (solo traen `accountId`/`transactionId`). La 030 los
   reapuntó a las cuentas nuevas, pero **seguían invisibles** hasta la **031**.
   Los saldos de Angelos, Empresa 1 y test 1 salían mal en el cierre.
3. **La migración 028 no los arregla**: 028 solo rellena `tenant_id` cuando el tenant
   camel existe en `Tenant`, y `tenant_001` no existe. Por eso llevan meses ahí.

La reparación correcta es **dividirlas por empresa**, no borrarlas: crear una copia de
`1101` y `4101` por cada empresa que las usa (con su `tenantId` y `company_id`
correctos) y reapuntar cada `JournalEntry` a la copia de su propia `company_id`.
Está escrito en `prisma/migrations/030_dividir_cuentas_compartidas_por_empresa.sql`
(pendiente de aplicar en Supabase SQL Editor; **aborta solo** si los números ya no
son 42/23/3/8). Las 6 cuentas con 0 asientos sí son basura y se pueden borrar cuando
quieras, pero la 030 no las toca.

De paso: los 65 asientos tienen `type` NULL (el signo decide DEBIT/CREDIT). Es la
misma fragilidad que ya suffer `libro_diario_hondura`.

### La 027: el agujero de las vistas era peor que "falta un WHERE"

Medido contra el esquema real, no supuesto:

1. `balance_general`, `libro_mayor`, `balanza_comprobacion`, `estado_resultados` y
   `resumen_contable` hacían `LEFT JOIN "JournalEntry" je ON ...` **sin ningún
   filtro**: el lado `je` no tenía `company_id` ni `tenant_id`, así que **cada
   cuenta sumaba los asientos de todas las empresas**. El parche va
   `AND je.company_id = a.company_id` en el **ON**, no en el `WHERE`: en un LEFT
   JOIN un filtro en el `WHERE` lo convierte en INNER y desaparece las cuentas
   sin movimientos.
2. `declaracion_mensual`, `resumen_isv`, `top_clientes`,
   `flujo_efectivo_mensual` y `vista_resumen_cuentas` hacían
   `GROUP BY "tenantId"`. Como **test 1 y test 2 comparten el tenant `TEST1DS`**,
   esa agrupación no separa empresas: **las suma**. El `GROUP BY` va por
   `company_id`.
3. `JournalEntry` tiene **tres** convenciones de columna
   (`accountId`/`account_id`/`accountid`, y lo mismo para transacción). Las
   vistas solo miraban dos.

**Un filtro estricto borra filas con `company_id` NULL en silencio**, así que se
comprobó antes con conteo exacto: `JournalEntry`, `Transaction`, `Invoice`,
`InvoicePayment`, `Purchase`, `Supplier`, `product` y `warehouse` tienen **0
NULLs**. Los únicos NULLs son las 8 `Account` huérfanas, que aparecerán con saldo
0: preferible a que arrastren asientos ajenos.

**CUIDADO: `accountid` nunca es la única columna poblada, pero SÍ puede estar en
NULL donde está `accountId`.** Se comprobó que 101/101 filas traen `accountId` y
de ahí se concluyó que "el `ON` con dos columnas ya basta". **Esa conclusión es
falsa y costó un bug entero:** medido el 30 Sept 2026, solo **36/101** filas
tienen `accountid`/`account_id` pobladas; las otras **65** las tienen en NULL y el
dato solo existe en `accountId`. Lo mismo con `transactionid` (36/101). Como
`v_transacciones_cierre` (027f) unía por `je.accountid`/`je.transactionid`, esos
65 asientos **no entraban por la rama 1** y sus transacciones se colaban por la
rama 2 como `PENDIENTE` con el total entero (duplicando importe): la vista
devolvía **98 filas, 49 de ellas `PENDIENTE`, y 0 con `cuenta_codigo`**.

La regla correcta: **la columna canónica es la camelCase** (`accountId`,
`transactionId`), que es la que escribe la app; las snake son respaldo. Toda
vista/función que lea `JournalEntry` tiene que hacer
`COALESCE(je."accountId", je.accountid, je.account_id)` (camel primero), y el
`ON` de transacción `COALESCE(je."transactionId", je.transactionid) = t.id`. La
**031** reescribe `v_transacciones_cierre` así. Y el `NOT EXISTS` de la rama 2
tiene que usar la misma resolución: si usa snake mientras la rama 1 usa camel,
la transacción sale **dos veces** (una con cuenta, otra PENDIENTE).

- **`CREATE OR REPLACE VIEW` solo permite añadir columnas AL FINAL.** Si insertas
  `company_id` en medio, aborta con *"cannot change name of view column"*. Pasó
  en dos vistas durante la redacción y se corrigió.
- **Cuidado con las mayúsculas en los nombres de vista: `InvoiceSummary` hay que
  comillarla.** Sin comillas, Postgres pliega el identificador a minúsculas y
  apunta a `invoicesummary`, que **no es la misma vista**. Y no falla con "no such
  view" si la minúscula ya existe de un intento anterior: crea una copia nueva y
  deja la real sin `company_id`, así que el error sale al final y lejos de la
  causa. La 027 lleva un preflight (bloque 0b) que valida los 25 nombres
  **exactos** con `to_regclass(format('public.%I', v))` antes de tocar nada, y
  borra la duplicada en minúsculas. Es la 027 de las 25; las demás son
  minúsculas y no necesitan comillas.
- **`to_regclass('public.NombreConMayusculas')` devuelve NULL aunque el objeto
  exista.** Es la misma trampa, pero en la forma más difícil de ver porque **no
  falla: devuelve `NULL` y parece que el objeto no está**. El argumento es un
  `text` que Postgres **parsea como identificador**, así que sin comillas dentro
  pliega a minúsculas: `to_regclass('public.User_pkey')` busca `user_pkey` y
  devuelve NULL. Correcto: `to_regclass('public."User_pkey"')`, o mejor
  `to_regclass(format('public.%I', v))` como hace el preflight de la 027.
  Pasó de verdad: dio "índice ausente" para un índice que sí estaba, y casi se dio
  por roto el unique de Prisma que es el que sostiene la invariante de usuarios.
  **Cuando dudes de si un objeto existe, contrástalo con un `JOIN` a
  `pg_class`/`pg_index` por `relname` exacto**, que no sufre el plegado.
- **Ojo al contar filas por PostgREST.** Con resultado vacío el `content-range`
  viene con dos asteriscos, no `0-0/0`. `split('/')[1]` da `NaN`, y un `NaN` es
  falsy: una consulta **con** datos parece vacía. Durante la verificación de la
  027 esto hizo creer que el filtro de `libro_ventas` estaba roto, cuando
  devolvía las 3 filas correctas. Mira el status y el cuerpo, no solo el header.
- **Lo que la 027 NO arregla** (no es que se olvidara):
  - Las 4 vistas wrapper eran `SELECT * FROM una_funcion()`. Aislar la vista no
    aislaba la función. **Resuelto por la 027c**, ver más abajo.
  - `vista_resumen_produccion` lee `itr_produccion`, que **no tiene `company_id`
    ni ninguna columna de tenant**. No hay de dónde deducir la empresa.
  - `CustomersComplete`, `CustomersWithFiles`, `CustomersWithRetentions` y
    `PackageDetails` necesitan `company_id` en `Customer`, `CustomerFiles`,
    `Packages` y `PackageProducts` — confirmado que **no lo tienen**. También
    `payroll_details` y `legal_revisiones_historial` para las vistas de
    payroll/legal. Todo eso es la **028**.
- **CUIDADO con el `/100` de `libro_diario_honduras`: NO lo cambies, pero tampoco
  es un bug simple.** Me equivoqué dos veces aquí y el caso real es peor:
  1. **Lo primero afirmé** sin medir que salía 100× bajo porque los importes ya
     están en lempiras.
  2. **Medí** y vi que 93% de los 101 `JournalEntry.amount` son múltiplos de 100
     (517500, 1150000, 241500, 95000) y concluí que estaban en centavos. **Ese
     razonamiento es inválido:** los importes redondos en lempiras (500000, 95000)
     también son múltiplos de 100. No prueba nada.
  3. **La fuente de verdad es el código que escribe**, y ahí está el problema real:
     hay **dos escritores con unidades distintas**:
     - `app/api/accounting/withholding-journal/route.ts:169` hace
       `round2(item.retencion / 100)` y escribe **en lempiras** (normalizado
       explícitamente para "no duplicar 100× en libros y balanza").
     - `lib/services/automated-tax.ts` escribe **en centavos**
       (`amount: number; // in cents`, `taxAmountCents = Math.round(x * 100)`,
       `amount: totalCents`).
  4. O sea que **`JournalEntry.amount` tiene unidades mezcladas según qué flujo
     creó la fila**, y por eso hay 7 filas que no son múltiplo de 100 entre 101.
     El `/100` de la vista es correcto para unas filas y está mal para otras.
  - **Conclusión operativa: no se toca el `/100` hasta normalizar la unidad de
    `JournalEntry.amount`**, y eso no es una migración de aislamiento sino una
    decisión de datos que necesita el usuario. Nadie sabe qué filas son de qué
    flujo sin una columna de origen.
  - Otros `/100` y `* 100` **sin auditar**, todos sospechosos por lo mismo:
    `app/components/TrialBalance.tsx:44`, `app/components/BankRec.tsx:157`,
    `app/components/MultiCurrencyTransactionForm.tsx:136`, `lib/utils.ts:12`,
    `components/ui/currency-input.tsx:14`, `lib/services/excel.ts:156`,
    `app/companies/[id]/accounting/financial-statements/balance-comprobacion/page.tsx:115-119`,
    `app/api/billing/invoices/route.ts` (pendiente en CLAUDE.md:206).
- **Bug real y frágil en `libro_diario_honduras`:** decide debe/haber por el
  **signo** de `amount` en vez de por la columna `type`. Hoy coincide en las 101
  filas (ningún DEBIT negativo, ningún CREDIT positivo), pero en cuanto aparezca
  un DEBIT negativo lo reporta como haber.
- **La 027 dejó 4 vistas en cero y hay que repararlo (pendiente abierto).** De las
  25, **9 devuelven 0 filas**, y no todas por la misma razón:
  - **5 ya estaban vacías** por falta de datos base, no por la 027:
    `libro_compras` y `cuentas_por_pagar` (hay **0** facturas `EXPENSE`),
    `cuentas_por_cobrar` (las 3 facturas de Angelos están `PAID`, y la vista solo
    mira `ACTIVE/PENDING/SENT`), y probablemente `purchase_book_sar` y
    `accounts_payable_pending` (solo hay **1** `Purchase`).
  - **4 las vació el filtro de empresa de la 027**: `libro_diario_honduras`,
    `vista_estado_resultados_detallado`, `vista_resumen_estado_resultados`,
    `vista_comparativo_mensual`. Las cuatro cruzan
    `Transaction ⋈ JournalEntry ⋈ Account`.
  - **Causa raíz medida: 95 de 101 `JournalEntry` tienen `company_id` distinto al
    de su propia `Transaction`** (solo 6 coinciden, y de esos 6 ninguno sobrevive
    porque su `Account` es de otra empresa, dejando 0). Reparto de los 95:
    27 apuntando a Empresa 1 y 68 a Angelos. Las columnas de tenant **sí**
    coinciden entre asiento y transacción (`tenantId=1` con `1`, y
    `ANGELOH7` con `ANGELOH7`), o sea que el `company_id` se atribuyó mal, no el
    tenant. Las FK están sanas: 0 asientos apuntan a una cuenta inexistente.
  - **El filtro de la 027 no está mal:** esas 95 filas eran exactamente la fuga
    entre empresas que había que quitar. Lo que está mal es el dato de origen.
  - **Reparación correcta (`027b_reparar_company_id_transaction_supplier.sql`,
    APLICADA y verificada):** al revés de lo que primero se propuso.
    **`Transaction` es la que estaba rota, no `JournalEntry`.** Fiabilidad medida
    de `company_id` frente al tenant propio de cada fila:

    | Tabla | Resultado |
    |---|---|
    | `JournalEntry` | **CONFIABLE 101/101** |
    | `Invoice` | CONFIABLE 3/3 |
    | `Purchase` | CONFIABLE 2/2 |
    | `Account` | CONFIABLE 35/35 (+8 NULL legacy) |
    | **`Transaction`** | **NO CONFIABLE 4/50** |
    | **`Supplier`** | **NO CONFIABLE 0/3** |

    **46 de 50 transacciones tienen `company_id` de Clinica Dental Diamond**
    (`cVcLafoZitJmBOdSxNOlPgb0m`) mientras la fila dice tenant `1` o `ANGELOH7`:
    se atribuyeron casi todas al mismo lado. Y `Supplier.company_id` guarda
    `"ANGELOH7"`, que es el **código de tenant**, no el `companies.id`: la
    convención mixta que la 023 normalizó en otras tablas y se le pasó aquí.
  - **NO hagas `UPDATE "JournalEntry" SET company_id = t.company_id`:** propagaría
    el dato roto de `Transaction` a los 101 asientos y **destruiría la única
    atribución coherente** que existe. La dirección buena es la inversa:
    `Transaction` toma la empresa de sus asientos.
  - **La reparación es determinista, no heurística**, porque se comprobó que los
    asientos de una transacción **no se reparten entre empresas**: 47 de 50
    transacciones tienen todos sus asientos en una sola empresa, **0** tienen
    varios. Las 3 sin asientos caen al tenant, y ninguna está en `TEST1DS` (el
    único tenant con 2 empresas), así que la ambigüedad real es 0. Resultado
    simulado: `Angelos=32, Empresa 1=14, test 1=3, Clinica=1`, con 46 de 50 filas
    cambiando y **50/50 coherentes al final**. La 027b aborta si aparece
    ambigüedad, en vez de elegir una.
  - **Por eso el orden fue 027b y luego 027c, y no al reves.** Ponerles
    `AND t.company_id = p_company_id` a las funciones con la `Transaction` rota
    habría hecho que Clinica viera 42 de las 45 transacciones INGRESO/EGRESO (que
    son de Empresa 1 y Angelos) y que Angelos y Empresa 1 vieran **0**. Una fuga
    **peor** que la que había, y que además habría **parecido correcta** porque el
    filtro estaría presente. Con `Transaction` ya reparada, la 027c sí aísla.
  - **Las 4 vistas YA VOLVIERON** de 0 filas a 3+ cada una, con `company_id`
    presente, en cuanto se aplicó la 027b. Verificado después de aplicarla:
    `libro_diario_honduras` 3, `vista_estado_resultados_detallado` 3,
    `vista_resumen_estado_resultados` 3, `vista_comparativo_mensual` 3. Estado
    final de `Transaction`: **49 coherentes, 0 incoherentes, 1 sin tenant**;
    reparto `Angelos=32, Empresa 1=14, test 1=3, Clinica=1`. `Supplier`: **3/3
    coherentes**. `verificar-aislamiento.mjs` y `verificar-vistas.mjs` dan
    `TODO OK`. **`verificar-contexto.mjs` NO da `TODO OK` y no debe decirse que
    sí**: sigue reportando las 51 tablas sin `company_id` y a Empresa 1 sin
    membresía. Son pendientes conocidos, no fallos de la 027b.
  - **`Supplier` tiene datos que se contradicen y la 027b NO los resuelve:**
    - `Disnorte` y `TecnoGlobal` tenían `tenant_id="1"` pero `company_id="TEST1DS"`.
      La 027b siguió el `tenant_id` de la fila y los dejó en **Empresa 1**,
      avisando por `NOTICE`. **Eso está pendiente de que el usuario lo confirme.**
    - `DICOSA` dice ser de Angelos (`tenant_id="ANGELOH7"`) pero sus **2 `Purchase`
      son de Empresa 1**. La 027b lo dejo así a proposito: `Purchase.company_id` es
      confiable y el que miente es el `tenant_id` del proveedor.
      **YA NO ESTá PENDIENTE DE DECISIÓN:** la **040** (ver abajo) sincroniza
      `tenant_id` con el tenant de la empresa que la fila ya declara. No se mueve la
      empresa: sus 2 compras siguen en Empresa 1, que es lo correcto.
  - **`Transaction.tenantId` tiene un NULL real** en una fila (`051e950a`, INGRESO
    #1, descripción `px`, 0 asientos, `totalAmount` 500000). **Corrección: no es
    la cadena `"null"`, es SQL NULL.** Lo dije mal antes por un fallo de mi propio
    script de sondeo, que interpolaría un NULL en una plantilla y lo stringifyaba a
    `"null"`; al medir filtrando en cliente, **0 de 50 filas** tienen esa cadena.
    Consecuencia práctica: `tenantId` es NULL de verdad, así que
    `IS DISTINCT FROM`, `IS NULL` y los `COALESCE` funcionan bien y **no hay que
    defenderse de la cadena**. Esa fila se atribuyó a Clinica por el
    `company_id` que le había dejado el backfill roto, **no** por su `tenant_id`
    snake, porque la 027b sí la saltó (`tenantId IS NULL`). No hay ningún dato de
    empresa en esa fila; ver la 027b2.
  - **`Transaction` tiene tres juegos de columnas duplicadas que se contradicen**
    entre sí, y hay que saber cuál manda: `tenantId="1"` frente a
    `tenant_id="cVcLafoZitJmBOdSxNOlPgb0m"` frente a `tenantid=""`; y
    `totalAmount=517500` frente a `total_amount=0` frente a `totalamount=null`.
    Para el tenant se usó **`"tenantId"`** (camelCase), que es la que coincide con
    `JournalEntry` — con la salvedad del NULL de arriba. Los montos
    duplicados **quedan fuera**: son otro problema y no se mezclaron aquí.

- **`Transaction.tenant_id` (snake) es basura, y es un agujero de aislamiento.**
    Medido sobre las 50 filas:

    | Columna | Distribución |
    |---|---|
    | `"tenantId"` | 32 `ANGELOH7` · 14 `1` · 3 `TEST1DS` · 1 NULL — **la buena** |
    | `"tenant_id"` | **47 `cVcLafoZitJmBOdSxNOlPgb0m`** · 3 NULL — basura |
    | `"tenantid"` | 50 vacías — columna muerta |

    Las **46 filas que tienen ambas columnas pobladas difieren en 46**: la misma
    constante (el tenant de Clinica Dental Diamond) en casi todas, sin importar la
    empresa real. Filtrar por `tenant_id = 'cVcLafoZitJmBOdSxNOlPgb0m'` devuelve
    **47 transacciones de 4 empresas distintas**. `Transaction` es la **única**
    tabla del esquema con las dos convenciones a la vez y discrepantes (las demás
    no tienen ambas columnas).
  - **Hoy no hay fuga viva, por suerte y por accidente.** Las únicas dos rutas que
    filtran `Transaction` por la columna snake son el `alt` de
    `app/api/accounting/ingresos/route.ts:61` y el de
    `app/api/accounting/egresos/route.ts:58`, y las dos filtran además por
    `voucher_type = 'INGRESO'/'EGRESO'`. **`"voucher_type"` vale `"FACTURA"` en las
    50 filas**, así que ese filtro no matchea nada y ambas consultas devuelven
    **0**. Son código muerto. Las otras ~20 rutas que tocan `Transaction` usan
    `"tenantId"` y `.eq('tenantType')` correctamente.
  - **Es una mina armada:** en cuanto alguien "arregle" el filtro de
    `voucher_type` sin tocar el `tenant_id` de al lado, esas dos rutas filtrarán 47
    filas de 4 empresas. La 027b2 lo cierra a nivel de datos.
  - **Los tres juegos de montos también mienten**, y por el mismo motivo: el mismo
    valor en columnas duplicadas y valores inventados (`0`, `null`) en las demás.
  - **`voucher_number` y `voucher_type` también son basura, y hay un índice único
    construido sobre ellas.** `voucher_number` difiere de `voucherNumber` en
    **49 de 50 filas** (las 3 de test 1 tienen `1, 1, 1` mientras su
    `voucherNumber` real es `127, 128, 129`), y `voucher_type` vale `"FACTURA"`
    en las 50 mientras `voucherType` es INGRESO/EGRESO/DIARIO. El índice
    `unique_voucher_tenant` es sobre `(voucher_type, voucher_number, tenant_id)`,
    o sea **protege el juego de columnas que la app no usa**:
    `app/api/accounting/transaction-import/route.ts` lee y escribe
    `voucherType`/`voucherNumber`. Que hoy no rompa es casualidad, no diseño.

- **La 023 dejó TRIGGERS que impiden dejar `company_id` en NULL.** En
  `Account`, `Transaction`, `JournalEntry` y `File` hay **dos** triggers
  `before insert or update` **sin columna especifica** (o sea, en *cualquier*
  `UPDATE`), `trg_set_company_id` y `trg_set_company_id_camel`:
  ```sql
  if new.company_id is null and new.tenant_id is not null then
    new.company_id := public.oldest_company_of_tenant(new.tenant_id);
  end if;
  ```

### Compras/Proveedores: el modulo entero iba clavado en el tenant '1' (2 Oct 2026)

`lib/purchase-db.ts` exportaba `TENANT_ID = '1'` y lo aplicaba a **todas** sus
consultas, asi que las 8 rutas de `/api/purchases` y `/api/suppliers` operaban
siempre sobre el tenant '1'. No era un `tenant_id` suelto: era el modulo entero.

**Regla que sale de ahi:** en este modulo la empresa **nunca** viene de un parametro
ni del cuerpo. Siempre del contexto, y con empresa real:

```ts
const empresa = exigirEmpresa(await contextoDeEmpresa(request));
```

`exigirEmpresa` existe por una razon concreta: `contextoDeEmpresa` devuelve
`companyId: string | null` porque, cuando no puede resolver la empresa, se degrada
a tenant suelto. **Eso es precisamente la fuga original**, asi que Compras y
Proveedores responden **400** en vez de caer a un filtro por tenant. Sin esa distincion,
volveriamos a tener test 1 viendo lo de test 2.

Tres cosas mas que salieron de ahi y aplican a todo lo demas:

- **`company_id` gana y `tenant_id` pierde** cuando se contradicen. No es
  una preferencia: `Purchase`, `Invoice`, `Account` y `JournalEntry`
  son confiables (027b/027b2 los repararon), y el `tenant_id` es lo que quedo viejo.
- **Validar el objeto contra la empresa ANTES de escribir**, y devolver **404** en vez
  de 403 cuando es de otra. Con solo `.eq('company_id')` en el UPDATE, un id ajeno
  no encuentra fila: 0 afectadas, sin error, y el cliente ve un exito silencioso.
- **Resolver cuentas por `company_id`, no por `tenant_id`, y con `.limit(1)`
  en vez de `.single()`.** Test 1 y test 2 comparten `TEST1DS`, asi que
  `.eq('code','1101').eq('tenant_id','TEST1DS')` devuelve dos filas y `.single()`
  revienta con `PGRST116`: el documento se guardaba y el asiento no, en silencio.

**Migracion 040 — APLICADA Y VERIFICADA** (2 Oct 2026,
`prisma/migrations/040_compras_proveedores_tenant_coherente.sql`): sincroniza
`tenant_id` con el de la empresa que la fila ya declara, en `Purchase`,
`PurchaseItem`, `Supplier`, `SupplierPayment` y `supplier_price_history`.
**No reasigna empresas y no toca ningun `company_id`.** Filas con
`company_id` NULL se dejan: no hay empresa de la que deducir el tenant, y
rellenarlo seria inventar.

Medido antes de escribirla: todas las filas del tenant '1' (2 `Purchase`, 2
`Supplier`, 3 `PurchaseItem`, 6 `product`, 1 `warehouse`, 22
`Account`, 1 `Customer`) **ya tienen el `company_id` correcto**. Los
datos no estaban mal atribuidos: la 040 normaliza el `tenant_id` viejo, no repara
empresas. El caso que la dispara es DICOSA, cuyo `tenant_id` era `ANGELOH7`
cuando su `company_id` ya era Empresa 1.

**Cuidado al inventar cifras de "cuantas cuentas hay".** El mismo `Account`
llevo a dos recuentos incompatibles en la doc segun el dia, y ambos fueron
ciertos: 35 legitimas + 8 huerfanas (30 Sept) y 43 con 0 huerfanas (2 Oct).
El reparto por empresa lo explica sin contradiccion: las 8 huerfanas eran las
compartidas de las 3 empresas, y la 030 las borro al crear **una copia por
empresa** (test 1 quedo con 2, `1101`+`4101`; Empresa 1 con 22; Angelos con 19
y codigos propios con sufijo como `1101-01`). O sea que el total no cambio: lo
que cambio fue **el reparto**, no la cantidad. Si vuelves a contar, cuenta **por
empresa**, que un total agregado aqui no significa nada.

**Verificada desde fuera**, no por el "Success" del SQL Editor: 0 filas
incoherentes en las 5 tablas, DICOSA con `tenant_id='1'` y `company_id` de
Empresa 1, y Empresa 1 conservando `2 Purchase` y **`3 Supplier`**. Ojo con ese
3: son los 2 de `tenant_id='1'` **mas DICOSA**, que ya era de Empresa 1 por
`company_id`. **El mismo dato da 2 o 3 segun la columna que cuentes**, y los
dos numeros son correctos; por `company_id` son 3 (`DICOSA`, `Disnorte`,
`TecnoGlobal`, que cuadra con el `Supplier 3/3 coherentes` de la 027b2). Si al
releer estos numeros parecen contradecirse, la pregunta que lo resuelve es que
columna se esta contando.

**Corrio sin error, y su post-check ABORTA si queda incoherencia resoluble**, asi
que 0 filas quedaron mal. Eso es una garantia fuerte pero no equivalente a haber
medido el `UPDATE`: el post-check mide "no queda incoherencia", no "se
actualizaron las que habia".

Para lo que viene: una migracion que normaliza `tenant_id` desde `company_id`
**solo es correcta si `company_id` es el campo confiable**. Si alguna vez la
tabla cambia de genero y es el `tenant_id` el confiable, la direccion se
invierte.

Y ojo con un fallback que parecia una red de seguridad y era una fuga: `fetchVentas`
en `lib/services/diat-generator.ts` filtraba `libro_ventas` con un UUID contra
una columna de codigo (0 filas) y su "respaldo" **consultaba la vista entera sin filtro
de empresa**. Si un filtro por empresa falla, **fallar en cerrado**: una consulta global
como red de seguridad convierte un error de 0 filas en una fuga de todos los datos.
  Por eso un `UPDATE ... SET company_id = NULL` **a secas no funciona**: el
  trigger ve el `tenant_id` viejo todavía puesto y devuelve la empresa en la
  misma sentencia. **Hay que limpiar las dos columnas en el mismo `UPDATE`**:
  ```sql
  UPDATE "Transaction" SET "company_id" = NULL, "tenant_id" = NULL WHERE id = ...;
  ```
  `Supplier` **no** tiene trigger, así que ahí sí se puede dejar en NULL.
  Y ojo: `NOT EXISTS` y `NOT IN` con un NULL de por medio no hacen lo que uno
  espera (`NOT IN (NULL, 'x')` nunca es verdadero); usa `IS NOT DISTINCT FROM`
  o `IS NULL`.
- **Un `UNIQUE` con columnas NULL no da conflicto, y eso esconde duplicados.**
  Las 3 transacciones de test 1 comparten `(FACTURA, 1)` y solo no violan
  `unique_voucher_tenant` porque las tres tienen `tenant_id` NULL. En cuanto se
  les puso el tenant, la segunda chocó con la primera. Al reparar una columna que
  participa en un índice único, calcula antes los duplicados que vas a crear
  (`GROUP BY tenant, voucher_type, voucher_number HAVING count(*) > 1`).
- **Para RELLENAR una columna que puede ser NULL, `<>` no sirve como guard: usa
  `IS DISTINCT FROM`.** La 028 queria rellenar `Account.tenant_id` cuando la camel
  estaba puesta, y llevaba `AND a."tenantId" <> a.tenant_id`. Como `tenant_id IS
  NULL`, `texto <> NULL` da **NULL**, no `TRUE`, y el `WHERE` descartaba todas las
  filas: el `UPDATE` afectaba **0 filas** y el SQL Editor decia **"Success. No rows
  returned"** (un UPDATE de 0 filas no es error). Se detecto porque 35 cuentas
  seguian con `tenant_id` NULL y su tenant existia en `Tenant`. Corregido a
  `IS DISTINCT FROM` y con un post-check que **aborta** si queda algo rellenable.
  Regla: una migracion de solo-`UPDATE` **necesita** un post-check que mida el
  resultado; sin él no distingue "ya estaba bien" de "no hizo nada".
- **Estados: 027b2 APLICADA** (30 Sept 2026). Resolvió los casos en disputa con
  la evidencia que había, no con suposiciones:
  - **`Distrubidora Comercial SA`** (nombre mal escrito en la BD, es "DICOSA",
    id `693af3cd-ef07-457e-b001-a274417bc110`) ︎ **Empresa 1**, por sus **2 `Purchase`**, que es el campo
    que ya había salido confiable. Descartó `Supplier.tenant_id` (`ANGELOH7`) y
    el email `@dentaldiamondhn.com`, que no es evidencia de pertenencia.
    `Disnorte` y `TecnoGlobal` quedan en Empresa 1 sin cambios: no tienen
    evidencia en contra (0 compras, 0 referencias), pero tampoco a favor.
  - **`051e950a` â†’ sin empresa** (`company_id` y `tenant_id` en NULL). No tiene
    ningún dato de empresa, y su `company_id` venía del backfill roto.
  - **`Transaction.tenant_id` sincronizado con `tenantId`** en 46 filas. Estado
    final: `tenantId` = 32 `ANGELOH7` Â· 14 `1` Â· 3 `TEST1DS` Â· 1 NULL;
    `tenant_id` = 32 Â· 14 Â· **4 NULL**; `tenantid` = 50 NULL (columna muerta).
    Las 3 de test 1 quedaron con `tenant_id` NULL a propósito, para no violar
    `unique_voucher_tenant`. **Consecuencia: filtrar `Transaction` por
    `tenant_id` devuelve 0 filas para test 1** (cierra en falso, no fuga) y
    ya **no** devuelve transacciones de otras empresas: medido, las 8 empresas
    dan 0 filas salvo Angelos (32) y Empresa 1 (14), todas propias.
  - Reparto final: `Angelos=32, Empresa 1=14, test 1=3, sin empresa=1`.
  - `verificar-aislamiento.mjs` y `verificar-vistas.mjs` dan `TODO OK` después
    de aplicarla.
  - **Ojo al re-aplicar:** existe un archivo viejo `027b2_sincronizar_tenant_id.sql`
    que se borró. Si vuelve a aparecer un `duplicate key` en
    `unique_voucher_tenant`, estás corriendo la versión sin el `NOT EXISTS`, no
    esta.

- **ESTADO: 027c APLICADA Y VERIFICADA** (30 Sept 2026).
  `027c_funciones_contables_aisladas.sql`. Verificada **desde fuera**, no por el
  "Success" del SQL Editor: las 4 vistas wrapper dan 404 (fueron borradas de
  verdad) y las 7 funciones de lectura se llamaron por RPC con las 5 empresas.
  Resultado: **0 fugas**. Cada empresa recibe solo filas con su `company_id`:
  Angelos 13/15/15/6/14/13 y Empresa 1 8/20/20/7/5/9 en
  diario/mayor/balanza/resumen/egresos/ingresos — números distintos, o sea que no
  están devolviendo "todo". `p_tenant_id` contradictorio (empresa de test 1 +
  tenant ajeno) da **0 filas** en todos los casos: el tenant estrecha, nunca
  amplía. Sin `p_company_id` no es invocable (`PGRST202`), porque el parámetro no
  tiene `DEFAULT`.
  Detalle que casi se da por bueno y no lo es: **un check de fuga que solo mire
  `fila.company_id` da "ok" en falso si la función no devuelve esa columna.** Las 6
  que devuelven filas la traen; las que dan 0 filas no tienen nada que comparar.
  Siempre comprueba que la columna exista antes de concluir que no hay fuga.
  Lo restante: aislar el consumidor (`integrated-books/route.ts` ya exige empresa
  validada) y las ~42 rutas que aún filtran solo por `tenant_id`.
- **ESTADO: 027d APLICADA Y DESHECHA** (`027d_indice_user_email_tenant.sql`).
  Se aplico, se confirmo que el indice existia y era unico, y luego se borro con
  `DROP INDEX IF EXISTS idx_user_email_tenant;`. **No la corras**: el archivo
  lleva la anulacion en su cabecera. El motivo esta en `CLAUDE.md`: el unique ya
  existia (`User_tenantId_email_unique`), asi que el indice era redundante.
  Aisló las **8** funciones contables, que eran el agujero que quedaba tras la 027.
  Medido con `pg_get_functiondef`, no supuesto:

  | Función | SD | Filtra empresa | `/100` |
  |---|---|---|---|
  | `get_libro_diario_integrado` | sí | NO | sí |
  | `get_libro_mayor_integrado` | sí | NO | sí |
  | `get_balance_comprobacion_integrado` | sí | NO | sí |
  | `get_resumen_ingresos_egresos` | sí | NO | sí |
  | `get_egresos_with_entries` | sí | NO | no |
  | `get_ingresos_with_entries` | no | NO | no |
  | `get_accounts_with_opening_balances` | no | NO | no |
  | `update_opening_balances` | no | NO | no |

  **5 de 8 son `SECURITY DEFINER` y 4 de 8 dividen entre `100`** (no 2 y 2: eso
  era el conteo de las 4 originales). Reglas de la 027c:
  - `p_company_id text` **obligatorio y sin `DEFAULT`**: sin él la función no se
    puede ni invocar. Se `DROP`ea y se recrea cada función; con
    `CREATE OR REPLACE` cambiar la firma no reemplaza nada, **crea un overload**
    y deja la vieja filtrando. Por eso van los tipos exactos en el `DROP`.
  - Las 4 vistas wrapper se **borran**. `relkind = view` confirmado con `pg_class`
    (`docs/SEGURIDAD_CONTROL_REPORT.md:352`), así que `DROP VIEW` aplica. Tenían 0
    consumidores en `app/`. La V4 ya había revocado anon/authenticated en **3 de
    las 4** (`libro_ingresos` se quedó fuera); ese REVOKE solo cerraba PostgREST,
    no el `service_role` con el que corre la app.
  - **`update_opening_balances` era un agujero de escritura**: `UPDATE` sin
    empresa, `p_tenant_id` del cliente, y `EXECUTE` para `PUBLIC` por defecto, o
    sea que la anon key la podía llamar. Ahora exige empresa, valida que exista y
    solo `service_role` la ejecuta.
  - Se quita `SECURITY DEFINER`: no lo necesita para leer, y con el RLS
    desactivado solo añade superficie.
  - **`get_libro_mayor_integrado` y `get_balance_comprobacion_integrado` tenían el
    filtro de fecha en el `WHERE` sobre un `LEFT JOIN`**, lo que lo convierte en
    INNER y borra las cuentas sin movimientos. El parche que tenían
    (`OR t."tenantId" IS NULL`) no lo arreglaba: dejaba pasar asientos de una
    cuenta cuya transacción es de otra empresa. Los filtros van al `ON`.
  - `REVOKE ... FROM PUBLIC` en las 8. Exigir `p_company_id` impide el "dame
    todo", pero **no** impide `?p_company_id=<la que sea>`: la función no sabe si
    el que llama tiene esa empresa. Solo la ruta lo sabe, y usa service role.
  - **Los SQL del repo NO son fuente de verdad para los tipos.** Medido al
    aplicar la 027c: `supabase/FULL_SETUP.sql:1102` declara
    `chart_of_accounts.id TEXT`, pero en la base viva es **`uuid`** y la función
    revienta con `Returned type uuid does not match expected type text in column
    1`. Por eso `get_accounts_with_opening_balances` devuelve **`RETURNS SETOF
    chart_of_accounts`** y no una lista de 12 columnas: la forma de la fila es la
    de la tabla y no puede desincronizarse. Es seguro porque nada depende de esa
    función (el `DROP` fue bien) y no tiene consumidor en `app/`. Si el esquema
    cambia, el tipo se actualiza solo.
  - **`WHEN OTHERS` que reporta éxito sin mirar el mensaje es un falso verde.**
    El bloque 6b comprueba que las funciones **fallen** sin `p_company_id`, pero
    se traga cualquier error y dice "falla en cerrado". Una función rota de
    verdad habría pasado la verificación. Ahora distingue el error legítimo
    (`function ... does not exist`) de cualquier otro, y revienta si es otro.
- **El consumidor era el agujero, no solo la DB.** `integrated-books/route.ts`
  sacaba el tenant de `x-tenant-id` **o de `?tenantId`** sin validar nada, así que
  `?tenantId=ANGELOH7` bastaba para leer el libro de otra empresa. Ahora usa
  `contextoDeEmpresa` y **400 si no puede determinar empresa** (no fallback), y
  manda `p_company_id`. Los dos clientes pasaron a mandar `?companyId`:
  `AccountingBooks.tsx` lo saca del `[id]` de la ruta, `IntegratedBooksViewer`
  de `useWorkspace().empresa.id`. Este último tenía `currentTenant?.id || '1'`,
  un fallback fijo a la empresa 1 que además no es un `companies.id`.
  **No se puede deducir la empresa en servidor desde el tenant**: `TEST1DS` tiene
  dos, y elegir una es adivinar.
- **La vista no es la frontera.** Con `SUPABASE_SERVICE_ROLE_KEY` el RLS no
  aplica, ni con `security_invoker`. Las vistas exponen `company_id` para que la
  ruta **pueda** filtrar, pero **mientras la ruta no ponga
  `.eq('company_id', empresa.companyId)` el reporte sigue mostrando todas las
  empresas**. Verificado que las 25 exponen la columna, pero eso no filtra nada
  por sí solo. **Este es el siguiente pendiente real**, junto con las 42 rutas
  que aún filtran por `tenant_id`.
- **Lo que la 027 no pudo demostrar con datos:** hoy **solo Angelos tiene
  facturas** (3). Las otras 7 empresas no tienen ni una, así que no hay dos
  empresas con datos simultáneos contra las que probar una fuga real. La
  corrección del `GROUP BY` y del `JOIN` está comprobada leyendo la definición
  resultante, no con un caso de fuga observado. Cuando se carguen datos de una
  segunda empresa, `verificar-vistas.mjs` es el que lo demuestra.
- **8 filas con `company_id` NULL en `balance_general` y `libro_mayor`:** son las
  8 `Account` huérfanas de `tenant_001` y `default-tenant`. Salen con saldo 0 en
  vez de arrastrar asientos de otras empresas, que es lo correcto, pero siguen
  sin empresa y hay que borrarlas o atribuirlas a mano.
- **`DATABASE_URL` sí está en `.env.local`**, pero el host de BD
  (`db.<ref>.supabase.co` y los `*.pooler.supabase.com`) **no resuelve desde esta
  máquina**: hay un filtro de DNS que solo deja el host de la API. Comprobado con
  `Resolve-DnsName`; `pg` falla con `ENOTFOUND`. Tampoco hay `SUPABASE_ACCESS_TOKEN`,
  ni CLI de supabase con sesión, ni una función `exec_sql` en la BD. **Por eso el
  asistente no puede aplicar DDL: tiene que hacerlo el usuario.** No lo vuelvas a
  intentar con la service key, que solo da acceso a PostgREST.
- **Espera los `RAISE NOTICE`**: la migración reporta al final cuántas filas
  quedaron sin `company_id` y de qué tenants. Son el aviso de que algo no se pudo
  atribuir.
- Escríbelas **idempotentes** (`IF NOT EXISTS`, `DROP ... IF EXISTS`) y con un
  `DO $$` que aborte con el detalle si la migración no se puede aplicar.
- **`add column if not exists` NO cambia el tipo si la columna ya existe.** Se lo
  tragó en silencio y provocó un `operator does not exist: text = uuid` más
  tarde, lejos de la causa. Si el tipo importa, míralo antes (ver OpenAPI abajo).
- **Los tipos de columna son un desastre: no los supongas.** El esquema mezcla
  `text` y `uuid`:
  | Columna | Tipo |
  |---|---|
  | `companies.id` | `text` |
  | `Invoice.id`, `InvoiceItem.id`/`"invoiceId"`, `File.id` | `text` |
  | `product.id` | `uuid` |
  | `company_id` | `text` |
  | `paymentlink.invoice_id` | `uuid` (pero **no** referencia a `Invoice.id`, que es text: por eso `paymentlink` no tiene FKs) |

  `company_id` es `text` porque apunta a `companies.id`, que es text; declararlo
  `uuid` rompe la migración. El vínculo real entre `paymentlink` y la factura es
  **`invoice_number` = `Invoice."invoiceNumber"`**.
- **Mide los tipos con el OpenAPI de PostgREST** antes de escribir DDL:
  `GET {SUPABASE_URL}/rest/v1/` con `Accept: application/openapi+json` y
  `apikey`/`Authorization`. Da el tipo y el nombre exacto de cada columna (sirve
  también para confirmar el casing en `camelCase`).
- En un `DO $$`, **todo identificador dinámico va dentro de `format()`**. Un
  `%1$I` suelto en el cuerpo no se sustituye: Postgres lo lee como SQL y falla con
  `syntax error at or near %`, aunque el `format()` esté unas líneas más arriba.
- **El `INTO` va FUERA del `EXECUTE`, nunca dentro de la cadena.** Es el error que
  tumbó la 040 en su primer intento:
  `0A000: EXECUTE of SELECT ... INTO is not implemented`. `EXECUTE` solo
  implementa `EXECUTE ... INTO` o `EXECUTE CREATE TABLE ... AS`, asi que la forma
  correcta es `EXECUTE format($f$ SELECT count(*) FROM ... $f$, v) INTO v_n;`.
  Corregido, la 040 corrio **sin error el 2 Oct 2026**.
- **Un validador que mira la FORMA no prueba que el SQL corra.** El previo de la
  040 contou bloques `DO` y usos de `%I` y dio "0 problemas" con la migración
  rota: el bug estaba en la tercera línea del cuerpo. Para SQL dinámico, lo que
  se necesita es o la BD real, o un chequeo del contenido de las cadenas, no un
  recuento de estructura.
- **Un validador que se engancha con su propia documentación es un validador
  roto.** El de la 040 dio 7 falsos positivos porque la cabecera mencionaba `$f$`
  en prosa, y eso descolocó el emparejamiento de cadenas. Por eso ignora
  comentarios, literales y dollar-quoting antes de analizar. Si un script de
  verificación empieza a señalar cosas que acabas de escribir en prosa al lado,
  el defecto suele estar en el script.
- Cuidado con las **convenciones de columna mezcladas**: unas tablas tienen
  `tenant_id`, otras `"tenantId"`, otras las dos, y `InvoiceItem` ninguna. Una
  función genérica que use `NEW.tenant_id` revienta en la que solo tiene
  `"tenantId"`. Agrupa por convención real, medida.
- No uses la API REST para cambiar constraints o índices: no puede.

## 6. Verificación

```bash
# Typecheck. El baseline es 481 errores preexistentes (era 483; la revision de
# aislamiento bajo 2 al corregir rutas mal filtradas).
node node_modules/typescript/bin/tsc --noEmit
# Solo suma si el total supera 481, o si toca un archivo que editeste.
```

- No confíes en el typecheck global como prueba de éxito.
- **Toda migración SQL se prueba contra la BD real**, no de palabra.
- Los datos de prueba se borran al terminar, y se comprueba que la BD quedó como
  estaba (`_tmp-*.mjs` son scripts desechables: bórralos al acabar).
- Las rutas API **no se pueden probar por HTTP sin sesión de Clerk**: el
  `middleware.ts` devuelve HTML, no JSON. Para probar lógica, llama a los helpers
  directamente contra Supabase.

## 7. Entorno

- `.env.local` con credenciales de Supabase y Clerk. **`RESEND_API_KEY` y
  `EMAIL_FROM` no están configurados**: el envío de correo responde 503 hasta
  ponerlos.
- Node 24: `node --experimental-strip-types` ejecuta TS, pero **no resuelve el
  alias `@/`**. Para probar un módulo de `lib/`, genera una copia temporal con la
  ruta relativa (como hace `_probe-*`).

## 8. Comandos de migración

```bash
prisma migrate add <name>     # crea el archivo (no lo aplica)
npm run prisma:deploy         # deploy a staging y producción
prisma generate
```
