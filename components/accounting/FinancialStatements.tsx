"use client";

import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Download, Calendar, TrendingUp, Scale, FileText, ArrowUpRight, ArrowDownRight, Loader2 } from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";

interface AccountData {
  code: string;
  name: string;
  type: string;
  balance: number;
}

export default function FinancialStatements() {
  const { currentTenant } = useTenant();
  const [selectedPeriod, setSelectedPeriod] = useState("2026-01");
  const [comparisonPeriod, setComparisonPeriod] = useState("2025-12");
  const [statementType, setStatementType] = useState("balance");
  const [accounts, setAccounts] = useState<AccountData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAccounts();
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/accounting/accounts");
      if (res.ok) {
        const data = await res.json();
        setAccounts(
          (data || []).map((a: any) => ({
            code: a.code,
            name: a.name,
            type: a.type,
            balance: Number(a.opening_balance || a.balance || 0),
          }))
        );
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
    }
    setLoading(false);
  };

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

  const assets = accounts.filter(a => a.type === "ASSET");
  const liabilities = accounts.filter(a => a.type === "LIABILITY");
  const equity = accounts.filter(a => a.type === "EQUITY");
  const revenue = accounts.filter(a => a.type === "REVENUE");
  const expenses = accounts.filter(a => a.type === "EXPENSE");

  const totalAssets = assets.reduce((sum, a) => sum + a.balance, 0);
  const totalLiabilities = liabilities.reduce((sum, a) => sum + a.balance, 0);
  const totalEquity = equity.reduce((sum, a) => sum + a.balance, 0);
  const totalRevenue = revenue.reduce((sum, a) => sum + a.balance, 0);
  const totalExpenses = expenses.reduce((sum, a) => sum + a.balance, 0);
  const netIncome = totalRevenue + totalExpenses;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Estados Financieros</h2>
        <p className="text-gray-600">
          Reportes financieros para {currentTenant?.businessName}
        </p>
      </div>

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
              <Input id="period" type="month" value={selectedPeriod} onChange={(e) => setSelectedPeriod(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="comparison">Período Comparativo</Label>
              <Input id="comparison" type="month" value={comparisonPeriod} onChange={(e) => setComparisonPeriod(e.target.value)} />
            </div>
            <div>
              <Label htmlFor="type">Tipo de Reporte</Label>
              <Select value={statementType} onValueChange={setStatementType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="balance">Balance General</SelectItem>
                  <SelectItem value="income">Estado de Resultados</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400 mr-3" />
            <span className="text-gray-500">Cargando cuentas...</span>
          </CardContent>
        </Card>
      ) : accounts.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12 text-gray-500">
            No hay cuentas configuradas en el catálogo
          </CardContent>
        </Card>
      ) : (
        <Tabs value={statementType} onValueChange={setStatementType} className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="balance" className="flex items-center space-x-2">
              <Scale className="h-4 w-4" />
              <span>Balance General</span>
            </TabsTrigger>
            <TabsTrigger value="income" className="flex items-center space-x-2">
              <FileText className="h-4 w-4" />
              <span>Estado de Resultados</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="balance">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Balance General</CardTitle>
                    <CardDescription>Estado de situación financiera al {selectedPeriod}</CardDescription>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-2 gap-8">
                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-blue-900">ACTIVO</h3>
                    <div className="space-y-3">
                      {assets.map(item => (
                        <div key={item.code} className="flex justify-between items-center">
                          <div>
                            <span className="font-mono text-sm text-gray-500 mr-2">{item.code}</span>
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-3 mt-4">
                        <div className="flex justify-between items-center font-bold text-lg">
                          <span>TOTAL ACTIVO</span>
                          <span>{formatCurrency(totalAssets)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4 text-red-900">PASIVO Y PATRIMONIO</h3>
                    <div className="space-y-3">
                      <div className="font-medium text-sm text-gray-600 mb-2">PASIVO</div>
                      {liabilities.map(item => (
                        <div key={item.code} className="flex justify-between items-center">
                          <div>
                            <span className="font-mono text-sm text-gray-500 mr-2">{item.code}</span>
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(Math.abs(item.balance))}</span>
                        </div>
                      ))}
                      <div className="font-medium text-sm text-gray-600 mb-2 mt-4">PATRIMONIO</div>
                      {equity.map(item => (
                        <div key={item.code} className="flex justify-between items-center">
                          <div>
                            <span className="font-mono text-sm text-gray-500 mr-2">{item.code}</span>
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium">{formatCurrency(Math.abs(item.balance))}</span>
                        </div>
                      ))}
                      <div className="border-t pt-3 mt-4">
                        <div className="flex justify-between items-center font-bold text-lg">
                          <span>TOTAL PASIVO + PATRIMONIO</span>
                          <span>{formatCurrency(Math.abs(totalLiabilities + totalEquity))}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-6 p-4 bg-cyan-50 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-blue-900">VERIFICACIÓN:</span>
                    <div className="flex items-center space-x-4">
                      <span className="text-cyan-700">A={formatCurrency(totalAssets)}</span>
                      <span className="text-cyan-700">P+P={formatCurrency(Math.abs(totalLiabilities + totalEquity))}</span>
                      <Badge className={Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}>
                        {Math.abs(totalAssets - (totalLiabilities + totalEquity)) < 1 ? "✓ BALANCEADO" : "✗ ERROR"}
                      </Badge>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>Estado de Resultados</CardTitle>
                    <CardDescription>Resultados del período {selectedPeriod}</CardDescription>
                  </div>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-lg font-semibold mb-4">INGRESOS</h3>
                    <div className="space-y-2">
                      {revenue.map(item => (
                        <div key={item.code} className="flex justify-between items-center">
                          <div>
                            <span className="font-mono text-sm text-gray-500 mr-2">{item.code}</span>
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium text-green-600">{formatCurrency(item.balance)}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Ingresos</span>
                          <span className="text-green-600">{formatCurrency(totalRevenue)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-lg font-semibold mb-4">GASTOS</h3>
                    <div className="space-y-2">
                      {expenses.map(item => (
                        <div key={item.code} className="flex justify-between items-center">
                          <div>
                            <span className="font-mono text-sm text-gray-500 mr-2">{item.code}</span>
                            <span>{item.name}</span>
                          </div>
                          <span className="font-medium text-red-600">{formatCurrency(Math.abs(item.balance))}</span>
                        </div>
                      ))}
                      <div className="border-t pt-2 mt-2">
                        <div className="flex justify-between items-center font-semibold">
                          <span>Total Gastos</span>
                          <span className="text-red-600">{formatCurrency(Math.abs(totalExpenses))}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-xl font-bold">
                      <span>UTILIDAD NETA</span>
                      <span className={netIncome >= 0 ? "text-green-600" : "text-red-600"}>
                        {formatCurrency(netIncome)}
                      </span>
                    </div>
                    {totalRevenue > 0 && (
                      <div className="mt-2 p-3 bg-green-50 rounded-lg">
                        <span className="font-semibold text-green-900">MARGEN NETO: </span>
                        <Badge className="bg-green-100 text-green-800">
                          {((netIncome / totalRevenue) * 100).toFixed(2)}%
                        </Badge>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}
