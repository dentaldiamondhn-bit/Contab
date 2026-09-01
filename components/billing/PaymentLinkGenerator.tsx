'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  QrCode,
  Link,
  Copy,
  Upload,
  CheckCircle,
  AlertTriangle,
  Banknote,
  Smartphone,
  Download,
  Share2
} from 'lucide-react';
import QRCodeLib from 'qrcode';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountType: string;
  accountHolder: string;
  currency: 'HNL' | 'USD';
  isActive: boolean;
}

interface PaymentLink {
  id: string;
  invoiceNumber: string;
  amount: number;
  currency: 'HNL' | 'USD';
  bankAccount: BankAccount;
  paymentUrl: string;
  qrCode: string;
  status: 'pending' | 'completed' | 'expired';
  createdAt: string;
  expiresAt: string;
  receiptUrl?: string;
}

interface PaymentLinkGeneratorProps {
  invoiceId: string;
  invoiceNumber: string;
  totalAmount: number;
  currency: 'HNL' | 'USD';
  onPaymentCompleted?: (paymentLink: PaymentLink) => void;
}

export default function PaymentLinkGenerator({
  invoiceId,
  invoiceNumber,
  totalAmount,
  currency,
  onPaymentCompleted
}: PaymentLinkGeneratorProps) {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [selectedBank, setSelectedBank] = useState<BankAccount | null>(null);
  const [paymentLink, setPaymentLink] = useState<PaymentLink | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [showCopied, setShowCopied] = useState(false);

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    try {
      const response = await fetch('/api/billing/bank-accounts');
      if (response.ok) {
        const data = await response.json();
        setBankAccounts(data.filter((acc: BankAccount) => acc.isActive && acc.currency === currency));
      }
    } catch (error) {
      console.error('Error loading bank accounts:', error);
    }
  };

  const generatePaymentLink = async () => {
    if (!selectedBank) {
      alert('Por favor seleccione una cuenta bancaria');
      return;
    }

    setLoading(true);
    try {
      // Crear URL de pago con parámetros
      const baseUrl = window.location.origin;
      const paymentUrl = `${baseUrl}/payment/${invoiceId}?amount=${totalAmount}&bank=${selectedBank.id}&invoice=${invoiceNumber}`;
      
      // Generar QR code
      const qrCodeDataUrl = await QRCodeLib.toDataURL(paymentUrl, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#ffffff'
        }
      });

      // Crear enlace de pago
      const response = await fetch('/api/billing/payment-links', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          invoiceId,
          invoiceNumber,
          amount: totalAmount,
          currency,
          bankAccountId: selectedBank.id,
          paymentUrl,
          qrCode: qrCodeDataUrl
        })
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentLink(data);
      } else {
        throw new Error('Error al generar enlace de pago');
      }
    } catch (error) {
      console.error('Error generating payment link:', error);
      alert('Error al generar enlace de pago');
    } finally {
      setLoading(false);
    }
  };

  const copyPaymentLink = async () => {
    if (paymentLink) {
      await navigator.clipboard.writeText(paymentLink.paymentUrl);
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
      formData.append('paymentLinkId', paymentLink!.id);

      const response = await fetch('/api/billing/payment-receipts', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        setPaymentLink(prev => prev ? { ...prev, status: 'completed', receiptUrl: data.receiptUrl } : null);
        onPaymentCompleted?.(paymentLink!);
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

  const downloadQRCode = () => {
    if (paymentLink) {
      const link = document.createElement('a');
      link.download = `QR-Pago-${invoiceNumber}.png`;
      link.href = paymentLink.qrCode;
      link.click();
    }
  };

  const sharePaymentLink = async () => {
    if (paymentLink) {
      if (navigator.share) {
        await navigator.share({
          title: `Pago de Factura ${invoiceNumber}`,
          text: `Realiza el pago de tu factura ${invoiceNumber} por L ${totalAmount.toFixed(2)}`,
          url: paymentLink.paymentUrl
        });
      } else {
        await copyPaymentLink();
      }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('es-HN', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 2
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Generador de Enlace */}
      {!paymentLink && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Link className="h-5 w-5 mr-2" />
              Generar Enlace de Pago
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bankAccount">Cuenta Bancaria</Label>
                <Select onValueChange={(value) => {
                  const bank = bankAccounts.find(b => b.id === value);
                  setSelectedBank(bank || null);
                }}>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar cuenta bancaria" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map(bank => (
                      <SelectItem key={bank.id} value={bank.id}>
                        <div>
                          <div className="font-medium">{bank.bankName}</div>
                          <div className="text-sm text-gray-600">
                            {bank.accountNumber} - {bank.accountType}
                          </div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Monto a Pagar</Label>
                <div className="p-3 bg-gray-50 rounded-lg">
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(totalAmount)}</p>
                  <p className="text-sm text-gray-600">Factura {invoiceNumber}</p>
                </div>
              </div>
            </div>

            {selectedBank && (
              <Card className="bg-cyan-50 border-cyan-200">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-blue-900">Cuenta Seleccionada</p>
                      <p className="text-sm text-cyan-700">{selectedBank.bankName}</p>
                      <p className="text-sm text-cyan-600">
                        {selectedBank.accountHolder} - {selectedBank.accountNumber}
                      </p>
                    </div>
                    <Banknote className="h-8 w-8 text-cyan-600" />
                  </div>
                </CardContent>
              </Card>
            )}

            <Button 
              onClick={generatePaymentLink} 
              disabled={!selectedBank || loading}
              className="w-full"
            >
              <QrCode className="h-4 w-4 mr-2" />
              {loading ? 'Generando...' : 'Generar Enlace y QR'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Enlace Generado */}
      {paymentLink && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center">
                <QrCode className="h-5 w-5 mr-2" />
                Enlace de Pago Generado
              </span>
              <Badge variant={
                paymentLink.status === 'completed' ? 'default' : 
                paymentLink.status === 'expired' ? 'destructive' : 'secondary'
              }>
                {paymentLink.status === 'pending' ? 'Pendiente' : 
                 paymentLink.status === 'completed' ? 'Completado' : 'Expirado'}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* QR Code */}
            <div className="flex flex-col items-center space-y-4">
              <div className="p-4 bg-white border-2 border-gray-200 rounded-lg">
                <img 
                  src={paymentLink.qrCode} 
                  alt="QR Code de Pago" 
                  className="w-64 h-64"
                />
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-600 mb-2">
                  Escanea este código QR para pagar
                </p>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" onClick={downloadQRCode}>
                    <Download className="h-4 w-4 mr-2" />
                    Descargar QR
                  </Button>
                  <Button variant="outline" size="sm" onClick={sharePaymentLink}>
                    <Share2 className="h-4 w-4 mr-2" />
                    Compartir
                  </Button>
                </div>
              </div>
            </div>

            {/* Información de Pago */}
            <Card className="bg-gray-50">
              <CardContent className="p-4">
                <h4 className="font-medium mb-3">Información de Transferencia</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Banco:</span>
                    <span className="font-medium">{paymentLink.bankAccount.bankName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Titular:</span>
                    <span className="font-medium">{paymentLink.bankAccount.accountHolder}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Cuenta:</span>
                    <span className="font-medium">{paymentLink.bankAccount.accountNumber}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Tipo:</span>
                    <span className="font-medium">{paymentLink.bankAccount.accountType}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Monto:</span>
                    <span className="font-bold text-lg">{formatCurrency(paymentLink.amount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Referencia:</span>
                    <span className="font-medium">{paymentLink.invoiceNumber}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Enlace Directo */}
            <div>
              <Label className="text-sm font-medium">Enlace de Pago Directo</Label>
              <div className="flex space-x-2 mt-1">
                <Input 
                  value={paymentLink.paymentUrl} 
                  readOnly 
                  className="font-mono text-sm"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={copyPaymentLink}
                >
                  {showCopied ? (
                    <CheckCircle className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
              {showCopied && (
                <p className="text-xs text-green-600 mt-1">¡Enlace copiado!</p>
              )}
            </div>

            {/* Subida de Comprobante */}
            {paymentLink.status === 'pending' && (
              <Card className="border-orange-200 bg-orange-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center">
                    <Upload className="h-5 w-5 mr-2" />
                    Subir Comprobante de Pago
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="receipt" className="text-sm">
                        Adjunta el comprobante de transferencia bancaria
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
                      <div className="flex items-center space-x-2 text-sm text-cyan-600">
                        <AlertTriangle className="h-4 w-4" />
                        <span>Procesando comprobante...</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Estado del Pago */}
            {paymentLink.status === 'completed' && (
              <Card className="border-green-200 bg-green-50">
                <CardContent className="p-4">
                  <div className="flex items-center space-x-3">
                    <CheckCircle className="h-6 w-6 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Pago Completado</p>
                      <p className="text-sm text-green-700">
                        El comprobante ha sido verificado y el pago está registrado.
                      </p>
                      {paymentLink.receiptUrl && (
                        <Button variant="outline" size="sm" className="mt-2">
                          <Download className="h-4 w-4 mr-2" />
                          Ver Comprobante
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
