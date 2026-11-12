'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function PaymentCancelPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4">
            <XCircle className="h-16 w-16 text-orange-500" />
          </div>
          <CardTitle className="text-2xl">Pago Cancelado</CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            El proceso de pago fue cancelado. No se realizó ningún cargo a tu cuenta.
          </p>
          <p className="text-sm text-gray-500">
            Puedes intentar nuevamente cuando estés listo para suscribirte.
          </p>
          <div className="pt-4 space-y-2">
            <Link href="/onboarding">
              <Button className="w-full bg-cyan-600 hover:bg-cyan-700">
                Volver al Onboarding
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full">
                Ir al Inicio
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
