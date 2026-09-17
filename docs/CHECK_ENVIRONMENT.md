# Variables de Entorno Requeridas para Producción

> **Actualizado:** 16 de Septiembre de 2026
>
> Estado real del proyecto: Next.js **16.3.5** (Turbopack), React 19, Clerk, Supabase (Postgres), Prisma 5.x, `output: 'standalone'`. Build `pnpm build` = `prisma generate && next build` (EXIT=0, "Compiled successfully").

## Variables de Clerk (Obligatorias)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/auth/login
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/auth/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
NEXT_PUBLIC_CLERK_SIGN_OUT_URL=/auth/login
```

## Variables de Supabase (Obligatorias)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ **IMPORTANTE:** En `.env.local` NO existe `SUPABASE_URL`. Las rutas y scripts usan `NEXT_PUBLIC_SUPABASE_URL` (ej. `app/api/companies/route.ts`). Si una variable `SUPABASE_URL` queda definida, se ignora.

## Variables de Base de Datos (Obligatorias)
```bash
DATABASE_URL=postgresql://...
```
Conexión directa a Postgres (Supabase). Ten en cuenta que el host directo `db.<ref>.supabase.co:5432` puede dar `getaddrinfo ENOTFOUND` desde fuera de la red de Supabase; el DDL se aplica vía **SQL Editor de Supabase**, no con conexión directa.

## Variables Opcionales
```bash
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.contabhn.com
```

## Pasos para Configurar en Vercel

1. **Ve al Dashboard de Vercel**
2. **Selecciona tu proyecto** `diamond-link/contab`
3. **Ve a Settings > Environment Variables**
4. **Agrega todas las variables anteriores**

## Verificación

Para verificar si las variables están configuradas correctamente:

1. **En tu terminal local:**
```bash
vercel env ls
```

2. **En el dashboard de Vercel:**
   - Revisa que todas las variables estén presentes
   - Verifica que no haya valores vacíos

## Error Común 500

El error 500 generalmente ocurre cuando:
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` no está configurado
- `CLERK_SECRET_KEY` no está configurado
- Las variables de Supabase son incorrectas
- Se referencia `process.env.SUPABASE_URL` (no existe) en vez de `process.env.NEXT_PUBLIC_SUPABASE_URL`

### Fix reciente en `app/api/companies/route.ts` ✅
`app/api/companies/route.ts` usaba `process.env.SUPABASE_URL!` (indefinido → 500). Ahora usa `process.env.NEXT_PUBLIC_SUPABASE_URL!` en `GET` y `PUT`. Verificado con script Node contra Supabase (query a `companies` devuelve filas).

## Solución Inmediata

1. **Configura las variables de Clerk en Vercel**
2. **Redeploy el proyecto:**
```bash
vercel --prod
```

## Si el problema persiste

1. **Verifica los logs del deployment:**
```bash
vercel logs [deployment-url]
```

2. **Verifica la configuración de Clerk:**
   - Ve al dashboard de Clerk
   - Copia las claves correctas
   - Asegúrate de usar las claves de **producción** o **testing**

## Nota sobre verificación local

Debido a que `middleware.ts` usa `clerkMiddleware` y las rutas no públicas ejecutan `await auth.protect()` (devuelve **404** a no autenticados, no redirect), las pruebas con `curl`/`Invoke-WebRequest` sin sesión a rutas protegidas devolverán 404 aunque la ruta exista. Para verificar, inicia sesión en el navegador o prueba rutas públicas (lista en `middleware.ts`). En producción usa `node .next/standalone/server.js` (con `PORT`) copiando `.next/static`, `public` y `.env.local` dentro de `.next/standalone` — `next start` NO funciona con `output: 'standalone'`.