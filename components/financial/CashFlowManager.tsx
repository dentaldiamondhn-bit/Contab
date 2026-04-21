'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, Download, Plus } from 'lucide-react';
import { createSupabaseClient } from '@/lib/supabase/client';

interface CashFlowManagerProps {
  tenantId: string;
}

interface CashFlowEntry {
  id: string;
  entryDate: string;
  entryType: 'INFLOW' | 'OUTFLOW';
  category: string;
  description: string;
  amount: number;
  account: string;
  reference: string;
  createdAt: string;
}

export default function CashFlowManager({ tenantId }: CashFlowManagerProps) {
  const [entries, setEntries] = useState<CashFlowEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const supabase = createSupabaseClient();

  const exportToCSV = () => {
    const headers = ['Fecha', 'Tipo', 'Categoría', 'Descripción', 'Monto', 'Cuenta', 'Referencia'];
    const rows = entries.map(entry => [
      entry.entryDate,
      entry.entryType,
      entry.category,
      entry.description,
      (entry.amount / 100).toFixed(2),
      entry.account,
      entry.reference || ''
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'flujo_efectivo_' + new Date().toISOString().split('T')[0] + '.csv';
    link.click();
  };

  const getEntryTypeBadge = (type: string) => {
    switch (type) {
      case 'INFLOW':
        return <Badge className='bg-green-100 text-green-800'>Entrada</Badge>;
      case 'OUTFLOW':
        return <Badge className='bg-red-100 text-red-800'>Salida</Badge>;
      default:
        return <Badge variant='secondary'>{type}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card className='w-full'>
        <CardContent className='flex items-center justify-center py-8'>
          <div className='text-center'>
            <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4'></div>
            <p>Cargando flujo de efectivo...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-6'>
      <div className='flex justify-between items-center'>
        <div>
          <h2 className='text-2xl font-bold flex items-center'>
            <DollarSign className='h-6 w-6 mr-2 text-green-600' />
            Flujo de Efectivo
          </h2>
          <p className='text-gray-600'>Gestión de entradas y salidas de efectivo</p>
        </div>
        <div className='flex space-x-2'>
          <Button onClick={exportToCSV} variant='outline'>
            <Download className='h-4 w-4 mr-2' />
            Exportar CSV
          </Button>
          <Button onClick={() => setShowEntryForm(true)}>
            <Plus className='h-4 w-4 mr-2' />
            Nueva Entrada
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Entradas</CardTitle>
          <CardDescription>
            {entries.length} registros encontrados
          </CardDescription>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <p className='text-gray-500 text-center py-4'>No hay entradas registradas</p>
          ) : (
            <div className='overflow-x-auto'>
              <table className='w-full border-collapse'>
                <thead>
                  <tr className='bg-gray-50'>
                    <th className='border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Fecha</th>
                    <th className='border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Tipo</th>
                    <th className='border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Categoría</th>
                    <th className='border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Descripción</th>
                    <th className='border border-gray-200 px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase'>Monto</th>
                  </tr>
                </thead>
                <tbody>
                  {entries.map((entry) => (
                    <tr key={entry.id} className='hover:bg-gray-50'>
                      <td className='border border-gray-200 px-4 py-3 text-sm'>{entry.entryDate}</td>
                      <td className='border border-gray-200 px-4 py-3 text-sm'>{getEntryTypeBadge(entry.entryType)}</td>
                      <td className='border border-gray-200 px-4 py-3 text-sm'>{entry.category}</td>
                      <td className='border border-gray-200 px-4 py-3 text-sm'>{entry.description}</td>
                      <td className='border border-gray-200 px-4 py-3 text-sm'>
                        L {(entry.amount / 100).toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
