'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function PaymentSuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    if (sessionId) {
      setStatus('success');
    } else {
      setStatus('error');
    }
  }, [sessionId]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            {status === 'success' ? (
              <CheckCircle className="h-16 w-16 text-green-500" />
            ) : status === 'loading' ? (
              <div className="h-16 w-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin mx-auto" />
            ) : (
              <div className="h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mx-auto">
                <span className="text-red-600 text-2xl">✕</span>
              </div>
            )}
          </div>
          <CardTitle className="text-2xl">
            {status === 'success' ? '¡Pago Exitoso!' : status === 'loading' ? 'Procesando...' : 'Error en el Pago'}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          {status === 'success' && (
            <p className="text-gray-600">
              Tu suscripción a Diamond Accounting ha sido activada correctamente. 
              Recibirás un correo electrónico con los detalles de tu compra.
            </p>
          )}
          {status === 'error' && (
            <p className="text-gray-600">
              Hubo un problema al procesar tu pago. Por favor, intenta nuevamente o contacta a soporte.
            </p>
          )}
          <div className="pt-4">
            <Link href="/onboarding">
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
                Continuar al Onboarding
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PaymentSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="h-16 w-16 border-4 border-cyan-600 border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <PaymentSuccessContent />
    </Suspense>
  );
}
