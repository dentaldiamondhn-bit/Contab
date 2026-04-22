'use client';

import ISVTransactionForm from '@/components/ISVTransactionForm';
import ISVReport from '@/components/ISVReport';

export default function ISVPage() {
  return (
    <div className="container mx-auto py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Gestión de ISV</h1>
        <p className="text-gray-600">
          Sistema profesional para manejar el Impuesto Sobre Ventas (ISV) de Honduras
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">Nueva Transacción con ISV</h2>
          <ISVTransactionForm 
            onSuccess={(transaction) => {
              // You could show a success message or refresh data
              console.log('ISV transaction created:', transaction);
            }}
            onError={(error) => {
              // Error handling is already handled in the component
              console.error('ISV transaction error:', error);
            }}
          />
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">Reporte de ISV</h2>
          <ISVReport />
        </div>
      </div>
    </div>
  );
}
