"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { 
  Download, 
  Calendar, 
  Filter, 
  TrendingUp, 
  TrendingDown,
  Scale,
  FileText,
  ArrowUpRight,
  ArrowDownRight
} from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";

interface FinancialData {
  accountCode: string;
  accountName: string;
  accountType: string;
  balance: number;
  currentPeriod: number;
  previousPeriod: number;
  variance: number;
  variancePercent: number;
}

interface IncomeStatementData {
  category: string;
  items: {
    accountCode: string;
    accountName: string;
    currentPeriod: number;
    previousPeriod: number;
    variance: number;
    variancePercent: number;
  }[];
  total: number;
  totalPrevious: number;
  variance: number;
  variancePercent: number;
}

const mockBalanceSheetData: FinancialData[] = [
  // ACTIVOS
  { accountCode: "1101", accountName: "Caja", accountType: "ASSET", balance: 50000, currentPeriod: 50000, previousPeriod: 45000, variance: 5000, variancePercent: 11.11 },
  { accountCode: "1102", accountName: "Bancos Cuenta Corriente", accountType: "ASSET", balance: 150000, currentPeriod: 150000, previousPeriod: 120000, variance: 30000, variancePercent: 25.00 },
  { accountCode: "1201", accountName: "Clientes", accountType: "ASSET", balance: 80000, currentPeriod: 80000, previousPeriod: 75000, variance: 5000, variancePercent: 6.67 },
  { accountCode: "1301", accountName: "Materiales Clínicos", accountType: "ASSET", balance: 45000, currentPeriod: 45000, previousPeriod: 50000, variance: -5000, variancePercent: -10.00 },
  { accountCode: "2101", accountName: "Mobiliario y Equipo", accountType: "ASSET", balance: 200000, currentPeriod: 200000, previousPeriod: 200000, variance: 0, variancePercent: 0.00 },
  
  // PASIVOS
  { accountCode: "3101", accountName: "Proveedores", accountType: "LIABILITY", balance: -60000, currentPeriod: -60000, previousPeriod: -55000, variance: -5000, variancePercent: -9.09 },
  { accountCode: "3201", accountName: "ISV por Pagar", accountType: "LIABILITY", balance: -15000, currentPeriod: -15000, previousPeriod: -12000, variance: -3000, variancePercent: -25.00 },
  { accountCode: "3300", accountName: "Préstamos Bancarios", accountType: "LIABILITY", balance: -100000, currentPeriod: -100000, previousPeriod: -100000, variance: 0, variancePercent: 0.00 },
  
  // PATRIMONIO
  { accountCode: "4100", accountName: "Capital Social", accountType: "EQUITY", balance: -200000, currentPeriod: -200000, previousPeriod: -200000, variance: 0, variancePercent: 0.00 },
  { accountCode: "4200", accountName: "Utilidades Retenidas", accountType: "EQUITY", balance: -150000, currentPeriod: -150000, previousPeriod: -123000, variance: -27000, variancePercent: -21.95 },
];

const mockIncomeStatementData: IncomeStatementData[] = [
  {
    category: "INGRESOS OPERACIONALES",
    items: [
      { accountCode: "5101", accountName: "Consultas Dentales", currentPeriod: 80000, previousPeriod: 70000, variance: 10000, variancePercent: 14.29 },
      { accountCode: "5102", accountName: "Tratamientos Ortodónticos", currentPeriod: 45000, previousPeriod: 40000, variance: 5000, variancePercent: 12.50 },
      { accountCode: "5103", accountName: "Venta de Productos", currentPeriod: 25000, previousPeriod: 20000, variance: 5000, variancePercent: 25.00 },
    ],
    total: 150000,
    totalPrevious: 130000,
    variance: 20000,
    variancePercent: 15.38
  },
  {
    category: "COSTOS Y GASTOS",
    items: [
      { accountCode: "6101", accountName: "Salarios y Sueldos", currentPeriod: -45000, previousPeriod: -42000, variance: -3000, variancePercent: -7.14 },
      { accountCode: "6102", accountName: "Seguro Social", currentPeriod: -8000, previousPeriod: -7500, variance: -500, variancePercent: -6.67 },
      { accountCode: "6201", accountName: "Alquiler de Local", currentPeriod: -15000, previousPeriod: -15000, variance: 0, variancePercent: 0.00 },
      { accountCode: "6202", accountName: "Servicios Básicos", currentPeriod: -5000, previousPeriod: -4500, variance: -500, variancePercent: -11.11 },
      { accountCode: "6203", accountName: "Materiales Clínicos", currentPeriod: -25000, previousPeriod: -23000, variance: -2000, variancePercent: -8.70 },
    ],
    total: -98000,
    totalPrevious: -92000,
    variance: -6000,
    variancePercent: -6.52
  }
];

export default function FinancialStatements() {
  const { currentTenant } = useTenant();
  const [selectedPeriod, setSelectedPeriod] = useState("2024-01");
  const [comparisonPeriod, setComparisonPeriod] = useState("2023-12");
  const [statementType, setStatementType] = useState("balance");

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString("es-HN", { style: "currency", currency: "HNL" });
  };

  const formatPercent = (percent: number) => {
    return `${percent > 0 ? '+' : ''}${percent.toFixed(2)}%`;
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 0) return "text-green-600";
    if (variance < 0) return "text-red-600";
    return "text-gray-600";
  };

  const calculateTotals = () => {
    const assets = mockBalanceSheetData
      .filter(item => item.accountType === "ASSET")
      .reduce((sum, item) => sum + item.currentPeriod, 0);
    
    const liabilities = mockBalanceSheetData
      .filter(item => item.accountType === "LIABILITY")
      .reduce((sum, item) => sum + item.currentPeriod, 0);
    
    const equity = mockBalanceSheetData
      .filter(item => item.accountType === "EQUITY")
      .reduce((sum, item) => sum + item.currentPeriod, 0);

    return { assets, liabilities, equity };
  };

  const calculateIncomeStatementTotals = () => {
    const revenues = mockIncomeStatementData
      .filter(category => category.category.includes("INGRESOS"))
      .reduce((sum, category) => sum + category.total, 0);
    
    const expenses = mockIncomeStatementData
      .filter(category => category.category.includes("COSTOS"))
      .reduce((sum, category) => sum + category.total, 0);

    const netIncome = revenues + expenses;

    return { revenues, expenses, netIncome };
  };

  const totals = calculateTotals();
  const incomeTotals = calculateIncomeStatementTotals();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Estados Financieros</h2>
        <p className="text-gray-600">
          Reportes financieros para {currentTenant?.businessName}
        </p>
      </div>

      {/* Controles */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Calendar className="h-5 w-5" />
            <span>Período de Reporte</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="period">Período Actual</Label>
              <Input
                id="period"
                type="month"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="comparison">Período Comparativo</Label>
              <Input
                id="comparison"
                type="month"
                value={comparisonPeriod}
                onChange={(e) => setComparisonPeriod(e.target.value)}
              />
            </div>
            
            <div>
              <Label htmlFor="type">Tipo de Reporte</Label>
              <Select value={statementType} onValueChange={setStatementType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">Balance General</SelectItem>
                  <SelectItem value="income">Estado de Resultados</SelectItem>
                  <SelectItem value="cash">Flujo de Efectivo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs value={statementType} onValueChange={setStatementType} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="balance" className="flex items-center space-x-2">
            <Scale className="h-4 w-4" />
            <span>Balance General</span>
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center space-x-2">
            <FileText className="h-4 w-4" />
            <span>Estado de Resultados</span>
          </TabsTrigger>
          <TabsTrigger value="cash" className="flex items-center space-x-2">
            <TrendingUp className="h-4 w-4" />
            <span>Flujo de Efectivo</span>
          </TabsTrigger>
        </TabsList>

        {/* Balance General */}
        <TabsContent value="balance" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Balance General</CardTitle>
                  <CardDescription>
                    Estado de situación financiera al {selectedPeriod}
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-8">
                {/* ACTIVO */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-blue-900">ACTIVO</h3>
                  <div className="space-y-3">
                    <div className="font-medium text-sm text-gray-600 mb-2">ACTIVO CORRIENTE</div>
                    {mockBalanceSheetData
                      .filter(item => item.accountType === "ASSET" && ["1101", "1102", "1201", "1301"].includes(item.accountCode))
                      .map(item => (
                        <div key={item.accountCode} className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm text-gray-500">{item.accountCode}</span>
                              <span>{item.accountName}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm text-gray-500">vs. período anterior:</span>
                              <span className={`text-sm font-medium ${getVarianceColor(item.variance)}`}>
                                {formatPercent(item.variancePercent)}
                              </span>
                              {item.variance !== 0 && (
                                item.variance > 0 ? 
                                  <ArrowUpRight className="h-3 w-3 text-green-600" /> :
                                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                          </div>
                          <span className="font-medium text-right min-w-32">
                            {formatCurrency(item.currentPeriod)}
                          </span>
                        </div>
                      ))}
                    
                    <div className="font-medium text-sm text-gray-600 mb-2 mt-4">ACTIVO NO CORRIENTE</div>
                    {mockBalanceSheetData
                      .filter(item => item.accountType === "ASSET" && ["2101"].includes(item.accountCode))
                      .map(item => (
                        <div key={item.accountCode} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm text-gray-500">{item.accountCode}</span>
                            <span>{item.accountName}</span>
                          </div>
                          <span className="font-medium text-right min-w-32">
                            {formatCurrency(item.currentPeriod)}
                          </span>
                        </div>
                      ))}
                    
                    <div className="border-t pt-3 mt-4">
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>TOTAL ACTIVO</span>
                        <span>{formatCurrency(totals.assets)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* PASIVO Y PATRIMONIO */}
                <div>
                  <h3 className="text-lg font-semibold mb-4 text-red-900">PASIVO Y PATRIMONIO</h3>
                  <div className="space-y-3">
                    <div className="font-medium text-sm text-gray-600 mb-2">PASIVO CORRIENTE</div>
                    {mockBalanceSheetData
                      .filter(item => item.accountType === "LIABILITY")
                      .map(item => (
                        <div key={item.accountCode} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm text-gray-500">{item.accountCode}</span>
                            <span>{item.accountName}</span>
                          </div>
                          <span className="font-medium text-right min-w-32">
                            {formatCurrency(Math.abs(item.currentPeriod))}
                          </span>
                        </div>
                      ))}
                    
                    <div className="font-medium text-sm text-gray-600 mb-2 mt-4">PATRIMONIO</div>
                    {mockBalanceSheetData
                      .filter(item => item.accountType === "EQUITY")
                      .map(item => (
                        <div key={item.accountCode} className="flex justify-between items-center">
                          <div className="flex items-center space-x-2">
                            <span className="font-mono text-sm text-gray-500">{item.accountCode}</span>
                            <span>{item.accountName}</span>
                          </div>
                          <span className="font-medium text-right min-w-32">
                            {formatCurrency(Math.abs(item.currentPeriod))}
                          </span>
                        </div>
                      ))}
                    
                    <div className="border-t pt-3 mt-4">
                      <div className="flex justify-between items-center font-bold text-lg">
                        <span>TOTAL PASIVO Y PATRIMONIO</span>
                        <span>{formatCurrency(Math.abs(totals.liabilities + totals.equity))}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Verificación de Balance */}
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-semibold text-blue-900">VERIFICACIÓN DE BALANCE:</span>
                  <div className="flex items-center space-x-4">
                    <span className="text-blue-700">Activo = {formatCurrency(totals.assets)}</span>
                    <span className="text-blue-700">Pasivo + Patrimonio = {formatCurrency(Math.abs(totals.liabilities + totals.equity))}</span>
                    <Badge className={totals.assets === Math.abs(totals.liabilities + totals.equity) ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                      {totals.assets === Math.abs(totals.liabilities + totals.equity) ? "✓ BALANCEADO" : "✗ ERROR"}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Estado de Resultados */}
        <TabsContent value="income" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Estado de Resultados</CardTitle>
                  <CardDescription>
                    Resultados del período {selectedPeriod}
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {mockIncomeStatementData.map((category, index) => (
                  <div key={index}>
                    <h3 className="text-lg font-semibold mb-4">{category.category}</h3>
                    <div className="space-y-2">
                      {category.items.map((item) => (
                        <div key={item.accountCode} className="flex justify-between items-center">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="font-mono text-sm text-gray-500">{item.accountCode}</span>
                              <span>{item.accountName}</span>
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="text-sm text-gray-500">vs. período anterior:</span>
                              <span className={`text-sm font-medium ${getVarianceColor(item.variance)}`}>
                                {formatPercent(item.variancePercent)}
                              </span>
                              {item.variance !== 0 && (
                                item.variance > 0 ? 
                                  <ArrowUpRight className="h-3 w-3 text-green-600" /> :
                                  <ArrowDownRight className="h-3 w-3 text-red-600" />
                              )}
                            </div>
                          </div>
                          <div className="text-right min-w-32">
                            <span className="font-medium">
                              {formatCurrency(item.currentPeriod)}
                            </span>
                          </div>
                        </div>
                      ))}
                      
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total {category.category}</span>
                          <span className={category.total > 0 ? "text-green-600" : "text-red-600"}>
                            {formatCurrency(category.total)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Resumen */}
                <div className="border-t pt-4 mt-6">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-semibold">UTILIDAD BRUTA</span>
                      <span className="font-semibold text-green-600">
                        {formatCurrency(incomeTotals.revenues)}
                      </span>
                    </div>
                    
                    <div className="flex justify-between items-center text-lg">
                      <span className="font-semibold">TOTAL GASTOS</span>
                      <span className="font-semibold text-red-600">
                        {formatCurrency(Math.abs(incomeTotals.expenses))}
                      </span>
                    </div>
                    
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between items-center text-xl font-bold">
                        <span>UTILIDAD NETA DEL PERÍODO</span>
                        <span className={incomeTotals.netIncome > 0 ? "text-green-600" : "text-red-600"}>
                          {formatCurrency(incomeTotals.netIncome)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="mt-4 p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-green-900">MARGEN NETO:</span>
                        <Badge className="bg-green-100 text-green-800">
                          {((incomeTotals.netIncome / incomeTotals.revenues) * 100).toFixed(2)}%
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Flujo de Efectivo */}
        <TabsContent value="cash" className="space-y-6">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Flujo de Efectivo</CardTitle>
                  <CardDescription>
                    Movimientos de efectivo del período {selectedPeriod}
                  </CardDescription>
                </div>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar PDF
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Flujo de Efectivo en Desarrollo
                </h3>
                <p className="text-gray-600 max-w-md mx-auto">
                  Esta sección mostrará el análisis de flujo de efectivo operacional, 
                  de inversión y financiero, permitiendo una visión completa de la 
                  liquidez de la empresa.
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
