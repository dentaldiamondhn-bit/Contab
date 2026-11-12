"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { ArrowLeftRight, Download, FileText, Printer, Search } from "lucide-react";

interface VariationRow {
  accountId: string;
  code: string;
  name: string;
  type: string;
  fromBalance: number;
  toBalance: number;
  varAbs: number;
  varPct: number | null;
  trend: "up" | "down" | "same" | "new" | "gone";
}

interface Report {
  from: string;
  to: string;
  rows: VariationRow[];
  totals: { fromBalance: number; toBalance: number; varAbs: number; varPct: number | null };
  counts: { accounts: number; up: number; down: number; same: number; new: number; gone: number };
}

const TREND_LABEL: Record<string, string> = {
  up: "Sube",
  down: "Baja",
  same: "Igual",
  new: "Nueva",
  gone: "Sale",
};

function prevMonth(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function thisMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export default function PeriodVariationsPage() {
  const { currentTenant } = useTenant();
  const [from, setFrom] = useState(() => prevMonth());
  const [to, setTo] = useState(() => thisMonth());
  const [minAbs, setMinAbs] = useState(0);
  const [onlyChanged, setOnlyChanged] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!currentTenant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/accounting/period-variations?tenantId=${encodeURIComponent(currentTenant.id)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`,
        { headers: { "x-tenant-id": currentTenant.id } }
      );
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || "Error al cargar");
      setReport(body.data.report);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
      setReport(null);
    }
    setLoading(false);
  }, [currentTenant?.id, from, to]);

  useEffect(() => {
    load();
  }, [load]);

  const fmt = (n: number) => n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });

  const rows = useMemo(() => (report?.rows || []).filter(
    (r) => Math.abs(r.varAbs) >= minAbs && (!onlyChanged || r.trend !== "same")
  ), [report, minAbs, onlyChanged]);

  const exportCSV = () => {
    if (!report) return;
    const lines = [
      ["Cuenta", "Nombre", `Saldo ${report.from}`, `Saldo ${report.to}`, "Variacion", "Variacion_%", "Tendencia"],
      ...rows.map((r) => [
        r.code,
        `"${r.name}"`,
        r.fromBalance.toFixed(2),
        r.toBalance.toFixed(2),
        r.varAbs.toFixed(2),
        r.varPct === null ? "s/p" : r.varPct.toFixed(1),
        TREND_LABEL[r.trend],
      ]),
    ];
    const blob = new Blob([lines.map((l) => l.join(",")).join("\n")], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `variaciones_${report.from}_vs_${report.to}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const trendBadge = (t: VariationRow["trend"]) => {
    if (t === "up") return <Badge variant="default">Sube</Badge>;
    if (t === "down") return <Badge variant="destructive">Baja</Badge>;
    if (t === "new") return <Badge variant="secondary">Nueva</Badge>;
    if (t === "gone") return <Badge variant="outline">Sale</Badge>;
    return <Badge variant="outline">Igual</Badge>;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ArrowLeftRight className="w-6 h-6 text-cyan-600" />
            Variaciones entre PerÃ­odos
          </h1>
          <p className="text-sm text-gray-500">{currentTenant?.businessName || "Empresa"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={exportCSV} disabled={!report}>
            <Download className="w-4 h-4 mr-2" /> CSV
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={!report || !currentTenant?.id}
            onClick={() => window.open(`/api/documents/pdf?type=variations&id=${encodeURIComponent(currentTenant!.id)}&companyId=${encodeURIComponent(currentTenant!.id)}&period=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, "_blank")}
          >
            <FileText className="w-4 h-4 mr-2" /> PDF
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-2" /> Imprimir
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <Label>PerÃ­odo base</Label>
              <Input type="month" value={from} onChange={(e) => setFrom(e.target.value)} className="mt-1 w-44" />
            </div>
            <div>
              <Label>PerÃ­odo a comparar</Label>
              <Input type="month" value={to} onChange={(e) => setTo(e.target.value)} className="mt-1 w-44" />
            </div>
            <div>
              <Label>Monto mÃ­nimo</Label>
              <Input type="number" min={0} value={minAbs} onChange={(e) => setMinAbs(parseFloat(e.target.value) || 0)} className="mt-1 w-32" />
            </div>
            <label className="flex items-center gap-2 text-sm text-gray-600 pb-2">
              <input type="checkbox" checked={onlyChanged} onChange={(e) => setOnlyChanged(e.target.checked)} />
              Solo con cambios
            </label>
            <Button onClick={load} disabled={loading} className="flex items-center gap-2">
              <Search className="w-4 h-4" /> {loading ? "Cargando..." : "Comparar"}
            </Button>
          </div>
          {error && <p className="text-sm text-red-600 mt-3">{error}</p>}
        </CardContent>
      </Card>

      {report && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Cuentas</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{report.counts.accounts}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Var. total</CardTitle></CardHeader>
              <CardContent>
                <div className={`text-2xl font-bold ${report.totals.varAbs < 0 ? "text-red-600" : "text-green-600"}`}>{fmt(report.totals.varAbs)}</div>
                <p className="text-xs text-gray-500">{report.totals.varPct === null ? "s/p" : `${report.totals.varPct}%`}</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Suben</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-green-600">{report.counts.up}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Bajan</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold text-red-600">{report.counts.down}</div></CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm text-gray-500">Nuevas / Salen</CardTitle></CardHeader>
              <CardContent><div className="text-2xl font-bold">{report.counts.new} / {report.counts.gone}</div></CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{report.from} vs {report.to} ({rows.length} cuentas)</CardTitle>
            </CardHeader>
            <CardContent>
              {rows.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">Sin variaciones con los filtros actuales.</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Cuenta</TableHead>
                      <TableHead className="text-right">Saldo {report.from}</TableHead>
                      <TableHead className="text-right">Saldo {report.to}</TableHead>
                      <TableHead className="text-right">VariaciÃ³n</TableHead>
                      <TableHead className="text-right">Var. %</TableHead>
                      <TableHead>Tendencia</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((r) => (
                      <TableRow key={r.accountId}>
                        <TableCell>
                          <div className="font-mono text-sm">{r.code}</div>
                          <div className="text-xs text-gray-500">{r.name}</div>
                        </TableCell>
                        <TableCell className="text-right">{fmt(r.fromBalance)}</TableCell>
                        <TableCell className="text-right">{fmt(r.toBalance)}</TableCell>
                        <TableCell className={`text-right font-medium ${r.varAbs < 0 ? "text-red-600" : r.varAbs > 0 ? "text-green-600" : ""}`}>{fmt(r.varAbs)}</TableCell>
                        <TableCell className="text-right text-sm">{r.varPct === null ? "s/p" : `${r.varPct}%`}</TableCell>
                        <TableCell>{trendBadge(r.trend)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
