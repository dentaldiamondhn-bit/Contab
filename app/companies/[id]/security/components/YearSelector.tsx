'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';

interface YearSelectorProps {
  onYearChange: (year: string) => void;
  selectedYear: string;
  showBadge?: boolean;
  badgeText?: string;
}

export default function YearSelector({ 
  onYearChange, 
  selectedYear, 
  showBadge = true,
  badgeText 
}: YearSelectorProps) {
  const years = ['2026', '2025', '2024'];
  
  return (
    <div className="flex items-center gap-3">
      <select 
        value={selectedYear}
        onChange={(e) => onYearChange(e.target.value)}
        className="px-3 py-1 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
      >
        {years.map(year => (
          <option key={year} value={year}>{year}</option>
        ))}
      </select>
      {showBadge && (
        <Badge className={selectedYear === '2026' ? 'bg-purple-600' : 'bg-blue-600'}>
          {badgeText || (selectedYear === '2026' ? 'Año Actual' : 'Histórico')}
        </Badge>
      )}
    </div>
  );
}
