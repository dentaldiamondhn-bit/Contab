import TaxHelperForm from '@/components/TaxHelperForm';

export default function TaxHelperPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Tax Helper</h1>
          <p className="mt-2 text-gray-600">
            Automatically calculate ISV tax by toggling the "Taxable" switch on any journal entry line.
            The system will automatically append tax entries to the "ISV por Pagar" account.
          </p>
        </div>
        
        <TaxHelperForm />
      </div>
    </div>
  );
}
