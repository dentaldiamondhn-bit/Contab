'use client';

import { useParams } from 'next/navigation';
import InventoryDashboard from '@/components/inventory/InventoryDashboard';

export default function InventoryDashboardPage() {
  const params = useParams();
  const companyId = params.id as string;

  return (
    <div className="container mx-auto p-6">
      <InventoryDashboard companyId={companyId} />
    </div>
  );
}