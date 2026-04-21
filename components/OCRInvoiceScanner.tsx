'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  Upload, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';
import { extractInvoiceFromImage } from '@/lib/services/ocr-service';
import { ExtractedInvoiceData } from '@/lib/services/ocr-service';

// Local synchronous helper functions
function validateRTN(rtn: string): boolean {
  if (!rtn) return false;
  const cleanRTN = rtn.replace(/-/g, '');
  return /^\d{14}$/.test(cleanRTN);
}

function formatCurrency(amount: number, currency: string = 'L'): string {
  if (amount === undefined || amount === null) return `${currency} 0.00`;
  return `${currency} ${amount.toFixed(2)}`;
}

interface OCRInvoiceScannerProps {
  onDataExtracted?: (data: ExtractedInvoiceData) => void;
  onTransactionCreate?: (data: ExtractedInvoiceData) => void;
}

export default function OCRInvoiceScanner({ 
  onDataExtracted, 
  onTransactionCreate 
}: OCRInvoiceScannerProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrResult, setOcrResult] = useState<ExtractedInvoiceData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showRawText, setShowRawText] = useState(false);
  const [isCreatingTransaction, setIsCreatingTransaction] = useState(false);

  // Handle file selection
  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        setError('Por favor selecciona un archivo de imagen (JPG, PNG, etc.)');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        setError('El archivo es demasiado grande. Máximo 10MB.');
        return;
      }

      setSelectedFile(file);
      setError(null);
      setOcrResult(null);

      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  // Convert image to base64 for OCR processing
  const imageToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Process image with OCR
  const processImage = useCallback(async () => {
    if (!selectedFile) return;

    setIsProcessing(true);
    setError(null);

    try {
      const base64 = await imageToBase64(selectedFile);
      const result = await extractInvoiceFromImage(base64);

      if (result.success && result.data) {
        setOcrResult(result.data);
        onDataExtracted?.(result.data);
      } else {
        setError(result.error || 'Error al procesar la imagen');
      }
    } catch (err) {
      setError('Error al procesar la imagen. Por favor intenta nuevamente.');
    } finally {
      setIsProcessing(false);
    }
  }, [selectedFile, onDataExtracted]);

  // Create transaction from extracted data
  const handleCreateTransaction = useCallback(async () => {
    if (!ocrResult) return;

    setIsCreatingTransaction(true);
    try {
      await onTransactionCreate?.(ocrResult);
      // Reset after successful creation
      setSelectedFile(null);
      setPreviewUrl(null);
      setOcrResult(null);
      setError(null);
    } catch (err) {
      setError('Error al crear la transacción');
    } finally {
      setIsCreatingTransaction(false);
    }
  }, [ocrResult, onTransactionCreate]);

  // Reset scanner
  const handleReset = useCallback(() => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setOcrResult(null);
    setError(null);
    setShowRawText(false);
  }, []);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Camera className="w-5 h-5" />
            Escáner de Facturas con OCR
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="invoice-image">Subir imagen de la factura</Label>
            <div className="flex items-center gap-4">
              <Input
                id="invoice-image"
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="flex-1"
              />
              {selectedFile && (
                <Button variant="outline" onClick={handleReset}>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Limpiar
                </Button>
              )}
            </div>
            <p className="text-sm text-muted-foreground">
              Formatos soportados: JPG, PNG, GIF. Máximo 10MB.
            </p>
          </div>

          {/* Preview */}
          {previewUrl && (
            <div className="space-y-2">
              <Label>Vista previa</Label>
              <div className="border rounded-lg p-2">
                <img 
                  src={previewUrl} 
                  alt="Vista previa de la factura" 
                  className="max-w-full h-auto max-h-64 mx-auto"
                />
              </div>
            </div>
          )}

          {/* Process Button */}
          {selectedFile && !ocrResult && (
            <Button 
              onClick={processImage} 
              disabled={isProcessing}
              className="w-full"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Procesando imagen...
                </>
              ) : (
                <>
                  <FileText className="w-4 h-4 mr-2" />
                  Extraer datos de la factura
                </>
              )}
            </Button>
          )}

          {/* Error Display */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* OCR Results */}
      {ocrResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Datos Extraídos
              <Badge variant={ocrResult.confidence && ocrResult.confidence > 0.8 ? "default" : "secondary"}>
                Confianza: {Math.round((ocrResult.confidence || 0) * 100)}%
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Extracted Data */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {ocrResult.date && (
                <div>
                  <Label>Fecha</Label>
                  <p className="font-medium">{ocrResult.date}</p>
                </div>
              )}
              
              {ocrResult.supplierName && (
                <div>
                  <Label>Proveedor</Label>
                  <p className="font-medium">{ocrResult.supplierName}</p>
                </div>
              )}
              
              {ocrResult.supplierRTN && (
                <div>
                  <Label>RTN</Label>
                  <p className="font-medium">
                    {ocrResult.supplierRTN}
                    {validateRTN(ocrResult.supplierRTN) ? (
                      <CheckCircle className="w-4 h-4 text-green-600 inline ml-2" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-600 inline ml-2" />
                    )}
                  </p>
                </div>
              )}
              
              {ocrResult.totalAmount && (
                <div>
                  <Label>Total</Label>
                  <p className="font-medium text-lg">
                    {formatCurrency(ocrResult.totalAmount)}
                  </p>
                </div>
              )}
              
              {ocrResult.subtotal && (
                <div>
                  <Label>Subtotal</Label>
                  <p className="font-medium">{formatCurrency(ocrResult.subtotal)}</p>
                </div>
              )}
              
              {ocrResult.taxAmount && (
                <div>
                  <Label>Impuesto (ISV)</Label>
                  <p className="font-medium">{formatCurrency(ocrResult.taxAmount)}</p>
                </div>
              )}
            </div>

            {/* Raw Text Toggle */}
            {ocrResult.rawText && (
              <div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowRawText(!showRawText)}
                  className="mb-2"
                >
                  {showRawText ? (
                    <>
                      <EyeOff className="w-4 h-4 mr-2" />
                      Ocultar texto completo
                    </>
                  ) : (
                    <>
                      <Eye className="w-4 h-4 mr-2" />
                      Ver texto completo
                    </>
                  )}
                </Button>
                
                {showRawText && (
                  <div className="border rounded-lg p-3 bg-muted/50">
                    <pre className="text-xs whitespace-pre-wrap font-mono">
                      {ocrResult.rawText}
                    </pre>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button onClick={handleCreateTransaction} disabled={isCreatingTransaction}>
                {isCreatingTransaction ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creando transacción...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-2" />
                    Crear Transacción
                  </>
                )}
              </Button>
              <Button variant="outline" onClick={handleReset}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Escanear otra factura
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
