'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  Bell,
  TrendingUp,
  TrendingDown,
  FileText,
  Calendar,
  Eye,
  RefreshCw
} from 'lucide-react';
import Link from 'next/link';
import { 
  CAI, 
  CAIAlert, 
  CAIStatistics,
  getUnreadAlerts,
  markAllAlertsAsRead,
  formatCAIDisplay
} from '@/lib/services/cai-service';

// Helper function for CAI expiration text
function getCAIExpirationText(cai: CAI): string {
  const days = Math.ceil((new Date(cai.expirationDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return 'Vencido';
  if (days === 0) return 'Vence hoy';
  if (days === 1) return 'Vence mañana';
  if (days <= 7) return `Vence en ${days} días`;
  if (days <= 30) return `Vence en ${Math.ceil(days / 7)} semanas`;
  return `Vence en ${Math.ceil(days / 30)} meses`;
}

interface CAIDashboardProps {
  compact?: boolean;
}

export default function CAIDashboard({ compact = false }: CAIDashboardProps) {
  const [cais, setCAIs] = useState<CAI[]>([]);
  const [alerts, setAlerts] = useState<CAIAlert[]>([]);
  const [statistics, setStatistics] = useState<CAIStatistics | null>(null);
  const [loading, setLoading] = useState(true);

  // Load data
  useEffect(() => {
    loadData();
    
    // Set up periodic refresh for alerts
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  const loadData = async () => {
    try {
      const [caiResponse, alertsResponse] = await Promise.all([
        fetch('/api/cai'),
        fetch('/api/cai-alerts')
      ]);
      
      const [caiResult, alertsResult] = await Promise.all([
        caiResponse.json(),
        alertsResponse.json()
      ]);
      
      if (caiResult.success) {
        setCAIs(caiResult.data);
      }
      
      if (alertsResult.success) {
        setAlerts(alertsResult.data.alerts);
        setStatistics(alertsResult.data.statistics);
      }
    } catch (error) {
      console.error('Error loading CAI data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ACTIVE':
        return 'text-green-600';
      case 'EXPIRING':
        return 'text-yellow-600';
      case 'EXPIRED':
        return 'text-red-600';
      case 'EXHAUSTED':
        return 'text-orange-600';
      default:
        return 'text-gray-600';
    }
  };

  // Get alert priority
  const getAlertPriority = (alertType: string) => {
    switch (alertType) {
      case 'RANGE_CRITICAL':
      case 'EXPIRATION_CRITICAL':
        return 'critical';
      case 'RANGE_WARNING':
      case 'EXPIRATION_WARNING':
        return 'warning';
      default:
        return 'info';
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
            <Shield className="w-5 h-5" />
            Estado CAI
            {alerts.length > 0 && (
              <Badge variant="destructive" className="text-xs">
                {alerts.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {statistics && (
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{statistics.activeCAIs}</div>
                <div className="text-xs text-muted-foreground">Activos</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">{statistics.expiringCAIs}</div>
                <div className="text-xs text-muted-foreground">Por Vencer</div>
              </div>
            </div>
          )}
          
          {alerts.length > 0 && (
            <div className="space-y-2">
              {alerts.slice(0, 3).map((alert) => (
                <div key={alert.id} className="flex items-start gap-2 text-xs">
                  {getAlertPriority(alert.alertType) === 'critical' ? (
                    <AlertTriangle className="w-3 h-3 text-red-600 mt-0.5" />
                  ) : (
                    <Bell className="w-3 h-3 text-yellow-600 mt-0.5" />
                  )}
                  <p className="flex-1 line-clamp-1">{alert.message}</p>
                </div>
              ))}
              {alerts.length > 3 && (
                <p className="text-xs text-muted-foreground">
                  +{alerts.length - 3} alertas más
                </p>
              )}
            </div>
          )}
          
          <Button asChild className="w-full mt-4" variant="outline" size="sm">
            <Link href="/cai">
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
          <Shield className="w-6 h-6" />
          <h2 className="text-xl font-semibold">Panel de Control CAI</h2>
          {alerts.length > 0 && (
            <Badge variant="destructive">
              {alerts.length} alertas
            </Badge>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => markAllAlertsAsRead().then(loadData)}>
            <CheckCircle className="w-4 h-4 mr-1" />
            Marcar leídas
          </Button>
          <Button asChild size="sm">
            <Link href="/cai">
              <Eye className="w-4 h-4 mr-1" />
              Gestionar CAIs
            </Link>
          </Button>
        </div>
      </div>

      {/* Critical Alerts */}
      {alerts.length > 0 && (
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-red-800">
              <Bell className="w-5 h-5" />
              Alertas Críticas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {alerts.map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 p-2 bg-white rounded border border-red-200">
                  {getAlertPriority(alert.alertType) === 'critical' ? (
                    <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5" />
                  ) : (
                    <Bell className="w-4 h-4 text-yellow-600 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="text-sm font-medium">{alert.message}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(alert.createdAt).toLocaleString('es-HN')}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Statistics */}
      {statistics && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total CAIs</p>
                  <p className="text-2xl font-bold">{statistics.totalCAIs}</p>
                </div>
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Activos</p>
                  <p className="text-2xl font-bold text-green-600">{statistics.activeCAIs}</p>
                </div>
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Por Vencer</p>
                  <p className="text-2xl font-bold text-yellow-600">{statistics.expiringCAIs}</p>
                </div>
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Facturas Restantes</p>
                  <p className="text-2xl font-bold">{statistics.totalRemainingInvoices}</p>
                </div>
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recent CAIs Status */}
      <Card>
        <CardHeader>
          <CardTitle>Estado de CAIs Recientes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {cais.slice(0, 5).map((cai) => {
              const remaining = cai.rangeEnd - cai.currentNumber;
              const usagePercentage = ((cai.currentNumber - cai.rangeStart) / (cai.rangeEnd - cai.rangeStart)) * 100;
              
              return (
                <div key={cai.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{cai.caiCode}</span>
                      <Badge variant={cai.status === 'ACTIVE' ? 'default' : 'secondary'} className="text-xs">
                        {cai.status === 'ACTIVE' ? 'Activo' : cai.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{cai.documentType}</span>
                      <span>{cai.establishmentCode}</span>
                      <span>{getCAIExpirationText(cai)}</span>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-sm font-medium">{cai.currentNumber} / {cai.rangeEnd}</div>
                    <div className="text-xs text-muted-foreground">
                      {remaining} restantes
                    </div>
                    <div className="w-16 bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className={`h-1 rounded-full ${
                          usagePercentage > 90 ? 'bg-red-500' : 
                          usagePercentage > 70 ? 'bg-yellow-500' : 'bg-green-500'
                        }`}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
            
            {cais.length === 0 && (
              <div className="text-center py-6 text-muted-foreground">
                <Shield className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No hay CAIs registrados</p>
              </div>
            )}
            
            {cais.length > 5 && (
              <Button asChild variant="outline" size="sm" className="w-full">
                <Link href="/cai">
                  Ver todos los CAIs
                </Link>
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
