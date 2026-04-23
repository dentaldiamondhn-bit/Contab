# Variables de Entorno Requeridas para Producción

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
```

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
