'use client';

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  QrCode,
  ScanLine,
  Clock,
  CheckCircle,
  AlertTriangle,
  Stethoscope,
  Wifi,
  Power,
  Sparkles,
  Droplets
} from 'lucide-react';

export default function ProtocolsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">
            <QrCode className="h-5 w-5 text-green-600" />
            Protocolos Check-In / Check-Out
          </h2>
          <p className="text-gray-600 text-sm mt-1">
            Sistema de registro y trazabilidad de uso de espacios
          </p>
        </div>
        <Badge variant="default" className="bg-green-600">Operativo</Badge>
      </div>

      {/* QR System */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-green-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-green-600" />
              QR Code por Cubículo
            </CardTitle>
            <CardDescription>
              Código único impreso en cada espacio de trabajo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-center p-6 bg-gray-50 rounded-lg">
              <div className="text-center">
                <QrCode className="h-32 w-32 mx-auto text-gray-800" />
                <p className="mt-2 text-sm text-gray-600">Cubículo #A-101</p>
                <p className="text-xs text-gray-400">Último escaneo: 14:30</p>
              </div>
            </div>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>QR único por espacio físico</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Impresión laminada resistente</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-green-600 mt-0.5" />
                <span>Ubicación visible al entrar</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card className="border-cyan-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ScanLine className="h-5 w-5 text-cyan-600" />
              App Check-In / Check-Out
            </CardTitle>
            <CardDescription>
              Registro en tiempo real desde dispositivo móvil
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-4 bg-cyan-50 rounded-lg space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                  <Clock className="h-5 w-5 text-green-600" />
                </div>
                <div>
                  <p className="font-medium">Dr. Martínez - Check-In</p>
                  <p className="text-sm text-gray-500">14:00 - Cubículo A-101</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                  <Power className="h-5 w-5 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Dr. López - Check-Out</p>
                  <p className="text-sm text-gray-500">13:45 - Cubículo A-102</p>
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button className="flex-1 bg-green-600">
                <Clock className="h-4 w-4 mr-2" />
                Check-In
              </Button>
              <Button className="flex-1 bg-red-600">
                <Power className="h-4 w-4 mr-2" />
                Check-Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wifi className="h-5 w-5 text-cyan-600" />
              Conectividad
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-600 mt-0.5" />
                <span>WiFi de alta velocidad (500+ Mbps)</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-600 mt-0.5" />
                <span>Red separada para equipos médicos</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-600 mt-0.5" />
                <span>Backup de conexión 4G/5G</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Stethoscope className="h-5 w-5 text-cyan-600" />
              Equipamiento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-600 mt-0.5" />
                <span>Unidad dental completa</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-600 mt-0.5" />
                <span>Lámpara de fotocurado</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-cyan-600 mt-0.5" />
                <span>Equipo de rayos X digital</span>
              </li>
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-5 w-5 text-purple-600" />
              Insumos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2 text-sm">
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                <span>Batas y cubrebocas disponibles</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                <span>Material de esterilización</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle className="h-4 w-4 text-purple-600 mt-0.5" />
                <span>Sistema de reposición automática</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Hygiene Protocol */}
      <Card className="border-dashed border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Droplets className="h-5 w-5 text-purple-600" />
            Protocolo de Higiene Post-Uso
          </CardTitle>
          <CardDescription>
            Checklist obligatorio al finalizar cada jornada
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                <span className="text-sm">Desinfección de superficies de contacto</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                <span className="text-sm">Esterilización de instrumental utilizado</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                <span className="text-sm">Cambio de fundas de unidad dental</span>
              </label>
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                <span className="text-sm">Limpieza de aspiradora y sistema de evacuación</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                <span className="text-sm">Disposición de residuos biológicos (RPBI)</span>
              </label>
              <label className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg cursor-pointer hover:bg-gray-100">
                <input type="checkbox" className="h-4 w-4 rounded border-gray-300" />
                <span className="text-sm">Foto de evidencia de área limpia</span>
              </label>
            </div>
          </div>
          <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-200">
            <p className="text-sm text-purple-800 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              La penalización por no cumplir el protocolo es de L. 500.00 por incidente
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
