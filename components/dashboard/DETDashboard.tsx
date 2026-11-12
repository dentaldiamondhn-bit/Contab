'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Database, 
  Download, 
  TrendingUp,
  AlertTriangle,
  Eye,
  RefreshCw,
  FileText
} from 'lucide-react';
import Link from 'next/link';

interface DETDashboardProps {
  compact?: boolean;
}

export default function DETDashboard({ compact = false }: DETDashboardProps) {
  const [availablePeriods, setAvailablePeriods] = useState<string[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [currentPeriod, setCurrentPeriod] = useState<string>('');

  // Load data
  useEffect(() => {
    loadData();
    
    // Set up periodic refresh
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/det');
      const result = await response.json();
      
      if (result.success) {
        setAvailablePeriods(result.data.availablePeriods);
        
        const latestPeriod = result.data.availablePeriods.length > 0 
          ? result.data.availablePeriods[result.data.availablePeriods.length - 1] 
          : '';
        setCurrentPeriod(latestPeriod);
        
        if (result.data.statistics) {
          setStatistics(result.data.statistics);
        }
      }
    } catch (error) {
      console.error('Error loading DET data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <RefreshCw className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (compact) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Database className="w-5 h-5" />
            Exportación DET
            {availablePeriods.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {availablePeriods.length} períodos
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statistics && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-cyan-600">{statistics.purchases.count}</div>
                <div className="text-xs text-muted-foreground">Compras</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{statistics.sales.count}</div>
                <div className="text-xs text-muted-foreground">Ventas</div>
              </div>
            </div>
          )}
          
          <div className="space-y-2">
            <div className="flex items-start gap-2 text-xs">
              <FileText className="w-3 h-3 text-cyan-600 mt-0.5" />
              <div className="flex-1">
                <p className="font-medium">Período actual: {currentPeriod}</p>
                <p className="text-muted-foreground">
                  Total operaciones: {statistics ? (statistics.purchases.count + statistics.sales.count) : 0}
                </p>
              </div>
            </div>
          </div>
          
          <Button asChild className="w-full mt-4" variant="outline" size="sm">
            <Link href="/det">
              <Eye className="w-3 h-3 mr-1" />
              Exportar DET
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Panel de Exportación DET</h2>
          {availablePeriods.length > 0 && (
            <Badge variant="secondary">
              {availablePeriods.length} períodos disponibles
            </Badge>
          )}
        </div>
        <Button asChild size="sm">
          <Link href="/det">
            <Eye className="w-4 h-4 mr-1" />
            Exportar Archivos
          </Link>
        </Button>
      </div>

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Compras</p>
                  <p className="text-2xl font-bold text-cyan-600">{statistics.purchases.count}</p>
                  <p className="text-xs text-muted-foreground">
                    L {(statistics.purchases.total / 100).toFixed(2)}
                  </p>
                </div>
                <TrendingUp className="w-6 h-6 text-cyan-600" />
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
                <TrendingUp className="w-6 h-6 text-green-600" />
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
                <FileText className="w-6 h-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Período Actual</p>
                  <p className="text-2xl font-bold">{currentPeriod}</p>
                  <p className="text-xs text-muted-foreground">
                    {availablePeriods.length} períodos disponibles
                  </p>
                </div>
                <Database className="w-6 h-6 text-orange-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent Periods */}
      {availablePeriods.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Períodos Disponibles</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {availablePeriods.slice(-4).map((period) => (
                <div key={period} className="text-center p-3 border rounded-lg">
                  <div className="text-sm font-medium">{period}</div>
                  <div className="text-xs text-muted-foreground">
                    {period === currentPeriod ? 'Actual' : 'Anterior'}
                  </div>
                </div>
              ))}
            </div>
            
            {availablePeriods.length > 4 && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/det">
                  Ver todos los períodos
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Export Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-cyan-600" />
            Información de Exportación
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <h4 className="font-medium mb-2">Formatos Disponibles</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-cyan-100 text-cyan-800">.txt</Badge>
                    <span className="text-sm">Formato oficial SAR (DET Live)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800">.csv</Badge>
                    <span className="text-sm">Formato para revisión</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Tipos de Archivos</h4>
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-cyan-100 text-cyan-800 text-xs">C</Badge>
                    <span className="text-sm">Compras</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-100 text-green-800 text-xs">V</Badge>
                    <span className="text-sm">Ventas</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-100 text-purple-800 text-xs">S</Badge>
                    <span className="text-sm">Servicios</span>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="border-t pt-4">
              <h4 className="font-medium mb-2">Requisitos SAR</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Presentación mensual obligatoria</li>
                <li>• Formato DET Live específico</li>
                <li>• Incluir todas las operaciones del período</li>
                <li>• Validación de estructura y campos</li>
                <li>• Cumplimiento con plazos legales</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
