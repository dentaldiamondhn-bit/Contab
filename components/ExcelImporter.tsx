"use client"

import { useState } from "react";
import { parseExcelToTransactions } from "@/lib/services/excel";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { AlertCircle, CheckCircle2, Upload } from "lucide-react";

export function ExcelImporter() {
  const [preview, setPreview] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [missingCodes, setMissingCodes] = useState<string[]>([]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setError(null);
      setSuccess(false);
      setMissingCodes([]);
      
      const result = await parseExcelToTransactions(e.target.files[0]);
      
      if (result.success) {
        setPreview(result.data || []);
        setSuccess(true);
      } else {
        setError(result.error || 'Error desconocido');
        if (result.missingCodes) {
          setMissingCodes(result.missingCodes);
        }
        setPreview([]);
      }
    }
  };

  return (
    <div className="space-y-4 p-4 border-2 border-dashed rounded-xl">
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-gray-400" />
        <div>
          <h3 className="font-semibold">Importar Transacciones desde Excel</h3>
          <p className="text-sm text-gray-600">
            Formato requerido: Date, Description, AccountCode, Amount
          </p>
        </div>
      </div>
      
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        onChange={handleFileChange} 
        className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100" 
      />
      
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
            <div>
              <p className="text-sm text-red-800 font-medium">Error de Importación</p>
              <p className="text-sm text-red-700">{error}</p>
              {missingCodes.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-red-800">Códigos faltantes:</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {missingCodes.map((code) => (
                      <span key={code} className="inline-block px-2 py-1 bg-red-100 text-red-800 text-xs rounded">
                        {code}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {success && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <div>
              <p className="text-sm text-green-800 font-medium">Importación Exitosa</p>
              <p className="text-sm text-green-700">
                Se encontraron {preview.length} transacciones válidas
              </p>
            </div>
          </div>
        </div>
      )}
      
      {preview.length > 0 && (
        <div className="mt-4">
          <h4 className="font-bold mb-2">Vista Previa (Primeras 5 filas)</h4>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Fecha</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Cuenta ID</TableCell>
                <TableCell>Monto (L)</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {preview.slice(0, 5).map((row, i) => (
                <TableRow key={i}>
                  <TableCell>{row.date.toLocaleDateString('es-HN')}</TableCell>
                  <TableCell>{row.description}</TableCell>
                  <TableCell>{row.accountId}</TableCell>
                  <TableCell>L. {(row.amount / 100).toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <Button className="mt-4 w-full" onClick={() => {/* Call Server Action to Save */}}>
            Importar {preview.length} Transacciones
          </Button>
        </div>
      )}
    </div>
  );
}