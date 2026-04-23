'use client';

import { use, useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import YearSelector from '../../components/YearSelector';
import { formatDateForDisplay, formatDateRange, isDateExpired, formatDateForInput } from '@/lib/date-utils';
import { 
  FileText,
  Plus,
  FileX,
  CheckCircle,
  AlertTriangle,
  Ban,
  Clock,
  Calendar
} from 'lucide-react';

interface CAIPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface CAIRango {
  id: string;
  codigo: string;
  tipoDocumento: string;
  rangoInicial: string;
  rangoFinal: string;
  fechaLimite: string;
  estado: 'activo' | 'proximo' | 'vencido';
}

export default function CAIPage({ params }: CAIPageProps) {
  const { id: companyId } = use(params);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [rangos, setRangos] = useState<CAIRango[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [nuevoRango, setNuevoRango] = useState({
    codigo: '',
    tipoDocumento: 'Factura',
    rangoInicial: '',
    rangoFinal: '',
    fechaLimite: ''
  });

  const [errores, setErrores] = useState<{[key: string]: boolean}>({});

  // Load data from localStorage or API
  useEffect(() => {
    const loadCAI = () => {
      try {
        setLoading(true);
        // Try to load from localStorage first
        const stored = localStorage.getItem(`cai_${companyId}`);
        if (stored) {
          const parsed = JSON.parse(stored);
          setRangos(parsed);
          setError(null);
        } else {
          // Default data if nothing stored
          setRangos([]);
        }
      } catch (err) {
        setError('Error loading data');
      } finally {
        setLoading(false);
      }
    };

    loadCAI();
  }, [companyId]);

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
  };

  const handleMostrarFormulario = () => {
    setMostrarFormulario(true);
  };

  const handleCancelar = () => {
    setMostrarFormulario(false);
    setErrores({});
    setNuevoRango({
      codigo: '',
      tipoDocumento: 'Factura',
      rangoInicial: '',
      rangoFinal: '',
      fechaLimite: ''
    });
  };

  const handleGuardar = async () => {
    const nuevosErrores: {[key: string]: boolean} = {};
    
    if (!nuevoRango.codigo.trim()) nuevosErrores.codigo = true;
    if (!nuevoRango.fechaLimite) nuevosErrores.fechaLimite = true;
    if (!nuevoRango.rangoInicial.trim()) nuevosErrores.rangoInicial = true;
    if (!nuevoRango.rangoFinal.trim()) nuevosErrores.rangoFinal = true;
    
    setErrores(nuevosErrores);
    
    if (Object.keys(nuevosErrores).length > 0) {
      return;
    }

    // Create new rango locally
    const newRango: CAIRango = {
      id: String(Date.now()),
      codigo: nuevoRango.codigo,
      tipoDocumento: nuevoRango.tipoDocumento,
      rangoInicial: nuevoRango.rangoInicial,
      rangoFinal: nuevoRango.rangoFinal,
      fechaLimite: nuevoRango.fechaLimite,
      estado: 'activo'
    };

    // Update state
    const updatedRangos = [newRango, ...rangos];
    setRangos(updatedRangos);
    
    // Save to localStorage
    localStorage.setItem(`cai_${companyId}`, JSON.stringify(updatedRangos));
    
    handleCancelar();
    
    // Try to sync with API (background)
    try {
      const response = await fetch(`/api/companies/${companyId}/cai`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          codigo: nuevoRango.codigo,
          tipoDocumento: nuevoRango.tipoDocumento,
          rangoInicial: nuevoRango.rangoInicial,
          rangoFinal: nuevoRango.rangoFinal,
          fechaLimite: nuevoRango.fechaLimite
        })
      });
      
      if (response.ok) {
        console.log('Synced with database');
      }
    } catch (err) {
      // Silently fail - data is already in localStorage
      console.log('Database not available, saved to localStorage only');
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-600" />
            Gestión de CAI (Autorizaciones de Impresión) - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {anioSeleccionado === '2026' 
              ? 'Control de autorizaciones para facturación electrónica según normativa SAR'
              : `Histórico de autorizaciones del año fiscal ${anioSeleccionado}`
            }
          </p>
        </div>
        <YearSelector 
          onYearChange={handleAnioChange}
          selectedYear={anioSeleccionado}
          badgeText={anioSeleccionado === '2026' ? 'Año Actual' : `Histórico ${anioSeleccionado}`}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3">
        <Button size="sm" className="gap-2 bg-blue-600" onClick={handleMostrarFormulario}>
          <Plus className="h-4 w-4" />
          Nuevo Rango
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-green-500 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">CAI Vigente</p>
                <p className="text-2xl font-bold text-green-700">Facturas</p>
                <p className="text-xs text-green-600 mt-1">001-001-01 (Activo)</p>
              </div>
              <CheckCircle className="h-10 w-10 text-green-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500 bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Próximo a Vencer</p>
                <p className="text-2xl font-bold text-yellow-700">Notas</p>
                <p className="text-xs text-yellow-600 mt-1">12 días restantes</p>
              </div>
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-red-500 bg-red-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Vencido/Agotado</p>
                <p className="text-2xl font-bold text-red-700">1 Rango</p>
                <p className="text-xs text-red-600 mt-1">Requiere renovación</p>
              </div>
              <Ban className="h-10 w-10 text-red-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CAI Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Tabla de Autorizaciones CAI
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {error && (
            <div className="p-4 bg-red-50 border-b border-red-200">
              <p className="text-red-600 text-sm">Error: {error}</p>
            </div>
          )}
          {loading && (
            <div className="p-8 text-center">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"></div>
              <p className="mt-2 text-sm text-gray-600">Cargando autorizaciones...</p>
            </div>
          )}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Documento</th>
                  <th className="text-left py-3 px-4 font-semibold">CAI</th>
                  <th className="text-left py-3 px-4 font-semibold">Rango Autorizado</th>
                  <th className="text-left py-3 px-4 font-semibold">Uso Actual</th>
                  <th className="text-left py-3 px-4 font-semibold">Vence el</th>
                  <th className="text-left py-3 px-4 font-semibold">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {rangos.map((rango) => {
                  const getEstadoBadge = (estado: string) => {
                    switch(estado) {
                      case 'activo': return <Badge className="bg-green-600">Activo</Badge>;
                      case 'proximo': return <Badge className="bg-yellow-600">Próximo</Badge>;
                      case 'vencido': return <Badge className="bg-red-600">Vencido</Badge>;
                      default: return <Badge>Desconocido</Badge>;
                    }
                  };
                  
                  const getEstadoBg = (estado: string) => {
                    switch(estado) {
                      case 'proximo': return 'bg-yellow-50';
                      default: return '';
                    }
                  };

                  return (
                    <tr key={rango.id} className={`hover:bg-gray-50 ${getEstadoBg(rango.estado)}`}>
                      <td className="py-3 px-4">
                        <span className="font-medium">{rango.tipoDocumento}</span>
                      </td>
                      <td className="py-3 px-4 font-mono text-sm">{rango.codigo.substring(0, 12)}...</td>
                      <td className="py-3 px-4 text-sm">{rango.rangoInicial} al {rango.rangoFinal}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="w-[5%] h-full bg-green-500"></div>
                          </div>
                          <span className="text-sm">0%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-sm">{new Date(rango.fechaLimite).toLocaleDateString('es-HN')}</td>
                      <td className="py-3 px-4">
                        {getEstadoBadge(rango.estado)}
                      </td>
                      <td className="py-3 px-4">
                        <Button variant="outline" size="sm">Editar</Button>
                      </td>
                    </tr>
                  );
                })}
                {rangos.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-8 px-4 text-center text-gray-500">
                      No hay rangos CAI registrados
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* New Range Form */}
      {mostrarFormulario && <Card className="border-dashed border-2 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-blue-600" />
            Formulario de Nuevo Rango CAI
          </CardTitle>
          <CardDescription>
            Ingrese los datos exactos del documento del SAR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Código CAI *</label>
              <input 
                type="text" 
                placeholder="3B2D-5F1A-9876-1234"
                value={nuevoRango.codigo}
                onChange={(e) => {
                  setNuevoRango({...nuevoRango, codigo: e.target.value});
                  if (errores.codigo) setErrores({...errores, codigo: false});
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm ${errores.codigo ? 'border-red-500 bg-red-50' : ''}`}
              />
              {errores.codigo && <span className="text-xs text-red-600">Este campo es requerido</span>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Tipo de Documento</label>
              <select 
                value={nuevoRango.tipoDocumento}
                onChange={(e) => setNuevoRango({...nuevoRango, tipoDocumento: e.target.value})}
                className="w-full px-3 py-2 border rounded-md text-sm"
              >
                <option>Factura</option>
                <option>Nota de Crédito</option>
                <option>Nota de Débito</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rango Inicial *</label>
              <input 
                type="text" 
                placeholder="000-001-01-00000001"
                value={nuevoRango.rangoInicial}
                onChange={(e) => {
                  setNuevoRango({...nuevoRango, rangoInicial: e.target.value});
                  if (errores.rangoInicial) setErrores({...errores, rangoInicial: false});
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm ${errores.rangoInicial ? 'border-red-500 bg-red-50' : ''}`}
              />
              {errores.rangoInicial && <span className="text-xs text-red-600">Este campo es requerido</span>}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Rango Final *</label>
              <input 
                type="text" 
                placeholder="000-001-01-0000500"
                value={nuevoRango.rangoFinal}
                onChange={(e) => {
                  setNuevoRango({...nuevoRango, rangoFinal: e.target.value});
                  if (errores.rangoFinal) setErrores({...errores, rangoFinal: false});
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm ${errores.rangoFinal ? 'border-red-500 bg-red-50' : ''}`}
              />
              {errores.rangoFinal && <span className="text-xs text-red-600">Este campo es requerido</span>}
            </div>
            <div className="space-y-2 md:col-span-2">
              <label className="text-sm font-medium">Fecha Límite de Emisión *</label>
              <input 
                type="date" 
                value={nuevoRango.fechaLimite}
                onChange={(e) => {
                  setNuevoRango({...nuevoRango, fechaLimite: e.target.value});
                  if (errores.fechaLimite) setErrores({...errores, fechaLimite: false});
                }}
                className={`w-full px-3 py-2 border rounded-md text-sm ${errores.fechaLimite ? 'border-red-500 bg-red-50' : ''}`}
              />
              {errores.fechaLimite && <span className="text-xs text-red-600">Este campo es requerido</span>}
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button className="bg-blue-600" onClick={handleGuardar}>Guardar Autorización</Button>
            <Button variant="outline" onClick={handleCancelar}>Cancelar</Button>
          </div>
        </CardContent>
      </Card>}

      
      {/* Panic Button */}
      <Card className="border-l-4 border-l-red-600 bg-red-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-800">
            <FileX className="h-5 w-5" />
            Botón de Pánico (Anulación de Factura)
          </CardTitle>
          <CardDescription>
            Procedimiento para anulaciones con trazabilidad completa
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-white rounded-lg border border-red-200">
              <p className="font-medium text-sm mb-2">Factura a Anular: #001-001-01-000125</p>
              <div className="space-y-2">
                <label className="text-sm">Justificación obligatoria:</label>
                <textarea 
                  className="w-full px-3 py-2 border rounded-md text-sm"
                  rows={3}
                  placeholder="Describa el motivo de la anulación..."
                />
                <div className="flex items-center gap-2">
                  <input type="file" className="text-sm" />
                  <span className="text-xs text-gray-500">Adjuntar respaldo (PDF)</span>
                </div>
              </div>
              <div className="mt-3 flex gap-2">
                <Button variant="destructive" size="sm" className="gap-1">
                  <FileX className="h-4 w-4" />
                  Anular Factura
                </Button>
                <Button variant="outline" size="sm">Cancelar</Button>
              </div>
            </div>
            <div className="p-3 bg-white rounded border border-red-200">
              <p className="text-sm text-red-700 font-medium">⚠️ Marcas visuales en anuladas:</p>
              <ul className="text-xs text-gray-600 mt-1 space-y-1">
                <li>• Sello "ANULADA" en rojo sobre el documento</li>
                <li>• No suma a reportes de ingresos</li>
                <li>• Registro permanente en auditoría</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
