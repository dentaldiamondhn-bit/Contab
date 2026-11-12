'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Eye, 
  Clock, 
  FileText, 
  AlertTriangle,
  RefreshCw,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Shield,
  Activity,
  ArrowLeft
} from 'lucide-react';
import { useRouter } from 'next/navigation';

interface AuditLog {
  id: string;
  tableName: string;
  recordId: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  oldValues?: string;
  newValues?: string;
  changedFields?: string[];
  userId?: string;
  userAgent?: string;
  ipAddress?: string;
  timestamp: Date;
  tenantId?: string;
  tenantName?: string;
}

export default function SupportAuditPage() {
  const router = useRouter();
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'CREATE' | 'UPDATE' | 'DELETE'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const fetchAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/audit-logs');
      
      if (!response.ok) {
        console.warn('Audit logs API not available');
        setLogs([]);
        setError('');
        return;
      }
      
      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        setLogs([]);
        setError('');
        return;
      }
      
      const data = await response.json();
      setLogs(data.logs || []);
    } catch (error: any) {
      console.warn('Error fetching audit logs:', error.message);
      setLogs([]);
      setError('');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const filteredLogs = logs.filter(log => {
    const matchesFilter = filter === 'all' || log.action === filter;
    const matchesSearch = !searchTerm || 
      log.tableName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.recordId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.tenantName?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'CREATE':
        return <FileText className="w-4 h-4 text-green-500" />;
      case 'UPDATE':
        return <Activity className="w-4 h-4 text-cyan-500" />;
      case 'DELETE':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return <Eye className="w-4 h-4 text-gray-500" />;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'CREATE':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'UPDATE':
        return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'DELETE':
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-4">
            <button
              onClick={() => router.push('/support/dashboard')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
            >
              <ArrowLeft className="w-5 h-5" />
              Volver al Dashboard
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Auditoría del Sistema</h1>
              <p className="text-gray-600 mt-1">Registro de actividades y cambios en el sistema</p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                onClick={fetchAuditLogs}
                disabled={loading}
                className="flex items-center gap-2"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? 'Cargando...' : 'Actualizar'}
              </Button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Registros</p>
                  <p className="text-2xl font-bold text-gray-900">{logs.length}</p>
                </div>
                <Shield className="w-8 h-8 text-gray-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Creaciones</p>
                  <p className="text-2xl font-bold text-green-600">
                    {logs.filter(l => l.action === 'CREATE').length}
                  </p>
                </div>
                <FileText className="w-8 h-8 text-green-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Actualizaciones</p>
                  <p className="text-2xl font-bold text-cyan-600">
                    {logs.filter(l => l.action === 'UPDATE').length}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-cyan-400" />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Eliminaciones</p>
                  <p className="text-2xl font-bold text-red-600">
                    {logs.filter(l => l.action === 'DELETE').length}
                  </p>
                </div>
                <AlertTriangle className="w-8 h-8 text-red-400" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Buscar por tabla, registro, usuario o tenant..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-gray-500" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as any)}
                  className="border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="all">Todas las acciones</option>
                  <option value="CREATE">Creaciones</option>
                  <option value="UPDATE">Actualizaciones</option>
                  <option value="DELETE">Eliminaciones</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <span className="text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Audit Logs List */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Registro de Actividad
              <span className="text-sm font-normal text-gray-500">
                ({filteredLogs.length} registros)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto text-gray-400 mb-4" />
                <p className="text-gray-600">Cargando registros de auditoría...</p>
              </div>
            ) : filteredLogs.length === 0 ? (
              <div className="text-center py-8">
                <Shield className="w-12 h-12 mx-auto text-gray-300 mb-4" />
                <p className="text-gray-600">No hay registros de auditoría</p>
                <p className="text-sm text-gray-500 mt-1">
                  Los registros aparecerán cuando se realicen cambios en el sistema
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredLogs.map((log) => (
                  <div
                    key={log.id}
                    className="border border-gray-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow"
                  >
                    <div
                      className="p-4 flex items-center justify-between cursor-pointer bg-white"
                      onClick={() => toggleExpand(log.id)}
                    >
                      <div className="flex items-center gap-4">
                        {getActionIcon(log.action)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded text-xs font-medium border ${getActionColor(log.action)}`}>
                              {log.action}
                            </span>
                            <span className="font-medium text-gray-900">{log.tableName}</span>
                          </div>
                          <p className="text-sm text-gray-500 mt-1">
                            Registro: {log.recordId}
                          </p>
                          {log.tenantName && (
                            <p className="text-sm text-orange-600 mt-1">
                              Tenant: {log.tenantName}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-sm text-gray-500">
                            {new Date(log.timestamp).toLocaleDateString('es-HN')}
                          </p>
                          <p className="text-xs text-gray-400">
                            {new Date(log.timestamp).toLocaleTimeString('es-HN')}
                          </p>
                        </div>
                        {expandedLogs.has(log.id) ? (
                          <ChevronUp className="w-5 h-5 text-gray-400" />
                        ) : (
                          <ChevronDown className="w-5 h-5 text-gray-400" />
                        )}
                      </div>
                    </div>
                    
                    {expandedLogs.has(log.id) && (
                      <div className="px-4 pb-4 bg-gray-50 border-t border-gray-200">
                        <div className="mt-3 space-y-3">
                          {log.userId && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Usuario:</span>
                              <span className="text-sm text-gray-600 ml-2">{log.userId}</span>
                            </div>
                          )}
                          {log.ipAddress && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">IP:</span>
                              <span className="text-sm text-gray-600 ml-2">{log.ipAddress}</span>
                            </div>
                          )}
                          {log.changedFields && log.changedFields.length > 0 && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Campos modificados:</span>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {log.changedFields.map((field, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-orange-100 text-orange-700 text-xs rounded">
                                    {field}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                          {log.oldValues && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Valores anteriores:</span>
                              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                {log.oldValues}
                              </pre>
                            </div>
                          )}
                          {log.newValues && (
                            <div>
                              <span className="text-sm font-medium text-gray-700">Nuevos valores:</span>
                              <pre className="mt-1 p-2 bg-gray-100 rounded text-xs overflow-x-auto">
                                {log.newValues}
                              </pre>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
