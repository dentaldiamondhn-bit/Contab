'use client';

import { useParams } from 'next/navigation';
import InvoiceSettings from '@/components/billing/InvoiceSettings';

export default function BillingSettingsPage() {
  const params = useParams();
  const companyId = params.id as string;

  return (
    <div className="container mx-auto p-6">
      <InvoiceSettings companyId={companyId} />
    </div>
  );
}