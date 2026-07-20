'use client';

import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import YearSelector from '../../components/YearSelector';
import { 
  RefreshCw,
  Send,
  FileText,
  CheckCircle,
  AlertTriangle,
  Clock,
  Calendar,
  Shield,
  Database,
  ExternalLink
} from 'lucide-react';
import { useState } from 'react';

interface TaxIntegrationPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface FilingStatus {
  id: string;
  period: string;
  type: 'ISV' | 'RETENCIONES';
  status: 'pending' | 'submitted' | 'accepted' | 'rejected';
  submittedAt?: string;
  reference?: string;
  error?: string;
}

const historialFilings: FilingStatus[] = [
  { id: '1', period: '2026-04', type: 'ISV', status: 'accepted', submittedAt: '2026-05-10', reference: 'SAR-2026-001245' },
  { id: '2', period: '2026-04', type: 'RETENCIONES', status: 'accepted', submittedAt: '2026-05-10', reference: 'SAR-2026-R00892' },
  { id: '3', period: '2026-03', type: 'ISV', status: 'accepted', submittedAt: '2026-04-12', reference: 'SAR-2026-001198' },
  { id: '4', period: '2026-03', type: 'RETENCIONES', status: 'rejected', submittedAt: '2026-04-12', error: 'Formato de archivo incorrecto' },
];

export default function TaxIntegrationPage({ params }: TaxIntegrationPageProps) {
  const { id: companyId } = use(params);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');
  const [filings, setFilings] = useState<FilingStatus[]>(historialFilings);
  const [procesando, setProcesando] = useState(false);

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
  };

  const handleSubmit = async (type: 'ISV' | 'RETENCIONES') => {
    setProcesando(true);
    try {
      const response = await fetch('/api/tax-integration', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          period: `2026-04`,
          type,
          autoSubmit: true
        })
      });
      
      const data = await response.json();
      if (data.success) {
        setFilings([data.data, ...filings]);
      }
    } catch (error) {
      console.error('Error submitting to SAR:', error);
    } finally {
      setProcesando(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'accepted': return 'bg-green-600';
      case 'submitted': return 'bg-blue-600';
      case 'pending': return 'bg-yellow-600';
      case 'rejected': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'accepted': return <CheckCircle className="h-4 w-4" />;
      case 'submitted': return <Clock className="h-4 w-4" />;
      case 'pending': return <AlertTriangle className="h-4 w-4" />;
      case 'rejected': return <AlertTriangle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-indigo-600" />
            Integración con Impuestos - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Envío automático de declaraciones a los sistemas fiscales
          </p>
        </div>
        <YearSelector 
          onYearChange={handleAnioChange}
          selectedYear={anioSeleccionado}
          badgeText="Declaraciones Fiscales"
        />
      </div>

      {/* Configuración */}
      <Card className="border-l-4 border-l-blue-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-blue-600" />
            Configuración de Integración
          </CardTitle>
          <CardDescription>
            Conexión con sistemas fiscales del SAR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="h-4 w-4 text-blue-600" />
                <p className="font-medium">API SAR</p>
              </div>
              <p className="text-sm text-gray-600">
                Conexión: Activa (Modo Sandbox)
              </p>
              <Badge className="mt-2 bg-blue-600">Configurado</Badge>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-blue-600" />
                <p className="font-medium">Programación</p>
              </div>
              <p className="text-sm text-gray-600">
                Envío automático: Día 10 de cada mes
              </p>
              <Badge className="mt-2 bg-blue-600">Activo</Badge>
            </div>
            
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center gap-2 mb-2">
                <Database className="h-4 w-4 text-blue-600" />
                <p className="font-medium">Formato</p>
              </div>
              <p className="text-sm text-gray-600">
                XML estructurado para SAR
              </p>
              <Badge className="mt-2 bg-blue-600">Listo</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5 text-green-600" />
            Envío de Declaraciones
          </CardTitle>
          <CardDescription>
            Generar y enviar declaraciones al SAR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium">Declaración ISV</h3>
                  <p className="text-sm text-gray-500">Impuesto sobre Ventas</p>
                </div>
                <Badge className="bg-green-600">Listo</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Periodo: Abril 2026
              </p>
              <Button 
                className="w-full gap-2"
                onClick={() => handleSubmit('ISV')}
                disabled={procesando}
              >
                <Send className="h-4 w-4" />
                Enviar a SAR
              </Button>
            </div>
            
            <div className="p-4 border rounded-lg">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <h3 className="font-medium">Retenciones ISR</h3>
                  <p className="text-sm text-gray-500">Impuesto sobre Renta</p>
                </div>
                <Badge className="bg-green-600">Listo</Badge>
              </div>
              <p className="text-sm text-gray-600 mb-3">
                Periodo: Abril 2026
              </p>
              <Button 
                className="w-full gap-2"
                onClick={() => handleSubmit('RETENCIONES')}
                disabled={procesando}
              >
                <Send className="h-4 w-4" />
                Enviar a SAR
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial de Envíos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-indigo-600" />
            Historial de Presentaciones
          </CardTitle>
          <CardDescription>
            Registro de declaraciones presentadas al SAR
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filings.map((filing) => (
              <div key={filing.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <FileText className="h-5 w-5 text-gray-600" />
                      <div>
                        <h3 className="font-medium">
                          Declaración {filing.type} - {filing.period}
                        </h3>
                        <p className="text-sm text-gray-500">
                          Presentado: {filing.submittedAt ? new Date(filing.submittedAt).toLocaleDateString() : 'N/A'}
                        </p>
                      </div>
                      <Badge className={`${getStatusColor(filing.status)} text-white ml-auto`}>
                        <span className="flex items-center gap-1">
                          {getStatusIcon(filing.status)}
                          {filing.status}
                        </span>
                      </Badge>
                    </div>
                    
                    {filing.reference && (
                      <p className="text-sm text-gray-600">
                        Referencia SAR: <span className="font-mono">{filing.reference}</span>
                      </p>
                    )}
                    
                    {filing.error && (
                      <p className="text-sm text-red-600">
                        Error: {filing.error}
                      </p>
                    )}
                  </div>
                  
                  <Button variant="outline" size="sm" className="gap-2">
                    <ExternalLink className="h-4 w-4" />
                    Ver
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}