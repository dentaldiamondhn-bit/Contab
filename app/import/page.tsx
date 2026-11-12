import { PDFDownloadLink } from "@/components/reports/PDFDownloadLink";
import { ExcelImporter } from "@/components/ExcelImporter";

export default function ImportExport() {
  return (
    <div className="px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Importar/Exportar</h1>
        <p className="mt-2 text-gray-600">
          Importe y exporte datos financieros de su contabilidad
        </p>
      </div>

      <div className="grid gap-8">
        {/* PDF Download Section */}
        <div className="p-6 border rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Estado de Resultados (PDF)</h2>
          <p className="text-gray-600 mb-6">
            Descargue un informe detallado de ingresos y gastos para el período seleccionado.
          </p>
          
          <PDFDownloadLink 
            startDate={new Date(new Date().getFullYear(), 0, 1)} // Start of current year
            endDate={new Date()} // Today
          />
        </div>

        {/* Excel Import Section */}
        <div className="p-6 border rounded-lg bg-white shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Importar Transacciones (Excel)</h2>
          <p className="text-gray-600 mb-6">
            Importe transacciones desde un archivo Excel con validación de códigos de cuenta.
          </p>
          
          <ExcelImporter />
        </div>
      </div>
    </div>
  );
}
