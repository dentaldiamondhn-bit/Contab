'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Search,
  FileText,
  Calendar,
  User,
  Building,
  Download,
  Eye,
  Ban,
  CheckCircle,
  AlertTriangle,
  Filter
} from 'lucide-react';
import { formatDateForDisplay } from '@/lib/date-utils';

interface ComprobanteHistorico {
  id: string;
  numero: string;
  fecha: string;
  proveedor: {
    nombre: string;
    rtn: string;
  };
  montoRetenido: number;
  tasa: number;
  baseImponible: number;
  descripcion: string;
  estado: 'vigente' | 'anulado';
  correlativo: string;
  codigoValidacion: string;
}

interface HistoricoRetencionesProps {
  onVerComprobante?: (comprobante: ComprobanteHistorico) => void;
  onReimprimir?: (comprobante: ComprobanteHistorico) => void;
  onAnular?: (comprobante: ComprobanteHistorico) => void;
}

export default function HistoricoRetenciones({ 
  onVerComprobante, 
  onReimprimir, 
  onAnular 
}: HistoricoRetencionesProps) {
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState<'todos' | 'vigente' | 'anulado'>('todos');
  const [mesSeleccionado, setMesSeleccionado] = useState('todos');

  // Datos simulados del histórico
  const [comprobantes] = useState<ComprobanteHistorico[]>([
    {
      id: '1',
      numero: 'CR-001-2026',
      fecha: '2026-04-09',
      proveedor: {
        nombre: 'Suministros Médicos S.A.',
        rtn: '0801-9000-01234'
      },
      montoRetenido: 100.00,
      tasa: 1,
      baseImponible: 10000.00,
      descripcion: 'Compra de materiales dentales',
      estado: 'vigente',
      correlativo: '000-002-05-00000124',
      codigoValidacion: 'ABC123XYZ789'
    },
    {
      id: '2',
      numero: 'CR-002-2026',
      fecha: '2026-04-08',
      proveedor: {
        nombre: 'Dr. Especialista HN',
        rtn: '0501-1990-00123'
      },
      montoRetenido: 625.00,
      tasa: 12.5,
      baseImponible: 5000.00,
      descripcion: 'Honorarios profesionales médicos',
      estado: 'vigente',
      correlativo: '000-002-05-00000125',
      codigoValidacion: 'DEF456ABC123'
    },
    {
      id: '3',
      numero: 'CR-003-2026',
      fecha: '2026-04-05',
      proveedor: {
        nombre: 'Servicios Dentales S.A.',
        rtn: '0801-2000-05678'
      },
      montoRetenido: 155.00,
      tasa: 1,
      baseImponible: 15500.00,
      descripcion: 'Equipamiento dental',
      estado: 'anulado',
      correlativo: '000-002-05-00000126',
      codigoValidacion: 'GHI789XYZ456'
    },
    {
      id: '4',
      numero: 'CR-004-2026',
      fecha: '2026-03-28',
      proveedor: {
        nombre: 'Laboratorio Dental Central',
        rtn: '0801-3000-07890'
      },
      montoRetenido: 87.50,
      tasa: 1,
      baseImponible: 8750.00,
      descripcion: 'Suministros de laboratorio',
      estado: 'vigente',
      correlativo: '000-002-05-00000127',
      codigoValidacion: 'JKL012ABC789'
    }
  ]);

  const comprobantesFiltrados = comprobantes.filter(comprobante => {
    const coincideBusqueda = 
      comprobante.proveedor.nombre.toLowerCase().includes(busqueda.toLowerCase()) ||
      comprobante.proveedor.rtn.includes(busqueda) ||
      comprobante.numero.toLowerCase().includes(busqueda.toLowerCase());
    
    const coincideEstado = filtroEstado === 'todos' || comprobante.estado === filtroEstado;
    
    const coincideMes = mesSeleccionado === 'todos' || 
      new Date(comprobante.fecha).getMonth() + 1 === parseInt(mesSeleccionado);
    
    return coincideBusqueda && coincideEstado && coincideMes;
  });

  const totalRetenido = comprobantesFiltrados
    .filter(c => c.estado === 'vigente')
    .reduce((sum, c) => sum + c.montoRetenido, 0);

  const handleAnularComprobante = (comprobante: ComprobanteHistorico) => {
    if (confirm(`¿Está seguro que desea anular el comprobante ${comprobante.numero}? Esta acción no se puede deshacer.`)) {
      onAnular?.(comprobante);
    }
  };

  const meses = [
    { value: 'todos', label: 'Todos los meses' },
    { value: '1', label: 'Enero' },
    { value: '2', label: 'Febrero' },
    { value: '3', label: 'Marzo' },
    { value: '4', label: 'Abril' },
    { value: '5', label: 'Mayo' },
    { value: '6', label: 'Junio' },
    { value: '7', label: 'Julio' },
    { value: '8', label: 'Agosto' },
    { value: '9', label: 'Septiembre' },
    { value: '10', label: 'Octubre' },
    { value: '11', label: 'Noviembre' },
    { value: '12', label: 'Diciembre' }
  ];

  return (
    <div className="space-y-4">
      {/* Resumen del mes */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-blue-700">{comprobantesFiltrados.length}</p>
              <p className="text-xs text-gray-600">Comprobantes Emitidos</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-700">L {totalRetenido.toFixed(2)}</p>
              <p className="text-xs text-gray-600">Total Retenido Vigente</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-700">
                {comprobantesFiltrados.filter(c => c.estado === 'anulado').length}
              </p>
              <p className="text-xs text-gray-600">Comprobantes Anulados</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-700">
                {comprobantesFiltrados.filter(c => c.tasa === 1).length}
              </p>
              <p className="text-xs text-gray-600">Retenciones del 1%</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filtros */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-blue-600" />
            Búsqueda y Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Buscar por RTN o Nombre</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Buscar proveedor..."
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Estado</label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value as 'todos' | 'vigente' | 'anulado')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="todos">Todos</option>
                <option value="vigente">Vigentes</option>
                <option value="anulado">Anulados</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Mes</label>
              <select
                value={mesSeleccionado}
                onChange={(e) => setMesSeleccionado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
              >
                {meses.map(mes => (
                  <option key={mes.value} value={mes.value}>{mes.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabla de comprobantes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-blue-600" />
            Histórico de Comprobantes de Retención
          </CardTitle>
          <CardDescription>
            Todos los comprobantes emitidos en el período fiscal actual
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Número</th>
                  <th className="text-left py-3 px-4 font-semibold">Fecha</th>
                  <th className="text-left py-3 px-4 font-semibold">Proveedor</th>
                  <th className="text-left py-3 px-4 font-semibold">RTN</th>
                  <th className="text-right py-3 px-4 font-semibold">Base Imponible</th>
                  <th className="text-right py-3 px-4 font-semibold">Tasa</th>
                  <th className="text-right py-3 px-4 font-semibold">Monto</th>
                  <th className="text-center py-3 px-4 font-semibold">Estado</th>
                  <th className="text-center py-3 px-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {comprobantesFiltrados.map((comprobante) => (
                  <tr key={comprobante.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-xs">{comprobante.numero}</td>
                    <td className="py-3 px-4">{formatDateForDisplay(comprobante.fecha)}</td>
                    <td className="py-3 px-4">{comprobante.proveedor.nombre}</td>
                    <td className="py-3 px-4 font-mono text-xs">{comprobante.proveedor.rtn}</td>
                    <td className="py-3 px-4 text-right">L {comprobante.baseImponible.toFixed(2)}</td>
                    <td className="py-3 px-4 text-right">{comprobante.tasa}%</td>
                    <td className="py-3 px-4 text-right font-medium">L {comprobante.montoRetenido.toFixed(2)}</td>
                    <td className="py-3 px-4 text-center">
                      {comprobante.estado === 'vigente' ? (
                        <Badge className="bg-green-600 text-xs">Vigente</Badge>
                      ) : (
                        <Badge variant="outline" className="bg-red-50 text-red-600 text-xs">Anulado</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onVerComprobante?.(comprobante)}
                          className="gap-1"
                        >
                          <Eye className="h-3 w-3" />
                          Ver
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onReimprimir?.(comprobante)}
                          className="gap-1"
                        >
                          <Download className="h-3 w-3" />
                          Reimprimir
                        </Button>
                        {comprobante.estado === 'vigente' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAnularComprobante(comprobante)}
                            className="gap-1 text-red-600 hover:bg-red-50"
                          >
                            <Ban className="h-3 w-3" />
                            Anular
                          </Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Información de validación */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <CheckCircle className="h-5 w-5 text-blue-600" />
            Validación de Comprobantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Código de Validación Electrónica</p>
                <p className="text-gray-600 text-xs">Cada comprobante tiene un código único para verificar su autenticidad en el portal del SAR</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
              <div>
                <p className="font-medium">Control de Correlativos</p>
                <p className="text-gray-600 text-xs">El sistema asigna números correlativos automáticos para evitar duplicados</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 mt-0.5" />
              <div>
                <p className="font-medium">Registro de Anulaciones</p>
                <p className="text-gray-600 text-xs">Las anulaciones quedan registradas en el historial con motivo y fecha</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
