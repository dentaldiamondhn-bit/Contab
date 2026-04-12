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
  Upload
} from "lucide-react";
import Link from "next/link";
import { useTenant } from "@/lib/contexts/TenantContext";
import { ExcelBooksUploaderWithFiles } from "@/components/accounting/ExcelBooksUploaderWithFiles";

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
      features: ["Estructura jerárquica", "Tipos de cuenta", "Códigos únicos"]
    },
    {
      id: "books",
      title: "Libros Contables",
      description: "Libros obligatorios según el Código de Comercio",
      icon: BookOpen,
      color: "bg-purple-500",
      href: `/companies/${currentTenant?.id || 1}/accounting/books`,
      features: ["Libro Diario", "Libro Mayor", "Balance de Comprobación"]
    }
  ];

  const recentTransactions = [
    {
      id: "1",
      date: "2024-01-15",
      description: "Venta de servicios dentales",
      voucherType: "INGRESO",
      voucherNumber: 1,
      amount: 5000,
      currency: "HNL"
    },
    {
      id: "2",
      date: "2024-01-16",
      description: "Compra de materiales clínicos",
      voucherType: "EGRESO",
      voucherNumber: 1,
      amount: 2000,
      currency: "HNL"
    },
    {
      id: "3",
      date: "2024-01-17",
      description: "Pago de alquiler mensual",
      voucherType: "DIARIO",
      voucherNumber: 1,
      amount: 3000,
      currency: "HNL"
    }
  ];

  const getVoucherTypeColor = (type: string) => {
    const colors = {
      INGRESO: "bg-green-100 text-green-800",
      EGRESO: "bg-red-100 text-red-800",
      DIARIO: "bg-blue-100 text-blue-800",
      AJUSTE: "bg-yellow-100 text-yellow-800",
    };
    return colors[type as keyof typeof colors] || "bg-gray-100 text-gray-800";
  };

  const formatCurrency = (amount: number, currency: string = "HNL") => {
    return amount.toLocaleString("es-HN", { style: "currency", currency });
  };

  // Función para exportar a PDF desde la página principal
  const exportToPDF = (moduleTitle: string, moduleType: string) => {
    console.log(`🔍 Debug - Exportando ${moduleTitle} a PDF...`);
    console.log(`🔍 Debug - Tenant:`, currentTenant);
    
    // Simplificar para prueba
    alert(`PDF: ${moduleTitle} - ${moduleType}`);
  };

  // Función para ver detalles desde la página principal
  const viewDetails = (moduleTitle: string, moduleType: string) => {
    console.log(`🔍 Debug - Viendo detalles de ${moduleTitle}...`);
    console.log(`🔍 Debug - Tipo:`, moduleType);
    
    // Simplificar para prueba
    alert(`Ver: ${moduleTitle} - ${moduleType}`);
  };

  // Función de prueba simple
  const testFunction = () => {
    console.log("🔍 Debug - Test function working!");
    alert("Test function working!");
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Contabilidad</h1>
        <p className="text-gray-600">
          Sistema de contabilidad por partida doble para {currentTenant?.businessName}
        </p>
        
        {/* Debug Information */}
        <div className="mt-4 p-4 bg-yellow-100 rounded-lg border-2 border-yellow-500">
          <p className="text-yellow-800 font-bold mb-2">🔍 DEBUG INFO:</p>
          <p className="text-yellow-800">Current Tenant ID: {currentTenant?.id || 'NULL'}</p>
          <p className="text-yellow-800">Business Name: {currentTenant?.businessName || 'NULL'}</p>
          <p className="text-yellow-800">Generated URL: /companies/{currentTenant?.id || '1'}/accounting/books</p>
        </div>
        
        {/* Botón de prueba siempre visible */}
        <div className="mt-4 p-4 bg-red-100 rounded-lg border-2 border-red-500">
          <p className="text-red-800 font-bold mb-2">🔴 BOTÓN DE PRUEBA SIEMPRE VISIBLE:</p>
          <Link href={`/companies/${currentTenant?.id || '1'}/accounting/books`}>
            <Button className="bg-red-600 text-white text-lg px-6 py-3">
              📚 IR A LIBROS CONTABLES
            </Button>
          </Link>
        </div>
      </div>

      {/* Visualización de Módulos Contables */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-bold text-blue-600 flex items-center justify-center">
              📒 Registro Contable
            </CardTitle>
            <CardDescription className="text-sm text-gray-600">
              Sistema de partida doble para gestión financiera
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg">
                <FileText className="h-8 w-8 text-blue-600" />
                <div>
                  <h4 className="font-semibold text-blue-800">Partidas de Diario</h4>
                  <p className="text-sm text-blue-600">Registra transacciones con validación automática</p>
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
            <div className="text-2xl font-bold">47</div>
            <p className="text-xs text-muted-foreground">
              +12% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ingresos Mes</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(125000)}</div>
            <p className="text-xs text-muted-foreground">
              +8% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gastos Mes</CardTitle>
            <Receipt className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(85000)}</div>
            <p className="text-xs text-muted-foreground">
              +5% respecto al mes anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Utilidad Neta</CardTitle>
            <PiggyBank className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(40000)}</div>
            <p className="text-xs text-muted-foreground">
              +15% respecto al mes anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upload de Archivos Excel - NUEVA SECCIÓN */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-600 rounded-lg">
              <Upload className="h-6 w-6 text-white" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold text-blue-900">📊 Importación de Archivos Excel</CardTitle>
              <CardDescription className="text-blue-700">
                Sube archivos Excel para importar datos contables automáticamente
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="p-4 bg-white rounded-lg border border-blue-200">
              <ExcelBooksUploaderWithFiles tenantId={currentTenant?.id || '1'} />
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
          {/* Botón de prueba */}
          <div className="mb-4 p-3 bg-yellow-100 rounded-lg">
            <p className="text-sm text-yellow-800 mb-2">Botón de prueba:</p>
            <Link href={`/companies/${currentTenant?.id || 1}/accounting/book`}>
              <Button className="bg-yellow-500 text-white">
                IR A LIBROS CONTABLES (TEST)
              </Button>
            </Link>
          </div>

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
              <Button variant="outline" className="w-full h-20 flex-col space-y-2 border-2 border-blue-500">
                <BookOpen className="h-6 w-6 text-blue-600" />
                <span className="text-blue-600 font-bold">Libros Contables</span>
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
                  </div>
                  
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      className="flex-1"
                      onClick={() => {
                        console.log("🔍 Debug - Click en Ver button");
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
                        console.log("🔍 Debug - Click en PDF button");
                        exportToPDF(module.title, module.id);
                      }}
                    >
                      <Download className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                    <Link href={module.href} className="flex-1">
                      <Button className="w-full">
                        Acceder
                      </Button>
                    </Link>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Actividad Reciente */}
      <div className="space-y-6">
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
