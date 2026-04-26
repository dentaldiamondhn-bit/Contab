"use client";

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Download, Eye, X } from 'lucide-react';

interface InvoiceImageProps {
  tenant: any;
  caiInfo: any;
  invoiceItems: any[];
  invoiceNumber?: string;
  notes?: string;
  onClose: () => void;
}

export default function InvoiceImage({ 
  tenant, 
  caiInfo, 
  invoiceItems, 
  invoiceNumber,
  notes,
  onClose 
}: InvoiceImageProps) {
  const invoiceRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(false);

  console.log('🖼️ InvoiceImage - Tenant recibido:', tenant);
  console.log('🖼️ InvoiceImage - InvoiceItems recibidos:', invoiceItems);
  console.log('🖼️ InvoiceImage - InvoiceItems[0]:', invoiceItems[0]);

  // Calcular totales
  const subtotal = invoiceItems.reduce((sum, item) => sum + item.subtotal, 0);
  const totalTax = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const total = subtotal + totalTax;

  console.log('🧮 InvoiceImage - Cálculos:', { subtotal, totalTax, total });

  // Formatear número de factura
  const formattedInvoiceNumber = invoiceNumber || `000-001-01-${String(caiInfo?.currentNumber || 1).padStart(8, '0')}`;
  
  // Convertir total a letras
  const totalInWords = convertNumberToWords(total);

  // Fecha actual
  const currentDate = new Date().toLocaleDateString('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  const handlePrint = () => {
    if (invoiceRef.current) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        const printContent = invoiceRef.current.innerHTML;
        printWindow.document.write(`
          <html>
            <head>
              <title>Factura #${formattedInvoiceNumber}</title>
              <style>
                body { font-family: Arial, sans-serif; margin: 20px; }
                .invoice-container { max-width: 800px; margin: 0 auto; }
                .header { text-align: center; margin-bottom: 30px; }
                .company-info { margin-bottom: 20px; }
                .fiscal-info { background: #f5f5f5; padding: 15px; margin: 20px 0; }
                .customer-info { margin: 20px 0; }
                table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
                th { background: #f5f5f5; }
                .totals { margin: 20px 0; }
                .footer { margin-top: 40px; font-size: 12px; color: #666; }
                @media print { body { margin: 0; } }
              </style>
            </head>
            <body>
              <div class="invoice-container">
                ${printContent}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }
    }
  };

  const handleDownload = async () => {
    if (!invoiceRef.current) return;
    
    setLoading(true);
    
    try {
      // Usar la API del navegador para crear una imagen
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Configurar el tamaño del canvas
      canvas.width = 800;
      canvas.height = 1200;
      
      if (ctx) {
        // Fondo blanco
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Agregar texto de la factura (simplificado)
        ctx.fillStyle = '#000000';
        ctx.font = 'bold 24px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('FACTURA', canvas.width / 2, 50);
        
        ctx.font = '16px Arial';
        ctx.fillText(`${caiInfo?.businessName || 'CONTAB HN'}`, canvas.width / 2, 80);
        ctx.fillText(`RTN: ${caiInfo?.rtn || '05011991078006'}`, canvas.width / 2, 100);
        ctx.fillText(`Factura #: ${formattedInvoiceNumber}`, canvas.width / 2, 120);
        
        // Descargar la imagen
        canvas.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `factura-${formattedInvoiceNumber}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          }
        });
      }
    } catch (error) {
      console.error('Error al descargar la factura:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-5xl max-h-[90vh] w-full mx-4 overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold">Vista Previa de Factura</h3>
          <div className="flex space-x-2">
            <Button
              onClick={handlePrint}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              Imprimir
            </Button>
            <Button
              onClick={handleDownload}
              variant="outline"
              size="sm"
              disabled={loading}
            >
              <Download className="h-4 w-4 mr-2" />
              {loading ? 'Generando...' : 'Descargar'}
            </Button>
            <Button
              onClick={onClose}
              variant="outline"
              size="sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Content */}
        <div className="overflow-y-auto max-h-[90vh] p-6">
          <div ref={invoiceRef} className="bg-white p-8">
            {/* Encabezado e Identificación de la Empresa */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-gray-900 mb-2">
                {caiInfo?.businessName || 'CONTAB HN'}
              </h1>
              <div className="text-sm text-gray-600 space-y-1">
                <p><strong>RTN:</strong> {caiInfo?.rtn || '05011991078006'}</p>
                <p><strong>Dirección:</strong> {caiInfo?.businessAddress || 'Tegucigalpa, Honduras'}</p>
                <p><strong>Contacto:</strong> {tenant?.businessEmail || 'contabhn@email.com'} | {tenant?.phoneNumber || '+504 0000-0000'}</p>
              </div>
            </div>

            {/* Nombre del Documento */}
            <div className="text-center mb-6">
              <h2 className="text-3xl font-bold text-gray-900 border-b-4 border-gray-900 pb-2 inline-block">
                FACTURA
              </h2>
            </div>

            {/* Datos de Autorización (Fiscales) */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">CAI:</p>
                    <p className="text-xs text-gray-600">{caiInfo?.cai || 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Rango de Facturación:</p>
                    <p className="text-xs text-gray-600">
                      {String(caiInfo?.rangeStart || 1).padStart(8, '0')} al {String(caiInfo?.rangeEnd || 50).padStart(8, '0')}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Fecha Límite de Emisión:</p>
                    <p className="text-xs text-gray-600">
                      {caiInfo?.expiryDate ? new Date(caiInfo.expiryDate).toLocaleDateString('es-HN') : '31/12/2026'}
                    </p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Número de Factura:</p>
                    <p className="text-xs text-gray-600">{formattedInvoiceNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información del Cliente */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-700">Nombre o Razón Social del Cliente:</p>
                    <p className="text-gray-900">{tenant?.businessName || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">RTN del Cliente:</p>
                    <p className="text-gray-900">{tenant?.businessRTN || 'CF'}</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-700">Fecha de Emisión:</p>
                    <p className="text-gray-900">{currentDate}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Detalle de los Servicios Brindados */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <h3 className="font-semibold text-gray-700 mb-4">Detalle de los Servicios Brindados</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Cant.</th>
                        <th className="text-left py-2">Descripción</th>
                        <th className="text-right py-2">Precio Unitario</th>
                        <th className="text-right py-2">Exento</th>
                        <th className="text-right py-2">Gravado 15%</th>
                        <th className="text-right py-2">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoiceItems.map((item, index) => (
                        <tr key={item.id} className="border-b">
                          <td className="py-2">{item.quantity}</td>
                          <td className="py-2">
                            <div>
                              <p className="font-medium">{item.name}</p>
                              {item.description && (
                                <p className="text-xs text-gray-600">{item.description}</p>
                              )}
                            </div>
                          </td>
                          <td className="text-right py-2">L {item.unitPrice.toFixed(2)}</td>
                          <td className="text-right py-2">
                            {item.taxRate === 0 ? `L ${item.subtotal.toFixed(2)}` : 'L 0.00'}
                          </td>
                          <td className="text-right py-2">
                            {item.taxRate > 0 ? `L ${item.subtotal.toFixed(2)}` : 'L 0.00'}
                          </td>
                          <td className="text-right py-2 font-semibold">L {item.total.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Desglose de Valores */}
            <Card className="mb-6">
              <CardContent className="p-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Observaciones</h3>
                    <p className="text-sm text-gray-600">
                      {notes || 'Servicios profesionales prestados según detalle anterior.'}
                    </p>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-700 mb-2">Desglose de Valores</h3>
                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span>Importe Exonerado/Exento:</span>
                        <span>L {invoiceItems.filter(item => item.taxRate === 0).reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Importe Gravado (15%):</span>
                        <span>L {invoiceItems.filter(item => item.taxRate > 0).reduce((sum, item) => sum + item.subtotal, 0).toFixed(2)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between font-bold text-base">
                        <span>Total a Pagar:</span>
                        <span>L {total.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-4 pt-4 border-t">
                  <p className="text-sm text-gray-600">
                    <strong>Total en Letras:</strong> {totalInWords} Lempiras exactos
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Pie de Factura */}
            <div className="mt-8 space-y-4">
              <div className="flex justify-between text-xs text-gray-600 border-t pt-4">
                <div>
                  <p><strong>Original:</strong> Cliente</p>
                  <p><strong>Copia:</strong> Obligado Tributario Emisor</p>
                </div>
                <div className="text-right">
                  <p><strong>Sistema de Facturación:</strong> ContabHN</p>
                  <p><strong>RTN Sistema:</strong> {caiInfo?.rtn || '05011991078006'}</p>
                  <p><strong>Fecha de Impresión:</strong> {new Date().toLocaleString('es-HN')}</p>
                </div>
              </div>
              
              {/* Información de validación */}
              <div className="text-center text-xs text-gray-500 border-t pt-2">
                <p>Esta factura es un documento fiscal válido según normativa SAR-HN</p>
                <p>Para verificar autenticidad visite: www.sar.gob.hn/verificacion</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Función para convertir números a letras (simplificada)
function convertNumberToWords(num: number): string {
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  
  if (num === 0) return 'cero';
  if (num < 10) return units[num];
  if (num < 20) return teens[num - 10];
  if (num < 100) {
    const ten = Math.floor(num / 10);
    const unit = num % 10;
    return tens[ten] + (unit > 0 ? ' y ' + units[unit] : '');
  }
  if (num < 1000) {
    const hundred = Math.floor(num / 100);
    const remainder = num % 100;
    return hundreds[hundred] + (remainder > 0 ? ' ' + convertNumberToWords(remainder) : '');
  }
  
  // Para números mayores (simplificado)
  if (num < 1000000) {
    const thousand = Math.floor(num / 1000);
    const remainder = num % 1000;
    const thousandWord = thousand === 1 ? 'mil' : convertNumberToWords(thousand) + ' mil';
    return thousandWord + (remainder > 0 ? ' ' + convertNumberToWords(remainder) : '');
  }
  
  // Para millones (simplificado)
  const million = Math.floor(num / 1000000);
  const remainder = num % 1000000;
  const millionWord = million === 1 ? 'un millón' : convertNumberToWords(million) + ' millones';
  return millionWord + (remainder > 0 ? ' ' + convertNumberToWords(remainder) : '');
}
