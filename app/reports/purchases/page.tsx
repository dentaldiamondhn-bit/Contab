"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeftRight, BarChart3, BookOpen, Calculator, Calendar, ChevronDown, ChevronRight, CreditCard, DollarSign, Download, FileText, Filter, PieChart, Receipt, TrendingUp, TrendingDown, Users, Building2, AlertTriangle, CheckCircle, Clock, Search } from "lucide-react";

interface ReportItem {
  title: string;
  description: string;
  href: string;
  icon: React.ReactNode;
  color: string;
  badge?: string;
  badgeColor?: string;
  available: boolean;
}

interface ReportCategory {
  title: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  reports: ReportItem[];
}

interface PurchaseReport {
  id: string;
  purchase_id: string;
  supplier_id: string;
  supplier_name: string;
  invoice_date?: string;
  order_date?: string;
  status: 'PENDING' | 'PARTIAL' | 'PAID' | 'CANCELLED';
  total: number;
  amount_paid?: number;
  balance_due?: number;
  notes?: string;
  items_count?: number;
}

export default function PurchasesReportsPage() {
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("compras");
  const [reportType, setReportType] = useState<'summary' | 'monthly' | 'category' | 'supplier'>('summary');
  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const categories: ReportCategory[] = [
    {
      title: "Compras",
      description: "Reportes avanzados de órdenes de compra y proveedores",
      icon: <Building2 className="w-5 h-5" />,
      color: "text-cyan-600 bg-cyan-50",
      reports: [
        {
          title: "Resumen de Compras",
          description: "Resumen general de todas las compras: totales, estados y cantidades",
          href: "/reports/purchases?type=summary",
          icon: <BarChart3 className="w-5 h-5" />,
          color: "bg-cyan-500",
          available: true,
          badge: "Nuevo",
          badgeColor: "bg-cyan-600",
        },
        {
          title: "Evolución Mensual",
          description: "Compras por mes con tendencia de crecimiento o declive",
          href: "/reports/purchases?type=monthly",
          icon: <TrendingUp className="w-5 h-5" />,
          color: "bg-emerald-500",
          available: true,
        },
        {
          title: "Por Categoría",
          description: "Distribución de compras por categoría de gasto",
          href: "/reports/purchases?type=category",
          icon: <TrendingUp className="w-5 h-5" />,
          color: "bg-amber-500",
          available: true,
        },
        {
          title: "Por Proveedor",
          description: "Top proveedores por importe total de compras",
          href: "/reports/purchases?type=supplier",
          icon: <Users className="w-5 h-5" />,
          color: "bg-violet-500",
          available: true,
          badge: "Top 10",
          badgeColor: "bg-violet-600",
        },
      ],
    },
    {
      title: "Reportes Financieros",
      description: "Estados financieros relacionados con compras",
      icon: <BarChart3 className="w-5 h-5" />,
      color: "text-cyan-600 bg-cyan-50",
      reports: [
        {
          title: "Resumen Ejecutivo",
          description: "Total de compras, pendientes, pagadas y este mes",
          href: "/reports/purchases?type=summary",
          icon: <Calculator className="w-5 h-5" />,
          color: "bg-cyan-500",
          available: true,
        },
        {
          title: "Análisis de Proveedores",
          description: "Comportamiento de proveedores por estacionalidad y volumen",
          href: "/reports/purchases?type=supplier",
          icon: <Users className="w-5 h-5" />,
          color: "bg-violet-500",
          available: true,
        },
      ],
    },
  ];

  // Fetch purchase data from the API
  const [purchases, setPurchases] = useState<PurchaseReport[]>([]);
  const [summary, setSummary] = useState<any>(null);
  const [monthly, setMonthly] = useState<any[]>([]);
  const [category, setCategory] = useState<any[]>([]);
  const [supplier, setSupplier] = useState<any[]>([]);

  const loadPurchases = async (type?: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases/reports?type=${type || 'summary'}`);
      if (!res.ok) throw new Error('Failed to fetch');
      const data = await res.json();
      
      if (type === 'summary') {
        setSummary(data);
      } else if (type === 'monthly') {
        setMonthly(data);
      } else if (type === 'category') {
        setCategory(data);
      } else if (type === 'supplier') {
        setSupplier(data);
      }
    } catch (error) {
      console.error('Error loading purchase reports:', error);
    } finally {
      setLoading(false);
    }
  };

  // Initial load
  useEffect(() => {
    loadPurchases();
  }, []);

  const handleExport = async (type: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases/reports?type=${type}&export=1`);
      if (!res.ok) throw new Error('Failed to export');
      const data = await res.json();
      setExportData(data);
      setShowExport(true);
    } catch (error) {
      console.error('Error exporting report:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Reportes de Compras</h1>
          <p className="text-gray-600">Análisis y estadísticas de compras y proveedores</p>
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={() => setShowExport(true)} variant="outline">
            <Download className="w-4 h-4 mr-1" /> Exportar
          </Button>
          <Link href="/reports" className="text-sm text-gray-600 hover:text-gray-800">
            <span>← Volver a reportes</span>
          </Link>
        </div>
      </div>

      {/* Summary Card */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Resumen General</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <div className="text-2xl font-bold text-cyan-600">{summary.totalPurchases}</div>
                <div className="text-sm text-gray-600">Total de Compras</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-green-600">{summary.totalAmount}</div>
                <div className="text-sm text-gray-600">Total Liquido</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-yellow-600">{summary.pendingCount}</div>
                <div className="text-sm text-gray-600">Pendientes</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{summary.completedCount}</div>
                <div className="text-sm text-gray-600">Pagadas</div>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-sm text-gray-600">Este mes: {summary.thisMonthTotal}</div>
              <div className="mt-2">Promedio por compra: {summary.averagePurchase}</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {categories.flatMap(category =>
          category.reports.map(report => (
            <Card key={report.title}>
              <CardHeader className="pb-2">
                <CardTitle>{report.title}</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600">{report.description}</p>
                <Link
                  href={report.href}
                  onClick={(e) => {
                    e.preventDefault();
                    setReportType(report.title.includes('Proveedor') ? 'supplier' : 
                                  report.title.includes('Mensual') ? 'monthly' : 
                                  report.title.includes('Categoría') ? 'category' : 'summary');
                    setExpandedCategory(category.title);
                  }}
                  className="text-primary-600 hover:text-primary-800 cursor-pointer text-sm"
                >
                  Ver Reporte
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Data Details Section */}
      {loading && (
        <div className="text-center py-8">
          <span className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-current"></span>
          <span className="ml-4">Cargando...</span>
        </div>
      )}

      {/* Summary Details */}
      {summary && !loading && (
        <Card>
          <CardHeader>
            <CardTitle>Detalles del Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-xs text-gray-500">Total de Compras</p>
                <p className="text-2xl font-bold">{summary.totalPurchases}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Total Liquido</p>
                <p className="text-2xl font-bold text-green-600">{summary.totalAmount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pendientes</p>
                <p className="text-2xl font-bold text-yellow-600">{summary.pendingCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Pagadas</p>
                <p className="text-2xl font-bold text-blue-600">{summary.completedCount}</p>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-500">Este Mes</p>
                <p className="text-2xl font-bold">{summary.thisMonthTotal}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Promedio</p>
                <p className="text-2xl font-bold">{summary.averagePurchase}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Categorías</p>
                <p className="text-2xl font-bold">{category?.length || 0}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Proveedores</p>
                <p className="text-2xl font-bold">{supplier?.length || 0}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Export Modal */}
      {showExport && exportData && exportData.length > 0 && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur z-50 flex items-center justify-center p-6">
          <div className="bg-white rounded-lg p-8 max-w-2xl w-full shadow-2xl">
            <h3 className="text-xl font-bold mb-6">Exportar Reporte</h3>
            <p className="text-gray-600 mb-6">Se generará un archivo con los datos del reporte seleccionado</p>
            <pre className="bg-gray-100 p-4 rounded w-full overflow-auto text-xs" dangerouslySetInnerHTML={{ __html: JSON.stringify(exportData, null, 2) }} />
            <div className="mt-6 flex justify-end gap-3">
              <Button onClick={() => setShowExport(false)} variant="outline">Cancelar</Button>
              <Button>Descargar</Button>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!summary && !loading && (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-current mx-auto mb-4"></div>
          <h3 className="text-lg">Cargando reportes</h3>
          <p className="text-gray-600">Los reportes se cargarán al seleccionar un tipo</p>
        </div>
      )}
    </div>
  );
}