'use client';

import { Button } from '@/components/ui/button';

interface DisneyInvoiceProps {
  invoiceNumber: string;
  date: string;
  planName: string;
  amount: string;
  cardLast4?: string;
  companyName?: string;
  companyAddress?: string;
  companyRTN?: string;
  plans?: Array<{ name: string; amount: string }>;
}

export default function DisneyStyleInvoice({
  invoiceNumber,
  date,
  planName,
  amount,
  cardLast4 = '2831',
  companyName = 'Diamond Accounting, S. de R.L.',
  companyAddress = 'Col. Palmira, Tegucigalpa, Honduras',
  companyRTN = '0801-1995-12345',
  plans,
}: DisneyInvoiceProps) {
  const displayPlans = plans && plans.length > 0 ? plans : [{ name: planName, amount }];
  const formattedDate = date ? new Date(date).toLocaleDateString('es-HN', { day: 'numeric', month: 'long', year: 'numeric' }) : '26 de julio de 2025';

  return (
    <div id="print-invoice" className="max-w-2xl mx-auto bg-white p-8 md:p-10">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-5xl font-bold text-gray-900">Factura</h1>
          <p className="text-sm text-gray-500 mt-1 font-mono">#{invoiceNumber}</p>
        </div>
        <div className="flex flex-col items-center text-center">
          <img src="/logo.png" alt="Diamond Accounting" className="h-24 md:h-32 w-auto object-contain" />
          <p className="text-xs font-bold tracking-widest text-gray-800 mt-1">DIAMOND ACCOUNTING</p>
        </div>
      </div>

      <p className="text-gray-900 mt-8 text-lg">{formattedDate}</p>

      <div className="h-[3px] bg-gray-300 mt-6 mb-6" />

      {/* Line Items - paquetes activos */}
      {displayPlans.map((p, idx) => (
        <div key={idx}>
          <div className="flex justify-between items-start">
            <div>
              <p className="text-lg font-bold text-gray-900">{p.name} (Mensual)</p>
              <p className="text-sm text-gray-500 ml-4 mt-1">{p.name}</p>
            </div>
            <p className="text-lg font-bold text-gray-900">{p.amount}</p>
          </div>
          {idx < displayPlans.length - 1 && <div className="h-px bg-gray-200 my-6" />}
        </div>
      ))}

      <div className="h-px bg-gray-200 my-6" />

      {/* Desglose Total plan e impuesto */}
      <div className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Subtotal plan:</span>
          <span className="font-medium text-gray-900">{displayPlans.reduce((s, p) => {
            const n = parseFloat(String(p.amount).replace(/[^0-9.]/g, '')) || 0;
            // amount ya incluye impuesto, desglosar: subtotal = total / 1.15
            return s + n / 1.15;
          }, 0).toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">ISV 15%:</span>
          <span className="font-medium text-gray-900">{displayPlans.reduce((s, p) => {
            const n = parseFloat(String(p.amount).replace(/[^0-9.]/g, '')) || 0;
            return s + n - n / 1.15;
          }, 0).toLocaleString('es-HN', { style: 'currency', currency: 'HNL' })}</span>
        </div>
      </div>

      <div className="h-px bg-gray-200 my-4" />

      {/* Order Total */}
      <div className="flex justify-between items-start">
        <div>
          <p className="text-xl font-bold text-gray-900">Total del Pedido</p>
          <p className="text-sm text-gray-500 mt-1">ECMC **{cardLast4}</p>
        </div>
        <p className="text-xl font-bold text-gray-900">{amount}</p>
      </div>

      <div className="h-[3px] bg-gray-300 my-6" />

      {/* Company Info */}
      <div>
        <p className="text-lg font-bold text-gray-900">{companyName}</p>
        <p className="text-sm text-gray-600">{companyAddress}</p>
        <p className="text-sm text-gray-600 mt-3">{companyRTN}</p>
      </div>

      <Button
        onClick={() => {
          const el = document.getElementById('print-invoice');
          if (!el) return window.print();
          const html = el.innerHTML;
          const styles = Array.from(document.querySelectorAll('style,link[rel="stylesheet"]')).map(s => s.outerHTML).join('');
          const w = window.open('', '_blank', 'width=800,height=900');
          if (!w) return window.print();
          w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Factura ${invoiceNumber}</title>${styles}<style>body{font-family:system-ui, sans-serif; padding:40px; background:white;} @media print{body{padding:0;}}</style></head><body>${el.outerHTML}</body></html>`);
          w.document.close();
          setTimeout(() => { w.focus(); w.print(); }, 500);
        }}
        className="w-full mt-8 bg-gray-700 hover:bg-gray-800 text-white rounded-full py-6 text-base font-medium"
      >
        Imprimir
      </Button>
    </div>
  );
}
