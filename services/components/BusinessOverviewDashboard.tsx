import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { AlertTriangle, CheckCircle2, Clock, Filter, FileText, Lock } from "lucide-react";
import { useState, useMemo } from "react";

export function BusinessOverviewDashboard({ summaryData }: { summaryData: any[] }) {
  const [selectedIndustry, setSelectedIndustry] = useState<string>('todos');
  
  // Obtener industrias únicas para el filtro
  const industries = useMemo(() => {
    const uniqueIndustries = [...new Set(summaryData.map(biz => biz.industry))];
    return uniqueIndustries.filter(industry => industry && industry.trim() !== '');
  }, [summaryData]);
  
  // Filtrar datos por industria
  const filteredData = useMemo(() => {
    if (selectedIndustry === 'todos') return summaryData;
    return summaryData.filter(biz => biz.industry === selectedIndustry);
  }, [summaryData, selectedIndustry]);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Panel General de Negocios</h2>
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <select 
            value={selectedIndustry} 
            onChange={(e) => setSelectedIndustry(e.target.value)}
            className="px-3 py-2 border rounded-md text-sm"
          >
            <option value="todos">Todos los Rubros</option>
            {industries.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="rounded-md border bg-white shadow-sm">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa / Rubro</TableHead>
              <TableHead>Estado Fiscal (CAI)</TableHead>
              <TableHead>Declaración ISV</TableHead>
              <TableHead className="text-right">Liquidez (HNL)</TableHead>
              <TableHead className="text-right">Actividad (Pólizas)</TableHead>
              <TableHead className="text-center">Acciones</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredData.map((biz) => (
              <TableRow key={biz.id} className={biz.needsAttention ? "bg-red-50/50" : ""}>
                <TableCell>
                  <div className="font-bold">{biz.name}</div>
                  <div className="text-xs text-muted-foreground uppercase">{biz.industry}</div>
                </TableCell>
                <TableCell>
                  {biz.needsAttention ? (
                    <Badge variant="destructive" className="flex w-fit gap-1">
                      <AlertTriangle className="h-3 w-3" /> Vence Pronto
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="flex w-fit gap-1 text-green-600 border-green-200 bg-green-50">
                      <CheckCircle2 className="h-3 w-3" /> Al Día
                    </Badge>
                  )}
                  <div className="text-[10px] mt-1 ml-1 text-muted-foreground">
                    Vence: {new Date(biz.caiExpiration).toLocaleDateString()}
                  </div>
                </TableCell>
                <TableCell>
                  {biz.isvFiled ? (
                    <Badge variant="outline" className="flex w-fit gap-1 text-green-600 border-green-200 bg-green-50">
                      <FileText className="h-3 w-3" /> Form. 221 Presentado
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="flex w-fit gap-1">
                      <Clock className="h-3 w-3" /> Pendiente
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right font-mono font-medium">
                  {new Intl.NumberFormat('es-HN', { style: 'currency', currency: 'HNL' }).format(biz.cashOnHand / 100)}
                </TableCell>
                <TableCell className="text-right">
                  <span className="text-sm font-medium">{biz.transactionCount} movs.</span>
                </TableCell>
                <TableCell className="text-center">
                  <div className="flex gap-1 justify-center">
                    <Button variant="ghost" size="sm">Entrar al Libro</Button>
                    {biz.isBalanced && (
                      <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                        <Lock className="h-3 w-3 mr-1" /> Cerrar Mes
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}