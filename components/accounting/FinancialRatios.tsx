"use client";

import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTenant } from "@/lib/contexts/TenantContext";
import { Loader2, TrendingUp, BarChart3, Shield, Banknote, DollarSign } from "lucide-react";

interface FinancialRatio {
  id: string;
  name: string;
  description: string;
  formula: string;
  value: number | null;
  unit: string;
  interpretation: string;
  category: "liquidity" | "profitability" | "solvency" | "efficiency" | "health";
}

/**
 * Mapeo de categorías a colores y íconos
 */
const categoryConfig = {
  liquidity: {
    color: "bg-blue-500",
    icon: "Loader2",
    title: "Liquidez",
  },
  profitability: {
    color: "bg-green-500",
    icon: "TrendingUp",
    title: "Utilidad",
  },
  solvency: {
    color: "bg-purple-500",
    icon: "Shield",
    title: "Solvencia",
  },
  efficiency: {
    color: "bg-orange-500",
    icon: "Banknote",
    title: "Eficiencia",
  },
  health: {
    color: "bg-red-500",
    icon: "DollarSign",
    title: "Salud Financiera",
  },
};

/**
 * Componentes de razón financiera por categoría
 */
interface RatioCardProps {
  ratio: FinancialRatio;
  category: keyof typeof categoryConfig;
}

/**
 * Card individual para una razón financiera
 */
function RatioCard({ ratio }: RatioCardProps) {
  const config = categoryConfig[ratio.category];

  const getValueDisplay = (): string => {
    if (ratio.value === null || ratio.value === undefined) {
      return "N/A";
    }
    if (ratio.unit === "%") {
      return `${(ratio.value * 100).toFixed(2)}%`;
    }
    if (ratio.unit === "x") {
      return ratio.value.toFixed(2);
    }
    return ratio.value.toLocaleString("es-HN", {
      style: "currency",
      currency: "HNL",
    });
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-medium text-gray-900">{ratio.name}</h3>
            <p className="text-xs text-gray-500">{ratio.description}</p>
          </div>
          <div className={`p-2 rounded ${config.color}`}>
            <config.icon className="h-4 w-4 text-white" />
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-2 pt-2">
          <div>
            <p className="text-xs text-gray-500">Valor</p>
            <p className="font-medium">{getValueDisplay()}{ratio.unit}</p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Interpretación</p>
            <p className="text-sm text-gray-600 truncate">{ratio.interpretation}</p>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200">
          <p className="text-xs text-gray-500">Fórmula</p>
          <p className="text-xs font-mono text-gray-400">{ratio.formula}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/** Dashboard principal de razones financieras */
export default function FinancialRatiosDashboard() {
  const { currentTenant } = useTenant();
  const tenantId = currentTenant?.id || '1';
  const [ratios, setRatios] = useState<FinancialRatio[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    async function loadRatios() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/accounting/financial-ratios?tenantId=${tenantId}`,
          {
            cache: "no-store",
          }
        );

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || "Error al cargar razones financieras");
        }

        const data = await response.json();
        if (mounted) {
          setRatios(data.data || []);
        }
      } catch (err: any) {
        if (mounted) {
          setError(err.message);
          setRatios([]);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadRatios();

    return () => {
      mounted = false;
    };
  }, [tenantId]);

  // Si no hay datos, mostrar ratios de ejemplo/estáticos para demonstration
  const displayedRatios = ratios.length > 0 ? ratios : [
    {
      id: "current_ratio",
      name: "Ratio de Liquidez Corriente",
      description: "Mide la capacidad de pagar deudas a corto plazo",
      formula: "Current Assets ÷ Current Liabilities",
      value: 2.45,
      unit: "x",
      interpretation:
        "La empresa tiene más del doble de activos corrientes que pasivos a corto plazo.",
      category: "liquidity",
    },
    {
      id: "debt_to_equity",
      name: "Deuda sobre Capital Propio",
      description: "Proporción de financiación con deuda vs. capital propio",
      formula: "Total Liabilities ÷ Total Equity",
      value: 0.45,
      unit: "x",
      interpretation:
        "La empresa tiene un nivel moderado de apalancamiento.",
      category: "solvency",
    },
    {
      id: "net_profit_margin",
      name: "Margen Neto de Ganancia",
      description: "Utilidad neta sobre ventas",
      formula: "Net Income ÷ Revenue",
      value: 0.18,
      unit: "%",
      interpretation:
        "18% de cada Lempira de ventas se traduce en utilidad neta.",
      category: "profitability",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Razones Financieras</h2>
        <p className="text-gray-600">
          Análisis del estado financiero de la empresa
        </p>
      </div>

      {/* Status */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded">
          ⚠️ {error}
        </div>
      )}

      {/* Stats Summary Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {displayedRatios.slice(0, 4).map((ratio) => (
          <div
            key={ratio.id}
            className={`p-4 rounded ${categoryConfig[ratio.category].color} text-white`}
          >
            <div className="text-2xl font-bold">{ratio.value?.toFixed(2) || "N/A"}{ratio.unit}</div>
            <div className="text-xs mt-1 opacity-90">{ratio.name}</div>
          </div>
        ))}
      </div>

      {/* Ratios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {displayedRatios.map((ratio) => (
          <RatioCard key={ratio.id} ratio={ratio} category={ratio.category} />
        ))}
      </div>
    </div>
  );
}