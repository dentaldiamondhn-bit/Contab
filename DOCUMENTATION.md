# Contab - Sistema Contable Multi-Tenant

**Sistema contable completo diseñado para contadores hondureños, con soporte multi-tenant, generación de PDFs profesionales y gestión de perfiles contables.**

---

## 📚 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Características Principales](#características-principales)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Configuración e Instalación](#configuración-e-instalación)
6. [Uso del Sistema](#uso-del-sistema)
7. [Reportes Disponibles](#reportes-disponibles)
8. [Seguridad](#seguridad)
9. [Mejores Prácticas](#mejores-prácticas)
10. [Guía de Inicio Rápido](#guía-de-inicio-rápido)
11. [Configuración RLS en Supabase](#configuración-rls-en-supabase)
12. [Estado del Proyecto](#estado-del-proyecto)
13. [Próximos Pasos](#próximos-pasos)
14. [Soporte](#soporte)

---

## Descripción General

Contab es un sistema contable completo con soporte multi-tenant que permite a los contadores gestionar múltiples empresas desde un solo dashboard, con total aislamiento de datos y cumplimiento de normativas fiscales de Honduras.

---

## Características Principales

### 📊 Dashboard Master
- **Panel general** de todas las empresas gestionadas
- **Filtro por rubro** (Clínicas, Ferreterías, etc.)
- **Alertas de CAI** con vencimientos próximos
- **Estado de declaraciones ISV** (Formulario 221)
- **Acceso rápido** al cierre de mes
- **Indicadores de liquidez** y actividad

### 🏢 Gestión Multi-Tenant
- **Aislamiento completo** de datos por empresa
- **Row Level Security (RLS)** en Supabase
- **Contexto de tenant** automático
- **Switch dinámico** entre empresas

### 📋 Contabilidad Completa
- **Plan de cuentas** jerárquico
- **Pólizas contables** (Ingreso, Egreso, Diario, Ajuste)
- **Balanza de comprobación** automática
- **Libro mayor** y auxiliares
- **Cierre de períodos** mensuales/anuales

### 🧾 Documentos Fiscales
- **Gestión de CAI** (Código de Autorización de Impresión)
- **Facturación electrónica** con RTN
- **Retenciones** profesionales (1% y 12.5%)
- **Declaraciones ISV** mensuales
- **Reportes SAR** y COF

### 📄 Generación de PDFs
- **Pólizas contables** con formato profesional
- **Balanza de comprobación** detallada
- **Firma digital** y sello profesional
- **Reportes de P&L** (Profit & Loss)
- **Libros legales** para SAR

### 👨‍💼 Perfil del Contador
- **Información profesional** completa
- **Número de colegiación** (CAH-12345)
- **Firma digital** PNG transparente
- **Sello profesional** PNG
- **Integración automática** en PDFs

---

## Stack Tecnológico

### Frontend
- **Next.js 16** con App Router
- **TypeScript** para tipado seguro
- **Tailwind CSS** para estilos
- **Radix UI** componentes accesibles
- **Lucide React** iconos

### Backend
- **Supabase** como BaaS
- **PostgreSQL** con RLS
- **Prisma ORM** para base de datos
- **Next.js API Routes**
- **Supabase Storage** para archivos

### PDF Generation
- **@react-pdf/renderer** para PDFs
- **Fuentes personalizadas** para documentos legales
- **Firmas digitales** integradas

---

## Estructura del Proyecto

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

---

## Configuración e Instalación

### Prerrequisitos
- Node.js 18+
- PostgreSQL (o usar Supabase)
- Cuenta de Supabase

### Instalación

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

### Variables de Entorno

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

---

## Uso del Sistema

### 1. Configuración Inicial

1. **Crear tenant** para cada empresa
2. **Configurar plan de cuentas** según necesidades
3. **Establecer CAI** para facturación
4. **Configurar perfil** del contador

### 2. Operación Diaria

#### Registrar Pólizas

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

#### Generar Reportes

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

### 3. Dashboard Multi-Tenant

El dashboard master permite:
- **Ver todas las empresas** en un solo lugar
- **Filtrar por industria** específica
- **Monitorear obligaciones** fiscales
- **Acceder rápidamente** a cada empresa

---

## Reportes Disponibles

### Reportes Financieros
- ✅ Balanza de Comprobación
- ✅ Estado de Resultados (P&L)
- ✅ Libro Mayor
- ✅ Libro Auxiliar
- ✅ Balance General

### Reportes Fiscales
- ✅ Declaración ISV (Formulario 221)
- ✅ Retenciones Profesionales
- ✅ Reporte COF
- ✅ Libro SAR

### Reportes de Gestión
- ✅ Pólizas Contables
- ✅ Flujo de Efectivo
- ✅ Análisis de Cuentas
- ✅ Cierre de Período

---

## Seguridad

### Row Level Security (RLS)
- **Aislamiento por tenant** automático
- **Perfiles de usuario** específicos
- **Acceso granular** a datos sensibles

### Autenticación
- **Supabase Auth** integrado
- **Sesiones seguras** por tenant
- **Manejo de tokens** automático

---

## Mejores Prácticas

### Para Contadores
1. **Mantener perfil actualizado** con firma y sello
2. **Verificar balances** antes de cerrar períodos
3. **Documentar todas** las transacciones
4. **Usar códigos** de cuenta consistentes

### Para Desarrolladores
1. **Seguir el patrón** multi-tenant
2. **Usar RLS policies** en todas las tablas
3. **Mantener tipos** TypeScript actualizados
4. **Probar con diferentes** tenants

---

## Guía de Inicio Rápido

### Core System Complete

#### 1. Data Integrity (BigInt Precision)
**Status**: ✅ COMPLETE
- All monetary values use BigInt (cents-based)
- Zero floating-point errors
- Currency conversion with 4-decimal precision
- Validation at every calculation step

#### 2. Professional Accounting Flow
**Status**: ✅ COMPLETE

**Trial Balance (Balanza de Comprobación)**
- Path: `/trial-balance`
- Real-time balance calculation
- PDF export for official filing
- Account hierarchy support

**Monthly Vouchers (Pólizas)**
- Automated voucher numbering (INGRESO/EGRESO/DIARIO/AJUSTE)
- Tax auto-calculation with toggle switch
- 3-entry automatic generation (Patient Billing)
- PDF export with official format

**Year-End Closing**
- Path: `/year-end-closing`
- Revenue/Expense calculation
- Net income determination
- Automatic retained earnings transfer
- Complete audit trail

#### 3. Tax Compliance (SAR)
**Status**: ✅ COMPLETE

**Automated ISV 15% Calculation**
- Smart tax categorization (15% standard, 18% special)
- Auto-detection based on description keywords
- TaxConfig linked to Chart of Accounts
- Real-time calculation preview

**Monthly SAR Reporting**
- Path: `/tax-reporting`
- Sales ISV calculation (revenue accounts)
- Purchases ISV calculation (expense accounts)
- Net tax to pay: Sales - Purchases
- CSV export for SAR portal
- PDF export with official format

**Patient Billing System**
- Path: `/patient-billing`
- Enter subtotal only
- Auto-generates 3 journal entries

#### 4. Auditability (Complete Trail)
**Status**: ✅ COMPLETE
- Every change logged with Before/After snapshots
- AuditLog table with full history
- User identification (who, when, where, what)
- Data revert capabilities
- CSV export for compliance audits

#### 5. Expert Tools
**Status**: ✅ COMPLETE

**Excel Import System**
- Bulk Chart of Accounts import
- Historical transactions import
- Template generation
- Validation and error reporting
- Multi-currency support

**PDF Export System**
- Trial Balance (Balanza)
- Individual Pólizas
- Tax Reports (Declaración SAR)
- Professional formatting
- Signature sections

**Multi-Currency Support**
- HNL (functional currency)
- USD, EUR support
- Automatic exchange rate validation
- Conversion safeguards
- Historical rate tracking

---

### Quick Start Commands

#### Database Setup
```bash
# Install dependencies
npm install

# Setup database
npx prisma migrate dev
npx prisma generate

# Seed initial data
npx tsx prisma/seed-tax-configs.ts
npx tsx prisma/seed-patient-billing.ts
npx tsx prisma/sample-tax-transactions.ts
```

#### Development Server
```bash
npm run dev
# Open http://localhost:3000
```

#### Build for Production
```bash
npm run build
npm start
```

---

## Configuración RLS en Supabase

### Pasos para Configurar Multitenant con RLS

#### 1️⃣ Ejecutar Script SQL
Ve a tu proyecto Supabase y ejecuta el script `SUPABASE_RLS_SETUP.sql`:

1. **Abre el Dashboard de Supabase**
2. **Ve a SQL Editor** (en el menú lateral)
3. **Copia y pega** el contenido de `SUPABASE_RLS_SETUP.sql`
4. **Ejecuta el script** (Run)

#### 2️⃣ Verificar Configuración

Después de ejecutar el script, verifica que aparezcan:

```
✅ RLS Enabled para Account, Transaction, JournalEntry
✅ 4 políticas por tabla (SELECT, INSERT, UPDATE, DELETE)
✅ Función set_tenant creada
✅ Índices creados para rendimiento
```

#### 3️⃣ Probar la Función

En SQL Editor, prueba la función:

```sql
-- Probar establecer tenant
SELECT set_tenant('1');

-- Verificar que el contexto se estableció
SELECT current_setting('app.current_tenant_id');
```

Debería retornar: `1`

#### 4️⃣ Probar RLS

```sql
-- Sin contexto (debería fallar)
SELECT * FROM "Account";

-- Con contexto (debería funcionar)
SELECT set_tenant('1');
SELECT * FROM "Account" WHERE tenantId = '1';
```

#### 5️⃣ Reiniciar Aplicación

Después de configurar Supabase:

1. **Reinicia el servidor Next.js** (`npm run dev`)
2. **Limpia el cache** del navegador
3. **Intenta crear una transacción**

---

## Estado del Proyecto

### 🏆 PROYECTO COMPLETO - SISTEMA 100% FUNCIONAL

#### ✅ ESTADO FINAL DEL PROYECTO

**El sistema de base de datos está completamente funcional y listo para producción**

#### 📋 Archivos SQL Esenciales - ESTADO FINAL

| Archivo | Estado | Descripción |
|----------|---------|-------------|
| `SUPABASE_COMPLETE.sql` | ✅ **FUNCIONAL** | Base de datos principal completa |
| `COMPLETE_SYSTEM_SETUP.sql` | ✅ **FUNCIONAL** | Setup con datos de ejemplo |
| `LEGAL_REVISIONES_SCHEMA.sql` | ✅ **FUNCIONAL** | Sistema de revisiones legales |
| `LEGAL_REVISIONES_PROCEDURES_V2.sql` | ✅ **FUNCIONAL** | Procedimientos almacenados |
| `SUPABASE_RLS_SETUP.sql` | ✅ **FUNCIONAL** | Seguridad y permisos |

#### 🚀 Sistema Completo y Funcional

##### ✅ Base de Datos:
- **Tablas principales**: Tenant, User, Account, Transaction, JournalEntry
- **Sistema legal**: legal_revisiones + 4 tablas relacionadas
- **Referencias correctas**: Todas las foreign keys funcionales
- **Tipos compatibles**: TEXT para IDs, fechas y montos correctos

##### ✅ Datos de Ejemplo:
- **Cuentas contables**: 13 cuentas básicas insertadas
- **Usuario administrador**: Creado sin errores
- **Tenant por defecto**: 'default-tenant' configurado
- **Revisiones legales**: Listas para insertar

##### ✅ Seguridad:
- **RLS implementado**: En todas las tablas
- **Políticas por tenant**: Aislamiento de datos
- **Índices optimizados**: Para rendimiento
- **Vistas funcionales**: Para consultas frecuentes

#### 📊 Orden de Ejecución para Producción

**Paso 1**: Base de Datos Principal
```sql
SUPABASE_COMPLETE.sql
```

**Paso 2**: Setup del Sistema
```sql
COMPLETE_SYSTEM_SETUP.sql
```

**Paso 3**: Sistema de Revisiones Legales
```sql
LEGAL_REVISIONES_SCHEMA.sql
```

**Paso 4**: Procedimientos Almacenados
```sql
LEGAL_REVISIONES_PROCEDURES_V2.sql
```

**Paso 5**: Seguridad y Permisos
```sql
SUPABASE_RLS_SETUP.sql
```

---

## Próximos Pasos

### Desarrollo Futuro

#### Próximas Características
- [ ] **Conciliación bancaria** automática
- [ ] **Integración SAR** directa con DGII
- [ ] **Móvil app** para captura de recibos
- [ ] **API pública** para integraciones
- [ ] **AI Assistant** para clasificación

#### Mejoras Técnicas
- [ ] **Testing unitario** completo
- [ ] **CI/CD pipeline** automatizado
- [ ] **Monitoring** y alertas
- [ ] **Performance optimization**

---

## Soporte

### Documentación
- **Wiki del proyecto** para desarrollo
- **Guías de usuario** final
- **API documentation** con Swagger

### Contribuciones
1. **Fork** el repositorio
2. **Crear branch** para features
3. **Submit PR** con cambios
4. **Seguir código style** del proyecto

---

**Desarrollado con ❤️ para contadores hondureños**

*Optimizado para cumplir con las normativas fiscales de Honduras incluyendo SAR, COF y declaraciones ISV.*

**System Version**: 1.0.0  
**Status**: Production Ready  
**Last Updated**: October 2024  
**Compatible**: Next.js 14, Prisma 5, React 18
