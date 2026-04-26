"use client";

import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';

interface Plan {
  id: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

interface InvoicePreviewProps {
  tenant: any;
  caiInfo: any;
  invoiceItems: any[];
  invoiceNumber?: string;
  notes?: string;
}

export default function InvoicePreview({ 
  tenant, 
  caiInfo, 
  invoiceItems, 
  invoiceNumber,
  notes 
}: InvoicePreviewProps) {
  console.log('🖼️ InvoicePreview - Tenant recibido:', tenant);
  console.log('🖼️ InvoicePreview - InvoiceItems recibidos:', invoiceItems);
  console.log('🖼️ InvoicePreview - InvoiceItems[0]:', invoiceItems[0]);
  console.log('🔍 Comparación - InvoiceImage vs InvoicePreview:', invoiceItems[0]?.unitPrice, 'vs', invoiceItems[0]?.total);

  // Función para obtener los planes de suscripción activos del tenant
  const getActivePlans = (): Plan[] => {
    console.log('🔍 InvoicePreview - tenant.subscriptionPlans:', tenant?.subscriptionPlans);
    console.log('🔍 InvoicePreview - tenant.subscriptionPlans type:', typeof tenant?.subscriptionPlans);
    console.log('🔍 InvoicePreview - tenant.subscriptionPlans length:', tenant?.subscriptionPlans?.length);
    
    if (tenant?.subscriptionPlans && Array.isArray(tenant.subscriptionPlans) && tenant.subscriptionPlans.length > 0) {
      // Usar los planes del tenant (subscriptionPlans)
      return tenant.subscriptionPlans.map((plan: any, index: number) => ({
        id: plan.id || `plan-${index}`,
        name: plan.name || plan.code || 'Plan de Suscripción',
        description: plan.description || `Servicios incluidos en el plan ${plan.code}`,
        quantity: plan.quantity || 1,
        unitPrice: plan.price || 500,
        total: (plan.price || 500) * (plan.quantity || 1),
        taxRate: plan.taxRate || 15,
        taxAmount: ((plan.price || 500) * (plan.quantity || 1)) * (plan.taxRate || 15) / 100,
        subtotal: ((plan.price || 500) * (plan.quantity || 1)) - (((plan.price || 500) * (plan.quantity || 1)) * (plan.taxRate || 15) / 100)
      }));
    }

    // Si no hay planes específicos, usar los módulos activos como servicios
    if (tenant?.modules && Array.isArray(tenant.modules)) {
      return tenant.modules.map((module: string, index: number) => {
        let serviceName = '';
        let description = '';
        let price = 0;

        switch (module.toLowerCase()) {
          case 'accounting':
            serviceName = 'Servicio de Contabilidad';
            description = 'Gestión contable, libros mayores, estados financieros';
            price = 300;
            break;
          case 'billing':
            serviceName = 'Servicio de Facturación';
            description = 'Facturación electrónica, gestión de facturas, reportes';
            price = 200;
            break;
          case 'reports':
            serviceName = 'Reportes y Análisis';
            description = 'Reportes financieros, análisis de datos, dashboards';
            price = 150;
            break;
          case 'inventory':
            serviceName = 'Gestión de Inventario';
            description = 'Control de inventario, gestión de stock, reportes';
            price = 250;
            break;
          case 'payroll':
            serviceName = 'Nómina y RRHH';
            description = 'Gestión de nómina, planillas, cálculo de impuestos';
            price = 350;
            break;
          case 'banking':
            serviceName = 'Conciliación Bancaria';
            description = 'Conciliación de cuentas, gestión bancaria';
            price = 200;
            break;
          default:
            serviceName = `Servicio ${module}`;
            description = `Servicio de ${module}`;
            price = 100;
        }

        const total = price;
        const taxRate = 15;
        const taxAmount = total * (taxRate / 100);
        const subtotal = total - taxAmount;

        return {
          id: `service-${index}`,
          name: serviceName,
          description,
          quantity: 1,
          unitPrice: price,
          subtotal,
          taxRate,
          taxAmount,
          total
        };
      });
    }

    // Si no hay nada, mostrar servicio por defecto
    return [{
      id: 'default-service',
      name: 'Servicio de Contabilidad',
      description: 'Servicios profesionales de contabilidad y facturación',
      quantity: 1,
      unitPrice: 500,
      subtotal: 500,
      taxRate: 15,
      taxAmount: 75,
      total: 575
    }];
  };

  // Obtener planes activos
  const activePlans = getActivePlans();
  
  // Recalcular totales basados en planes activos
  const total = activePlans.reduce((sum: number, plan: Plan) => sum + plan.total, 0);
  const totalTax = activePlans.reduce((sum: number, plan: Plan) => sum + plan.taxAmount, 0);
  const subtotal = total - totalTax;

  // Formatear número de factura
  const formattedInvoiceNumber = invoiceNumber || `000-001-01-${String(caiInfo.currentNumber || 1).padStart(8, '0')}`;
  
  // Convertir total a letras
  const totalInWords = convertNumberToWords(total);

  // Fecha actual
  const currentDate = new Date().toLocaleDateString('es-HN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });

  // Función para obtener el período de servicio (inicio y fin del mes)
  const getPeriodoServicio = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // Mes siguiente (0-11 → 1-12)
    
    const monthNames = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
    
    // Calcular primer día del mes siguiente
    const firstDay = new Date(year, month - 1, 1); // Mes actual (getMonth() es 0-11, así que month-1 es el mes siguiente)
    
    // Calcular último día del mes siguiente
    const lastDay = new Date(year, month, 0); // Día 0 del mes siguiente = último día del mes anterior
    
    // Formatear fechas
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('es-HN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    };
    
    return `${formatDate(firstDay)} a ${formatDate(lastDay)}`;
  };

  return (
    <div className="bg-white p-8 max-w-4xl mx-auto">
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
              <p className="text-gray-900">{tenant?.businessName}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">RTN del Cliente:</p>
              <p className="text-gray-900">{tenant?.businessRTN || 'CF'}</p>
            </div>
            <div>
              <p className="font-semibold text-gray-700">Período de Servicio:</p>
              <p className="text-gray-900">{getPeriodoServicio()}</p>
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
                  <th className="text-right py-2">Tax</th>
                  <th className="text-right py-2">Subtotal</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {activePlans.map((plan: Plan) => (
                  <tr key={plan.id} className="border-b">
                    <td className="py-2">{plan.quantity}</td>
                    <td className="py-2">
                      <div>
                        <p className="font-medium">{plan.name}</p>
                        <p className="text-xs text-gray-600">{plan.description}</p>
                      </div>
                    </td>
                    <td className="text-right py-2">L {plan.unitPrice.toFixed(2)}</td>
                    <td className="text-right py-2">
                      {plan.taxRate === 0 ? `L ${(plan.unitPrice * plan.quantity).toFixed(2)}` : 'L 0.00'}
                    </td>
                    <td className="text-right py-2">
                      {plan.taxRate > 0 ? `L ${(plan.unitPrice * plan.quantity * plan.taxRate / 100).toFixed(2)}` : 'L 0.00'}
                    </td>
                    <td className="text-right py-2">
                      {(plan.unitPrice * plan.quantity - plan.unitPrice * plan.quantity * plan.taxRate / 100).toFixed(2)}
                    </td>
                    <td className="text-right py-2 font-medium">
                      L {(plan.unitPrice * plan.quantity).toFixed(2)}
                    </td>
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
                  <span>L {activePlans.filter((plan: Plan) => plan.taxRate === 0).reduce((sum: number, plan: Plan) => sum + plan.total, 0).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Importe Gravado (15%):</span>
                  <span>L {activePlans.filter((plan: Plan) => plan.taxRate > 0).reduce((sum: number, plan: Plan) => sum + plan.taxAmount, 0).toFixed(2)}</span>
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
