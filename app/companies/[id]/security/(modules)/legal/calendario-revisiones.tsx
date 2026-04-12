'use client';

import { useState, useEffect } from 'react';
import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Building,
  Shield,
  Download,
  Eye,
  Phone,
  Mail,
  RefreshCw,
  FileCheck,
  AlertCircle,
  Home,
  Users,
  Heart
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
  proximaRevision?: string;
  estado: 'vigente' | 'proximo' | 'vencido' | 'pendiente';
  monto?: number;
  detalles: {
    [key: string]: string | number;
  };
  acciones: {
    [key: string]: string;
  };
  documentos: {
    [key: string]: {
      nombre: string;
      url?: string;
      tipo: string;
    };
  };
  contacto?: {
    nombre: string;
    telefono?: string;
    email?: string;
  };
}

export default function CalendarioRevisiones({ params }: CalendarioRevisionesProps) {
  const { id: companyId } = use(params);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');
  const [revisiones, setRevisiones] = useState<RevisionLegal[]>([
    {
      id: '1',
      categoria: 'arrendamiento',
      titulo: 'Contrato de Arrendamiento - Consultorio Principal',
      descripcion: 'Local comercial en Colonia Los Robles, Tegucigalpa',
      fechaVencimiento: '2026-12-31',
      proximaRevision: '2026-11-01',
      estado: 'proximo',
      monto: 15000,
      detalles: {
        'Monto Alquiler': 'L 15,000.00',
        'Ajuste Anual': '5%',
        'Retención Aplicable': '10%',
        'Depósito Garantía': 'L 45,000.00',
        'Arrendador': 'Inmobiliaria Honduras S.A.',
        'RTN Arrendador': '0801-1234-5678'
      },
      acciones: {
        '60 días antes': 'Iniciar negociación de renovación',
        '30 días antes': 'Preparar ajuste presupuestario',
        '15 días antes': 'Verificar retención ISR'
      },
      documentos: {
        'contrato': {
          nombre: 'Contrato de Arrendamiento 2024-2026',
          url: '/docs/contrato_arrendamiento.pdf',
          tipo: 'PDF'
        },
        'deposito': {
          nombre: 'Comprobante de Depósito',
          url: '/docs/deposito_garantia.pdf',
          tipo: 'PDF'
        }
      }
    },
    {
      id: '2',
      categoria: 'seguro',
      titulo: 'Póliza de Seguro - Responsabilidad Civil',
      descripcion: 'Cobertura general para la clínica dental',
      fechaVencimiento: '2026-06-15',
      proximaRevision: '2026-05-15',
      estado: 'proximo',
      monto: 36000,
      detalles: {
        'Prima Anual': 'L 36,000.00',
        'Forma de Pago': '12 cuotas mensuales',
        'Cuota Mensual': 'L 3,000.00',
        'Gasto Diferido': 'L 18,000.00',
        'Compañía': 'Seguros Atlántida S.A.',
        'Póliza': 'RC-2024-12345'
      },
      acciones: {
        '30 días antes': 'Solicitar cotización de renovación',
        '15 días antes': 'Verificar estado de pagos',
        '7 días antes': 'Confirmar renovación'
      },
      documentos: {
        'poliza': {
          nombre: 'Póliza de Seguro 2024-2026',
          url: '/docs/poliza_seguro.pdf',
          tipo: 'PDF'
        },
        'recibos': {
          nombre: 'Recibos de Prima',
          url: '/docs/recibos_seguro.pdf',
          tipo: 'PDF'
        }
      },
      contacto: {
        nombre: 'Carlos Méndez',
        telefono: '504-2234-5678',
        email: 'carlos.mendez@segurosatlantida.hn'
      }
    },
    {
      id: '3',
      categoria: 'seguro',
      titulo: 'Seguro de Vida para Empleados',
      descripcion: 'Póliza colectiva para personal administrativo',
      fechaVencimiento: '2026-08-20',
      proximaRevision: '2026-07-20',
      estado: 'proximo',
      monto: 12000,
      detalles: {
        'Prima Anual': 'L 12,000.00',
        'Empleados Cubiertos': '4',
        'Forma de Pago': '4 cuotas trimestrales',
        'Cuota Trimestral': 'L 3,000.00',
        'Compañía': 'Mapfre Seguros',
        'Póliza': 'V-2024-67890'
      },
      acciones: {
        '45 días antes': 'Evaluar necesidades de cobertura',
        '30 días antes': 'Obtener cotizaciones comparativas',
        '15 días antes': 'Confirmar renovación'
      },
      documentos: {
        'poliza': {
          nombre: 'Póliza de Vida Colectiva',
          url: '/docs/poliza_vida.pdf',
          tipo: 'PDF'
        }
      },
      contacto: {
        nombre: 'Ana Rodríguez',
        telefono: '504-9876-5432',
        email: 'ana.rodriguez@mapfre.hn'
      }
    },
    {
      id: '4',
      categoria: 'licencia',
      titulo: 'Permiso de Operación Municipal',
      descripcion: 'Licencia de funcionamiento emitida por Alcaldía',
      fechaVencimiento: '2026-12-31',
      proximaRevision: '2026-12-01',
      estado: 'proximo',
      detalles: {
        'Impuesto Municipal': 'L 8,000.00',
        'Fecha Emisión': '2024-12-31',
        'Número de Licencia': 'MUN-2024-12345',
        'Clasificación': 'Servicios de Salud'
      },
      acciones: {
        'Enero de cada año': 'Tramitar solvencia municipal',
        '30 días antes': 'Preparar documentación',
        '15 días antes': 'Verificar pago impuesto'
      },
      documentos: {
        'licencia': {
          nombre: 'Permiso Municipal 2024-2026',
          url: '/docs/licencia_municipal.pdf',
          tipo: 'PDF'
        }
      }
    },
    {
      id: '5',
      categoria: 'licencia',
      titulo: 'Colegiación de Cirujanos Dentistas',
      descripcion: 'Licencia profesional para odontólogos',
      fechaVencimiento: '2026-06-30',
      proximaRevision: '2026-06-01',
      estado: 'proximo',
      detalles: {
        'Miembros Activos': '3',
        'Cuota Anual': 'L 6,000.00',
        'Fecha Último Pago': '2025-06-15',
        'Número de Colegiado': 'CCD-2024-67890'
      },
      acciones: {
        'Junio de cada año': 'Pagar cuota anual',
        '30 días antes': 'Verificar estado de pagos',
        '15 días antes': 'Actualizar documentación'
      },
      documentos: {
        'colegiatura': {
          nombre: 'Carnet del Colegio',
          url: '/docs/carnet_colegiatura.pdf',
          tipo: 'PDF'
        }
      }
    },
    {
      id: '6',
      categoria: 'licencia',
      titulo: 'Licencia Sanitaria ARSA',
      descripcion: 'Autorización sanitaria para establecimiento de salud',
      fechaVencimiento: '2026-09-15',
      proximaRevision: '2026-08-15',
      estado: 'proximo',
      detalles: {
        'Fecha Inspección': '2025-09-15',
        'Categoría': 'Clínica Dental',
        'Número de Registro': 'ARSA-2024-12345',
        'Próxima Inspección': '2026-09-15'
      },
      acciones: {
        '60 días antes': 'Preparar establecimiento',
        '30 días antes': 'Actualizar documentación',
        '15 días antes': 'Confirmar inspección'
      },
      documentos: {
        'licencia': {
          nombre: 'Licencia Sanitaria ARSA',
          url: '/docs/licencia_arsa.pdf',
          tipo: 'PDF'
        }
      }
    },
    {
      id: '7',
      categoria: 'licencia',
      titulo: 'Carnet del Colegio de Contadores',
      descripcion: 'Facultad para firmar estados financieros',
      fechaVencimiento: '2026-12-31',
      proximaRevision: '2026-11-01',
      estado: 'proximo',
      detalles: {
        'Número de Carnet': 'CCP-2024-98765',
        'Fecha Emisión': '2024-12-31',
        'Estado': 'Activo',
        'Miembros Facultados': '2'
      },
      acciones: {
        'Noviembre de cada año': 'Renovar carnet',
        '30 días antes': 'Verificar requisitos',
        '15 días antes': 'Actualizar cursos'
      },
      documentos: {
        'carnet': {
          nombre: 'Carnet del Colegio de Contadores',
          url: '/docs/carnet_contadores.pdf',
          tipo: 'PDF'
        }
      }
    }
  ]);

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'vigente': return 'bg-green-600';
      case 'proximo': return 'bg-yellow-600';
      case 'vencido': return 'bg-red-600';
      case 'pendiente': return 'bg-orange-600';
      default: return 'bg-gray-600';
    }
  };

  const getEstadoIcon = (estado: string) => {
    switch (estado) {
      case 'vigente': return CheckCircle;
      case 'proximo': return Clock;
      case 'vencido': return AlertTriangle;
      case 'pendiente': return AlertCircle;
      default: return Clock;
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

  const getUrgenciaColor = (dias: number) => {
    if (dias < 0) return 'text-red-600';
    if (dias <= 30) return 'text-orange-600';
    if (dias <= 60) return 'text-yellow-600';
    return 'text-green-600';
  };

  const revisionesOrdenadas = [...revisiones].sort((a, b) => {
    return new Date(a.fechaVencimiento).getTime() - new Date(b.fechaVencimiento).getTime();
  });

  const proximosEventos = revisionesOrdenadas.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Calendar className="h-5 w-5 text-blue-600" />
            Calendario de Revisiones Legales - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {anioSeleccionado === '2026' 
              ? 'Control de vencimientos y renovaciones legales y contractuales'
              : `Histórico legal del año fiscal ${anioSeleccionado}`
            }
        </div>
        <div className="flex items-center gap-3">
          <select
            value={anioSeleccionado}
            onChange={(e) => handleAnioChange(e.target.value)}
            className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="2026">2026</option>
            <option value="2025">2025</option>
            <option value="2024">2024</option>
          </select>
          <Badge className={anioSeleccionado === '2026' ? 'bg-blue-600' : 'bg-gray-600'}>
            {anioSeleccionado === '2026' ? 'Año Actual' : `Histórico ${anioSeleccionado}`}
          </Badge>
        </div>
      </div>

      {/* Vista de Calendario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calendar className="h-5 w-5 text-blue-600" />
            Vista de Calendario
          </CardTitle>
          <CardDescription>
            Estado de las revisiones legales con indicadores de urgencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revisionesOrdenadas.map((revision) => {
              const Icon = getCategoriaIcon(revision.categoria);
              const EstadoIcon = getEstadoIcon(revision.estado);
              const dias = diasParaVencimiento(revision.fechaVencimiento);
              
              return (
                <Card key={revision.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-blue-600" />
                        <Badge className={getEstadoColor(revision.estado)} text-xs">
                          {revision.estado}
                        </Badge>
                      </div>
                      <EstadoIcon className={`h-4 w-4 ${getUrgenciaColor(dias)}`} />
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
                          <span className={`font-medium ${getUrgenciaColor(dias)}`}>
                            {revision.fechaVencimiento}
                          </span>
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
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-7"
                              onClick={() => {
                                if (revision.documentos.contrato) {
                                  console.log('Ver documento:', revision.documentos.contrato.url);
                                }
                              }}
                            >
                              <Eye className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              className="text-xs h-7"
                              onClick={() => {
                                if (revision.contact) {
                                  console.log('Contactar:', revision.contact);
                                }
                              }}
                            >
                              <Phone className="h-3 w-3" />
                            </Button>
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

      {/* Próximos Eventos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-orange-600" />
            Próximos Eventos
          </CardTitle>
          <CardDescription>
            Las 5 revisiones más cercanas que requieren atención
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {proximosEventos.map((revision, index) => {
              const dias = diasParaVencimiento(revision.fechaVencimiento);
              const Icon = getCategoriaIcon(revision.categoria);
              
              return (
                <div key={revision.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <Icon className={`h-4 w-4 ${getUrgenciaColor(dias)}`} />
                    <div>
                      <p className="font-medium text-sm">{revision.titulo}</p>
                      <p className="text-xs text-gray-500">
                        {dias > 0 ? `En ${dias} días` : `Vencido hace ${Math.abs(dias)} días`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className={getEstadoColor(revision.estado)} text-xs">
                      {revision.estado}
                    </Badge>
                    <p className="text-xs text-gray-500 mt-1">
                      {revision.fechaVencimiento}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Gestor de Documentos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileText className="h-5 w-5 text-green-600" />
            Gestor de Documentos
          </CardTitle>
          <CardDescription>
            Acceso rápido a documentos legales escaneados
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(
              revisiones.reduce((docs, revision) => {
                Object.entries(revision.documentos).forEach(([key, doc]) => {
                  docs[key] = { ...doc, categoria: revision.categoria, titulo: revision.titulo };
                });
                return docs;
              }, {} as any)
            ).map(([key, doc], index) => {
              const Icon = getCategoriaIcon(doc.categoria);
              
              return (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Icon className="h-4 w-4 text-blue-600" />
                      <span className="text-sm font-medium">{doc.titulo}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {doc.tipo}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{doc.nombre}</p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs h-7"
                      onClick={() => {
                        console.log('Ver documento:', doc.url);
                      }}
                    >
                      <Eye className="h-3 w-3" />
                      Ver
                    </Button>
                    <Button
                      size="sm"
                      className="text-xs h-7"
                      onClick={() => {
                        console.log('Descargar documento:', doc.url);
                      }}
                    >
                      <Download className="h-3 w-3" />
                      Descargar
                    </Button>
                  </div>
                </div>
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
              <Building className="h-5 w-5 text-blue-600" />
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
                <span className="font-medium">2</span>
              </div>
              <div className="flex justify-between">
                <span>Prima Total:</span>
                <span className="font-medium">L 48,000</span>
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
                <span className="font-medium">5</span>
              </div>
              <div className="flex justify-between">
                <span>Costo Anual:</span>
                <span className="font-medium">L 22,000</span>
              </div>
              <div className="flex justify-between">
                <span>Próximo Vencimiento:</span>
                <span className="font-medium text-yellow-600">30/06/2026</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </Card>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <RefreshCw className="h-5 w-5 text-blue-600" />
            Acciones Rápidas
          </CardTitle>
          <CardDescription>
            Tareas comunes y accesos directos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" className="gap-2">
              <FileText className="h-4 w-4" />
              Contrato Nuevo
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Shield className="h-4 w-4" />
              Cotizar Seguro
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <FileCheck className="h-4 w-4" />
              Renovar Licencia
            </Button>
            <Button variant="outline" size="sm" className="gap-2">
              <Users className="h-4 w-4" />
              Verificar Colegiatura
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
