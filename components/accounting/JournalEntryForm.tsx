"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Plus, Trash2, AlertCircle, CheckCircle, Calculator, Loader2 } from "lucide-react";
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

export default function JournalEntryForm() {
  const { currentTenant } = useTenant();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  const [saving, setSaving] = useState(false);
  const [accountSearch, setAccountSearch] = useState("");
  const [showAccountSelector, setShowAccountSelector] = useState<number | null>(null);

  const [voucherType, setVoucherType] = useState("DIARIO");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState("");
  const [reference, setReference] = useState("");
  const [currency, setCurrency] = useState("HNL");
  const [entries, setEntries] = useState<JournalEntryLine[]>([
    { id: "1", accountId: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
    { id: "2", accountId: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
  ]);

  const tenantId = currentTenant?.id || "";
  const [accountsError, setAccountsError] = useState<string | null>(null);

  useEffect(() => {
    if (tenantId) loadAccounts(tenantId);
    else {
      setAccounts([]);
      setLoadingAccounts(false);
    }
  }, [tenantId]);

  const loadAccounts = async (tid: string) => {
    setLoadingAccounts(true);
    setAccountsError(null);
    try {
      const res = await fetch(`/api/accounting/accounts?tenantId=${encodeURIComponent(tid)}`, {
        headers: { "x-tenant-id": tid },
      });
      if (res.ok) {
        const data = await res.json();
        setAccounts(
          (data || []).map((a: any) => ({
            id: a.id || a.code,
            code: a.code,
            name: a.name,
            type: a.type,
          }))
        );
      } else {
        const err = await res.json().catch(() => ({}));
        setAccountsError(err.error || "No se pudieron cargar las cuentas");
      }
    } catch (error) {
      console.error("Error loading accounts:", error);
      setAccountsError("No se pudieron cargar las cuentas");
    }
    setLoadingAccounts(false);
  };

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

  const selectAccount = (entryId: string, account: Account) => {
    updateEntry(entryId, 'accountId', account.id || account.code);
    updateEntry(entryId, 'accountName', account.name);
    updateEntry(entryId, 'accountCode', account.code);
    setShowAccountSelector(null);
    setAccountSearch("");
  };

  const filteredAccounts = accounts.filter(a =>
    a.code?.toLowerCase().includes(accountSearch.toLowerCase()) ||
    a.name?.toLowerCase().includes(accountSearch.toLowerCase())
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!tenantId) {
      alert("Seleccione una empresa/tenant antes de guardar la póliza.");
      return;
    }

    if (!isBalanced) {
      alert("La póliza no está balanceada. El total del débito debe igualar al total del crédito.");
      return;
    }

    if (entries.some(entry => !entry.accountId)) {
      alert("Todas las líneas deben tener una cuenta seleccionada.");
      return;
    }

    setSaving(true);
    try {
      const validEntries = entries.filter(e => e.debit > 0 || e.credit > 0);

      const journalEntries = validEntries.map(entry => ({
        accountId: entry.accountId,
        amount: entry.debit > 0 ? entry.debit : -entry.credit,
        isDebit: entry.debit > 0,
        description: entry.description || description,
      }));

      const payload = {
        description,
        date,
        currency,
        exchangeRate: 24.70,
        voucherType,
        tenantId: currentTenant?.id,
        entries: journalEntries,
      };

      const res = await fetch(`/api/accounting/transactions?tenantId=${encodeURIComponent(tenantId)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-tenant-id": tenantId },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved = await res.json().catch(() => null);
        const voucher = saved?.transaction?.voucherNumber
          ? ` (Póliza N° ${saved.transaction.voucherNumber})`
          : "";
        alert(`Póliza guardada exitosamente${voucher}`);
        setDescription("");
        setReference("");
        setEntries([
          { id: "1", accountId: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
          { id: "2", accountId: "", accountName: "", accountCode: "", debit: 0, credit: 0 },
        ]);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(`Error al guardar: ${err.error || "Error desconocido"}`);
      }
    } catch (error) {
      console.error("Error saving journal entry:", error);
      alert("Error al guardar la póliza");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Póliza Contable</h2>
        <p className="text-gray-600">
          Registra transacciones usando el sistema de partida doble para {currentTenant?.businessName}
        </p>
      </div>

      {!tenantId && (
        <Alert className="bg-yellow-50 border-yellow-200">
          <AlertCircle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            Seleccione una empresa para cargar el catálogo de cuentas y guardar pólizas.
          </AlertDescription>
        </Alert>
      )}
      {accountsError && (
        <Alert className="bg-red-50 border-red-200">
          <AlertCircle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">{accountsError}</AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
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
                <select
                  id="voucherType"
                  value={voucherType}
                  onChange={(e) => setVoucherType(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm mt-1"
                >
                  {voucherTypes.map(vt => (
                    <option key={vt.value} value={vt.value}>{vt.label} - {vt.description}</option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <Label htmlFor="currency">Moneda</Label>
                <select
                  id="currency"
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full px-3 py-2 border rounded-md text-sm mt-1"
                >
                  <option value="HNL">HNL - Lempira</option>
                  <option value="USD">USD - Dólar</option>
                </select>
              </div>
              <div>
                <Label htmlFor="reference">Referencia</Label>
                <Input
                  id="reference"
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                  placeholder="Opcional"
                  className="mt-1"
                />
              </div>
            </div>
            <div className="mt-4">
              <Label htmlFor="description">Descripción / Concepto *</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción de la transacción"
                className="mt-1"
                required
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Líneas del Asiento</CardTitle>
                <CardDescription>
                  {loadingAccounts ? "Cargando cuentas..." : `${accounts.length} cuentas disponibles`}
                </CardDescription>
              </div>
              <Button type="button" onClick={addEntry} variant="outline" size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Agregar Línea
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700 pb-2 border-b">
                <div className="col-span-4">Cuenta</div>
                <div className="col-span-1 text-center">Código</div>
                <div className="col-span-2 text-center">Tipo</div>
                <div className="col-span-2 text-right">Débito</div>
                <div className="col-span-2 text-right">Crédito</div>
                <div className="col-span-1"></div>
              </div>

              {entries.map((entry, index) => (
                <div key={entry.id} className="grid grid-cols-12 gap-4 items-center">
                  <div className="col-span-4 relative">
                    <Input
                      value={`${entry.accountCode} ${entry.accountName}`}
                      onClick={() => setShowAccountSelector(index)}
                      readOnly
                      placeholder={loadingAccounts ? "Cargando cuentas..." : "Seleccionar cuenta"}
                      className="cursor-pointer text-sm"
                    />
                    {showAccountSelector === index && (
                      <div className="absolute z-50 top-full left-0 mt-1 w-96 bg-white border rounded-lg shadow-lg max-h-60 overflow-auto">
                        <div className="p-2 border-b sticky top-0 bg-white">
                          <Input
                            value={accountSearch}
                            onChange={(e) => setAccountSearch(e.target.value)}
                            placeholder="Buscar por código o nombre..."
                            className="text-sm"
                            autoFocus
                          />
                        </div>
                        {filteredAccounts.slice(0, 30).map(acc => (
                          <div
                            key={acc.id}
                            className="px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm flex items-center justify-between"
                            onClick={() => selectAccount(entry.id, acc)}
                          >
                            <div>
                              <span className="font-mono font-medium">{acc.code}</span>
                              <span className="ml-2 text-gray-600">{acc.name}</span>
                            </div>
                            <Badge className={getAccountTypeColor(acc.type)} variant="secondary">
                              {getAccountTypeLabel(acc.type)}
                            </Badge>
                          </div>
                        ))}
                        {filteredAccounts.length === 0 && (
                          <div className="px-3 py-4 text-center text-gray-400 text-sm">
                            No se encontraron cuentas
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="col-span-1 text-center font-mono text-sm">
                    {entry.accountCode}
                  </div>

                  <div className="col-span-2 text-center">
                    {entry.accountName && (
                      <Badge
                        className={getAccountTypeColor(accounts.find(a => (a.id || a.code) === entry.accountId)?.type || "ASSET")}
                        variant="secondary"
                      >
                        {getAccountTypeLabel(accounts.find(a => (a.id || a.code) === entry.accountId)?.type || "ASSET")}
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

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Cancelar
          </Button>
          <Button type="submit" disabled={!isBalanced || entries.some(e => !e.accountId) || saving}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Calculator className="h-4 w-4 mr-2" />
            )}
            {saving ? "Guardando..." : "Guardar Póliza"}
          </Button>
        </div>
      </form>
    </div>
  );
}
