'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import YearSelector from '../../components/YearSelector';
import { 
  Lock,
  Unlock,
  History,
  CheckCircle,
  AlertTriangle,
  Calendar,
  Ban,
  Database,
  Shield
} from 'lucide-react';

interface CierrePageProps {
  params: Promise<{
    id: string;
  }>;
}

const datosIniciales = [
  { mes: 'Enero', status: 'cerrado', entradas: 145, cerradoPor: 'Contador López', fecha: '05/02/2026' },
  { mes: 'Febrero', status: 'cerrado', entradas: 132, cerradoPor: 'Contador López', fecha: '05/03/2026' },
  { mes: 'Marzo', status: 'cerrado', entradas: 158, cerradoPor: 'Admin Dental', fecha: '05/04/2026' },
  { mes: 'Abril', status: 'abierto', entradas: 45, cerradoPor: '-', fecha: '-' },
  { mes: 'Mayo', status: 'futuro', entradas: 0, cerradoPor: '-', fecha: '-' },
  { mes: 'Junio', status: 'futuro', entradas: 0, cerradoPor: '-', fecha: '-' },
];

export default function CierrePage({ params }: CierrePageProps) {
  const { id: companyId } = use(params);
  const router = useRouter();
  const [meses, setMeses] = useState(datosIniciales);
  const [loading, setLoading] = useState(false);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');
  const [fechaActual, setFechaActual] = useState<string>('');

  useEffect(() => {
    // Solo ejecutar en el cliente para evitar hidratación
    setFechaActual(new Date().toLocaleString('es-HN'));
  }, []);

  const datosHistoricos = {
    '2026': datosIniciales,
    '2025': [
      { mes: 'Enero', status: 'cerrado', entradas: 138, cerradoPor: 'Contador López', fecha: '05/02/2025' },
      { mes: 'Febrero', status: 'cerrado', entradas: 125, cerradoPor: 'Contador López', fecha: '05/03/2025' },
      { mes: 'Marzo', status: 'cerrado', entradas: 142, cerradoPor: 'Admin Dental', fecha: '05/04/2025' },
      { mes: 'Abril', status: 'cerrado', entradas: 156, cerradoPor: 'Contador López', fecha: '05/05/2025' },
      { mes: 'Mayo', status: 'cerrado', entradas: 134, cerradoPor: 'Contador López', fecha: '05/06/2025' },
      { mes: 'Junio', status: 'cerrado', entradas: 161, cerradoPor: 'Admin Dental', fecha: '05/07/2025' },
      { mes: 'Julio', status: 'cerrado', entradas: 149, cerradoPor: 'Contador López', fecha: '05/08/2025' },
      { mes: 'Agosto', status: 'cerrado', entradas: 155, cerradoPor: 'Contador López', fecha: '05/09/2025' },
      { mes: 'Septiembre', status: 'cerrado', entradas: 167, cerradoPor: 'Admin Dental', fecha: '05/10/2025' },
      { mes: 'Octubre', status: 'cerrado', entradas: 143, cerradoPor: 'Contador López', fecha: '05/11/2025' },
      { mes: 'Noviembre', status: 'cerrado', entradas: 158, cerradoPor: 'Contador López', fecha: '05/12/2025' },
      { mes: 'Diciembre', status: 'cerrado', entradas: 172, cerradoPor: 'Admin Dental', fecha: '05/01/2026' },
    ],
    '2024': [
      { mes: 'Enero', status: 'cerrado', entradas: 122, cerradoPor: 'Contador López', fecha: '05/02/2024' },
      { mes: 'Febrero', status: 'cerrado', entradas: 118, cerradoPor: 'Contador López', fecha: '05/03/2024' },
      { mes: 'Marzo', status: 'cerrado', entradas: 135, cerradoPor: 'Admin Dental', fecha: '05/04/2024' },
      { mes: 'Abril', status: 'cerrado', entradas: 141, cerradoPor: 'Contador López', fecha: '05/05/2024' },
      { mes: 'Mayo', status: 'cerrado', entradas: 129, cerradoPor: 'Contador López', fecha: '05/06/2024' },
      { mes: 'Junio', status: 'cerrado', entradas: 148, cerradoPor: 'Admin Dental', fecha: '05/07/2024' },
      { mes: 'Julio', status: 'cerrado', entradas: 136, cerradoPor: 'Contador López', fecha: '05/08/2024' },
      { mes: 'Agosto', status: 'cerrado', entradas: 142, cerradoPor: 'Contador López', fecha: '05/09/2024' },
      { mes: 'Septiembre', status: 'cerrado', entradas: 154, cerradoPor: 'Admin Dental', fecha: '05/10/2024' },
      { mes: 'Octubre', status: 'cerrado', entradas: 131, cerradoPor: 'Contador López', fecha: '05/11/2024' },
      { mes: 'Noviembre', status: 'cerrado', entradas: 146, cerradoPor: 'Contador López', fecha: '05/12/2024' },
      { mes: 'Diciembre', status: 'cerrado', entradas: 159, cerradoPor: 'Admin Dental', fecha: '05/01/2025' },
    ]
  };

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
    setMeses(datosHistoricos[anio as keyof typeof datosHistoricos] || []);
  };

  const handleCerrarMes = async (mesIndex: number) => {
    setLoading(true);
    
    // Simulación de cierre de mes
    setTimeout(() => {
      const nuevosMeses = [...meses];
      nuevosMeses[mesIndex] = {
        ...nuevosMeses[mesIndex],
        status: 'cerrado',
        cerradoPor: 'Usuario Actual',
        fecha: fechaActual.split(',')[0] || new Date().toISOString().split('T')[0]
      };
      setMeses(nuevosMeses);
      setLoading(false);
      
      // Mostrar mensaje de éxito
      alert(`Mes ${nuevosMeses[mesIndex].mes} cerrado exitosamente`);
    }, 1000);
  };

  const handleReabrirMes = async (mesIndex: number) => {
    setLoading(true);
    
    // Confirmación antes de reabrir
    const confirmar = confirm(`¿Está seguro que desea reabrir el mes de ${meses[mesIndex].mes}? Esta acción quedará registrada en la auditoría.`);
    
    if (confirmar) {
      // Simulación de reapertura
      setTimeout(() => {
        const nuevosMeses = [...meses];
        nuevosMeses[mesIndex] = {
          ...nuevosMeses[mesIndex],
          status: 'abierto',
          cerradoPor: '-',
          fecha: '-'
        };
        setMeses(nuevosMeses);
        setLoading(false);
        
        // Mostrar mensaje de éxito
        alert(`Mes ${nuevosMeses[mesIndex].mes} reabierto exitosamente`);
      }, 1000);
    } else {
      setLoading(false);
    }
  };
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Lock className="h-5 w-5 text-purple-600" />
            Cierre de Mes - El "Seguro de Vida" del Contador
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {anioSeleccionado === '2026' 
              ? 'Bloqueo automático de períodos fiscales para mantener la integridad de los datos'
              : `Visualización histórica del año fiscal ${anioSeleccionado} - Datos de solo lectura`
            }
          </p>
        </div>
        <YearSelector 
          onYearChange={handleAnioChange}
          selectedYear={anioSeleccionado}
        />
      </div>

      {/* Concept Card */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Ban className="h-5 w-5 text-purple-600" />
            1. El Concepto: Bloqueo Transaccional
          </CardTitle>
          <CardDescription>
            Interruptor de seguridad por cada mes fiscal
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="font-medium text-red-700 mb-2">Si el mes está CERRADO:</p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✗ Crear asientos con fecha de ese mes</li>
                <li>✗ Editar asientos existentes</li>
                <li>✗ Anular facturas del período</li>
              </ul>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="font-medium text-green-700 mb-2">Beneficios:</p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>✓ Estados financieros inmutables</li>
                <li>✓ Cuadre con declaraciones SAR</li>
                <li>✓ Protección contra errores</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="font-medium text-blue-700 mb-2">Reapertura:</p>
              <ul className="space-y-1 text-sm text-gray-600">
                <li>• Solo "Contador General"</li>
                <li>• Justificación obligatoria</li>
                <li>• Registro en auditoría</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Histórico */}
      {anioSeleccionado !== '2026' && (
        <Card className="border-l-4 border-l-blue-500 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <History className="h-5 w-5 text-blue-600" />
              Resumen Histórico - Año {anioSeleccionado}
            </CardTitle>
            <CardDescription>
              Información consolidada del año fiscal seleccionado
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-blue-600">
                  {meses.filter(m => m.status === 'cerrado').length}
                </p>
                <p className="text-xs text-gray-600">Meses Cerrados</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {meses.reduce((total, m) => total + m.entradas, 0)}
                </p>
                <p className="text-xs text-gray-600">Total de Entradas</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {Math.round(meses.reduce((total, m) => total + m.entradas, 0) / 12)}
                </p>
                <p className="text-xs text-gray-600">Promedio Mensual</p>
              </div>
              <div className="text-center p-3 bg-white rounded-lg">
                <p className="text-2xl font-bold text-orange-600">100%</p>
                <p className="text-xs text-gray-600">Cierre Completo</p>
              </div>
            </div>
            <div className="mt-4 p-3 bg-blue-100 rounded-lg border border-blue-300">
              <p className="text-sm text-blue-800">
                <strong>Nota:</strong> Este es un año fiscal histórico. Los datos son de solo lectura y no pueden ser modificados.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Periods Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              2. Interfaz de Cierre de Períodos - {anioSeleccionado}
            </CardTitle>
            <Badge className="bg-purple-600">
              {anioSeleccionado === '2026' ? 'Año Fiscal Actual' : `Año Fiscal ${anioSeleccionado}`}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Mes</th>
                  <th className="text-left py-3 px-4 font-semibold">Estado</th>
                  <th className="text-left py-3 px-4 font-semibold">Entradas</th>
                  <th className="text-left py-3 px-4 font-semibold">Validación</th>
                  <th className="text-left py-3 px-4 font-semibold">Cerrado Por</th>
                  <th className="text-left py-3 px-4 font-semibold">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {meses.map((m, i) => (
                  <tr key={i} className={`hover:bg-gray-50 ${m.status === 'abierto' ? 'bg-blue-50' : ''}`}>
                    <td className="py-3 px-4 font-medium">{m.mes}</td>
                    <td className="py-3 px-4">
                      {m.status === 'cerrado' ? (
                        <Badge className="bg-green-600 gap-1">
                          <Lock className="h-3 w-3" /> Cerrado
                        </Badge>
                      ) : m.status === 'abierto' ? (
                        <Badge className="bg-blue-600 gap-1">
                          <Unlock className="h-3 w-3" /> Abierto
                        </Badge>
                      ) : (
                        <Badge variant="outline">Futuro</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4">{m.entradas}</td>
                    <td className="py-3 px-4">
                      {m.status === 'cerrado' ? (
                        <span className="text-green-600 text-sm flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" /> OK
                        </span>
                      ) : m.status === 'abierto' ? (
                        <span className="text-yellow-600 text-sm flex items-center gap-1">
                          <AlertTriangle className="h-4 w-4" /> Pendiente
                        </span>
                      ) : (
                        '-'
                      )}
                    </td>
                    <td className="py-3 px-4 text-sm">{m.cerradoPor}</td>
                    <td className="py-3 px-4">
                      {anioSeleccionado === '2026' ? (
                        m.status === 'abierto' ? (
                          <Button 
                            size="sm" 
                            className="bg-purple-600" 
                            onClick={() => handleCerrarMes(i)}
                            disabled={loading}
                          >
                            {loading ? 'Procesando...' : 'Cerrar Mes'}
                          </Button>
                        ) : m.status === 'cerrado' ? (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleReabrirMes(i)}
                            disabled={loading}
                          >
                            {loading ? 'Procesando...' : 'Reabrir'}
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" disabled>-</Button>
                        )
                      ) : (
                        <Button size="sm" variant="outline" disabled>
                          Solo Lectura
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Orphan Entries */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
            3. Validación Previa Automática: Asientos Huérfanos
          </CardTitle>
          <CardDescription>
            Verificación automática antes de permitir el cierre
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="font-medium text-sm mb-3">Validaciones Automáticas:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">Partidas cuadradas (Débitos = Créditos)</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">Sin asientos sin descripción</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">Facturas conciliadas con banco</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-gray-700">Retenciones aplicadas correctamente</span>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <p className="text-sm text-green-700 flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Todas las validaciones pasaron exitosamente
                </p>
                <Badge className="bg-green-600 text-xs">OK</Badge>
              </div>
              <p className="text-xs text-green-600 mt-2">
                Última verificación: {fechaActual || 'Verificando...'}
              </p>
            </div>

            <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-blue-600" />
                <span className="font-medium text-sm">Resumen de Validación:</span>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">45</p>
                  <p className="text-gray-600">Asientos Verificados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-green-600">0</p>
                  <p className="text-gray-600">Errores Encontrados</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-blue-600">100%</p>
                  <p className="text-gray-600">Integridad</p>
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-purple-600">0.3s</p>
                  <p className="text-gray-600">Tiempo Proceso</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      
      {/* Audit Log */}
      <Card className="border-l-4 border-l-indigo-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <History className="h-5 w-5 text-indigo-600" />
            4. Auditoría Especial de Cierres
          </CardTitle>
          <CardDescription>
            Registro de cierres y reaperturas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-green-600" />
                <span className="text-gray-500">05/04/2026 10:00 PM</span>
                <span className="font-medium">Admin Dental</span>
                <span>cerró el mes de</span>
                <Badge className="bg-green-600">Marzo 2026</Badge>
              </div>
            </div>
            <div className="p-3 bg-yellow-50 rounded-lg text-sm border border-yellow-200">
              <div className="flex items-center gap-2">
                <Unlock className="h-4 w-4 text-yellow-600" />
                <span className="text-gray-500">01/03/2026 09:15 AM</span>
                <span className="font-medium">Contador López</span>
                <span>reabrió</span>
                <Badge className="bg-yellow-600">Febrero 2026</Badge>
              </div>
              <p className="mt-1 text-xs text-gray-600 italic">
                Justificación: "Corrección de asiento de ajuste por depreciación"
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      <Card className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-purple-600" />
            Estado de Cierres - Año Fiscal 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">3</p>
              <p className="text-xs text-gray-600">Meses Cerrados</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-blue-600">1</p>
              <p className="text-xs text-gray-600">Mes Abierto</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-green-600">0</p>
              <p className="text-xs text-gray-600">Pendiente Verif.</p>
            </div>
            <div className="text-center p-3 bg-white rounded-lg">
              <p className="text-2xl font-bold text-blue-600">1</p>
              <p className="text-xs text-gray-600">Reaperturas</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
