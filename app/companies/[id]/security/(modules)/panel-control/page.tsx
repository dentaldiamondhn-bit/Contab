'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Shield,
  Lock,
  FileText,
  Scale,
  Percent,
  Activity,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Eye,
  Database,
  TrendingUp,
  TrendingDown,
  Clock,
  Users,
  FileCheck,
  RefreshCw
} from 'lucide-react';

interface PanelControlPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function PanelControlPage({ params }: PanelControlPageProps) {
  const { id: companyId } = use(params);
  const router = useRouter();

  const navigateToModule = (moduleId: string) => {
    router.push(`/companies/${companyId}/security/${moduleId}`);
  };

  // Datos simulados del panel central
  const resumenGeneral = {
    caiActivos: 2,
    caiPorVencer: 1,
    retencionesAcumuladas: 880.00,
    periodosCerrados: 3,
    auditoriasPendientes: 0,
    cumplimientoGeneral: 95
  };

  const modulosEstado = [
    {
      nombre: 'Seguridad Física',
      icon: Lock,
      estado: 'activo',
      descripcion: 'Control de acceso y bioseguridad',
      alertas: 0,
      ultimaActualizacion: '2026-04-09',
      moduleId: 'physical'
    },
    {
      nombre: 'Seguridad Legal',
      icon: FileText,
      estado: 'activo',
      descripcion: 'Documentación y cumplimiento normativo',
      alertas: 1,
      ultimaActualizacion: '2026-04-08',
      moduleId: 'legal'
    },
    {
      nombre: 'Retenciones ISR',
      icon: Percent,
      estado: 'activo',
      descripcion: 'Gestión de retenciones 1% y 12.5%',
      alertas: 0,
      ultimaActualizacion: '2026-04-09',
      moduleId: 'retenciones'
    },
    {
      nombre: 'Control CAI',
      icon: FileCheck,
      estado: 'advertencia',
      descripcion: 'Autorizaciones de facturación',
      alertas: 1,
      ultimaActualizacion: '2026-04-09',
      moduleId: 'cai'
    },
    {
      nombre: 'Cierre de Períodos',
      icon: Calendar,
      estado: 'activo',
      descripcion: 'Control de cierres mensuales',
      alertas: 0,
      ultimaActualizacion: '2026-04-05',
      moduleId: 'cierre'
    },
    {
      nombre: 'Auditoría',
      icon: Activity,
      estado: 'activo',
      descripcion: 'Registro de eventos y trazabilidad',
      alertas: 0,
      ultimaActualizacion: '2026-04-09',
      moduleId: 'auditoria'
    }
  ];

  const alertasRecientes = [
    {
      tipo: 'advertencia',
      modulo: 'Control CAI',
      mensaje: 'CAI 3B2D-9F4A-1234-5678 vence en 15 días',
      fecha: '2026-04-09 14:30',
      accion: 'Renovar'
    },
    {
      tipo: 'info',
      modulo: 'Seguridad Legal',
      mensaje: 'Licencia Dr. Martínez requiere renovación en 30 días',
      fecha: '2026-04-08 10:15',
      accion: 'Verificar'
    }
  ];

  const getEstadoColor = (estado: string) => {
    switch (estado) {
      case 'activo': return 'bg-green-600';
      case 'advertencia': return 'bg-yellow-600';
      case 'error': return 'bg-red-600';
      default: return 'bg-gray-600';
    }
  };

  const getAlertaColor = (tipo: string) => {
    switch (tipo) {
      case 'advertencia': return 'border-yellow-500 bg-yellow-50';
      case 'error': return 'border-red-500 bg-red-50';
      case 'info': return 'border-blue-500 bg-blue-50';
      default: return 'border-gray-500 bg-gray-50';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Shield className="h-5 w-5 text-indigo-600" />
            Panel Central de Control
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Monitoreo integral de sistemas de seguridad y cumplimiento fiscal
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-2">
            <RefreshCw className="h-4 w-4" />
            Actualizar
          </Button>
          <Badge variant="default" className="bg-indigo-600">
            {resumenGeneral.cumplimientoGeneral}% Cumplimiento
          </Badge>
        </div>
      </div>

      {/* KPIs Generales */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <Card className="text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToModule('cai')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <FileCheck className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{resumenGeneral.caiActivos}</p>
            <p className="text-xs text-gray-600">CAI Activos</p>
          </CardContent>
        </Card>
        
        <Card className="text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToModule('cai')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Clock className="h-5 w-5 text-yellow-600" />
            </div>
            <p className="text-2xl font-bold text-yellow-600">{resumenGeneral.caiPorVencer}</p>
            <p className="text-xs text-gray-600">CAI por Vencer</p>
          </CardContent>
        </Card>
        
        <Card className="text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToModule('retenciones')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Percent className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-600">L {resumenGeneral.retencionesAcumuladas}</p>
            <p className="text-xs text-gray-600">Retenciones Acumuladas</p>
          </CardContent>
        </Card>
        
        <Card className="text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToModule('cierre')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <Lock className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-600">{resumenGeneral.periodosCerrados}</p>
            <p className="text-xs text-gray-600">Períodos Cerrados</p>
          </CardContent>
        </Card>
        
        <Card className="text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToModule('auditoria')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-600">{resumenGeneral.auditoriasPendientes}</p>
            <p className="text-xs text-gray-600">Auditorías Pendientes</p>
          </CardContent>
        </Card>
        
        <Card className="text-center cursor-pointer hover:shadow-md transition-shadow" onClick={() => navigateToModule('matrix')}>
          <CardContent className="p-4">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-600">{resumenGeneral.cumplimientoGeneral}%</p>
            <p className="text-xs text-gray-600">Cumplimiento General</p>
          </CardContent>
        </Card>
      </div>

      {/* Estado de Módulos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5 text-indigo-600" />
            Estado de Módulos de Seguridad
          </CardTitle>
          <CardDescription>
            Monitoreo en tiempo real de todos los sistemas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {modulosEstado.map((modulo, index) => {
              const Icon = modulo.icon;
              return (
                <Card 
                  key={index} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigateToModule(modulo.moduleId)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div className="p-2 bg-gray-50 rounded-lg">
                          <Icon className="h-4 w-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">{modulo.nombre}</p>
                          <p className="text-xs text-gray-500">{modulo.descripcion}</p>
                        </div>
                      </div>
                      <Badge className={getEstadoColor(modulo.estado)}>
                        {modulo.estado}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-1">
                        {modulo.alertas > 0 ? (
                          <>
                            <AlertTriangle className="h-3 w-3 text-yellow-600" />
                            <span className="text-yellow-600">{modulo.alertas} alertas</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-green-600">OK</span>
                          </>
                        )}
                      </div>
                      <span className="text-gray-500">
                        {modulo.ultimaActualizacion}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Alertas Recientes */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Alertas Recientes
          </CardTitle>
          <CardDescription>
            Eventos que requieren atención
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {alertasRecientes.map((alerta, index) => (
              <div key={index} className={`p-4 rounded-lg border-l-4 ${getAlertaColor(alerta.tipo)}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <div>
                      <p className="font-medium text-sm">{alerta.mensaje}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                        <span>{alerta.modulo}</span>
                        <span>•</span>
                        <span>{alerta.fecha}</span>
                      </div>
                    </div>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => {
                      if (alerta.accion === 'Renovar') {
                        navigateToModule('cai');
                      } else if (alerta.accion === 'Verificar') {
                        navigateToModule('legal');
                      }
                    }}
                  >
                    {alerta.accion}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Acciones Rápidas
          </CardTitle>
          <CardDescription>
            Tareas comunes y accesos directos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigateToModule('cai')}>
              <FileCheck className="h-4 w-4" />
              Nuevo CAI
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigateToModule('cierre')}>
              <Calendar className="h-4 w-4" />
              Cerrar Mes
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigateToModule('retenciones')}>
              <Scale className="h-4 w-4" />
              Pagar SAR
            </Button>
            <Button variant="outline" size="sm" className="gap-2" onClick={() => navigateToModule('auditoria')}>
              <Eye className="h-4 w-4" />
              Ver Auditoría
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
