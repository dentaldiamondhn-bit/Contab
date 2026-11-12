'use client';

import { use, useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import YearSelector from '../../components/YearSelector';
import { useRevisionesLegales } from './api-hook';
import { 
  Shield,
  FileCheck,
  FileText,
  Clock,
  CheckCircle,
  Edit,
  Plus,
  Save,
  X,
  Building,
  Shield as ShieldIcon,
  FileCheck as FileCheckIcon,
  Phone,
  RefreshCw
} from 'lucide-react';

interface RevisionLegal {
  id: string;
  categoria: 'arrendamiento' | 'seguro' | 'licencia';
  titulo: string;
  descripcion: string;
  fechaVencimiento: string;
  estado: 'vigente' | 'proximo' | 'vencido';
  monto?: number;
  detalles: { [key: string]: string };
  contacto?: { nombre: string; telefono?: string; email?: string };
}

interface LegalSecurityPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function LegalSecurityPage({ params }: LegalSecurityPageProps) {
  const { id: companyId } = use(params);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');
  const [editando, setEditando] = useState(false);
  const [revisionEditando, setRevisionEditando] = useState<RevisionLegal | null>(null);
  const [formData, setFormData] = useState<RevisionLegal | null>(null);
  
  const { revisiones, loading, error, refrescarRevisiones } = useRevisionesLegales(companyId, anioSeleccionado);

  // Sincronizar formData cuando cambia revisionEditando
  useEffect(() => {
    if (revisionEditando) {
      setFormData(revisionEditando);
    }
  }, [revisionEditando]);

  // Log de depuración
  console.log('📊 Render - revisiones:', revisiones.length, 'loading:', loading, 'error:', error);

  // Calcular estadísticas dinámicas
  const stats = useMemo(() => {
    const activas = (cat: string) => revisiones.filter(r => r.categoria === cat && (r.estado === 'vigente' || r.estado === 'proximo'));
    const sumaMontos = (revs: RevisionLegal[]) => revs.reduce((acc, r) => acc + (r.monto || 0), 0);

    const arrendamiento = activas('arrendamiento');
    const seguros = activas('seguro');
    const licencias = activas('licencia');

    return {
      arrendamiento: { count: arrendamiento.length, total: sumaMontos(arrendamiento) },
      seguros: { count: seguros.length, total: sumaMontos(seguros) },
      licencias: { count: licencias.length, total: sumaMontos(licencias) },
    };
  }, [revisiones]);

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
  };

  const handleRefrescar = async () => {
    await refrescarRevisiones();
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
      case 'seguro': return ShieldIcon;
      case 'licencia': return FileCheckIcon;
      default: return FileText;
    }
  };

  const diasParaVencimiento = (fecha: string) => {
    const hoy = new Date();
    const vencimiento = new Date(fecha);
    const diferencia = Math.floor((vencimiento.getTime() - hoy.getTime()) / (1000 * 60 * 60 * 24));
    return diferencia;
  };

  const handleEditarRevision = (revision: RevisionLegal) => {
    setRevisionEditando(revision);
    setEditando(true);
  };

  const handleGuardarRevision = async () => {
    console.log('🖱️ Botón Guardar clickeado');
    console.log('📝 Form data actual:', formData);
    
    if (formData) {
      console.log('💾 Enviando datos:', JSON.stringify(formData, null, 2));
      
      try {
        const response = await fetch(`/api/companies/${companyId}/legal/revisiones`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id: formData.id,
            companyId: companyId,
            categoria: formData.categoria,
            titulo: formData.titulo,
            descripcion: formData.descripcion,
            fechaVencimiento: formData.fechaVencimiento,
            estado: formData.estado,
            monto: formData.monto,
            detalles: formData.detalles,
            contacto: formData.contacto,
            anioFiscal: anioSeleccionado
          })
        });
        
        if (!response.ok) {
          const errorData = await response.json();
          console.error('❌ Error al guardar:', errorData);
          alert('Error al guardar: ' + (errorData.error || 'Error desconocido'));
          return;
        }
        
        const result = await response.json();
        console.log('✅ Guardado exitoso:', result);
        
        // Refrescar los datos
        await refrescarRevisiones();
        
        setEditando(false);
        setRevisionEditando(null);
      } catch (error) {
        console.error('❌ Error en handleGuardarRevision:', error);
        alert('Error al guardar los cambios');
      }
    }
  };

  const handleCancelarEdicion = () => {
    setEditando(false);
    setRevisionEditando(null);
    setFormData(null);
  };

  const handleNuevaRevision = () => {
    const nuevaRevision: RevisionLegal = {
      id: '', // ID vacío indica nueva revisión
      categoria: 'arrendamiento',
      titulo: '',
      descripcion: '',
      fechaVencimiento: new Date().toISOString().split('T')[0],
      estado: 'proximo',
      monto: 0,
      detalles: {},
    };
    setRevisionEditando(nuevaRevision);
    setFormData(nuevaRevision);
    setEditando(true);
    console.log('➕ Creando nueva revisión');
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-600" />
            Seguridad Legal y Normativa - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {anioSeleccionado === '2026' 
              ? 'Cumplimiento normativo en Honduras para el sector salud'
              : `Histórico legal del año fiscal ${anioSeleccionado}`
            }
          </p>
        </div>
        <div className="flex items-center gap-3">
          <YearSelector 
            onYearChange={handleAnioChange}
            selectedYear={anioSeleccionado}
            badgeText={anioSeleccionado === '2026' ? 'Año Actual' : `Histórico ${anioSeleccionado}`}
          />
          <Button 
            onClick={handleRefrescar}
            disabled={loading}
            variant="outline" 
            size="sm"
            className="flex items-center gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            {loading ? 'Actualizando...' : 'Refrescar'}
          </Button>
          <Button 
            onClick={handleNuevaRevision}
            variant="default" 
            size="sm"
            className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          >
            <Plus className="h-4 w-4" />
            Nueva Revisión
          </Button>
          <Badge variant="default" className="bg-cyan-600">Honduras</Badge>
        </div>
      </div>

      {/* Vista de Calendario */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Clock className="h-5 w-5 text-cyan-600" />
            Calendario de Revisiones Legales
            {loading && <div className="ml-2 h-4 w-4 animate-spin rounded-full border-2 border-cyan-600 border-t-transparent"></div>}
          </CardTitle>
          <CardDescription>
            Estado de las revisiones legales con indicadores de urgencia
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-600 font-medium">Error: {error}</p>
            </div>
          )}
          {!loading && !error && revisiones.length === 0 && (
            <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-yellow-600 font-medium">No hay revisiones legales registradas para el año {anioSeleccionado}</p>
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {revisiones.map((revision, index) => {
              console.log(`🎨 Renderizando revisión ${index}:`, revision.id, revision.titulo);
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
                      <div className="flex items-center gap-2">
                        <Clock className={`h-4 w-4 ${dias <= 30 ? 'text-orange-600' : dias <= 60 ? 'text-yellow-600' : 'text-green-600'}`} />
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-xs h-7"
                          onClick={() => handleEditarRevision(revision)}
                        >
                          <Edit className="h-3 w-3" />
                        </Button>
                      </div>
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
                          {revision.contacto && (
                            <Button size="sm" className="text-xs h-7">
                              <Phone className="h-3 w-3" />
                            </Button>
                          )}
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

      {/* Formulario de Edición */}
      {editando && revisionEditando && (
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              {formData?.id ? <Edit className="h-5 w-5 text-cyan-600" /> : <Plus className="h-5 w-5 text-green-600" />}
              {formData?.id ? 'Editar Revisión Legal' : 'Nueva Revisión Legal'}
            </CardTitle>
            <CardDescription>
              {formData?.id ? 'Modifique los datos de la revisión seleccionada' : 'Ingrese los datos de la nueva revisión legal'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Título</label>
                  <input
                    type="text"
                    value={formData?.titulo || ''}
                    onChange={(e) => {
                      console.log('✏️ Título cambiado a:', e.target.value);
                      setFormData(prev => prev ? {...prev, titulo: e.target.value} : prev);
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Fecha de Vencimiento</label>
                  <input
                    type="date"
                    value={formData?.fechaVencimiento || ''}
                    onChange={(e) => setFormData(prev => prev ? {...prev, fechaVencimiento: e.target.value} : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Descripción</label>
                  <input
                    type="text"
                    value={formData?.descripcion || ''}
                    onChange={(e) => setFormData(prev => prev ? {...prev, descripcion: e.target.value} : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Estado</label>
                  <select
                    value={formData?.estado || 'proximo'}
                    onChange={(e) => setFormData(prev => prev ? {...prev, estado: e.target.value as any} : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  >
                    <option value="vigente">Vigente</option>
                    <option value="proximo">Próximo</option>
                    <option value="vencido">Vencido</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Monto (L)</label>
                  <input
                    type="number"
                    value={formData?.monto || ''}
                    onChange={(e) => setFormData(prev => prev ? {...prev, monto: parseFloat(e.target.value) || 0} : prev)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                    placeholder="15000"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Detalles Adicionales</label>
                <textarea
                  value={formData?.detalles ? Object.entries(formData.detalles).map(([k, v]) => `${k}: ${v}`).join('\n') : ''}
                  onChange={(e) => {
                    const lines = e.target.value.split('\n');
                    const nuevosDetalles: { [key: string]: string } = {};
                    lines.forEach(line => {
                      const [key, ...valueParts] = line.split(':');
                      if (key && valueParts.length > 0) {
                        nuevosDetalles[key.trim()] = valueParts.join(':').trim();
                      }
                    });
                    setFormData(prev => prev ? {...prev, detalles: nuevosDetalles} : prev);
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  rows={4}
                  placeholder="Formato: Clave: Valor (una por línea)"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={handleCancelarEdicion}
                  className="gap-2"
                >
                  <X className="h-4 w-4" />
                  Cancelar
                </Button>
                <Button
                  onClick={handleGuardarRevision}
                  className="gap-2"
                >
                  <Save className="h-4 w-4" />
                  Guardar Cambios
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
                <span className="font-medium">{stats.arrendamiento.count}</span>
              </div>
              <div className="flex justify-between">
                <span>Monto Total:</span>
                <span className="font-medium">L {stats.arrendamiento.total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShieldIcon className="h-5 w-5 text-green-600" />
              Seguros
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Pólizas Activas:</span>
                <span className="font-medium">{stats.seguros.count}</span>
              </div>
              <div className="flex justify-between">
                <span>Prima Total:</span>
                <span className="font-medium">L {stats.seguros.total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileCheckIcon className="h-5 w-5 text-purple-600" />
              Licencias
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Licencias Activas:</span>
                <span className="font-medium">{stats.licencias.count}</span>
              </div>
              <div className="flex justify-between">
                <span>Costo Anual:</span>
                <span className="font-medium">L {stats.licencias.total.toLocaleString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
