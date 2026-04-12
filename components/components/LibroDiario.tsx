import { format } from "date-fns";

export default function LibroDiario({ transactions }: { transactions: any[] }) {
  return (
    <div className="overflow-x-auto shadow-lg rounded-lg border">
      <table className="min-w-full bg-white text-sm">
        <thead className="bg-slate-100 border-b">
          <tr>
            <th className="p-3 text-left">Fecha</th>
            <th className="p-3 text-left">Póliza</th>
            <th className="p-3 text-left">Cuenta</th>
            <th className="p-3 text-right">Debe (Lps)</th>
            <th className="p-3 text-right">Haber (Lps)</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => (
            t.entries.map((entry: any, index: number) => (
              <tr key={entry.id} className="border-b hover:bg-slate-50">
                <td className="p-3">{index === 0 ? format(new Date(t.date), "dd/MM/yyyy") : ""}</td>
                <td className="p-3 font-bold text-blue-600">{index === 0 ? `${t.voucherType}-${t.voucherNumber}` : ""}</td>
                <td className="p-3 text-slate-600">{entry.account.code} - {entry.account.name}</td>
                <td className="p-3 text-right">{entry.amount > 0 ? (Number(entry.amount) / 100).toLocaleString() : "0.00"}</td>
                <td className="p-3 text-right text-red-600">{entry.amount < 0 ? (Math.abs(Number(entry.amount)) / 100).toLocaleString() : "0.00"}</td>
              </tr>
            ))
          ))}
        </tbody>
      </table>
    </div>
  );
}