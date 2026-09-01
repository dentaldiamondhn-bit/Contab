'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Calendar,
  CheckCircle,
  AlertTriangle,
  Clock,
  FileText,
  Shield,
  CreditCard,
  Database,
  HardHat
} from 'lucide-react';

const auditMatrix = [
  { nivel: 'Operativo', accion: 'Auditoría de limpieza de filtros y trampas', frecuencia: 'Semanal', icon: HardHat },
  { nivel: 'Financiero', accion: 'Conciliación de pagos vs. horas de uso de unidad', frecuencia: 'Quincenal', icon: CreditCard },
  { nivel: 'Técnico', accion: 'Backup de la base de datos de la web', frecuencia: 'Diario (Auto)', icon: Database },
  { nivel: 'Legal', accion: 'Revisión de vigencia de licencias de los dentistas', frecuencia: 'Semestral', icon: FileText },
];

export default function MatrixPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-orange-600" />
            Matriz de Control Operativo
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Cuadro de mando para auditoría mensual del proyecto
          </p>
        </div>
        <Badge variant="default" className="bg-orange-600">Auditoría</Badge>
      </div>

      {/* Matrix Table */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Nivel de Control</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Acción de Seguridad</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Frecuencia</th>
                  <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditMatrix.map((row, index) => {
                  const Icon = row.icon;
                  return (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-orange-600" />
                          <span className="font-medium">{row.nivel}</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-gray-700">{row.accion}</td>
                      <td className="py-3 px-4">
                        <Badge variant="outline" className="text-xs">
                          {row.frecuencia}
                        </Badge>
                      </td>
                      <td className="py-3 px-4">
                        <Badge className="bg-green-600 text-xs">
                          Completado
                        </Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Weekly Checklist */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Checklist de Auditoría Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {[
                'Verificar funcionamiento de cerraduras inteligentes',
                'Revisar cámaras de CCTV (grabación activa)',
                'Auditoría de limpieza de filtros de aire',
                'Revisión de trampas de residuos biológicos',
                'Verificar stock de insumos de bioseguridad'
              ].map((item, index) => (
                <li key={index} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" className="rounded border-gray-300" />
                  <span className="text-gray-700">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600" />
              Alertas y Vencimientos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2 bg-red-50 rounded border-l-4 border-red-500">
                <span className="text-sm text-red-800">Licencia Dr. Martínez - 15 días</span>
                <Badge className="bg-red-600 text-xs">Urgente</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-yellow-50 rounded border-l-4 border-yellow-500">
                <span className="text-sm text-yellow-800">Renovación seguro - 30 días</span>
                <Badge className="bg-yellow-600 text-xs">Pronto</Badge>
              </div>
              <div className="flex items-center justify-between p-2 bg-cyan-50 rounded border-l-4 border-cyan-500">
                <span className="text-sm text-cyan-800">Mantenimiento CCTV - 45 días</span>
                <Badge className="bg-cyan-600 text-xs">Programado</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Summary Card */}
      <Card className="bg-gradient-to-r from-orange-50 to-yellow-50 border border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-orange-600" />
            Resumen de Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">4/4</p>
              <p className="text-xs text-gray-600">Controles OK</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-red-600">1</p>
              <p className="text-xs text-gray-600">Alerta Urgente</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-yellow-600">2</p>
              <p className="text-xs text-gray-600">Próximos</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-cyan-600">5</p>
              <p className="text-xs text-gray-600">Tareas Semanales</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
