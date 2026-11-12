# Páginas legales públicas — Plan de implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que `/terms` y `/privacy` sean accesibles sin sesión, se vean como páginas legales independientes y estén enlazadas desde login y registro.

**Architecture:** Se agrega un helper puro `isLegalRoute()` y un componente cliente `AppChrome` que decide si mostrar la barra/sidebar de la app o solo el contenido. El middleware marca ambas rutas como públicas. `/privacy` se crea nueva y se enlaza desde los puntos de entrada.

**Tech Stack:** Next.js (App Router), TypeScript, Tailwind CSS, Clerk, `lucide-react`, `node:test` (Node 24, type stripping).

**Spec:** `docs/superpowers/specs/2026-11-05-legal-pages-public-design.md`

## Global Constraints

- Mantener el contenido y la marca “Diamond Accounting”; no renombrar la aplicación.
- No agregar dependencias nuevas.
- No modificar autenticación, roles, onboarding ni flujos de registro.
- No hay repositorio git funcional en `Contab`; no incluir pasos de commit. Los cambios se dejan en el árbol de trabajo.
- Estilo visual: encabezado cyan, tarjetas de `@/components/ui/card`, iconos de `lucide-react`, textos en español.
- Fechas de “Última actualización”: 5 de noviembre de 2026.
- Contacto legal: `soporte@diamondaccounting.com`, `+504 2234-5678`, Blvd. Morazán, Torre de Comercio, Tegucigalpa, Honduras.

## Review Focus

- Visitante anónimo en `/terms` o `/privacy`: debe ver la página sin redirección y sin barra ni sidebar.
- Rutas que solo empiezan igual (`/terms-extra`, `/privacyx`): no deben tratarse como legales; conservan chrome y protección.
- Usuario autenticado en rutas normales (`/dashboard`): debe seguir viendo el chrome y la protección como hoy.
- `/privacy` desde el pie de los términos: el enlace debe resolver, no dar 404.
- Enlaces desde login y registro: deben navegar a las páginas legales sin romper el formulario ni el redirect de Clerk.

---

### Task 1: Acceso público sin chrome de la aplicación

**Files:**
- Create: `lib/legal-routes.ts`
- Create: `tests/legal-routes/legal-routes.test.mjs`
- Create: `components/workspace/AppChrome.tsx`
- Modify: `app/layout.tsx:1-35`
- Modify: `middleware.ts:5-23`

**Interfaces:**
- Consumes: nada de tareas anteriores.
- Produces:
  - `isLegalRoute(pathname: string): boolean` desde `@/lib/legal-routes`.
  - `AppChrome({ children }: { children: React.ReactNode })` desde `@/components/workspace/AppChrome`.

- [ ] **Step 1: Escribir el test que falla**

Crear `tests/legal-routes/legal-routes.test.mjs`:

```js
import test from 'node:test';
import assert from 'node:assert/strict';
import { isLegalRoute } from '../../lib/legal-routes.ts';

test('reconoce las rutas legales exactas', () => {
  assert.equal(isLegalRoute('/terms'), true);
  assert.equal(isLegalRoute('/privacy'), true);
});

test('reconoce subrutas de las páginas legales', () => {
  assert.equal(isLegalRoute('/terms/aviso'), true);
  assert.equal(isLegalRoute('/privacy/cookies'), true);
});

test('no confunde rutas que solo empiezan igual', () => {
  assert.equal(isLegalRoute('/terms-extra'), false);
  assert.equal(isLegalRoute('/privacyx'), false);
  assert.equal(isLegalRoute('/dashboard'), false);
  assert.equal(isLegalRoute('/'), false);
});
```

- [ ] **Step 2: Correr el test y verificar que falla**

Run (desde `Contab`): `node --test tests/legal-routes/legal-routes.test.mjs`

Expected: FAIL con `Cannot find module` o `isLegalRoute is not a function`.

- [ ] **Step 3: Implementar `isLegalRoute`**

Crear `lib/legal-routes.ts`:

```ts
const LEGAL_ROUTES = ["/terms", "/privacy"];

export function isLegalRoute(pathname: string): boolean {
  const path = pathname.split("?")[0].replace(/\/+$/, "") || "/";
  return LEGAL_ROUTES.some((route) => path === route || path.startsWith(`${route}/`));
}
```

- [ ] **Step 4: Correr el test y verificar que pasa**

Run: `node --test tests/legal-routes/legal-routes.test.mjs`

Expected: PASS (3 tests).

- [ ] **Step 5: Crear `AppChrome`**

Crear `components/workspace/AppChrome.tsx`:

```tsx
"use client";

import React from "react";
import { usePathname } from "next/navigation";
import { WorkspaceBar } from "./WorkspaceBar";
import { AppSidebar } from "./AppSidebar";
import { isLegalRoute } from "@/lib/legal-routes";

export function AppChrome({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() || "";

  if (isLegalRoute(pathname)) {
    return <main className="min-w-0 flex-1">{children}</main>;
  }

  return (
    <div className="flex min-h-screen flex-col">
      <WorkspaceBar />
      <div className="flex flex-1">
        <AppSidebar />
        <main className="min-w-0 flex-1">{children}</main>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Usar `AppChrome` en el layout raíz**

En `app/layout.tsx`, reemplazar los imports de `WorkspaceBar` y `AppSidebar` por `AppChrome`, y sustituir el bloque interior de `WorkspaceProvider`:

```tsx
import "./globals.css";
import { WorkspaceProvider } from "@/providers/WorkspaceProvider";
import { AppChrome } from "@/components/workspace/AppChrome";

// ...

<body className="font-sans antialiased bg-gray-50 text-gray-900">
  <WorkspaceProvider>
    <AppChrome>{children}</AppChrome>
  </WorkspaceProvider>
</body>
```

No cambiar nada más del `<html>` ni del `<head>`.

- [ ] **Step 7: Marcar las rutas como públicas en el middleware**

En `middleware.ts`, dentro de `isPublicRoute`, agregar antes de `"/"`:

```ts
  "/terms(.*)",
  "/privacy(.*)",
```

- [ ] **Step 8: Verificar typecheck de los archivos tocados**

Run (desde `Contab`):

```powershell
npx tsc --noEmit --pretty false 2>&1 | Select-String "legal-routes|AppChrome|app/layout|middleware.ts"
```

Expected: sin líneas de salida. Si `tsc` reporta errores preexistentes en otros archivos, no cuentan para esta tarea.

- [ ] **Step 9: Verificar el comportamiento HTTP**

Run (desde `Contab`, en una terminal aparte): `npm run dev`

Luego:

```powershell
curl.exe -s -o NUL -w "terms=%{http_code}`n" http://localhost:3000/terms
curl.exe -s -o NUL -w "privacy=%{http_code}`n" http://localhost:3000/privacy
curl.exe -s -o NUL -w "dashboard=%{http_code} -> %{redirect_url}`n" http://localhost:3000/dashboard
```

Expected: `terms=200`, `privacy=200`, y `dashboard` con redirección a `/auth/login` (código 307/302). Abrir `/terms` en el navegador y confirmar que no aparece la barra de workspace ni el sidebar.

---

### Task 2: Página de Política de Privacidad

**Files:**
- Create: `app/privacy/page.tsx`
- Modify: nada más.

**Interfaces:**
- Consumes: `isLegalRoute` ya hace pública la ruta vía middleware (Task 1).
- Produces: página en `/privacy`, enlazada por Task 3 y por el pie de `/terms`.

- [ ] **Step 1: Crear la página**

Crear `app/privacy/page.tsx` como **server component** (sin `"use client"`). Replicar la estructura visual de `app/terms/page.tsx`: contenedor `min-h-screen bg-gray-50`, encabezado `bg-cyan-700 text-white` con botón “Volver” hacia `/auth/login`, icono `Shield`, título “Política de Privacidad” y subtítulo “Última actualización: 5 de noviembre de 2026”.

Contenido obligatorio, en tarjetas numeradas:

1. **Responsable del tratamiento** — Diamond Accounting, Blvd. Morazán, Torre de Comercio, Tegucigalpa, Honduras; correo `soporte@diamondaccounting.com`.
2. **Datos que recopilamos** — datos de cuenta (nombre, correo, credenciales gestionadas por Clerk); datos de empresa (nombre, RTN, información fiscal); datos contables y documentos que el usuario ingresa; datos de uso y registros técnicos.
3. **Finalidades** — prestar y mantener el Servicio; soporte; facturación y cobro; seguridad y prevención de fraude; cumplimiento de obligaciones legales y fiscales.
4. **Base legal y consentimiento** — ejecución del contrato, cumplimiento legal, interés legítimo en seguridad y consentimiento cuando corresponda.
5. **Almacenamiento y seguridad** — Supabase sobre AWS en Estados Unidos; cifrado en tránsito y en reposo; aislamiento por tenant; acceso restringido al personal autorizado.
6. **Proveedores terceros** — Clerk (autenticación), Supabase (base de datos y almacenamiento), Stripe/PayPal/Google Pay (pagos), proveedores de correo transaccional.
7. **Conservación** — mientras la cuenta esté activa; tras la cancelación, eliminación a los 90 días, salvo obligación legal de conservar.
8. **Derechos del usuario** — acceso, rectificación, exportación, eliminación y oposición; solicitudes a `soporte@diamondaccounting.com`; el usuario puede exportar datos mientras la cuenta esté activa.
9. **Cookies y almacenamiento local** — cookies de sesión de Clerk y preferencias locales (empresa y sede activas) guardadas en el navegador; no se usan para publicidad.
10. **Menores de edad** — el Servicio no está dirigido a menores de 18 años.
11. **Cambios a esta política** — se publican en esta página; cambios significativos se notifican por correo o aviso en el Servicio con al menos 30 días.
12. **Contacto y ley aplicable** — datos de contacto del responsable; leyes de la República de Honduras y tribunales de Tegucigalpa.

El pie debe incluir “© 2026 Diamond Accounting. Todos los derechos reservados.” y enlaces a `/terms` y `/privacy`.

- [ ] **Step 2: Verificar typecheck**

Run (desde `Contab`):

```powershell
npx tsc --noEmit --pretty false 2>&1 | Select-String "app/privacy"
```

Expected: sin líneas de salida.

- [ ] **Step 3: Verificar en el navegador**

Con `npm run dev` activo, abrir `http://localhost:3000/privacy` sin sesión.

Expected: carga completa, sin barra ni sidebar, con las 12 secciones y los enlaces del pie funcionando.

---

### Task 3: Enlaces de entrada y navegación de vuelta

**Files:**
- Modify: `app/terms/page.tsx:14`
- Modify: `app/auth/login/page.tsx:1-130`
- Modify: `app/auth/register/page.tsx:1-40, 461-468`

**Interfaces:**
- Consumes: rutas `/terms` y `/privacy` de Tasks 1 y 2.
- Produces: navegación visible desde login, registro y términos.

- [ ] **Step 1: Corregir el “Volver” de los términos**

En `app/terms/page.tsx`, cambiar el enlace del botón:

```tsx
<Link href="/auth/login">
```

(antes `href="/"`). El texto “Volver” puede quedar igual o pasar a “Volver al inicio de sesión”.

- [ ] **Step 2: Agregar enlaces en el login**

En `app/auth/login/page.tsx`, agregar `import Link from 'next/link';` junto a los imports existentes y, debajo del párrafo “Inicia sesión para acceder al sistema”, agregar:

```tsx
<p className="text-cyan-300 text-xs mt-3">
  Al usar el servicio aceptas nuestros{" "}
  <Link href="/terms" className="underline hover:text-white">Términos y Condiciones</Link>{" "}
  y la{" "}
  <Link href="/privacy" className="underline hover:text-white">Política de Privacidad</Link>.
</p>
```

- [ ] **Step 3: Agregar enlaces en el registro**

En `app/auth/register/page.tsx`, agregar `import Link from 'next/link';` y, después del párrafo “Al registrarte, podrás acceder a nuestro sistema contable profesional”, agregar el mismo bloque de enlaces del Step 2 (con `className="text-cyan-300 text-xs mt-3"` para mantener la paleta de esa pantalla).

- [ ] **Step 4: Verificar typecheck**

Run (desde `Contab`):

```powershell
npx tsc --noEmit --pretty false 2>&1 | Select-String "app/terms|app/auth/login|app/auth/register"
```

Expected: sin líneas de salida.

- [ ] **Step 5: Verificar navegación**

Con `npm run dev` activo:

1. Sin sesión, abrir `http://localhost:3000/auth/login`; los enlaces deben llevar a `/terms` y `/privacy`.
2. Abrir `http://localhost:3000/auth/register`; mismo comportamiento.
3. En `/terms`, “Volver” debe llevar a `/auth/login`.
4. En `/terms`, el enlace del pie a `/privacy` no debe dar 404.

---

### Task 4: Verificación final

**Files:**
- No se crean ni modifican archivos.

**Interfaces:**
- Consumes: todo lo anterior.
- Produces: evidencia de que el cambio funciona y no rompió rutas existentes.

- [ ] **Step 1: Correr los tests del helper**

Run (desde `Contab`): `node --test tests/legal-routes/legal-routes.test.mjs`

Expected: PASS (3 tests).

- [ ] **Step 2: Typecheck acotado**

Run (desde `Contab`):

```powershell
npx tsc --noEmit --pretty false 2>&1 | Select-String "legal-routes|AppChrome|app/layout|app/terms|app/privacy|app/auth/login|app/auth/register|middleware.ts"
```

Expected: sin líneas de salida.

- [ ] **Step 3: Comprobar rutas públicas y privadas**

Con `npm run dev` activo:

```powershell
curl.exe -s -o NUL -w "terms=%{http_code}`n" http://localhost:3000/terms
curl.exe -s -o NUL -w "privacy=%{http_code}`n" http://localhost:3000/privacy
curl.exe -s -o NUL -w "dashboard=%{http_code} -> %{redirect_url}`n" http://localhost:3000/dashboard
curl.exe -s -o NUL -w "billing=%{http_code} -> %{redirect_url}`n" http://localhost:3000/billing
```

Expected: `terms=200`, `privacy=200`, y redirección a `/auth/login` para `dashboard` y `billing`.

- [ ] **Step 4: Revisión visual final**

Sin sesión, abrir `/terms` y `/privacy`: no debe aparecer `WorkspaceBar` ni `AppSidebar`. Con sesión, abrir `/dashboard`: la barra y el sidebar deben verse como antes.

- [ ] **Step 5: Reportar resultado**

Resumir: archivos creados/modificados, tests y verificaciones ejecutadas, y cualquier limitación (por ejemplo, si no se pudo levantar el dev server por variables de entorno de Clerk).
