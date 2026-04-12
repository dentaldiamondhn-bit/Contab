"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, AlertCircle, CheckCircle, Calculator } from "lucide-react";
import { useTenant } from "@/lib/contexts/TenantContext";
import { getAccountTypeLabel, getAccountTypeColor } from "@/lib/accounting-utils";

interface JournalEntryLine {
  id: string;
  accountId: string;
  accountName: string;
  accountCode: string;
  debit: number;
  credit: number;
  description?: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: "ASSET" | "LIABILITY" | "EQUITY" | "REVENUE" | "EXPENSE";
}

const voucherTypes = [
  { value: "INGRESO", label: "Ingreso", description: "Facturas emitidas a clientes" },
  { value: "EGRESO", label: "Egreso", description: "Facturas recibidas de proveedores" },
  { value: "DIARIO", label: "Diario", description: "Ajustes y movimientos varios" },
  { value: "AJUSTE", label: "Ajuste", description: "Asientos de ajuste periodontales" },
];

const mockAccounts: Account[] = [
  { id: "1", code: "1101", name: "Caja", type: "ASSET" },
  { id: "2", code: "1102", name: "Bancos Cuenta Corriente", type: "ASSET" },
  { id: "3", code: "1201", name: "Clientes", type: "ASSET" },
  { id: "4", code: "1301", name: "Materiales Clínicos", type: "ASSET" },
  { id: "5", code: "3101", name: "Proveedores", type: "LIABILITY" },
  { id: "6", code: "3201", name: "ISV por Pagar", type: "LIABILITY" },
  { id: "7", code: "4100", name: "Capital Social", type: "EQUITY" },
  { id: "8", code: "5101", name: "Consultas Dentales", type: "REVENUE" },
  { id: "9", code: "5102", name: "Tratamientos Ortodónticos", type: "REVENUE" },
  { id: "10", code: "6101", name: "Salarios y Sueldos", type: "EXPENSE" },
  { id: "11", code: "6201", name: "Alquiler de Local", type: "EXPENSE" },
  { id: "12", code: "6203", name: "Materiales Clínicos", type: "EXPENSE" },
];

export default function JournalEntryForm() {
  const { currentTenant } = useTenant();
  const [voucherType, setVoucherType] = useState("DIARIO");
  const [voucherNumber, setVoucherNumber] = useState(1);
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [currency, setCurrency] = useState("HNL");
  const [exchangeRate, setExchangeRate] = useState(24.70);
  const [entries, setEntries] = useState<JournalEntryLine[]>([
    { id: "1", accountId: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
    { id: "2", accountId: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
  ]);

  // Calcular totales
  const totalDebit = entries.reduce((sum, entry) => sum + entry.debit, 0);
  const totalCredit = entries.reduce((sum, entry) => sum + entry.credit, 0);
  const isBalanced = Math.abs(totalDebit - totalCredit) < 0.01;

  const addEntry = () => {
    const newEntry: JournalEntryLine = {
      id: Date.now().toString(),
      accountId: "",
      accountName: "",
      accountCode: "",
      debit: 0,
      credit: 0,
    };
    setEntries([...entries, newEntry]);
  };

  const removeEntry = (id: string) => {
    if (entries.length > 2) {
      setEntries(entries.filter(entry => entry.id !== id));
    }
  };

  const updateEntry = (id: string, field: keyof JournalEntryLine, value: any) => {
    setEntries(entries.map(entry => {
      if (entry.id === id) {
        const updatedEntry = { ...entry, [field]: value };
        
        // Si se cambia el débito, poner crédito en 0 y viceversa
        if (field === 'debit' && value > 0) {
          updatedEntry.credit = 0;
        } else if (field === 'credit' && value > 0) {
          updatedEntry.debit = 0;
        }
        
        return updatedEntry;
      }
      return entry;
    }));
  };

  const selectAccount = (entryId: string, accountId: string) => {
    const account = mockAccounts.find(acc => acc.id === accountId);
    if (account) {
      updateEntry(entryId, 'accountId', accountId);
      updateEntry(entryId, 'accountName', account.name);
      updateEntry(entryId, 'accountCode', account.code);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isBalanced) {
      alert("La póliza no está balanceada. El total del débito debe igualar al total del crédito.");
      return;
    }

    if (entries.some(entry => !entry.accountId)) {
      alert("Todas las líneas deben tener una cuenta seleccionada.");
      return;
    }

    const journalEntry = {
      voucherType,
      voucherNumber,
      date,
      description,
      reference,
      currency,
      exchangeRate,
      entries: entries.filter(entry => entry.debit > 0 || entry.credit > 0),
      tenantId: currentTenant?.id,
    };

    console.log("Guardando póliza:", journalEntry);
    // Aquí iría la lógica para guardar en la base de datos
    
    // Resetear formulario
    setDescription("");
    setReference("");
    setEntries([
      { id: "1", accountId: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
      { id: "2", accountId: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
    ]);
    setVoucherNumber(voucherNumber + 1);
  };


  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Póliza de Diario</h2>
        <p className="text-gray-600">
          Registra transacciones usando el sistema de partida doble para {currentTenant?.businessName}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Información General */}
        <Card>
          <CardHeader>
            <CardTitle>Información de la Póliza</CardTitle>
            <CardDescription>
              Datos generales del comprobante contable
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="voucherType">Tipo de Póliza</Label>
                <Select value={voucherType} onValueChange={setVoucherType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {voucherTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-sm text-gray-500">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="voucherNumber">Número de Póliza</Label>
                <Input
                  id="voucherNumber"
                  type="number"
                  value={voucherNumber}
                  onChange={(e) => setVoucherNumber(parseInt(e.target.value))}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
              
              <div>
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
              
              <div>
                <Label htmlFor="currency">Moneda</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="HNL">Lempiras (HNL)</SelectItem>
                    <SelectItem value="USD">Dólares (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {currency === "USD" && (
              <div className="mt-4">
                <Label htmlFor="exchangeRate">Tipo de Cambio (1 USD = HNL)</Label>
                <Input
                  id="exchangeRate"
                  type="number"
                  step="0.01"
                  value={exchangeRate}
                  onChange={(e) => setExchangeRate(parseFloat(e.target.value))}
                />
              </div>
            )}

            <div className="mt-4">
              <Label htmlFor="description">Descripción General</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe el propósito de esta póliza..."
                rows={2}
                required
              />
            </div>

            <div className="mt-4">
              <Label htmlFor="reference">Referencia (Opcional)</Label>
              <Input
                id="reference"
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                placeholder="Número de factura, recibo, etc."
              />
            </div>
          </CardContent>
        </Card>

        {/* Líneas de la Póliza */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle>Detalles de la Póliza</CardTitle>
                <CardDescription>
                  Registra las cuentas afectadas por esta transacción
                </CardDescription>
              </div>
              <Button type="button" onClick={addEntry} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Línea
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Encabezados */}
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700 pb-2 border-b">
                <div className="col-span-4">Cuenta</div>
                <div className="col-span-1 text-center">Código</div>
                <div className="col-span-2 text-center">Tipo</div>
                <div className="col-span-2 text-right">Débito</div>
                <div className="col-span-2 text-right">Crédito</div>
                <div className="col-span-1"></div>
              </div>

              {/* Líneas de asiento */}
              {entries.map((entry, index) => (
                <div key={entry.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4">
                    <Select
                      value={entry.accountId}
                      onValueChange={(value) => selectAccount(entry.id, value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar cuenta" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockAccounts.map((account) => (
                          <SelectItem key={account.id} value={account.id}>
                            <div className="flex items-center justify-between w-full">
                              <span>{account.name}</span>
                              <Badge className={getAccountTypeColor(account.type)} variant="secondary">
                                {getAccountTypeLabel(account.type)}
                              </Badge>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="col-span-1 text-center font-mono text-sm">
                    {entry.accountCode}
                  </div>
                  
                  <div className="col-span-2 text-center">
                    {entry.accountName && (
                      <Badge className={getAccountTypeColor(mockAccounts.find(a => a.id === entry.accountId)?.type || "ASSET")} variant="secondary">
                        {getAccountTypeLabel(mockAccounts.find(a => a.id === entry.accountId)?.type || "ASSET")}
                      </Badge>
                    )}
                  </div>
                  
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={entry.debit || ""}
                      onChange={(e) => updateEntry(entry.id, 'debit', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </div>
                  
                  <div className="col-span-2">
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={entry.credit || ""}
                      onChange={(e) => updateEntry(entry.id, 'credit', parseFloat(e.target.value) || 0)}
                      className="text-right"
                    />
                  </div>
                  
                  <div className="col-span-1">
                    {entries.length > 2 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeEntry(entry.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Totales y Validación */}
            <div className="mt-6 pt-4 border-t">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total Débito:</div>
                  <div className="text-xl font-bold">
                    {totalDebit.toLocaleString("es-HN", { style: "currency", currency: currency })}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600">Total Crédito:</div>
                  <div className="text-xl font-bold">
                    {totalCredit.toLocaleString("es-HN", { style: "currency", currency: currency })}
                  </div>
                </div>
              </div>

              {/* Alerta de balance */}
              <div className="mt-4">
                {isBalanced ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      La póliza está correctamente balanceada. Débito = Crédito
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <AlertDescription className="text-red-800">
                      La póliza no está balanceada. Diferencia: {Math.abs(totalDebit - totalCredit).toLocaleString("es-HN", { style: "currency", currency: currency })}
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Botones de Acción */}
        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
          <Button type="submit" disabled={!isBalanced || entries.some(e => !e.accountId)}>
            <Calculator className="h-4 w-4 mr-2" />
            Guardar Póliza
          </Button>
        </div>
      </form>
    </div>
  );
}
