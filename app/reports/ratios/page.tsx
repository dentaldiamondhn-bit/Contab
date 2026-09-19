"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { RefreshCcw, FileText, Printer, Download, AlertCircle, Loader2, TrendingUp, Layer, Shield, DollarSign, PieChart } from "lucide-react";

interface FinancialRatio {
  id: string;
  name: string;
  category: 'liquidity' | 'profitability' | 'solvency' | 'efficiency' | 'health';
  value: number | null;
  unit: string;
  interpretation: string;
  formula: string;
}

const CATEGORY_COLORS = {
  liquidity: 'cyan',
  profitability: 'green',
  solvency: 'purple',
  efficiency: 'orange',
  health: 'blue',
};

const CATEGORY_LABELS = {
  liquidity: 'Liquidez',
  profitability: 'Rentabilidad',
  solvency: 'Solvencia',
  efficiency: 'Eficiencia',
  health: 'Salud Financiera',
};

const RATIOS: FinancialRatio[] = [
  {
    id: 'current_ratio',
    name: 'Ratio de Liquidez Corriente',
    category: 'liquidity',
    value: 0,
    unit: 'x',
    interpretation: '',
    formula: 'Current Assets ÷ Current Liabilities',
  },
  {
    id: 'quick_ratio',
    name: 'Ratio de Liquidez Rápida (Acid-Test)',
    category: 'liquidity',
    value: 0,
    unit: 'x',
    interpretation: '',
    formula: '(Current Assets - Inventory) ÷ Current Liabilities',
  },
  {
    id: 'debt_to_equity',
    name: 'Deuda sobre Capital Propio',
    category: 'solvency',
    value: 0,
    unit: 'x',
    interpretation: '',
    formula: 'Total Liabilities ÷ Total Equity',
  },
  {
    id: 'debt_to_assets',
    name: 'Deuda sobre Activos Totales',
    category: 'solvency',
    value: 0,
    unit: '%',
    interpretation: '',
    formula: 'Total Liabilities ÷ Total Assets',
  },
  {
    id: 'equity_ratio',
    name: 'Ratio de Capital Propio',
    category: 'solvency',
    value: 0,
    unit: '%',
    interpretation: '',
    formula: 'Total Equity ÷ Total Assets',
  },
  {
    id: 'gross_profit_margin',
    name: 'Margen Bruto de Ganancia',
    category: 'profitability',
    value: 0,
    unit: '%',
    interpretation: '',
    formula: '(Revenue - COGS) ÷ Revenue',
  },
  {
    id: 'net_profit_margin',
    name: 'Margen Neto de Ganancia',
    category: 'profitability',
    value: 0,
    unit: '%',
    interpretation: '',
    formula: 'Net Income ÷ Revenue',
  },
  {
    id: 'return_on_assets',
    name: 'Retorno sobre Activos (ROA)',
    category: 'profitability',
    value: 0,
    unit: '%',
    interpretation: '',
    formula: 'Net Income ÷ Total Assets',
  },
  {
    id: 'return_on_equity',
    name: 'Retorno sobre Capital Propio (ROE)',
    category: 'profitability',
    value: 0,
    unit: '%',
    interpretation: '',
    formula: 'Net Income ÷ Total Equity',
  },
  {
    id: 'current_asset_turnover',
    name: 'Rotación de Activos Corrientes',
    category: 'efficiency',
    value: 0,
    unit: 'x',
    interpretation: '',
    formula: 'Revenue ÷ Total Assets',
  },
  {
    id: 'working_capital',
    name: 'Capital de Trabajo',
    category: 'health',
    value: 0,
    unit: 'Lempiras (HNL)',
    interpretation: '',
    formula: 'Current Assets − Current Liabilities',
  },
  {
    id: 'operating_cash_flow',
    name: 'Utilidad Operativa (Aproximación)',
    category: 'health',
    value: 0,
    unit: 'Lempiras (HNL)',
    interpretation: '',
    formula: 'Net Income',
  },
];

const CATEGORY_FILTERS = {
  liquidity: 'Liquidity',
  profitability: 'Profitability',
  solvency: 'Solvency',
  efficiency: 'Efficiency',
  health: 'Health',
};

function getCategoryColor(category: keyof typeof CATEGORY_COLORS) {
  return CATEGORY_COLORS[category];
}

function getCategoryLabel(category: keyof typeof CATEGORY_LABELS) {
  return CATEGORY_LABELS[category];
}

export default function RatiosDashboardPage() {
  const { currentTenant } = useTenant();
  const [period, setPeriod] = useState<string>(new Date().toISOString().slice(0, 7));
  const [selectedCategory, setSelectedCategory] = useState<'all' | keyof typeof CATEGORY_FILTERS>('all');
  const [ratios, setRatios] = useState<FinancialRatio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRatios = useCallback(async () => {
    if (!currentTenant?.id) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/accounting/ratios?tenantId=${encodeURIComponent(currentTenant.id)}&period=${encodeURIComponent(period)}`,
        { headers: { "x-tenant-id": currentTenant.id } }
      );
      const body = await res.json();
      if (!res.ok || !body.success) throw new Error(body?.error || "Error al cargar razones");
      setRatios(body.data.ratios);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar razones");
      setRatios([]);
    }
    setLoading(false);
  }, [currentTenant?.id, period]);

  useEffect(() => {
    loadRatios();
  }, [loadRatios]);

  const filteredRatios = useMemo(() => {
    if (selectedCategory === 'all') return ratios;
    return ratios.filter(r => r.category === selectedCategory);
  }, [ratios, selectedCategory]);

  const fmt = (n: number) => n.toLocaleString("es-HN", { style: "currency", currency: "HNL" });

  const ratioCard = (r: FinancialRatio) => (
    <Card key={r.id} className="flex items-center gap-4">
      <CardHeader className="p-2">
        <div className={`w-10 h-10 rounded-md flex items-center justify-center text-sm font-medium ${getCategoryColor(r.category)}-500 bg-${getCategoryColor(r.category)}-100`}>
          <Layer className={getCategoryColor(r.category) + "-opacity-50"} />
        </div>
        <CardTitle className="text-sm text-gray-500">{r.name}</CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="flex justify-between items-baseline">
          <span className="text-xs text-gray-500">{r.formula}</span>
          <span className="text-xl font-bold">{r.value !== null ? fmt(r.value) + r.unit : "N/A"}</span>
        </div>
        <p className="text-xs text-gray-500 mt-1">{r.interpretation || "—"}</p>
      </CardContent>
    </Card>
  );

  const trendBadge = (value: number | null, category: FinancialRatio['category']) => {
    if (value === null) return <Badge variant="outline">Sin datos</Badge>;
    
    const isPositive = category === 'profitability' || category === 'efficiency' || category === 'health';
    const isNegative = category === 'solvency';
    
    if ((isPositive && value >= 0) || (isNegative && value <= 0)) {
      return <Badge variant="default">Sólido</Badge>;
    }
    return <Badge variant="destructive">Requiere atención</Badge>;
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-48">
          <Label>Período</Label>
          <Input type="month" value={period} onChange={(e) => setPeriod(e.target.value)} className="mt-1" />
        </div>
        <div className="flex gap-2">
          {Object.entries(CATEGORY_FILTERS).map(([key, label]) => (
            <Button
              key={key}
              variant={selectedCategory === key ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedCategory(key as keyof typeof CATEGORY_FILTERS)}
            >
              {label}
            </Button>
          ))}
          <Button variant="outline" size="sm" onClick={() => setSelectedCategory('all')}>
            Todas
          </Button>
        </div>
      </div>

      {loading && <p className="text-sm text-gray-500">Cargando razones financieras...</p>}

      {error && <p className="text-sm text-red-600">Error: {error}</p>}

      {filteredRatios.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredRatios.map((r) => ratioCard(r))}
        </div>
      ) : (
        <div className="text-center py-12">
          {loading ? (
            <Loader2 className="w-12 h-12 mx-auto mb-4 text-gray-300" /> 
          ) : (
            <p className="text-gray-500">No hay razones disponibles para el período seleccionado.</p>
          )}
        </div>
      )}
    </div>
  );
}