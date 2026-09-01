'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList,
  Building2,
  Eye,
  CheckCircle,
  Ban,
  AlertTriangle,
  Clock,
  DollarSign,
  Download,
  FileText,
  Database
} from 'lucide-react';

const actividades = [
  { fecha: '09/04/2026 14:10', usuario: 'Admin_Dental', accion: 'Cierre de Mes', detalle: 'Se cerró el período: Marzo 2026', ip: '190.92.xx.xx', estado: 'normal' },
  { fecha: '09/04/2026 15:30', usuario: 'Aux_Contable1', accion: 'Anulación', detalle: 'Factura #001-001-01-000045 anulada', ip: '181.115.xx.xx', estado: 'normal' },
  { fecha: '09/04/2026 16:00', usuario: 'Admin_Dental', accion: 'Cambio CAI', detalle: 'Se registró nuevo CAI: 3B2D5...', ip: '190.92.xx.xx', estado: 'normal' },
  { fecha: '09/04/2026 03:15', usuario: 'Intento Fallido', accion: '⚠ Sospechoso', detalle: 'Intento de creación asiento en mes CERRADO', ip: '45.XX.XX.XX', estado: 'critico' },
  { fecha: '08/04/2026 22:45', usuario: 'Usuario_Externo', accion: 'Fuera Horario', detalle: 'Acceso fuera de horario laboral (22:45)', ip: '200.XX.XX.XX', estado: 'advertencia' },
];

export default function ReportePage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-cyan-600" />
            Reporte de Auditoría de Seguridad
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Log completo de actividades para auditoría SAR y control interno
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <FileText className="h-4 w-4" />
            Exportar PDF
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Database className="h-4 w-4" />
            Exportar Excel
          </Button>
        </div>
      </div>

      {/* Legal Header */}
      <Card className="border-l-4 border-l-cyan-500 bg-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Building2 className="h-5 w-5 text-cyan-600" />
            A. Encabezado Legal del Reporte
          </CardTitle>
          <CardDescription>
            Información oficial para validez ante auditorías del SAR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg border border-cyan-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Nombre de la Empresa</p>
              <p className="font-semibold text-cyan-900">Clínica Dental Diamond, S.A.</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-cyan-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide">RTN</p>
              <p className="font-semibold text-cyan-900">0801-1990-001234</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-cyan-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Rango de Fechas</p>
              <p className="font-semibold text-cyan-900">01/04/2026 - 09/04/2026</p>
            </div>
            <div className="p-4 bg-white rounded-lg border border-cyan-200">
              <p className="text-xs text-gray-500 uppercase tracking-wide">Generado Por</p>
              <p className="font-semibold text-cyan-900">Lic. Ana López (Admin)</p>
              <p className="text-xs text-gray-500">09/04/2026 17:30</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Activity Log */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5 text-cyan-600" />
                B. Log de Actividades de Seguridad
              </CardTitle>
              <CardDescription>
                Registro cronológico de todas las acciones relevantes
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <input type="date" className="px-3 py-1 border rounded text-sm" defaultValue="2026-04-01" />
              <span className="text-gray-400">-</span>
              <input type="date" className="px-3 py-1 border rounded text-sm" defaultValue="2026-04-09" />
              <Button size="sm" variant="outline">Filtrar</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Fecha/Hora</th>
                  <th className="text-left py-3 px-4 font-semibold">Usuario</th>
                  <th className="text-left py-3 px-4 font-semibold">Acción</th>
                  <th className="text-left py-3 px-4 font-semibold">Detalle del Cambio</th>
                  <th className="text-left py-3 px-4 font-semibold">IP Address</th>
                  <th className="text-left py-3 px-4 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {actividades.map((act, i) => (
                  <tr 
                    key={i} 
                    className={`hover:bg-gray-50 ${
                      act.estado === 'critico' ? 'bg-red-50' : 
                      act.estado === 'advertencia' ? 'bg-yellow-50' : ''
                    }`}
                  >
                    <td className={`py-3 px-4 text-sm font-mono ${act.estado === 'critico' ? 'font-bold' : ''}`}>
                      {act.fecha}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                          act.estado === 'critico' ? 'bg-red-100 text-red-600' :
                          act.estado === 'advertencia' ? 'bg-orange-100 text-orange-600' :
                          'bg-cyan-100'
                        }`}>
                          {act.usuario[0]}
                        </div>
                        <span className={`text-sm ${act.estado === 'critico' ? 'font-bold' : ''}`}>{act.usuario}</span>
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      <Badge className={`text-xs ${
                        act.estado === 'critico' ? 'bg-red-600' :
                        act.estado === 'advertencia' ? 'bg-orange-600' :
                        'bg-cyan-600'
                      }`}>
                        {act.accion}
                      </Badge>
                    </td>
                    <td className={`py-3 px-4 text-sm ${act.estado === 'critico' ? 'font-bold' : ''}`}>
                      {act.detalle}
                    </td>
                    <td className={`py-3 px-4 text-sm font-mono ${act.estado === 'critico' ? 'text-red-600' : 'text-gray-500'}`}>
                      {act.ip}
                    </td>
                    <td className="py-3 px-4">
                      {act.estado === 'normal' ? (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      ) : act.estado === 'critico' ? (
                        <Ban className="h-4 w-4 text-red-600" />
                      ) : (
                        <AlertTriangle className="h-4 w-4 text-orange-600" />
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      
      {/* Damage Control */}
      <Card className="border-l-4 border-l-red-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg text-red-600">
            <AlertTriangle className="h-5 w-5" />
            3. Características de "Control de Daños"
          </CardTitle>
          <CardDescription>
            Resaltado automático de actividades sospechosas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-center gap-2 mb-2">
                <Ban className="h-4 w-4 text-red-600" />
                <p className="font-medium text-sm">Intentos Fallidos</p>
              </div>
              <p className="text-xs text-gray-600">
                Marcar en <strong>negrita roja</strong> si alguien intentó borrar/modificar un asiento en mes cerrado
              </p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="h-4 w-4 text-orange-600" />
                <p className="font-medium text-sm">Acceso Fuera de Horario</p>
              </div>
              <p className="text-xs text-gray-600">
                Horario laboral: 2:00 PM - 10:00 PM. Actividad a las 3:00 AM = "Sospechosa"
              </p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-center gap-2 mb-2">
                <DollarSign className="h-4 w-4 text-yellow-600" />
                <p className="font-medium text-sm">Modificaciones de Montos</p>
              </div>
              <p className="text-xs text-gray-600">
                Si un asiento fue editado, mostrar <strong>Valor Anterior</strong> vs <strong>Valor Nuevo</strong>
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
