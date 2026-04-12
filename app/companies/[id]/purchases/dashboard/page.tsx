'use client';

import { useParams } from 'next/navigation';
import PurchasesDashboard from '@/components/purchases/PurchasesDashboard';

export default function PurchasesDashboardPage() {
  const params = useParams();
  const companyId = params.id as string;

  return (
    <div className="container mx-auto p-6">
      <PurchasesDashboard companyId={companyId} />
    </div>
  );
}
