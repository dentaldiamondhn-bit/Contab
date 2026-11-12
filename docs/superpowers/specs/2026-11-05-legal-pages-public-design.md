# Páginas legales públicas (Términos y Privacidad) — Diseño

- **Fecha:** 5 de noviembre de 2026
- **Estado:** propuesto, pendiente de aprobación
- **Alcance:** pequeño cambio en `Contab` (Next.js + Clerk)

## Intención y por qué

La aplicación ya tiene una página completa de Términos y Condiciones en
`app/terms/page.tsx`, pero el `middleware.ts` la trata como ruta privada:
cualquier visitante sin sesión es enviado al login. Además, casi no está
enlazada y su enlace a `/privacy` apunta a una página que no existe.

El objetivo es que cualquiera pueda leer los términos y la política de
privacidad **antes de registrarse o iniciar sesión**, y que esos enlaces
existan en los puntos de entrada.

## Objetivos

1. `/terms` y `/privacy` accesibles sin sesión.
2. Ambas páginas se vean como páginas legales independientes, sin la barra de
   workspace ni el sidebar de la aplicación.
3. Enlaces visibles a ambas páginas desde el login y el registro.
4. Crear `/privacy` con contenido coherente con lo que ya declaran los
   términos (Supabase, retención de 90 días, procesadores de pago).
5. Corregir el enlace roto del pie de los términos.

## No objetivos

- Reescribir el contenido legal existente de los términos.
- Crear una landing page pública o una zona de marketing.
- Cambiar autenticación, roles, onboarding o flujo de registro.
- Añadir gestión de consentimiento (checkboxes, versionado legal, auditoría).
- Añadir `sitemap.xml`, `robots.txt` o SEO avanzado.

## Anti-objetivos

- Que la página pública muestre el menú interno (Inventario, Compras,
  Reportes) o enlaces que reboten al login.
- Duplicar el layout raíz o reestructurar todas las rutas para este cambio.
- Introducir dependencias nuevas.

## Restricciones

- El `layout.tsx` raíz envuelve todas las rutas con `WorkspaceProvider`,
  `WorkspaceBar` y `AppSidebar`; no hay grupos de rutas públicos.
- El middleware usa `clerkMiddleware` con una lista `isPublicRoute`.
- El proyecto no tiene un repositorio git funcional en esta copia
  (`Contab/.git` está incompleto), así que este documento no se puede
  commitear aquí.
- Estilo visual existente: Tailwind + tarjetas (`components/ui/card`),
  encabezado cyan, iconos de `lucide-react`.

## Enfoques considerados

### A. Pública y limpia (elegido)

Añadir las rutas a `isPublicRoute`, ocultar la barra y el sidebar solo en
`/terms` y `/privacy` mediante un componente de chrome condicional, enlazar
ambas páginas desde login y registro, y crear `/privacy`.

- **Ventaja:** resuelve el problema completo con cambios acotados y
  reversibles; no toca la estructura global.
- **Coste:** se añade un componente cliente que decide el chrome según la ruta.

### B. Mínima

Solo hacer `/terms` pública y enlazarla desde login/registro; se deja el chrome
de la app y se elimina el enlace a privacidad.

- **Ventaja:** el cambio más pequeño posible.
- **Coste:** la página se ve como una pantalla interna y queda sin política de
  privacidad, que el registro menciona.

### C. Separación completa

Mover el chrome del layout raíz a un grupo de rutas de aplicación y dejar el
layout raíz mínimo para una futura zona pública.

- **Ventaja:** arquitectura más limpia si habrá más páginas públicas.
- **Coste:** toca el layout global y arriesga regresiones en todas las
  pantallas; desproporcionado para este pedido.

**Decisión:** A.

## Diseño

### 1. Rutas públicas

En `middleware.ts`, agregar a `isPublicRoute`:

- `/terms(.*)`
- `/privacy(.*)`

No se modifican las comprobaciones de admin ni el resto del middleware.

### 2. Chrome condicional

Nuevo componente cliente `components/workspace/AppChrome.tsx`:

- Usa `usePathname()`.
- Si la ruta es `/terms` o `/privacy` (o una subruta), renderiza solo
  `<main className="min-w-0 flex-1">{children}</main>`.
- En cualquier otra ruta conserva exactamente la estructura actual:
  `WorkspaceBar` + `AppSidebar` + `main`.

`app/layout.tsx` deja de importar `WorkspaceBar` y `AppSidebar` directamente y
usa `AppChrome` dentro de `WorkspaceProvider`. El resto del layout no cambia.

### 3. Página de términos

`app/terms/page.tsx` mantiene su contenido. Ajustes:

- El botón “Volver” apunta a `/auth/login` (destino útil para un visitante
  anónimo); sigue funcionando para usuarios con sesión.
- El pie conserva los enlaces a `/terms` y `/privacy`, ahora válidos.
- Se mantiene el enlace desde el paso de términos del onboarding.

### 4. Página de privacidad

Nueva `app/privacy/page.tsx`, con el mismo lenguaje visual (encabezado cyan,
tarjetas numeradas, pie con enlaces). Secciones:

1. Responsable del tratamiento (Diamond Accounting).
2. Datos que recopilamos (cuenta, empresa, datos contables/fiscales, uso).
3. Finalidades (prestación del servicio, soporte, facturación, seguridad,
   cumplimiento legal).
4. Base legal y consentimiento.
5. Almacenamiento y seguridad (Supabase/AWS en EE. UU., cifrado en tránsito y
   en reposo, aislamiento multi-tenant).
6. Proveedores terceros (Clerk, Supabase, Stripe/PayPal/Google Pay, correo).
7. Conservación (cuenta activa; 90 días tras cancelación, alineado con los
   términos).
8. Derechos del usuario (acceso, rectificación, exportación, eliminación,
   oposición) y cómo ejercerlos.
9. Cookies y almacenamiento local (sesión, empresa/sede activa).
10. Menores de edad.
11. Cambios a la política.
12. Contacto y ley aplicable (Honduras).

Los datos de contacto serán los mismos de los términos
(`soporte@diamondaccounting.com`, teléfono y dirección existentes).

### 5. Enlaces de entrada

- **Login** (`app/auth/login/page.tsx`): bajo el texto “Inicia sesión para
  acceder al sistema”, una línea con enlaces a Términos y Privacidad.
- **Registro** (`app/auth/register/page.tsx`): bajo “Al registrarte, podrás
  acceder…”, la misma línea de enlaces.

Se usa `next/link` y el estilo cyan ya presente en esas pantallas.

### 6. Marca

Se conserva “Diamond Accounting” en el contenido legal, porque es la marca que
ya usan el login, el registro y los términos existentes. No se renombra nada.

## Lo que queda a criterio del implementador

- Redacción exacta de la política de privacidad, siempre coherente con los
  términos y sin inventar prácticas no verificables.
- Si el botón “Volver” se etiqueta “Volver al inicio de sesión”.
- Detalles menores de espaciado y responsive.
- Reutilizar o no un pequeño componente de sección para las tarjetas legales;
  se prefiere no abstraer si duplica poco.

## Verificación

1. Sin sesión, `/terms` y `/privacy` cargan y no redirigen al login.
2. En ambas páginas no aparecen `WorkspaceBar` ni `AppSidebar`.
3. El resto de rutas conserva la barra y el sidebar.
4. Los enlaces del login, el registro y el pie de las páginas legales navegan
   correctamente.
5. `npm run build` (o al menos typecheck sobre los archivos tocados) sin errores
   nuevos atribuibles a este cambio.
