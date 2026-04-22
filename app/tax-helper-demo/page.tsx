'use client';

import { EnhancedTransactionForm } from '@/components/EnhancedTransactionForm';

export default function TaxHelperDemoPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tax Helper Demo</h1>
          <div className="mt-4 space-y-2">
            <p className="text-gray-600">
              This enhanced transaction form demonstrates the Tax Helper functionality. 
              Toggle the "Enable Tax Helper" checkbox and then mark individual entries as taxable.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-900 mb-2">How it works:</h3>
              <ol className="list-decimal list-inside space-y-1 text-sm text-blue-800">
                <li>Enable Tax Helper by checking the box</li>
                <li>Add journal entries with amounts</li>
                <li>Toggle the "Taxable" switch on any entry</li>
                <li>System automatically calculates ISV (15% or 18%)</li>
                <li>Automatically adds tax entry to "ISV por Pagar" account</li>
                <li>Creates balanced transaction with all entries</li>
              </ol>
            </div>
          </div>
        </div>
        
        <EnhancedTransactionForm 
          enableTaxHelper={true}
          onTransactionCreated={() => {
            console.log('Transaction created with tax helper');
          }}
        />
      </div>
    </div>
  );
}
