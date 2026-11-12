"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TransactionFormSimple } from "@/components/accounting/TransactionFormSimple";
import { AccountingBooksViewer } from "@/components/accounting/AccountingBooksViewer";
import { ExcelBooksUploader } from "@/components/accounting/ExcelBooksUploader";
import { 
  Plus, 
  BookOpen, 
  FileText, 
  Calculator,
  ArrowLeft,
  Upload
} from "lucide-react";

export default function SimpleAccountingPage() {
  const params = useParams();
  const tenantId = params.id as string;
  
  const [activeTab, setActiveTab] = useState("entry");
  const [showTransactionForm, setShowTransactionForm] = useState(false);
  const [showExcelUploader, setShowExcelUploader] = useState(false);

  const handleTransactionSuccess = () => {
    setShowTransactionForm(false);
    setShowExcelUploader(false);
    setActiveTab("books");
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Contabilidad Simplificada</h1>
            <p className="text-gray-600">
              Ingrese ingresos y egresos. El sistema genera los libros contables automáticamente.
            </p>
          </div>
        </div>
        
        {!showTransactionForm && (
          <Button onClick={() => setShowTransactionForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nueva Transacción
          </Button>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md mx-auto">
          <TabsTrigger value="entry" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Ingresar Datos</span>
          </TabsTrigger>
          <TabsTrigger value="books" className="flex items-center space-x-2">
            <BookOpen className="h-4 w-4" />
            <span>Ver Libros</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab: Ingresar Datos */}
        <TabsContent value="entry" className="space-y-6">
          {/* Opciones de ingreso */}
          {!showTransactionForm && !showExcelUploader && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowTransactionForm(true)}>
                <CardHeader className="text-center">
                  <Calculator className="h-12 w-12 text-cyan-600 mx-auto mb-4" />
                  <CardTitle>Ingreso Manual</CardTitle>
                  <CardDescription>
                    Ingrese transacciones una por una con partida doble automática
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Nueva Transacción
                  </Button>
                </CardContent>
              </Card>

              <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={() => setShowExcelUploader(true)}>
                <CardHeader className="text-center">
                  <Upload className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <CardTitle>Subir desde Excel</CardTitle>
                  <CardDescription>
                    Importe libros contables completos desde archivos Excel
                  </CardDescription>
                </CardHeader>
                <CardContent className="flex justify-center">
                  <Button variant="outline">
                    <Upload className="h-4 w-4 mr-2" />
                    Seleccionar Archivo
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Formulario de transacción */}
          {showTransactionForm && (
            <TransactionFormSimple
              tenantId={tenantId}
              onSuccess={handleTransactionSuccess}
              onCancel={() => setShowTransactionForm(false)}
            />
          )}

          {/* Upload de Excel */}
          {showExcelUploader && (
            <ExcelBooksUploader
              tenantId={tenantId}
              onSuccess={handleTransactionSuccess}
            />
          )}

          {/* Instrucciones - solo mostrar cuando no hay formulario activo */}
          {!showTransactionForm && !showExcelUploader && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-green-700 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Ingresos (Entradas)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      Ventas de productos o servicios
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      Cobros a clientes
                    </li>
                    <li className="flex items-start">
                      <span className="text-green-600 mr-2">✓</span>
                      Otros ingresos operativos
                    </li>
                  </ul>
                  <p className="mt-4 text-sm text-gray-600">
                    El sistema registra automáticamente el débito en Caja/Bancos y el crédito en Ventas.
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-red-700 flex items-center">
                    <FileText className="h-5 w-5 mr-2" />
                    Egresos (Salidas)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2 text-sm">
                    <li className="flex items-start">
                      <span className="text-red-600 mr-2">✓</span>
                      Compras de mercancía
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-600 mr-2">✓</span>
                      Gastos operativos (servicios, alquiler)
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-600 mr-2">✓</span>
                      Gastos de personal (salarios)
                    </li>
                    <li className="flex items-start">
                      <span className="text-red-600 mr-2">✓</span>
                      Impuestos pagados
                    </li>
                  </ul>
                  <p className="mt-4 text-sm text-gray-600">
                    El sistema registra automáticamente el débito en Gastos/Compras y el crédito en Caja/Bancos.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Tab: Ver Libros */}
        <TabsContent value="books">
          <AccountingBooksViewer tenantId={tenantId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
