'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';

interface InvoiceItem {
  id?: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface InvoiceLegalPreviewProps {
  invoice: {
    invoiceNumber: string;
    invoiceType?: string;
    customerName: string;
    customerRTN: string;
    customerEmail?: string;
    customerAddress?: string;
    issueDate: string;
    dueDate: string;
    subtotal: number;
    tax: number;
    total: number;
    status: string;
    items: InvoiceItem[];
    notes?: string;
    issuerName?: string;
    issuerRTN?: string;
    issuerAddress?: string;
    issuerPhone?: string;
    issuerEmail?: string;
    cai?: string;
    rangeStart?: number;
    rangeEnd?: number;
    expiryDate?: string;
    establishmentCode?: string;
    pointOfSaleCode?: string;
  };
  tenant?: {
    businessName: string;
    businessRTN?: string;
    businessAddress?: string;
    phoneNumber?: string;
    businessEmail?: string;
  };
}

// Función para convertir números a letras
function numberToWords(num: number): string {
  const units = ['', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve'];
  const teens = ['diez', 'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve'];
  const tens = ['', '', 'veinte', 'treinta', 'cuarenta', 'cincuenta', 'sesenta', 'setenta', 'ochenta', 'noventa'];
  const hundreds = ['', 'ciento', 'doscientos', 'trescientos', 'cuatrocientos', 'quinientos', 'seiscientos', 'setecientos', 'ochocientos', 'novecientos'];
  
  if (num === 0) return 'cero';
  
  const parts = num.toFixed(2).split('.');
  const intPart = parseInt(parts[0]);
  const decPart = parseInt(parts[1]);
  
  let result = '';
  
  // Procesar parte entera
  if (intPart >= 1000000) {
    result += numberToWords(Math.floor(intPart / 1000000)) + ' millones ';
    num = intPart % 1000000;
  }
  
  if (intPart >= 1000) {
    const thousands = Math.floor(intPart / 1000);
    if (thousands === 1) {
      result += 'mil ';
    } else {
      result += numberToWords(thousands) + ' mil ';
    }
    num = intPart % 1000;
  }
  
  if (num >= 100) {
    const h = Math.floor(num / 100);
    result += hundreds[h] + ' ';
    num = num % 100;
  }
  
  if (num >= 20) {
    const t = Math.floor(num / 10);
    result += tens[t];
    const u = num % 10;
    if (u > 0) {
      result += ' y ' + units[u];
    }
    result += ' ';
  } else if (num >= 10) {
    result += teens[num - 10] + ' ';
  } else if (num > 0) {
    result += units[num] + ' ';
  }
  
  // Procesar decimales (centavos)
  if (decPart > 0) {
    result += 'con ' + decPart.toString().padStart(2, '0') + '/100';
  } else {
    result += 'exactos';
  }
  
  return result.trim();
}

export default function InvoiceLegalPreview({ invoice, tenant }: InvoiceLegalPreviewProps) {
  // Usar datos del issuer de la factura o del tenant
  const issuerName = invoice.issuerName || tenant?.businessName || 'CONTAB HN';
  const issuerRTN = invoice.issuerRTN || tenant?.businessRTN || '05011991078006';
  const issuerAddress = invoice.issuerAddress || tenant?.businessAddress || 'Tegucigalpa, Honduras';
  const issuerPhone = invoice.issuerPhone || tenant?.phoneNumber || '+504 0000-0000';
  const issuerEmail = invoice.issuerEmail || tenant?.businessEmail || 'contabhn@email.com';
  
  // CAI mock (en producción vendría de la factura o CAI del tenant)
  const cai = invoice.cai || 'DAF5-8D9A-4E6B-C2F1-9A3B-5E7F-8D9A';
  const rangeStart = invoice.rangeStart || 1;
  const rangeEnd = invoice.rangeEnd || 50;
  const expiryDate = invoice.expiryDate || '31/12/2026';
  const establishmentCode = invoice.establishmentCode || '0001';
  const pointOfSaleCode = invoice.pointOfSaleCode || '0001';
  
  // Formatear número de factura
  const formattedInvoiceNumber = invoice.invoiceNumber || `F-${Date.now()}`;
  
  // Fecha actual
  const currentDate = new Date().toLocaleDateString('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
  
  // Fecha de emisión formateada
  const issueDateFormatted = invoice.issueDate 
    ? new Date(invoice.issueDate).toLocaleDateString('es-HN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
    : currentDate;
  
  // Calcular totales
  const subtotal = invoice.subtotal || invoice.items.reduce((sum, item) => sum + (item.total || 0), 0) / 1.15;
  const taxAmount = invoice.tax || subtotal * 0.15;
  const total = invoice.total || subtotal + taxAmount;
  const totalInWords = numberToWords(total);
  
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto border-2 border-gray-200 rounded-lg">
      {/* Encabezado e Identificación de la Empresa */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2 tracking-wider">
          {issuerName.toUpperCase()}
        </h1>
        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>RTN:</strong> {issuerRTN}</p>
          <p><strong>Dirección:</strong> {issuerAddress}</p>
          <p><strong>Contacto:</strong> {issuerEmail} | {issuerPhone}</p>
        </div>
      </div>

      {/* Nombre del Documento */}
      <div className="text-center mb-6">
        <h2 className="text-3xl font-bold text-gray-900 border-b-4 border-gray-900 pb-2 inline-block tracking-widest">
          FACTURA
        </h2>
      </div>

      {/* Datos de Autorización (Fiscales) */}
      <Card className="mb-6 border">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-700">CAI:</p>
              <p className="text-xs text-gray-600 break-all">{cai}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Rango de Facturación:</p>
              <p className="text-xs text-gray-600">
                {String(rangeStart).padStart(8, '0')} al {String(rangeEnd).padStart(8, '0')}
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Fecha Límite de Emisión:</p>
              <p className="text-xs text-gray-600">{expiryDate}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Número de Factura:</p>
              <p className="text-xs text-gray-600 font-mono">{formattedInvoiceNumber}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Información del Cliente */}
      <Card className="mb-6 border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <p className="font-semibold text-gray-700">Nombre o Razón Social del Cliente:</p>
              <p className="text-gray-900">{invoice.customerName}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">RTN del Cliente:</p>
              <p className="text-gray-900">{invoice.customerRTN || 'CF'}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Fecha de Emisión:</p>
              <p className="text-gray-900">{issueDateFormatted}</p>
            </div>
          </div>
          {invoice.customerAddress && (
            <div className="mt-3 text-sm">
              <p className="font-semibold text-gray-700">Dirección del Cliente:</p>
              <p className="text-gray-900">{invoice.customerAddress}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detalle de los Servicios/Productos */}
      <Card className="mb-6 border">
        <CardContent className="p-4">
          <h3 className="font-semibold text-gray-700 mb-4 text-center uppercase tracking-wider">
            Detalle de los Servicios Brindados
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr className="border-b-2 border-gray-300">
                  <th className="text-center py-2 px-2 font-semibold">Cant.</th>
                  <th className="text-left py-2 px-2 font-semibold">Descripción</th>
                  <th className="text-right py-2 px-2 font-semibold">Precio Unitario</th>
                  <th className="text-right py-2 px-2 font-semibold">Exento</th>
                  <th className="text-right py-2 px-2 font-semibold">Gravado 15%</th>
                  <th className="text-right py-2 px-2 font-semibold">Total</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items?.map((item, index) => (
                  <tr key={item.id || index} className="border-b">
                    <td className="py-2 px-2 text-center">{item.quantity}</td>
                    <td className="py-2 px-2">
                      <div>
                        <p className="font-medium">{item.description}</p>
                      </div>
                    </td>
                    <td className="text-right py-2 px-2">
                      L {(item.unitPrice || 0).toFixed(2)}
                    </td>
                    <td className="text-right py-2 px-2">L 0.00</td>
                    <td className="text-right py-2 px-2">
                      L {((item.total || 0) - (item.total || 0) / 1.15).toFixed(2)}
                    </td>
                    <td className="text-right py-2 px-2 font-medium">
                      L {(item.total || 0).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Desglose de Valores */}
      <Card className="mb-6 border">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Observaciones</h3>
              <p className="text-sm text-gray-600">
                {invoice.notes || 'Servicios profesionales prestados según detalle anterior.'}
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-gray-700 mb-2">Desglose de Valores</h3>
              <div className="space-y-1 text-sm">
                <div className="flex justify-between">
                  <span>Importe Exonerado/Exento:</span>
                  <span>L 0.00</span>
                </div>
                <div className="flex justify-between">
                  <span>Importe Gravado (15%):</span>
                  <span>L {subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>ISV (15%):</span>
                  <span>L {taxAmount.toFixed(2)}</span>
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
              <strong>Total en Letras:</strong> {totalInWords} Lempiras
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
            <p><strong>RTN Sistema:</strong> {issuerRTN}</p>
            <p><strong>Fecha de Impresión:</strong> {currentDate} {new Date().toLocaleTimeString()}</p>
          </div>
        </div>
        
        <div className="text-center text-xs text-gray-500 mt-6 pt-4 border-t">
          <p>Esta factura es un documento fiscal válido según normativa SAR-HN</p>
          <p>Para verificar autenticidad visite: www.sar.gob.hn/verificacion</p>
        </div>
      </div>
    </div>
  );
}
