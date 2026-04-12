'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CreditCard, DollarSign, Calendar, Plus, Trash2, Edit } from 'lucide-react';

interface Payment {
  id: string;
  purchase_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  reference?: string;
  notes?: string;
  created_at: string;
}

interface Purchase {
  id: string;
  total: number;
  amount_paid?: number;
  balance_due?: number;
  is_credit?: boolean;
  due_date?: string;
  status?: string;
  invoice_number?: string;
  supplier_name?: string;
}

interface PaymentManagerProps {
  purchase: Purchase;
  isOpen: boolean;
  onClose: () => void;
  onPaymentUpdate: () => void;
}

const PAYMENT_METHODS = [
  { value: 'cash', label: 'Efectivo' },
  { value: 'transfer', label: 'Transferencia Bancaria' },
  { value: 'check', label: 'Cheque' },
  { value: 'card', label: 'Tarjeta de Crédito/Débito' },
  { value: 'other', label: 'Otro' },
];

export default function PaymentManager({ purchase, isOpen, onClose, onPaymentUpdate }: PaymentManagerProps) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [formData, setFormData] = useState({
    amount: '',
    payment_method: '',
    reference: '',
    notes: '',
  });
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: 'HNL',
    }).format(amount);
  };

  const loadPayments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/purchases/payments?purchaseId=${purchase.id}`);
      if (res.ok) {
        const data = await res.json();
        setPayments(data);
      }
    } catch (error) {
      console.error('Error loading payments:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && purchase.id) {
      loadPayments();
    }
  }, [isOpen, purchase.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.amount || !formData.payment_method) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    try {
      const url = editingPayment 
        ? `/api/purchases/payments?id=${editingPayment.id}`
        : '/api/purchases/payments';
      
      const method = editingPayment ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          purchase_id: purchase.id,
          amount: parseFloat(formData.amount),
          payment_method: formData.payment_method,
          reference: formData.reference || null,
          notes: formData.notes || null,
        }),
      });

      if (res.ok) {
        alert(editingPayment ? 'Pago actualizado exitosamente' : 'Pago registrado exitosamente');
        setShowPaymentForm(false);
        setEditingPayment(null);
        setFormData({ amount: '', payment_method: '', reference: '', notes: '' });
        loadPayments();
        onPaymentUpdate();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'No se pudo procesar el pago'));
      }
    } catch (error) {
      alert('Error al procesar el pago');
    }
  };

  const handleEdit = (payment: Payment) => {
    setEditingPayment(payment);
    setFormData({
      amount: payment.amount.toString(),
      payment_method: payment.payment_method,
      reference: payment.reference || '',
      notes: payment.notes || '',
    });
    setShowPaymentForm(true);
  };

  const handleDelete = async (paymentId: string) => {
    if (!confirm('¿Está seguro que desea eliminar este pago? Esta acción no se puede deshacer.')) {
      return;
    }

    try {
      const res = await fetch(`/api/purchases/payments?id=${paymentId}`, {
        method: 'DELETE',
      });

      if (res.ok) {
        alert('Pago eliminado exitosamente');
        loadPayments();
        onPaymentUpdate();
      } else {
        const error = await res.json();
        alert('Error: ' + (error.error || 'No se pudo eliminar el pago'));
      }
    } catch (error) {
      alert('Error al eliminar el pago');
    }
  };

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0);
  const remainingBalance = (purchase.total || 0) - totalPaid;
  const isFullyPaid = remainingBalance <= 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Gestión de Pagos</DialogTitle>
          <DialogDescription>
            Administra los pagos para la factura {purchase.invoice_number}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Purchase Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Resumen de Compra</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-500">Proveedor</Label>
                  <div className="font-medium">{purchase.supplier_name}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Total Factura</Label>
                  <div className="font-medium">{formatCurrency(purchase.total)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Pagado</Label>
                  <div className="font-medium text-green-600">{formatCurrency(totalPaid)}</div>
                </div>
                <div>
                  <Label className="text-gray-500">Saldo Pendiente</Label>
                  <div className={`font-medium ${isFullyPaid ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(remainingBalance)}
                  </div>
                </div>
              </div>
              <div className="mt-4">
                <Badge variant={isFullyPaid ? 'default' : 'secondary'}>
                  {isFullyPaid ? 'Pagada' : remainingBalance < purchase.total ? 'Pago Parcial' : 'Pendiente'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Payment Form */}
          {showPaymentForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  {editingPayment ? 'Editar Pago' : 'Registrar Nuevo Pago'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="amount">Monto *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        min="0"
                        max={remainingBalance}
                        value={formData.amount}
                        onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                        placeholder="0.00"
                        required
                      />
                    </div>
                    <div>
                      <Label htmlFor="payment_method">Método de Pago *</Label>
                      <Select value={formData.payment_method} onValueChange={(value) => setFormData({ ...formData, payment_method: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione método" />
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_METHODS.map((method) => (
                            <SelectItem key={method.value} value={method.value}>
                              {method.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div>
                    <Label htmlFor="reference">Referencia</Label>
                    <Input
                      id="reference"
                      value={formData.reference}
                      onChange={(e) => setFormData({ ...formData, reference: e.target.value })}
                      placeholder="# de transacción, número de cheque, etc."
                    />
                  </div>
                  <div>
                    <Label htmlFor="notes">Notas</Label>
                    <Input
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Notas adicionales"
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit">
                      {editingPayment ? 'Actualizar Pago' : 'Registrar Pago'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setShowPaymentForm(false);
                        setEditingPayment(null);
                        setFormData({ amount: '', payment_method: '', reference: '', notes: '' });
                      }}
                    >
                      Cancelar
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Payments List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg">Historial de Pagos</CardTitle>
              {!isFullyPaid && (
                <Button onClick={() => setShowPaymentForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Pago
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-4">Cargando pagos...</div>
              ) : payments.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <DollarSign className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                  <p>No hay pagos registrados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                          <Badge variant="outline">
                            {PAYMENT_METHODS.find(m => m.value === payment.payment_method)?.label || payment.payment_method}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-500">
                          {new Date(payment.payment_date).toLocaleDateString()}
                          {payment.reference && ` - Ref: ${payment.reference}`}
                        </div>
                        {payment.notes && (
                          <div className="text-sm text-gray-600 mt-1">{payment.notes}</div>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => handleEdit(payment)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleDelete(payment.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
