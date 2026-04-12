# Contab - Sistema Contable Multi-Tenant

Un sistema contable completo diseñado para contadores hondureños, con soporte multi-tenant, generación de PDFs profesionales y gestión de perfiles contables.

## 🚀 Características Principales

### 📊 **Dashboard Master**
- **Panel general** de todas las empresas gestionadas
- **Filtro por rubro** (Clínicas, Ferreterías, etc.)
- **Alertas de CAI** con vencimientos próximos
- **Estado de declaraciones ISV** (Formulario 221)
- **Acceso rápido** al cierre de mes
- **Indicadores de liquidez** y actividad

### 🏢 **Gestión Multi-Tenant**
- **Aislamiento completo** de datos por empresa
- **Row Level Security (RLS)** en Supabase
- **Contexto de tenant** automático
- **Switch dinámico** entre empresas

### 📋 **Contabilidad Completa**
- **Plan de cuentas** jerárquico
- **Pólizas contables** (Ingreso, Egreso, Diario, Ajuste)
- **Balanza de comprobación** automática
- **Libro mayor** y auxiliares
- **Cierre de períodos** mensuales/anuales

### 🧾 **Documentos Fiscales**
- **Gestión de CAI** (Código de Autorización de Impresión)
- **Facturación electrónica** con RTN
- **Retenciones** profesionales (1% y 12.5%)
- **Declaraciones ISV** mensuales
- **Reportes SAR** y COF

### 📄 **Generación de PDFs**
- **Pólizas contables** con formato profesional
- **Balanza de comprobación** detallada
- **Firma digital** y sello profesional
- **Reportes de P&L** (Profit & Loss)
- **Libros legales** para SAR

### 👨‍💼 **Perfil del Contador**
- **Información profesional** completa
- **Número de colegiación** (CAH-12345)
- **Firma digital** PNG transparente
- **Sello profesional** PNG
- **Integración automática** en PDFs

## 🛠️ Stack Tecnológico

### **Frontend**
- **Next.js 16** con App Router
- **TypeScript** para tipado seguro
- **Tailwind CSS** para estilos
- **Radix UI** componentes accesibles
- **Lucide React** iconos

### **Backend**
- **Supabase** como BaaS
- **PostgreSQL** con RLS
- **Prisma ORM** para base de datos
- **Next.js API Routes**
- **Supabase Storage** para archivos

### **PDF Generation**
- **@react-pdf/renderer** para PDFs
- **Fuentes personalizadas** para documentos legales
- **Firmas digitales** integradas

## 📁 Estructura del Proyecto

```
contab/
├── app/                          # Páginas Next.js
│   ├── accounts/                # Gestión de cuentas
│   ├── api/                     # API Routes
│   ├── bank-accounts/           # Cuentas bancarias
│   ├── dashboard/               # Dashboard principal
│   ├── reports/                 # Reportes y PDFs
│   ├── settings/                # Ajustes de perfil
│   └── transactions/            # Transacciones
├── components/                   # Componentes React
│   ├── ui/                      # Componentes base
│   ├── reports/                 # Componentes de PDF
│   └── dashboard/               # Componentes dashboard
├── lib/                         # Utilidades y configuración
│   ├── actions/                 # Server actions
│   ├── hooks/                   # Custom hooks
│   ├── reports/                 # Lógica de reportes
│   └── supabase/                # Clientes Supabase
├── prisma/                      # Schema y seeds
├── services/                    # Lógica de negocio
│   ├── master-dashboard.ts      # Dashboard multi-tenant
│   └── accounting.ts           # Lógica contable
└── types/                       # Tipos TypeScript
```

## 🗄️ Esquema de Base de Datos

### **Modelos Principales**

#### **Tenant (Empresas)**
```sql
model Tenant {
  id              String    @id @default(cuid())
  businessName    String
  businessRTN     String    @unique
  industry        String
  // ... más campos
}
```

#### **Account (Plan de Cuentas)**
```sql
model Account {
  id            String    @id @default(cuid())
  name          String    @unique
  code          String    @unique
  type          String    // ASSET, LIABILITY, EQUITY, REVENUE, EXPENSE
  // ... relación jerárquica
}
```

#### **Transaction (Pólizas)**
```sql
model Transaction {
  id              String    @id @default(cuid())
  date            DateTime
  description     String
  voucherType     String    // INGRESO, EGRESO, DIARIO, AJUSTE
  voucherNumber   Int
  entries         JournalEntry[]
  // ... más campos
}
```

#### **ContadorProfile (Perfil Contador)**
```sql
model ContadorProfile {
  id                   String    @id @default(cuid())
  userId               String    @unique
  numColegiacion       String    // CAH-12345
  firmaUrl             String?   // Firma PNG
  selloUrl             String?   // Sello PNG
  cargo                String    @default("Contador General")
  // ... más campos
}
```

## 🔧 Configuración y Instalación

### **Prerrequisitos**
- Node.js 18+
- PostgreSQL (o usar Supabase)
- Cuenta de Supabase

### **Instalación**
```bash
# Clonar repositorio
git clone <repo-url>
cd contab

# Instalar dependencias
npm install

# Configurar variables de entorno
cp .env.example .env.local

# Configurar Supabase
NEXT_PUBLIC_SUPABASE_URL=tu_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key

# Ejecutar migraciones
npx prisma migrate dev

# Generar cliente Prisma
npx prisma generate

# Iniciar desarrollo
npm run dev
```

### **Variables de Entorno**
```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Base de datos (si no usa Supabase)
DATABASE_URL=

# Otros
NEXTAUTH_SECRET=
NEXTAUTH_URL=
```

## 🚀 Uso del Sistema

### **1. Configuración Inicial**

1. **Crear tenant** para cada empresa
2. **Configurar plan de cuentas** según necesidades
3. **Establecer CAI** para facturación
4. **Configurar perfil** del contador

### **2. Operación Diaria**

#### **Registrar Pólizas**
```typescript
// Ejemplo: Póliza de ingreso
const transaction = await createTransaction({
  date: new Date(),
  description: "Venta de servicios",
  voucherType: "INGRESO",
  entries: [
    { accountId: "1101", amount: 100000 }, // Banco
    { accountId: "4101", amount: -100000 } // Ingresos
  ]
});
```

#### **Generar Reportes**
```typescript
// Balanza de comprobación
const trialBalance = await generateTrialBalance(tenantId, period);

// PDF con firma
const profile = await getContadorProfileForPDF();
const pdf = <TrialBalanceDocument 
  data={trialBalance} 
  contadorProfile={profile} 
/>;
```

### **3. Dashboard Multi-Tenant**

El dashboard master permite:
- **Ver todas las empresas** en un solo lugar
- **Filtrar por industria** específica
- **Monitorear obligaciones** fiscales
- **Acceder rápidamente** a cada empresa

## 📊 Reportes Disponibles

### **Reportes Financieros**
- ✅ Balanza de Comprobación
- ✅ Estado de Resultados (P&L)
- ✅ Libro Mayor
- ✅ Libro Auxiliar
- ✅ Balance General

### **Reportes Fiscales**
- ✅ Declaración ISV (Formulario 221)
- ✅ Retenciones Profesionales
- ✅ Reporte COF
- ✅ Libro SAR

### **Reportes de Gestión**
- ✅ Pólizas Contables
- ✅ Flujo de Efectivo
- ✅ Análisis de Cuentas
- ✅ Cierre de Período

## 🔐 Seguridad

### **Row Level Security (RLS)**
- **Aislamiento por tenant** automático
- **Perfiles de usuario** específicos
- **Acceso granular** a datos sensibles

### **Autenticación**
- **Supabase Auth** integrado
- **Sesiones seguras** por tenant
- **Manejo de tokens** automático

## 🎯 Mejores Prácticas

### **Para Contadores**
1. **Mantener perfil actualizado** con firma y sello
2. **Verificar balances** antes de cerrar períodos
3. **Documentar todas** las transacciones
4. **Usar códigos** de cuenta consistentes

### **Para Desarrolladores**
1. **Seguir el patrón** multi-tenant
2. **Usar RLS policies** en todas las tablas
3. **Mantener tipos** TypeScript actualizados
4. **Probar con diferentes** tenants

## 🚧 Desarrollo Futuro

### **Próximas Características**
- [ ] **Conciliación bancaria** automática
- [ ] **Integración SAR** directa con DGII
- [ ] **Móvil app** para captura de recibos
- [ ] **API pública** para integraciones
- [ ] **AI Assistant** para clasificación

### **Mejoras Técnicas**
- [ ] **Testing unitario** completo
- [ ] **CI/CD pipeline** automatizado
- [ ] **Monitoring** y alertas
- [ ] **Performance optimization**

## 📞 Soporte

### **Documentación**
- **Wiki del proyecto** para desarrollo
- **Guías de usuario** final
- **API documentation** con Swagger

### **Contribuciones**
1. **Fork** el repositorio
2. **Crear branch** para features
3. **Submit PR** con cambios
4. **Seguir código style** del proyecto

## 📄 Licencia

Este proyecto está licenciado bajo MIT License - ver archivo [LICENSE](LICENSE) para detalles.

---

**Desarrollado con ❤️ para contadores hondureños**

*Optimizado para cumplir con las normativas fiscales de Honduras incluyendo SAR, COF y declaraciones ISV.*
