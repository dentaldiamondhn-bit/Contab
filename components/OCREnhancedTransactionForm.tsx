'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { TrialGate } from '@/components/trial-gate';
import { 
  Camera, 
  FileText, 
  CheckCircle, 
  AlertCircle, 
  Loader2,
  Zap
} from 'lucide-react';
import { ExtractedInvoiceData } from '@/lib/services/ocr-service';
import { formatCurrency } from '@/lib/accounting-utils';
import { validateRTN as validateHonduranRTN } from '@/lib/services/withholding-service';
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
    totalAmount: '', // Se almacena en centavos como string
    reference: '',
  });

  // Mapear datos del OCR al formulario
  useEffect(() => {
    if (extractedData) {
      setFormData({
        date: extractedData.date || new Date().toISOString().split('T')[0],
        description: extractedData.supplierName ? `Compra a: ${extractedData.supplierName}` : 'Gasto detectado por OCR',
        supplierName: extractedData.supplierName || '',
        supplierRTN: extractedData.supplierRTN || '',
        totalAmount: extractedData.totalAmount ? Math.round(extractedData.totalAmount * 100).toString() : '',
        reference: '',
      });
    }
  }, [extractedData]);

  const handleDataExtracted = (data: ExtractedInvoiceData) => {
    setExtractedData(data);
    setError(null);
    setSuccess(false);
  };

  const processTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsCreating(true);
      setError(null);

      const totalCents = parseInt(formData.totalAmount);
      if (isNaN(totalCents) || totalCents <= 0) {
        throw new Error("El monto de la factura no es válido.");
      }

      const transactionPayload = {
        date: formData.date,
        description: formData.description,
        voucherType: 'EGRESO' as const,
        reference: formData.reference || formData.supplierRTN,
        entries: [
          {
            accountId: '', // Pendiente de asignar en la UI de Diario
            amount: totalCents,
            description: formData.description,
          },
          {
            accountId: '', // Cuenta de contrapartida (Caja/Banco)
            amount: -totalCents,
            description: 'Pago de factura escaneada',
          }
        ]
      };

      await createTransaction(transactionPayload);
      setSuccess(true);
      onTransactionCreated?.();

      // Reseteo tras éxito
      setTimeout(() => {
        setExtractedData(null);
        setSuccess(false);
        setFormData({ date: '', description: '', supplierName: '', supplierRTN: '', totalAmount: '', reference: '' });
      }, 3000);

    } catch (err: any) {
      setError(err.message || 'Error al registrar la transacción.');
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Sección del Escáner OCR */}
      <Card className="border-dashed border-2 border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-primary text-lg">
            <Zap className="w-5 h-5 fill-primary" />
            Asistente de IA (OCR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <TrialGate featureName="Escaneo Inteligente con IA">
            <OCRInvoiceScanner 
              onDataExtracted={handleDataExtracted}
              isProcessing={isCreating}
            />
          </TrialGate>
        </CardContent>
      </Card>

      {/* Formulario de Confirmación */}
      <Card className={extractedData ? "ring-2 ring-primary/30" : ""}>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Detalle de la Transacción
            </div>
            {extractedData && <Badge variant="outline" className="border-green-600 text-green-600">IA: Datos Detectados</Badge>}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {success && (
            <Alert className="mb-4 bg-green-50 border-green-200">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800 font-medium">Partida creada exitosamente en Contab.</AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={processTransaction} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Fecha</Label>
                <Input 
                  type="date" 
                  value={formData.date} 
                  onChange={e => setFormData({...formData, date: e.target.value})} 
                  required 
                />
              </div>

              <div className="space-y-2">
                <Label>Monto Total (L)</Label>
                <Input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00"
                  value={formData.totalAmount ? (parseFloat(formData.totalAmount) / 100).toFixed(2) : ''}
                  onChange={e => setFormData({
                    ...formData, 
                    totalAmount: Math.round(parseFloat(e.target.value || "0") * 100).toString()
                  })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Proveedor</Label>
                <Input 
                  value={formData.supplierName} 
                  onChange={e => setFormData({...formData, supplierName: e.target.value})} 
                  placeholder="Nombre del comercio"
                />
              </div>

              <div className="space-y-2">
                <Label>RTN Proveedor</Label>
                <Input 
                  value={formData.supplierRTN} 
                  placeholder="0000-0000-000000"
                  onChange={e => setFormData({...formData, supplierRTN: e.target.value})} 
                  className={formData.supplierRTN && !validateHonduranRTN(formData.supplierRTN) ? "border-orange-500 bg-orange-50" : ""}
                />
              </div>

              <div className="md:col-span-2 space-y-2">
                <Label>Concepto</Label>
                <Input 
                  value={formData.description} 
                  onChange={e => setFormData({...formData, description: e.target.value})} 
                  placeholder="¿En qué consistió el gasto?"
                  required 
                />
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={isCreating || !formData.totalAmount}>
              {isCreating ? (
                <>
                  <Loader2 className="animate-spin mr-2 h-4 w-4" />
                  Procesando Partida...
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Confirmar y Guardar
                </>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

// Subcomponente de escaneo separado para limpieza visual
function OCRInvoiceScanner({ 
  onDataExtracted, 
  isProcessing 
}: { 
  onDataExtracted: (data: ExtractedInvoiceData) => void, 
  isProcessing: boolean 
}) {
  const [loading, setLoading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const { extractInvoiceFromImage } = await import('@/lib/services/ocr-service');
      
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = (reader.result as string).split(',')[1];
        const result = await extractInvoiceFromImage(base64);
        if (result.success && result.data) {
          onDataExtracted(result.data);
        } else {
          alert("No se pudieron extraer datos legibles de la imagen.");
        }
      };
    } catch (err) {
      console.error("Error crítico en OCR:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center border-2 border-dashed border-muted-foreground/25 rounded-xl p-8 hover:bg-muted/30 transition-colors">
      <input 
        type="file" 
        id="ocr-upload" 
        className="hidden" 
        accept="image/*" 
        onChange={handleUpload} 
        disabled={loading || isProcessing} 
      />
      <label htmlFor="ocr-upload" className="cursor-pointer flex flex-col items-center">
        {loading ? (
          <Loader2 className="h-12 w-12 animate-spin text-primary mb-3" />
        ) : (
          <div className="bg-primary/10 p-4 rounded-full mb-3">
            <Camera className="h-8 w-8 text-primary" />
          </div>
        )}
        <span className="font-semibold text-slate-700">Seleccionar Imagen</span>
        <p className="text-sm text-muted-foreground mt-1 text-center max-w-[250px]">
          Sube una foto clara de la factura para auto-completar los campos.
        </p>
      </label>
    </div>
  );
}