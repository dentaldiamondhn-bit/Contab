"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Calendar } from "lucide-react";
import { getPnLData } from "@/lib/reports/profit-and-loss";
import { pdf } from '@react-pdf/renderer';
import { PnLPDF } from './PnLPDF';

import { formatDateForDisplay, formatDateRange, isDateExpired } from '@/lib/date-utils';
interface PDFDownloadLinkProps {
  startDate?: Date;
  endDate?: Date;
  className?: string;
}

export function PDFDownloadLink({ 
  startDate = new Date(new Date().getFullYear(), 0, 1), // Start of current year
  endDate = new Date(), // Today
  className 
}: PDFDownloadLinkProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGeneratePDF = async () => {
    setIsGenerating(true);
    setError(null);

    try {
      // Fetch the P&L data
      const data = await getPnLData(startDate, endDate);
      
      // Calculate net profit
      const totalRevenue = data.revenue.reduce((sum: number, item: any) => sum + Math.abs(item.total), 0);
      const totalExpenses = data.expenses.reduce((sum: number, item: any) => sum + item.total, 0);
      const netProfit = totalRevenue - totalExpenses;

      const reportData = {
        ...data,
        netProfit
      };

      // Format date range for display
      const dateRange = `${startDate.toLocaleDateString('es-HN')} - ${endDate.toLocaleDateString('es-HN')}`;

      // Generate PDF
      const blob = await pdf(<PnLPDF data={reportData} dateRange={dateRange} />).toBlob();
      
      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `estado-resultados-${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

    } catch (err) {
      setError('Error al generar el PDF. Por favor intente nuevamente.');
      console.error('PDF generation error:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className={className}>
      <Button 
        onClick={handleGeneratePDF}
        disabled={isGenerating}
        className="flex items-center gap-2"
      >
        {isGenerating ? (
          <>
            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            Generando PDF...
          </>
        ) : (
          <>
            <Download className="w-4 h-4" />
            Descargar Estado de Resultados
          </>
        )}
      </Button>
      
      {error && (
        <p className="text-sm text-red-600 mt-2">{error}</p>
      )}
      
      <div className="flex items-center gap-2 text-sm text-gray-600 mt-2">
        <Calendar className="w-4 h-4" />
        <span>
          Período: {startDate.toLocaleDateString('es-HN')} - {endDate.toLocaleDateString('es-HN')}
        </span>
      </div>
    </div>
  );
}
