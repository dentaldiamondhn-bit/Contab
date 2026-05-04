'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { FileText, Eye, Download, Settings } from 'lucide-react';

interface InvoiceExampleProps {
  fiscalInfo?: {
    rtn: string;
    businessName: string;
    businessAddress: string;
    email: string;
    phone: string;
  };
  caiConfig?: {
    cai: string;
    rangeStart: number;
    rangeEnd: number;
    currentNumber: number;
    expiryDate: string;
    establishmentCode: string;
    pointOfSaleCode: string;
    economicActivity: string;
  };
  logoUrl?: string;
}

export default function InvoiceExample({ 
  fiscalInfo, 
  caiConfig, 
  logoUrl 
}: InvoiceExampleProps) {
  
  // Estado para controlar qué elementos mostrar
  const [showSettings, setShowSettings] = useState(false);
  const [invoiceElements, setInvoiceElements] = useState({
    logo: true,
    businessInfo: true,
    invoiceHeader: true,
    clientInfo: true,
    itemsTable: true,
    discounts: true,
    totals: true,
    bankInfo: true,
    terms: true,
    notes: true,
    signature: true,
    sarValidation: true,
    codes: true
  });

  // Datos de ejemplo para la factura
  const exampleInvoice = {
    number: caiConfig ? caiConfig.currentNumber : 1,
    date: new Date().toLocaleDateString('es-HN'),
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-HN'), // 30 días después
    paymentMethod: 'Transferencia Bancaria',
    paymentTerms: 'Neto 30 días',
    salesperson: 'Juan Pérez',
    orderNumber: 'ORD-2024-001',
    client: {
      name: 'Cliente Ejemplo S.A. de C.V.',
      rtn: '08011995012345',
      address: 'Colonia Centro, Tegucigalpa, Honduras, Calle 1, Casa #123',
      phone: '+504 2222-3333',
      email: 'facturacion@cliente.com',
      contactPerson: 'Carlos Rodríguez'
    },
    items: [
      {
        code: 'SKU001',
        description: 'Servicios de desarrollo de software - Aplicación web personalizada',
        quantity: 1,
        unitPrice: 5000.00,
        discount: 0,
        taxRate: 15,
        subtotal: 5000.00,
        tax: 750.00,
        total: 5750.00
      },
      {
        code: 'SKU002',
        description: 'Mantenimiento mensual de sistema - Soporte técnico 24/7',
        quantity: 1,
        unitPrice: 1000.00,
        discount: 100.00, // 10% descuento
        taxRate: 15,
        subtotal: 900.00,
        tax: 135.00,
        total: 1035.00
      },
      {
        code: 'SKU003',
        description: 'Hosting y dominio anual',
        quantity: 1,
        unitPrice: 300.00,
        discount: 0,
        taxRate: 15,
        subtotal: 300.00,
        tax: 45.00,
        total: 345.00
      }
    ],
    totals: {
      subtotal: 6200.00,
      discount: 100.00,
      taxableBase: 6100.00,
      tax: 915.00,
      total: 7015.00,
      totalWords: 'Siete mil quince Lempiras con 00/100'
    },
    notes: 'Los precios están expresados en Lempiras Hondureños (L). Esta factura es válida para efectos fiscales según normativa de SAR.',
    bankInfo: {
      bank: 'Banco Atlántida',
      accountNumber: '15-123456-78',
      accountName: fiscalInfo?.businessName || 'Nombre de la Empresa',
      swift: 'BHOHHNTE'
    }
  };

  const hasRequiredData = fiscalInfo?.businessName;

  const handleElementToggle = (element: string, checked: boolean) => {
    setInvoiceElements(prev => ({
      ...prev,
      [element]: checked
    }));
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Vista Previa de Factura - Formato SAR
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2"
          >
            <Settings className="h-4 w-4" />
            {showSettings ? 'Ocultar' : 'Personalizar'}
          </Button>
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Panel de configuración de elementos */}
        {showSettings && (
          <div className="mb-6 p-4 border-2 border-gray-200 rounded-lg bg-gray-50">
            <h4 className="font-bold mb-4 flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Personalizar Elementos de la Factura
            </h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.logo}
                  onCheckedChange={(checked) => handleElementToggle('logo', checked as boolean)}
                />
                <label className="text-sm font-medium">Logo de la Empresa</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.businessInfo}
                  onCheckedChange={(checked) => handleElementToggle('businessInfo', checked as boolean)}
                />
                <label className="text-sm font-medium">Información Fiscal</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.invoiceHeader}
                  onCheckedChange={(checked) => handleElementToggle('invoiceHeader', checked as boolean)}
                />
                <label className="text-sm font-medium">Encabezado Factura</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.clientInfo}
                  onCheckedChange={(checked) => handleElementToggle('clientInfo', checked as boolean)}
                />
                <label className="text-sm font-medium">Datos del Cliente</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.itemsTable}
                  onCheckedChange={(checked) => handleElementToggle('itemsTable', checked as boolean)}
                />
                <label className="text-sm font-medium">Tabla de Items</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.codes}
                  onCheckedChange={(checked) => handleElementToggle('codes', checked as boolean)}
                />
                <label className="text-sm font-medium">Códigos SKU</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.discounts}
                  onCheckedChange={(checked) => handleElementToggle('discounts', checked as boolean)}
                />
                <label className="text-sm font-medium">Descuentos</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.totals}
                  onCheckedChange={(checked) => handleElementToggle('totals', checked as boolean)}
                />
                <label className="text-sm font-medium">Totales</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.bankInfo}
                  onCheckedChange={(checked) => handleElementToggle('bankInfo', checked as boolean)}
                />
                <label className="text-sm font-medium">Información Bancaria</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.terms}
                  onCheckedChange={(checked) => handleElementToggle('terms', checked as boolean)}
                />
                <label className="text-sm font-medium">Términos de Pago</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.notes}
                  onCheckedChange={(checked) => handleElementToggle('notes', checked as boolean)}
                />
                <label className="text-sm font-medium">Notas y Observaciones</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.signature}
                  onCheckedChange={(checked) => handleElementToggle('signature', checked as boolean)}
                />
                <label className="text-sm font-medium">Firma Autorizada</label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={invoiceElements.sarValidation}
                  onCheckedChange={(checked) => handleElementToggle('sarValidation', checked as boolean)}
                />
                <label className="text-sm font-medium">Validación SAR</label>
              </div>
            </div>
          </div>
        )}

        {!hasRequiredData ? (
          <div className="text-center py-8 p-8 border-2 border-dashed border-gray-300 rounded-lg">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500 text-lg mb-2">
              Configura tu información fiscal y CAI para ver la vista previa
            </p>
            <p className="text-gray-400 text-sm">
              Necesitas completar la información fiscal y al menos un CAI para generar el ejemplo
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Encabezado de la factura */}
            <div className="border border-gray-300 rounded-lg p-6 bg-white">
              <div className="flex justify-between items-start mb-6">
                {/* Logo y información de la empresa */}
                {(invoiceElements.logo || invoiceElements.businessInfo) && (
                  <div className="flex items-start gap-4">
                    {invoiceElements.logo && (
                      <>
                        {logoUrl ? (
                          <img 
                            src={logoUrl} 
                            alt="Logo de la empresa" 
                            className="h-16 w-16 object-contain border border-gray-200 rounded"
                          />
                        ) : (
                          <div className="h-16 w-16 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                            <FileText className="h-6 w-6 text-gray-400" />
                          </div>
                        )}
                      </>
                    )}
                    {invoiceElements.businessInfo && (
                      <div>
                        <h3 className="font-bold text-lg">{fiscalInfo?.businessName || 'Nombre de la Empresa'}</h3>
                        <p className="text-sm text-gray-600">RTN: {fiscalInfo?.rtn || '0801-XXXX-XXXXX'}</p>
                        <p className="text-sm text-gray-600">{fiscalInfo?.businessAddress || 'Dirección Fiscal'}</p>
                        <p className="text-sm text-gray-600">Tel: {fiscalInfo?.phone || '+504 XXXX-XXXX'}</p>
                        <p className="text-sm text-gray-600">Email: {fiscalInfo?.email || 'email@empresa.com'}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Información de la factura y CAI */}
                {invoiceElements.invoiceHeader && (
                  <div className="text-right">
                    <div className="border-2 border-gray-800 p-3 mb-2">
                      <p className="text-xs font-bold">FACTURA</p>
                      <p className="text-2xl font-bold">#{exampleInvoice.number.toString().padStart(8, '0')}</p>
                    </div>
                    <p className="text-sm"><strong>Fecha:</strong> {exampleInvoice.date}</p>
                    <p className="text-sm"><strong>Vencimiento:</strong> {exampleInvoice.dueDate}</p>
                    <p className="text-sm"><strong>Orden:</strong> {exampleInvoice.orderNumber}</p>
                    <p className="text-sm"><strong>Vendedor:</strong> {exampleInvoice.salesperson}</p>
                    <p className="text-sm"><strong>CAI:</strong> {caiConfig?.cai || 'E365A9F76E847F4CBDB88DF4EB8D3769'}</p>
                    <p className="text-sm"><strong>Rango:</strong> {caiConfig?.rangeStart || 1} - {caiConfig?.rangeEnd || 1000}</p>
                    <p className="text-sm"><strong>Establecimiento:</strong> {caiConfig?.establishmentCode || '001'}-{caiConfig?.pointOfSaleCode || '001'}</p>
                    <p className="text-sm"><strong>Vence CAI:</strong> {caiConfig?.expiryDate || '2025-12-31'}</p>
                  </div>
                )}
              </div>

              {/* Información del cliente */}
              {invoiceElements.clientInfo && (
                <div className="mb-6 p-4 bg-gray-50 rounded">
                  <h4 className="font-bold mb-2">Datos del Cliente:</h4>
                  <p><strong>Nombre:</strong> {exampleInvoice.client.name}</p>
                  <p><strong>RTN:</strong> {exampleInvoice.client.rtn}</p>
                  <p><strong>Dirección:</strong> {exampleInvoice.client.address}</p>
                  <p><strong>Teléfono:</strong> {exampleInvoice.client.phone}</p>
                  <p><strong>Email:</strong> {exampleInvoice.client.email}</p>
                  <p><strong>Contacto:</strong> {exampleInvoice.client.contactPerson}</p>
                </div>
              )}

              {/* Tabla de items */}
              {invoiceElements.itemsTable && (
                <table className="w-full border-collapse mb-6">
                  <thead>
                    <tr className="border-b-2 border-gray-800">
                      {invoiceElements.codes && <th className="text-left p-2">Código</th>}
                      <th className="text-left p-2">Descripción</th>
                      <th className="text-center p-2">Cantidad</th>
                      <th className="text-right p-2">Precio Unit.</th>
                      {invoiceElements.discounts && <th className="text-right p-2">Descuento</th>}
                      <th className="text-right p-2">Subtotal</th>
                      <th className="text-right p-2">ISV (15%)</th>
                      <th className="text-right p-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {exampleInvoice.items.map((item, index) => (
                      <tr key={index} className="border-b">
                        {invoiceElements.codes && <td className="p-2 text-sm">{item.code}</td>}
                        <td className="p-2">{item.description}</td>
                        <td className="text-center p-2">{item.quantity}</td>
                        <td className="text-right p-2">L. {item.unitPrice.toFixed(2)}</td>
                        {invoiceElements.discounts && (
                          <td className="text-right p-2">
                            {item.discount > 0 ? `L. ${item.discount.toFixed(2)}` : '-'}
                          </td>
                        )}
                        <td className="text-right p-2">L. {item.subtotal.toFixed(2)}</td>
                        <td className="text-right p-2">L. {item.tax.toFixed(2)}</td>
                        <td className="text-right p-2 font-bold">L. {item.total.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  {invoiceElements.totals && (
                    <tfoot>
                      <tr className="border-t-2 border-gray-800">
                        <td colSpan={invoiceElements.codes ? 5 : 4} className="text-right font-bold p-2">Subtotal:</td>
                        <td className="text-right p-2">L. {exampleInvoice.totals.subtotal.toFixed(2)}</td>
                        <td className="text-right p-2">-</td>
                        <td className="text-right p-2">-</td>
                      </tr>
                      {invoiceElements.discounts && exampleInvoice.totals.discount > 0 && (
                        <tr>
                          <td colSpan={invoiceElements.codes ? 5 : 4} className="text-right font-bold p-2">Descuento:</td>
                          <td className="text-right p-2 text-red-600">-L. {exampleInvoice.totals.discount.toFixed(2)}</td>
                          <td className="text-right p-2">-</td>
                          <td className="text-right p-2">-</td>
                        </tr>
                      )}
                      <tr>
                        <td colSpan={invoiceElements.codes ? 5 : 4} className="text-right font-bold p-2">Base Imponible:</td>
                        <td className="text-right p-2">L. {exampleInvoice.totals.taxableBase.toFixed(2)}</td>
                        <td className="text-right p-2">L. {exampleInvoice.totals.tax.toFixed(2)}</td>
                        <td className="text-right p-2">-</td>
                      </tr>
                      <tr className="border-t-2 border-gray-800">
                        <td colSpan={invoiceElements.codes ? 5 : 4} className="text-right font-bold p-2">Total a Pagar:</td>
                        <td className="text-right p-2 font-bold">L. {exampleInvoice.totals.total.toFixed(2)}</td>
                        <td className="text-right p-2">-</td>
                        <td className="text-right p-2 font-bold text-lg">L. {exampleInvoice.totals.total.toFixed(2)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              )}

              {/* Totales, términos y leyenda */}
              <div className="space-y-4">
                {(invoiceElements.totals || invoiceElements.terms) && (
                  <div className="flex justify-between items-end">
                    <div className="flex-1">
                      <p className="text-sm italic">
                        <strong>Actividad Económica:</strong> {caiConfig?.economicActivity || 'Servicios Profesionales'}
                      </p>
                      {invoiceElements.terms && (
                        <>
                          <p className="text-sm italic mt-1">
                            <strong>Términos de Pago:</strong> {exampleInvoice.paymentTerms}
                          </p>
                          <p className="text-sm italic">
                            <strong>Método de Pago:</strong> {exampleInvoice.paymentMethod}
                          </p>
                        </>
                      )}
                    </div>
                    {invoiceElements.totals && (
                      <div className="text-right">
                        <p className="font-bold text-lg">TOTAL: L. {exampleInvoice.totals.total.toFixed(2)}</p>
                        <p className="text-sm italic">{exampleInvoice.totals.totalWords}</p>
                      </div>
                    )}
                  </div>
                )}

                {/* Información bancaria */}
                {invoiceElements.bankInfo && (
                  <div className="border-t border-gray-300 pt-4 mt-4">
                    <h4 className="font-bold mb-2">Información Bancaria para Pago:</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p><strong>Banco:</strong> {exampleInvoice.bankInfo.bank}</p>
                        <p><strong>Cuenta:</strong> {exampleInvoice.bankInfo.accountNumber}</p>
                        <p><strong>Nombre Cuenta:</strong> {exampleInvoice.bankInfo.accountName}</p>
                      </div>
                      <div>
                        <p><strong>SWIFT:</strong> {exampleInvoice.bankInfo.swift}</p>
                        <p><strong>RTN Beneficiario:</strong> {fiscalInfo?.rtn || '0801-XXXX-XXXXX'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Notas y observaciones */}
                {invoiceElements.notes && (
                  <div className="border-t border-gray-300 pt-4 mt-4">
                    <h4 className="font-bold mb-2">Notas y Observaciones:</h4>
                    <p className="text-sm text-gray-600">{exampleInvoice.notes}</p>
                    <p className="text-sm text-gray-600 mt-2">
                      <strong>Pago Vence:</strong> {exampleInvoice.dueDate} - Se aplicará mora por pago fuera de fecha.
                    </p>
                  </div>
                )}

                {/* Información de validación SAR */}
                {invoiceElements.sarValidation && (
                  <div className="border-t-2 border-gray-800 pt-4 mt-6">
                    <p className="text-xs text-gray-600 text-center">
                      Esta factura es válida para efectos fiscales según normativa de la SAR. 
                      Para verificar su autenticidad visite portal.sar.gob.hn
                    </p>
                    <div className="flex justify-between mt-2">
                      <p className="text-xs text-gray-600">
                        <strong>Original:</strong> Cliente
                      </p>
                      <p className="text-xs text-gray-600">
                        <strong>Copia:</strong> Vendedor
                      </p>
                      <p className="text-xs text-gray-600">
                        <strong>Triplicado:</strong> Contabilidad
                      </p>
                    </div>
                    {invoiceElements.signature && (
                      <div className="text-center mt-4">
                        <p className="text-xs text-gray-600">
                          <strong>Firma Autorizada:</strong> ___________________________
                        </p>
                        <p className="text-xs text-gray-600">
                          {exampleInvoice.salesperson} - {new Date().toLocaleDateString('es-HN')}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Botones de acción */}
            <div className="flex justify-center gap-4 pt-4">
              <Button variant="outline" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Vista Ampliada
              </Button>
              <Button className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
