'use client';

import { use } from 'react';
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import YearSelector from '../../components/YearSelector';
import ComprobanteRetencion from './components/ComprobanteRetencion';
import HistoricoRetenciones from './components/HistoricoRetenciones';
import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
import { 
  Percent,
  Database,
  Users,
  Code,
  Calculator,
  Shield,
  Eye,
  AlertTriangle,
  FileCheck,
  FileText,
  Download,
  Scale,
  CheckCircle
} from 'lucide-react';

interface RetencionesPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function RetencionesPage({ params }: RetencionesPageProps) {
  const { id: companyId } = use(params);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
  };

  const retencionesData = [
    { proveedor: 'Suministros Médicos S.A.', rtn: '0801-9000-01234', base: 10000, tipo: '1%', monto: 100, comprobante: '000-001-05-00000124' },
    { proveedor: 'Dr. Especialista HN', rtn: '0501-1990-00123', base: 5000, tipo: '12.5%', monto: 625, comprobante: '000-001-05-00000125' },
    { proveedor: 'Servicios Dentales S.A.', rtn: '0801-2000-05678', base: 15500, tipo: '1%', monto: 155, comprobante: '000-001-05-00000126' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Percent className="h-5 w-5 text-cyan-600" />
            Retenciones de Impuestos (ISR) - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            {anioSeleccionado === '2026' 
              ? 'Gestión automática de retenciones del 1% y 12.5% según Ley de ISR Honduras'
              : `Histórico de retenciones del año fiscal ${anioSeleccionado}`
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
        <Button variant="outline" size="sm" className="gap-2">
          <FileText className="h-4 w-4" />
          Comprobantes
        </Button>
        <Button variant="outline" size="sm" className="gap-2">
          <Download className="h-4 w-4" />
          Exportar DET Live
        </Button>
      </div>

      {/* Configuración Maestro */}
      <Card className="border-l-4 border-l-blue-500 bg-cyan-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="h-5 w-5 text-cyan-600" />
            1. Configuración de Retenciones (Maestro de Datos)
          </CardTitle>
          <CardDescription>
            Campos requeridos en la base de datos de proveedores
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-white rounded-lg border border-cyan-200">
              <p className="font-medium mb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-cyan-600" />
                Campos en Tabla de Proveedores
              </p>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">tipo_persona</Badge>
                  <div>
                    <p className="font-medium">Tipo de Persona</p>
                    <p className="text-gray-500">Natural | Jurídica</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">regimen</Badge>
                  <div>
                    <p className="font-medium">Régimen Tributario</p>
                    <p className="text-gray-500">Pagos a Cuenta | Profesional Liberal | Régimen General</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">retener_1porciento</Badge>
                  <div>
                    <p className="font-medium">Aplicar Retención 1%</p>
                    <p className="text-gray-500">Para compras &gt; L 3,000 entre comercios</p>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Badge variant="outline" className="mt-0.5">retener_12_5</Badge>
                  <div>
                    <p className="font-medium">Aplicar Retención 12.5%</p>
                    <p className="text-gray-500">Para honorarios profesionales</p>
                  </div>
                </div>
              </div>
            </div>
                      </div>
        </CardContent>
      </Card>

      {/* Automatización Cálculo */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Calculator className="h-5 w-5 text-green-600" />
            2. Automatización del Cálculo de Retenciones
          </CardTitle>
          <CardDescription>
            Lógica automática para aplicar retenciones según tipo de transacción
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-green-600">Regla del 1%</Badge>
                <span className="text-sm text-gray-600">ISR entre empresas</span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-700">Condición:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Compra de bienes o servicios &gt; <strong>L 3,000.00</strong></li>
                  <li>Proveedor tipo "Jurídica"</li>
                  <li>Retención 1% activada en maestro</li>
                </ul>
                <div className="mt-3 p-2 bg-white rounded border-l-2 border-green-500">
                  <p className="font-mono text-xs">retencion = subtotal × 0.01</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-orange-600">Regla del 12.5%</Badge>
                <span className="text-sm text-gray-600">Honorarios Profesionales</span>
              </div>
              <div className="space-y-2 text-sm">
                <p className="font-medium text-gray-700">Condición:</p>
                <ul className="list-disc list-inside text-gray-600 space-y-1">
                  <li>Pago por servicios profesionales</li>
                  <li>Persona "Natural" o "Profesional Liberal"</li>
                  <li>Retención 12.5% activada en maestro</li>
                </ul>
                <div className="mt-3 p-2 bg-white rounded border-l-2 border-orange-500">
                  <p className="font-mono text-xs">retencion = honorarios × 0.125</p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Seguridad Formulario */}
      <Card className="border-l-4 border-l-yellow-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Shield className="h-5 w-5 text-yellow-600" />
            3. Seguridad y Validación en Formulario (React)
          </CardTitle>
          <CardDescription>
            Controles en tiempo real para evitar olvidos en retenciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <p className="font-medium mb-3 flex items-center gap-2">
                <Eye className="h-4 w-4 text-yellow-600" />
                Cálculo en Tiempo Real
              </p>
              <div className="p-3 bg-white rounded border border-yellow-300">
                <p className="text-xs text-gray-500 mb-2">Resumen de Factura:</p>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between"><span>Subtotal:</span><span className="font-medium">L 4,000.00</span></div>
                  <div className="flex justify-between"><span>ISV (15%):</span><span className="font-medium">L 600.00</span></div>
                  <div className="flex justify-between text-green-600"><span>(-) Retención (1%):</span><span className="font-medium">- L 40.00</span></div>
                  <div className="border-t pt-1 mt-1 flex justify-between font-bold"><span>Total a Pagar:</span><span>L 4,560.00</span></div>
                </div>
              </div>
            </div>
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <p className="font-medium mb-3 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                Validación de Alertas
              </p>
              <div className="p-3 bg-white rounded border-l-2 border-red-500">
                <p className="text-sm font-medium text-red-700 mb-1">⚠️ Alerta de Retención</p>
                <p className="text-xs text-gray-600">Esta factura supera L 3,000.00 y el proveedor tiene configurada retención del 1%.</p>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" className="bg-green-600 h-7 text-xs">Sí, Aplicar</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs">Omitir</Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Comprobantes */}
      <Card className="border-l-4 border-l-purple-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCheck className="h-5 w-5 text-purple-600" />
            4. Generación del Comprobante de Retención
          </CardTitle>
          <CardDescription>
            Emisión de comprobantes con CAI autorizado por el SAR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="font-medium mb-3 flex items-center gap-2">
                <FileText className="h-4 w-4 text-purple-600" />
                Correlativos de Retención (CAI)
              </p>
              <div className="space-y-3">
                <div className="p-3 bg-white rounded border border-purple-300">
                  <p className="text-xs text-gray-500 mb-1">CAI Autorizado:</p>
                  <p className="font-mono text-sm">000-CA1-RET-20260001</p>
                  <p className="text-xs text-gray-500 mt-1">Rango: 000-001-05-00000001 al 99999999</p>
                </div>
                <div className="p-3 bg-white rounded border border-purple-300">
                  <p className="text-xs text-gray-500 mb-1">Próximo Comprobante:</p>
                  <p className="font-mono text-lg font-bold text-purple-700">000-001-05-00000125</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
              <p className="font-medium mb-3 flex items-center gap-2">
                <Download className="h-4 w-4 text-gray-600" />
                Módulo de Impresión PDF
              </p>
              <div className="p-3 bg-white rounded border border-gray-300">
                <p className="text-sm font-medium mb-2">Comprobante #000-001-05-00000124</p>
                <div className="space-y-1 text-xs text-gray-600">
                  <p>Proveedor: Suministros Médicos S.A.</p>
                  <p>RTN: 0801-9000-01234</p>
                  <p>Base Imponible: L 4,000.00</p>
                  <p>Retención ISR (1%): L 40.00</p>
                </div>
              </div>
            </div>

            {/* Escenario 2: Honorarios Profesionales */}
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-2 mb-3">
                <Badge className="bg-orange-600">Escenario 2</Badge>
                <span className="font-medium">Honorarios Profesionales (Retención del 12.5%)</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Contratación de especialista externo por L 8,000.00 (sin ISV, servicios profesionales médicos exentos).
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium text-sm mb-2">Cálculo:</p>
                  <div className="space-y-1 text-sm">
                    <div className="flex justify-between">
                      <span>Honorarios:</span>
                      <span className="font-medium">L 8,000.00</span>
                    </div>
                    <div className="flex justify-between text-orange-600">
                      <span>Retención ISR (12.5%):</span>
                      <span className="font-medium">L 1,000.00</span>
                    </div>
                    <div className="flex justify-between border-t pt-1 font-bold">
                      <span>Total Neto a Pagar:</span>
                      <span>L 7,000.00</span>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium text-sm mb-2">Asiento Contable Automático:</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left p-1">Cuenta Contable</th>
                          <th className="text-center p-1">Debe</th>
                          <th className="text-center p-1">Haber</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td className="p-1">Gasto por Honorarios Profesionales</td>
                          <td className="text-center p-1">L 8,000.00</td>
                          <td className="text-center p-1">-</td>
                        </tr>
                        <tr className="bg-orange-50">
                          <td className="p-1">Retenciones de ISR por Pagar (Pasivo)</td>
                          <td className="text-center p-1">L 1,000.00</td>
                          <td className="text-center p-1">-</td>
                        </tr>
                        <tr>
                          <td className="p-1">Bancos / Cuentas por Pagar</td>
                          <td className="text-center p-1">-</td>
                          <td className="text-center p-1">L 7,000.00</td>
                        </tr>
                        <tr className="font-bold border-t">
                          <td className="p-1">TOTALES</td>
                          <td className="text-center p-1">L 8,000.00</td>
                          <td className="text-center p-1">L 8,000.00</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>

            
            {/* Módulo de Liquidación */}
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-3">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span className="font-medium">4. El "Módulo de Liquidación" al SAR</span>
              </div>
              <p className="text-sm text-gray-700 mb-3">
                Al final del mes, el contador debe pagar todas las retenciones acumuladas en la cuenta de pasivo al SAR.
              </p>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium text-sm mb-2 flex items-center gap-1">
                    <Eye className="h-3 w-3 text-cyan-500" />
                    Reporte
                  </p>
                  <p className="text-xs text-gray-600">
                    El sistema suma todo lo que hay en la cuenta "Retenciones de ISR por Pagar".
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium text-sm mb-2 flex items-center gap-1">
                    <Scale className="h-3 w-3 text-purple-500" />
                    Validación
                  </p>
                  <p className="text-xs text-gray-600">
                    El contador compara el reporte del sistema con los Comprobantes de Retención emitidos.
                  </p>
                </div>
                
                <div className="bg-white p-3 rounded border">
                  <p className="font-medium text-sm mb-2 flex items-center gap-1">
                    <Database className="h-3 w-3 text-green-500" />
                    Asiento de Pago
                  </p>
                  <p className="text-xs text-gray-600">
                    Al pagar al SAR: <strong>Debe:</strong> Retenciones por Pagar. <strong>Haber:</strong> Bancos.
                  </p>
                </div>
              </div>
              
              <div className="bg-green-100 p-3 rounded border border-green-300 mt-3">
                <p className="text-sm text-green-800">
                  <strong>Resultado:</strong> La cuenta queda en cero para iniciar el nuevo mes.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Resumen Mensual */}
      <Card className="bg-gradient-to-r from-cyan-50 to-cyan-50 border border-cyan-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileCheck className="h-5 w-5 text-cyan-600" />
            Resumen Mensual de Retenciones - Mayo 2026
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-4 bg-white rounded-lg text-center border border-green-200">
              <p className="text-2xl font-bold text-green-700">L 255.00</p>
              <p className="text-xs text-gray-600">Total Retenido 1%</p>
            </div>
            <div className="p-4 bg-yellow-50 rounded-lg text-center border border-yellow-200">
              <p className="text-2xl font-bold text-yellow-700">L 1,875.00</p>
              <p className="text-xs text-gray-600">Total Retenido 12.5%</p>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="text-left py-3 px-4 font-semibold">Proveedor</th>
                  <th className="text-left py-3 px-4 font-semibold">RTN</th>
                  <th className="text-left py-3 px-4 font-semibold">Base Imponible</th>
                  <th className="text-left py-3 px-4 font-semibold">Tipo Ret.</th>
                  <th className="text-left py-3 px-4 font-semibold">Impuesto Ret.</th>
                  <th className="text-left py-3 px-4 font-semibold">No. Comprobante</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {retencionesData.map((r, i) => (
                  <tr key={i} className="hover:bg-gray-50">
                    <td className="py-3 px-4">{r.proveedor}</td>
                    <td className="py-3 px-4 font-mono text-xs">{r.rtn}</td>
                    <td className="py-3 px-4">L {r.base.toLocaleString()}.00</td>
                    <td className="py-3 px-4">
                      <Badge className={r.tipo === '1%' ? 'bg-green-600 text-xs' : 'bg-orange-600 text-xs'}>
                        {r.tipo}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 font-medium text-green-600">L {r.monto}.00</td>
                    <td className="py-3 px-4 font-mono text-xs">{r.comprobante}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-gray-50 font-medium">
                <tr>
                  <td colSpan={4} className="py-3 px-4 text-right">TOTALES:</td>
                  <td className="py-3 px-4 text-cyan-700">L 880.00</td>
                  <td className="py-3 px-4"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Generador de Comprobantes */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <FileCheck className="h-5 w-5 text-green-600" />
            5. Generador de Comprobantes de Retención
          </CardTitle>
          <CardDescription>
            Creación automática de comprobantes legales conforme normativa SAR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <ComprobanteRetencion
              datosComprobante={{
                numero: 'CR-001-2026',
                fecha: new Date().toLocaleDateString('es-HN'),
                empresa: {
                  nombre: 'Clínica Dental Diamond',
                  rtn: '0801-1990-12345',
                  direccion: 'Colonia Los Robles, Tegucigalpa, Honduras'
                },
                proveedor: {
                  nombre: 'Suministros Médicos S.A.',
                  rtn: '0801-9000-01234'
                },
                cai: {
                  numero: '3B2D-9F4A-1234-5678',
                  rango: '000-002-05-00000001 al 000-002-05-00000500',
                  fechaLimite: '31/12/2026'
                },
                detalles: [
                  {
                    baseImponible: 10000.00,
                    tasa: 1,
                    montoRetenido: 100.00,
                    descripcion: 'Compra de materiales dentales - Factura #001-001-01-000125'
                  }
                ],
                correlativo: '000-002-05-00000124'
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Historial de Retenciones */}
      <HistoricoRetenciones
        onVerComprobante={(comprobante) => {
          console.log('Ver comprobante:', comprobante);
        }}
        onReimprimir={(comprobante) => {
          console.log('Reimprimir comprobante:', comprobante);
        }}
        onAnular={(comprobante) => {
          console.log('Anular comprobante:', comprobante);
        }}
      />
    </div>
  );
}
