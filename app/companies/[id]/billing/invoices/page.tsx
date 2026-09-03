'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileText, Receipt } from 'lucide-react';

export default function InvoicesListPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadInvoices = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/billing/invoices?tenantId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        const list = Array.isArray(data) ? data : data.invoices || [];
        setInvoices(list);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadInvoices(); }, [companyId]);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => router.push(`/companies/${companyId}/billing/pos`)}>
              <ArrowLeft className="h-4 w-4 mr-2" /> Volver al POS
            </Button>
            <Receipt className="h-6 w-6 text-green-600" />
            <h1 className="text-2xl font-bold">Facturas Emitidas</h1>
          </div>
          <Button onClick={() => router.push(`/companies/${companyId}/billing/pos`)}>Nueva Factura</Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5" /> Historial de facturas</CardTitle>
            <p className="text-sm text-muted-foreground">{invoices.length} facturas para {companyId}</p>
          </CardHeader>
          <CardContent>
            {loading ? <p className="text-center py-8 text-muted-foreground">Cargando...</p> :
              invoices.length === 0 ? <p className="text-center py-8 text-muted-foreground">No hay facturas emitidas aún</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="border-b text-xs text-muted-foreground"><th className="text-left p-2">Número</th><th className="text-left p-2">Cliente</th><th className="text-left p-2">Fecha</th><th className="text-right p-2">Subtotal</th><th className="text-right p-2">ISV</th><th className="text-right p-2">Total</th><th className="text-center p-2">Estado</th></tr></thead>
                  <tbody>
                    {invoices.map((inv:any)=>(
                      <tr key={inv.id} className="border-b hover:bg-muted/50">
                        <td className="p-2 font-mono">{inv.invoice_number || inv.invoiceNumber}</td>
                        <td className="p-2">{inv.customer_name || inv.customerName}</td>
                        <td className="p-2">{inv.date ? new Date(inv.date).toLocaleDateString('es-HN') : '-'}</td>
                        <td className="p-2 text-right">L. {Number(inv.subtotal || 0).toFixed(2)}</td>
                        <td className="p-2 text-right">L. {Number((inv.tax_15 || 0) + (inv.tax_18 || 0)).toFixed(2)}</td>
                        <td className="p-2 text-right font-bold">L. {Number(inv.total || 0).toFixed(2)}</td>
                        <td className="p-2 text-center"><Badge variant={inv.status==='PAGADA'?'default':'secondary'}>{inv.status}</Badge></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
