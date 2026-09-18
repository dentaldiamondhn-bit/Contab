'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Lock, Unlock, CheckCircle2, AlertTriangle, Loader2, Crown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface Props { companyId?: string }

export default function ClosingWizard({ companyId: propCompanyId }: Props) {
  const params = useParams();
  const companyId = propCompanyId || (params?.id as string) || '';
  const [year, setYear] = useState(new Date().getFullYear());
  const [periods, setPeriods] = useState<any[]>([]);
  const [annual, setAnnual] = useState<{ status: string; closed_at?: string; closed_by?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'mensual' | 'anual'>('mensual');
  const [notes, setNotes] = useState('');

  const load = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/accounting/period-closing?year=${year}&tenantId=${encodeURIComponent(companyId)}`, {
        headers: { 'x-tenant-id': companyId },
      });
      const j = await res.json();
      if (!res.ok) throw new Error(j.error || 'Error al cargar cierres');
      setPeriods(j.periods || []);
      const annualRow = (j.periods || []).find((p: any) => p.month === 0);
      if (annualRow) setAnnual(annualRow);
      else {
        // Check annual via dedicated query (month=0 may not be in 1-12 grid)
        const ar = await fetch(`/api/accounting/period-closing?year=${year}&month=0&tenantId=${encodeURIComponent(companyId)}`, {
          headers: { 'x-tenant-id': companyId },
        });
        const aj = await ar.json().catch(() => ({}));
        if (aj.details?.period) setAnnual(aj.details.period);
        else if (aj.periods) setAnnual(aj.periods.find((p: any) => p.month === 0) || null);
        else setAnnual(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setLoading(false);
  }, [companyId, year]);

  useEffect(() => { load(); }, [load]);

  const monthly = periods.filter((p) => p.month >= 1 && p.month <= 12).sort((a, b) => a.month - b.month);
  const closedCount = monthly.filter((p) => p.status === 'closed' || p.status === 'locked').length;
  const allMonthsClosed = monthly.length === 12 && closedCount === 12;
  const annualClosed = annual?.status === 'closed' || annual?.status === 'locked';
  const annualLocked = annual?.status === 'locked';

  const handleLock = async (y: number, m: number) => {
    const label = m === 0 ? `ejercicio ${y}` : `${String(m).padStart(2, '0')}/${y}`;
    if (!confirm(`Bloquear permanentemente ${label}? No se podrá reabrir.`)) return;
    try {
      const res = await fetch('/api/accounting/period-closing', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify({ year: y, month: m }),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || 'No se pudo bloquear');
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleMonthlyClose = async (month: number) => {
    try {
      const res = await fetch('/api/accounting/period-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify({ year, month, notes }),
      });
      const j = await res.json();
      if (!res.ok || j.error) throw new Error(j.error || 'No se pudo cerrar');
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  const handleAnnualClose = async () => {
    if (!allMonthsClosed) {
      alert('Cierre primero los 12 meses del año. Faltan ' + (12 - closedCount) + ' meses.');
      return;
    }
    try {
      // Reutiliza el candado unificado (period_locks month=0) vía period-closing con month 0
      const res = await fetch('/api/accounting/period-closing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-tenant-id': companyId },
        body: JSON.stringify({ year, month: 0, notes: notes || `Cierre anual ${year}` }),
      });
      const j = await res.json();
      if (!res.ok || j.error) {
        // Fallback al endpoint anual legacy (ahora también escribe month=0)
        const r2 = await fetch('/api/closing/perform', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ year, equityAccountId: 'annual', closedBy: 'system' }),
        });
        const j2 = await r2.json();
        if (!r2.ok) throw new Error(j.error || j2.error || 'No se pudo cerrar anual');
      }
      load();
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    }
  };

  if (loading) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2"><Calendar className="h-6 w-6" /> Wizard de Cierre Único</h2>
          <p className="text-sm text-muted-foreground">Mensual + Anual — mismo candado <code>period_locks</code> (mensual <code>1-12</code>, anual <code>0</code>). Sin endpoints duplicados.</p>
        </div>
        <div className="flex items-center gap-2">
          <Label>Año</Label>
          <Input type="number" value={year} onChange={(e) => setYear(parseInt(e.target.value) || year)} className="w-24" />
        </div>
      </div>

      {error && <Alert variant="destructive"><AlertDescription>{error}</AlertDescription></Alert>}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="mensual">Mensual — 12 meses</TabsTrigger>
          <TabsTrigger value="anual">Anual — {year} {annualClosed ? '✓ Cerrado' : ''}</TabsTrigger>
        </TabsList>

        <TabsContent value="mensual" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Meses de {year} — {closedCount}/12 cerrados</CardTitle>
              <CardDescription>El candado <code>period-lock-middleware.ts</code> + <code>period-lock.ts:assertPeriodOpenUnified</code> bloquea asientos en meses cerrados/bloqueados y en años cerrados.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {monthly.map((p) => (
                  <Card key={p.month} className={p.status === 'closed' ? 'border-green-300 bg-green-50' : p.status === 'locked' ? 'border-red-300 bg-red-50' : ''}>
                    <CardContent className="pt-4 text-center space-y-2">
                      <div className="font-bold">{p.month.toString().padStart(2, '0')} — {['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'][p.month - 1]}</div>
                      <Badge variant={p.status === 'closed' ? 'default' : p.status === 'locked' ? 'destructive' : 'secondary'}>{p.status}</Badge>
                      <div className="text-xs text-muted-foreground">{p.transaction_count ?? 0} asientos</div>
                      {p.status === 'open' ? (
                        <Button size="sm" disabled={!p.can_close} onClick={() => handleMonthlyClose(p.month)} title={!p.can_close && !p.prev_month_closed ? 'Cierre primero el mes anterior' : ''}>
                          <Lock className="h-3 w-3 mr-1" /> Cerrar
                        </Button>
                      ) : p.status === 'closed' ? (
                        <div className="space-y-1">
                          <div className="text-xs">{p.closed_by || ''}</div>
                          <Button size="sm" variant="destructive" onClick={() => handleLock(year, p.month)}>
                            <Lock className="h-3 w-3 mr-1" /> Bloquear
                          </Button>
                        </div>
                      ) : (
                        <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" /> Bloqueado</Badge>
                      )}
                      {!p.can_close && p.status === 'open' && !p.prev_month_closed && (
                        <div className="text-[11px] text-amber-600 flex items-center justify-center gap-1"><AlertTriangle className="h-3 w-3" /> Mes anterior abierto</div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
          <Textarea placeholder="Notas del cierre (opcional)" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </TabsContent>

        <TabsContent value="anual" className="space-y-4">
          <Card className={annualClosed ? 'border-green-300' : ''}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2"><Crown className="h-5 w-5" /> Cierre Anual {year}</CardTitle>
              <CardDescription>Requiere los 12 meses cerrados. Reutiliza el mismo candado: <code>period_locks(year, month=0)</code> bloquea todo el ejercicio.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                {annualClosed ? <Badge className="bg-green-600"><CheckCircle2 className="h-3 w-3 mr-1" /> Cerrado</Badge> : <Badge variant="secondary"><AlertTriangle className="h-3 w-3 mr-1" /> Abierto</Badge>}
                <span className="text-sm">{closedCount}/12 meses cerrados</span>
              </div>
              {!annualClosed && !allMonthsClosed && (
                <Alert><AlertDescription>Faltan {12 - closedCount} meses por cerrar antes del cierre anual.</AlertDescription></Alert>
              )}
              {annualLocked ? (
                <Badge variant="destructive"><Lock className="h-3 w-3 mr-1" /> Bloqueado permanentemente</Badge>
              ) : annualClosed ? (
                <div className="space-y-2">
                  <div className="text-sm text-muted-foreground">Cerrado {annual?.closed_at ? new Date(annual.closed_at).toLocaleString('es-HN') : ''} por {annual?.closed_by || ''}</div>
                  <Button size="sm" variant="destructive" onClick={() => handleLock(year, 0)}><Lock className="h-3 w-3 mr-1" /> Bloquear Ejercicio</Button>
                </div>
              ) : (
                <Button onClick={handleAnnualClose} disabled={!allMonthsClosed}><Lock className="h-4 w-4 mr-2" /> Cerrar Ejercicio {year}</Button>
              )}
              <Textarea placeholder="Notas del cierre anual" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
