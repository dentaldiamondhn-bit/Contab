"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Plus, 
  Save, 
  X, 
  FileText,
  Calculator,
  User
} from "lucide-react";
import { createSupabaseClient } from "@/lib/supabase/client";
import { calculateTaxBreakdown, toCents } from "@/lib/accounting-utils";

interface InvoiceFormProps {
  tenantId: string;
  onSuccess?: () => void;
  onCancel?: () => void;
}

interface Customer {
  id: string;
  rtn: string;
  name: string;
  email?: string;
  phone?: string;
}

interface Account {
  id: string;
  code: string;
  name: string;
  type: string;
}

interface InvoiceItem {
  id: string;
  accountId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  taxRate: number; // Allow any tax rate, not just 0.15 | 0.18
  taxAmount: number;
  totalAmount: number;
}

export default function InvoiceForm({ tenantId, onSuccess, onCancel }: InvoiceFormProps) {
  const [formData, setFormData] = useState({
    customerId: "",
    invoiceNumber: "",
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    notes: "",
    status: "DRAFT" as "DRAFT" | "SENT" | "PAID" | "OVERDUE" | "CANCELLED"
  });

  const [items, setItems] = useState<InvoiceItem[]>([
    {
      id: crypto.randomUUID(),
      accountId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 0.15,
      taxAmount: 0,
      totalAmount: 0
    }
  ]);

  const [customers, setCustomers] = useState<Customer[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(false);
  const [totals, setTotals] = useState({
    subtotal: 0,
    taxAmount: 0,
    totalAmount: 0
  });

  const supabase = createSupabaseClient();

  // Cargar datos
  useEffect(() => {
    loadCustomers();
    loadAccounts();
  }, [tenantId]);

  // Calcular totales cuando cambian los items
  useEffect(() => {
    const subtotal = items.reduce((sum, item) => sum + item.totalAmount, 0);
    const taxAmount = items.reduce((sum, item) => sum + item.taxAmount, 0);
    const totalAmount = subtotal + taxAmount;

    setTotals({ subtotal, taxAmount, totalAmount });
  }, [items]);

  const loadCustomers = async () => {
    const { data } = await supabase
      .from("Customer")
      .select("id, rtn, name, email, phone")
      .eq("tenantId", tenantId)
      .eq("isActive", true)
      .order("name");
    
    if (data) setCustomers(data);
  };

  const loadAccounts = async () => {
    const { data } = await supabase
      .from("Account")
      .select("id, code, name, type")
      .eq("tenantId", tenantId)
      .eq("isActive", true)
      .eq("type", "REVENUE")
      .order("code");
    
    if (data) setAccounts(data);
  };

  const addItem = () => {
    setItems([...items, {
      id: crypto.randomUUID(),
      accountId: "",
      description: "",
      quantity: 1,
      unitPrice: 0,
      taxRate: 0.15,
      taxAmount: 0,
      totalAmount: 0
    }]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(item => item.id !== id));
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: any) => {
    setItems(items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        // Recalcular montos si cambia precio o cantidad
        if (field === 'unitPrice' || field === 'quantity') {
          const subtotal = updated.quantity * updated.unitPrice;
          const taxBreakdown = calculateTaxBreakdown(toCents(subtotal), updated.taxRate as 0.15 | 0.18);
          updated.taxAmount = taxBreakdown.taxAmount;
          updated.totalAmount = taxBreakdown.totalWithTax;
        }
        
        return updated;
      }
      return item;
    }));
  };

  const generateInvoiceNumber = async () => {
    const { data } = await supabase
      .from("Invoice")
      .select("invoiceNumber")
      .eq("tenantId", tenantId)
      .order("invoiceNumber", { ascending: false })
      .limit(1);
    
    const invoices = (data || []) as any[];
    const lastNumber = invoices[0]?.invoiceNumber || 0;
    const nextNumber = `INV-${String(lastNumber + 1).padStart(6, '0')}`;
    
    setFormData({ ...formData, invoiceNumber: nextNumber });
    return nextNumber;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (!formData.customerId || !formData.invoiceNumber || items.length === 0) {
        alert("Por favor complete todos los campos requeridos");
        return;
      }

      // Validar que todos los items tengan cuenta
      const invalidItems = items.filter(item => !item.accountId || !item.description);
      if (invalidItems.length > 0) {
        alert("Todos los items deben tener cuenta y descripción");
        return;
      }

      // Crear factura
      const { data: invoice, error: invoiceError } = await (supabase as any).from("Invoice").insert({
        tenantId,
        customerId: formData.customerId,
        invoiceNumber: formData.invoiceNumber,
        date: formData.date,
        dueDate: formData.dueDate,
        subtotal: totals.subtotal,
        taxAmount: totals.taxAmount,
        totalAmount: totals.totalAmount,
        status: formData.status,
        notes: formData.notes
      }).select("id").single();

      if (invoiceError) throw invoiceError;

      // Crear items de la factura
      const invoiceItems = items.map(item => ({
        invoiceId: invoice.id,
        accountId: item.accountId,
        description: item.description,
        quantity: item.quantity,
        unitPrice: toCents(item.unitPrice),
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        totalAmount: item.totalAmount
      }));

      const { error: itemsError } = await (supabase as any).from("InvoiceItem").insert(invoiceItems);

      if (itemsError) throw itemsError;

      // Crear cuenta por cobrar
      const { error: receivableError } = await (supabase as any).from("AccountReceivable").insert({
        tenantId,
        customerId: formData.customerId,
        invoiceId: invoice.id,
        amount: totals.totalAmount,
        dueDate: formData.dueDate,
        status: 'PENDING'
      });

      if (receivableError) throw receivableError;

      alert(`Factura ${formData.invoiceNumber} creada exitosamente`);
      
      // Reset form
      setFormData({
        customerId: "",
        invoiceNumber: "",
        date: new Date().toISOString().split('T')[0],
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        notes: "",
        status: "DRAFT"
      });
      setItems([{
        id: crypto.randomUUID(),
        accountId: "",
        description: "",
        quantity: 1,
        unitPrice: 0,
        taxRate: 0.15,
        taxAmount: 0,
        totalAmount: 0
      }]);
      
      onSuccess?.();
    } catch (error: any) {
      console.error("Error creating invoice:", error);
      alert(error.message || "Error al crear la factura");
    } finally {
      setLoading(false);
    }
  };

  const selectedCustomer = customers.find(c => c.id === formData.customerId);

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <div className="flex items-center space-x-2">
          <FileText className="h-6 w-6 text-blue-600" />
          <CardTitle className="text-2xl">Nueva Factura</CardTitle>
        </div>
        <CardDescription>
          Crea facturas con cálculo automático de impuestos y control de cuentas por cobrar
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Datos del Cliente */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="customer">Cliente *</Label>
              <Select
                value={formData.customerId}
                onValueChange={(value) => setFormData({ ...formData, customerId: value })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Seleccione el cliente" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      {customer.rtn} - {customer.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedCustomer && (
                <div className="mt-2 p-2 bg-gray-50 rounded text-sm">
                  <p><strong>Email:</strong> {selectedCustomer.email || 'N/A'}</p>
                  <p><strong>Teléfono:</strong> {selectedCustomer.phone || 'N/A'}</p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoiceNumber">Número de Factura *</Label>
              <div className="flex space-x-2">
                <Input
                  id="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                  placeholder="INV-000001"
                  required
                />
                <Button type="button" variant="outline" onClick={generateInvoiceNumber}>
                  <Calculator className="h-4 w-4 mr-2" />
                  Auto
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Estado</Label>
              <Select
                value={formData.status}
                onValueChange={(value) => setFormData({ ...formData, status: value as any })}
              >
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DRAFT">Borrador</SelectItem>
                  <SelectItem value="SENT">Enviada</SelectItem>
                  <SelectItem value="PAID">Pagada</SelectItem>
                  <SelectItem value="OVERDUE">Vencida</SelectItem>
                  <SelectItem value="CANCELLED">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Fecha de Emisión *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="dueDate">Fecha de Vencimiento *</Label>
              <Input
                id="dueDate"
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Items de la Factura */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Label className="text-lg font-semibold">Items de la Factura</Label>
              <Button type="button" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4 mr-2" />
                Agregar Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cuenta Contable
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Descripción
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cantidad
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Precio Unitario
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      ISV
                    </th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="px-4 py-2">
                        <Select
                          value={item.accountId}
                          onValueChange={(value) => updateItem(item.id, 'accountId', value)}
                        >
                          <SelectTrigger className="bg-white">
                            <SelectValue placeholder="Cuenta" />
                          </SelectTrigger>
                          <SelectContent>
                            {accounts.map((account) => (
                              <SelectItem key={account.id} value={account.id}>
                                {account.code} - {account.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          value={item.description}
                          onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                          placeholder="Descripción del item"
                          className="w-full"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.quantity}
                          onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                          className="w-24"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                          className="w-32"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        L. {(item.taxAmount / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-right font-medium">
                        L. {(item.totalAmount / 100).toFixed(2)}
                      </td>
                      <td className="px-4 py-2 text-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeItem(item.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Totales */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Subtotal:</span>
                <div className="text-xl font-bold">L. {(totals.subtotal / 100).toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">ISV:</span>
                <div className="text-xl font-bold text-blue-600">L. {(totals.taxAmount / 100).toFixed(2)}</div>
              </div>
              <div>
                <span className="text-gray-600">Total:</span>
                <div className="text-xl font-bold text-green-600">L. {(totals.totalAmount / 100).toFixed(2)}</div>
              </div>
            </div>
          </div>

          {/* Notas */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notas</Label>
            <Textarea
              id="notes"
              placeholder="Notas adicionales de la factura..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          {/* Botones */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <Button type="button" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              <Save className="h-4 w-4 mr-2" />
              {loading ? "Guardando..." : "Guardar Factura"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
