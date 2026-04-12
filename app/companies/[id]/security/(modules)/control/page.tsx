'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield,
  Database,
  Code,
  Lock,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Ban,
  Scale
} from 'lucide-react';

export default function ControlPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            Estructura de Control y Lógica de Seguridad
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Base de datos y reglas de seguridad para control contable
          </p>
        </div>
        <Badge variant="default" className="bg-indigo-600">Control</Badge>
      </div>

      {/* Database Structure */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-blue-600" />
            1. Estructura de Control (Base de Datos)
          </CardTitle>
          <CardDescription>
            Tablas SQL para rangos CAI y períodos contables
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`-- Tabla de Rangos CAI
CREATE TABLE rangos_cai (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cai_code VARCHAR(50) NOT NULL,
  document_type VARCHAR(20) CHECK (document_type IN ('Factura', 'NotaCredito', 'NotaDebito')),
  rango_inicial BIGINT NOT NULL,
  rango_final BIGINT NOT NULL,
  ultimo_utilizado BIGINT DEFAULT 0,
  fecha_limite DATE NOT NULL,
  estado VARCHAR(20) DEFAULT 'Activo' CHECK (estado IN ('Activo', 'Proximo', 'Vencido')),
  empresa_id UUID REFERENCES empresas(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Tabla de Períodos Contables
CREATE TABLE periodos_contables (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anio INTEGER NOT NULL,
  mes INTEGER NOT NULL CHECK (mes BETWEEN 1 AND 12),
  cerrado BOOLEAN DEFAULT false,
  cerrado_por UUID REFERENCES auth.users(id),
  fecha_cierre TIMESTAMP,
  fecha_reapertura TIMESTAMP,
  justificacion_reapertura TEXT,
  empresa_id UUID REFERENCES empresas(id),
  created_at TIMESTAMP DEFAULT now()
);

-- Índices para performance
CREATE INDEX idx_rangos_cai_estado ON rangos_cai(estado);
CREATE INDEX idx_periodos_anio_mes ON periodos_contables(anio, mes);`}
          </pre>
        </CardContent>
      </Card>

      {/* 3 Golden Rules */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Scale className="h-5 w-5 text-yellow-600" />
            2. Lógica de Seguridad y Control - 3 Reglas de Oro
          </CardTitle>
          <CardDescription>
            Sistema de alertas, bloqueos y validaciones automáticas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <p className="font-medium">Alerta de Próximo Vencimiento</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Faltan &lt; 15 días para vencer CAI</li>
                <li>• Queda &lt; 5% del rango de números</li>
                <li>• Notificación por email y UI</li>
              </ul>
              <div className="mt-3 p-2 bg-white rounded border-l-2 border-yellow-500">
                <p className="text-xs font-mono text-yellow-700">
                  if (diasRestantes &lt; 15 || porcentajeRestante &lt; 5%)
                </p>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <Ban className="h-5 w-5 text-red-600" />
                <p className="font-medium">Bloqueo de Emisión</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Fecha actual &gt; fecha_limite</li>
                <li>• ultimo_utilizado == rango_final</li>
                <li>• Botón "Guardar Factura" disabled</li>
              </ul>
              <div className="mt-3 p-2 bg-white rounded border-l-2 border-red-500">
                <p className="text-xs font-mono text-red-700">
                  if (hoy &gt; fechaLimite || usado == final)
                </p>
              </div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium">Validación de Formato</p>
              </div>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>• Estándar hondureño: 000-001-01-00000001</li>
                <li>• Sucursal-Punto-Tipo-Correlativo</li>
                <li>• Regex: /^\d{'{3}'}-\d{'{3}'}-\d{'{2}'}-\d{'{8}'}$/</li>
              </ul>
              <div className="mt-3 p-2 bg-white rounded border-l-2 border-green-500">
                <p className="text-xs font-mono text-green-700">
                  validarFormatoFactura(numero)
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* React Implementation */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Code className="h-5 w-5 text-green-600" />
            3. Ejemplo de Implementación (React/Next.js)
          </CardTitle>
          <CardDescription>
            Código de validación para uso en frontend y backend
          </CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="bg-gray-900 text-gray-100 p-4 rounded-lg text-xs overflow-x-auto">
{`// lib/validaciones.ts

export async function validarCAI(caiCode: string): Promise&lt;boolean&gt; {
  const rango = await prisma.rangos_cai.findFirst({
    where: { cai_code: caiCode, estado: 'Activo' }
  });
  
  if (!rango) return false;
  
  const hoy = new Date();
  const fechaLimite = new Date(rango.fecha_limite);
  
  // Regla 1: Verificar vencimiento
  if (hoy > fechaLimite) {
    await prisma.rangos_cai.update({
      where: { id: rango.id },
      data: { estado: 'Vencido' }
    });
    return false;
  }
  
  // Regla 2: Verificar rango agotado
  if (rango.ultimo_utilizado >= rango.rango_final) {
    await prisma.rangos_cai.update({
      where: { id: rango.id },
      data: { estado: 'Vencido' }
    });
    return false;
  }
  
  return true;
}

export function validarFormatoFactura(numero: string): boolean {
  // Formato: 000-001-01-00000001
  const regex = /^\d{3}-\d{3}-\d{2}-\d{8}$/;
  return regex.test(numero);
}`}
          </pre>
        </CardContent>
      </Card>

      {/* Accounting Lock */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-purple-600" />
            4. Control de Integridad: "El Candado Contable"
          </CardTitle>
          <CardDescription>
            Sistema de cierre de períodos para garantizar integridad contable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <p className="font-medium text-sm">Estado de Períodos - 2026</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-sm">Enero</span>
                  <Badge className="bg-green-600 text-xs">Cerrado</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-sm">Febrero</span>
                  <Badge className="bg-green-600 text-xs">Cerrado</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-green-50 rounded border border-green-200">
                  <span className="text-sm">Marzo</span>
                  <Badge className="bg-green-600 text-xs">Cerrado</Badge>
                </div>
                <div className="flex items-center justify-between p-2 bg-blue-50 rounded border border-blue-200">
                  <span className="text-sm">Abril</span>
                  <Badge className="bg-blue-600 text-xs">Abierto</Badge>
                </div>
              </div>
            </div>
            <div>
              <p className="font-medium text-sm mb-3">API Route - Middleware de Protección</p>
              <pre className="bg-gray-900 text-gray-100 p-3 rounded-lg text-xs overflow-x-auto">
{`// app/api/asientos/route.ts
import { verificarPeriodoAbierto } from '@/lib/seguridad';

export async function POST(req: Request) {
  const { fecha, empresaId } = await req.json();
  
  // Verificar período
  const periodoAbierto = await verificarPeriodoAbierto(
    fecha, 
    empresaId
  );
  
  if (!periodoAbierto) {
    return new Response(
      JSON.stringify({
        error: 'El período está cerrado. ' +
               'Contacte al contador para reabrirlo.'
      }),
      { status: 403 }
    );
  }
  
  // Proceder con la creación...
}`}
              </pre>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Summary */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Estado de Controles de Seguridad
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">2</p>
              <p className="text-xs text-gray-600">CAI Activos</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">1</p>
              <p className="text-xs text-gray-600">Próximo a Vencer</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">3</p>
              <p className="text-xs text-gray-600">Períodos Cerrados</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-blue-600">1</p>
              <p className="text-xs text-gray-600">Período Abierto</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
