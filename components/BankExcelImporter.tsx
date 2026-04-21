'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle, 
  AlertCircle, 
  Info,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
  Download
} from 'lucide-react';
import { ExcelImportResult, MappedTransaction } from '@/lib/services/types';

interface BankExcelImporterProps {
  onImportComplete?: (result: ExcelImportResult) => void;
  selectedBank?: string;
}

export default function BankExcelImporter({ onImportComplete, selectedBank }: BankExcelImporterProps) {
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ExcelImportResult | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const handleFileUpload = useCallback(async (file: File) => {
    setImporting(true);
    setResult(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/import-excel', {
        method: 'POST',
        body: formData,
      });

      const importResult: ExcelImportResult = await response.json();

      if (response.ok) {
        setResult(importResult);
        onImportComplete?.(importResult);
      } else {
        setResult({
          success: false,
          bankDetection: { detectedBank: '', confidence: 0, format: null, alternativeMatches: [] },
          transactions: [],
          summary: {
            totalTransactions: 0,
            totalDebits: 0,
            totalCredits: 0,
            netAmount: 0,
            dateRange: { start: new Date(), end: new Date() },
            bankIdentifier: '',
            currency: 'HNL'
          },
          validation: { valid: [], invalid: [], errors: [] },
          errors: [(importResult as any).error || 'Import failed']
        });
      }
    } catch (error) {
      console.error('Import error:', error);
      setResult({
        success: false,
        bankDetection: { detectedBank: '', confidence: 0, format: null, alternativeMatches: [] },
        transactions: [],
        summary: {
          totalTransactions: 0,
          totalDebits: 0,
          totalCredits: 0,
          netAmount: 0,
          dateRange: { start: new Date(), end: new Date() },
          bankIdentifier: '',
          currency: 'HNL'
        },
        validation: { valid: [], invalid: [], errors: [] },
        errors: ['Error al procesar el archivo']
      });
    } finally {
      setImporting(false);
    }
  }, [onImportComplete]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      handleFileUpload(files[0]);
    }
  }, [handleFileUpload]);

  const formatCurrency = (amount: number, currency: string) => {
    const symbol = currency === 'USD' ? '$' : 'L.';
    return `${symbol} ${amount.toLocaleString('es-HN', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('es-HN');
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileSpreadsheet className="w-5 h-5 text-indigo-600" />
            <span>Importar Estado de Cuenta Bancario</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
              dragActive ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300'
            }`}
            onDrop={handleDrop}
            onDragOver={handleDrag}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
          >
            <Upload className="w-12 h-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">
              Arrastra y suelta tu archivo Excel aquí
            </h3>
            <p className="text-sm text-slate-600 mb-4">
              O haz clic para seleccionar un archivo
            </p>
            <input
              type="file"
              accept=".xlsx,.xls"
              onChange={handleFileSelect}
              className="hidden"
              id="file-upload"
            />
            <Button asChild>
              <label htmlFor="file-upload" className="cursor-pointer">
                Seleccionar Archivo
              </label>
            </Button>
          </div>

          {/* Supported Banks Info */}
          <div className="mt-6 p-4 bg-slate-50 rounded-lg">
            <h4 className="font-semibold text-slate-900 mb-2 flex items-center space-x-2">
              <Info className="w-4 h-4" />
              <span>Bancos Soportados</span>
            </h4>
            <div className="grid grid-cols-3 gap-2 text-sm text-slate-600">
              <div>• Banco Atlántida</div>
              <div>• BAC Credomatic</div>
              <div>• Banco Ficohsa</div>
              <div>• Banpaís</div>
              <div>• Banco Davivienda</div>
              <div>• Banco Promerica</div>
              <div>• Banrural</div>
              <div>• Banco Lafise</div>
              <div>• Banco de Occidente</div>
            </div>
            <p className="text-xs text-slate-500 mt-2">
              El sistema detecta automáticamente el formato del banco basado en los encabezados del Excel
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Import Progress */}
      {importing && (
        <Card>
          <CardContent className="py-8">
            <div className="flex items-center justify-center space-x-3">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-indigo-600"></div>
              <span className="text-slate-600">Procesando archivo...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Results */}
      {result && (
        <div className="space-y-4">
          {/* Success/Error Summary */}
          <Card className={result.success ? 'border-emerald-200' : 'border-rose-200'}>
            <CardContent className="py-4">
              <div className="flex items-center space-x-3">
                {result.success ? (
                  <CheckCircle className="w-6 h-6 text-emerald-600" />
                ) : (
                  <AlertCircle className="w-6 h-6 text-rose-600" />
                )}
                <div>
                  <h3 className={`font-semibold ${result.success ? 'text-emerald-900' : 'text-rose-900'}`}>
                    {result.success ? 'Importación Exitosa' : 'Error en Importación'}
                  </h3>
                  {result.bankDetection.format && (
                    <p className="text-sm text-slate-600">
                      Banco detectado: {result.bankDetection.format.name} 
                      <span className="ml-2">
                        <Badge variant={result.bankDetection.confidence > 70 ? 'default' : 'secondary'}>
                          {result.bankDetection.confidence.toFixed(0)}% confianza
                        </Badge>
                      </span>
                    </p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Import Details */}
          {result.success && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center space-x-2">
                      <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                      <div>
                        <p className="text-sm text-slate-600">Transacciones</p>
                        <p className="text-lg font-bold text-slate-900">
                          {result.summary.totalTransactions}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-emerald-600" />
                      <div>
                        <p className="text-sm text-slate-600">Créditos</p>
                        <p className="text-lg font-bold text-emerald-600">
                          {formatCurrency(result.summary.totalCredits, result.summary.currency)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center space-x-2">
                      <TrendingUp className="w-5 h-5 text-rose-600 transform rotate-180" />
                      <div>
                        <p className="text-sm text-slate-600">Débitos</p>
                        <p className="text-lg font-bold text-rose-600">
                          {formatCurrency(result.summary.totalDebits, result.summary.currency)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="py-4">
                    <div className="flex items-center space-x-2">
                      <DollarSign className="w-5 h-5 text-indigo-600" />
                      <div>
                        <p className="text-sm text-slate-600">Neto</p>
                        <p className={`text-lg font-bold ${
                          result.summary.netAmount >= 0 ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {formatCurrency(result.summary.netAmount, result.summary.currency)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Date Range */}
              <Card>
                <CardContent className="py-4">
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-5 h-5 text-slate-600" />
                    <div>
                      <p className="text-sm text-slate-600">Rango de Fechas</p>
                      <p className="text-lg font-bold text-slate-900">
                        {formatDate(result.summary.dateRange.start)} - {formatDate(result.summary.dateRange.end)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Validation Errors */}
              {result.validation.errors.length > 0 && (
                <Card className="border-amber-200">
                  <CardHeader>
                    <CardTitle className="text-amber-900 flex items-center space-x-2">
                      <AlertCircle className="w-5 h-5" />
                      <span>Advertencias de Validación</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {result.validation.errors.slice(0, 5).map((error, index) => (
                        <div key={index} className="text-sm text-amber-800 bg-amber-50 p-2 rounded">
                          {error}
                        </div>
                      ))}
                      {result.validation.errors.length > 5 && (
                        <p className="text-sm text-amber-600">
                          ... y {result.validation.errors.length - 5} errores más
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Sample Transactions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span className="flex items-center space-x-2">
                      <Building2 className="w-5 h-5 text-indigo-600" />
                      <span>Transacciones Importadas</span>
                    </span>
                    <Badge variant="outline">
                      {result.validation.valid.length} válidas
                    </Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {result.validation.valid.slice(0, 5).map((transaction, index) => (
                      <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-slate-900">
                              {transaction.description}
                            </span>
                            {transaction.reference && (
                              <Badge variant="secondary" className="text-xs">
                                {transaction.reference}
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">
                            {formatDate(transaction.date)}
                          </div>
                        </div>
                        <div className="text-right">
                          {transaction.debit > 0 ? (
                            <span className="text-sm font-medium text-rose-600">
                              -{formatCurrency(transaction.debit, transaction.currency)}
                            </span>
                          ) : (
                            <span className="text-sm font-medium text-emerald-600">
                              +{formatCurrency(transaction.credit, transaction.currency)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                    {result.validation.valid.length > 5 && (
                      <p className="text-sm text-slate-500 text-center py-2">
                        ... y {result.validation.valid.length - 5} transacciones más
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}

          {/* Error Details */}
          {!result.success && result.errors && (
            <Card className="border-rose-200">
              <CardHeader>
                <CardTitle className="text-rose-900">Errores</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm text-rose-800 bg-rose-50 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
