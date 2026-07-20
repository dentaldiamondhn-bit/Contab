'use client';

import React from 'react';
import Link from 'next/link';
import { useTenant } from '@/lib/contexts/TenantContext';
import { Button } from '@/components/ui/button';
import { Zap, Lock } from 'lucide-react';

interface TrialGateProps {
  children: React.ReactNode;
  featureName: string;
  isLimitReached?: boolean;
  limitType?: 'feature' | 'usage';
}

export function TrialGate({ children, featureName, isLimitReached, limitType = 'feature' }: TrialGateProps) {
  const { currentTenant } = useTenant();
  
  // Lógica: Si el plan es BASIC, consideramos que es periodo de prueba o plan limitado
  const isBasicPlan = (currentTenant as any)?.planid === 'BASIC';
  
  const isRestricted = (limitType === 'feature' && isBasicPlan) || (limitType === 'usage' && isLimitReached);

  if (!isRestricted) return <>{children}</>;

  return (
    <div className="relative group">
      <div className="opacity-50 pointer-events-none filter blur-[1px]">
        {children}
      </div>
      <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[1px] rounded-xl border-2 border-dashed border-gray-200">
        <div className="bg-white p-6 rounded-lg shadow-lg border border-gray-100 text-center max-w-sm">
          <div className="bg-amber-100 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4">
            <Lock className="w-6 h-6 text-amber-600" />
          </div>
          <h3 className="font-bold text-lg text-gray-900">
            {limitType === 'usage' ? 'Límite Alcanzado' : 'Función Avanzada'}
          </h3>
          <p className="text-sm text-gray-600 mb-6">
            {limitType === 'usage' 
              ? `Has alcanzado el límite de ${featureName} para tu plan actual.`
              : `La función ${featureName} solo está disponible en el Plan Empresarial (PRO).`}
          </p>
          <Button asChild className="bg-blue-600 hover:bg-blue-700 w-full">
            <Link href="/billing/subscriptions">
              <Zap className="w-4 h-4 mr-2" />
              Actualizar mi Plan
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}