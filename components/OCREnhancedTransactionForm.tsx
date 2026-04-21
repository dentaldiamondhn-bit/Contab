'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  ArrowRight
} from 'lucide-react';
import { ExtractedInvoiceData } from '@/lib/services/ocr-service';
import { validateRTN, formatCurrency } from '@/lib/currency-utils';
import { createTransaction } from '@/lib/actions/transaction';

interface OCREnhancedTransactionFormProps {
  onTransactionCreated?: () => void;
}

export default function OCREnhancedTransactionForm({ 
  onTransactionCreated 
}: OCREnhancedTransactionFormProps) {
  const [extractedData, setExtractedData] = useState<ExtractedInvoiceData | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: '',
    description: '',
    supplierName: '',
    supplierRTN: '',
    totalAmount: '',
    reference: '',
  });

  // Update form when OCR data is extracted
  useEffect(() => {
    if (extractedData) {
      setFormData({
        date: extractedData.date || '',
        description: extractedData.supplierName ? `Factura de ${extractedData.supplierName}` : '',
        supplierName: extractedData.supplierName || '',
        supplierRTN: extractedData.supplierRTN || '',
        totalAmount: extractedData.totalAmount ? (extractedData.totalAmount * 100).toString() : '', // Convert to cents
        reference: '',
      });
    }
  }, [extractedData]);

  // Handle OCR data extraction
  const handleDataExtracted = (data: ExtractedInvoiceData) => {
    setExtractedData(data);
    setError(null);
    setSuccess(false);
  };

  // Create transaction with extracted data
  const handleCreateTransaction = async (data: ExtractedInvoiceData) => {
    try {
      setIsCreating(true);
      setError(null);

      // Convert amount to cents for the transaction
      const totalAmountCents = Math.round((data.totalAmount || 0) * 100);
      
      // Create transaction data
      const transactionData = {
        date: data.date || new Date().toISOString().split('T')[0],
        description: data.supplierName ? `Factura de ${data.supplierName}` : 'Transacción desde OCR',
        voucherType: 'EGRESO' as const, // Assume expense for invoices
        reference: data.supplierRTN || '',
        entries: [
          // Expense entry (debit)
          {
            accountId: '', // Will need to be mapped to actual expense account
            amount: totalAmountCents,
            description: data.supplierName || 'Gasto desde factura',
          },
          // Payment method entry (credit)
          {
            accountId: '', // Will need to be mapped to actual payment account
            amount: -totalAmountCents,
            description: 'Pago de factura',
          }
        ]
      };

      await createTransaction(transactionData);
      setSuccess(true);
      onTransactionCreated?.();
      
      // Reset form after delay
      setTimeout(() => {
        setExtractedData(null);
        setFormData({
          date: '',
          description: '',
          supplierName: '',
          supplierRTN: '',
          totalAmount: '',
          reference: '',
        });
        setSuccess(false);
      }, 3000);
      
    } catch (err) {
      setError('Error al crear la transacción. Por favor verifica los datos e intenta nuevamente.');
    } finally {
      setIsCreating(false);
    }
  };

  // Handle manual form submission
  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      setIsCreating(true);
      setError(null);

      const totalAmountCents = parseInt(formData.totalAmount) || 0;
      
      const transactionData = {
        date: formData.date || new Date().toISOString().split('T')[0],
        description: formData.description || 'Transacción manual',
        voucherType: 'EGRESO' as const,
        reference: formData.reference || formData.supplierRTN || '',
        entries: [
          {
            accountId: '', // Will need to be mapped to actual expense account
            amount: totalAmountCents,
            description: formData.supplierName || 'Gasto manual',
          },
          {
            accountId: '', // Will need to be mapped to actual payment account  
            amount: -totalAmountCents,
            description: 'Pago',
          }
        ]
      };

      await createTransaction(transactionData);
      setSuccess(true);
      onTransactionCreated?.();
      
      // Reset form
      setFormData({
        date: '',
        description: '',
        supplierName: '',
        supplierRTN: '',
        totalAmount: '',
        reference: '',
      });
      setExtractedData(null);
      
    } catch (err) {
      setError('Error al crear la transacción. Por favor verifica los datos.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* OCR Scanner Component */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Escáner de Facturas OCR
          </CardTitle>
        </CardHeader>
        <CardContent>
          <OCRInvoiceScanner 
            onDataExtracted={handleDataExtracted}
            onTransactionCreate={handleCreateTransaction}
          />
        </CardContent>
      </Card>

      {/* Transaction Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Formulario de Transacción
            {extractedData && (
              <Badge variant="secondary">
                Datos desde OCR
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Success Message */}
          {success && (
            <Alert className="mb-4 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                ¡Transacción creada exitosamente!
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Form */}
          <form onSubmit={handleManualSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="date">Fecha</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="totalAmount">Monto Total (L)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={formData.totalAmount ? (parseFloat(formData.totalAmount) / 100).toFixed(2) : ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    totalAmount: Math.round(parseFloat(e.target.value) * 100).toString() 
                  }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="supplierName">Nombre del Proveedor</Label>
                <Input
                  id="supplierName"
                  placeholder="Nombre del proveedor"
                  value={formData.supplierName}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplierName: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="supplierRTN">RTN del Proveedor</Label>
                <Input
                  id="supplierRTN"
                  placeholder="0801-XXXXX-X"
                  value={formData.supplierRTN}
                  onChange={(e) => setFormData(prev => ({ ...prev, supplierRTN: e.target.value }))}
                  className={formData.supplierRTN && !validateRTN(formData.supplierRTN) ? 'border-yellow-500' : ''}
                />
                {formData.supplierRTN && !validateRTN(formData.supplierRTN) && (
                  <p className="text-xs text-yellow-600 mt-1">
                    Formato de RTN inválido
                  </p>
                )}
              </div>

              <div className="md:col-span-2">
                <Label htmlFor="description">Descripción</Label>
                <Input
                  id="description"
                  placeholder="Descripción de la transacción"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="reference">Referencia</Label>
                <Input
                  id="reference"
                  placeholder="Número de factura o referencia"
                  value={formData.reference}
                  onChange={(e) => setFormData(prev => ({ ...prev, reference: e.target.value }))}
                />
              </div>
            </div>

            {/* Extracted Data Summary */}
            {extractedData && (
              <div className="border rounded-lg p-4 bg-muted/50">
                <h4 className="font-medium mb-2">Resumen de datos extraídos:</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                  {extractedData.date && (
                    <div>
                      <span className="font-medium">Fecha:</span> {extractedData.date}
                    </div>
                  )}
                  {extractedData.supplierName && (
                    <div>
                      <span className="font-medium">Proveedor:</span> {extractedData.supplierName}
                    </div>
                  )}
                  {extractedData.supplierRTN && (
                    <div>
                      <span className="font-medium">RTN:</span> {extractedData.supplierRTN}
                    </div>
                  )}
                  {extractedData.totalAmount && (
                    <div>
                      <span className="font-medium">Total:</span> {formatCurrency(extractedData.totalAmount)}
                    </div>
                  )}
                </div>
                {extractedData.confidence && (
                  <div className="mt-2">
                    <Badge variant={extractedData.confidence > 0.8 ? "default" : "secondary"}>
                      Confianza OCR: {Math.round(extractedData.confidence * 100)}%
                    </Badge>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-2">
              <Button type="submit" disabled={isCreating}>
                {isCreating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando transacción...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Crear Transacción
                  </>
                )}
              </Button>
              
              {extractedData && (
                <Button 
                  type="button"
                  variant="outline"
                  onClick={() => handleCreateTransaction(extractedData)}
                  disabled={isCreating}
                >
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Usar datos OCR
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Import the OCR scanner component (inline to avoid circular dependencies)
function OCRInvoiceScanner({ 
  onDataExtracted, 
  onTransactionCreate 
}: { 
  onDataExtracted?: (data: ExtractedInvoiceData) => void;
  onTransactionCreate?: (data: ExtractedInvoiceData) => void;
}) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }
      setSelectedFile(file);
      setError(null);
      const reader = new FileReader();
      reader.onload = (e) => setPreviewUrl(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  };

  const processImage = async () => {
    if (!selectedFile) return;
    setIsProcessing(true);
    setError(null);
    try {
      const { extractInvoiceFromImage } = await import('@/lib/services/ocr-service');
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(',')[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(selectedFile);
      });
      const result = await extractInvoiceFromImage(base64);
      if (result.success && result.data) {
        onDataExtracted?.(result.data);
      } else {
        setError(result.error || 'Error al procesar la imagen');
      }
    } catch (err) {
      setError('Error al procesar la imagen');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <input
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </div>

      {previewUrl && (
        <div className="border rounded-lg p-2">
          <img src={previewUrl} alt="Preview" className="max-w-full h-auto max-h-48 mx-auto" />
        </div>
      )}

      {selectedFile && (
        <Button onClick={processImage} disabled={isProcessing} className="w-full">
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Procesando...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4 mr-2" />
              Extraer datos
            </>
          )}
        </Button>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  );
}
