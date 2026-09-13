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
  Plus,
  Save,
  Trash2,
  Copy,
  Play,
  Pause,
  Calendar,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
} from 'lucide-react';

const FREQUENCIES = [
  { value: 'weekly', label: 'Semanal' },
  { value: 'biweekly', label: 'Quincenal' },
  { value: 'monthly', label: 'Mensual' },
  { value: 'quarterly', label: 'Trimestral' },
  { value: 'yearly', label: 'Anual' },
];

const VOUCHER_TYPES = [
  { value: 'INGRESO', label: 'Ingreso', color: 'bg-green-100 text-green-700' },
  { value: 'EGRESO', label: 'Egreso', color: 'bg-red-100 text-red-700' },
  { value: 'DIARIO', label: 'Diario', color: 'bg-blue-100 text-blue-700' },
  { value: 'AJUSTE', label: 'Ajuste', color: 'bg-yellow-100 text-yellow-700' },
];

interface RecurringEntry {
  id: string;
  name: string;
  description: string;
  voucher_type: string;
  frequency: string;
  next_execution: string;
  last_execution: string;
  is_active: boolean;
  entries: any[];
  created_at: string;
}

export default function RecurringEntriesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [recurring, setRecurring] = useState<RecurringEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountSelector, setShowAccountSelector] = useState<number | null>(null);
  const [executing, setExecuting] = useState<string | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    voucher_type: 'DIARIO',
    frequency: 'monthly',
    next_execution: new Date().toISOString().split('T')[0],
    entries: [
      { account_code: '', account_name: '', debit_enabled: true, credit_enabled: false, default_amount: 0, sort_order: 0 },
      { account_code: '', account_name: '', debit_enabled: false, credit_enabled: true, default_amount: 0, sort_order: 1 },
    ] as any[],
  });

  useEffect(() => {
    loadRecurring();
    loadAccounts();
  }, [companyId]);

  const loadRecurring = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/recurring-entries?tenantId=${companyId}`, {
        headers: { 'x-tenant-id': companyId },
      });
      if (res.ok) setRecurring(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch(`/api/accounting/accounts?tenantId=${companyId}`, {
        headers: { 'x-tenant-id': companyId },
      });
      if (res.ok) setAccounts(await res.json());
    } catch (e) { console.error(e); }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...(editingId ? { id: editingId } : {}),
        name: form.name,
        description: form.description,
        voucher_type: form.voucher_type,
        frequency: form.frequency,
        next_execution: form.next_execution,
        entries: form.entries.filter(e => e.account_code),
      };

      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(`/api/accounting/recurring-entries?tenantId=${companyId}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setIsCreating(false);
        setEditingId(null);
        resetForm();
        loadRecurring();
      }
    } catch (e) { console.error(e); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este asiento recurrente?')) return;
    try {
      const res = await fetch(`/api/accounting/recurring-entries?tenantId=${companyId}&id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': companyId },
      });
      if (res.ok) loadRecurring();
    } catch (e) { console.error(e); }
  };

  const handleExecute = async (id: string) => {
    setExecuting(id);
    try {
      const res = await fetch('/api/accounting/recurring-entries/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify({ id }),
      });
      if (res.ok) {
        loadRecurring();
        alert('Asiento ejecutado exitosamente');
      } else {
        const err = await res.json();
        alert(err.error || 'Error al ejecutar');
      }
    } catch (e) { console.error(e); alert('Error al ejecutar'); }
    setExecuting(null);
  };

  const handleEdit = (entry: RecurringEntry) => {
    setEditingId(entry.id);
    setIsCreating(true);
    setForm({
      name: entry.name,
      description: entry.description || '',
      voucher_type: entry.voucher_type,
      frequency: entry.frequency,
      next_execution: entry.next_execution,
      entries: entry.entries.length > 0 ? entry.entries : [
        { account_code: '', account_name: '', debit_enabled: true, credit_enabled: false, default_amount: 0, sort_order: 0 },
        { account_code: '', account_name: '', debit_enabled: false, credit_enabled: true, default_amount: 0, sort_order: 1 },
      ],
    });
  };

  const handleDuplicate = (entry: RecurringEntry) => {
    setEditingId(null);
    setIsCreating(true);
    setForm({
      name: `${entry.name} (copia)`,
      description: entry.description || '',
      voucher_type: entry.voucher_type,
      frequency: entry.frequency,
      next_execution: new Date().toISOString().split('T')[0],
      entries: entry.entries.map(e => ({ ...e })),
    });
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      voucher_type: 'DIARIO',
      frequency: 'monthly',
      next_execution: new Date().toISOString().split('T')[0],
      entries: [
        { account_code: '', account_name: '', debit_enabled: true, credit_enabled: false, default_amount: 0, sort_order: 0 },
        { account_code: '', account_name: '', debit_enabled: false, credit_enabled: true, default_amount: 0, sort_order: 1 },
      ],
    });
  };

  const addLine = () => {
    setForm(prev => ({
      ...prev,
      entries: [...prev.entries, { account_code: '', account_name: '', debit_enabled: true, credit_enabled: true, default_amount: 0, sort_order: prev.entries.length }],
    }));
  };

  const removeLine = (index: number) => {
    if (form.entries.length <= 2) return;
    setForm(prev => ({ ...prev, entries: prev.entries.filter((_, i) => i !== index) }));
  };

  const updateLine = (index: number, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      entries: prev.entries.map((l, i) => i === index ? { ...l, [field]: value } : l),
    }));
  };

  const selectAccount = (index: number, account: any) => {
    updateLine(index, 'account_code', account.code);
    updateLine(index, 'account_name', account.name);
    setShowAccountSelector(null);
    setAccountSearch('');
  };

  const filteredAccounts = accounts.filter(a =>
    a.code?.toLowerCase().includes(accountSearch.toLowerCase()) ||
    a.name?.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(amount / 100);
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
                <div className="p-2 bg-purple-100 rounded-lg">
                  <RefreshCw className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Asientos Recurrentes</h1>
                  <p className="text-sm text-gray-500">Programar asientos contables periódicos automáticos</p>
                </div>
              </div>
            </div>
            {!isCreating && (
              <Button onClick={() => { setIsCreating(true); setEditingId(null); resetForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Asiento Recurrente
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Formulario */}
        {isCreating && (
          <Card>
            <CardHeader>
              <CardTitle>{editingId ? 'Editar Asiento Recurrente' : 'Nuevo Asiento Recurrente'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Ej: Alquiler mensual" />
                </div>
                <div>
                  <Label>Tipo de Comprobante</Label>
                  <select value={form.voucher_type} onChange={e => setForm(p => ({ ...p, voucher_type: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm">
                    {VOUCHER_TYPES.map(vt => <option key={vt.value} value={vt.value}>{vt.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Frecuencia</Label>
                  <select value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))} className="w-full px-3 py-2 border rounded-md text-sm">
                    {FREQUENCIES.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                  </select>
                </div>
                <div>
                  <Label>Próxima Ejecución</Label>
                  <Input type="date" value={form.next_execution} onChange={e => setForm(p => ({ ...p, next_execution: e.target.value }))} />
                </div>
              </div>
              <div>
                <Label>Descripción</Label>
                <Input value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} placeholder="Opcional" />
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Líneas del Asiento</Label>
                  <Button variant="outline" size="sm" onClick={addLine}><Plus className="h-3 w-3 mr-1" />Agregar Línea</Button>
                </div>
                <div className="space-y-2">
                  {form.entries.map((line, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="relative flex-1">
                        <Input
                          value={`${line.account_code} ${line.account_name}`}
                          onClick={() => setShowAccountSelector(index)}
                          readOnly
                          placeholder="Cuenta"
                          className="cursor-pointer text-sm"
                        />
                        {showAccountSelector === index && (
                          <div className="absolute z-50 top-full left-0 mt-1 w-80 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                            <div className="p-2 border-b">
                              <Input value={accountSearch} onChange={e => setAccountSearch(e.target.value)} placeholder="Buscar..." className="text-sm" autoFocus />
                            </div>
                            {filteredAccounts.slice(0, 20).map(acc => (
                              <div key={acc.id} className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm" onClick={() => selectAccount(index, acc)}>
                                <span className="font-mono font-medium">{acc.code}</span>
                                <span className="ml-2 text-gray-600">{acc.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={line.debit_enabled} onChange={e => updateLine(index, 'debit_enabled', e.target.checked)} />Debe
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input type="checkbox" checked={line.credit_enabled} onChange={e => updateLine(index, 'credit_enabled', e.target.checked)} />Haber
                      </label>
                      <Input
                        type="number"
                        value={line.default_amount || ''}
                        onChange={e => updateLine(index, 'default_amount', Number(e.target.value))}
                        placeholder="Monto"
                        className="w-[130px] text-sm text-right"
                      />
                      <Button variant="ghost" size="sm" onClick={() => removeLine(index)} disabled={form.entries.length <= 2}>
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsCreating(false); setEditingId(null); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSave} disabled={!form.name || form.entries.filter(e => e.account_code).length < 2}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingId ? 'Actualizar' : 'Crear'} Asiento Recurrente
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista */}
        <Card>
          <CardHeader>
            <CardTitle>Asientos Recurrentes ({recurring.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Cargando...</div>
            ) : recurring.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <RefreshCw className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                No hay asientos recurrentes creados
              </div>
            ) : (
              <div className="space-y-3">
                {recurring.map(entry => (
                  <div key={entry.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{entry.name}</span>
                          <Badge className={VOUCHER_TYPES.find(v => v.value === entry.voucher_type)?.color || ''}>
                            {VOUCHER_TYPES.find(v => v.value === entry.voucher_type)?.label}
                          </Badge>
                          <Badge variant="outline">{FREQUENCIES.find(f => f.value === entry.frequency)?.label}</Badge>
                          {entry.is_active ? (
                            <Badge className="bg-green-100 text-green-700"><CheckCircle className="h-3 w-3 mr-1" />Activo</Badge>
                          ) : (
                            <Badge className="bg-gray-100 text-gray-500"><Pause className="h-3 w-3 mr-1" />Inactivo</Badge>
                          )}
                        </div>
                        {entry.description && <p className="text-sm text-gray-500 mt-1">{entry.description}</p>}
                        <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                          <span><Calendar className="h-3 w-3 inline mr-1" />Próxima: {entry.next_execution}</span>
                          {entry.last_execution && <span>Última: {entry.last_execution}</span>}
                          <span>{entry.entries.length} líneas</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleExecute(entry.id)}
                          disabled={executing === entry.id}
                          title="Ejecutar ahora"
                        >
                          {executing === entry.id ? <Clock className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 text-green-600" />}
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(entry)}><Copy className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(entry.id)}><Trash2 className="h-4 w-4 text-red-500" /></Button>
                      </div>
                    </div>

                    <div className="mt-3 text-xs">
                      <table className="w-full">
                        <thead>
                          <tr className="text-gray-400 border-b">
                            <th className="text-left py-1">Cuenta</th>
                            <th className="text-left py-1">Nombre</th>
                            <th className="text-center py-1 w-16">Debe</th>
                            <th className="text-center py-1 w-16">Haber</th>
                            <th className="text-right py-1 w-24">Monto</th>
                          </tr>
                        </thead>
                        <tbody>
                          {entry.entries.map((line: any, idx: number) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-1 font-mono">{line.account_code}</td>
                              <td className="py-1 text-gray-600">{line.account_name}</td>
                              <td className="py-1 text-center">{line.debit_enabled ? '✓' : '—'}</td>
                              <td className="py-1 text-center">{line.credit_enabled ? '✓' : '—'}</td>
                              <td className="py-1 text-right font-mono">{line.default_amount ? formatCurrency(line.default_amount) : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
