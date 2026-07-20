'use client';

import { useState, useEffect } from 'react';
import { 
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart
} from 'recharts';
import { Card } from '@tremor/react';
import {
  Target,
  TrendingUp,
  AlertTriangle,
  DollarSign,
  BarChart3,
  RefreshCw,
  Info,
  CheckCircle,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { BreakEvenAnalysis, BreakEvenScenario } from '@/lib/services/break-even-service';

interface BreakEvenChartProps {
  showControls?: boolean;
  compact?: boolean;
}

export default function BreakEvenChart({ 
  showControls = true, 
  compact = false 
}: BreakEvenChartProps) {
  const [analysis, setAnalysis] = useState<BreakEvenAnalysis | null>(null);
  const [scenarios, setScenarios] = useState<BreakEvenScenario[]>([]);
  const [recommendations, setRecommendations] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedScenario, setSelectedScenario] = useState<string>('Actual');
  const [targetProfit, setTargetProfit] = useState(50000);

  useEffect(() => {
    fetchBreakEvenData();
  }, [targetProfit]);

const fetchBreakEvenData = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/break-even?targetProfit=${targetProfit}`);
      const result = await response.json();
      
      if (result.success) {
        setAnalysis(result.data.analysis);
        setScenarios(result.data.scenarios);
        setRecommendations(result.data.recommendations);
      } else {
        setAnalysis(null);
        setScenarios([]);
        setRecommendations([]);
      }
    } catch (error) {
      console.error('Error fetching break-even data:', error);
      setAnalysis(null);
      setScenarios([]);
      setRecommendations([]);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${(value * 100).toFixed(1)}%`;
  };

  const generateChartData = () => {
    if (!analysis) return [];

    const data = [];
    const maxUnits = Math.max(
      analysis.breakEvenPoint.units * 2,
      analysis.targetProfit.units * 1.2
    );

    for (let units = 0; units <= maxUnits; units += Math.ceil(maxUnits / 20)) {
      const revenue = units * analysis.averagePricePerUnit;
      const totalCosts = analysis.fixedCosts.total + (units * analysis.variableCostPerUnit);
      const profit = revenue - totalCosts;

      data.push({
        units,
        revenue,
        totalCosts,
        fixedCosts: analysis.fixedCosts.total,
        variableCosts: units * analysis.variableCostPerUnit,
        profit
      });
    }

    return data;
  };

  const generateScenarioComparison = () => {
    if (!analysis || scenarios.length === 0) return [];

    return scenarios.map(scenario => {
      const breakEvenUnits = scenario.fixedCosts.total / 
        (scenario.averagePricePerUnit - (scenario.variableCosts.total / 150));
      
      return {
        name: scenario.name,
        description: scenario.description,
        breakEvenUnits: Math.ceil(breakEvenUnits),
        breakEvenRevenue: breakEvenUnits * scenario.averagePricePerUnit,
        marginOfSafety: scenario.name === 'Actual' ? analysis.marginOfSafety.percentage : 0,
        contributionMargin: ((scenario.averagePricePerUnit - (scenario.variableCosts.total / 150)) / scenario.averagePricePerUnit) * 100
      };
    });
  };

  const chartData = generateChartData();
  const scenarioData = generateScenarioComparison();

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-slate-200 rounded-lg shadow-lg">
          <p className="text-sm font-semibold text-slate-900">{label} unidades</p>
          <div className="space-y-1 mt-2">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex justify-between">
                <span className="text-xs text-slate-600">{entry.name}:</span>
                <span className="text-xs font-medium" style={{ color: entry.color }}>
                  {formatCurrency(entry.value)}
                </span>
              </div>
            ))}
          </div>
        </div>
      );
    }
    return null;
  };

  if (compact) {
    return (
      <Card className="bg-white border border-slate-200">
        <div className="p-4 pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Target className="w-4 h-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Punto de Equilibrio
              </h3>
            </div>
            <button
              onClick={fetchBreakEvenData}
              disabled={loading}
              className="p-1 hover:bg-slate-100 rounded"
            >
              <RefreshCw className={`w-3 h-3 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        <div className="px-4">
          {analysis ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-indigo-50 rounded">
                  <p className="text-xs text-slate-600">Unidades Equilibrio</p>
                  <p className="text-sm font-bold text-indigo-600">
                    {analysis.breakEvenPoint.units.toLocaleString()}
                  </p>
                </div>
                <div className="text-center p-2 bg-emerald-50 rounded">
                  <p className="text-xs text-slate-600">Ingresos Equilibrio</p>
                  <p className="text-sm font-bold text-emerald-600">
                    {formatCurrency(analysis.breakEvenPoint.revenue)}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div className="text-center p-2 bg-amber-50 rounded">
                  <p className="text-xs text-slate-600">Margen Contribución</p>
                  <p className="text-sm font-bold text-amber-600">
                    {formatPercentage(analysis.contributionMarginRatio)}
                  </p>
                </div>
                <div className="text-center p-2 bg-rose-50 rounded">
                  <p className="text-xs text-slate-600">Margen Seguridad</p>
                  <p className="text-sm font-bold text-rose-600">
                    {formatPercentage(analysis.marginOfSafety.percentage / 100)}
                  </p>
                </div>
              </div>

              {recommendations.length > 0 && (
                <div className="p-2 bg-blue-50 rounded">
                  <p className="text-xs font-medium text-blue-900 mb-1">Recomendación:</p>
                  <p className="text-xs text-blue-700">{recommendations[0]}</p>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center h-32">
              <div className="text-center">
                <RefreshCw className="w-6 h-6 text-slate-400 animate-spin mx-auto mb-2" />
                <p className="text-sm text-slate-500">Cargando análisis...</p>
              </div>
            </div>
          )}
        </div>
      </Card>
    );
  }

  return (
    <Card className="bg-white border border-slate-200">
      <div className="p-4 pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Target className="w-5 h-5 text-indigo-600" />
            <h3 className="text-lg font-bold text-slate-900">
              Análisis de Punto de Equilibrio
            </h3>
          </div>
          <div className="flex items-center space-x-2">
            {showControls && (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  value={targetProfit}
                  onChange={(e) => setTargetProfit(Number(e.target.value))}
                  className="w-24 px-2 py-1 text-xs border border-slate-300 rounded"
                  placeholder="Objetivo"
                />
                <span className="text-xs text-slate-600">Objetivo</span>
              </div>
            )}
            
            <button
              onClick={fetchBreakEvenData}
              disabled={loading}
              className="p-2 hover:bg-slate-100 rounded"
            >
              <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>
      
      <div className="px-4">
        {analysis ? (
          <div className="space-y-6">
            {/* Key Metrics */}
            <div className="grid grid-cols-6 gap-4">
              <div className="text-center">
                <p className="text-xs text-slate-500">Costos Fijos</p>
                <p className="text-sm font-bold text-slate-700">
                  {formatCurrency(analysis.fixedCosts.total)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Costo Variable/U</p>
                <p className="text-sm font-bold text-slate-700">
                  {formatCurrency(analysis.variableCostPerUnit)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Precio Unitario</p>
                <p className="text-sm font-bold text-slate-700">
                  {formatCurrency(analysis.averagePricePerUnit)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Margen Contribución</p>
                <p className="text-sm font-bold text-indigo-600">
                  {formatCurrency(analysis.contributionMargin)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Ratio Contribución</p>
                <p className="text-sm font-bold text-indigo-600">
                  {formatPercentage(analysis.contributionMarginRatio)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xs text-slate-500">Margen Seguridad</p>
                <p className={`text-sm font-bold ${
                  analysis.marginOfSafety.percentage >= 20 ? 'text-emerald-600' : 'text-amber-600'
                }`}>
                  {formatPercentage(analysis.marginOfSafety.percentage / 100)}
                </p>
              </div>
            </div>

            {/* Break-Even Points */}
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Target className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-semibold text-indigo-900">Punto de Equilibrio</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Unidades:</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {analysis.breakEvenPoint.units.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Ingresos:</span>
                    <span className="text-sm font-bold text-indigo-600">
                      {formatCurrency(analysis.breakEvenPoint.revenue)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-semibold text-emerald-900">Objetivo Utilidad</h3>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Unidades:</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {analysis.targetProfit.units.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-xs text-slate-600">Ingresos:</span>
                    <span className="text-sm font-bold text-emerald-600">
                      {formatCurrency(analysis.targetProfit.revenue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Break-Even Chart */}
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="units" 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(value) => value.toLocaleString()}
                  />
                  <YAxis 
                    tick={{ fontSize: 10, fill: '#64748b' }}
                    tickFormatter={(value) => `L. ${(value / 1000).toFixed(0)}k`}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Legend />
                  
                  <ReferenceLine 
                    x={analysis.breakEvenPoint.units} 
                    stroke="#6366f1" 
                    strokeDasharray="5 5"
                    label={{ value: "Punto Equilibrio", position: "top" }}
                  />
                  
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#10b981"
                    strokeWidth={2}
                    name="Ingresos"
                  />
                  <Line
                    type="monotone"
                    dataKey="totalCosts"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Costos Totales"
                  />
                  <Line
                    type="monotone"
                    dataKey="fixedCosts"
                    stroke="#f59e0b"
                    strokeWidth={1}
                    strokeDasharray="5 5"
                    name="Costos Fijos"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Scenario Comparison */}
            {scenarioData.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Comparación de Escenarios</h3>
                <div className="grid grid-cols-4 gap-3">
                  {scenarioData.map((scenario, index) => (
                    <div 
                      key={index}
                      className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                        selectedScenario === scenario.name
                          ? 'bg-indigo-50 border-indigo-200'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedScenario(scenario.name)}
                    >
                      <p className="text-xs font-semibold text-slate-900 mb-1">{scenario.name}</p>
                      <p className="text-xs text-slate-600 mb-2">{scenario.description}</p>
                      <div className="space-y-1">
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-500">Equilibrio:</span>
                          <span className="text-xs font-medium">
                            {scenario.breakEvenUnits.toLocaleString()}U
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-xs text-slate-500">Margen:</span>
                          <span className="text-xs font-medium">
                            {scenario.contributionMargin.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {recommendations.length > 0 && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center space-x-2 mb-2">
                  <Info className="w-4 h-4 text-blue-600" />
                  <h3 className="text-sm font-semibold text-blue-900">Recomendaciones</h3>
                </div>
                <div className="space-y-1">
                  {recommendations.map((rec, index) => (
                    <p key={index} className="text-xs text-blue-700">{rec}</p>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="w-8 h-8 text-slate-400 animate-spin mx-auto mb-3" />
              <p className="text-sm text-slate-500">Calculando análisis de punto de equilibrio...</p>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
