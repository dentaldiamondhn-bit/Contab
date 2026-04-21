'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowLeft, 
  Upload,
  CheckCircle,
  AlertTriangle,
  Banknote,
  Smartphone,
  QrCode,
  Copy
} from 'lucide-react';

interface PaymentData {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: 'HNL' | 'USD';
  bankAccount: {
    bankName: string;
    accountNumber: string;
    accountType: string;
    accountHolder: string;
  };
  paymentUrl: string;
  qrCode: string;
  status: 'pending' | 'completed' | 'expired';
  expiresAt: string;
}

export default function PaymentPage() {
  const params = useParams();
  const router = useRouter();
  const invoiceId = params.invoiceId as string;

  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    loadPaymentData();
  }, [invoiceId]);

  const loadPaymentData = async () => {
    try {
      const response = await fetch(`/api/billing/payment-links?invoiceId=${invoiceId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.length > 0) {
          setPaymentData(data[0]);
        }
      }
    } catch (error) {
      console.error('Error loading payment data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyPaymentLink = async () => {
    if (paymentData) {
      await navigator.clipboard.writeText(paymentData.paymentUrl);
      setShowCopied(true);
      setTimeout(() => setShowCopied(false), 2000);
    }
  };

  const handleReceiptUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFile(file);
      await uploadReceipt(file);
    }
  };

  const uploadReceipt = async (file: File) => {
    setUploadingReceipt(true);
    try {
      const formData = new FormData();
      formData.append('receipt', file);
      formData.append('paymentLinkId', paymentData!.id);

      const response = await fetch('/api/billing/payment-receipts', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentData(prev => prev ? { ...prev, status: 'completed' } : null);
      } else {
        throw new Error('Error al subir comprobante');
      }
    } catch (error) {
      console.error('Error uploading receipt:', error);
      alert('Error al subir comprobante');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: paymentData?.currency || 'HNL',
      minimumFractionDigits: 2
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p>Cargando información de pago...</p>
        </div>
      </div>
    );
  }

  if (!paymentData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="h-12 w-12 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Enlace no válido</h2>
            <p className="text-gray-600 mb-4">
              Este enlace de pago no existe o ha expirado.
            </p>
            <Button onClick={() => router.push('/')}>
              Volver al inicio
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b shadow-sm">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.back()}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver
            </Button>
            <div className="flex items-center space-x-3">
              <QrCode className="h-6 w-6 text-blue-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Pagar Factura</h1>
                <p className="text-gray-600">Factura {paymentData.invoiceNumber}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Columna Izquierda - QR y Enlace */}
          <div className="space-y-6">
            {/* QR Code */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Smartphone className="h-5 w-5 mr-2" />
                  Escanear para Pagar
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-center">
                  <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                    <img 
                      src={paymentData.qrCode} 
                      alt="QR Code de Pago" 
                      className="w-64 h-64"
                    />
                  </div>
                </div>
                
                <div className="text-center">
                  <p className="text-sm text-gray-600 mb-2">
                    Escanea este código QR con tu app bancaria
                  </p>
                  <Button variant="outline" size="sm" onClick={copyPaymentLink}>
                    {showCopied ? (
                      <CheckCircle className="h-4 w-4 mr-2" />
                    ) : (
                      <Copy className="h-4 w-4 mr-2" />
                    )}
                    Copiar Enlace
                  </Button>
                  {showCopied && (
                    <p className="text-xs text-green-600 mt-1">¡Enlace copiado!</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Estado del Pago */}
            <Card className={paymentData.status === 'completed' ? 'border-green-200 bg-green-50' : 'border-orange-200 bg-orange-50'}>
              <CardContent className="p-4">
                <div className="flex items-center space-x-3">
                  {paymentData.status === 'completed' ? (
                    <CheckCircle className="h-6 w-6 text-green-600" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-orange-600" />
                  )}
                  <div>
                    <p className={`font-medium ${paymentData.status === 'completed' ? 'text-green-900' : 'text-orange-900'}`}>
                      {paymentData.status === 'completed' ? 'Pago Completado' : 'Pago Pendiente'}
                    </p>
                    <p className={`text-sm ${paymentData.status === 'completed' ? 'text-green-700' : 'text-orange-700'}`}>
                      {paymentData.status === 'completed' 
                        ? 'Tu pago ha sido procesado exitosamente.'
                        : `Vence el ${new Date(paymentData.expiresAt).toLocaleDateString()}`
                      }
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Columna Derecha - Información de Pago */}
          <div className="space-y-6">
            {/* Resumen del Pago */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Banknote className="h-5 w-5 mr-2" />
                  Resumen del Pago
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <p className="text-sm text-blue-600 mb-1">Monto a pagar</p>
                    <p className="text-3xl font-bold text-blue-900">
                      {formatCurrency(paymentData.amount)}
                    </p>
                    <p className="text-sm text-blue-600">Factura {paymentData.invoiceNumber}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Información Bancaria */}
            <Card>
              <CardHeader>
                <CardTitle>Información de Transferencia</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Banco:</span>
                    <span className="font-medium">{paymentData.bankAccount.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Titular:</span>
                    <span className="font-medium">{paymentData.bankAccount.accountHolder}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuenta:</span>
                    <span className="font-medium">{paymentData.bankAccount.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium">{paymentData.bankAccount.accountType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Referencia:</span>
                    <span className="font-medium">{paymentData.invoiceNumber}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Subir Comprobante */}
            {paymentData.status === 'pending' && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Subir Comprobante
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="receipt" className="text-sm">
                        Adjunta el comprobante de tu transferencia
                      </Label>
                      <Input
                        id="receipt"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={handleReceiptUpload}
                        disabled={uploadingReceipt}
                        className="mt-1"
                      />
                    </div>
                    {receiptFile && (
                      <div className="flex items-center space-x-2 text-sm text-green-600">
                        <CheckCircle className="h-4 w-4" />
                        <span>Comprobante cargado: {receiptFile.name}</span>
                      </div>
                    )}
                    {uploadingReceipt && (
                      <div className="flex items-center space-x-2 text-sm text-blue-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Procesando comprobante...</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Instrucciones */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-2">Instrucciones de Pago:</h4>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Escanea el código QR con tu app bancaria</li>
                  <li>O realiza una transferencia a la cuenta indicada</li>
                  <li>Usa el número de factura como referencia</li>
                  <li>Sube el comprobante de pago aquí mismo</li>
                  <li>Espera la confirmación del pago</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
