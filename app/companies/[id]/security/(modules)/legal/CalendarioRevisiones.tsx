'use client';

import { use } from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building,
  Shield,
  Download,
  Eye,
  Phone,
  FileCheck,
  Edit,
  Plus,
  Save,
  X
} from 'lucide-react';

interface CalendarioRevisionesProps {
  params: Promise<{
    id: string;
  }>;
}

interface RevisionLegal {
  id: string;
  categoria: 'arrendamiento' | 'seguro' | 'licencia';
  titulo: string;
  descripcion: string;
  fechaVencimiento: string;
  estado: 'vigente' | 'proximo' | 'vencido';
  monto?: number;
  detalles: { [key: string]: string };
  acciones: { [key: string]: string };
  contacto?: { nombre: string; telefono?: string; email?: string };
}

export default function CalendarioRevisiones({ params }: CalendarioRevisionesProps) {
  const { id: companyId } = use(params);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');
  const [revisiones, setRevisiones] = useState<RevisionLegal[]>([
    {
      id: '1',
      categoria: 'arrendamiento',
      titulo: 'Contrato de Arrendamiento - Consultorio Principal',
      descripcion: 'Local comercial en Colonia Los Robles',
      fechaVencimiento: '2026-12-31',
      estado: 'proximo',
      monto: 15000,
      detalles: {
        'Monto Alquiler': 'L 15,000.00',
        'Ajuste Anual': '5%',
        'Retención Aplicable': '10%',
        'Depósito Garantía': 'L 45,000.00',
        'Arrendador': 'Inmobiliaria Honduras S.A.'
      },
      acciones: {
        '60 días antes': 'Iniciar negociación de renovación',
        '30 días antes': 'Preparar ajuste presupuestario',
        '15 días antes': 'Verificar retención ISR'
      }
    },
    {
      id: '2',
      categoria: 'seguro',
      titulo: 'Póliza de Seguro - Responsabilidad Civil',
      descripcion: 'Cobertura general para la clínica dental',
      fechaVencimiento: '2026-06-15',
      estado: 'proximo',
      monto: 36000,
      detalles: {
        'Prima Anual': 'L 36,000.00',
        'Forma de Pago': '12 cuotas mensuales',
        'Cuota Mensual': 'L 3,000.00',
        'Compañía': 'Seguros Atlántida S.A.'
      },
      acciones: {
        '30 días antes': 'Solicitar cotización de renovación',
        '15 días antes': 'Verificar estado de pagos',
        '7 días antes': 'Confirmar renovación'
      },
      contacto: {
        nombre: 'Carlos Méndez',
        telefono: '504-2234-5678',
        email: 'carlos.mendez@segurosatlantida.hn'
      }
    },
    {
      id: '3',
      categoria: 'licencia',
      titulo: 'Permiso de Operación Municipal',
      descripcion: 'Licencia de funcionamiento emitida por Alcaldía',
      fechaVencimiento: '2026-12-31',
      estado: 'proximo',
      detalles: {
        'Impuesto Municipal': 'L 8,000.00',
        'Fecha Emisión': '2024-12-31',
        'Número de Licencia': 'MUN-2024-12345'
      },
      acciones: {
        'Enero de cada año': 'Tramitar solvencia municipal',
        '30 días antes': 'Preparar documentación',
        '15 días antes': 'Verificar pago impuesto'
      }
    },
    {
      id: '4',
      categoria: 'licencia',
      titulo: 'Colegiación de Cirujanos Dentistas',
      descripcion: 'Licencia profesional para odontólogos',
      fechaVencimiento: '2026-06-30',
      estado: 'proximo',
      detalles: {
        'Miembros Activos': '3',
        'Cuota Anual': 'L 6,000.00',
        'Fecha Último Pago': '2025-06-15'
      },
      acciones: {
        'Junio de cada año': 'Pagar cuota anual',
        '30 días antes': 'Verificar estado de pagos',
        '15 días antes': 'Actualizar documentación'
      }
    }
  ]);
  const [editando, setEditando] = useState(false);
  const [revisionEditando, setRevisionEditando] = useState<RevisionLegal | null>(null);

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'vigente': return 'bg-green-600';
      case 'proximo': return 'bg-yellow-600';
      case 'vencido': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getCategoriaIcon = (categoria: string) => {
    switch (categoria) {
      case 'arrendamiento': return Building;
      case 'seguro': return Shield;
      case 'licencia': return FileCheck;
      default: return FileText;
    }
  };

  const diasParaVencimiento = (fecha: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const diferencia = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-cyan-600" />
            Calendario de Revisiones Legales - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Control de vencimientos y renovaciones legales y contractuales
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={anioSeleccionado}
            onChange={(e) => handleAnioChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
          <Badge className={anioSeleccionado === '2026' ? 'bg-cyan-600' : 'bg-gray-600'}>
            {anioSeleccionado === '2026' ? 'Año Actual' : `Histórico ${anioSeleccionado}`}
          </Badge>
        </div>
      </div>

      {/* Vista de Calendario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-cyan-600" />
            Vista de Calendario
          </CardTitle>
          <CardDescription>
            Estado de las revisiones legales con indicadores de urgencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revisiones.map((revision) => {
              const Icon = getCategoriaIcon(revision.categoria);
              const dias = diasParaVencimiento(revision.fechaVencimiento);
              
              return (
                <Card key={revision.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-cyan-600" />
                        <Badge className={getEstadoColor(revision.estado)}>
                          {revision.estado}
                        </Badge>
                      </div>
                      <Clock className={`h-4 w-4 ${dias <= 30 ? 'text-orange-600' : dias <= 60 ? 'text-yellow-600' : 'text-green-600'}`} />
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2">
                      <div>
                        <p className="font-medium text-sm">{revision.titulo}</p>
                        <p className="text-xs text-gray-600">{revision.descripcion}</p>
                      </div>
                      
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Vencimiento:</span>
                          <span className="font-medium">{revision.fechaVencimiento}</span>
                        </div>
                        {revision.monto && (
                          <div className="flex justify-between">
                            <span className="text-gray-500">Monto:</span>
                            <span className="font-medium">L {revision.monto.toLocaleString()}</span>
                          </div>
                        )}
                      </div>

                      <div className="pt-2 border-t">
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">
                            {dias > 0 ? `${dias} días` : `Vencido hace ${Math.abs(dias)} días`}
                          </span>
                          <div className="flex gap-1">
                            <Button size="sm" variant="outline" className="text-xs h-7">
                              <Eye className="h-3 w-3" />
                            </Button>
                            {revision.contacto && (
                              <Button size="sm" className="text-xs h-7">
                                <Phone className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Resumen por Categoría */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Building className="h-5 w-5 text-cyan-600" />
              Arrendamiento
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Contratos Activos:</span>
                <span className="font-medium">1</span>
              </div>
              <div className="flex justify-between">
                <span>Monto Total:</span>
                <span className="font-medium">L 15,000</span>
              </div>
              <div className="flex justify-between">
                <span>Próximo Vencimiento:</span>
                <span className="font-medium text-yellow-600">31/12/2026</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Shield className="h-5 w-5 text-green-600" />
              Seguros
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Pólizas Activas:</span>
                <span className="font-medium">1</span>
              </div>
              <div className="flex justify-between">
                <span>Prima Total:</span>
                <span className="font-medium">L 36,000</span>
              </div>
              <div className="flex justify-between">
                <span>Próximo Vencimiento:</span>
                <span className="font-medium text-yellow-600">15/06/2026</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheck className="h-5 w-5 text-purple-600" />
              Licencias
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Licencias Activas:</span>
                <span className="font-medium">2</span>
              </div>
              <div className="flex justify-between">
                <span>Costo Anual:</span>
                <span className="font-medium">L 14,000</span>
              </div>
              <div className="flex justify-between">
                <span>Próximo Vencimiento:</span>
                <span className="font-medium text-yellow-600">30/06/2026</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
