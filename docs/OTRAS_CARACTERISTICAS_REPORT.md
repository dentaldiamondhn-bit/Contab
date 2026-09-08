# Reporte de Estado y Plan de Ejecución: Otras Características

## 1. Estado Actual del Código

### 1.1 Resumen Ejecutivo

| Sub-Área | Estado | UI Pages | API Routes | DB Tables | Almacenamiento |
|---|---|---|---|---|---|
| **Sistema de Notificaciones** | Básico | 0 | 0 | 1 tabla | Supabase (stub) |
| **Integración por Correo** | Básico | 0 | 0 | 1 tabla | Simulado |
| **Carga de Archivos** | Parcial | Settings page | — | 5 tablas (Prisma) | Supabase Storage |
| **Importación/Exportación** | Completo | 1 página | 2 rutas | — | Excel/CSV |
| **Impresión/PDF** | Parcial | — | — | — | HTML (placeholder) |
| **Backup/Restore** | Básico | 0 | 0 | 0 | Scripts |
| **Configuración** | Básico | 1 página | — | 1 tabla | Prisma |

### 1.2 Métricas de Madurez

| Métrica | Valor | Observación |
|---|---|---|
| Completitud Funcional | ~35% | Importación fuerte; notificaciones y correo son stubs |
| Cobertura de Pruebas | 0% | No existen pruebas |
| Integración Externa | ~20% | Correo simulado, push sin configurar |
| Persistencia | ~40% | Archivos en Supabase Storage; configuración en Prisma |

---

## 2. Inventario Detallado

### 2.1 Sistema de Notificaciones

**Estado: Básico (~15%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/push-notifications.ts` | Web Push: configuración VAPID, `sendPushToTenantUsers()`, limpieza de suscripciones expiradas, tabla `PushSubscription` en Supabase |

#### Lo que Falta

- **VAPID keys no configuradas** (stub)
- Sin centro de notificaciones in-app
- Sin preferencias de notificación por usuario
- Sin notificaciones por correo real
- Sin notificaciones de recordatorio (vencimientos, pagos)

---

### 2.2 Integración por Correo

**Estado: Básico (~15%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/mail.ts` | Servicio de correo: `sendModuleUpdateEmail()` con plantillas React Email; Resend/SendGrid **comentado** (simulado) |
| `lib/ModuleUpdateEmail.tsx` | Plantilla React Email |
| `components/TicketEmailLog` (Prisma) | Registro de correos de tickets de soporte |

#### Lo que Falta

- **Resend/SendGrid está comentado** — el envío es simulado
- Sin envío de facturas por correo
- Sin recordatorios de pago
- Sin notificaciones de aprobación

---

### 2.3 Carga de Archivos

**Estado: Parcial (~45%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/settings/page.tsx` | Página de configuración: carga de firma digital y sello profesional vía Supabase Storage bucket `contador-profiles` |
| `types/file.ts` | Definiciones de tipos de archivo |

#### Modelos Prisma (Robustos)

- `File` — id, tenantId, originalName, fileName, filePath, fileSize, mimeType, fileType, category, description, tags, uploadedBy, status, metadata
- `FileProcessing` — processingType, status, progress, totalRows, processedRows, errorCount, errors, warnings, results
- `FileTemplate` — name, templateType, fileId, schema, isActive, isDefault
- `FileActivity` — fileId, userId, action, details, ipAddress, userAgent
- `CompanyLogo` — tenantId, logoUrl, logoName, logoSize, logoType

#### Lo que Falta

- UI general de gestión de archivos (solo settings)
- Sin upload de documentos de empleados (solo base64)
- Sin gestión de templates

---

### 2.4 Importación/Exportación

**Estado: Completo (~80%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/services/excel-import.ts` | Importación Excel (520 líneas): cuentas, transacciones, catálogo; plantillas; validación; transacciones agrupadas con balance débito/crédito |
| `app/import-export/page.tsx` | Página: carga de archivos (xlsx/xls/csv), botones de exportación (transacciones Excel, balance PDF, cuentas Excel), historial de importaciones |
| `components/ExcelImporter.tsx` | Componente importador Excel |
| `components/BankExcelImporter.tsx` | Importador de extractos bancarios |
| `lib/services/bank-excel-mapper.ts` | Detección automática de 9 bancos hondureños (BAC, Ficohsa, Banpais, Atlántida, Davivienda, Occidente, Promerica, Banrural, Lafise), mapeo de columnas |
| `app/lib/services/bank-statement-parser.ts` | Parser de extractos: formatos BAC, Ficohsa, genérico |
| `app/api/import-excel/route.ts` | API de importación |
| `app/api/parse-excel/route.ts` | API de parsing |

---

### 2.5 Impresión/PDF

**Estado: Parcial (~35%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `lib/services/pdf-export.ts` | Generación HTML con formato (Times New Roman, tamaño carta, bloques de firma, cumplimiento SAR); `htmlToPDF` retorna HTML como Buffer (**placeholder**) |
| `components/reports/PDFDownloadLink.tsx` | Componente de descarga |
| `components/reports/SignatureBlock.tsx` | Bloque de firmas |
| `templates/invoice-template.html` | Plantilla HTML de factura |

#### Lo que Falta

- **htmlToPDF es placeholder** — no genera PDF real
- Sin librería de PDF instalada (jspdf, @react-pdf/renderer)
- Sin plantillas de impresión por módulo

---

### 2.6 Configuración

**Estado: Básico (~30%)**

#### Archivos Implementados

| Archivo | Propósito |
|---|---|
| `app/settings/page.tsx` | Perfil de contador (numColegiacion, cargo, teléfono), carga de firma y sello |
| `scripts/setup-system-config.ts` | Script de configuración |
| `SystemConfig` (Prisma) — key, value, description, isActive, tenantId |

#### Lo que Falta

- UI de configuración general del sistema
- Configuración de moneda, idioma, formato de fechas
- Gestión de módulos activos/inactivos

---

## 3. Problemas Críticos

| # | Problema | Impacto | Prioridad |
|---|---|---|---|
| 1 | Correo electrónico simulado | Sin notificaciones reales | Crítica |
| 2 | Push notifications sin configurar | Sin alertas | Alta |
| 3 | PDF es placeholder | Sin impresión profesional | Alta |
| 4 | Sin backup/restore | Sin recuperación de datos | Alta |
| 5 | Sin configuración general del sistema | Sin personalización | Media |

---

## 4. Matriz del Plan por Etapas

### Etapa 1: Correo Electrónico Real

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 1.1 | Configurar Resend o SendGrid | `lib/mail.ts` | Proveedor activo |
| 1.2 | Correo de envío de facturas | `lib/services/invoice-email.ts` | Envío de facturas |
| 1.3 | Recordatorios de pago | `lib/services/payment-reminders.ts` | Automatización |
| 1.4 | Notificaciones de aprobación | `lib/services/approval-notifications.ts` | Notificaciones |

### Etapa 2: Notificaciones In-App

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 2.1 | Centro de notificaciones | `components/notifications/NotificationCenter.tsx` | UI |
| 2.2 | Tabla de notificaciones | `supabase/NOTIFICATIONS.sql` | Almacenamiento |
| 2.3 | Preferencias por usuario | `lib/services/notification-preferences.ts` | Configuración |

### Etapa 3: PDF Profesional

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 3.1 | Instalar jspdf o @react-pdf/renderer | `package.json` | Dependencia |
| 3.2 | Generador de PDF server-side | `lib/services/pdf-generator.ts` | PDF funcional |
| 3.3 | Plantillas por módulo | `templates/pdf/` | Plantillas |

### Etapa 4: Backup y Configuración

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 4.1 | Sistema de backup automático | `lib/services/backup-service.ts` | Backup |
| 4.2 | Restore de datos | `lib/services/restore-service.ts` | Restore |
| 4.3 | UI de configuración general | `app/settings/general/page.tsx` | Configuración |

### Etapa 5: QA

| # | Tarea | Archivos | Entregable |
|---|---|---|---|
| 5.1 | Pruebas de envío de correo | `__tests__/notifications/` | Pruebas |
| 5.2 | Pruebas de importación | `__tests__/import/` | Pruebas |

---

## 5. Estimación de Esfuerzo

| Etapa | Tareas | Complejidad | Estimación |
|---|---|---|---|
| Etapa 1: Correo | 4 tareas | Media | 2-3 semanas |
| Etapa 2: Notificaciones | 3 tareas | Media | 2-3 semanas |
| Etapa 3: PDF | 3 tareas | Alta | 2-3 semanas |
| Etapa 4: Backup | 3 tareas | Media | 2-3 semanas |
| Etapa 5: QA | 2 tareas | Media | 1 semana |
| **Total** | **15 tareas** | — | **9-13 semanas** |

---

## Actualizaciones de Infraestructura (8 Sept 2026)

| Cambio | Detalle |
|---|---|
| Vercel SpeedInsights + Analytics | `<SpeedInsights />` y `<Analytics />` integrados en layout raíz |
| Clerk SDK migrado | `@clerk/clerk-sdk-node` eliminado (deprecado), reemplazado por `lib/clerk-api.ts` (REST API directa) |
| Supabase lazy init | Clientes inicializados bajo demanda via Proxy, evita errores de build en Vercel |
| Next.js 15.5.25 | Downgraded desde 16.x (bug de Turbopack con .nft.json en Vercel) |
| 0 vulnerabilidades npm | Todas las dependencias auditadas y resueltas |
