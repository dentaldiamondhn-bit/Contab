'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface TaxIntegrationLayoutProps {
  children: React.ReactNode;
}

export default function TaxIntegrationLayout({ children }: TaxIntegrationLayoutProps) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content */}
      <main className="flex-1 overflow-auto">
        <div className="p-6">
          {children}
        </div>
      </main>
    </div>
  );
}