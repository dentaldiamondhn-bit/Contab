'use client';

import { use } from 'react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import YearSelector from '../../components/YearSelector';
import { 
  Scale,
  FileText,
  Ban,
  CheckCircle,
  Users,
  Database,
  AlertTriangle,
  Lock
} from 'lucide-react';

interface SARCompliancePageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function SARCompliancePage({ params }: SARCompliancePageProps) {
  const { id: companyId } = use(params);
  const router = useRouter();
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
  };

  const handleSolicitarNuevoCAI = () => {
    // Abrir el sitio web del SAR en una nueva pestaña
    window.open('https://oficinavirtual.sar.gob.hn/', '_blank');
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Scale className="h-5 w-5 text-purple-600" />
            Cumplimiento Fiscal SAR - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {anioSeleccionado === '2026' 
              ? 'Gestión de reportes y cumplimiento con normativa tributaria'
              : `Histórico de cumplimiento fiscal del año ${anioSeleccionado}`
            }
          </p>
        </div>
        <YearSelector 
          onYearChange={handleAnioChange}
          selectedYear={anioSeleccionado}
          badgeText={anioSeleccionado === '2026' ? 'Año Actual' : `Histórico ${anioSeleccionado}`}
        />
      </div>

      {/* SAR Badge */}
      <div className="flex items-center gap-3">
        <Badge variant="default" className="bg-purple-600">SAR Honduras</Badge>
      </div>

      {/* CAI Management */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-purple-600" />
            1. Bloqueo de Rangos CAI Agotados
          </CardTitle>
          <CardDescription>
            Control automático de autorizaciones de impresión
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <p className="font-medium">Rango Activo</p>
              </div>
              <p className="text-sm text-gray-600">Facturas: 001-001-01</p>
              <p className="text-sm text-gray-600">Del 00000001 al 00010000</p>
              <p className="text-sm text-gray-600 mt-2">Usados: 234 / 10,000</p>
              <div className="mt-2 w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div className="w-[2%] h-full bg-green-500"></div>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-3">
                <Ban className="h-5 w-5 text-red-600" />
                <p className="font-medium">Rango Bloqueado</p>
              </div>
              <p className="text-sm text-gray-600">Notas Crédito: 001-002-01</p>
              <p className="text-sm text-gray-600">Del 00000001 al 00005000</p>
              <p className="text-sm text-red-600 mt-2">Agotado el 15/03/2026</p>
              <Button 
                size="sm" 
                className="mt-2 bg-purple-600 text-xs"
                onClick={handleSolicitarNuevoCAI}
              >
                Solicitar Nuevo CAI
              </Button>
            </div>
          </div>
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-600">
              <strong>Regla de Validación:</strong> El sistema verifica automáticamente 
              si el CAI está vigente antes de permitir la emisión de cualquier documento.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* RTN Validation */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-blue-600" />
            2. Validación de RTN en Clientes/Proveedores
          </CardTitle>
          <CardDescription>
            Verificación de Registro Tributario Nacional
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="font-medium">Paciente: Juan Pérez</p>
                  <p className="text-sm text-gray-500">RTN: 0801-1990-12345</p>
                </div>
              </div>
              <Badge className="bg-green-600">Válido</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600" />
                <div>
                  <p className="font-medium">Proveedor: Suministros SA</p>
                  <p className="text-sm text-gray-500">RTN: 0801-2000-54321 (Pendiente verificación)</p>
                </div>
              </div>
              <Badge className="bg-yellow-600">Pendiente</Badge>
            </div>
          </div>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800">
              <strong>Formato requerido:</strong> 0801-XXXX-XXXXX (14 dígitos). 
              El sistema valida el dígito verificador antes de permitir la facturación.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Document Protection */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lock className="h-5 w-5 text-orange-600" />
            3. Protección de Documentos Fiscales
          </CardTitle>
          <CardDescription>
            Seguridad y trazabilidad de facturas emitidas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="font-medium text-sm mb-2">Encriptación</p>
              <p className="text-xs text-gray-600">
                Todas las facturas se almacenan encriptadas AES-256
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="font-medium text-sm mb-2">Backup</p>
              <p className="text-xs text-gray-600">
                Respaldo automático diario en múltiples ubicaciones
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="font-medium text-sm mb-2">Trazabilidad</p>
              <p className="text-xs text-gray-600">
                Cada factura tiene hash único e inmutable
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Role Segregation */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Users className="h-5 w-5 text-green-600" />
            4. Segregación de Funciones
          </CardTitle>
          <CardDescription>
            Roles definidos para control interno
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4">Rol</th>
                  <th className="text-left py-3 px-4">Emitir Factura</th>
                  <th className="text-left py-3 px-4">Anular</th>
                  <th className="text-left py-3 px-4">Reportes SAR</th>
                  <th className="text-left py-3 px-4">Gestión CAI</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Administrador</td>
                  <td className="py-3 px-4"><CheckCircle className="h-4 w-4 text-green-600" /></td>
                  <td className="py-3 px-4"><CheckCircle className="h-4 w-4 text-green-600" /></td>
                  <td className="py-3 px-4"><CheckCircle className="h-4 w-4 text-green-600" /></td>
                  <td className="py-3 px-4"><CheckCircle className="h-4 w-4 text-green-600" /></td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Contador</td>
                  <td className="py-3 px-4"><CheckCircle className="h-4 w-4 text-green-600" /></td>
                  <td className="py-3 px-4"><CheckCircle className="h-4 w-4 text-green-600" /></td>
                  <td className="py-3 px-4"><CheckCircle className="h-4 w-4 text-green-600" /></td>
                  <td className="py-3 px-4">-</td>
                </tr>
                <tr className="border-b">
                  <td className="py-3 px-4 font-medium">Recepción</td>
                  <td className="py-3 px-4"><CheckCircle className="h-4 w-4 text-green-600" /></td>
                  <td className="py-3 px-4">-</td>
                  <td className="py-3 px-4">-</td>
                  <td className="py-3 px-4">-</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Audit Trail */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-indigo-600" />
            5. Pista de Auditoría (Audit Trail)
          </CardTitle>
          <CardDescription>
            Registro inmutable de todas las operaciones fiscales
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-500">09/04/2026 14:30:15</span>
                <span className="font-medium">Factura #001-001-01-000125</span>
                <span className="text-gray-600">emitida por Dr. Martínez</span>
              </div>
              <Badge variant="outline" className="text-xs">Hash: 7a3f...9e2b</Badge>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex items-center gap-3">
                <span className="text-gray-500">09/04/2026 14:28:42</span>
                <span className="font-medium">Nota Crédito #001-002-01-000008</span>
                <span className="text-gray-600">anulada por Contador López</span>
              </div>
              <Badge variant="outline" className="text-xs">Hash: 8b4g...1f3c</Badge>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
