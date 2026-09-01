'use client';

import { use } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import YearSelector from '../../components/YearSelector';
import { 
  DatabaseBackup,
  HardDrive,
  Cloud,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Download,
  Calendar,
  FileText,
  Shield,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';
import { useState } from 'react';

interface RespaldoPageProps {
  params: Promise<{
    id: string;
  }>;
}

interface BackupRecord {
  id: string;
  tipo: 'completo' | 'parcial' | 'incremental';
  fecha: string;
  hora: string;
  tamano: string;
  estado: 'completado' | 'en_progreso' | 'fallido';
  archivo: string;
  incluye: string[];
}

const datosBackups: Record<string, BackupRecord[]> = {
  '2026': [
    { 
      id: '1', 
      tipo: 'completo', 
      fecha: '2026-05-20', 
      hora: '02:00:00',
      tamano: '2.4 GB',
      estado: 'completado',
      archivo: 'backup_completo_2026-05-20.zip',
      incluye: ['Contabilidad', 'Facturación', 'Inventarios', 'Usuarios']
    },
    { 
      id: '2', 
      tipo: 'incremental', 
      fecha: '2026-05-24', 
      hora: '02:00:00',
      tamano: '156 MB',
      estado: 'completado',
      archivo: 'backup_incremental_2026-05-24.zip',
      incluye: ['Cambios del día']
    },
    { 
      id: '3', 
      tipo: 'completo', 
      fecha: '2026-04-20', 
      hora: '02:00:00',
      tamano: '2.3 GB',
      estado: 'completado',
      archivo: 'backup_completo_2026-04-20.zip',
      incluye: ['Contabilidad', 'Facturación', 'Inventarios', 'Usuarios']
    },
  ]
};

export default function RespaldoPage({ params }: RespaldoPageProps) {
  const { id: companyId } = use(params);
  const [anioSeleccionado, setAnioSeleccionado] = useState('2026');
  const [backups, setBackups] = useState<BackupRecord[]>(datosBackups['2026'] || []);
  const [creandoBackup, setCreandoBackup] = useState(false);

  const handleAnioChange = (anio: string) => {
    setAnioSeleccionado(anio);
    setBackups(datosBackups[anio as keyof typeof datosBackups] || []);
  };

  const handleCrearBackup = () => {
    setCreandoBackup(true);
    setTimeout(() => {
      setCreandoBackup(false);
    }, 3000);
  };

  const getTipoColor = (tipo: string) => {
    switch (tipo) {
      case 'completo': return 'bg-cyan-600';
      case 'parcial': return 'bg-yellow-600';
      case 'incremental': return 'bg-green-600';
      default: return 'bg-gray-600';
    }
  };

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'completado': return 'bg-green-600';
      case 'en_progreso': return 'bg-cyan-600';
      case 'fallido': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <DatabaseBackup className="h-5 w-5 text-cyan-600" />
            Respaldo de Información - {anioSeleccionado}
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Gestión y programación de copias de seguridad del sistema
          </p>
        </div>
        <div className="flex items-center gap-3">
          <YearSelector 
            onYearChange={handleAnioChange}
            selectedYear={anioSeleccionado}
            badgeText="Respaldos"
          />
          <Button 
            className="gap-2" 
            onClick={handleCrearBackup}
            disabled={creandoBackup}
          >
            <RefreshCw className={`h-4 w-4 ${creandoBackup ? 'animate-spin' : ''}`} />
            {creandoBackup ? 'Creando...' : 'Crear Backup'}
          </Button>
        </div>
      </div>

      {/* Estadísticas */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <HardDrive className="h-5 w-5 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-cyan-600">{backups.length}</p>
            <p className="text-xs text-gray-600">Total Respaldos</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">
              {backups.filter(b => b.estado === 'completado').length}
            </p>
            <p className="text-xs text-gray-600">Exitosos</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Cloud className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">5.4 GB</p>
            <p className="text-xs text-gray-600">Almacenamiento Usado</p>
          </CardContent>
        </Card>
        
        <Card className="text-center">
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Calendar className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">4 días</p>
            <p className="text-xs text-gray-600">Último Backup</p>
          </CardContent>
        </Card>
      </div>

      {/* Programación automática */}
      <Card className="border-l-4 border-l-green-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-green-600" />
            Programación Automática
          </CardTitle>
          <CardDescription>
            Configuración de respaldos automáticos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <p className="font-medium">Respaldo Completo</p>
              </div>
              <p className="text-sm text-gray-600">Mensual - Día 20 de cada mes</p>
              <p className="text-xs text-gray-500 mt-1">02:00 AM - Sin usuarios activos</p>
              <Badge className="mt-2 bg-green-600">Activo</Badge>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <RefreshCw className="h-4 w-4 text-green-600" />
                <p className="font-medium">Respaldo Incremental</p>
              </div>
              <p className="text-sm text-gray-600">Diario - Lunes a Domingo</p>
              <p className="text-xs text-gray-500 mt-1">02:00 AM - Solo cambios</p>
              <Badge className="mt-2 bg-green-600">Activo</Badge>
            </div>
            
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-2 mb-2">
                <Cloud className="h-4 w-4 text-green-600" />
                <p className="font-medium">Almacenamiento en Nube</p>
              </div>
              <p className="text-sm text-gray-600">Google Drive / AWS S3</p>
              <p className="text-xs text-gray-500 mt-1">3 copias en diferentes regiones</p>
              <Badge className="mt-2 bg-green-600">Configurado</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Historial de Respaldos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-cyan-600" />
            Historial de Respaldos
          </CardTitle>
          <CardDescription>
            Lista de todos los respaldos realizados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {backups.length === 0 ? (
            <div className="text-center py-8">
              <DatabaseBackup className="h-12 w-12 mx-auto text-gray-300 mb-4" />
              <p className="text-gray-600">No hay respaldos en este período</p>
            </div>
          ) : (
            <div className="space-y-4">
              {backups.map((backup) => (
                <div key={backup.id} className="border rounded-lg p-4 hover:bg-gray-50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <DatabaseBackup className="h-5 w-5 text-gray-600" />
                        </div>
                        <div>
                          <h3 className="font-medium">{backup.archivo}</h3>
                          <p className="text-sm text-gray-500">
                            {backup.fecha} - {backup.hora}
                          </p>
                        </div>
                        <Badge className={`${getTipoColor(backup.tipo)} text-white ml-auto`}>
                          {backup.tipo}
                        </Badge>
                        <Badge className={`${getEstadoColor(backup.estado)} text-white ml-2`}>
                          {backup.estado === 'completado' ? 'Completado' : 
                           backup.estado === 'en_progreso' ? 'En Progreso' : 'Fallido'}
                        </Badge>
                      </div>
                      
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-gray-500">Tamaño:</span>
                        <span className="font-medium">{backup.tamano}</span>
                      </div>
                      
                      <div className="mt-2">
                        <span className="text-gray-500 text-sm">Incluye: </span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {backup.incluye.map((item, idx) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {item}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Descargar
                      </Button>
                      <Button variant="outline" size="sm" className="gap-2">
                        <ArrowRight className="h-4 w-4" />
                        Restaurar
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Seguridad de Respaldos */}
      <Card className="border-l-4 border-l-cyan-500">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-cyan-600" />
            Seguridad y Encriptación
          </CardTitle>
          <CardDescription>
            Protección de los archivos de respaldo
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <Shield className="h-4 w-4 text-cyan-600" />
                  <p className="font-medium">Encriptación AES-256</p>
                </div>
                <p className="text-sm text-gray-600">
                  Todos los archivos de respaldo están encriptados
                </p>
                <Badge className="mt-2 bg-cyan-600">Habilitado</Badge>
              </div>
              
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="h-4 w-4 text-cyan-600" />
                  <p className="font-medium">Retención de Copias</p>
                </div>
                <p className="text-sm text-gray-600">
                  12 meses de historial disponible
                </p>
                <Badge className="mt-2 bg-cyan-600">Configurado</Badge>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-cyan-600" />
                  <p className="font-medium">Verificación de Integridad</p>
                </div>
                <p className="text-sm text-gray-600">
                  Checksum SHA-256 al finalizar cada backup
                </p>
                <Badge className="mt-2 bg-cyan-600">Automático</Badge>
              </div>
              
              <div className="p-4 bg-cyan-50 rounded-lg border border-cyan-200">
                <div className="flex items-center gap-2 mb-2">
                  <HardDrive className="h-4 w-4 text-cyan-600" />
                  <p className="font-medium">Almacenamiento Local</p>
                </div>
                <p className="text-sm text-gray-600">
                  Copia local en servidor + nube externa
                </p>
                <Badge className="mt-2 bg-cyan-600">Activo</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}