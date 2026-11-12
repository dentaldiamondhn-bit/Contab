# Rotar la `service_role` — pasos y comprobaciones

Estado al **2 Oct 2026**: el saneado del código ya está hecho (**0 credenciales
en 1258 ficheros**, `npm run verificar:credenciales` en verde). Lo que queda es
esto, y **solo tú puedes hacerlo**: requiere el panel de Supabase.

## Por qué es lo único que queda

Sanear los ficheros **no invalida nada**. La clave que estaba commiteada sigue
viva y conectada (probado hoy: `scripts/check-tables.js` leyó el esquema real de
`User`/`Tenant` sin problema). Mientras esa clave no se rote, cualquiera con
acceso al repo tiene lectura y escritura sobre **toda la base, saltándose el
RLS**, y `scripts/disable-rls.js` además puede desactivar el RLS entero.

## Antes de rotar

Hay **una sola clave real**, no dos. Al decodificar los 33 JWT commitidos se vio
que comparten la misma firma con payloads distintos: `"rose":"service_role"`
(typo) y `"ref":"…esct"` (typo). Todos menos uno son **401 garantizado**. Por
eso rotar **una** clave basta.

## Pasos

1. **Panel de Supabase** → tu proyecto → **API / Keys** (en el panel nuevo se
   llama *API Keys*; en el viejo *Settings → API*).
2. Copia la clave actual. **Anótala tú**, no la pegues aquí ni en el repo.
3. Pulsa **Reset / Regenerate** de la `service_role`. Supabase puede ofrecer
   varias: elige la que mantenga el formato **JWT** (`eyJ…`), que es el que
   espera `@supabase/supabase-js`. Las claves nuevas de formato `sb_secret_…`
   no son JWT y rompen estos scripts.
4. Edita `.env.local` (ignorado por git, **no lo commitees**):

   ```
   SUPABASE_SERVICE_ROLE_KEY=<la nueva>
   ```

   `NEXT_PUBLIC_SUPABASE_URL` no cambia.

5. Si hay **Vercel u otro despliegue**, actualiza allí también la variable de
   entorno. Si no, producción sigue con la clave vieja.
6. Comprueba que la app sigue viva: entra a la aplicación y mira inventario y
   facturación. Si algo falla con 401, casi siempre es que la clave no se
   actualizó en el despliegue.

## Después de rotar

```bash
# La clave nueva funciona y la vieja está muerta:
node scripts/check-tables.js

# Ninguna credencial en el código:
npm run verificar:credenciales
```

Si `check-tables.js` responde con las tablas y columnas, la nueva está bien
puesta. Para confirmar que la vieja **ya no** sirve, puedes probarla sin
escribarla en ningún fichero:

```bash
# Sustituye KEY_VIEJA por la que acabas de rotar. Debe fallar con 401.
curl -s -o /dev/null -w "%{http_code}\n" -H "apikey: KEY_VIEJA" \
  "https://<tu-ref>.supabase.co/rest/v1/Account?select=id&limit=1"
```

Un **401** es lo correcto. Un **200** significa que la clave sigue viva.

## Lo que la rotación NO arregla

La clave queda en el **historial de git**: 6 commits, desde `b858db0` (initial
commit, 20 jul 2026). Se sigue viendo con:

```bash
git log -p -S'eyJ' -- scripts/
```

Si el repositorio es privado y lo seguirá siendo, rotar es suficiente y no hay
que hacer nada más. Si llega a ser **público**, trátalo como filtrado de verdad:
o se purga el historial (rewrite con `git filter-repo`, que **reescribe todos los
hashes** y obliga a coordinar force-push con cualquiera que tenga el repo), o se
acepta el riesgo y la clave ya está invalidada.

Decisión tuya. No hace falta hacerlo hoy.