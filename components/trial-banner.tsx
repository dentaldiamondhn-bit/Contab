import React from 'react';
import Link from 'next/link';

interface TrialBannerProps {
  expirationDate: string;
}

export function TrialBanner({ expirationDate }: TrialBannerProps) {
  // Calcular diferencia en días
  const expDate = new Date(expirationDate);
  const now = new Date();
  const diffTime = expDate.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // No mostrar nada si ya expiró o si faltan más de 14 días (por seguridad)
  if (daysLeft <= 0 || daysLeft > 14) return null;

  return (
    <div className="bg-amber-100 border-b border-amber-200 px-4 py-2 text-center text-sm text-amber-800">
      ⚡ Tu periodo de prueba finaliza en <strong>{daysLeft} {daysLeft === 1 ? 'día' : 'días'}</strong>. 
      <Link href="/billing/subscriptions" className="ml-2 font-bold underline hover:text-amber-900">
        Suscribirme ahora
      </Link>
    </div>
  );
}