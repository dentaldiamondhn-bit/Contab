'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CompanyAccountsPage() {
  const router = useRouter();
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Catálogo de Cuentas - Empresa</h1>
          <p className="text-gray-600">Página de cuentas para empresa específica</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => router.push('/companies/1/accounting')}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver a Contabilidad</span>
        </Button>
      </div>
    </div>
  );
}
