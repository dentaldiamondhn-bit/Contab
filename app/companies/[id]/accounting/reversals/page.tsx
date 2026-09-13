'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ArrowLeft,
  RotateCcw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Search,
  Upload,
  Download,
  FileSpreadsheet,
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
  const [showTxList, setShowTxList] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadPreview, setUploadPreview] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [users, setUsers] = useState<any[]>([]);
  const [showUserSelector, setShowUserSelector] = useState(false);

  useEffect(() => {
    loadReversals();
    loadTransactions();
    loadUsers();
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

  const loadUsers = async () => {
    try {
      const res = await fetch(`/api/tenant/users?tenantId=${companyId}`);
      if (res.ok) {
        const data = await res.json();
        setUsers(data || []);
      }
    } catch (e) {
      console.error('Error loading users:', e);
    }
  };

  const handleRevert = async (txId?: string, revReason?: string, revBy?: string, revNotes?: string) => {
    const targetTx = txId ? transactions.find(t => t.id === txId) || selectedTx : selectedTx;
    const targetReason = revReason || reason;
    const targetBy = revBy || reversedBy;
    const targetNotes = revNotes || notes;

    if (!targetTx || !targetReason || !targetBy) return;
    setSubmitting(true);
    try {
      const res = await fetch('/api/accounting/reversals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify({
          transactionId: targetTx.id,
          reason: targetReason,
          reversedBy: targetBy,
          notes: targetNotes,
        }),
      });
      if (res.ok) {
        if (!txId) {
          setShowRevertDialog(false);
          setSelectedTx(null);
          setReason('');
          setReversedBy('');
          setNotes('');
        }
        loadReversals();
        loadTransactions();
      } else {
        const err = await res.json();
        if (!txId) alert(err.error || 'Error al revertir');
        return { error: err.error };
      }
    } catch (e) { console.error(e); if (!txId) alert('Error al revertir'); return { error: 'Error' }; }
    setSubmitting(false);
    return { success: true };
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadFile(file);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const wb = XLSX.read(evt.target?.result, { type: 'binary' });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
        setUploadPreview(rows.slice(0, 50));
      } catch (err) {
        console.error('Error leyendo Excel:', err);
        alert('Error al leer el archivo.');
      }
    };
    reader.readAsBinaryString(file);
  };

  const processUpload = async () => {
    if (!uploadFile) return;
    setUploading(true);

    try {
      const reader = new FileReader();
      reader.onload = async (evt) => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: 'binary' });
          const ws = wb.Sheets[wb.SheetNames[0]];
          const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });

          let successCount = 0;
          let errorCount = 0;
          const errors: string[] = [];

          for (const row of rows) {
            const r = row as any;
            const txId = (r.id_transaccion || r.transaction_id || r.id || '').toString().trim();
            const txDesc = (r.descripcion || r.description || '').toString().trim();
            const revReason = (r.motivo || r.reason || 'Reversión masiva desde Excel').toString().trim();
            const revBy = (r.revertido_por || r.reversed_by || 'Sistema').toString().trim();

            if (!txId && !txDesc) { errorCount++; errors.push(`Fila sin ID ni descripción`); continue; }

            let targetTx: Transaction | undefined;
            if (txId) {
              targetTx = transactions.find(t => t.id === txId || String(t.voucherNumber) === txId);
            }
            if (!targetTx && txDesc) {
              targetTx = transactions.find(t =>
                t.description?.toLowerCase().includes(txDesc.toLowerCase())
              );
            }

            if (!targetTx) {
              errorCount++;
              errors.push(`Transacción no encontrada: ${txId || txDesc}`);
              continue;
            }

            const alreadyReversed = reversals.some(
              r => r.original_transaction_id === targetTx!.id && r.status === 'completed'
            );
            if (alreadyReversed) {
              errorCount++;
              errors.push(`Ya revertida: ${targetTx.description}`);
              continue;
            }

            const result = await handleRevert(targetTx.id, revReason, revBy, '');
            if (result?.error) {
              errorCount++;
              errors.push(`${targetTx.description}: ${result.error}`);
            } else {
              successCount++;
            }
          }

          setShowUploadDialog(false);
          setUploadFile(null);
          setUploadPreview([]);
          loadReversals();
          loadTransactions();

          let msg = `Proceso completado: ${successCount} revertida(s)`;
          if (errorCount > 0) msg += `, ${errorCount} error(es)`;
          if (errors.length > 0) msg += `\n\nErrores:\n${errors.slice(0, 10).join('\n')}`;
          alert(msg);
        } catch (err) {
          console.error('Error procesando Excel:', err);
          alert('Error al procesar el archivo.');
        }
        setUploading(false);
      };
      reader.readAsBinaryString(uploadFile);
    } catch (err) {
      console.error('Error:', err);
      setUploading(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([
      ['id_transaccion', 'descripcion', 'motivo', 'revertido_por'],
      ['', 'Pago de proveedor duplicado', 'Duplicado detectado en reconciliación', 'Carlos López'],
      ['', 'Ajuste contable erróneo', 'Error en póliza de diario', 'María García'],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reversiones');
    XLSX.writeFile(wb, 'Plantilla_Reversiones.xlsx');
  };

  const filteredTransactions = transactions.filter(t =>
    !reversals.some(r => r.original_transaction_id === t.id && r.status === 'completed') &&
    (searchTerm === '' ||
     t.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     String(t.voucherNumber).includes(searchTerm) ||
     t.voucherType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
     t.date?.includes(searchTerm))
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
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setShowUploadDialog(true)}>
                <Upload className="h-4 w-4 mr-2" />
                Importar Reversiones
              </Button>
              <Button onClick={() => setShowRevertDialog(true)}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Nueva Reversión
              </Button>
            </div>
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

        {/* Dialog de reversión manual */}
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
                    onChange={e => { setSearchTerm(e.target.value); setShowTxList(true); }}
                    onFocus={() => setShowTxList(true)}
                    placeholder="Buscar por descripción, número, tipo o fecha..."
                    className="pl-9"
                  />
                </div>
              </div>

              {showTxList && !selectedTx && (
                <div className="border rounded-lg max-h-60 overflow-auto">
                  <div className="flex items-center justify-between px-4 py-2 bg-gray-50 border-b sticky top-0">
                    <span className="text-xs font-medium text-gray-500">{filteredTransactions.length} transacción(es) disponible(s)</span>
                    <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => { setShowTxList(false); setSearchTerm(''); }}>Cerrar</button>
                  </div>
                  {filteredTransactions.slice(0, 20).map(tx => (
                    <div
                      key={tx.id}
                      className="px-4 py-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                      onClick={() => { setSelectedTx(tx); setShowTxList(false); setSearchTerm(''); }}
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
                <div className="relative">
                  <Label>Revertido por *</Label>
                  <Input
                    value={reversedBy}
                    onClick={() => { if (users.length > 0) setShowUserSelector(true); }}
                    readOnly
                    placeholder="Seleccionar contador..."
                    className="cursor-pointer"
                  />
                  {showUserSelector && (
                    <div className="absolute z-50 top-full left-0 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                      <div className="flex items-center justify-between px-3 py-2 border-b sticky top-0 bg-white">
                        <span className="text-xs font-medium text-gray-500">{users.length} usuario(s)</span>
                        <button className="text-xs text-gray-400 hover:text-gray-600" onClick={() => setShowUserSelector(false)}>Cerrar</button>
                      </div>
                      {users.map((user: any) => (
                        <div
                          key={user.id}
                          className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm border-b last:border-0"
                          onClick={() => {
                            setReversedBy(user.firstName && user.lastName ? `${user.firstName} ${user.lastName}` : user.email || user.id);
                            setShowUserSelector(false);
                          }}
                        >
                          <div className="font-medium">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-gray-400">{user.email}</div>
                        </div>
                      ))}
                      {users.length === 0 && (
                        <div className="px-3 py-4 text-center text-gray-400 text-sm">No hay usuarios</div>
                      )}
                    </div>
                  )}
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
                  onClick={() => handleRevert()}
                  disabled={!selectedTx || !reason || !reversedBy || submitting}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {submitting ? 'Procesando...' : 'Revertir Transacción'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Dialog de importación Excel */}
        <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <FileSpreadsheet className="h-5 w-5 text-green-600" />
                Importar Reversiones desde Excel
              </DialogTitle>
              <DialogDescription>
                Suba un archivo Excel (.xlsx) con las reversiones a procesar.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-800 mb-1">Formato esperado del Excel:</p>
                <p className="text-xs text-blue-700">
                  <strong>id_transaccion</strong> (UUID o # de póliza) o <strong>descripcion</strong> (texto para buscar),
                  <strong> motivo</strong>, <strong>revertido_por</strong>
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Las transacciones se buscan por ID exacto, número de póliza, o coincidencia de descripción.
                </p>
                <button
                  onClick={downloadTemplate}
                  className="mt-2 flex items-center gap-1 text-xs font-medium text-blue-700 hover:text-blue-900 underline"
                >
                  <Download className="h-3 w-3" />
                  Descargar plantilla de ejemplo
                </button>
              </div>

              <div>
                <Label>Archivo Excel</Label>
                <Input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-green-50 file:text-green-700 hover:file:bg-green-100"
                />
              </div>

              {uploadPreview.length > 0 && (
                <div>
                  <Label>Vista previa ({uploadPreview.length} filas)</Label>
                  <div className="mt-1 border rounded-lg overflow-auto max-h-60">
                    <table className="w-full text-xs">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          {Object.keys(uploadPreview[0]).map(key => (
                            <th key={key} className="px-2 py-1 text-left font-medium text-gray-600">{key}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {uploadPreview.map((row, i) => (
                          <tr key={i} className="border-t">
                            {Object.values(row).map((val, j) => (
                              <td key={j} className="px-2 py-1">{String(val)}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowUploadDialog(false); setUploadFile(null); setUploadPreview([]); }}>
                Cancelar
              </Button>
              <Button onClick={processUpload} disabled={!uploadFile || uploading}>
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                    Procesando...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Procesar Reversiones
                  </>
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
