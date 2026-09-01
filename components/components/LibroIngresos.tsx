import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Edit, Trash2 } from "lucide-react";

interface LibroIngresosProps {
  ingresos: any[];
  onEdit?: (ingreso: any) => void;
  onDelete?: (ingresoId: string) => void;
}

export default function LibroIngresos({ ingresos, onEdit, onDelete }: LibroIngresosProps) {
  return (
    <div className="overflow-x-auto shadow-lg rounded-lg border">
      <div className="bg-green-50 border-b border-green-200 p-4">
        <h3 className="text-lg font-semibold text-green-800">Libro de Ingresos</h3>
        <p className="text-sm text-green-600">Registro de todas las transacciones de ingresos</p>
      </div>
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-green-100 border-b">
          <tr>
            <th className="p-3 text-left">Fecha</th>
            <th className="p-3 text-left">Póliza</th>
            <th className="p-3 text-left">Descripción</th>
            <th className="p-3 text-left">Cuenta</th>
            <th className="p-3 text-right">Debe (Lps)</th>
            <th className="p-3 text-right">Haber (Lps)</th>
            <th className="p-3 text-center">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {ingresos.length === 0 ? (
            <tr>
              <td colSpan={7} className="p-8 text-center text-gray-500">
                No hay ingresos registrados
              </td>
            </tr>
          ) : (
            ingresos.map((ingreso) => (
              ingreso.entries.map((entry: any, index: number) => (
                <tr key={`${ingreso.id}-${index}`} className="border-b hover:bg-green-50">
                  <td className="p-3">
                    {index === 0 ? format(new Date(ingreso.date), "dd/MM/yyyy") : ""}
                  </td>
                  <td className="p-3 font-bold text-green-600">
                    {index === 0 ? `INGRESO-${ingreso.voucher_number}` : ""}
                  </td>
                  <td className="p-3 text-slate-600">
                    {index === 0 ? ingreso.description : ""}
                  </td>
                  <td className="p-3 text-slate-700">
                    {entry.account?.code} - {entry.account?.name}
                  </td>
                  <td className="p-3 text-right">
                    {entry.amount > 0 ? (Number(entry.amount) / 100).toLocaleString('es-HN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }) : "0.00"}
                  </td>
                  <td className="p-3 text-right text-green-600">
                    {entry.amount < 0 ? (Math.abs(Number(entry.amount)) / 100).toLocaleString('es-HN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    }) : "0.00"}
                  </td>
                  <td className="p-3 text-center">
                    {index === 0 && (
                      <div className="flex items-center justify-center space-x-1">
                        {onEdit && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onEdit(ingreso)}
                            className="h-8 w-8 p-0 text-cyan-600 hover:text-cyan-800 hover:bg-cyan-100"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        )}
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => onDelete(ingreso.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-100"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))
            ))
          )}
        </tbody>
        {ingresos.length > 0 && (
          <tfoot className="bg-green-50 border-t">
            <tr>
              <td colSpan={4} className="p-3 font-semibold text-green-800">
                Total de Ingresos
              </td>
              <td className="p-3 text-right font-bold text-green-800">
                {(ingresos.reduce((sum, ingreso) =>
                  sum + ingreso.entries.reduce((entrySum: number, entry: any) =>
                    entry.amount > 0 ? entrySum + Number(entry.amount) : entrySum, 0
                  ), 0) / 100).toLocaleString('es-HN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
              </td>
              <td className="p-3 text-right font-bold text-green-800">
                {(ingresos.reduce((sum, ingreso) =>
                  sum + ingreso.entries.reduce((entrySum: number, entry: any) =>
                    entry.amount < 0 ? entrySum + Math.abs(Number(entry.amount)) : entrySum, 0
                  ), 0) / 100).toLocaleString('es-HN', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
              </td>
              <td className="p-3"></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
