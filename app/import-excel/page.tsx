import BankExcelImporter from '@/components/BankExcelImporter';

export default function ImportExcelPage() {
  return (
    <div className="container mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Importar Estado de Cuenta</h1>
        <p className="text-slate-600">
          Importa automáticamente estados de cuenta bancarios desde archivos Excel
        </p>
      </div>
      <BankExcelImporter />
    </div>
  );
}
