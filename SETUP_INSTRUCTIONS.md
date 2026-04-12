# 🚀 Configuración RLS en Supabase

## 📋 Pasos para Configurar Multitenant con RLS

### 1️⃣ **Ejecutar Script SQL**
Ve a tu proyecto Supabase y ejecuta el script `SUPABASE_RLS_SETUP.sql`:

1. **Abre el Dashboard de Supabase**
2. **Ve a SQL Editor** (en el menú lateral)
3. **Copia y pega** el contenido de `SUPABASE_RLS_SETUP.sql`
4. **Ejecuta el script** (Run)

### 2️⃣ **Verificar Configuración**

Después de ejecutar el script, verifica que aparezcan:

```
✅ RLS Enabled para Account, Transaction, JournalEntry
✅ 4 políticas por tabla (SELECT, INSERT, UPDATE, DELETE)
✅ Función set_tenant creada
✅ Índices creados para rendimiento
```

### 3️⃣ **Probar la Función**

En SQL Editor, prueba la función:

```sql
-- Probar establecer tenant
SELECT set_tenant('1');

-- Verificar que el contexto se estableció
SELECT current_setting('app.current_tenant_id');
```

Debería retornar: `1`

### 4️⃣ **Probar RLS**

```sql
-- Sin contexto (debería fallar)
SELECT * FROM "Account";

-- Con contexto (debería funcionar)
SELECT set_tenant('1');
SELECT * FROM "Account" WHERE tenantId = '1';
```

### 5️⃣ **Reiniciar Aplicación**

Después de configurar Supabase:

1. **Reinicia el servidor Next.js** (`npm run dev`)
2. **Limpia el cache** del navegador
3. **Intenta crear una transacción**

---

## 🔍 **Si Aún Hay Problemas**

### **Opción A: Usar Service Role Directamente**
Si RLS no funciona, el sistema ya tiene fallback a service role.

### **Opción B: Desactivar RLS Temporalmente**
```sql
-- Desactivar RLS para pruebas
ALTER TABLE "Account" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" DISABLE ROW LEVEL SECURITY;
ALTER TABLE "JournalEntry" DISABLE ROW LEVEL SECURITY;
```

### **Opción C: Verificar Variables de Entorno**
Asegúrate que en `.env.local` tengas:
```
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
```

---

## 🎯 **Resultado Esperado**

Después de la configuración correcta:

```
🔍 Estableciendo tenant: 1
✅ Tenant establecido correctamente
🔍 Verificando contexto RLS...
✅ Contexto RLS verificado
🔍 Insertando Transaction...
✅ Transacción creada exitosamente
```

---

## 📞 **Soporte**

Si necesitas ayuda:
1. **Revisa los logs** en la consola del navegador
2. **Verifica el SQL Editor** en Supabase
3. **Comparte los errores** específicos

La configuración RLS es crucial para el aislamiento de datos entre tenants.
