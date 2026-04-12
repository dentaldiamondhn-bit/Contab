'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Shield, 
  ArrowLeft,
  Info,
  FileText,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import Link from 'next/link';
import CAIManager from '@/components/CAIManager';
import CAIDashboard from '@/components/dashboard/CAIDashboard';

export default function CAIPage() {
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
              <Shield className="w-8 h-8" />
              Gestión de CAI
            </h1>
            <p className="text-muted-foreground">
              Administra los Códigos de Autorización de Impresión del SAR
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
              <h3 className="font-medium text-blue-900">¿Qué es un CAI?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• El Código de Autorización de Impresión (CAI) es un requisito del SAR para emitir facturas</li>
                <li>• Cada CAI tiene un rango numerado autorizado y una fecha de vencimiento</li>
                <li>• El sistema alertará cuando queden 10 facturas o 1 mes para vencer</li>
                <li>• Es obligatorio para todas las empresas emisoras de facturas en Honduras</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      <CAIManager />
    </div>
  );
}
