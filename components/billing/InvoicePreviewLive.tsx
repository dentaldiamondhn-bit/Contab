'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Eye, Building2 } from 'lucide-react';

interface Emisor {
  businessName: string;
  businessRTN: string;
  businessEmail: string;
  businessAddress: string;
  phoneNumber: string;
  logoUrl: string | null;
}

interface CaiRecord {
  id: string;
  cai: string;
  rangeStart: number;
  rangeEnd: number;
  currentNumber: number;
  issueDate: string | null;
  expiryDate: string | null;
  isActive: boolean;
}

interface TaxEntry {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
}

interface TaxConfig {
  defaultRate: number;
  applyTax: boolean;
  taxes: TaxEntry[];
}

interface PrintSettings {
  footerText: string;
  showQR: boolean;
  showBarcode: boolean;
  currency: string;
  language: string;
}

interface InvoicePreviewLiveProps {
  emisor: Emisor;
  cai: CaiRecord | null;
  tax: TaxConfig;
  print: PrintSettings;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  HNL: 'L.',
  USD: '$',
  EUR: '€',
};

const SAMPLE_ITEMS = [
  { code: 'PRD-001', description: 'Producto o servicio de ejemplo', quantity: 2, unitPrice: 250 },
  { code: 'PRD-002', description: 'Segundo concepto facturado', quantity: 1, unitPrice: 800 },
];

export default function InvoicePreviewLive({ emisor, cai, tax, print }: InvoicePreviewLiveProps) {
  const symbol = CURRENCY_SYMBOL[print.currency] || 'L.';
  const money = (value: number) => `${symbol} ${value.toFixed(2)}`;

  const activeTaxes = (tax.taxes || []).filter((t) => t.isActive);
  const defaultTax = activeTaxes.find((t) => t.isDefault) || activeTaxes[0] || null;
  const rate = tax.applyTax && defaultTax ? defaultTax.rate : 0;

  const subtotal = SAMPLE_ITEMS.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const taxAmount = subtotal * (rate / 100);
  const total = subtotal + taxAmount;

  const today = new Date();
  const issueDate = today.toLocaleDateString('es-HN');
  const dueDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('es-HN');
  const correlative = String(cai?.currentNumber ?? 1).padStart(8, '0');

  const hasEmisor = Boolean(emisor.businessName.trim());

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Eye className="w-5 h-5 text-orange-600" />
          Vista Previa de la Factura
        </CardTitle>
        <CardDescription>
          Así se verá tu factura con la configuración actual. Los datos del cliente y los productos son
          ejemplos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!hasEmisor ? (
          <div className="border-2 border-dashed border-gray-300 rounded-lg py-12 text-center">
            <FileText className="w-12 h-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">Configura el nombre del emisor para ver la vista previa</p>
          </div>
        ) : (
          <div className="border border-gray-300 rounded-lg p-6 bg-white space-y-5">
            {/* Encabezado */}
            <div className="flex flex-wrap justify-between items-start gap-4">
              <div className="flex items-start gap-4">
                {emisor.logoUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={emisor.logoUrl}
                    alt="Logo"
                    className="w-16 h-16 object-contain border border-gray-200 rounded"
                  />
                ) : null}
                <div className="text-sm">
                  <h3 className="font-bold text-lg leading-tight">{emisor.businessName}</h3>
                  {emisor.businessRTN && <p>RTN: {emisor.businessRTN}</p>}
                  {emisor.businessAddress && <p>{emisor.businessAddress}</p>}
                  {emisor.phoneNumber && <p>Tel: {emisor.phoneNumber}</p>}
                  {emisor.businessEmail && <p>{emisor.businessEmail}</p>}
                </div>
              </div>

              <div className="text-right text-sm">
                <div className="inline-block border-2 border-gray-800 px-3 py-2 mb-2">
                  <p className="text-xs font-bold">FACTURA</p>
                  <p className="text-xl font-bold">#{correlative}</p>
                </div>
                <p><strong>Fecha:</strong> {issueDate}</p>
                <p><strong>Vence:</strong> {dueDate}</p>
                {cai ? (
                  <p className="font-mono text-xs mt-1"><strong>CAI:</strong> {cai.cai}</p>
                ) : (
                  <p className="text-amber-600 text-xs mt-1">Sin CAI configurado</p>
                )}
                {cai && (
                  <p className="text-xs">
                    <strong>Rango:</strong> {cai.rangeStart.toLocaleString('es-HN')} -{' '}
                    {cai.rangeEnd.toLocaleString('es-HN')}
                  </p>
                )}
              </div>
            </div>

            {/* Cliente */}
            <div className="p-3 bg-gray-50 rounded text-sm">
              <p className="font-bold mb-1">Datos del Cliente</p>
              <p><strong>Nombre:</strong> Cliente Ejemplo S.A. de C.V.</p>
              <p><strong>RTN:</strong> 0801-1999-01234</p>
            </div>

            {/* Items */}
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b-2 border-gray-800">
                  <th className="text-left py-2">Código</th>
                  <th className="text-left py-2">Descripción</th>
                  <th className="text-right py-2">Cant.</th>
                  <th className="text-right py-2">Precio</th>
                  <th className="text-right py-2">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                {SAMPLE_ITEMS.map((item) => (
                  <tr key={item.code} className="border-b">
                    <td className="py-1.5">{item.code}</td>
                    <td className="py-1.5">{item.description}</td>
                    <td className="py-1.5 text-right">{item.quantity}</td>
                    <td className="py-1.5 text-right">{money(item.unitPrice)}</td>
                    <td className="py-1.5 text-right font-medium">
                      {money(item.quantity * item.unitPrice)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Totales */}
            <div className="flex justify-end">
              <div className="w-full sm:w-72 text-sm space-y-1">
                <div className="flex justify-between">
                  <span>Base imponible</span>
                  <span className="font-medium">{money(subtotal)}</span>
                </div>
                {rate > 0 && defaultTax ? (
                  <div className="flex justify-between">
                    <span>{defaultTax.name} ({rate}%)</span>
                    <span className="font-medium">{money(taxAmount)}</span>
                  </div>
                ) : (
                  <div className="flex justify-between text-gray-500">
                    <span>Sin impuesto aplicado</span>
                    <span>{money(0)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t-2 border-gray-800 pt-2 text-base">
                  <span className="font-bold">Total</span>
                  <span className="font-bold">{money(total)}</span>
                </div>
              </div>
            </div>

            {/* Códigos */}
            {(print.showQR || print.showBarcode) && (
              <div className="flex flex-wrap items-end gap-6 border-t border-gray-300 pt-4">
                {print.showQR && (
                  <div className="text-center">
                    <div className="w-20 h-20 border border-gray-300 rounded flex items-center justify-center text-[9px] text-gray-400 text-center px-1">
                      QR
                      <br />
                      {cai?.cai ? cai.cai.slice(0, 12) : 'configurar CAI'}
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">Verificación SAR</p>
                  </div>
                )}
                {print.showBarcode && (
                  <div className="text-center">
                    <div className="w-32 h-12 border border-gray-300 rounded flex items-center justify-center text-[10px] text-gray-400">
                      |||||| |||| |||||
                    </div>
                    <p className="text-[10px] text-gray-500 mt-1">{correlative}</p>
                  </div>
                )}
                <div className="flex-1 text-right text-[10px] text-gray-500">
                  <p>Documento fiscal válido según normativa de la SAR.</p>
                  <p>Original: Cliente · Copia: Vendedor · Contabilidad</p>
                </div>
              </div>
            )}

            {/* Pie */}
            {print.footerText && (
              <div className="border-t border-gray-300 pt-3 text-center text-sm text-gray-600">
                {print.footerText}
              </div>
            )}

            {/* Resumen de impuestos configurados */}
            {activeTaxes.length > 1 && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500">
                <span>Impuestos configurados:</span>
                {activeTaxes.map((t) => (
                  <Badge key={t.id} variant={t.isDefault ? 'default' : 'secondary'}>
                    {t.name} {t.rate}%
                  </Badge>
                ))}
              </div>
            )}

            {!cai && (
              <div className="flex items-center gap-2 rounded border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800">
                <Building2 className="w-4 h-4 shrink-0" />
                Sin CAI activo: la factura no tendrá validez fiscal hasta que agregues uno en la pestaña
                CAI / Talonarios.
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}