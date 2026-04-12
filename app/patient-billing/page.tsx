import PatientBillingForm from '@/components/PatientBillingForm';

export default function PatientBillingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Patient Billing</h1>
          <p className="mt-2 text-gray-600">
            Enter the subtotal amount and the system will automatically calculate ISV tax and generate the required journal entries.
          </p>
        </div>
        
        <PatientBillingForm />
      </div>
    </div>
  );
}
