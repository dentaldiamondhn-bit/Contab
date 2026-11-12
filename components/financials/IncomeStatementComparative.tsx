import React from "react";

/**
 * IncomeStatementComparative - Componente que muestra un gráfico comparativo
 * de la cuenta de resultados (income statement) para dos períodos.
 * 
 * Props:
 * - title: Título del gráfico
 * - data: Datos del gráfico con labels y valores para los períodos
 * - type: Tipo de gráfico ('bar', 'line', 'area')
 */
export const IncomeStatementComparative: React.FC = () => {
  return (
    <div className="bg-white rounded-lg p-6 shadow-sm">
      <h3 className="text-sm text-gray-500 uppercase tracking-wider mb-4">Comparativa de Ingresos</h3>
      <div className="h-64 w-full">
        {/* Placeholder for chart - would use Recharts, Chart.js, or similar */}
        <svg
          className="w-full h-full"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <rect width="100" height="100" rx="4" fill="#f1f5f9" />
          <text
            x="50"
            y="50"
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#64748b"
          />
        </svg>
      </div>
    </div>
  );
};

export default IncomeStatementComparative;