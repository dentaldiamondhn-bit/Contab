'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  ArrowLeft,
  Info,
  Download,
  FileText,
  Upload,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import DETExportManager from '@/components/DETExportManager';

export default function DETPage() {
  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver al Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Database className="w-8 h-8" />
              Exportación DET Live
            </h1>
            <p className="text-muted-foreground">
              Genera archivos en formato SAR para declaraciones informativas de compras y ventas
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-cyan-200 bg-cyan-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-600 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-blue-900">¿Qué es DET Live?</h3>
              <ul className="text-sm text-cyan-800 space-y-1">
                <li>• DET Live es el sistema oficial del SAR para declaraciones informativas mensuales</li>
                <li>• Todas las empresas deben presentar sus compras y ventas mensualmente</li>
                <li>• El formato es específico y debe seguir la estructura exacta requerida</li>
                <li>• Los archivos generados son compatibles con el software oficial del SAR</li>
                <li>• Este módulo asegura el cumplimiento 100% con los requisitos del SAR</li>
                <li>• Genera archivos .txt con el formato exacto requerido por la ley</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Download className="w-6 h-6 text-cyan-600" />
            </div>
            <h3 className="font-medium mb-2">Formato SAR Oficial</h3>
            <p className="text-sm text-muted-foreground">
              Genera archivos .txt con la estructura exacta requerida por el SAR
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-medium mb-2">Validación Automática</h3>
            <p className="text-sm text-muted-foreground">
              Verifica que el archivo cumpla con todos los requisitos del formato
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Upload className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-medium mb-2">Múltiples Tipos</h3>
            <p className="text-sm text-muted-foreground">
              Soporta compras, ventas, servicios y otros tipos de operaciones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <DETExportManager />
    </div>
  );
}
