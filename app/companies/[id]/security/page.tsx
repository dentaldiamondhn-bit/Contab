'use client';

import { use } from 'react';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

interface SecurityPageProps {
  params: Promise<{
    id: string;
  }>;
}
export default function SecurityPage({ params }: SecurityPageProps) {
  const { id: companyId } = use(params);
  const router = useRouter();

  useEffect(() => {
    // Redirect to the central control panel
    router.push(`/companies/${companyId}/security/panel-control`);
  }, [companyId, router]);

  return (
    <div className="container mx-auto p-6">
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <p className="text-gray-600">Cargando módulo de seguridad...</p>
        </div>
      </div>
    </div>
  );
}