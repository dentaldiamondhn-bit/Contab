'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Receipt, 
  ArrowLeft,
  Info,
  Calculator,
  FileText,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import WithholdingManager from '@/components/WithholdingManager';

export default function WithholdingPage() {
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
              <Receipt className="w-8 h-8" />
              Gestión de Retenciones
            </h1>
            <p className="text-muted-foreground">
              Calcula y gestiona las retenciones del 1% y 12.5% sobre honorarios profesionales
            </p>
          </div>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-blue-900">¿Qué son las Retenciones?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Las retenciones son pagos anticipados de impuestos que deben realizarse sobre ciertos pagos</li>
                <li>• Para servicios profesionales en Honduras: 1% o 12.5% según el tipo de servicio</li>
                <li>• El sistema calcula automáticamente el monto y genera el comprobante de retención</li>
                <li>• Los comprobantes son necesarios para la declaración anual ante el SAR</li>
                <li>• Las retenciones deben ser declaradas y pagadas mensualmente al SAR</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Calculator className="w-6 h-6 text-blue-600" />
            </div>
            <h3 className="font-medium mb-2">Cálculo Automático</h3>
            <p className="text-sm text-muted-foreground">
              Calcula automáticamente 1% o 12.5% según el tipo de servicio
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-medium mb-2">Comprobantes PDF</h3>
            <p className="text-sm text-muted-foreground">
              Genera comprobantes de retención listos para el SAR
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-medium mb-2">Gestión Completa</h3>
            <p className="text-sm text-muted-foreground">
              Controla estado y pagos de todas las retenciones
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <WithholdingManager />
    </div>
  );
}
