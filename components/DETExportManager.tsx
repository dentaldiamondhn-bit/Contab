'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  FileText, 
  Calendar, 
  TrendingUp,
  RefreshCw,
  Eye,
  CheckCircle,
  AlertTriangle,
  Upload,
  Database
} from 'lucide-react';
import { 
  DETFileType,
  generateDETFile,
  generateDETCSV,
  getAvailablePeriods,
  getDETExportStatistics,
  validateDETFile
} from '@/lib/services/det-live-service';

interface DETExportConfig {
  fileType: DETFileType;
  period: string;
  includeExempt: boolean;
  includeTaxable: boolean;
  includeZeroAmounts: boolean;
  dateFrom?: Date;
  dateTo?: Date;
}

export default function DETExportManager() {
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [config, setConfig] = useState<DETExportConfig>({
    fileType: 'PURCHASES',
    period: '',
    includeExempt: true,
    includeTaxable: true,
    includeZeroAmounts: false,
  });
  const [validationResult, setValidationResult] = useState<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } | null>(null);

  // Load data
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [periods, stats] = await Promise.all([
        getAvailablePeriods(),
        getAvailablePeriods().then(periods => 
          periods.length > 0 ? getDETExportStatistics(periods[periods[0]]) : null
        ),
      ]);
      
      setAvailablePeriods(periods);
      setStatistics(stats);
      
      // Set default period to the most recent
      if (periods.length > 0) {
        setConfig(prev => ({ ...prev, period: periods[periods.length - 1] }));
      }
    } catch (error) {
      console.error('Error loading DET data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Handle period change
  const handlePeriodChange = async (period: string) => {
    setConfig(prev => ({ ...prev, period }));
    
    if (period) {
      const stats = await getDETExportStatistics(period);
      setStatistics(stats);
    }
  };

  // Export DET file
  const handleExportDET = async () => {
    try {
      setExporting(true);
      
      const result = await generateDETFile(config);
      
      // Create download link
      const blob = new Blob([result.content], { type: result.mimeType });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = result.filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      // Validate the generated file
      const validation = validateDETFile(result.content, config.fileType);
      setValidationResult(validation);
      
    } catch (error) {
      console.error('Error exporting DET file:', error);
    } finally {
      setExporting(false);
    }
  };

  // Export CSV file
  const handleExportCSV = async () => {
    try {
      setExporting(true);
      
      const csvContent = await generateDETCSV(config);
      
      // Create download link
      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `DET_${config.fileType}_${config.period.replace('-', '')}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
    } catch (error) {
      console.error('Error exporting CSV file:', error);
    } finally {
      setExporting(false);
    }
  };

  // Get file type display name
  const getFileTypeDisplay = (type: DETFileType) => {
    switch (type) {
      case 'PURCHASES': return 'Compras';
      case 'SALES': return 'Ventas';
      case 'SERVICES': return 'Servicios';
      case 'OTHER': return 'Otros';
      default: return type;
    }
  };

  // Get file type color
  const getFileTypeColor = (type: DETFileType) => {
    switch (type) {
      case 'PURCHASES': return 'bg-blue-100 text-blue-800';
      case 'SALES': return 'bg-green-100 text-green-800';
      case 'SERVICES': return 'bg-purple-100 text-purple-800';
      case 'OTHER': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Database className="w-8 h-8" />
            Exportación DET Live
          </h1>
          <p className="text-muted-foreground">
            Genera archivos en el formato exacto requerido por el SAR para declaraciones informativas
          </p>
        </div>
      </div>

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50/50">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="space-y-2">
              <h3 className="font-medium text-blue-900">¿Qué es DET Live?</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• DET Live es el formato oficial del SAR para declaraciones informativas</li>
                <li>• Genera archivos .txt con la estructura exacta requerida</li>
                <li>• Soporta compras, ventas, servicios y otros tipos de operaciones</li>
                <li>• Los archivos son compatibles con el software oficial del SAR</li>
                <li>• Incluye todos los campos obligatorios: RTN, nombre, montos, impuestos</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compras</p>
                  <p className="text-2xl font-bold text-blue-600">{statistics.purchases.count}</p>
                  <p className="text-xs text-muted-foreground">
                    L {(statistics.purchases.total / 100).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Ventas</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.sales.count}</p>
                  <p className="text-xs text-muted-foreground">
                    L {(statistics.sales.total / 100).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Operaciones</p>
                  <p className="text-2xl font-bold">{statistics.purchases.count + statistics.sales.count}</p>
                  <p className="text-xs text-muted-foreground">
                    L {((statistics.purchases.total + statistics.sales.total) / 100).toFixed(2)}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Período Actual</p>
                  <p className="text-2xl font-bold">{config.period}</p>
                  <p className="text-xs text-muted-foreground">
                    {availablePeriods.length} períodos disponibles
                  </p>
                </div>
                <Calendar className="w-8 h-8 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Export Configuration */}
      <Card>
        <CardHeader>
          <CardTitle>Configuración de Exportación</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="fileType">Tipo de Archivo</Label>
                <select
                  id="fileType"
                  value={config.fileType}
                  onChange={(e) => setConfig(prev => ({ ...prev, fileType: e.target.value as DETFileType }))}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="PURCHASES">Compras (C)</option>
                  <option value="SALES">Ventas (V)</option>
                  <option value="SERVICES">Servicios (S)</option>
                  <option value="OTHER">Otros (O)</option>
                </select>
              </div>
              
              <div>
                <Label htmlFor="period">Período</Label>
                <select
                  id="period"
                  value={config.period}
                  onChange={(e) => handlePeriodChange(e.target.value)}
                  className="w-full p-2 border rounded-md"
                >
                  <option value="">Seleccionar período</option>
                  {availablePeriods.map(period => (
                    <option key={period} value={period}>{period}</option>
                  ))}
                </select>
              </div>
              
              <div className="md:col-span-2">
                <div className="flex items-center gap-4">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeExempt"
                      checked={config.includeExempt}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeExempt: e.target.checked }))}
                    />
                    <Label htmlFor="includeExempt">Incluir operaciones exentas</Label>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeTaxable"
                      checked={config.includeTaxable}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeTaxable: e.target.checked }))}
                    />
                    <Label htmlFor="includeTaxable">Incluir operaciones gravadas</Label>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="includeZeroAmounts"
                      checked={config.includeZeroAmounts}
                      onChange={(e) => setConfig(prev => ({ ...prev, includeZeroAmounts: e.target.checked }))}
                    />
                    <Label htmlFor="includeZeroAmounts">Incluir montos cero</Label>
                  </label>
                </div>
              </div>
            </div>
            
            {/* File Type Preview */}
            <div className="border rounded-lg p-4 bg-muted/50">
              <h4 className="font-medium mb-2">Vista Previa del Archivo</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium">Tipo:</span>
                  <Badge className={getFileTypeColor(config.fileType)}>
                    {getFileTypeDisplay(config.fileType)}
                  </Badge>
                </div>
                <div>
                  <span className="font-medium">Período:</span>
                  <span>{config.period || 'No seleccionado'}</span>
                </div>
                <div>
                  <span className="font-medium">Formato:</span>
                  <span>DET Live (.txt)</span>
                </div>
                <div>
                  <span className="font-medium">Registros:</span>
                  <span>
                    {(() => {
                      if (!statistics) return 'N/A';
                      if (config.fileType === 'PURCHASES') return statistics.purchases.count.toString();
                      if (config.fileType === 'SALES') return statistics.sales.count.toString();
                      return '0';
                    })()}
                  </span>
                </div>
              </div>
            </div>
            
            {/* Export Buttons */}
            <div className="flex gap-2">
              <Button 
                onClick={handleExportDET}
                disabled={exporting || !config.period}
                className="flex-1"
              >
                {exporting ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Exportando...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Exportar DET (.txt)
                  </>
                )}
              </Button>
              
              <Button 
                variant="outline"
                onClick={handleExportCSV}
                disabled={exporting || !config.period}
              >
                <FileText className="w-4 h-4 mr-2" />
                Exportar CSV
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Results */}
      {validationResult && (
        <Card className={validationResult.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {validationResult.isValid ? (
                <CheckCircle className="w-5 h-5 text-green-600" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-red-600" />
              )}
              Resultados de Validación
            </CardTitle>
          </CardHeader>
          <CardContent>
            {validationResult.errors.length > 0 && (
              <div className="space-y-2 mb-4">
                <h4 className="font-medium text-red-800">Errores:</h4>
                {validationResult.errors.map((error, index) => (
                  <div key={index} className="text-sm text-red-700">
                    • {error}
                  </div>
                ))}
              </div>
            )}
            
            {validationResult.warnings.length > 0 && (
              <div className="space-y-2">
                <h4 className="font-medium text-yellow-800">Advertencias:</h4>
                {validationResult.warnings.map((warning, index) => (
                  <div key={index} className="text-sm text-yellow-700">
                    • {warning}
                  </div>
                ))}
              </div>
            )}
            
            {validationResult.isValid && (
              <div className="text-sm text-green-700">
                ✅ El archivo cumple con el formato DET Live y es válido para presentación al SAR.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Format Specification */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5" />
            Especificaciones del Formato
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Estructura del Archivo</h4>
              <div className="bg-muted p-3 rounded-lg font-mono text-sm">
                <div className="mb-2">
                  <span className="text-blue-600">C</span>
                  <span className="text-gray-600">202401</span>
                  <span className="text-gray-400">...</span>
                  <span className="text-gray-600"> (Línea de encabezado)</span>
                </div>
                <div>
                  <span className="text-gray-600">0801-1990-12345</span>
                  <span className="text-gray-400">...</span>
                  <span className="text-gray-600"> (Línea de datos)</span>
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Campos Obligatorios</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="font-medium">RTN:</span> 16 caracteres
                </div>
                <div>
                  <span className="font-medium">Nombre:</span> 150 caracteres
                </div>
                <div>
                  <span className="font-medium">Tipo Doc:</span> 2 caracteres
                </div>
                <div>
                  <span className="font-medium">Número:</span> 20 caracteres
                </div>
                <div>
                  <span className="font-medium">Fecha:</span> 10 caracteres (DD/MM/YYYY)
                </div>
                <div>
                  <span className="font-medium">Montos:</span> 15 caracteres cada uno
                </div>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Tipos de Documento</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm">
                <div><span className="font-mono bg-muted px-2 py-1 rounded">01</span> Factura</div>
                <div><span className="font-mono bg-muted px-2 py-1 rounded">02</span> Nota de Crédito</div>
                <div><span className="font-mono bg-muted px-2 py-1 rounded">03</span> Nota de Débito</div>
                <div><span className="font-mono bg-muted px-2 py-1 rounded">04</span> Comprobante</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
