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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ArrowLeft,
  Plus,
  Save,
  Trash2,
  FileText,
  Edit,
  Copy,
  CheckCircle,
  XCircle,
  ChevronDown,
} from 'lucide-react';

interface TemplateLine {
  id?: string;
  account_code: string;
  account_name: string;
  debit_enabled: boolean;
  credit_enabled: boolean;
  default_amount: number;
  sort_order: number;
}

interface Template {
  id: string;
  name: string;
  description: string;
  voucher_type: string;
  is_active: boolean;
  created_at: string;
  lines: TemplateLine[];
}

const VOUCHER_TYPES = [
  { value: 'INGRESO', label: 'Ingreso', color: 'bg-green-100 text-green-700' },
  { value: 'EGRESO', label: 'Egreso', color: 'bg-red-100 text-red-700' },
  { value: 'DIARIO', label: 'Diario', color: 'bg-blue-100 text-blue-700' },
  { value: 'AJUSTE', label: 'Ajuste', color: 'bg-yellow-100 text-yellow-700' },
];

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('es-HN', {
    style: 'currency',
    currency: 'HNL',
    minimumFractionDigits: 2,
  }).format(amount / 100);
}

export default function JournalTemplatesPage() {
  const params = useParams();
  const router = useRouter();
  const companyId = params.id as string;

  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [accountSearch, setAccountSearch] = useState('');
  const [showAccountSelector, setShowAccountSelector] = useState<number | null>(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
    voucher_type: 'DIARIO',
    lines: [
      { account_code: '', account_name: '', debit_enabled: true, credit_enabled: false, default_amount: 0, sort_order: 0 },
      { account_code: '', account_name: '', debit_enabled: false, credit_enabled: true, default_amount: 0, sort_order: 1 },
    ] as TemplateLine[],
  });

  useEffect(() => {
    loadTemplates();
    loadAccounts();
  }, [companyId]);

  const loadTemplates = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/accounting/journal-templates?tenantId=${companyId}`, {
        headers: { 'x-tenant-id': companyId },
      });
      if (res.ok) {
        const data = await res.json();
        setTemplates(data);
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
    setLoading(false);
  };

  const loadAccounts = async () => {
    try {
      const res = await fetch(`/api/accounting/accounts?tenantId=${companyId}`, {
        headers: { 'x-tenant-id': companyId },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(data);
      }
    } catch (error) {
      console.error('Error loading accounts:', error);
    }
  };

  const handleSave = async () => {
    try {
      const payload = {
        ...(editingTemplate ? { id: editingTemplate.id } : {}),
        name: form.name,
        description: form.description,
        voucher_type: form.voucher_type,
        lines: form.lines.filter(l => l.account_code),
      };

      const method = editingTemplate ? 'PUT' : 'POST';
      const res = await fetch(`/api/accounting/journal-templates?tenantId=${companyId}`, {
        method,
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setEditingTemplate(null);
        setIsCreating(false);
        resetForm();
        loadTemplates();
      }
    } catch (error) {
      console.error('Error saving template:', error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta plantilla?')) return;
    try {
      const res = await fetch(`/api/accounting/journal-templates?tenantId=${companyId}&id=${id}`, {
        method: 'DELETE',
        headers: { 'x-tenant-id': companyId },
      });
      if (res.ok) loadTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const handleEdit = (template: Template) => {
    setEditingTemplate(template);
    setIsCreating(true);
    setForm({
      name: template.name,
      description: template.description || '',
      voucher_type: template.voucher_type,
      lines: template.lines.length > 0 ? template.lines : [
        { account_code: '', account_name: '', debit_enabled: true, credit_enabled: false, default_amount: 0, sort_order: 0 },
        { account_code: '', account_name: '', debit_enabled: false, credit_enabled: true, default_amount: 0, sort_order: 1 },
      ],
    });
  };

  const handleDuplicate = (template: Template) => {
    setEditingTemplate(null);
    setIsCreating(true);
    setForm({
      name: `${template.name} (copia)`,
      description: template.description || '',
      voucher_type: template.voucher_type,
      lines: template.lines.map(l => ({ ...l, id: undefined })),
    });
  };

  const resetForm = () => {
    setForm({
      name: '',
      description: '',
      voucher_type: 'DIARIO',
      lines: [
        { account_code: '', account_name: '', debit_enabled: true, credit_enabled: false, default_amount: 0, sort_order: 0 },
        { account_code: '', account_name: '', debit_enabled: false, credit_enabled: true, default_amount: 0, sort_order: 1 },
      ],
    });
  };

  const addLine = () => {
    setForm(prev => ({
      ...prev,
      lines: [
        ...prev.lines,
        { account_code: '', account_name: '', debit_enabled: true, credit_enabled: true, default_amount: 0, sort_order: prev.lines.length },
      ],
    }));
  };

  const removeLine = (index: number) => {
    if (form.lines.length <= 2) return;
    setForm(prev => ({
      ...prev,
      lines: prev.lines.filter((_, i) => i !== index),
    }));
  };

  const updateLine = (index: number, field: string, value: any) => {
    setForm(prev => ({
      ...prev,
      lines: prev.lines.map((l, i) => i === index ? { ...l, [field]: value } : l),
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

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="outline"
                size="sm"
                onClick={() => router.push(`/companies/${companyId}/accounting`)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Volver
              </Button>
              <div className="flex items-center space-x-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <FileText className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">Plantillas de Asientos</h1>
                  <p className="text-sm text-gray-500">Crear y gestionar plantillas reutilizables de pólizas</p>
                </div>
              </div>
            </div>
            {!isCreating && (
              <Button onClick={() => { setIsCreating(true); setEditingTemplate(null); resetForm(); }}>
                <Plus className="h-4 w-4 mr-2" />
                Nueva Plantilla
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Formulario */}
        {isCreating && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>{editingTemplate ? 'Editar Plantilla' : 'Nueva Plantilla'}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label>Nombre *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Ej: Póliza de nómina"
                  />
                </div>
                <div>
                  <Label>Tipo de Comprobante</Label>
                  <select
                    value={form.voucher_type}
                    onChange={(e) => setForm(prev => ({ ...prev, voucher_type: e.target.value }))}
                    className="w-full px-3 py-2 border rounded-md text-sm"
                  >
                    {VOUCHER_TYPES.map(vt => (
                      <option key={vt.value} value={vt.value}>{vt.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <Label>Descripción</Label>
                  <Input
                    value={form.description}
                    onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Opcional"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <Label>Líneas de la Plantilla</Label>
                  <Button variant="outline" size="sm" onClick={addLine}>
                    <Plus className="h-3 w-3 mr-1" />
                    Agregar Línea
                  </Button>
                </div>

                <div className="space-y-2">
                  {form.lines.map((line, index) => (
                    <div key={index} className="flex items-center gap-2 p-2 bg-gray-50 rounded-lg">
                      <div className="relative flex-1">
                        <Input
                          value={line.account_code}
                          onClick={() => setShowAccountSelector(index)}
                          readOnly
                          placeholder="Código"
                          className="w-[120px] font-mono text-sm cursor-pointer"
                        />
                        {showAccountSelector === index && (
                          <div className="absolute z-50 top-full left-0 mt-1 w-80 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                            <div className="p-2 border-b">
                              <Input
                                value={accountSearch}
                                onChange={(e) => setAccountSearch(e.target.value)}
                                placeholder="Buscar cuenta..."
                                className="text-sm"
                                autoFocus
                              />
                            </div>
                            {filteredAccounts.slice(0, 20).map(acc => (
                              <div
                                key={acc.id}
                                className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm"
                                onClick={() => selectAccount(index, acc)}
                              >
                                <span className="font-mono font-medium">{acc.code}</span>
                                <span className="ml-2 text-gray-600">{acc.name}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                      <Input
                        value={line.account_name}
                        readOnly
                        placeholder="Nombre"
                        className="flex-1 text-sm"
                      />
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={line.debit_enabled}
                          onChange={(e) => updateLine(index, 'debit_enabled', e.target.checked)}
                        />
                        Debe
                      </label>
                      <label className="flex items-center gap-1 text-xs">
                        <input
                          type="checkbox"
                          checked={line.credit_enabled}
                          onChange={(e) => updateLine(index, 'credit_enabled', e.target.checked)}
                        />
                        Haber
                      </label>
                      <Input
                        type="number"
                        value={line.default_amount || ''}
                        onChange={(e) => updateLine(index, 'default_amount', Number(e.target.value))}
                        placeholder="Monto sugerido"
                        className="w-[150px] text-sm text-right"
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLine(index)}
                        disabled={form.lines.length <= 2}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setIsCreating(false); setEditingTemplate(null); resetForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSave} disabled={!form.name || form.lines.filter(l => l.account_code).length < 2}>
                  <Save className="h-4 w-4 mr-2" />
                  {editingTemplate ? 'Actualizar' : 'Crear'} Plantilla
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Lista de plantillas */}
        <Card>
          <CardHeader>
            <CardTitle>Plantillas Existentes ({templates.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-gray-500">Cargando plantillas...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                No hay plantillas creadas
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <div key={template.id} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-indigo-500" />
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{template.name}</span>
                            <Badge className={VOUCHER_TYPES.find(v => v.value === template.voucher_type)?.color || 'bg-gray-100'}>
                              {VOUCHER_TYPES.find(v => v.value === template.voucher_type)?.label || template.voucher_type}
                            </Badge>
                            {!template.is_active && <Badge className="bg-gray-100 text-gray-500">Inactiva</Badge>}
                          </div>
                          {template.description && (
                            <p className="text-sm text-gray-500">{template.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-400">
                            <span>{template.lines.length} líneas</span>
                            <span>{template.lines.filter(l => l.debit_enabled).length} débitos</span>
                            <span>{template.lines.filter(l => l.credit_enabled).length} créditos</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={() => handleEdit(template)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDuplicate(template)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(template.id)}>
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>

                    {/* Preview de líneas */}
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
                          {template.lines.map((line, idx) => (
                            <tr key={idx} className="border-b border-gray-100">
                              <td className="py-1 font-mono">{line.account_code}</td>
                              <td className="py-1 text-gray-600">{line.account_name}</td>
                              <td className="py-1 text-center">{line.debit_enabled ? <CheckCircle className="h-3 w-3 text-green-500 mx-auto" /> : <XCircle className="h-3 w-3 text-gray-300 mx-auto" />}</td>
                              <td className="py-1 text-center">{line.credit_enabled ? <CheckCircle className="h-3 w-3 text-green-500 mx-auto" /> : <XCircle className="h-3 w-3 text-gray-300 mx-auto" />}</td>
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
