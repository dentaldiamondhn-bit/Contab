'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { AlertTriangle, OctagonX, Plus, Trash2, Download, ArrowLeft, CheckCircle2 } from 'lucide-react';

interface Budget {
  id: string;
  name: string;
  year: number;
  period_type: 'annual' | 'monthly';
  status: 'draft' | 'active' | 'closed';
  notes: string;
}

interface BudgetLine {
  id?: string;
  account_code: string;
  account_name: string;
  category: 'ingreso' | 'gasto';
  period: string | null;
  amount: number;
}

interface ComparisonLine {
  accountCode: string;
  accountName: string;
  category: 'ingreso' | 'gasto';
  budgeted: number;
  actual: number;
  variance: number;
  executionPct: number | null;
  status: 'ok' | 'advertencia' | 'critico' | 'sin-datos';
}

interface Comparison {
  budget: Budget;
  period: string;
  lines: ComparisonLine[];
  totals: {
    gasto: { budgeted: number; actual: number; variance: number; executionPct: number | null };
    ingreso: { budgeted: number; actual: number; variance: number; executionPct: number | null };
  };
  alerts: Array<{
    level: 'advertencia' | 'critico';
    accountCode: string;
    accountName: string;
    executionPct: number | null;
    message: string;
  }>;
}

interface AccountOption {
  code: string;
  name: string;
  type: string;
}

const STATUS_LABEL: Record<Budget['status'], string> = {
  draft: 'Borrador',
  active: 'Activo',
  closed: 'Cerrado',
};

const STATUS_VARIANT: Record<Budget['status'], 'default' | 'secondary' | 'outline'> = {
  draft: 'secondary',
  active: 'default',
  closed: 'outline',
};

export default function BudgetsManager({ companyId }: { companyId: string }) {
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [missingTables, setMissingTables] = useState(false);
  const [selected, setSelected] = useState<(Budget & { lines: BudgetLine[] }) | null>(null);
  const [period, setPeriod] = useState('');
  const [comparison, setComparison] = useState<Comparison | null>(null);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [trend, setTrend] = useState<{
    year: number;
    months: Array<{
      period: string;
      gasto: { budgeted: number; actual: number; variance: number; executionPct: number | null };
      ingreso: { budgeted: number; actual: number; variance: number; executionPct: number | null };
    }>;
  } | null>(null);
  const [trendLoading, setTrendLoading] = useState(false);
  const [accounts, setAccounts] = useState<AccountOption[]>([]);

  // Formulario de creación
  const [showCreate, setShowCreate] = useState(false);
  const [formName, setFormName] = useState('');
  const [formYear, setFormYear] = useState(new Date().getFullYear());
  const [formType, setFormType] = useState<'annual' | 'monthly'>('annual');
  const [formLines, setFormLines] = useState<BudgetLine[]>([]);
  const [saving, setSaving] = useState(false);

  const base = `/api/companies/${companyId}/budgets`;

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(amount || 0);

  const loadBudgets = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setMissingTables(false);
      const res = await fetch(base);
      const body = await res.json();
      if (!res.ok || !body.success) {
        if (body?.error && /BUDGET_TABLES\.sql|budgets\/budget_lines no encontradas/i.test(body.error)) {
          setMissingTables(true);
        }
        throw new Error(body?.error || 'Error al cargar presupuestos');
      }
      setBudgets(body.data.budgets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar presupuestos');
    } finally {
      setLoading(false);
    }
  }, [base]);

  const loadAccounts = useCallback(async () => {
    try {
      const res = await fetch(`/api/accounting/accounts?tenantId=${encodeURIComponent(companyId)}`);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : data?.data || [];
      setAccounts(
        list
          .filter((a: { code?: string }) => a?.code)
          .map((a: { code: string; name?: string; type?: string }) => ({
            code: String(a.code),
            name: String(a.name || a.code),
            type: String(a.type || ''),
          })),
      );
    } catch {
      // Catálogo opcional: el código puede digitarse manualmente.
    }
  }, [companyId]);

  useEffect(() => {
    loadBudgets();
    loadAccounts();
  }, [loadBudgets, loadAccounts]);

  const openDetail = async (id: string) => {
    try {
      setError(null);
      const res = await fetch(`${base}/${id}`);
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al cargar el presupuesto');
      const budget = body.data.budget;
      setSelected(budget);
      setComparison(null);
      setTrend(null);
      const now = new Date();
      const defaultPeriod =
        budget.year === now.getFullYear()
          ? `${budget.year}-${String(now.getMonth() + 1).padStart(2, '0')}`
          : `${budget.year}-01`;
      setPeriod(defaultPeriod);
      loadComparison(id, defaultPeriod);
      loadTrend(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al cargar el presupuesto');
    }
  };

  const loadTrend = async (budgetId: string) => {
    try {
      setTrendLoading(true);
      const res = await fetch(`${base}/${budgetId}/trend`);
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error en la tendencia');
      setTrend(body.data.trend);
    } catch (e) {
      setTrend(null);
    } finally {
      setTrendLoading(false);
    }
  };

  const loadComparison = async (budgetId: string, p: string) => {
    try {
      setComparisonLoading(true);
      const res = await fetch(`${base}/${budgetId}/comparison?period=${encodeURIComponent(p)}`);
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error en la comparación');
      setComparison(body.data.comparison);
    } catch (e) {
      setComparison(null);
      setError(e instanceof Error ? e.message : 'Error en la comparación');
    } finally {
      setComparisonLoading(false);
    }
  };

  const createBudget = async () => {
    if (!formName.trim()) {
      setError('El nombre del presupuesto es requerido');
      return;
    }
    if (formLines.length === 0) {
      setError('Agregue al menos una línea al presupuesto');
      return;
    }
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(base, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formName.trim(),
          year: formYear,
          period_type: formType,
          status: 'draft',
          lines: formLines.map((l) => ({
            account_code: l.account_code,
            account_name: l.account_name || l.account_code,
            category: l.category,
            period: l.period || null,
            amount: Number(l.amount) || 0,
          })),
        }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al crear el presupuesto');
      setShowCreate(false);
      setFormName('');
      setFormLines([]);
      await loadBudgets();
      openDetail(body.data.budget.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al crear el presupuesto');
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (status: 'active' | 'closed') => {
    if (!selected) return;
    if (status === 'closed' && !confirm('¿Cerrar el presupuesto? Un presupuesto cerrado no puede reabrirse.')) return;
    try {
      const res = await fetch(`${base}/${selected.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al actualizar');
      setSelected(body.data.budget);
      await loadBudgets();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al actualizar');
    }
  };

  const removeBudget = async () => {
    if (!selected) return;
    if (!confirm(`¿Eliminar el presupuesto "${selected.name}" y todas sus líneas?`)) return;
    try {
      const res = await fetch(`${base}/${selected.id}`, { method: 'DELETE' });
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || 'Error al eliminar');
      setSelected(null);
      setComparison(null);
      await loadBudgets();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al eliminar');
    }
  };

  const addLine = () => {
    setFormLines([
      ...formLines,
      { account_code: '', account_name: '', category: 'gasto', period: null, amount: 0 },
    ]);
  };

  const updateLine = (index: number, field: keyof BudgetLine, value: string | number | null) => {
    setFormLines((prev) => {
      const next = [...prev];
      const line = { ...next[index], [field]: value };
      if (field === 'account_code' && typeof value === 'string') {
        const match = accounts.find((a) => a.code === value.trim());
        if (match) line.account_name = match.name;
      }
      next[index] = line;
      return next;
    });
  };

  const removeLine = (index: number) => setFormLines((prev) => prev.filter((_, i) => i !== index));

  const exportComparisonCSV = () => {
    if (!comparison) return;
    const rows = [
      ['Cuenta', 'Nombre', 'Categoria', 'Presupuestado', 'Real', 'Varianza', 'Ejecucion_%', 'Estado'],
      ...comparison.lines.map((l) => [
        l.accountCode,
        `"${l.accountName}"`,
        l.category,
        l.budgeted.toFixed(2),
        l.actual.toFixed(2),
        l.variance.toFixed(2),
        l.executionPct === null ? 's/p' : l.executionPct.toFixed(1),
        l.status,
      ]),
    ];
    const blob = new Blob([rows.map((r) => r.join(',')).join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `presupuesto_vs_real_${comparison.budget.id}_${comparison.period}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const statusBadge = (s: ComparisonLine['status']) => {
    if (s === 'critico') return <Badge variant="destructive">Crítico</Badge>;
    if (s === 'advertencia') return <Badge variant="secondary">Advertencia</Badge>;
    if (s === 'sin-datos') return <Badge variant="outline">Sin datos</Badge>;
    return <Badge variant="default">OK</Badge>;
  };

  const monthsOf = (year: number) =>
    Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6 text-center text-gray-600">Cargando presupuestos...</CardContent>
      </Card>
    );
  }

  if (missingTables) {
    return (
      <Card className="border-red-300">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-red-700">
            <AlertTriangle className="h-5 w-5" /> Tablas de presupuesto no instaladas
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-gray-600">
            Ejecute el archivo <code className="bg-gray-100 px-1 rounded">supabase/BUDGET_TABLES.sql</code> en el
            SQL Editor de Supabase y recargue esta página.
          </p>
          <Button variant="outline" onClick={loadBudgets}>Reintentar</Button>
        </CardContent>
      </Card>
    );
  }

  // Vista detalle: control presupuestario (presupuesto vs real)
  if (selected) {
    return (
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={() => { setSelected(null); setComparison(null); setTrend(null); }}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Volver
            </Button>
            <div>
              <h2 className="text-xl font-bold">{selected.name} · {selected.year}</h2>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant={STATUS_VARIANT[selected.status]}>{STATUS_LABEL[selected.status]}</Badge>
                <span className="text-xs text-gray-500">
                  {selected.period_type === 'annual' ? 'Montos anuales (prorrateo mensual)' : 'Montos mensuales'} · {selected.lines.length} líneas
                </span>
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {selected.status === 'draft' && (
              <Button size="sm" onClick={() => changeStatus('active')}>
                <CheckCircle2 className="w-4 h-4 mr-1" /> Activar
              </Button>
            )}
            {selected.status === 'active' && (
              <Button size="sm" variant="outline" onClick={() => changeStatus('closed')}>Cerrar</Button>
            )}
            <Button size="sm" variant="outline" onClick={exportComparisonCSV} disabled={!comparison}>
              <Download className="w-4 h-4 mr-1" /> CSV
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!comparison}
              onClick={() =>
                window.open(
                  `/api/documents/pdf?type=budget&id=${encodeURIComponent(selected.id)}&companyId=${encodeURIComponent(companyId)}&period=${encodeURIComponent(period)}`,
                  '_blank',
                )
              }
            >
              PDF
            </Button>
            <Button size="sm" variant="destructive" onClick={removeBudget}>
              <Trash2 className="w-4 h-4 mr-1" /> Eliminar
            </Button>
          </div>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Alertas de control presupuestario */}
        {comparison && comparison.alerts.length > 0 && (
          <Card className="border-orange-300">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                Alertas de control presupuestario ({comparison.alerts.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {comparison.alerts.map((a, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 text-sm p-2 rounded ${
                    a.level === 'critico' ? 'bg-red-50 text-red-800' : 'bg-yellow-50 text-yellow-800'
                  }`}
                >
                  {a.level === 'critico'
                    ? <OctagonX className="h-4 w-4 mt-0.5 shrink-0" />
                    : <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />}
                  <span>{a.message}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">Presupuesto vs Real</CardTitle>
              <div className="flex items-center gap-2">
                <Label className="text-sm text-gray-600">Período:</Label>
                <Select value={period} onValueChange={(p) => { setPeriod(p); loadComparison(selected.id, p); }}>
                  <SelectTrigger className="w-36">
                    <SelectValue placeholder="Período" />
                  </SelectTrigger>
                  <SelectContent>
                    {monthsOf(selected.year).map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {comparisonLoading && <p className="text-sm text-gray-500">Calculando comparación...</p>}
            {comparison && !comparisonLoading && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {(['gasto', 'ingreso'] as const).map((cat) => {
                    const t = comparison.totals[cat];
                    const pct = t.executionPct ?? 0;
                    return (
                      <div key={cat} className="border rounded p-3">
                        <div className="text-sm font-medium capitalize mb-2">
                          {cat === 'gasto' ? 'Gastos' : 'Ingresos'}
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Presupuestado:</span>
                          <span className="font-medium">{formatCurrency(t.budgeted)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Real:</span>
                          <span className="font-medium">{formatCurrency(t.actual)}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-600">Varianza:</span>
                          <span className={`font-medium ${t.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                            {formatCurrency(t.variance)}
                          </span>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <Progress value={Math.min(pct, 100)} className="flex-1" />
                          <span className="text-xs font-medium w-14 text-right">
                            {t.executionPct === null ? 's/p' : `${t.executionPct}%`}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuenta</TableHead>
                      <TableHead>Categoría</TableHead>
                      <TableHead className="text-right">Presupuestado</TableHead>
                      <TableHead className="text-right">Real</TableHead>
                      <TableHead className="text-right">Varianza</TableHead>
                      <TableHead className="text-right">Ejecución</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {comparison.lines.map((l, i) => (
                      <TableRow key={i}>
                        <TableCell>
                          <div className="font-medium">{l.accountCode}</div>
                          <div className="text-xs text-gray-500">{l.accountName}</div>
                        </TableCell>
                        <TableCell className="capitalize text-sm">{l.category}</TableCell>
                        <TableCell className="text-right">{formatCurrency(l.budgeted)}</TableCell>
                        <TableCell className="text-right">{formatCurrency(l.actual)}</TableCell>
                        <TableCell className={`text-right font-medium ${l.variance < 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {formatCurrency(l.variance)}
                        </TableCell>
                        <TableCell className="text-right text-sm">
                          {l.executionPct === null ? 's/p' : `${l.executionPct}%`}
                        </TableCell>
                        <TableCell>{statusBadge(l.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <p className="text-xs text-gray-500">
                  Reales del mayor contable ({comparison.period}): gastos = débitos − créditos,
                  ingresos = créditos − débitos. Varianza gasto = presupuestado − real;
                  varianza ingreso = real − presupuestado.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Tendencia anual {selected.year}</CardTitle>
          </CardHeader>
          <CardContent>
            {trendLoading && <p className="text-sm text-gray-500">Calculando tendencia...</p>}
            {trend && !trendLoading && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mes</TableHead>
                    <TableHead className="text-right">P. Gastos</TableHead>
                    <TableHead className="text-right">R. Gastos</TableHead>
                    <TableHead className="text-right">Ejec. %</TableHead>
                    <TableHead className="text-right">P. Ingresos</TableHead>
                    <TableHead className="text-right">R. Ingresos</TableHead>
                    <TableHead className="text-right">Ejec. %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trend.months.map((m) => (
                    <TableRow key={m.period} className={m.period === period ? 'bg-cyan-50' : ''}>
                      <TableCell className="font-medium">{m.period}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.gasto.budgeted)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.gasto.actual)}</TableCell>
                      <TableCell className={`text-right text-sm ${m.gasto.executionPct !== null && m.gasto.executionPct >= 100 ? 'text-red-600 font-medium' : ''}`}>
                        {m.gasto.executionPct === null ? 's/p' : `${m.gasto.executionPct}%`}
                      </TableCell>
                      <TableCell className="text-right">{formatCurrency(m.ingreso.budgeted)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(m.ingreso.actual)}</TableCell>
                      <TableCell className="text-right text-sm">
                        {m.ingreso.executionPct === null ? 's/p' : `${m.ingreso.executionPct}%`}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Vista lista + creación
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">Presupuestos</h2>
        <Button onClick={() => setShowCreate((v) => !v)} className="flex items-center gap-2">
          <Plus className="w-4 h-4" /> Nuevo Presupuesto
        </Button>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {showCreate && (
        <Card className="border-2 border-dashed">
          <CardHeader>
            <CardTitle className="text-base">Crear presupuesto anual</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ej: Presupuesto Operativo 2026"
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Año</Label>
                <Input
                  type="number"
                  value={formYear}
                  min={2000}
                  max={2100}
                  onChange={(e) => setFormYear(parseInt(e.target.value) || new Date().getFullYear())}
                  className="mt-1"
                />
              </div>
              <div>
                <Label>Tipo de montos</Label>
                <Select value={formType} onValueChange={(v) => setFormType(v as 'annual' | 'monthly')}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="annual">Anual (prorrateo mensual)</SelectItem>
                    <SelectItem value="monthly">Mensual (mes específico)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <Label className="font-medium">Líneas por cuenta contable</Label>
              <Button variant="outline" size="sm" onClick={addLine}>
                <Plus className="w-3 h-3 mr-1" /> Agregar línea
              </Button>
            </div>

            {formLines.length === 0 && (
              <p className="text-sm text-gray-500">Sin líneas. Agregue al menos una cuenta con su monto.</p>
            )}

            <div className="space-y-2">
              {formLines.map((l, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-end p-2 bg-gray-50 rounded">
                  <div className="col-span-3">
                    <Label className="text-xs">Cuenta</Label>
                    <Input
                      list={`budget-accounts-${companyId}`}
                      value={l.account_code}
                      onChange={(e) => updateLine(i, 'account_code', e.target.value)}
                      placeholder="5101"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-3">
                    <Label className="text-xs">Nombre</Label>
                    <Input
                      value={l.account_name}
                      onChange={(e) => updateLine(i, 'account_name', e.target.value)}
                      placeholder="Sueldos"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Categoría</Label>
                    <Select value={l.category} onValueChange={(v) => updateLine(i, 'category', v)}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gasto">Gasto</SelectItem>
                        <SelectItem value="ingreso">Ingreso</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="col-span-2">
                    <Label className="text-xs">Mes (opcional)</Label>
                    <Input
                      value={l.period || ''}
                      onChange={(e) => updateLine(i, 'period', e.target.value || null)}
                      placeholder={`${formYear}-09`}
                      pattern="\d{4}-(0[1-9]|1[0-2])"
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-1">
                    <Label className="text-xs">Monto</Label>
                    <Input
                      type="number"
                      min={0}
                      value={l.amount}
                      onChange={(e) => updateLine(i, 'amount', parseFloat(e.target.value) || 0)}
                      className="mt-1"
                    />
                  </div>
                  <div className="col-span-1">
                    <Button variant="ghost" size="sm" onClick={() => removeLine(i)} className="text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <datalist id={`budget-accounts-${companyId}`}>
              {accounts.map((a) => (
                <option key={a.code} value={a.code}>{`${a.code} — ${a.name}`}</option>
              ))}
            </datalist>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setShowCreate(false); setFormLines([]); }}>
                Cancelar
              </Button>
              <Button onClick={createBudget} disabled={saving}>
                {saving ? 'Guardando...' : 'Guardar Presupuesto'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {budgets.length === 0 ? (
        <Card>
          <CardContent className="pt-6 text-center text-gray-500">
            No hay presupuestos. Cree el primero con “Nuevo Presupuesto”.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {budgets.map((b) => (
            <Card key={b.id} className="cursor-pointer hover:shadow-md" onClick={() => openDetail(b.id)}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-base">{b.name}</CardTitle>
                <Badge variant={STATUS_VARIANT[b.status]}>{STATUS_LABEL[b.status]}</Badge>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Año</span>
                  <span className="font-medium">{b.year}</span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-gray-600">Tipo</span>
                  <span className="font-medium">{b.period_type === 'annual' ? 'Anual' : 'Mensual'}</span>
                </div>
                <p className="text-xs text-blue-600 mt-2">Ver control presupuestario →</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
