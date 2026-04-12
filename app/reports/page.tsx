import Link from "next/link";

export default function Reports() {
  const reportTypes = [
    {
      title: "P&L Statement",
      description: "Estado de Resultados - Ingresos y gastos detallados",
      href: "/reports/profit-loss",
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>`,
      color: "bg-blue-500"
    },
    {
      title: "Trial Balance",
      description: "Balanza de Comprobación - Verificación de saldos",
      href: "/reports/trial-balance",
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>`,
      color: "bg-green-500"
    },
    {
      title: "Account Details",
      description: "Auxiliar de Cuentas - Detalles por cuenta",
      href: "/reports/account-details",
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>`,
      color: "bg-purple-500"
    },
    {
      title: "Tax Summary",
      description: "Resumen Fiscal - IVA e ISR para Honduras",
      href: "/reports/tax-summary",
      icon: `<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg>`,
      color: "bg-red-500"
    }
  ];

  return (
    <div className="px-4 py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Reportes Financieros</h1>
        <p className="mt-2 text-gray-600">
          Acceda a todos los reportes contables para su análisis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {reportTypes.map((report) => (
          <Link
            key={report.title}
            href={report.href}
            className="block p-6 border rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow"
          >
            <div className="flex items-center mb-4">
              <div className={`p-3 rounded-lg ${report.color}`}>
                <span
                  dangerouslySetInnerHTML={{ __html: report.icon }}
                  className="w-6 h-6 text-white"
                />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {report.title}
            </h3>
            <p className="text-gray-600 text-sm">
              {report.description}
            </p>
            <div className="mt-4 text-blue-600 text-sm font-medium hover:text-blue-700">
              Ver reporte →
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-8 p-6 border rounded-lg bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">¿Necesita importar o exportar datos?</h3>
        <p className="text-gray-600 mb-4">
          Utilice la sección de Importar/Exportar para manejar archivos Excel y generar PDFs.
        </p>
        <Link
          href="/import"
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Ir a Importar/Exportar
        </Link>
      </div>
    </div>
  );
}
