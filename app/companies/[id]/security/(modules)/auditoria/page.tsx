'use client';

import { use } from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import YearSelector from '../../components/YearSelector';
import { 
  Activity,
  ClipboardList,
  Building2,
  Bell,
  Shield,
  LockKeyhole,
  Users,
  Scale,
  Download,
  FileText,
  CheckCircle,
  Ban,
  AlertTriangle,
  Clock,
  FileSearch,
  Calendar
} from 'lucide-react';

interface AuditoriaPageProps {
  params: Promise<{
    id: string;
  }>;
}

const datosHistoricos = {
  '2026': [
    { fecha: '09/04/2026 14:30:15', usuario: 'admin@diamond.com', modulo: 'Facturación', accion: 'Creación Factura', detalle: 'Factura #001-001-01-000125 emitida', ip: '192.168.1.100', estado: 'normal' },
    { fecha: '09/04/2026 14:28:42', usuario: 'contador@diamond.com', modulo: 'Contabilidad', accion: 'Cierre Período', detalle: 'Marzo 2026 cerrado - Sin asientos huérfanos', ip: '192.168.1.105', estado: 'normal' },
    { fecha: '09/04/2026 03:15:22', usuario: 'desconocido', modulo: 'Login', accion: 'Intento Fallido', detalle: '3 intentos fallidos - Usuario bloqueado', ip: '45.XX.XX.XX', estado: 'critico' },
    { fecha: '08/04/2026 16:45:10', usuario: 'recepcion@diamond.com', modulo: 'Pacientes', accion: 'Modificación', detalle: 'Datos paciente #1245 actualizados', ip: '192.168.1.102', estado: 'normal' },
  ],
  '2025': [
    { fecha: '15/12/2025 10:30:15', usuario: 'admin@diamond.com', modulo: 'Facturación', accion: 'Creación Factura', detalle: 'Factura #001-001-01-000890 emitida', ip: '192.168.1.100', estado: 'normal' },
    { fecha: '15/12/2025 09:28:42', usuario: 'contador@diamond.com', modulo: 'Contabilidad', accion: 'Cierre Período', detalle: 'Diciembre 2025 cerrado - Validación completa', ip: '192.168.1.105', estado: 'normal' },
    { fecha: '14/12/2025 15:45:10', usuario: 'recepcion@diamond.com', modulo: 'Pacientes', accion: 'Modificación', detalle: 'Datos paciente #0890 actualizados', ip: '192.168.1.102', estado: 'normal' },
  ],
  '2024': [
    { fecha: '20/12/2024 11:30:15', usuario: 'admin@diamond.com', modulo: 'Facturación', accion: 'Creación Factura', detalle: 'Factura #001-001-01-000750 emitida', ip: '192.168.1.100', estado: 'normal' },
    { fecha: '20/12/2024 10:28:42', usuario: 'contador@diamond.com', modulo: 'Contabilidad', accion: 'Cierre Período', detalle: 'Diciembre 2024 cerrado - Validación completa', ip: '192.168.1.105', estado: 'normal' },
  ]
};

const usuarios = [
  { email: 'admin@diamond.com', rol: 'Admin', estado: 'Activo', ultimoAcceso: 'Hace 2 horas' },
  { email: 'contador@diamond.com', rol: 'Contador', estado: 'Activo', ultimoAcceso: 'Hoy 09:30' },
  { email: 'recepcion@diamond.com', rol: 'Recepción', estado: 'Activo', ultimoAcceso: 'Ayer 18:15' },
  { email: 'auxiliar@diamond.com', rol: 'Auxiliar', estado: 'Inactivo', ultimoAcceso: '10/03/2026' },
];

export default function AuditoriaPage({ params }: AuditoriaPageProps) {
  const { id: companyId } = use(params);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');
  const [logEntries, setLogEntries] = useState(datosHistoricos['2026']);

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
    setLogEntries(datosHistoricos[anio as keyof typeof datosHistoricos] || []);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Sistema de Auditoría y Control - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {anioSeleccionado === '2026' 
              ? 'Seguimiento completo de eventos, alertas y cumplimiento normativo SAR'
              : `Histórico de auditoría del año fiscal ${anioSeleccionado}`
            }
          </p>
        </div>
        <YearSelector 
          onYearChange={handleAnioChange}
          selectedYear={anioSeleccionado}
          badgeText={anioSeleccionado === '2026' ? 'Año Actual' : `Histórico ${anioSeleccionado}`}
        />
      </div>

      {/* 1. Audit Trail */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <ClipboardList className="h-5 w-5 text-blue-600" />
            1. Registro de Auditoría (Audit Trail)
          </CardTitle>
          <CardDescription>
            Historial completo de todas las acciones del sistema
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Filtros */}
            <div className="flex flex-wrap gap-2 mb-4">
              <Button size="sm" variant="outline" className="gap-2">
                <Building2 className="h-4 w-4" />
                Todos los Módulos
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Users className="h-4 w-4" />
                Todos los Usuarios
              </Button>
              <Button size="sm" variant="outline" className="gap-2">
                <Calendar className="h-4 w-4" />
                Últimos 7 días
              </Button>
              <Button size="sm" className="gap-2">
                <Download className="h-4 w-4" />
                Exportar Excel
              </Button>
            </div>

            {/* Tabla de Auditoría */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="text-left py-3 px-4 font-semibold">Fecha/Hora</th>
                    <th className="text-left py-3 px-4 font-semibold">Usuario</th>
                    <th className="text-left py-3 px-4 font-semibold">Módulo</th>
                    <th className="text-left py-3 px-4 font-semibold">Acción</th>
                    <th className="text-left py-3 px-4 font-semibold">Detalle</th>
                    <th className="text-left py-3 px-4 font-semibold">IP</th>
                    <th className="text-left py-3 px-4 font-semibold">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {logEntries.map((entry, i) => (
                    <tr key={i} className="hover:bg-gray-50">
                      <td className="py-3 px-4 font-mono text-xs">{entry.fecha}</td>
                      <td className="py-3 px-4">{entry.usuario}</td>
                      <td className="py-3 px-4">{entry.modulo}</td>
                      <td className="py-3 px-4">{entry.accion}</td>
                      <td className="py-3 px-4">{entry.detalle}</td>
                      <td className="py-3 px-4 font-mono text-xs">{entry.ip}</td>
                      <td className="py-3 px-4">
                        {entry.estado === 'normal' ? (
                          <Badge className="bg-green-600">Normal</Badge>
                        ) : entry.estado === 'critico' ? (
                          <Badge className="bg-red-600">Crítico</Badge>
                        ) : (
                          <Badge variant="outline">Advertencia</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Alertas de Seguridad */}
      <Card className="border-l-4 border-l-orange-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Bell className="h-5 w-5 text-orange-600" />
            2. Alertas de Seguridad
          </CardTitle>
          <CardDescription>
            Eventos críticos que requieren atención inmediata
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div>
                  <p className="font-medium text-red-800">Intento de Acceso No Autorizado</p>
                  <p className="text-sm text-red-600 mt-1">IP 45.XX.XX.XX - 3 intentos fallidos - Usuario bloqueado automáticamente</p>
                  <p className="text-xs text-red-500 mt-2">Hace 2 horas - 09/04/2026 03:15:22</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="flex items-start gap-3">
                <Shield className="h-5 w-5 text-yellow-600 mt-0.5" />
                <div>
                  <p className="font-medium text-yellow-800">Múltiples Cambios de Contraseña</p>
                  <p className="text-sm text-yellow-600 mt-1">Usuario contador@diamond.com - 5 cambios en 24 horas</p>
                  <p className="text-xs text-yellow-500 mt-2">Hace 1 día - 08/04/2026 14:30:00</p>
                </div>
              </div>
              <p className="text-xs text-gray-600">Libro Diario: Actualizado</p>
              <p className="text-xs text-gray-600">Libro Mayor: Cuadrado</p>
              <p className="text-xs text-green-600 mt-2">✓ Sin asientos huérfanos</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center justify-between mb-3">
                <p className="font-medium text-sm">Retenciones ISR</p>
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <p className="text-xs text-gray-600">Comprobantes: 15 emitidos</p>
              <p className="text-xs text-gray-600">Pendientes: 0</p>
              <p className="text-xs text-green-600 mt-2">✓ Reporte DET Live listo</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-purple-600" />
            Resumen del Sistema de Auditoría
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-3 bg-white rounded-lg text-center">
              <p className="text-2xl font-bold text-blue-600">1,245</p>
              <p className="text-xs text-gray-600">Eventos Registrados</p>
            </div>
            <div className="p-3 bg-white rounded-lg text-center">
              <p className="text-2xl font-bold text-red-600">3</p>
              <p className="text-xs text-gray-600">Alertas Críticas</p>
            </div>
            <div className="p-3 bg-white rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">4</p>
              <p className="text-xs text-gray-600">Usuarios Activos</p>
            </div>
            <div className="p-3 bg-white rounded-lg text-center">
              <p className="text-2xl font-bold text-purple-600">100%</p>
              <p className="text-xs text-gray-600">Cumplimiento SAR</p>
            </div>
            <div className="p-3 bg-white rounded-lg text-center">
              <p className="text-2xl font-bold text-indigo-600">7</p>
              <p className="text-xs text-gray-600">Reportes Generados</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
