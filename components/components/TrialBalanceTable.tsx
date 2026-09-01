import { formatCurrency } from "@/lib/utils";

interface AccountRow {
  id: string;
  code: string;
  name: string;
  type: string;
  parentId?: string;
  level: number;
  debitMovement: number;
  creditMovement: number;
  finalBalance: number;
  hasChildren: boolean;
  isParent: boolean;
}

export function TrialBalanceTable({ data }: { data: AccountRow[] }) {
  const totalDebits = data.reduce((sum, row) => sum + row.debitMovement, 0);
  const totalCredits = data.reduce((sum, row) => sum + row.creditMovement, 0);

  const getIndentClass = (level: number) => {
    switch (level) {
      case 1: return 'pl-2';
      case 2: return 'pl-6';
      case 3: return 'pl-10';
      case 4: return 'pl-14';
      default: return 'pl-2';
    }
  };

  const getRowClass = (row: AccountRow) => {
    if (row.isParent) {
      return 'bg-cyan-50 font-bold border-l-4 border-blue-400';
    }
    return 'hover:bg-gray-50';
  };

  const getNameDisplay = (row: AccountRow) => {
    if (row.isParent) {
      return (
        <span className="flex items-center">
          <span className="mr-2">📁</span>
          {row.name}
        </span>
      );
    }
    return row.name;
  };

  return (
    <div className="border border-gray-300 bg-white">
      <table className="w-full text-sm">
        <thead className="border-b border-gray-300 bg-gray-50">
          <tr className="h-8">
            <th className="w-16 px-2 text-left font-semibold text-xs">Código</th>
            <th className="px-2 text-left font-semibold text-xs">Cuenta</th>
            <th className="w-24 px-2 text-right font-semibold text-xs">Débitos</th>
            <th className="w-24 px-2 text-right font-semibold text-xs">Créditos</th>
            <th className="w-24 px-2 text-right font-semibold text-xs">Saldo</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200">
          {data.map((row) => (
            <tr key={row.code} className={`h-7 ${getRowClass(row)}`}>
              <td className={`px-2 font-mono text-xs text-gray-600 ${getIndentClass(row.level)}`}>
                {row.code}
              </td>
              <td className={`px-2 text-xs font-medium ${getIndentClass(row.level)}`}>
                {getNameDisplay(row)}
              </td>
              <td className="px-2 text-right text-xs">
                {row.isParent ? <strong>{formatCurrency(row.debitMovement)}</strong> : formatCurrency(row.debitMovement)}
              </td>
              <td className="px-2 text-right text-xs">
                {row.isParent ? <strong>{formatCurrency(row.creditMovement)}</strong> : formatCurrency(row.creditMovement)}
              </td>
              <td className={`px-2 text-right text-xs font-bold ${row.finalBalance < 0 ? 'text-red-600' : row.isParent ? 'text-cyan-700' : 'text-gray-900'}`}>
                {formatCurrency(row.finalBalance)}
              </td>
            </tr>
          ))}
        </tbody>
        <tfoot className="border-t-2 border-gray-400 bg-gray-100">
          <tr className="h-8 font-bold">
            <td colSpan={2} className="px-2 text-xs">TOTALES</td>
            <td className="px-2 text-right text-xs">{formatCurrency(totalDebits)}</td>
            <td className="px-2 text-right text-xs">{formatCurrency(totalCredits)}</td>
            <td className="px-2 text-right text-xs">
              {totalDebits === totalCredits ? "Cuadre ✓" : "Error ✗"}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}