'use client';

import { useParams, useRouter } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import DIATManager from '@/components/DIATManager';

export default function DIATPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const companyId = params?.id || '';

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.back()}
        className="mb-2"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Volver
      </Button>

      <DIATManager companyId={companyId} />
    </div>
  );
}