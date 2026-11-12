'use client';

import { useParams } from 'next/navigation';
import BillingDashboard from '@/components/billing/BillingDashboard';

export default function BillingDashboardPage() {
  const params = useParams();
  const companyId = params.id as string;

  return (
    <div className="container mx-auto p-6">
      <BillingDashboard companyId={companyId} />
    </div>
  );
}