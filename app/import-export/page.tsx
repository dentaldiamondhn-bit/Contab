'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  Download, 
  FileSpreadsheet,
  FileText,
  AlertCircle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';

export default function ImportPage() {
  const [importHistory] = useState([
    {
      id: '1',
      fileName: 'transacciones_marzo.xlsx',
      type: 'import',
      status: 'completed',
      records: 150,
      date: '2024-03-27 10:30:00',
      company: 'Dental Diamond Center'
    },
    {
      id: '2',
      fileName: 'cuentas_iniciales.csv',
      type: 'import',
      status: 'failed',
      records: 0,
      date: '2024-03-26 15:45:00',
      company: 'Dental Diamond Center',
      error: 'Formato de archivo inválido'
    }
  ]);

  const [exportHistory] = useState([
    {
      id: '1',
      fileName: 'balance_comprobacion_marzo.pdf',
      type: 'export',
      status: 'completed',
      date: '2024-03-27 09:15:00',
      company: 'Dental Diamond Center'
    },
    {
      id: '2',
      fileName: 'estado_resultados_q1.xlsx',
      type: 'export',
      status: 'completed',
      date: '2024-03-25 14:20:00',
      company: 'Dental Diamond Center'
    }
  ]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      console.log('Archivo seleccionado:', file.name);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Importar/Exportar</h1>
          <p className="text-gray-600">Importar y exportar archivos Excel</p>
        </div>
        <Button className="bg-blue-600 hover:bg-blue-700">
          <RefreshCw className="h-4 w-4 mr-2" />
          Sincronizar
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Upload className="h-5 w-5 mr-2" />
              Importar Datos
            </CardTitle>
            <CardDescription>
              Sube archivos Excel o CSV para importar datos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
              <FileSpreadsheet className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-sm text-gray-600">
                Arrastra un archivo aquí o haz clic para seleccionar
              </p>
              <input
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
              />
              <label htmlFor="file-upload">
                <Button className="cursor-pointer">
                  Seleccionar Archivo
                </Button>
              </label>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Download className="h-5 w-5 mr-2" />
              Exportar Datos
            </CardTitle>
            <CardDescription>
              Descarga reportes y datos en diferentes formatos
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Button className="w-full justify-start" variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Transacciones (Excel)
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileText className="h-4 w-4 mr-2" />
                Exportar Balance (PDF)
              </Button>
              <Button className="w-full justify-start" variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Exportar Cuentas (Excel)
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Historial de Importaciones</h2>
        <div className="bg-white shadow rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Archivo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Empresa
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Registros
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {importHistory.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center">
                        <FileSpreadsheet className="h-4 w-4 mr-2 text-green-600" />
                        {item.fileName}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.company}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {item.records}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Badge 
                        variant={item.status === 'completed' ? 'default' : 'destructive'}
                        className={item.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                      >
                        {item.status === 'completed' ? 'Completado' : 'Fallido'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {item.date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
