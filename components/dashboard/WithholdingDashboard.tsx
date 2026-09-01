'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Receipt, 
  Calculator, 
  TrendingUp,
  AlertTriangle,
  Clock,
  Eye,
  RefreshCw,
  FileText
} from 'lucide-react';
import Link from 'next/link';
import { formatDateForDisplay, formatDateRange } from '@/lib/date-utils';
import { 
  getWithholdingStatistics,
  formatCurrency
} from '@/lib/services/withholding-service';

interface WithholdingDashboardProps {
  compact?: boolean;
}

export default function WithholdingDashboard({ compact = false }: WithholdingDashboardProps) {
  const [withholdings, setWithholdings] = useState<any[]>([]);
  const [statistics, setStatistics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    loadData();
    
    // Set up periodic refresh
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [withholdingResponse, statsResponse] = await Promise.all([
        fetch('/api/withholding'),
        fetch('/api/withholding-statistics')
      ]);
      
      const [withholdingResult, statsResult] = await Promise.all([
        withholdingResponse.json(),
        statsResponse.json()
      ]);
      
      if (withholdingResult.success) {
        setWithholdings(withholdingResult.data);
      }
      
      if (statsResult.success) {
        setStatistics(statsResult.data);
      }
    } catch (error) {
      console.error('Error loading withholding data:', error);
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
            <Receipt className="w-5 h-5" />
            Retenciones
            {statistics?.pendingCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {statistics.pendingCount}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statistics && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{statistics.pendingCount}</div>
                <div className="text-xs text-muted-foreground">Pendientes</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold">{formatCurrency(statistics.totalWithheld)}</div>
                <div className="text-xs text-muted-foreground">Total Retenido</div>
              </div>
            </div>
          )}
          
          {withholdings.length > 0 && (
            <div className="space-y-2">
              {withholdings.slice(0, 3).map((withholding: any) => (
                <div key={withholding.id} className="flex items-start gap-2 text-xs">
                  <Calculator className="w-3 h-3 text-cyan-600 mt-0.5" />
                  <div className="flex-1">
                    <p className="font-medium">{withholding.invoiceNumber}</p>
                    <p className="text-muted-foreground">
                      {withholding.providerName} - {formatCurrency(withholding.withholdingAmount)}
                    </p>
                  </div>
                </div>
              ))}
              {withholdings.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{withholdings.length - 3} retenciones más
                </p>
              )}
            </div>
          )}
          
          <Button asChild className="w-full mt-4" variant="outline" size="sm">
            <Link href="/withholding">
              <Eye className="w-3 h-3 mr-1" />
              Ver Detalles
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
          <Receipt className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Panel de Retenciones</h2>
          {statistics?.pendingCount > 0 && (
            <Badge variant="destructive">
              {statistics.pendingCount} pendientes
            </Badge>
          )}
        </div>
        <Button asChild size="sm">
          <Link href="/withholding">
            <Eye className="w-4 h-4 mr-1" />
            Gestionar Retenciones
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
                  <p className="text-sm font-medium text-muted-foreground">Total Retenciones</p>
                  <p className="text-2xl font-bold">{statistics.totalWithholdings}</p>
                </div>
                <FileText className="w-6 h-6 text-cyan-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Monto Total</p>
                  <p className="text-2xl font-bold">{formatCurrency(statistics.totalAmount)}</p>
                </div>
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total Retenido</p>
                  <p className="text-2xl font-bold text-red-600">{formatCurrency(statistics.totalWithheld)}</p>
                </div>
                <Calculator className="w-6 h-6 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Pendientes</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistics.pendingCount}</p>
                </div>
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Pending Withholdings */}
      {withholdings.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-yellow-600" />
              Retenciones Pendientes ({withholdings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {withholdings.map((withholding: any) => (
                <div key={withholding.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{withholding.invoiceNumber}</span>
                      <Badge variant="secondary" className="text-xs">
                        {withholding.type === 'PROFESSIONAL_SERVICES_1%' ? '1%' : '12.5%'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{withholding.providerName}</span>
                      <span>{withholding.providerRTN}</span>
                      <span>{withholding.invoiceDate.toLocaleDateString('es-HN')}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium">{formatCurrency(withholding.withholdingAmount)}</div>
                    <div className="text-xs text-muted-foreground">
                      Base: {formatCurrency(withholding.amount)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {withholdings.length > 0 && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/withholding">
                  Ver todas las retenciones
                </Link>
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Recent Withholdings */}
      <Card>
        <CardHeader>
          <CardTitle>Retenciones Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-muted-foreground">
            <Receipt className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Gestiona tus retenciones desde el panel completo</p>
            <Button asChild className="mt-2" size="sm">
              <Link href="/withholding">
                Ir a Gestión de Retenciones
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
