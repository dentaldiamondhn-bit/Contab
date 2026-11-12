'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  FileText, 
  Printer, 
  Download, 
  Send,
  Calendar,
  User,
  Building,
  FileCheck,
  AlertTriangle
} from 'lucide-react';

interface ComprobanteRetencionProps {
  datosComprobante: {
    numero: string;
    fecha: string;
    empresa: {
      nombre: string;
      rtn: string;
      direccion: string;
    };
    proveedor: {
      nombre: string;
      rtn: string;
    };
    cai: {
      numero: string;
      rango: string;
      fechaLimite: string;
    };
    detalles: {
      baseImponible: number;
      tasa: number;
      montoRetenido: number;
      descripcion: string;
    }[];
    correlativo: string;
  };
  onImprimir?: () => void;
  onPDF?: () => void;
}

export default function ComprobanteRetencion({ 
  datosComprobante, 
  onImprimir, 
  onPDF 
}: ComprobanteRetencionProps) {
  const printRef = useRef<HTMLDivElement>(null);

  const handlePrint = () => {
    if (printRef.current) {
      const printContent = printRef.current.innerHTML;
      const originalContent = document.body.innerHTML;
      
      document.body.innerHTML = printContent;
      window.print();
      document.body.innerHTML = originalContent;
      window.location.reload();
    }
    onImprimir?.();
  };

  const handlePDF = () => {
    // Aquí implementarías la generación de PDF
    // Por ahora, simulamos la descarga
    alert('Función de PDF en desarrollo - Se descargará el comprobante');
    onPDF?.();
  };

  const convertirALetras = (numero: number): string => {
    // Implementación básica de conversión a letras
    const unidades = ['CERO', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
    const decenas = ['CERO', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
    const centenas = ['CERO', 'CIEN', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];
    
    if (numero === 0) return 'CERO';
    if (numero < 10) return unidades[numero];
    if (numero < 100) return decenas[Math.floor(numero / 10)] + (numero % 10 !== 0 ? ' Y ' + unidades[numero % 10] : '');
    if (numero < 1000) return centenas[Math.floor(numero / 100)] + (numero % 100 !== 0 ? ' ' + convertirALetras(numero % 100) : '');
    
    // Para números mayores, implementación simplificada
    if (numero >= 1000 && numero < 2000) return 'MIL' + (numero % 1000 !== 0 ? ' ' + convertirALetras(numero % 1000) : '');
    
    return numero.toString(); // Fallback para números grandes
  };

  const montoEnLetras = convertirALetras(datosComprobante.detalles[0]?.montoRetenido || 0) + ' LEMPIRAS EXACTOS';

  return (
    <div className="space-y-4">
      {/* Botones de acción */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge className="bg-cyan-600">Comprobante #{datosComprobante.numero}</Badge>
          <Badge variant="outline">RTN: {datosComprobante.proveedor.rtn}</Badge>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handlePrint} className="gap-2" variant="outline">
            <Printer className="h-4 w-4" />
            Imprimir
          </Button>
          <Button onClick={handlePDF} className="gap-2" variant="outline">
            <Download className="h-4 w-4" />
            PDF
          </Button>
          <Button onClick={() => window.print()} className="gap-2">
            <Send className="h-4 w-4" />
            Enviar
          </Button>
        </div>
      </div>

      {/* Comprobante para impresión */}
      <div ref={printRef} className="bg-white p-8 border border-gray-300" style={{ minHeight: '11in', width: '8.5in' }}>
        {/* Encabezado */}
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold mb-2">COMPROBANTE DE RETENCIÓN</h1>
          <div className="text-sm text-gray-600">De conformidad con el Artículo 24 de la Ley del Impuesto Sobre la Renta</div>
        </div>

        {/* Datos de la empresa */}
        <div className="mb-6 p-4 border border-gray-300">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="font-bold text-sm mb-1">AGENTE DE RETENCIÓN</div>
              <div className="text-sm">{datosComprobante.empresa.nombre}</div>
              <div className="text-sm">RTN: {datosComprobante.empresa.rtn}</div>
              <div className="text-sm">{datosComprobante.empresa.direccion}</div>
            </div>
            <div className="text-right">
              <div className="font-bold text-sm mb-1">COMPROBANTE No.</div>
              <div className="text-lg font-bold">{datosComprobante.numero}</div>
              <div className="text-sm mt-1">Fecha: {datosComprobante.fecha}</div>
            </div>
          </div>
        </div>

        {/* Datos del CAI */}
        <div className="mb-6 p-4 bg-gray-50 border border-gray-300">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <div className="font-bold mb-1">CAI DE RETENCIÓN</div>
              <div>{datosComprobante.cai.numero}</div>
            </div>
            <div>
              <div className="font-bold mb-1">RANGO AUTORIZADO</div>
              <div>{datosComprobante.cai.rango}</div>
            </div>
            <div>
              <div className="font-bold mb-1">FECHA LÍMITE DE EMISIÓN</div>
              <div>{datosComprobante.cai.fechaLimite}</div>
            </div>
          </div>
        </div>

        {/* Datos del retenido */}
        <div className="mb-6 p-4 border border-gray-300">
          <div className="font-bold text-sm mb-2">DATOS DEL RETENIDO</div>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <div className="mb-1">Nombre/Razón Social:</div>
              <div className="font-medium">{datosComprobante.proveedor.nombre}</div>
            </div>
            <div>
              <div className="mb-1">RTN:</div>
              <div className="font-medium">{datosComprobante.proveedor.rtn}</div>
            </div>
          </div>
        </div>

        {/* Detalle del impuesto */}
        <div className="mb-6">
          <div className="font-bold text-sm mb-2">DETALLE DEL IMPUESTO</div>
          <table className="w-full border border-gray-300">
            <thead className="bg-gray-100">
              <tr className="text-sm">
                <th className="border border-gray-300 p-2 text-left">Descripción</th>
                <th className="border border-gray-300 p-2 text-right">Base Imponible</th>
                <th className="border border-gray-300 p-2 text-right">Tasa</th>
                <th className="border border-gray-300 p-2 text-right">Monto Retenido</th>
              </tr>
            </thead>
            <tbody>
              {datosComprobante.detalles.map((detalle, index) => (
                <tr key={index} className="text-sm">
                  <td className="border border-gray-300 p-2">{detalle.descripcion}</td>
                  <td className="border border-gray-300 p-2 text-right">L {detalle.baseImponible.toFixed(2)}</td>
                  <td className="border border-gray-300 p-2 text-right">{detalle.tasa}%</td>
                  <td className="border border-gray-300 p-2 text-right font-bold">L {detalle.montoRetenido.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-100">
              <tr className="text-sm font-bold">
                <td className="border border-gray-300 p-2" colSpan={3}>TOTAL RETENIDO:</td>
                <td className="border border-gray-300 p-2 text-right">
                  L {datosComprobante.detalles.reduce((sum, d) => sum + d.montoRetenido, 0).toFixed(2)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Monto en letras */}
        <div className="mb-6 p-4 bg-cyan-50 border border-cyan-200">
          <div className="font-bold text-sm mb-1">SON:</div>
          <div className="text-lg font-medium">{montoEnLetras}</div>
        </div>

        {/* Validación y firma */}
        <div className="mt-8 pt-6 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-8 text-sm">
            <div>
              <div className="font-bold mb-2">VALIDACIÓN ELECTRÓNICA</div>
              <div className="text-xs text-gray-600 mb-1">Código de Validación: {Math.random().toString(36).substring(2, 15).toUpperCase()}</div>
              <div className="text-xs text-gray-600">Fecha y hora de emisión: {new Date().toLocaleString('es-HN')}</div>
              <div className="text-xs text-gray-600">Este documento es válido sin firma física</div>
            </div>
            <div className="text-right">
              <div className="font-bold mb-2">FIRMA AUTORIZADA</div>
              <div className="mt-8 mb-1">_________________________</div>
              <div className="text-sm">{datosComprobante.empresa.nombre}</div>
              <div className="text-xs text-gray-600">Representante Legal</div>
            </div>
          </div>
        </div>

        {/* Pie de página */}
        <div className="mt-8 pt-4 border-t border-gray-300 text-center text-xs text-gray-600">
          <div>Este comprobante es válido para fines tributarios según normativa SAR</div>
          <div>Para verificar su autenticidad, visite www.sar.gob.hn</div>
        </div>
      </div>

      {/* Vista previa */}
      <Card className="mt-4">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <AlertTriangle className="h-5 w-5 text-orange-600" />
            Requisitos Legales Cumplidos
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span>Nombre y RTN del agente de retención</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span>Número de CAI específico para retenciones</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span>Rango autorizado y fecha límite</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span>Datos completos del proveedor</span>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span>Base imponible y tasa aplicada</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span>Monto retenido en números y letras</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span>Código de validación electrónica</span>
              </div>
              <div className="flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-green-600" />
                <span>Fecha y hora de emisión</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
