'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
} from 'lucide-react';

interface Reversal {
  id: string;
  original_transaction_id: string;
  reversal_transaction_id: string;
  reason: string;
  reversed_by: string;
  reversed_at: string;
  status: string;
  notes: string;
  originalTransaction?: any;
  reversalTransaction?: any;
}

interface Transaction {
  id: string;
  description: string;
  date: string;
  voucherType: string;
  voucherNumber: number;
  totalAmount: number;
  JournalEntry?: any[];
}

export default function ReversalsPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [reversals, setReversals] = useState<Reversal[]>([]);
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [showRevertDialog, setShowRevertDialog] = useState(false);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [reason, setReason] = useState('');
  const [reversedBy, setReversedBy] = useState('');
  const [notes, setNotes] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadReversals();
    loadTransactions();
  }, [companyId]);

  const loadReversals = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/reversals?tenantId=${companyId}`, {
        headers: { 'x-tenant-id': companyId },
      });
      if (res.ok) setReversals(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadTransactions = async () => {
    try {
      const res = await fetch(`/api/accounting/transactions?tenantId=${companyId}`, {
        headers: { 'x-tenant-id': companyId },
      });
      if (res.ok) setTransactions(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleRevert = async () => {
    if (!selectedTx || !reason || !reversedBy) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/reversals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify({
          transactionId: selectedTx.id,
          reason,
          reversedBy,
          notes,
        }),
      });
      if (res.ok) {
        setShowRevertDialog(false);
        setSelectedTx(null);
        setReason('');
        setReversedBy('');
        setNotes('');
        loadReversals();
        loadTransactions();
      } else {
        const err = await res.json();
        alert(err.error || 'Error al revertir');
      }
    } catch (e) { console.error(e); alert('Error al revertir'); }
    setSubmitting(false);
  };

  const filteredTransactions = transactions.filter(t =>
    !reversals.some(r => r.original_transaction_id === t.id && r.status === 'completed') &&
    (t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     String(t.voucherNumber).includes(searchTerm))
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format((amount || 0) / 100);
  };

  const statusBadge = (status: string) => {
    if (status === 'completed') return <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Completada</Badge>;
    if (status === 'pending') return <Badge className="bg-yellow-100 text-yellow-700"><Clock className="h-3 w-3 mr-1" />Pendiente</Badge>;
    return <Badge className="bg-gray-100 text-gray-700"><XCircle className="h-3 w-3 mr-1" />{status}</Badge>;
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button variant="outline" size="sm" onClick={() => router.push(`/companies/${companyId}/accounting`)}>
                <ArrowLeft className="h-4 w-4 mr-2" /> Volver
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <RotateCcw className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Reversión de Asientos</h1>
                  <p className="text-sm text-gray-500">Revertir transacciones contables con trazabilidad completa</p>
                </div>
              </div>
            </div>
            <Button onClick={() => setShowRevertDialog(true)}>
              <RotateCcw className="h-4 w-4 mr-2" />
              Nueva Reversión
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Reversiones existentes */}
        <Card>
          <CardHeader>
            <CardTitle>Historial de Reversiones ({reversals.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Cargando...</div>
            ) : reversals.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <RotateCcw className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                No hay reversiones registradas
              </div>
            ) : (
              <div className="space-y-3">
                {reversals.map(rev => (
                  <div key={rev.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {statusBadge(rev.status)}
                          <span className="font-medium">{rev.originalTransaction?.description || 'Transacción original'}</span>
                        </div>
                        <p className="text-sm text-gray-500 mt-1">Motivo: {rev.reason}</p>
                        <p className="text-xs text-gray-400 mt-1">
                          Revertido por {rev.reversed_by} el {new Date(rev.reversed_at).toLocaleDateString('es-HN')}
                        </p>
                      </div>
                      <div className="text-right text-sm">
                        <div className="text-gray-500">Original: {rev.originalTransaction?.voucherNumber}</div>
                        <div className="text-red-600">Reversión: {rev.reversalTransaction?.voucherNumber || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialog de reversión */}
        {showRevertDialog && (
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-700">
                <AlertTriangle className="h-5 w-5" />
                Revertir Transacción
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Buscar Transacción</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                    placeholder="Buscar por descripción o número..."
                    className="pl-9"
                  />
                </div>
              </div>

              {searchTerm && !selectedTx && (
                <div className="border rounded-lg max-h-60 overflow-auto">
                  {filteredTransactions.slice(0, 10).map(tx => (
                    <div
                      key={tx.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                      onClick={() => { setSelectedTx(tx); setSearchTerm(''); }}
                    >
                      <div className="flex justify-between">
                        <span className="font-medium">{tx.description}</span>
                        <span className="text-sm text-gray-500">#{tx.voucherNumber}</span>
                      </div>
                      <div className="text-xs text-gray-400">{tx.date} — {tx.voucherType}</div>
                    </div>
                  ))}
                  {filteredTransactions.length === 0 && (
                    <div className="px-4 py-3 text-gray-400 text-sm">No se encontraron transacciones</div>
                  )}
                </div>
              )}

              {selectedTx && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{selectedTx.description}</p>
                      <p className="text-sm text-gray-500">#{selectedTx.voucherNumber} — {selectedTx.voucherType} — {selectedTx.date}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedTx(null)}>×</Button>
                  </div>
                </div>
              )}

              <div>
                <Label>Motivo de Reversión *</Label>
                <Textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="Describe el motivo de la reversión..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Revertido por *</Label>
                  <Input value={reversedBy} onChange={e => setReversedBy(e.target.value)} placeholder="Nombre del contador" />
                </div>
                <div>
                  <Label>Notas (opcional)</Label>
                  <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notas adicionales" />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setShowRevertDialog(false); setSelectedTx(null); setReason(''); setReversedBy(''); setNotes(''); }}>
                  Cancelar
                </Button>
                <Button
                  onClick={handleRevert}
                  disabled={!selectedTx || !reason || !reversedBy || submitting}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {submitting ? 'Procesando...' : 'Revertir Transacción'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
