"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Download, FileText, Loader2 } from "lucide-react";
import { generateBatchPolizaPDF } from "@/lib/actions/batch-poliza";

interface Transaction {
  id: string;
  description: string;
  date: Date;
  voucherType: string;
  voucherNumber: number;
  entries: Array<{
    id: string;
    amount: bigint;
    account: {
      code: string;
      name: string;
    };
  }>;
}

interface BatchPolizaPrinterProps {
  transactions: Transaction[];
}

export function BatchPolizaPrinter({ transactions }: BatchPolizaPrinterProps) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(transactions.map(t => t.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectTransaction = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, id]);
    } else {
      setSelectedIds(prev => prev.filter(selectedId => selectedId !== id));
    }
  };

  const handleGeneratePDF = async () => {
    if (selectedIds.length === 0) return;

    setIsGenerating(true);
    try {
      const result = await generateBatchPolizaPDF(selectedIds);
      
      if (result.success && result.pdfBuffer) {
        // Create blob and download
        const blob = new Blob([result.pdfBuffer as any], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || 'polizas.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        console.error('Failed to generate PDF:', result.error);
        alert('Error al generar el PDF: ' + result.error);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Error al generar el PDF');
    } finally {
      setIsGenerating(false);
    }
  };

  const isAllSelected = selectedIds.length === transactions.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < transactions.length;

  return (
    <div className="space-y-4">
      {/* Batch Controls */}
      <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border">
        <div className="flex items-center space-x-4">
          <Checkbox
            checked={isAllSelected}
            onCheckedChange={handleSelectAll}
            ref={(ref: any) => {
              if (ref) {
                ref.indeterminate = isIndeterminate;
              }
            }}
          />
          <span className="text-sm font-medium">
            Seleccionar todos ({transactions.length})
          </span>
          <span className="text-sm text-gray-500">
            {selectedIds.length} seleccionado{selectedIds.length !== 1 ? 's' : ''}
          </span>
        </div>
        
        <Button
          onClick={handleGeneratePDF}
          disabled={selectedIds.length === 0 || isGenerating}
          className="flex items-center space-x-2"
        >
          {isGenerating ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>
            Generar PDF ({selectedIds.length})
          </span>
        </Button>
      </div>

      {/* Transaction List with Selection */}
      <div className="border rounded-lg overflow-hidden">
        <div className="grid grid-cols-6 gap-4 p-3 bg-gray-100 font-medium text-sm">
          <div className="col-span-1 flex items-center">
            <Checkbox
              checked={isAllSelected}
              onCheckedChange={handleSelectAll}
              ref={(ref: any) => {
                if (ref) {
                  ref.indeterminate = isIndeterminate;
                }
              }}
            />
          </div>
          <div className="col-span-1">Póliza</div>
          <div className="col-span-2">Descripción</div>
          <div className="col-span-1">Fecha</div>
          <div className="col-span-1">Total</div>
        </div>

        <div className="divide-y">
          {transactions.map((transaction) => {
            const total = transaction.entries.reduce(
              (sum, entry) => sum + Number(entry.amount),
              0
            );
            const isSelected = selectedIds.includes(transaction.id);

            return (
              <div
                key={transaction.id}
                className={`grid grid-cols-6 gap-4 p-3 text-sm hover:bg-gray-50 ${
                  isSelected ? 'bg-blue-50' : ''
                }`}
              >
                <div className="col-span-1 flex items-center">
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={(checked: any) => 
                      handleSelectTransaction(transaction.id, checked as boolean)
                    }
                  />
                </div>
                <div className="col-span-1 font-mono text-xs">
                  {transaction.voucherType}-{transaction.voucherNumber.toString().padStart(3, '0')}
                </div>
                <div className="col-span-2 truncate" title={transaction.description}>
                  {transaction.description}
                </div>
                <div className="col-span-1 text-xs text-gray-500">
                  {new Date(transaction.date).toLocaleDateString()}
                </div>
                <div className="col-span-1 text-right font-mono text-xs">
                  L. {(Math.abs(total) / 100).toFixed(2)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedIds.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
          <p>Selecciona las pólizas que deseas incluir en el PDF</p>
        </div>
      )}
    </div>
  );
}
