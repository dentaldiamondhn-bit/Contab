'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Camera, 
  FileText, 
  Zap, 
  CheckCircle,
  ArrowLeft,
  Info
} from 'lucide-react';
import Link from 'next/link';
import OCREnhancedTransactionForm from '@/components/OCREnhancedTransactionForm';
import { useRouter } from 'next/navigation';

export default function OCRPage() {
  const [transactionCreated, setTransactionCreated] = useState(false);
  const router = useRouter();

  const handleTransactionCreated = () => {
    setTransactionCreated(true);
    // Reset after 3 seconds
    setTimeout(() => setTransactionCreated(false), 3000);
  };

  return (
    <div className="container mx-auto py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" asChild>
            <Link href="/transactions">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Volver a Transacciones
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Camera className="w-8 h-8" />
              Escáner de Facturas OCR
            </h1>
            <p className="text-muted-foreground">
              Sube una foto de tu factura y extrae automáticamente los datos
            </p>
          </div>
        </div>
        
        {transactionCreated && (
          <Badge variant="default" className="animate-pulse">
            <CheckCircle className="w-3 h-3 mr-1" />
            Transacción creada
          </Badge>
        )}
      </div>

      {/* Info Card */}
      <Card className="border-cyan-200 bg-cyan-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-cyan-600 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-blue-900">¿Cómo funciona el escáner OCR?</h3>
              <ul className="text-sm text-cyan-800 space-y-1">
                <li>• Sube una foto clara de tu factura o recibo</li>
                <li>• La IA extraerá automáticamente: fecha, proveedor, RTN y monto</li>
                <li>• Revisa los datos extraídos y crea la transacción con un clic</li>
                <li>• Compatible con facturas en formato español y lempiras</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-cyan-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Camera className="w-6 h-6 text-cyan-600" />
            </div>
            <h3 className="font-medium mb-2">Captura Rápida</h3>
            <p className="text-sm text-muted-foreground">
              Toma una foto o sube un archivo de imagen
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <Zap className="w-6 h-6 text-green-600" />
            </div>
            <h3 className="font-medium mb-2">Procesamiento IA</h3>
            <p className="text-sm text-muted-foreground">
              Extracción automática con Google Cloud Vision
            </p>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3">
              <FileText className="w-6 h-6 text-purple-600" />
            </div>
            <h3 className="font-medium mb-2">Validación RTN</h3>
            <p className="text-sm text-muted-foreground">
              Verificación automática de RTNs hondureños
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main OCR Form */}
      <OCREnhancedTransactionForm onTransactionCreated={handleTransactionCreated} />

      {/* Success Message */}
      {transactionCreated && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="font-medium text-green-900 mb-2">
              ¡Transacción creada exitosamente!
            </h3>
            <p className="text-green-800 mb-4">
              La factura ha sido procesada y la transacción registrada en tu sistema contable.
            </p>
            <div className="flex gap-2 justify-center">
              <Button variant="outline" onClick={() => setTransactionCreated(false)}>
                Escanear otra factura
              </Button>
              <Button asChild>
                <Link href="/transactions">
                  Ver todas las transacciones
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
