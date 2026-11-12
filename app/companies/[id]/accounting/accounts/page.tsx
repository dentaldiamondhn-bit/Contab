'use client';

import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import ChartOfAccountsManager from '@/components/accounting/ChartOfAccountsManager';

export default function CompanyAccountsPage() {
  const router = useRouter();

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">Catalogo de Cuentas</h1>
          <p className="text-gray-600">Gestionar cuentas contables</p>
        </div>
        <Button
          variant="outline"
          onClick={() => router.back()}
          className="flex items-center space-x-2"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Volver</span>
        </Button>
      </div>
      <ChartOfAccountsManager />
    </div>
  );
}
