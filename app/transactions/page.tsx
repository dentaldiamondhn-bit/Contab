import { TransactionForm } from "@/components/TransactionForm";

export default function Transactions() {
  return (
    <div className="px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Transacciones</h1>
        <p className="mt-2 text-gray-600">
          Registre y gestione transacciones financieras
        </p>
      </div>

      <div className="grid gap-8">
        {/* Transaction Form */}
        <TransactionForm />
      </div>
    </div>
  );
}
