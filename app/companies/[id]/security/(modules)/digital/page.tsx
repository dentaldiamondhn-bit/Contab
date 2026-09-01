'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Key,
  Fingerprint,
  Database,
  Server,
  Eye,
  CheckCircle,
  Code,
  AlertTriangle,
  Lock
} from 'lucide-react';

const digitalSecurityItems = [
  {
    icon: Key,
    title: 'Manejo de API Keys',
    description: 'Protección de credenciales y variables sensibles',
    items: [
      'Variables de Entorno (.env) para API keys',
      'NUNCA subir credenciales a repositorios públicos (GitHub)',
      'Rotación periódica de keys cada 90 días',
      'Uso de secrets managers (AWS Secrets Manager, Azure Key Vault)',
      'Validación de scopes mínimos necesarios'
    ]
  },
  {
    icon: Fingerprint,
    title: 'Autenticación Robusta',
    description: 'Sistema de autenticación con 2FA',
    items: [
      'Auth.js (NextAuth) para gestión de sesiones',
      'Autenticación de dos pasos (2FA) obligatoria',
      'JWT con expiración corta (15 min)',
      'Refresh tokens rotativos',
      'Bloqueo tras 3 intentos fallidos',
      'Notificación de inicio de sesión en nuevos dispositivos'
    ]
  },
  {
    icon: Database,
    title: 'SQL Injection Prevention',
    description: 'Protección contra ataques de inyección SQL',
    items: [
      'Uso de ORMs (Prisma, Drizzle) para queries parametrizadas',
      'Validación estricta de inputs con Zod',
      'Principio de mínimo privilegio en DB',
      'Auditoría de queries sospechosos',
      'WAF (Web Application Firewall) activo'
    ]
  },
  {
    icon: Server,
    title: 'Certificados SSL/TLS',
    description: 'Comunicación cifrada HTTPS obligatoria',
    items: [
      'Certificado SSL válido y actualizado',
      'HTTPS forzado en todas las rutas',
      'HSTS (HTTP Strict Transport Security) habilitado',
      'Cifrado TLS 1.3 mínimo',
      'Renovación automática de certificados'
    ]
  },
  {
    icon: Eye,
    title: 'Monitoreo de Seguridad',
    description: 'Vigilancia continua del sistema',
    items: [
      'Logs de acceso centralizados',
      'Alertas de actividad anómala',
      'Escaneo de vulnerabilidades semanal',
      'Penetration testing anual',
      'Respuesta a incidentes documentada'
    ]
  }
];

export default function DigitalSecurityPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Server className="h-5 w-5 text-cyan-600" />
            Seguridad Digital (Next.js)
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Stack tecnológico: Next.js 14 + React + TypeScript + Supabase + Prisma
          </p>
        </div>
        <Badge variant="default" className="bg-cyan-600">Tecnología</Badge>
      </div>

      {/* Security Checklist */}
      <Card className="border-cyan-200 bg-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-cyan-800">
            <Code className="h-5 w-5" />
            Checklist de Seguridad para Desarrolladores
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Variables de entorno protegidas (.env)</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Autenticación con Auth.js implementada</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Queries parametrizadas con Prisma</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>HTTPS forzado en todas las rutas</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Validación de inputs con Zod</span>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <span>Logs de auditoría configurados</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {digitalSecurityItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <Card key={index} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-cyan-50 rounded-lg">
                    <Icon className="h-5 w-5 text-cyan-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{item.title}</CardTitle>
                    <CardDescription>{item.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {item.items.map((subItem, subIndex) => (
                    <li key={subIndex} className="flex items-start gap-2 text-sm">
                      <CheckCircle className="h-4 w-4 text-cyan-600 mt-0.5 flex-shrink-0" />
                      <span className="text-gray-700">{subItem}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Code Example */}
      <Card className="border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            Ejemplo: Protección de Rutas API
          </CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// app/api/patients/route.ts
import { auth } from '@clerk/nextjs';
import { z } from 'zod';

const patientSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().regex(/^\d{8}$/)
});

export async function POST(req: Request) {
  // 1. Verificar autenticación
  const { userId } = auth();
  if (!userId) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  // 2. Validar input
  const body = await req.json();
  const result = patientSchema.safeParse(body);
  if (!result.success) {
    return new Response('Invalid input', { status: 400 });
  }
  
  // 3. Verificar permisos (RBAC)
  const user = await getUserWithRole(userId);
  if (!canCreatePatients(user.role)) {
    return new Response('Forbidden', { status: 403 });
  }
  
  // 4. Crear paciente
  const patient = await prisma.patient.create({
    data: result.data
  });
  
  // 5. Log de auditoría
  await auditLog('PATIENT_CREATED', { userId, patientId: patient.id });
  
  return Response.json(patient);
}`}
          </pre>
        </CardContent>
      </Card>

      {/* Security Alert */}
      <Card className="border-red-200 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <Lock className="h-5 w-5" />
            Alerta de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-700 text-sm">
            Nunca expongas datos sensibles en el cliente. Las variables de entorno 
            que comienzan con NEXT_PUBLIC_ son accesibles desde el navegador. 
            Usa solo variables sin prefijo para secrets (API keys, tokens, etc.)
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
