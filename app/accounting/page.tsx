"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  BookOpen, 
  FileText, 
  Plus, 
  TrendingUp, 
  Calculator, 
  Scale,
  FolderTree,
  Receipt,
  PiggyBank,
  Download,
  Upload,
  Excel,
  Shield,
  Folder,
  Clipboard
} from "lucide-react";ile,
  Clipboard,
  Printer
} from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/lib/contexts/TenantContext";
import { ExcelBooksUploader } from "@/components/accounting/ExcelBooksUploader";
import { exportToPDF } from "@/lib/services/pdf-export";
import { exportAuditLogsToPDF } from "@/lib/services/audit-export-service";
import FinancialRatios from "@/components/accounting/FinancialRatios";
import YearOverYearComparison from "@/components/accounting/YearOverYearComparisons";

export default function AccountingPage() {
  const { currentTenant } = useTenant();

  // Debug: Verificar qué está recibiendo del contexto
  console.log("🔍 Debug - currentTenant:", currentTenant);

  const accountingModules = [
    {
      id: "accounts",
      title: "Catálogo de Cuentas",
      description: "Gestiona el plan de cuentas contables",
      icon: FolderTree,
      color: "bg-green-500",
      href: `/companies/${currentTenant?.id || 1}/accounting/accounts`,
      features: ["Estructura jerárquica", "Tipos de cuenta", "Códigos únicos"],
      quickExport: {
        pdf: {
          title: "Catálogo de Cuentas",
          apiPath: "/api/accounting/accounts/export",
          type: "pdf"
        },
        excel: {
          title: "Catálogo de Cuentas Excel",
          apiPath: "/api/accounting/accounts/export",
          type: "excel"
        }
      }
    },
    {
      id: "books",
      title: "Libros Contables",
      description: "Libros obligatorios según el Código de Comercio",
      icon: BookOpen,
      color: "bg-purple-500",
      href: `/companies/${currentTenant?.id || 1}/accounting/books`,
      features: ["Libro Diario", "Libro Mayor", "Balance de Comprobación"],
      quickExport: {
        pdf: {
          title: "Libros Contables",
          apiPath: "/api/accounting/export?books",
          type: "pdf"
        },
        excel: {
          title: "Libros Contables Excel",
          apiPath: "/api/accounting/export?books",
          type: "excel"
        }
      }
    },
    {
      id: "financial-statements",
      title: "📑 Estados Financieros",
      description: "Balance General, Estado de Resultados y Flujo de Efectivo",
      icon: FileText,
      color: "bg-cyan-500",
      href: `/companies/${currentTenant?.id || 1}/accounting/financial-statements`,
      features: ["Balance General", "Estado de Resultados", "Flujo de Efectivo"]
    },
    {
      id: "legal-books",
      title: "🧾 Libros Legales",
      description: "Libros de Compras, Ventas, Retenciones y más",
      icon: Scale,
      color: "bg-orange-500",
      href: `/companies/${currentTenant?.id || 1}/accounting/books`,
      features: ["Libro de Compras y Ventas", "Retenciones", "Cumplimiento SAR"]
    },
    // Módulos de exportación rápida
    {
      id: "trial-balance",
      title: "📊 Balanza",
      description: "Balanza de comprobación con 6 columnas",
      icon: File,
      color: "bg-blue-500",
      features: ["Saldos por cuenta", "Débito y Crédito", "Diferencias"],
      quickExport: {
        pdf: {
          title: "Balanza de Comprobación",
          apiPath: "/api/accounting/export?trial-balance",
          type: "pdf"
        },
        excel: {
          title: "Balanza Excel",
          apiPath: "/api/accounting/export?trial-balance",
          type: "excel"
        }
      }
    },
    {
      id: "polizas",
      title: "📄 Pólizas",
      description: "Historial de asientos contables",
      icon: FileText,
      color: "bg-violet-500",
      features: ["Fecha", "Descripción", "Total"],
      quickExport: {
        pdf: {
          title: "Pólizas",
          apiPath: "/api/accounting/export?polizas",
          type: "pdf"
        }
      }
    },
    {
      id: "tax-report",
      title: "💰 Impuestos (ISV/SAR)",
      description: "Reporte mensual de ventas y compras",
      icon: Shield,
      color: "bg-red-500",
      features: ["Ventas totales", "Impuesto cobrado", "Compras deducibles"],
      quickExport: {
        pdf: {
          title: "Reporte ISV",
          apiPath: "/api/accounting/export?tax-report",
          type: "pdf"
        },
        excel: {
          title: "Reporte ISV Excel",
          apiPath: "/api/accounting/export?tax-report",
          type: "excel"
        }
      }
    },
    // Módulo de exportación de auditoría
    {
      id: "audit-logs",
      title: "📋 Logs de Auditoría",
      description: "Historial de movimientos y cambios en el sistema contable",
      icon: Clipboard,
      color: "bg-gray-700",
      features: ["Registro de cambios", "Validación de movimientos", "Historial de usuario"],
      quickExport: {
        pdf: {
          title: "Logs de Auditoría",
          apiPath: "/api/accounting/export-audit?period",
          type: "pdf"
        },
        excel: {
          title: "Logs de Auditoría Excel",
          apiPath: "/api/accounting/export-audit?period",
          type: "excel"
        }
      }
    }
  ];

  const recentTransactions: Array<{
    id: string;
    date: string;
    description: string;
    voucherType: string;
    voucherNumber: number;
    amount: number;
    currency: string;
  }> = [];

  const getVoucherTypeColor = (type: string) => {
    const colors = {
      INGRESO: "bg-green-100 text-green-800",
      EGRESO: "bg-red-100 text-red-800",
      DIARIO: "bg-cyan-100 text-cyan-800",
      AJUSTE: "bg-yellow-100 text-yellow-800",
};
  
  // Funciones de exportación rápida para los nuevos módulos
  const exportQuickPDF = async (module) => {
    const quickExport = module.quickExport?.pdf;
    if (!quickExport) return alert('Este módulo no tiene exportación PDF rápida configurada');
    
    try {
      const res = await fetch(quickExport.apiPath + '?tenantId=' + (currentTenant?.id || '1') + '&period=' + new Date().toISOString().slice(0, 7) + '&type=' + quickExport.type, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = quickExport.title + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        alert('✅ ' + quickExport.title + ' exportado exitosamente a PDF');
      } else {
        const errorData = await res.json();
        alert('❌ Error al exportar: ' + (errorData.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en exportQuickPDF:', error);
      alert('❌ Error inesperado al exportar el PDF');
    }
  };
  
  const exportQuickExcel = async (module) => {
    const quickExport = module.quickExport?.excel;
    if (!quickExport) return alert('Este módulo no tiene exportación Excel rápida configurada');
    
    try {
      const res = await fetch(quickExport.apiPath + '?tenantId=' + (currentTenant?.id || '1') + '&period=' + new Date().toISOString().slice(0, 7) + '&type=' + quickExport.type, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = quickExport.title + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        alert('✅ ' + quickExport.title + ' exportado exitosamente a Excel');
      } else {
        const errorData = await res.json();
        alert('❌ Error al exportar: ' + (errorData.error || 'Error desconocido'));
      }
    } catch (error) {
      console.error('Error en exportQuickExcel:', error);
      alert('❌ Error inesperado al exportar el Excel');
    }
  };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: number, currency: string = "HNL") => {
    return amount.toLocaleString("es-HN", { style: "currency", currency });
  };

  // Función para exportar a PDF desde la página principal
  const exportToPDF = async (moduleTitle: string, moduleType: string) => {
    console.log(`🔍 Debug - Exportando ${moduleTitle} a PDF...`);
    console.log(`🔍 Debug - Tenant:`, currentTenant);
    
    try {
      // Llamar a la API de exportación
      const res = await fetch(`/api/accounting/export/${moduleType}?tenantId=${currentTenant?.id || '1'}&period=${new Date().toISOString().slice(0, 7)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${moduleTitle.toLowerCase().replace(/ /g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        alert(`✅ ${moduleTitle} exportado exitosamente a PDF`);
      } else {
        const errorData = await res.json();
        alert(`❌ Error al exportar: ${errorData.error || 'Error desconocido'}`);
      }
    } catch (error) {
      console.error('Error en exportToPDF:', error);
      alert('❌ Error inesperado al exportar el PDF');
    }
  };

  // Función para ver detalles desde la página principal
  const viewDetails = (moduleTitle: string, moduleType: string) => {
    console.log(`Viewing details of ${moduleTitle}...`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contabilidad</h1>
        <p className="text-gray-600">
          Sistema de contabilidad por partida doble para {currentTenant?.businessName}
        </p>
      </div>

      {/* Visualización de Módulos Contables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-cyan-600 flex items-center justify-center">
              📒 Registro Contable
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Sistema de partida doble para gestión financiera
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-cyan-50 rounded-lg">
                <FileText className="h-8 w-8 text-cyan-600" />
                <div>
                  <h4 className="font-semibold text-cyan-800">Partidas de Diario</h4>
                  <p className="text-sm text-cyan-600">Registra transacciones con validación automática</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-green-50 rounded-lg">
                <BookOpen className="h-8 w-8 text-green-600" />
                <div>
                  <h4 className="font-semibold text-green-800">Libro Diario</h4>
                  <p className="text-sm text-green-600">Registro cronológico de todas las transacciones</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-purple-50 rounded-lg">
                <FolderTree className="h-8 w-8 text-purple-600" />
                <div>
                  <h4 className="font-semibold text-purple-800">Libro Mayor</h4>
                  <p className="text-sm text-purple-600">Saldos acumulados por cuenta</p>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-orange-50 rounded-lg">
                <Scale className="h-8 w-8 text-orange-600" />
                <div>
                  <h4 className="font-semibold text-orange-800">Catálogo de Cuentas</h4>
                  <p className="text-sm text-orange-600">Gestiona el plan contable de la empresa</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        
        {/* Estadísticas Rápidas */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Transacciones Mes</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              +0% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(0)}</div>
            <p className="text-xs text-muted-foreground">
              +0% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Mes</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(0)}</div>
            <p className="text-xs text-muted-foreground">
              +0% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(0)}</div>
            <p className="text-xs text-muted-foreground">
              +0% respecto al mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload de Archivos Excel - NUEVA SECCIÓN */}
      <Card className="border-2 border-cyan-200 bg-cyan-50/50">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-cyan-600 rounded-lg">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-blue-900">📊 Importación de Archivos Excel</CardTitle>
              <CardDescription className="text-cyan-700">
                Sube archivos Excel para importar datos contables automáticamente
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg border border-cyan-200">
              <ExcelBooksUploader tenantId={currentTenant?.id || '1'} />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              <div className="p-3 bg-green-100 rounded-lg border border-green-300">
                <h4 className="font-semibold text-green-800 mb-1">📈 Libro Diario</h4>
                <p className="text-sm text-green-700">Importa partidas de diario con validación automática</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-lg border border-purple-300">
                <h4 className="font-semibold text-purple-800 mb-1">📋 Egresos</h4>
                <p className="text-sm text-purple-700">Carga gastos y egresos personalizados</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-lg border border-orange-300">
                <h4 className="font-semibold text-orange-800 mb-1">💰 Ingresos</h4>
                <p className="text-sm text-orange-700">Importa ingresos y ventas con formato estándar</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Acciones Rápidas */}
      <Card>
        <CardHeader>
          <CardTitle>Acciones Rápidas</CardTitle>
          <CardDescription>
            Operaciones contables más comunes
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Botón NUEVO LIBRO muy visible */}
          <div className="mb-4 p-4 bg-green-100 rounded-lg border-2 border-green-500">
            <p className="text-green-800 font-bold mb-2">🟢 BOTÓN NUEVO LIBRO (SIEMPRE VISIBLE):</p>
            <Link href={`/companies/${currentTenant?.id || 1}/accounting/books`}>
              <Button className="bg-green-600 text-white text-lg px-6 py-3">
                ➕ NUEVO LIBRO CONTABLE
              </Button>
            </Link>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Link href={`/companies/${currentTenant?.id || 1}/accounting/book`}>
              <Button variant="outline" className="w-full h-20 flex-col space-y-2 border-2 border-cyan-500">
                <BookOpen className="h-6 w-6 text-cyan-600" />
                <span className="text-cyan-600 font-bold">Libros Contables</span>
              </Button>
            </Link>
            
            <Link href={`/companies/${currentTenant?.id || 1}/accounting/books`}>
              <Button className="w-full h-20 flex-col space-y-2 bg-green-600 hover:bg-green-700">
                <Plus className="h-6 w-6 text-white" />
                <span className="text-white font-bold">Nuevo Libro</span>
              </Button>
            </Link>
            
            <Link href={`/companies/${currentTenant?.id || 1}/accounting/accounts`}>
              <Button variant="outline" className="w-full h-20 flex-col space-y-2">
                <FolderTree className="h-6 w-6" />
                <span>Catálogo de Cuentas</span>
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Módulos Contables */}
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-900">Módulos Contables</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {accountingModules.map((module) => (
            <Card key={module.id} className="hover:shadow-lg transition-shadow">
              <CardHeader>
                <div className="flex items-center space-x-3">
                  <div className={`p-3 rounded-lg ${module.color}`}>
                    <module.icon className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{module.title}</CardTitle>
                    <CardDescription>{module.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-2">
                    {module.features.map((feature, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                        <span className="text-sm text-gray-600">{feature}</span>
                      </div>
                    ))}
                  {module.quickExport && (
                    <div className="flex items-center space-x-2 mt-3 pt-3 border-t border-gray-200">
                      {module.quickExport.pdf && (
                        <Button variant="outline" size="sm" onClick={() => exportQuickPDF(module)}>
                          <Download className="h-3 w-3 mr-1" />
                          PDF
                        </Button>
                      )}
                      {module.quickExport.excel && (
                        <Button variant="outline" size="sm" onClick={() => exportQuickExcel(module)}>
                          <Upload className="h-3 w-3 mr-1" />
                          Excel
                        </Button>
                      )}
                    </div>
                  )}
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        viewDetails(module.title, module.id);
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Ver
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        exportToPDF(module.title, module.id);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        const moduleType = module.id;
                        const tenantId = currentTenant?.id || '1';
                        const period = new Date().toISOString().slice(0, 7);
                        window.fetch(`/api/accounting/export/${moduleType}?tenantId=${tenantId}&period=${period}&type=excel`, {
                          method: 'GET',
                          headers: { 'Content-Type': 'application/json' },
                        }).then(async (res) => {
                          if (res.ok) {
                            const blob = await res.blob();
                            const url = window.URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = `${module.title.toLowerCase().split(' ').join('_')}_${period}.xlsx`;
                            document.body.appendChild(a);
                            a.click();
                            window.URL.revokeObjectURL(url);
                          }
                        }).catch((error) => {
                          console.error('Error en exportExcel:', error);
                        });
                      }}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Excel
                    </Button>
                  </div>
                  <Link href={module.href} className="flex-1">
                    <Button className="w-full">
                      Acceder
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Dashboard de Razones Financieras */}
      <FinancialRatios />

      {/* Comparador Año-a-Año */}
      <YearOverYearComparison initialPeriod={new Date().toISOString().slice(0, 7)} initialYearsAgo={1} />

      {/* Actividad Reciente */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Actividad Reciente</h2>
        <Card>
          <CardHeader>
            <CardTitle>Transacciones Recientes</CardTitle>
            <CardDescription>
              Últimas operaciones contables registradas
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className={`w-3 h-3 rounded-full ${
                      transaction.voucherType === 'INGRESO' ? 'bg-green-500' : 'bg-red-500'
                    }`}></div>
                    <div>
                      <p className="font-medium">{transaction.description}</p>
                      <p className="text-sm text-gray-500">
                        {transaction.voucherType} #{transaction.voucherNumber} • {transaction.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold">{formatCurrency(transaction.amount)}</p>
                    <p className="text-sm text-gray-500">{transaction.currency}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Funciones de exportación rápida para los nuevos módulos
const exportQuickPDF = async (module) => {
  const quickExport = module.quickExport?.pdf;
  if (!quickExport) return alert('Este módulo no tiene exportación PDF rápida configurada');
  
  try {
    const res = await fetch(quickExport.apiPath + '?tenantId=' + (currentTenant?.id || '1') + '&period=' + new Date().toISOString().slice(0, 7) + '&type=' + quickExport.type, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = quickExport.title + '_' + new Date().toISOString().slice(0, 10) + '.pdf';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      alert('✅ ' + quickExport.title + ' exportado exitosamente a PDF');
    } else {
      const errorData = await res.json();
      alert('❌ Error al exportar: ' + (errorData.error || 'Error desconocido'));
    }
  } catch (error) {
    console.error('Error en exportQuickPDF:', error);
    alert('❌ Error inesperado al exportar el PDF');
  }
};

const exportQuickExcel = async (module) => {
  const quickExport = module.quickExport?.excel;
  if (!quickExport) return alert('Este módulo no tiene exportación Excel rápida configurada');
  
  try {
    const res = await fetch(quickExport.apiPath + '?tenantId=' + (currentTenant?.id || '1') + '&period=' + new Date().toISOString().slice(0, 7) + '&type=' + quickExport.type, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });
    
    if (res.ok) {
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = quickExport.title + '_' + new Date().toISOString().slice(0, 10) + '.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      alert('✅ ' + quickExport.title + ' exportado exitosamente a Excel');
    } else {
      const errorData = await res.json();
      alert('❌ Error al exportar: ' + (errorData.error || 'Error desconocido'));
    }
  } catch (error) {
    console.error('Error en exportQuickExcel:', error);
    alert('❌ Error inesperado al exportar el Excel');
  }
};
