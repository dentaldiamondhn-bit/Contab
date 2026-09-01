"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  BookOpen,
  Calculator,
  Calendar,
  ChevronDown,
  ChevronRight,
  CreditCard,
  DollarSign,
  Download,
  FileText,
  Filter,
  PieChart,
  Receipt,
  TrendingUp,
  TrendingDown,
  Users,
  Building2,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
} from "lucide-react";

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

export default function ReportsPage() {
  const [search, setSearch] = useState("");
  const [expandedCategory, setExpandedCategory] = useState<string | null>("financieros");

  const categories: ReportCategory[] = [
    {
      title: "Reportes Financieros",
      description: "Estados financieros principales",
      icon: <BarChart3 className="w-5 h-5" />,
      color: "text-cyan-600 bg-cyan-50",
      reports: [
        {
          title: "Balance General",
          description: "Activos, pasivos y patrimonio a una fecha",
          href: "/reports/balance-general",
          icon: <Building2 className="w-5 h-5" />,
          color: "bg-cyan-500",
          available: true,
        },
        {
          title: "Estado de Resultados",
          description: "Ingresos, gastos y utilidad neta",
          href: "/reports/estado-resultados",
          icon: <FileText className="w-5 h-5" />,
          color: "bg-green-500",
          available: true,
        },
        {
          title: "P&G Detallado",
          description: "Estado de resultados por cuenta con PDF",
          href: "/reports/profit-loss",
          icon: <DollarSign className="w-5 h-5" />,
          color: "bg-emerald-500",
          available: true,
        },
        {
          title: "Balanza de Comprobacion",
          description: "Verificacion de saldos contables",
          href: "/reports/trial-balance",
          icon: <Calculator className="w-5 h-5" />,
          color: "bg-purple-500",
          available: true,
        },
        {
          title: "Flujo de Efectivo",
          description: "Ingresos y egresos de efectivo",
          href: "/reports/flujo-efectivo",
          icon: <TrendingUp className="w-5 h-5" />,
          color: "bg-cyan-500",
          available: true,
        },
      ],
    },
    {
      title: "Libros Contables",
      description: "Libros legales para SAR",
      icon: <BookOpen className="w-5 h-5" />,
      color: "text-cyan-600 bg-cyan-50",
      reports: [
        {
          title: "Libro Diario",
          description: "Registro cronologico de transacciones",
          href: "/reports/libro-diario",
          icon: <BookOpen className="w-5 h-5" />,
          color: "bg-cyan-500",
          available: true,
        },
        {
          title: "Libro Mayor",
          description: "Resumen por cuenta contable",
          href: "/reports/trial-balance",
          icon: <BookOpen className="w-5 h-5" />,
          color: "bg-violet-500",
          available: true,
        },
        {
          title: "Libro de Compras",
          description: "Compras con credito fiscal ISV",
          href: "/reports/libros-compras-ventas",
          icon: <Receipt className="w-5 h-5" />,
          color: "bg-orange-500",
          available: true,
        },
        {
          title: "Libro de Ventas",
          description: "Ventas con debito fiscal ISV",
          href: "/reports/libros-compras-ventas",
          icon: <CreditCard className="w-5 h-5" />,
          color: "bg-rose-500",
          available: true,
        },
        {
          title: "Libro de Inventarios",
          description: "Inventarios y balances generales",
          href: "/reports/trial-balance",
          icon: <BarChart3 className="w-5 h-5" />,
          color: "bg-teal-500",
          available: true,
        },
      ],
    },
    {
      title: "Reportes Fiscales Honduras",
      description: "Impuestos y declaraciones SAR/DGI",
      icon: <Calculator className="w-5 h-5" />,
      color: "text-red-600 bg-red-50",
      reports: [
        {
          title: "Resumen ISV",
          description: "Impuesto sobre ventas 15% y 18%",
          href: "/reports/resumen-isv",
          icon: <Receipt className="w-5 h-5" />,
          color: "bg-red-500",
          available: true,
        },
        {
          title: "Declaracion Mensual SAR",
          description: "ISV a pagar, ventas vs compras",
          href: "/reports/declaracion-mensual",
          icon: <Calendar className="w-5 h-5" />,
          color: "bg-red-600",
          badge: "Mensual",
          badgeColor: "bg-red-100 text-red-800",
          available: true,
        },
        {
          title: "Exportacion DET",
          description: "Archivos .txt formato SAR oficial",
          href: "/det",
          icon: <Download className="w-5 h-5" />,
          color: "bg-gray-600",
          badge: "SAR",
          badgeColor: "bg-gray-100 text-gray-800",
          available: true,
        },
        {
          title: "Retenciones ISR",
          description: "Comprobantes de retencion 1% y 12.5%",
          href: "/withholding",
          icon: <FileText className="w-5 h-5" />,
          color: "bg-amber-500",
          available: true,
        },
        {
          title: "Auxiliar de Cuentas",
          description: "Detalle por cuenta contable",
          href: "/reports/account-details",
          icon: <Search className="w-5 h-5" />,
          color: "bg-teal-500",
          available: true,
        },
      ],
    },
    {
      title: "Reportes de Negocio",
      description: "Metricas operativas y de clientes",
      icon: <PieChart className="w-5 h-5" />,
      color: "text-green-600 bg-green-50",
      reports: [
        {
          title: "Resumen de Clientes",
          description: "Top clientes por facturacion",
          href: "/reports/top-clientes",
          icon: <Users className="w-5 h-5" />,
          color: "bg-green-500",
          available: true,
        },
        {
          title: "Productos e Inventario",
          description: "Stock, costos y movimientos",
          href: "/inventory",
          icon: <BarChart3 className="w-5 h-5" />,
          color: "bg-emerald-500",
          available: true,
        },
        {
          title: "Compras por Proveedor",
          description: "Analisis de compras por proveedor",
          href: "/purchases",
          icon: <Building2 className="w-5 h-5" />,
          color: "bg-lime-500",
          available: true,
        },
      ],
    },
  ];

  const filteredCategories = categories
    .map((cat) => ({
      ...cat,
      reports: cat.reports.filter(
        (r) =>
          r.title.toLowerCase().includes(search.toLowerCase()) ||
          r.description.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter((cat) => cat.reports.length > 0);

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Centro de Reportes</h1>
        <p className="text-sm text-gray-500">
          Todos los reportes contables, fiscales y de negocio en un solo lugar
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar reporte..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
        />
      </div>

      {/* Categories */}
      <div className="space-y-4">
        {filteredCategories.map((category) => (
          <Card key={category.title}>
            <button
              onClick={() =>
                setExpandedCategory(
                  expandedCategory === category.title ? null : category.title
                )
              }
              className="w-full"
            >
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-lg ${category.color}`}>
                      {category.icon}
                    </div>
                    <div className="text-left">
                      <div className="text-base font-semibold">{category.title}</div>
                      <div className="text-xs text-gray-500 font-normal">
                        {category.description}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {category.reports.length}
                    </Badge>
                    {expandedCategory === category.title ? (
                      <ChevronDown className="w-4 h-4 text-gray-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
            </button>

            {expandedCategory === category.title && (
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {category.reports.map((report) =>
                    report.available ? (
                      <Link
                        key={report.title}
                        href={report.href}
                        className="flex items-start gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors group"
                      >
                        <div
                          className={`p-2 rounded-lg ${report.color} text-white shrink-0`}
                        >
                          {report.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-900 group-hover:text-cyan-600 truncate">
                              {report.title}
                            </div>
                            {report.badge && (
                              <Badge
                                className={`text-[10px] px-1.5 py-0 ${report.badgeColor}`}
                              >
                                {report.badge}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-gray-500 truncate">
                            {report.description}
                          </div>
                        </div>
                      </Link>
                    ) : (
                      <div
                        key={report.title}
                        className="flex items-start gap-3 p-3 border rounded-lg bg-gray-50 opacity-60 cursor-not-allowed"
                      >
                        <div className="p-2 rounded-lg bg-gray-300 text-white shrink-0">
                          {report.icon}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="text-sm font-medium text-gray-500 truncate">
                              {report.title}
                            </div>
                            <Badge className="text-[10px] px-1.5 py-0 bg-yellow-100 text-yellow-800">
                              {report.badge || "Proximamente"}
                            </Badge>
                          </div>
                          <div className="text-xs text-gray-400 truncate">
                            {report.description}
                          </div>
                        </div>
                      </div>
                    )
                  )}
                </div>
              </CardContent>
            )}
          </Card>
        ))}
      </div>

      {/* Quick Stats */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-gray-500">
            Resumen Rapido
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-cyan-600">
                {categories.reduce((sum, c) => sum + c.reports.length, 0)}
              </div>
              <div className="text-xs text-gray-500">Reportes Disponibles</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {categories.reduce(
                  (sum, c) => sum + c.reports.filter((r) => r.available).length,
                  0
                )}
              </div>
              <div className="text-xs text-gray-500">Implementados</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {categories.reduce(
                  (sum, c) => sum + c.reports.filter((r) => !r.available).length,
                  0
                )}
              </div>
              <div className="text-xs text-gray-500">En Desarrollo</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">5</div>
              <div className="text-xs text-gray-500">Libros SAR</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
