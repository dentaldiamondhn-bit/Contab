import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface Partida {
  id: string;
  date: string;
  voucher_type: string;
  voucher_number: number;
  description: string;
  reference?: string;
  entries: Array<{
    id: string;
    account?: {
      code: string;
      name: string;
      type?: string;
    };
    account_code?: string;
    account_name?: string;
    account_type?: string;
    debit: number;
    credit: number;
    description?: string;
  }>;
}

interface LibroPartidasProps {
  partidas: Partida[];
  onEditPartida?: (partida: Partida) => void;
  onDeletePartida?: (partidaId: string) => void;
}

export default function LibroPartidas({ partidas, onEditPartida, onDeletePartida }: LibroPartidasProps) {
  // Flatten all entries from all partidas into a single list
  const allEntries = partidas.flatMap((partida) =>
    partida.entries.map((entry) => ({
      ...entry,
      partidaId: partida.id,
      partidaDate: partida.date,
      partidaType: partida.voucher_type,
      partidaNumber: partida.voucher_number,
      partidaDescription: partida.description,
      partidaReference: partida.reference,
    }))
  );

  const formatCurrency = (amount: number) => {
    return (amount / 100).toLocaleString('es-HN', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const getAccountCode = (entry: any) => {
    return entry.account?.code || entry.account_code || '-';
  };

  const getAccountName = (entry: any) => {
    return entry.account?.name || entry.account_name || 'Cuenta no encontrada';
  };

  const getAccountType = (entry: any) => {
    return entry.account?.type || entry.account_type || '';
  };

  return (
    <div className="overflow-x-auto shadow-lg rounded-lg border">
      <div className="bg-blue-50 border-b border-blue-200 p-4">
        <h3 className="text-lg font-semibold text-blue-800">Partidas de Diario</h3>
        <p className="text-sm text-blue-600">Registro de todos los asientos contables individuales</p>
      </div>
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-blue-100 border-b">
          <tr>
            <th className="p-3 text-left w-28">Fecha</th>
            <th className="p-3 text-left w-32">Póliza</th>
            <th className="p-3 text-left">Descripción</th>
            <th className="p-3 text-left w-24">Código</th>
            <th className="p-3 text-left">Cuenta</th>
            <th className="p-3 text-right w-28">Debe (Lps)</th>
            <th className="p-3 text-right w-28">Haber (Lps)</th>
            <th className="p-3 text-center w-20">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {allEntries.length === 0 ? (
            <tr>
              <td colSpan={8} className="p-8 text-center text-gray-500">
                No hay partidas registradas
              </td>
            </tr>
          ) : (
            allEntries.map((entry, index) => (
              <tr key={`${entry.partidaId}-${entry.id}`} className="border-b hover:bg-blue-50">
                <td className="p-3">
                  {format(new Date(entry.partidaDate), "dd/MM/yyyy")}
                </td>
                <td className="p-3 font-bold text-blue-600">
                  {entry.partidaType}-{entry.partidaNumber}
                </td>
                <td className="p-3 text-slate-600">
                  {entry.partidaDescription}
                  {entry.partidaReference && (
                    <span className="text-xs text-gray-400 block">Ref: {entry.partidaReference}</span>
                  )}
                </td>
                <td className="p-3 font-mono text-xs">
                  {getAccountCode(entry)}
                </td>
                <td className="p-3 text-slate-700">
                  {getAccountName(entry)}
                </td>
                <td className="p-3 text-right font-mono">
                  {entry.debit > 0 ? (
                    <span className="text-red-600 font-semibold">
                      {formatCurrency(entry.debit)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="p-3 text-right font-mono">
                  {entry.credit > 0 ? (
                    <span className="text-green-600 font-semibold">
                      {formatCurrency(entry.credit)}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="p-3 text-center">
                  <div className="flex items-center justify-center space-x-1">
                    {onEditPartida && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const partida = partidas.find(p => p.id === entry.partidaId);
                          if (partida) onEditPartida(partida);
                        }}
                        className="h-8 w-8 p-0 text-blue-600 hover:text-blue-800 hover:bg-blue-100"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    )}
                    {onDeletePartida && index === 0 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onDeletePartida(entry.partidaId)}
                        className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
        {allEntries.length > 0 && (
          <tfoot className="bg-blue-50 border-t">
            <tr>
              <td colSpan={5} className="p-3 font-semibold text-blue-800">
                Total de Partidas
              </td>
              <td className="p-3 text-right font-bold text-blue-800 font-mono">
                {formatCurrency(allEntries.reduce((sum, entry) => sum + (entry.debit || 0), 0))}
              </td>
              <td className="p-3 text-right font-bold text-blue-800 font-mono">
                {formatCurrency(allEntries.reduce((sum, entry) => sum + (entry.credit || 0), 0))}
              </td>
              <td className="p-3"></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
